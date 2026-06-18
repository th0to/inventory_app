"""Import du parc matériel depuis BD_inventory.csv vers PostgreSQL.

Améliorations par rapport à la V1 :
  - Idempotent : une ligne déjà importée (même S/N) est mise à jour si des
    champs ont changé (avec entrée dans device_history), sinon laissée telle quelle.
  - Déterministe : plus d'UUID aléatoire pour les S/N vides (ces lignes sont
    rejetées et listées dans le rapport).
  - Mots de passe forts aléatoires pour les comptes créés à la volée, journalisés
    dans un fichier séparé (jamais en stdout, jamais committé).
  - Colonne « Zurich » interprétée comme numéro de commande (Device.order_number).
  - Détection d'entité explicite avec avertissements sur les cas ambigus.
  - Validation numérique stricte (regex) avec log des valeurs rejetées.
  - Option --dry-run : exécute toute la validation/mapping sans rien committer.
  - Rapport de fin structuré : importés / mis à jour / inchangés / skippés / erreurs.

Appel standard (inchangé, compatible README) :
    docker compose exec backend python import_csv.py /path/to/BD_inventory.csv
"""

import argparse
import os
import re
import secrets
from dataclasses import dataclass, field
from datetime import datetime

import csv

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Category, Client, Device, DeviceHistory, Entity, Location, User, UserRole
from security import hash_password

# Nombre de colonnes attendu (cf. header documenté ci-dessous)
EXPECTED_COLS = 18

# 0: OWNER, 1: Zurich, 2: CDS, 3: FIX, 4: Category, 5: Gen, 6: Model,
# 7: Taille (pouces), 8: Processeur, 9: RAM (GB), 10: Storage (GB),
# 11: Hosting Power (W), 12: Serial Number, 13: PV, 14: Client / Partenaire,
# 15: Date d'envoi, 16: Lieu, 17: Solution / Commentaire
COL = dict(
    owner=0, zurich=1, cds=2, fix=3, category=4, gen=5, model=6, screen=7,
    cpu=8, ram=9, storage=10, power=11, serial=12, pv=13, client=14,
    sent_date=15, location=16, comment=17,
)

# Séparateurs indiquant qu'une cellule OWNER contient en fait deux personnes
# (erreur de saisie : un seul champ owner pour deux responsables). Le 1er nom
# devient owner_id, le(s) suivant(s) sont conservés en commentaire (cf. README).
OWNER_SPLIT_RE = re.compile(r"\s*(?:-|/|&|,|\bet\b|\band\b)\s*")

# Catégories « officielles » (cf. seed.py). Toute autre valeur est importée
# telle quelle mais signalée dans le rapport.
KNOWN_CATEGORIES = {
    "Laptop", "Desktop", "Mobile Workstation", "Workstation",
    "Display", "Docking", "Thin Client", "Peripheral",
}

# Champs Device comparés lors d'un ré-import pour détecter les modifications.
COMPARABLE_FIELDS = [
    "model_name", "generation", "category_id", "entity_id", "order_number",
    "location_id", "owner_id", "client_id", "is_pv", "cpu", "ram_gb",
    "storage_gb", "screen_size", "power_w", "comment",
]


@dataclass
class ImportReport:
    imported: int = 0
    updated: int = 0
    unchanged: int = 0
    skipped: list = field(default_factory=list)   # (line, reason)
    errors: list = field(default_factory=list)    # (line, message)
    warnings: list = field(default_factory=list)  # (line, message)
    accounts_created: list = field(default_factory=list)  # (username, password)
    double_owners: list = field(default_factory=list)  # (line, primary, [co-owners])

    def skip(self, line, reason):
        self.skipped.append((line, reason))

    def error(self, line, message):
        self.errors.append((line, message))

    def warn(self, line, message):
        self.warnings.append((line, message))

    def render(self, dry_run: bool) -> str:
        head = "RAPPORT D'IMPORT" + (" (DRY-RUN — aucune écriture en base)" if dry_run else "")
        lines = ["", "=" * 60, head, "=" * 60]
        verb = "à importer" if dry_run else "importés"
        lines.append(f"  Nouveaux devices {verb}        : {self.imported}")
        lines.append(f"  Devices mis à jour             : {self.updated}")
        lines.append(f"  Devices inchangés              : {self.unchanged}")
        lines.append(f"  Lignes skippées                : {len(self.skipped)}")
        lines.append(f"  Erreurs                        : {len(self.errors)}")
        lines.append(f"  Avertissements                 : {len(self.warnings)}")
        lines.append(f"  Double-owners résolus          : {len(self.double_owners)}")
        lines.append(f"  Comptes utilisateurs créés     : {len(self.accounts_created)}")
        if self.skipped:
            lines.append("\n-- Lignes skippées --")
            lines += [f"  [Ligne {n}] {r}" for n, r in self.skipped]
        if self.warnings:
            lines.append("\n-- Avertissements --")
            lines += [f"  [Ligne {n}] {m}" for n, m in self.warnings]
        if self.errors:
            lines.append("\n-- Erreurs --")
            lines += [f"  [Ligne {n}] {m}" for n, m in self.errors]
        if self.double_owners:
            lines.append("\n-- Double-owners détectés et résolus --")
            lines += [f"  [Ligne {n}] owner={p} ; co-owner(s) en commentaire: {', '.join(co)}"
                      for n, p, co in self.double_owners]
        if self.accounts_created:
            note = "(seraient créés)" if dry_run else "(voir fichier de log des mots de passe)"
            lines.append(f"\n-- Comptes créés {note} --")
            lines += [f"  {u}" for u, _ in self.accounts_created]
        lines.append("=" * 60)
        return "\n".join(lines)


def cell(row, key):
    idx = COL[key]
    return row[idx].strip() if idx < len(row) else ""


def parse_strict_int(value, fieldname, line_no, report):
    """Renvoie un int seulement si la valeur est purement numérique, sinon None + warning."""
    v = (value or "").strip()
    if not v:
        return None
    if re.fullmatch(r"\d+", v):
        return int(v)
    report.warn(line_no, f"{fieldname}: valeur non numérique ignorée: {v!r}")
    return None


def resolve_entity(row, line_no, report):
    """Détermine (entity_name, order_number, entity_note) à partir de Zurich/CDS/FIX.

    Règles :
      - Zurich rempli = numéro de commande -> entité Zurich + order_number.
      - CDS == 'CDS' exactement -> entité CDS. Autre texte (ex. 'Also (CDS ?)')
        -> entité GVA par défaut + avertissement, texte conservé en commentaire.
      - FIX == 'FIX' -> entité FIX, sinon GVA + avertissement.
      - Aucune colonne remplie -> GVA (défaut).
    """
    z, c, f = cell(row, "zurich"), cell(row, "cds"), cell(row, "fix")
    filled = [(name, val) for name, val in (("Zurich", z), ("CDS", c), ("FIX", f)) if val]
    if len(filled) > 1:
        report.warn(line_no, f"Plusieurs colonnes entité remplies {filled}; priorité Zurich>CDS>FIX")

    if z:
        if re.fullmatch(r"\d+", z):
            return "Zurich", z, None
        report.warn(line_no, f"Zurich rempli mais pas un numéro de commande valide: {z!r}; order_number ignoré")
        return "Zurich", None, None
    if c:
        if c.strip().upper() == "CDS":
            return "CDS", None, None
        report.warn(line_no, f"Colonne CDS valeur ambiguë {c!r}; entité = GVA par défaut")
        return "GVA", None, f"[CDS?: {c}]"
    if f:
        if f.strip().upper() == "FIX":
            return "FIX", None, None
        report.warn(line_no, f"Colonne FIX valeur inattendue {f!r}; entité = GVA par défaut")
        return "GVA", None, None
    return "GVA", None, None


def get_or_create(session: Session, model, defaults=None, **kwargs):
    instance = session.query(model).filter_by(**kwargs).first()
    if instance:
        return instance, False
    params = dict(kwargs)
    params.update(defaults or {})
    instance = model(**params)
    session.add(instance)
    try:
        session.flush()
    except IntegrityError:
        session.rollback()
        instance = session.query(model).filter_by(**kwargs).one()
        return instance, False
    return instance, True


def get_or_create_user(session: Session, username: str, report: ImportReport):
    """Récupère ou crée un utilisateur. À la création, génère un mot de passe
    fort aléatoire (loggé dans le rapport pour le fichier de comptes)."""
    user = session.query(User).filter_by(username=username).first()
    if user:
        return user
    password = secrets.token_urlsafe(16)
    user = User(
        username=username,
        email=f"{username.lower().replace(' ', '_')}@local",
        password_hash=hash_password(password),
        role=UserRole.USER,
    )
    session.add(user)
    session.flush()
    report.accounts_created.append((username, password))
    return user


def ensure_admin(session: Session, report: ImportReport) -> User:
    """Utilisateur 'system' pour created_by/updated_by. Réutilise admin si présent."""
    admin = session.query(User).filter_by(username="admin").first()
    if not admin:
        admin = session.query(User).first()
    if admin:
        return admin
    # Aucun utilisateur : on crée un compte technique avec mot de passe fort.
    password = secrets.token_urlsafe(16)
    admin = User(
        username="system_admin",
        email="admin@inventory.local",
        password_hash=hash_password(password),
        role=UserRole.ADMIN,
    )
    session.add(admin)
    session.flush()
    report.accounts_created.append(("system_admin", password))
    return admin


def build_device_values(row, line_no, session, admin, report):
    """Construit le dict des valeurs d'un device, ou None si la ligne doit être skippée."""
    sn = cell(row, "serial")
    if not sn or sn.upper() == "[NULL]":
        report.skip(line_no, "S/N vide ou [NULL] — ligne rejetée (corriger le S/N puis ré-importer)")
        return None

    entity_name, order_number, entity_note = resolve_entity(row, line_no, report)
    entity_obj, _ = get_or_create(session, Entity, name=entity_name)

    owner_name = cell(row, "owner") or "Unknown"
    co_owners = []
    if owner_name != "Unknown":
        parts = [p.strip() for p in OWNER_SPLIT_RE.split(owner_name) if p.strip()]
        if len(parts) > 1:
            owner_name, co_owners = parts[0], parts[1:]
            report.double_owners.append((line_no, owner_name, co_owners))
    owner = get_or_create_user(session, owner_name, report)

    client_obj = None
    client_val = cell(row, "client")
    if client_val:
        client_obj, _ = get_or_create(session, Client, name=client_val)

    cat_val = cell(row, "category") or "Unknown"
    if cat_val not in KNOWN_CATEGORIES and cat_val != "Unknown":
        report.warn(line_no, f"Catégorie inhabituelle (non standard) importée telle quelle: {cat_val!r}")
    cat_obj, _ = get_or_create(session, Category, name=cat_val)

    lieu_val = cell(row, "location") or "Unknown"
    lieu_obj, _ = get_or_create(session, Location, name=lieu_val)

    ram_gb = parse_strict_int(cell(row, "ram"), "RAM (GB)", line_no, report)
    storage_gb = parse_strict_int(cell(row, "storage"), "Storage (GB)", line_no, report)
    power_w = parse_strict_int(cell(row, "power"), "Hosting Power (W)", line_no, report)

    is_pv = cell(row, "pv").lower() in ("yes", "oui", "1", "true")

    # Préfixes injectés (co-owner, annotation d'entité) sans écraser le commentaire existant.
    prefixes = []
    if co_owners:
        prefixes.append(f"[co-owner: {', '.join(co_owners)}]")
    if entity_note:
        prefixes.append(entity_note)
    existing_comment = cell(row, "comment")
    parts_comment = prefixes + ([existing_comment] if existing_comment else [])
    comment = " ".join(parts_comment) if parts_comment else None

    return dict(
        serial_number=sn,
        model_name=cell(row, "model") or "Unknown",
        generation=cell(row, "gen") or None,
        category_id=cat_obj.id,
        entity_id=entity_obj.id,
        order_number=order_number,
        location_id=lieu_obj.id,
        owner_id=owner.id,
        client_id=client_obj.id if client_obj else None,
        is_pv=is_pv,
        cpu=cell(row, "cpu") or None,
        ram_gb=ram_gb,
        storage_gb=storage_gb,
        screen_size=cell(row, "screen") or None,
        power_w=power_w,
        comment=comment,
    )


def upsert_device(session, values, line_no, admin, report):
    """Crée le device ou met à jour les champs modifiés (avec device_history)."""
    existing = session.query(Device).filter_by(serial_number=values["serial_number"]).first()
    if existing is None:
        session.add(Device(created_by=admin.id, **values))
        report.imported += 1
        return

    changed = []
    for fname in COMPARABLE_FIELDS:
        new_val = values[fname]
        old_val = getattr(existing, fname)
        if old_val != new_val:
            session.add(DeviceHistory(
                device_id=existing.id,
                user_id=admin.id,
                field_changed=fname,
                old_value=None if old_val is None else str(old_val),
                new_value=None if new_val is None else str(new_val),
            ))
            setattr(existing, fname, new_val)
            changed.append(fname)
    if changed:
        existing.updated_by = admin.id
        report.updated += 1
        report.warn(line_no, f"Device S/N={values['serial_number']} mis à jour: {', '.join(changed)}")
    else:
        report.unchanged += 1


def write_accounts_log(report: ImportReport, path: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        f.write("# Comptes créés lors de l'import CSV.\n")
        f.write("# À communiquer manuellement aux utilisateurs.\n")
        f.write("# ATTENTION : l'app ne gère PAS encore le changement de mot de passe\n")
        f.write("#             à la première connexion (aucun champ must_change_password).\n")
        f.write(f"# Généré le {datetime.now().isoformat(timespec='seconds')}\n\n")
        for username, password in report.accounts_created:
            f.write(f"{username}\t{password}\n")


def run_import(csv_path: str, dry_run: bool = False, accounts_log_path: str | None = None,
               session_factory=SessionLocal) -> ImportReport:
    report = ImportReport()
    session = session_factory()
    try:
        admin = ensure_admin(session, report)

        with open(csv_path, newline="", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            try:
                next(reader)  # header
            except StopIteration:
                report.error(0, "Fichier vide")
                return report

            for line_no, row in enumerate(reader, start=2):
                if not any(c.strip() for c in row):
                    continue  # ligne entièrement vide
                if len(row) < EXPECTED_COLS:
                    report.warn(line_no, f"Ligne avec {len(row)} colonnes (<{EXPECTED_COLS}), complétée par des vides")
                    row = row + [""] * (EXPECTED_COLS - len(row))

                sp = session.begin_nested()
                try:
                    values = build_device_values(row, line_no, session, admin, report)
                    if values is None:
                        sp.rollback()
                        continue
                    upsert_device(session, values, line_no, admin, report)
                    sp.commit()
                except Exception as exc:  # noqa: BLE001 — capture par ligne, reportée
                    sp.rollback()
                    report.error(line_no, f"{type(exc).__name__}: {exc}")

        if dry_run:
            session.rollback()
        else:
            session.commit()
    finally:
        session.close()

    # Écriture du fichier de comptes (uniquement hors dry-run et s'il y a des comptes)
    if report.accounts_created and not dry_run:
        if accounts_log_path is None:
            stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            accounts_log_path = os.path.abspath(f"imported_accounts_{stamp}.log")
        write_accounts_log(report, accounts_log_path)
        report.accounts_log_path = accounts_log_path  # type: ignore[attr-defined]

    return report


def main():
    default_csv = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "BD_inventory.csv"))
    parser = argparse.ArgumentParser(description="Import du parc matériel depuis un CSV.")
    parser.add_argument("csv_path", nargs="?", default=default_csv,
                        help=f"Chemin du CSV (défaut: {default_csv})")
    parser.add_argument("--dry-run", action="store_true",
                        help="Valide et mappe tout sans rien écrire en base, puis affiche le rapport.")
    parser.add_argument("--accounts-log", default=None,
                        help="Chemin du fichier de log des comptes créés (défaut: imported_accounts_<timestamp>.log)")
    args = parser.parse_args()

    if not os.path.isfile(args.csv_path):
        raise SystemExit(f"Fichier introuvable: {args.csv_path}")

    report = run_import(args.csv_path, dry_run=args.dry_run, accounts_log_path=args.accounts_log)
    print(report.render(args.dry_run))
    log_path = getattr(report, "accounts_log_path", None)
    if log_path:
        print(f"\nMots de passe des comptes créés écrits dans : {log_path}")
        print("→ Communiquez-les manuellement ; pensez à les faire changer (flow non géré par l'app).")


if __name__ == "__main__":
    main()
