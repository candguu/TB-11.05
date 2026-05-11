import sqlite3

conn = sqlite3.connect('tb_database.db')
c = conn.cursor()

# Create user_api_keys table
c.execute("""
    CREATE TABLE IF NOT EXISTS user_api_keys (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id        INTEGER NOT NULL,
        api_key_enc    TEXT    NOT NULL,
        api_secret_enc TEXT    NOT NULL,
        label          TEXT,
        is_testnet     INTEGER NOT NULL DEFAULT 1,
        is_active      INTEGER NOT NULL DEFAULT 0,
        is_valid       INTEGER NOT NULL DEFAULT 0,
        created_at     TEXT    NOT NULL,
        updated_at     TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
""")

# Create indexes
c.execute("""
    CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id 
    ON user_api_keys(user_id)
""")

c.execute("""
    CREATE INDEX IF NOT EXISTS idx_user_api_keys_active 
    ON user_api_keys(user_id, is_active)
""")

conn.commit()
print("Table created successfully!")

# Verify
tables = c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_api_keys'").fetchall()
print('Tables:', tables)

if tables:
    cols = c.execute('PRAGMA table_info(user_api_keys)').fetchall()
    print('\nColumns:')
    for col in cols:
        print(f'  {col[1]} {col[2]}')

conn.close()
