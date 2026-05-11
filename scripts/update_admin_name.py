import os
import sqlite3

DB_PATH = os.getenv("DB_PATH", "tb_database.db")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@tbot.com")
ADMIN_FIRST_NAME = os.getenv("ADMIN_FIRST_NAME", "Admin")
ADMIN_LAST_NAME = os.getenv("ADMIN_LAST_NAME", "TB")

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row

conn.execute(
    "UPDATE users SET first_name=?, last_name=? WHERE email=?",
    (ADMIN_FIRST_NAME, ADMIN_LAST_NAME, ADMIN_EMAIL)
)
conn.commit()

admin = conn.execute(
    "SELECT first_name, last_name, email FROM users WHERE email=?",
    (ADMIN_EMAIL,)
).fetchone()
if admin:
    print(f"Admin guncellendi: {admin['first_name']} {admin['last_name']} ({admin['email']})")
else:
    print("Admin bulunamadi")

conn.close()
