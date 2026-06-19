import os
from sqlalchemy import create_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+psycopg2://teamup_user:oLnFneAtzOS1KrW0EBCl9KBs6BYQIcjh@dpg-d8bqhul8nd3s738tbc20-a.virginia-postgres.render.com/teamup_db_yilz?sslmode=require"
engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        print("Connected to:", conn.engine.url.host)
        
        # Check tables
        result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
        tables = [r[0] for r in result.fetchall()]
        print("Tables:", tables)
        
        if 'usuarios' in tables:
            result = conn.execute(text("SELECT email FROM usuarios"))
            print("Usuarios:", [r[0] for r in result.fetchall()])
        else:
            print("Table 'usuarios' does not exist")
            
except Exception as e:
    print("Error:", e)
