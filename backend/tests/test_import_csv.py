"""Tests de import_csv.run_import sur un petit CSV représentatif.

Couvre : ligne normale, S/N vide (skip), entité ambiguë (CDS -> GVA + warning),
valeur numérique malformée (rejet + warning), numéro de commande Zurich
(-> order_number), et idempotence (ré-import sans duplication + upsert).

Utilise une base SQLite jetable ; aucune connexion PostgreSQL requise.
"""

import os
import sys

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

# backend/ doit être importable (import_csv, models, database... sans package)
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from database import Base  # noqa: E402
from models import Category, Device, Entity, User  # noqa: E402
import import_csv  # noqa: E402

HEADER = (
    "OWNER,Zurich,CDS,FIX,Category,Gen,Model,Taille (pouces),Preocesseur,"
    "RAM (GB),Storage (GB),Hosting Power (W),Serial Number,PV,"
    "Client / Partenaire,Date d'envoi,Lieu,Solution / Commentaire"
)

ROWS = [
    # normale
    "Yvan,,,,Desktop,G6,HP EliteDesk 800 G6,,,16,512,,8CC0200KBD,yes,,,Stock,",
    # numéro de commande Zurich -> order_number, + RAM malformée à rejeter
    "Benjamin,2331,,,Laptop,G11,HP EliteBook 840,14,,16GB DDR4,1024,,5CG1234ABC,,,,Stock,",
    # S/N vide -> skip
    "Herve,,,,Workstation,G9,HP Z2 Mini G9,,,,,,,yes,,,Stock,",
    # CDS ambigu -> GVA + warning
    "Benjamin,,Also (CDS ?),,Display,,HP 738pu,38,,,,,CN44142R2Q,,,,5eme,",
    # catégorie parasite -> importée mais warning
    "Yvan,,,,SPARE PAIR,G1i,HP USB-C Dock G5,,,,,,1H9506ZT9J,,Etat de Geneve,,Client,",
    # double-owner "NomA - NomB" -> owner=NomA, co-owner NomB en commentaire
    "Benjamin - Cynthia,,,,Laptop,G11,HP EliteBook X,,,16,512,,SN-DUAL-1,,,,Stock,",
]


def _make_session_factory(db_path):
    engine = create_engine(f"sqlite:///{db_path}")

    # Recette pysqlite : permet aux SAVEPOINT (begin_nested) de fonctionner.
    @event.listens_for(engine, "connect")
    def _do_connect(dbapi_connection, _):
        dbapi_connection.isolation_level = None

    @event.listens_for(engine, "begin")
    def _do_begin(conn):
        conn.exec_driver_sql("BEGIN")

    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture()
def session_factory(tmp_path):
    db_path = tmp_path / "test.db"
    factory = _make_session_factory(str(db_path))
    # Seed minimal : un admin pour created_by/updated_by + entité GVA par défaut.
    s = factory()
    from models import UserRole
    from security import hash_password
    s.add(User(username="admin", email="admin@inventory.local",
               password_hash=hash_password("x"), role=UserRole.ADMIN))
    s.add(Entity(name="GVA"))
    s.commit()
    s.close()
    return factory


@pytest.fixture()
def csv_file(tmp_path):
    path = tmp_path / "BD_test.csv"
    path.write_text("\n".join([HEADER, *ROWS]) + "\n", encoding="utf-8-sig")
    return str(path)


def test_import_basic_counts(csv_file, session_factory):
    report = import_csv.run_import(csv_file, session_factory=session_factory)

    # 5 lignes importables ; 1 ligne (S/N vide) skippée.
    assert report.imported == 5
    assert len(report.skipped) == 1
    assert "S/N vide" in report.skipped[0][1]
    assert report.errors == []


def test_zurich_order_number_and_numeric_reject(csv_file, session_factory):
    report = import_csv.run_import(csv_file, session_factory=session_factory)
    s = session_factory()
    dev = s.query(Device).filter_by(serial_number="5CG1234ABC").first()

    assert dev is not None
    assert dev.entity.name == "Zurich"
    assert dev.order_number == "2331"      # numéro de commande récupéré
    assert dev.ram_gb is None              # "16GB DDR4" rejeté, pas transformé en 164
    assert dev.storage_gb == 1024
    s.close()

    assert any("RAM" in m for _, m in report.warnings)


def test_ambiguous_cds_falls_back_to_gva(csv_file, session_factory):
    report = import_csv.run_import(csv_file, session_factory=session_factory)
    s = session_factory()
    dev = s.query(Device).filter_by(serial_number="CN44142R2Q").first()

    assert dev.entity.name == "GVA"               # pas CDS
    assert "Also (CDS ?)" in (dev.comment or "")  # texte préservé en commentaire
    s.close()

    assert any("CDS" in m for _, m in report.warnings)


def test_parasite_category_imported_with_warning(csv_file, session_factory):
    report = import_csv.run_import(csv_file, session_factory=session_factory)
    s = session_factory()
    assert s.query(Category).filter_by(name="SPARE PAIR").first() is not None
    s.close()
    assert any("inhabituelle" in m for _, m in report.warnings)


def test_idempotent_reimport(csv_file, session_factory):
    import_csv.run_import(csv_file, session_factory=session_factory)
    report2 = import_csv.run_import(csv_file, session_factory=session_factory)

    # Deuxième passe : rien de neuf, tout inchangé, aucune duplication.
    assert report2.imported == 0
    assert report2.unchanged == 5

    s = session_factory()
    assert s.query(Device).count() == 5
    s.close()


def test_dry_run_writes_nothing(csv_file, session_factory):
    report = import_csv.run_import(csv_file, dry_run=True, session_factory=session_factory)
    assert report.imported == 5   # compté comme « à importer »

    s = session_factory()
    assert s.query(Device).count() == 0   # mais rien persisté
    s.close()


def test_double_owner_resolution(csv_file, session_factory):
    report = import_csv.run_import(csv_file, session_factory=session_factory)
    s = session_factory()
    dev = s.query(Device).filter_by(serial_number="SN-DUAL-1").first()

    assert dev.owner.username == "Benjamin"          # 1er nom = owner_id
    assert "[co-owner: Cynthia]" in (dev.comment or "")  # 2e nom préservé en commentaire
    s.close()

    # tracé dans la catégorie dédiée du rapport
    assert any(p == "Benjamin" and "Cynthia" in co for _, p, co in report.double_owners)
