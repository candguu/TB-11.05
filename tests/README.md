# Test Dosyaları

Bu klasör uygulama testleri için kullanılır.

## Test Scriptleri

### test_login.py
Temel login fonksiyonalitesini test eder.

```bash
python tests/test_login.py
```

### test_all_logins.py
Tüm login senaryolarını kapsamlı şekilde test eder.

```bash
python tests/test_all_logins.py
```

### quick_test_login.py
Hızlı login testi yapar.

```bash
python tests/quick_test_login.py
```

## Test Çalıştırma

Testleri çalıştırmadan önce:

1. Geliştirme ortamının aktif olduğundan emin olun
2. Test database'i kullanın (production database'i kullanmayın)
3. Gerekli environment variable'ları ayarlayın

```bash
# Tüm testleri çalıştır
python -m pytest tests/

# Belirli bir test dosyasını çalıştır
python tests/test_login.py
```

## Notlar

- Testler development ortamında çalıştırılmalıdır
- Production database'e zarar vermemek için dikkatli olun
- Test sonuçlarını log dosyalarından kontrol edin
