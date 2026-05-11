/* ═══════════════════════════════════════
   API KEY MANAGEMENT - Binance Testnet (Multi-API Support)
═══════════════════════════════════════ */

// ─── Load Saved APIs List ───
async function loadSavedApisList() {
  if (!AUTH.token) return;
  
  try {
    const res = await fetch(API + '/binance/api-keys', {
      headers: { 'Authorization': 'Bearer ' + AUTH.token }
    });
    const data = await res.json();
    
    const listContainer = document.getElementById('saved-apis-list');
    if (!listContainer) return;
    
    if (!data.configured) {
      listContainer.innerHTML = `
        <div style="text-align:center;padding:40px;color:var(--t2);font-size:13px">
          Henüz kayıtlı API anahtarı yok
        </div>
      `;
      return;
    }
    
    // Tek API göster (eski sistem)
    const isValid = data.valid;
    const isActive = data.is_active;
    const statusColor = (isValid && isActive) ? 'var(--green)' : isActive ? 'var(--amber)' : 'rgba(255,255,255,0.2)';
    const label = data.label || 'API Anahtarı';
    const toggleText = isActive ? 'Devre Dışı Bırak' : 'Aktif Et';
    
    let statusBadge = '';
    if (isActive && isValid) {
      statusBadge = '<span style="font-size:11px;color:var(--green);background:rgba(0,230,118,0.1);padding:4px 10px;border-radius:4px;font-weight:600">AKTİF</span>';
    } else if (isActive && !isValid) {
      statusBadge = '<span style="font-size:11px;color:var(--red);background:rgba(255,23,68,0.1);padding:4px 10px;border-radius:4px;font-weight:600">GEÇERSİZ</span>';
    } else {
      statusBadge = '<span style="font-size:11px;color:var(--t3);background:rgba(255,255,255,0.05);padding:4px 10px;border-radius:4px;font-weight:600">DEVRE DIŞI</span>';
    }
    
    listContainer.innerHTML = `
      <div style="background:rgba(255,255,255,0.02);border:1px solid ${(isValid && isActive) ? 'rgba(0,230,118,0.3)' : 'rgba(255,255,255,0.08)'};border-radius:8px;padding:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:10px;height:10px;border-radius:50%;background:${statusColor};box-shadow:${(isValid && isActive) ? '0 0 8px rgba(0,230,118,0.5)' : 'none'}"></div>
            <div>
              <div style="font-size:13px;font-weight:600;color:#fff;margin-bottom:4px">${label}</div>
              <div style="font-size:11px;color:var(--t2);font-family:var(--mono)">${data.hint}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            ${statusBadge}
            <button onclick="toggleApiStatus()" 
                    style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);color:var(--t2);padding:6px 12px;border-radius:6px;font-size:11px;cursor:pointer;transition:all 0.2s"
                    onmouseover="this.style.background='rgba(255,255,255,0.08)'"
                    onmouseout="this.style.background='rgba(255,255,255,0.04)'">
              ${toggleText}
            </button>
            <button onclick="deleteApiKeys()" 
                    style="background:transparent;border:1px solid rgba(255,23,68,0.3);color:var(--red);padding:6px 12px;border-radius:6px;font-size:11px;cursor:pointer;transition:all 0.2s"
                    onmouseover="this.style.background='rgba(255,23,68,0.1)'"
                    onmouseout="this.style.background='transparent'">
              Sil
            </button>
          </div>
        </div>
        ${data.error && isActive ? `<div style="font-size:11px;color:var(--red);margin-top:8px">Hata: ${data.error}</div>` : ''}
      </div>
    `;
    
  } catch (e) {
    console.warn('Load saved APIs error:', e);
  }
}

// ─── Toggle API Status ───
async function toggleApiStatus() {
  try {
    const res = await fetch(API + '/binance/api-keys/toggle', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + AUTH.token }
    });
    const data = await res.json();
    if (!res.ok) {
      showToast('error', data.error || 'API durumu guncellenemedi');
      return;
    }
    showToast('success', data.message || 'API durumu guncellendi');
    loadApiKeyStatus();
  } catch (e) {
    showToast('error', 'Baglanti hatasi');
  }
}

// ─── Set Active API ───
async function setActiveApi(apiId) {
  try {
    const res = await fetch(API + '/binance/api-keys/set-active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AUTH.token },
      body: JSON.stringify({ api_id: apiId })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast('error', data.error || 'Aktif API degistirilemedi');
      return;
    }
    showToast('success', data.message || 'Aktif API degistirildi');
    loadApiKeyStatus();
  } catch (e) {
    showToast('error', 'Baglanti hatasi');
  }
}

// ─── Delete API by ID ───
async function deleteApiById(apiId) {
  if (!confirm('Bu API anahtarini silmek istediginizden emin misiniz?')) return;
  try {
    const res = await fetch(API + '/binance/api-keys/' + encodeURIComponent(apiId), {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + AUTH.token }
    });
    const data = await res.json();
    if (!res.ok) {
      showToast('error', data.error || 'API silinemedi');
      return;
    }
    showToast('success', data.message || 'API silindi');
    loadApiKeyStatus();
  } catch (e) {
    showToast('error', 'Baglanti hatasi');
  }
}

// ─── Load API Key Status ───
async function loadApiKeyStatus() {
  if (!AUTH.token) return;
  
  try {
    const res = await fetch(API + '/binance/api-keys', {
      headers: { 'Authorization': 'Bearer ' + AUTH.token }
    });
    const data = await res.json();
    
    const dot = document.getElementById('api-conn-dot');
    const text = document.getElementById('api-conn-text');
    const hint = document.getElementById('api-conn-hint');
    const actions = document.getElementById('api-conn-actions');
    const keyInput = document.getElementById('api-key-input');
    const secretInput = document.getElementById('api-secret-input');
    
    if (data.configured && data.valid) {
      if (dot) {
        dot.style.background = 'var(--green)';
        dot.style.boxShadow = '0 0 12px rgba(0,230,118,0.6)';
      }
      if (text) text.textContent = 'Bağlı ve Aktif';
      if (hint) hint.textContent = `API Key: ${data.hint}`;
      if (actions) actions.style.display = 'flex';
      
      // Clear inputs when connected
      if (keyInput) {
        keyInput.value = '';
        keyInput.type = 'text';
        keyInput.readOnly = false;
        keyInput.style.cursor = 'text';
        keyInput.style.opacity = '1';
        keyInput.placeholder = 'Yeni API Key eklemek için buraya girin';
      }
      if (secretInput) {
        secretInput.value = '';
        secretInput.type = 'password';
        secretInput.readOnly = false;
        secretInput.style.cursor = 'text';
        secretInput.style.opacity = '1';
        secretInput.placeholder = 'Yeni API Secret eklemek için buraya girin';
      }
    } else if (data.configured && !data.valid) {
      if (dot) {
        dot.style.background = 'var(--amber)';
        dot.style.boxShadow = '0 0 12px rgba(255,193,7,0.6)';
      }
      if (text) text.textContent = 'Geçersiz';
      if (hint) hint.textContent = data.error || 'API anahtarları geçersiz';
      if (actions) actions.style.display = 'flex';
      
      // Clear inputs
      if (keyInput) {
        keyInput.value = '';
        keyInput.readOnly = false;
        keyInput.style.cursor = 'text';
        keyInput.style.opacity = '1';
      }
      if (secretInput) {
        secretInput.value = '';
        secretInput.readOnly = false;
        secretInput.style.cursor = 'text';
        secretInput.style.opacity = '1';
      }
    } else {
      if (dot) {
        dot.style.background = 'var(--red)';
        dot.style.boxShadow = '0 0 12px rgba(255,23,68,0.6)';
      }
      if (text) text.textContent = 'Bağlı Değil';
      if (hint) hint.textContent = 'API anahtarı kaydedilmemiş';
      if (actions) actions.style.display = 'none';
      
      // Clear inputs and make editable
      if (keyInput) {
        keyInput.value = '';
        keyInput.type = 'text';
        keyInput.readOnly = false;
        keyInput.style.cursor = 'text';
        keyInput.style.opacity = '1';
      }
      if (secretInput) {
        secretInput.value = '';
        secretInput.type = 'password';
        secretInput.readOnly = false;
        secretInput.style.cursor = 'text';
        secretInput.style.opacity = '1';
      }
    }
    
    // Load saved APIs list
    loadSavedApisList();
    
  } catch (e) {
    console.warn('API key status error:', e);
  }
}

// ─── Save API Keys ───
async function saveApiKeys() {
  const apiLabel = document.getElementById('api-label-input')?.value.trim() || 'API Anahtarı';
  const apiKey = document.getElementById('api-key-input')?.value.trim();
  const apiSecret = document.getElementById('api-secret-input')?.value.trim();
  
  // Eğer maskelenmiş değer ise (• karakteri içeriyorsa), kaydetme
  if (apiKey.includes('•') || apiSecret.includes('•')) {
    showToast('info', 'API anahtarları zaten kayıtlı');
    return;
  }
  
  if (!apiKey || !apiSecret) {
    showToast('error', 'API Key ve Secret gerekli');
    return;
  }
  
  const btn = document.getElementById('api-save-btn');
  if (btn) {
    btn.textContent = 'Doğrulanıyor...';
    btn.disabled = true;
  }
  
  try {
    const res = await fetch(API + '/binance/api-keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AUTH.token
      },
      body: JSON.stringify({
        api_key: apiKey,
        api_secret: apiSecret,
        label: apiLabel
      })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      showToast('success', 'API anahtarı kaydedildi ve doğrulandı!');
      
      // Clear inputs
      document.getElementById('api-label-input').value = '';
      document.getElementById('api-key-input').value = '';
      document.getElementById('api-secret-input').value = '';
      
      // Reload status
      loadApiKeyStatus();
    } else {
      showToast('error', data.error || 'API anahtarları geçersiz');
    }
  } catch (e) {
    console.error('[API] Error:', e);
    showToast('error', 'Bağlantı hatası: ' + e.message);
  } finally {
    if (btn) {
      btn.textContent = 'Kaydet ve Doğrula';
      btn.disabled = false;
    }
  }
}

// ─── Test API Connection ───
async function testApiConnection() {
  showToast('info', 'Bağlantı test ediliyor...');
  
  try {
    const res = await fetch(API + '/binance/account', {
      headers: { 'Authorization': 'Bearer ' + AUTH.token }
    });
    const data = await res.json();
    
    if (res.ok) {
      showToast('success', `Bağlantı başarılı! Bakiye: $${data.totalWalletBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
    } else {
      showToast('error', data.error || 'Bağlantı başarısız');
    }
  } catch (e) {
    showToast('error', 'Test hatası');
  }
}

// ─── Delete API Keys ───
async function deleteApiKeys() {
  if (!confirm('API anahtarlarini silmek istediginizden emin misiniz?')) return;
  try {
    const res = await fetch(API + '/binance/api-keys/delete', {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + AUTH.token }
    });
    const data = await res.json();
    if (!res.ok) {
      showToast('error', data.error || 'API anahtarlari silinemedi');
      return;
    }
    showToast('success', data.message || 'API anahtarlari silindi');
    loadApiKeyStatus();
  } catch (e) {
    showToast('error', 'Baglanti hatasi');
  }
}
