"""Force une base SQLite avant tout import de `database` (qui crée l'engine
au moment de l'import). Évite toute dépendance à psycopg2 / PostgreSQL en test.
"""

import os

os.environ.setdefault("DATABASE_URL", "sqlite://")
