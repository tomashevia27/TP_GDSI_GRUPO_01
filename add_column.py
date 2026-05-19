import sqlite3

try:
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    cursor.execute("ALTER TABLE partidos ADD COLUMN cupos_disponibles INTEGER NOT NULL DEFAULT 0;")
    conn.commit()
    print("Column added successfully.")
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
