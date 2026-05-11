"""
TB Trading Bot - Hızlı Kurulum Scripti
========================================
Bu script projeyi hızlıca kurmak için gerekli adımları yapar.

Kullanım:
    python setup.py
"""

import os
import sys
import secrets
import subprocess

def print_header(text):
    """Başlık yazdır."""
    print("\n" + "="*70)
    print(f"  {text}")
    print("="*70)

def print_step(step, text):
    """Adım yazdır."""
    print(f"\n[{step}] {text}")

def check_python_version():
    """Python versiyonunu kontrol et."""
    print_step("1/6", "Python versiyonu kontrol ediliyor...")
    
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 veya üstü gerekli!")
        print(f"   Mevcut versiyon: {sys.version}")
        sys.exit(1)
    
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")

def create_env_file():
    """Eğer yoksa .env dosyası oluştur."""
    print_step("2/6", ".env dosyası kontrol ediliyor...")
    
    if os.path.exists(".env"):
        print("⚠️  .env dosyası zaten mevcut, atlanıyor...")
        return
    
    if not os.path.exists(".env.example"):
        print("❌ .env.example dosyası bulunamadı!")
        return
    
    # .env.example'dan kopyala
    with open(".env.example", "r", encoding="utf-8") as f:
        content = f.read()
    
    # SECRET_KEY oluştur
    secret_key = secrets.token_urlsafe(48)
    content = content.replace(
        "your-secret-key-min-32-characters-long-change-this-in-production",
        secret_key
    )
    
    # Admin şifre oluştur
    admin_password = secrets.token_urlsafe(16)
    content = content.replace(
        "your-strong-password-change-this",
        admin_password
    )
    
    # .env dosyasını yaz
    with open(".env", "w", encoding="utf-8") as f:
        f.write(content)
    
    print("✅ .env dosyası oluşturuldu")
    print(f"   Admin Email: admin@tbot.com")
    print(f"   Admin Password: {admin_password}")
    print("   ⚠️  Bu şifreyi kaydedin!")

def install_dependencies():
    """Bağımlılıkları yükle."""
    print_step("3/6", "Bağımlılıklar yükleniyor...")
    
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-r", "requirements.txt"
        ])
        print("✅ Bağımlılıklar yüklendi")
    except subprocess.CalledProcessError:
        print("❌ Bağımlılık yükleme hatası!")
        print("   Manuel olarak çalıştırın: pip install -r requirements.txt")

def create_directories():
    """Gerekli klasörleri oluştur."""
    print_step("4/6", "Klasörler oluşturuluyor...")
    
    directories = ["logs", "tests"]
    
    for directory in directories:
        if not os.path.exists(directory):
            os.makedirs(directory)
            print(f"✅ {directory}/ klasörü oluşturuldu")
        else:
            print(f"⚠️  {directory}/ klasörü zaten mevcut")

def validate_environment():
    """Environment variable'ları validate et."""
    print_step("5/6", "Environment değişkenleri kontrol ediliyor...")
    
    try:
        from core.env_validator import validate_environment
        result = validate_environment(strict=False)
        
        if result['valid']:
            print("✅ Tüm zorunlu değişkenler tanımlı")
        else:
            print("⚠️  Bazı değişkenler eksik (opsiyonel)")
    except Exception as e:
        print(f"⚠️  Validation hatası: {e}")

def run_tests():
    """Test'leri çalıştır."""
    print_step("6/6", "Test'ler çalıştırılıyor...")
    
    try:
        result = subprocess.run(
            [sys.executable, "-m", "pytest", "tests/", "-v"],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("✅ Tüm test'ler başarılı")
        else:
            print("⚠️  Bazı test'ler başarısız")
            print(result.stdout)
    except FileNotFoundError:
        print("⚠️  pytest bulunamadı, test'ler atlanıyor")
    except Exception as e:
        print(f"⚠️  Test hatası: {e}")

def print_next_steps():
    """Sonraki adımları yazdır."""
    print_header("🎉 KURULUM TAMAMLANDI!")
    
    print("\n📝 Sonraki Adımlar:")
    print("\n1. .env dosyasını kontrol edin ve gerekirse düzenleyin:")
    print("   - ADMIN_EMAIL")
    print("   - ADMIN_PASSWORD (yukarıda gösterilen şifreyi kullanın)")
    print("   - BINANCE_API_KEY ve BINANCE_API_SECRET (opsiyonel)")
    
    print("\n2. Uygulamayı başlatın:")
    print("   python main.py")
    
    print("\n3. Tarayıcıda açın:")
    print("   http://localhost:5000")
    
    print("\n4. Admin hesabı ile giriş yapın:")
    print("   Email: admin@tbot.com")
    print("   Password: (yukarıda gösterilen şifre)")
    
    print("\n📚 Dokümantasyon:")
    print("   - README.md - Genel bilgiler")
    print("   - IMPROVEMENTS.md - Yeni özellikler")
    print("   - docs/ - Detaylı dokümantasyon")
    
    print("\n🔧 Yardımcı Komutlar:")
    print("   - Test'leri çalıştır: pytest tests/ -v")
    print("   - Env validation: python core/env_validator.py")
    print("   - Admin şifre sıfırla: python scripts/reset_admin.py")
    
    print("\n" + "="*70 + "\n")

def main():
    """Ana fonksiyon."""
    print_header("TB TRADING BOT - KURULUM")
    
    try:
        check_python_version()
        create_env_file()
        install_dependencies()
        create_directories()
        validate_environment()
        run_tests()
        print_next_steps()
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Kurulum iptal edildi")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Beklenmeyen hata: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
