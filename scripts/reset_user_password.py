import os
import sqlite3
import sys
from getpass import getpass

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from core.security import _hash_password

DB_PATH = os.getenv("DB_PATH", "tb_database.db")


def main():
    email = os.getenv("RESET_USER_EMAIL") or input("Kullanici e-postasi: ").strip().lower()
    new_password = os.getenv("RESET_USER_PASSWORD") or getpass("Yeni sifre: ")
    if len(new_password) < 8:
        raise SystemExit("Sifre en az 8 karakter olmali.")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, first_name FROM users WHERE email=?", (email,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        raise SystemExit(f"Kullanici bulunamadi: {email}")

    cursor.execute(
        "UPDATE users SET password_hash=? WHERE id=?",
        (_hash_password(new_password), user[0])
    )
    conn.commit()
    conn.close()
    print(f"Sifre guncellendi: {user[1]}")


if __name__ == "__main__":
    main()
