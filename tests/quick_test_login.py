import os
import requests

base_url = os.getenv("TEST_BASE_URL", "http://localhost:5000")
email = os.getenv("TEST_LOGIN_EMAIL")
password = os.getenv("TEST_LOGIN_PASSWORD")

if not email or not password:
    raise SystemExit("TEST_LOGIN_EMAIL ve TEST_LOGIN_PASSWORD environment variable olarak verilmeli.")

response = requests.post(f"{base_url}/api/auth/login", json={
    "email": email,
    "password": password,
}, timeout=10)

print(f"Status: {response.status_code}")
if response.status_code == 200:
    print("Giris basarili.")
    print(f"Token alindi: {response.json()['token'][:30]}...")
else:
    print("Giris basarisiz.")
    print(f"Hata: {response.json()}")
