import csv
import os
import uuid
import argparse

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import SessionLocal, engine
from models import User, Category, Entity, Location, Client, Device, UserRole
from security import hash_password

def get_or_create(session, model, defaults=None, **kwargs):
    instance = session.query(model).filter_by(**kwargs).first()
    if instance:
        return instance, False
    else:
        params = dict((k, v) for k, v in kwargs.items())
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

def run_import(csv_path: str):
    session = SessionLocal()
    
    # Check for admin user or fallback
    admin_user = session.query(User).filter_by(username="admin").first()
    if not admin_user:
        admin_user = session.query(User).first()
    if not admin_user:
        admin_user = User(
            username="system_admin",
            email="admin@inventory.local",
            password_hash=hash_password("Admin123!"),
            role=UserRole.ADMIN,
        )
        session.add(admin_user)
        session.commit()
        
    try:
        with open(csv_path, newline='', encoding='utf-8') as f:
            reader = csv.reader(f)
            headers = next(reader)
            
            for i, row in enumerate(reader, start=2):
                if len(row) < 18:
                    row.extend([''] * (18 - len(row)))  # pad with empty strings just in case
                
                # 0: OWNER, 1: Zurich, 2: CDS, 3: FIX, 4: Category, 5: Gen, 6: Model,
                # 7: Taille (pouces), 8: Preocesseur, 9: RAM (GB), 10: Storage (GB), 
                # 11: Hosting Power (W), 12: Serial Number, 13: PV, 14: Client / Partenaire, 
                # 15: Date d'envoi, 16: Lieu, 17: Solution / Commentaire
                
                owner_name = row[0].strip()
                zurich_val = row[1].strip()
                cds_val = row[2].strip()
                fix_val = row[3].strip()
                cat_val = row[4].strip()
                gen_val = row[5].strip()
                model_val = row[6].strip()
                screen_val = row[7].strip()
                cpu_val = row[8].strip()
                ram_str = row[9].strip()
                storage_str = row[10].strip()
                power_str = row[11].strip()
                sn_val = row[12].strip()
                pv_val = row[13].strip()
                client_val = row[14].strip()
                date_val = row[15].strip()
                lieu_val = row[16].strip()
                comment_val = row[17].strip()
                
                # Entities logic
                entity_name = "GVA"
                if zurich_val:
                    entity_name = "Zurich"
                elif cds_val:
                    entity_name = "CDS"
                elif fix_val:
                    entity_name = "FIX"
                    
                entity_obj, _ = get_or_create(session, Entity, name=entity_name)
                
                # OWNER logic
                if not owner_name:
                    owner_name = "Unknown"
                    
                user_obj, _ = get_or_create(
                    session, User, 
                    defaults={
                        "email": f"{owner_name.lower().replace(' ', '_')}@local",
                        "password_hash": hash_password("123"),
                        "role": UserRole.USER
                    }, 
                    username=owner_name
                )
                
                # Client
                client_obj = None
                if client_val:
                    client_obj, _ = get_or_create(session, Client, name=client_val)
                    
                # Category
                if not cat_val:
                    cat_val = "Unknown"
                cat_obj, _ = get_or_create(session, Category, name=cat_val)
                
                # Lieu
                if not lieu_val:
                    lieu_val = "Unknown"
                lieu_obj, _ = get_or_create(session, Location, name=lieu_val)
                
                # SN Logic
                if not sn_val or sn_val == "[NULL]" or sn_val == "":
                    sn_val = str(uuid.uuid4())[:8] # short hash string for uniqueness 
                
                # Numbers
                def to_int(v):
                    try:
                        return int(''.join(filter(str.isdigit, v))) if v else None
                    except ValueError:
                        return None
                
                ram_gb = to_int(ram_str)
                storage_gb = to_int(storage_str)
                power_w = to_int(power_str)
                
                is_pv = pv_val.lower() in ("yes", "oui", "1", "true")
                
                existing_device = session.query(Device).filter_by(serial_number=sn_val).first()
                if existing_device:
                    print(f"[Line {i}] Skipped: Device with S/N {sn_val} already exists.")
                    continue
                
                new_device = Device(
                    serial_number=sn_val,
                    model_name=model_val or "Unknown",
                    generation=gen_val if gen_val else None,
                    category_id=cat_obj.id,
                    entity_id=entity_obj.id,
                    location_id=lieu_obj.id,
                    owner_id=user_obj.id,
                    client_id=client_obj.id if client_obj else None,
                    is_pv=is_pv,
                    cpu=cpu_val if cpu_val else None,
                    ram_gb=ram_gb,
                    storage_gb=storage_gb,
                    screen_size=screen_val if screen_val else None,
                    power_w=power_w,
                    comment=comment_val if comment_val else None,
                    created_by=admin_user.id
                )
                
                session.add(new_device)
                try:
                    session.commit()
                    print(f"[Line {i}] Imported: S/N={sn_val} Model={model_val}")
                except IntegrityError as e:
                    session.rollback()
                    print(f"[Line {i}] Error importing S/N={sn_val}: Duplicate or constraint failed.")
                    
    except Exception as e:
        print(f"FATAL ERROR reading CSV: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    csv_path = os.path.join(os.path.dirname(__file__), "..", "BD_inventory.csv")
    csv_path = os.path.abspath(csv_path)
    run_import(csv_path)