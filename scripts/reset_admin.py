import os
import sqlite3
import sys
from getpass import getpass

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from core.security import _hash_password

DB_PATH = os.getenv("DB_PATH", "tb_database.db")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@tbot.com")


def main():
    new_password = os.getenv("ADMIN_NEW_PASSWORD") or getpass("Yeni admin sifresi: ")
    if len(new_password) < 8:
        raise SystemExit("Sifre en az 8 karakter olmali.")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    admin = conn.execute(
        "SELECT id, email, role FROM users WHERE email=?",
        (ADMIN_EMAIL,)
    ).fetchone()
    if not admin:
        print("Admin bulunamadi; sunucu ilk acilista olusturacak.")
        conn.close()
        return

    conn.execute(
        "UPDATE users SET password_hash=? WHERE id=?",
        (_hash_password(new_password), admin["id"])
    )
    conn.commit()
    conn.close()
    print(f"Admin sifresi guncellendi: {admin['email']}")


if __name__ == "__main__":
    main()
