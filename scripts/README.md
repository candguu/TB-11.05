# Yardımcı Scriptler

Bu klasör sistem yönetimi için kullanılan yardımcı scriptleri içerir.

## Kullanılabilir Scriptler

### check_users.py
Sistemdeki tüm kullanıcıları listeler.

```bash
python scripts/check_users.py
```

### reset_admin.py
Admin kullanıcısının şifresini sıfırlar.

```bash
python scripts/reset_admin.py
```

### reset_user_password.py
Belirli bir kullanıcının şifresini sıfırlar.

```bash
python scripts/reset_user_password.py
```

### replace_footers.py
Template dosyalarındaki footer'ları toplu olarak günceller.

```bash
python scripts/replace_footers.py
```

## Notlar

- Tüm scriptler proje kök dizininden çalıştırılmalıdır
- Database dosyasına erişim gerektirir
- Üretim ortamında dikkatli kullanın
