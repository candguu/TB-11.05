/* ═══════════════════════════════════════
       STATE
    ═══════════════════════════════════════ */
let AUTH = { token: null, user: null };
const API = window.location.origin + "/api";

/* ═══════════════════════════════════════
   PAGE LOAD - SAFETY CHECKS
═══════════════════════════════════════ */
// Fix any stuck body overflow on page load
(function() {
  // Reset body overflow immediately
  document.body.style.overflow = '';
  
  // Also reset on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', function() {
    const openModals = document.querySelectorAll('.modal-ov.open, #authModal.open, #mobile-menu.open');
    if (openModals.length === 0) {
      document.body.style.overflow = '';
    }
  });
})();

/* ═══════════════════════════════════════
   NAVIGATION ACTIVE STATE
═══════════════════════════════════════ */
function highlightActiveNav() {
  try {
    const path = window.location.pathname;
    const navTabs = document.querySelectorAll('#nav-tabs .nav-tab');
    
    if (!navTabs || navTabs.length === 0) return;
    
    // Get current dashboard tab if on dashboard
    const currentDashTab = localStorage.getItem('last-dashboard-tab') || 'markets2';
    
    // First pass: remove all active classes
    navTabs.forEach(tab => {
      tab.classList.remove('active');
    });
    
    // Second pass: find and mark the active tab
    let activeTab = null;
    
    navTabs.forEach(tab => {
      if (activeTab) return; // Already found active tab
      
      const href = tab.getAttribute('href');
      const onclick = tab.getAttribute('onclick');
      
      // For regular links (a tags with href)
      if (href) {
        // Exact match for home page
        if (path === '/' && href === '/') {
          activeTab = tab;
        }
        // Match for other pages
        else if (href !== '/' && path.startsWith(href)) {
          activeTab = tab;
        }
      }
      
      // For dashboard buttons (onclick with switchDash)
      if (onclick && path === '/dashboard') {
        // Extract the tab name from onclick attribute
        const match = onclick.match(/switchDash\('([^']+)'\)/);
        if (match && match[1] === currentDashTab) {
          activeTab = tab;
        }
      }
    });
    
    // Apply active class to the found tab
    if (activeTab) {
      activeTab.classList.add('active');
    }
  } catch (e) {
    console.error('highlightActiveNav error:', e);
  }
}

// Run on page load
window.addEventListener('DOMContentLoaded', highlightActiveNav);

/* ═══════════════════════════════════════
   EMERGENCY RESET FUNCTION
═══════════════════════════════════════ */
window.emergencyReset = function() {
  console.log('🚨 Emergency Reset Started');
  localStorage.clear();
  sessionStorage.clear();
  document.body.style.overflow = '';
  AUTH = { token: null, user: null };
  console.log('✅ Reset Complete - Reloading...');
  setTimeout(() => {
    window.location.href = '/';
  }, 500);
};

/* ═══════════════════════════════════════
   BINANCE-STYLE SETTINGS FUNCTIONS
═══════════════════════════════════════ */
function saveGeneralSettingsBinance() {
    const language = document.getElementById('settings-language-binance').value;
    const currency = document.getElementById('settings-currency-binance').value;
    const theme = document.getElementById('settings-theme-binance').value;
    
    // Save to localStorage or send to server
    localStorage.setItem('user-language', language);
    localStorage.setItem('user-currency', currency);
    localStorage.setItem('user-theme', theme);
    
    showNotification('Genel ayarlar başarıyla kaydedildi', 'success');
}

function saveTradingSettingsBinance() {
    const autoTrading = document.getElementById('settings-auto-trading').checked;
    
    // Save trading settings
    localStorage.setItem('auto-trading', autoTrading);
    
    showNotification('Trading ayarları başarıyla kaydedildi', 'success');
}

function saveSecuritySettingsBinance() {
    const autoLogout = document.getElementById('settings-auto-logout').value;
    const ipRestriction = document.getElementById('settings-ip-restriction').checked;
    const apiLogs = document.getElementById('settings-api-logs').checked;
    
    // Save security settings
    localStorage.setItem('auto-logout', autoLogout);
    localStorage.setItem('ip-restriction', ipRestriction);
    localStorage.setItem('api-logs', apiLogs);
    
    showNotification('Güvenlik ayarları başarıyla kaydedildi', 'success');
}

function saveNotificationSettingsBinance() {
    const emailNotifs = document.getElementById('settings-email-notifs').checked;
    const tradeNotifs = document.getElementById('settings-trade-notifs').checked;
    const securityAlerts = document.getElementById('settings-security-alerts').checked;
    
    // Save notification settings
    localStorage.setItem('email-notifications', emailNotifs);
    localStorage.setItem('trade-notifications', tradeNotifs);
    localStorage.setItem('security-alerts', securityAlerts);
    
    showNotification('Bildirim ayarları başarıyla kaydedildi', 'success');
}

function loadAccountBotDataBinance() {
    // Load saved settings from localStorage
    const language = 'tr'; // Always Turkish
    const currency = localStorage.getItem('user-currency') || 'usd';
    const autoLogout = localStorage.getItem('auto-logout') || '30';
    
    // Set form values
    const langSelect = document.getElementById('settings-language-binance');
    if (langSelect) langSelect.value = language;
    
    const currSelect = document.getElementById('settings-currency-binance');
    if (currSelect) currSelect.value = currency;
    
    const logoutSelect = document.getElementById('settings-auto-logout');
    if (logoutSelect) logoutSelect.value = autoLogout;
    
    // Set checkbox states for notifications
    const emailNotifs = localStorage.getItem('email-notifications') !== 'false';
    const tradeNotifs = localStorage.getItem('trade-notifications') !== 'false';
    const securityAlerts = localStorage.getItem('security-alerts') !== 'false';
    const priceAlerts = localStorage.getItem('price-alerts') === 'true';
    
    const emailNotifsCheck = document.getElementById('settings-email-notifs');
    if (emailNotifsCheck) emailNotifsCheck.checked = emailNotifs;
    
    const tradeNotifsCheck = document.getElementById('settings-trade-notifs');
    if (tradeNotifsCheck) tradeNotifsCheck.checked = tradeNotifs;
    
    const securityAlertsCheck = document.getElementById('settings-security-alerts');
    if (securityAlertsCheck) securityAlertsCheck.checked = securityAlerts;
    
    const priceAlertsCheck = document.getElementById('settings-price-alerts');
    if (priceAlertsCheck) priceAlertsCheck.checked = priceAlerts;
}

async function saveAutoLogout() {
    const autoLogout = document.getElementById('settings-auto-logout').value;
    localStorage.setItem('auto-logout', autoLogout);
    
    try {
        const res = await fetch(API + '/user/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + AUTH.token
            },
            body: JSON.stringify({
                auto_logout_minutes: parseInt(autoLogout)
            })
        });
        
        if (res.ok) {
            showNotification('Otomatik çıkış ayarı güncellendi', 'success');
        }
    } catch (e) {
        showNotification('Otomatik çıkış ayarı kaydedildi', 'success');
    }
}

function populateAccount() {
    const u = AUTH.user;
    if (!u) {
        // Try to load user from localStorage
        const savedUser = localStorage.getItem('tb_user');
        if (savedUser) {
            try {
                AUTH.user = JSON.parse(savedUser);
            } catch (e) {
                console.error('Error parsing saved user:', e);
                return;
            }
        } else {
            return;
        }
    }
    
    const user = AUTH.user;
    
    // Calculate fullname and initials
    const fullname = user.fullname || ((user.first_name || '') + ' ' + (user.last_name || '')).trim() || 'Belirtilmemiş';
    let initials = '';
    if (user.fullname) {
        const parts = user.fullname.split(' ');
        initials = parts.map(p => p.charAt(0)).join('').substring(0, 2);
    } else {
        initials = ((user.first_name || '')[0] || '') + ((user.last_name || '')[0] || '');
    }
    if (!initials) initials = (user.email || 'U')[0];
    
    const email = user.email || 'Belirtilmemiş';
    const userId = user.id ? '#' + user.id : '#—';
    const regDate = user.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : 'Bilinmiyor';
    const roleName = user.role === 'admin' ? 'Admin' : 'Kullanıcı';
    
    // Update profile header
    const avatarMain = document.getElementById('acc-avatar-main');
    if (avatarMain) avatarMain.textContent = initials.toUpperCase();
    
    const fullnameMain = document.getElementById('acc-fullname-main');
    if (fullnameMain) fullnameMain.textContent = fullname;
    
    const emailMain = document.getElementById('acc-email-main');
    if (emailMain) emailMain.textContent = email;
    
    const roleBadge = document.getElementById('acc-role-badge-main');
    if (roleBadge) roleBadge.textContent = roleName;
    
    // Update account info inputs
    const fullnameInput = document.getElementById('acc-fullname-input');
    if (fullnameInput) fullnameInput.value = fullname;
    
    const emailInput = document.getElementById('acc-email-input');
    if (emailInput) emailInput.value = email;
    
    const userIdEl = document.getElementById('acc-user-id');
    if (userIdEl) userIdEl.textContent = userId;
    
    const createdDate = document.getElementById('acc-created-date');
    if (createdDate) createdDate.textContent = regDate;
    
    // Load phone number
    const phoneInput = document.getElementById('acc-phone-input');
    if (phoneInput) {
        phoneInput.value = user.phone || '';
    }
    
    // Load country
    const countrySelect = document.getElementById('acc-country-select');
    if (countrySelect) {
        countrySelect.value = user.country || 'TR';
    }
    
    // Load language
    const languageSelect = document.getElementById('acc-language-select');
    if (languageSelect) {
        languageSelect.value = user.language || 'tr';
    }
    
    localStorage.removeItem('binance-api-key');
    localStorage.removeItem('binance-secret-key');
    // API keys are stored encrypted on the server, never in browser storage.
    const apiKey = null;
    const apiKeyInput = document.getElementById('acc-api-key');
    if (apiKeyInput) {
        if (apiKey) {
            apiKeyInput.value = apiKey.substring(0, 8) + '...';
        } else {
            apiKeyInput.value = '';
        }
    }
    
    const secretKeyInput = document.getElementById('acc-secret-key');
    if (secretKeyInput) {
        if (false) {
            secretKeyInput.value = '••••••••••••••••';
        } else {
            secretKeyInput.value = '';
        }
    }
    
    // Load activities
    loadAccountActivities();
}

async function saveAccountInfo() {
    const fullname = document.getElementById('acc-fullname-input').value.trim();
    const email = document.getElementById('acc-email-input').value.trim();
    const phone = document.getElementById('acc-phone-input').value.trim();
    const country = document.getElementById('acc-country-select').value;
    const language = document.getElementById('acc-language-select').value;
    
    // Validate fullname
    if (!fullname) {
        showNotification('Ad soyad boş olamaz', 'error');
        return;
    }
    
    // Split fullname into first and last
    const parts = fullname.split(' ');
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || parts[0];
    
    // Validate email
    if (!email) {
        showNotification('E-posta boş olamaz', 'error');
        return;
    }
    
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        showNotification('Geçerli bir e-posta adresi giriniz', 'error');
        return;
    }
    
    // Validate phone if provided
    if (phone) {
        const phoneClean = phone.replace(/[\s\-\(\)]/g, '');
        if (!/^(0|\+90)?5\d{9}$/.test(phoneClean)) {
            showNotification('Geçerli bir Türkiye telefon numarası giriniz (05XX XXX XX XX)', 'error');
            return;
        }
    }
    
    try {
        const res = await fetch(API + '/user/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + AUTH.token
            },
            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                email: email,
                phone: phone,
                country: country,
                language: language
            })
        });
        
        if (res.ok) {
            AUTH.user.first_name = firstName;
            AUTH.user.last_name = lastName;
            AUTH.user.email = email;
            AUTH.user.phone = phone;
            AUTH.user.country = country;
            AUTH.user.language = language;
            localStorage.setItem('tb_user', JSON.stringify(AUTH.user));
            
            // Update header
            document.getElementById('acc-fullname-main').textContent = fullname;
            document.getElementById('acc-email-main').textContent = email;
            applyLoggedIn();
            
            showNotification('Hesap bilgileri güncellendi', 'success');
        } else {
            const data = await res.json();
            showNotification(data.error || 'Güncelleme başarısız', 'error');
        }
    } catch (e) {
        showNotification('Bağlantı hatası', 'error');
    }
}

async function saveApiKeys() {
    const apiKey = document.getElementById('acc-api-key').value.trim();
    const secretKey = document.getElementById('acc-secret-key').value.trim();
    
    if (!apiKey || apiKey.includes('...')) {
        showNotification('Geçerli bir API Key giriniz', 'error');
        return;
    }
    
    if (!secretKey || secretKey === '••••••••••••••••') {
        showNotification('Geçerli bir Secret Key giriniz', 'error');
        return;
    }
    
    await saveApiKeys();
}

async function saveApiKey() {
    const apiKey = document.getElementById('acc-api-key').value.trim();
    if (!apiKey || apiKey.includes('...') || apiKey === '••••••••••••••••') {
        showNotification('Geçerli bir API Key giriniz', 'error');
        return;
    }
    
    showNotification('API Key ve Secret birlikte sunucuya kaydedilmelidir', 'info');
}

async function saveSecretKey() {
    const secretKey = document.getElementById('acc-secret-key').value.trim();
    if (!secretKey || secretKey === '••••••••••••••••') {
        showNotification('Geçerli bir Secret Key giriniz', 'error');
        return;
    }
    
    showNotification('API Key ve Secret birlikte sunucuya kaydedilmelidir', 'info');
}

function loadAccountActivities() {
    const activityList = document.getElementById('acc-activity-list');
    if (!activityList) return;
    
    // Get current time
    const now = new Date();
    const loginTime = now.toLocaleString('tr-TR');
    
    // Get user creation date
    let createdDate = 'Bilinmiyor';
    if (AUTH.user && AUTH.user.created_at) {
        createdDate = new Date(AUTH.user.created_at).toLocaleDateString('tr-TR');
    } else {
        const savedUser = localStorage.getItem('tb_user');
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                if (user.created_at) {
                    createdDate = new Date(user.created_at).toLocaleDateString('tr-TR');
                }
            } catch (e) {
                console.error('Error parsing saved user for activities:', e);
            }
        }
    }
    
    activityList.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.05);transition:background 0.2s" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
            <div>
                <div style="font-size:14px;color:#fff;font-weight:600">Giriş Yapıldı</div>
                <div style="font-size:12px;color:var(--t3)">Mevcut oturum</div>
            </div>
            <div style="font-size:12px;color:var(--t3)">${loginTime}</div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;transition:background 0.2s" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
            <div>
                <div style="font-size:14px;color:#fff;font-weight:600">Hesap Oluşturuldu</div>
                <div style="font-size:12px;color:var(--t3)">Hoş geldiniz!</div>
            </div>
            <div style="font-size:12px;color:var(--t3)">${createdDate}</div>
        </div>
    `;
}

function editPersonalInfo() {
    showNotification('Kişisel bilgi düzenleme özelliği yakında eklenecek', 'info');
}

function changePassword() {
    const currentPassword = prompt('Mevcut şifrenizi girin:');
    if (!currentPassword) return;
    
    const newPassword = prompt('Yeni şifrenizi girin:');
    if (!newPassword) return;
    
    const confirmPassword = prompt('Yeni şifrenizi tekrar girin:');
    if (newPassword !== confirmPassword) {
        showNotification('Şifreler eşleşmiyor', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showNotification('Şifre en az 6 karakter olmalıdır', 'error');
        return;
    }
    
    // Here you would normally send to server
    showNotification('Şifre değiştirme özelliği yakında aktif olacak', 'info');
}

async function deleteAccount() {
    if (!confirm('Hesabınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm verileriniz silinecektir.')) {
        return;
    }
    
    // Double confirmation
    const confirmation = prompt('Hesabınızı silmek için "SİL" yazın:');
    if (confirmation !== 'SİL') {
        showNotification('Hesap silme işlemi iptal edildi', 'info');
        return;
    }
    
    try {
        const res = await fetch(API + '/user/delete', {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + AUTH.token
            }
        });
        
        if (res.ok) {
            showNotification('Hesabınız silindi. Yönlendiriliyorsunuz...', 'success');
            setTimeout(() => {
                doLogout();
            }, 2000);
        } else {
            const data = await res.json();
            showNotification(data.error || 'Hesap silinemedi', 'error');
        }
    } catch (e) {
        showNotification('Bağlantı hatası', 'error');
    }
}

function showNotification(message, type = 'info') {
    // Create notification element - sağ altta göster
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: var(--s2, #1a1a1a);
        border: 1px solid var(--b1, #333);
        color: #fff;
        padding: 16px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        transform: translateY(100px);
        opacity: 0;
        transition: transform 0.3s ease, opacity 0.3s ease;
    `;
    
    if (type === 'success') {
        notification.style.borderLeftColor = 'var(--green, #0ecb81)';
        notification.style.borderLeftWidth = '4px';
    } else if (type === 'error') {
        notification.style.borderLeftColor = 'var(--red, #f6465d)';
        notification.style.borderLeftWidth = '4px';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animate in (sağ alttan yukarı)
    requestAnimationFrame(() => {
        notification.style.transform = 'translateY(0)';
        notification.style.opacity = '1';
    });
    
    // Remove after 4 seconds
    setTimeout(() => {
        notification.style.transform = 'translateY(100px)';
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

/* ═══════════════════════════════════════
   LOAD BALANCE FOR NAVIGATION
═══════════════════════════════════════ */
async function loadBalanceForNav() {
    if (!AUTH.token) return;
    
    try {
        const res = await fetch(API + '/binance/account', {
            headers: { 'Authorization': 'Bearer ' + AUTH.token }
        });
        const data = await res.json();
        
        if (res.ok) {
            const totalBalance = parseFloat(data.totalWalletBalance || 0);
            const navBalanceEl = document.getElementById('nav-balance-val');
            if (navBalanceEl) {
                navBalanceEl.textContent = '$ ' + totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
        }
    } catch (e) {
        console.warn('Balance load error:', e);
    }
}

/* ═══════════════════════════════════════
   NAV SWITCHING
═══════════════════════════════════════ */
function switchTab(id) {
  if (id === 'home') window.location.href = '/';
  else if (id === 'markets') window.location.href = '/markets';
  else if (id === 'blog') window.location.href = '/blog';
  else if (id === 'strateji') window.location.href = '/strateji';
}

function switchDash(sub) {
  if (window.location.pathname !== '/dashboard') {
    window.location.href = '/dashboard#' + sub;
    return;
  }
  
  // Update URL hash without reloading page
  window.history.replaceState(null, '', '#' + sub);
  
  // Save current scroll position before switching
  const currentTab = localStorage.getItem('last-dashboard-tab');
  if (currentTab) {
    localStorage.setItem('scroll-pos-' + currentTab, window.pageYOffset || document.documentElement.scrollTop);
  }
  
  // Save current tab to localStorage
  localStorage.setItem('last-dashboard-tab', sub);
  
  // Tüm sayfaları gizle
  document.querySelectorAll('.dash-sub-page').forEach(p => p.style.display = 'none');
  document.querySelectorAll('[id$="-user"]').forEach(p => p.style.display = 'none');
  document.querySelectorAll('[id$="-admin"]').forEach(p => p.style.display = 'none');
  
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => {
    const onclickStr = t.getAttribute('onclick');
    if (onclickStr && onclickStr.includes(`switchDash('${sub}')`)) {
      t.classList.add('active');
    }
  });
  // Update active state in dropdown menu
  document.querySelectorAll('.dd-item').forEach(item => item.classList.remove('active'));
  
  // Role-based sub-panel switching
  const isAdmin = AUTH.user && AUTH.user.role === 'admin';
  
  // Handle user coming soon pages first
  if (!isAdmin && (sub === 'portfolio' || sub === 'apiset' || sub === 'botpanel')) {
    if (sub === 'portfolio') {
      document.getElementById('portfolio-user').style.display = 'block';
    } else if (sub === 'apiset') {
      document.getElementById('apiset-user').style.display = 'block';
    } else if (sub === 'botpanel') {
      document.getElementById('botpanel-user').style.display = 'block';
    }
    restoreScrollPosition(sub);
    return;
  }
  
  // Handle admin bot panel specially
  if (isAdmin && sub === 'botpanel') {
    // Parent wrapper must also be visible
    const parentWrapper = document.getElementById('dash-botpanel');
    if (parentWrapper) parentWrapper.style.display = 'block';
    document.getElementById('botpanel-admin').style.display = 'block';
  } else {
    // Handle all other pages (both admin and user)
    const target = document.getElementById('dash-' + sub);
    if (target) {
      target.style.display = 'block';
    }
  }

  if (sub === 'markets2') {
    const e = document.getElementById('mkt-ts2'); if (e) e.textContent = 'Son güncelleme: ' + new Date().toLocaleTimeString('tr-TR');
    renderCoins('coin-list2');
    // Sync with markets-enhanced.js
    if (typeof syncMarketData === 'function') syncMarketData();
  }
  if (sub === 'account') populateAccount();
  if (sub === 'settings') loadAccountBotDataBinance();
  if (sub === 'portfolio' && isAdmin) {
    // portfolio.js'deki loadPortfolio fonksiyonunu çağır
    if (typeof loadPortfolio === 'function') {
      loadPortfolio();
    }
  }
  if (sub === 'apiset' && isAdmin) loadApiKeyStatus();
  if (sub === 'futures') {
    console.log('[APP] Switching to Futures tab');
    // Wait a bit for binance-trading.js to load
    setTimeout(() => {
      if (typeof initBinanceTrading === 'function') {
        console.log('[APP] Calling initBinanceTrading()');
        initBinanceTrading();
      } else {
        console.error('[APP] initBinanceTrading function not found!');
      }
    }, 100);
  }
  if (sub === 'botpanel' && isAdmin) {
      startBotAutoRefresh();
  } else {
      stopBotAutoRefresh();
  }
  // Stop auto-refresh when leaving Binance pages
  if (sub !== 'futures') {
    if (typeof stopBinanceAutoRefresh === 'function') stopBinanceAutoRefresh();
  }
  
  // Load balance for all tabs
  loadBalanceForNav();
  
  closeDropdown();
  
  // Update navigation highlighting with delay to ensure DOM is ready
  setTimeout(() => {
    highlightActiveNav();
  }, 150);
  
  // Restore scroll position for this tab
  restoreScrollPosition(sub);
}

function restoreScrollPosition(tab) {
  // Small delay to ensure content is rendered
  setTimeout(() => {
    const savedScroll = localStorage.getItem('scroll-pos-' + tab);
    if (savedScroll) {
      window.scrollTo(0, parseInt(savedScroll));
    } else {
      window.scrollTo(0, 0);
    }
  }, 100);
}

// Auto-open dashboard tab from hash if present
if (window.location.pathname === '/dashboard') {
  window.addEventListener('load', () => {
    const hash = window.location.hash.replace('#', '');
    const lastTab = localStorage.getItem('last-dashboard-tab');
    
    // Priority: hash > lastTab > default
    let tabToOpen = 'markets2'; // default
    
    if (hash) {
      tabToOpen = hash;
      // Update localStorage with hash
      localStorage.setItem('last-dashboard-tab', hash);
    } else if (lastTab) {
      tabToOpen = lastTab;
      // Update URL hash to match last tab
      window.history.replaceState(null, '', '#' + lastTab);
    }
    
    switchDash(tabToOpen);
    
    // Always try to populate account data when dashboard loads
    setTimeout(() => {
      populateAccount();
      loadBalanceForNav();
    }, 500);
  });
}


/* ═══════════════════════════════════════
   AUTH MODAL
═══════════════════════════════════════ */
function openAuth(tab) { 
  document.getElementById('authModal').classList.add('open'); 
  switchAtab(tab || 'login'); 
  document.body.style.overflow = 'hidden'; 
}
function closeAuth() {
  document.getElementById('authModal').classList.remove('open');
  if (!document.getElementById('mobile-menu').classList.contains('open')) {
    document.body.style.overflow = '';
  }
}
function handleMOvClick(e) { if (e.target === document.getElementById('authModal')) closeAuth(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAuth(); });
function switchAtab(t) {
  // login ve register tabları nav'da gösterilir, forgot gizli bir panel
  const navTabs = ['login', 'register'];
  navTabs.forEach(x => {
    const tabEl = document.getElementById('atab-' + x);
    if (tabEl) tabEl.classList.toggle('active', x === t);
    const panelEl = document.getElementById('apanel-' + x);
    if (panelEl) panelEl.classList.toggle('active', x === t);
  });
  // forgot paneli
  const forgotPanel = document.getElementById('apanel-forgot');
  if (forgotPanel) forgotPanel.classList.toggle('active', t === 'forgot');
  // Tab row'u forgot'ta gizle
  const tabRow = document.getElementById('auth-tabs-row');
  if (tabRow) tabRow.style.display = t === 'forgot' ? 'none' : '';
}

/* ═══════════════════════════════════════
   LOGIN
═══════════════════════════════════════ */
async function doLogin() {
  const email = document.getElementById('li-email').value.trim(), pass = document.getElementById('li-pass').value;
  if (!email || !pass) { shakeEl(!email ? 'li-email' : 'li-pass'); return; }
  const btn = document.getElementById('li-btn');
  btn.textContent = 'Giriş yapılıyor...'; btn.disabled = true;
  document.getElementById('li-not-verified').style.display = 'none';
  try {
    const res = await fetch(API + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pass }) });
    const data = await res.json();
    if (!res.ok) {
      if (data.not_verified) {
        document.getElementById('li-not-verified').style.display = 'block';
        window._li_email_for_resend = email;
      } else {
        showToast('error', data.error || 'Giriş başarısız');
      }
      btn.textContent = 'Giriş Yap'; 
      btn.disabled = false;
      return;
    }
    AUTH = { token: data.token, user: data.user };
    localStorage.setItem('tb_token', data.token); 
    localStorage.setItem('tb_user', JSON.stringify(data.user));
    const defaultTab = data.user.role === 'admin' ? 'botpanel' : 'account';
    
    // Fix body overflow before redirect
    document.body.style.overflow = '';
    closeAuth(); 
    
    // Redirect to dashboard
    const targetUrl = '/dashboard#' + defaultTab;
    window.location.href = targetUrl;
    
  } catch (e) {
    console.error('Login error:', e);
    showToast('error', 'Sunucuya bağlanılamadı. Lütfen tekrar deneyin.');
    btn.textContent = 'Giriş Yap'; 
    btn.disabled = false;
  }
}

async function resendVerification() {
  const email = window._li_email_for_resend || document.getElementById('li-email').value.trim();
  if (!email) return;
  const btn = document.getElementById('resend-btn-li');
  btn.textContent = 'Gönderiliyor...'; btn.disabled = true;
  try {
    const res = await fetch(API + '/auth/resend-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    const data = await res.json();
    if (res.ok) { btn.textContent = '✓ Gönderildi!'; btn.style.background = 'var(--green)'; btn.style.color = '#000'; }
    else { showToast('error', data.error || 'Hata oluştu'); btn.textContent = 'Tekrar Gönder'; btn.disabled = false; }
  } catch (e) { btn.textContent = 'Tekrar Gönder'; btn.disabled = false; }
}

/* ═══════════════════════════════════════
   REGISTER
═══════════════════════════════════════ */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

function validateEmailInput(el) {
  const hint = document.getElementById('ri-email-hint');
  const val = el.value.trim();
  if (!val) { hint.style.display = 'none'; el.style.borderColor = ''; return; }
  if (!EMAIL_REGEX.test(val)) {
    hint.textContent = '⚠ Geçerli bir e-posta adresi girin';
    hint.style.color = 'var(--red)';
    hint.style.display = 'block';
    el.style.borderColor = 'var(--red)';
  } else {
    hint.textContent = '✓ Geçerli e-posta';
    hint.style.color = 'var(--green)';
    hint.style.display = 'block';
    el.style.borderColor = 'var(--green)';
  }
}

function checkPassMatch() {
  const p1 = document.getElementById('ri-pass').value;
  const p2 = document.getElementById('ri-pass2').value;
  const hint = document.getElementById('ri-pass-match');
  if (!p2) { hint.textContent = ''; return; }
  if (p1 === p2) {
    hint.textContent = '✓ Şifreler eşleşiyor';
    hint.style.color = 'var(--green)';
  } else {
    hint.textContent = '✕ Şifreler eşleşmiyor';
    hint.style.color = 'var(--red)';
  }
}

async function doRegister() {
  const first = document.getElementById('ri-first').value.trim(), last = document.getElementById('ri-last').value.trim();
  const email = document.getElementById('ri-email').value.trim(), phone = document.getElementById('ri-phone').value.trim();
  const pass = document.getElementById('ri-pass').value, pass2 = document.getElementById('ri-pass2').value;
  const terms = document.getElementById('ri-terms').checked;

  if (!first) { shakeEl('ri-first'); return; }
  if (!last) { shakeEl('ri-last'); return; }
  if (!email || !EMAIL_REGEX.test(email)) { shakeEl('ri-email'); showToast('error', 'Geçerli bir e-posta adresi girin'); return; }
  if (pass.length < 8) { shakeEl('ri-pass'); showToast('error', 'Şifre en az 8 karakter olmalı'); return; }
  if (pass !== pass2) { shakeEl('ri-pass2'); showToast('error', 'Şifreler eşleşmiyor'); return; }
  if (!terms) { showToast('error', 'Kullanım şartlarını kabul edin'); return; }

  const btn = document.getElementById('ri-btn'); btn.textContent = 'Hesap oluşturuluyor...'; btn.disabled = true;
  try {
    const res = await fetch(API + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ first_name: first, last_name: last, email, phone, password: pass }) });
    const data = await res.json();
    if (!res.ok) { showToast('error', data.error || 'Kayıt başarısız'); return; }
    showToast('success', data.message || 'Kayıt başarılı! Giriş yapabilirsiniz.');
    const emailField = document.getElementById('li-email');
    if (emailField) emailField.value = email;
    switchAtab('login');
  } catch (e) {
    showToast('error', 'Sunucuya bağlanılamadı. Lütfen tekrar deneyin.');
  } finally { btn.textContent = 'Ücretsiz Hesap Oluştur'; btn.disabled = false; }
}

/* ═══════════════════════════════════════
   ŞİFREMİ UNUTTUM
═══════════════════════════════════════ */
let _fpEmail = '', _fpResetToken = '';

function fpStep(n) {
  [1, 2, 3, 4].forEach(i => {
    const el = document.getElementById('fp-step' + i);
    if (el) el.style.display = i === n ? 'block' : 'none';
  });
}

async function fpSendCode() {
  const email = document.getElementById('fp-email').value.trim();
  if (!email) { shakeEl('fp-email'); return; }
  _fpEmail = email;
  const btn = document.getElementById('fp-btn1');
  btn.textContent = 'Gönderiliyor...'; btn.disabled = true;
  try {
    const res = await fetch(API + '/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    const data = await res.json();
    if (res.ok) {
      const sub = document.getElementById('fp-step2-sub');
      if (sub) sub.textContent = email + ' adresine 6 haneli kod gönderdik';
      fpStep(2);
    } else {
      showToast('error', data.error || 'Hata oluştu');
    }
  } catch (e) { showToast('error', 'Bağlantı hatası'); }
  finally { btn.textContent = 'Kod Gönder'; btn.disabled = false; }
}

async function fpVerifyCode() {
  const code = document.getElementById('fp-code').value.trim();
  if (!code || code.length !== 6) { shakeEl('fp-code'); return; }
  const btn = document.getElementById('fp-btn2');
  btn.textContent = 'Doğrulanıyor...'; btn.disabled = true;
  try {
    const res = await fetch(API + '/auth/verify-reset-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: _fpEmail, code }) });
    const data = await res.json();
    if (res.ok) {
      _fpResetToken = data.reset_token;
      fpStep(3);
    } else {
      showToast('error', data.error || 'Geçersiz kod');
    }
  } catch (e) { showToast('error', 'Bağlantı hatası'); }
  finally { btn.textContent = 'Kodu Doğrula'; btn.disabled = false; }
}

async function fpResetPassword() {
  const newpass = document.getElementById('fp-newpass').value;
  const newpass2 = document.getElementById('fp-newpass2').value;
  if (newpass.length < 8) { shakeEl('fp-newpass'); showToast('error', 'Şifre en az 8 karakter olmalı'); return; }
  if (newpass !== newpass2) { shakeEl('fp-newpass2'); showToast('error', 'Şifreler eşleşmiyor'); return; }
  const btn = document.getElementById('fp-btn3');
  btn.textContent = 'Güncelleniyor...'; btn.disabled = true;
  try {
    const res = await fetch(API + '/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: _fpEmail, reset_token: _fpResetToken, new_password: newpass }) });
    const data = await res.json();
    if (res.ok) {
      fpStep(4);
    } else {
      showToast('error', data.error || 'Hata oluştu');
    }
  } catch (e) { showToast('error', 'Bağlantı hatası'); }
  finally { btn.textContent = 'Şifremi Güncelle'; btn.disabled = false; }
}

/* ═══════════════════════════════════════
   LOGOUT
═══════════════════════════════════════ */
async function doLogout() {
  try { 
    await fetch(API + '/auth/logout', { 
      method: 'POST', 
      headers: { 'Authorization': 'Bearer ' + AUTH.token } 
    }); 
  } catch (e) { 
    console.log('Logout API call failed:', e);
  }
  
  // Clear auth state
  AUTH = { token: null, user: null };
  localStorage.removeItem('tb_token'); 
  localStorage.removeItem('tb_user');
  
  // Apply logged out state
  applyLoggedOut(); 
  
  // Redirect to home page
  window.location.href = '/';
  
  showToast('info', 'Çıkış yapıldı');
}

/* ═══════════════════════════════════════
   APPLY LOGIN/LOGOUT STATE
═══════════════════════════════════════ */
function applyLoggedIn() {
  const u = AUTH.user;
  if (!u) return;
  const isAdmin = u.role === 'admin';

  // Update navigation tabs
  const navTabs = document.getElementById('nav-tabs');
  if (navTabs) {
    if (isAdmin) {
      // Admin navigation
      navTabs.innerHTML = `
        <a href="/" class="nav-tab">Ana Sayfa</a>
        <button class="nav-tab" onclick="switchDash('markets2')">Piyasa</button>
        <button class="nav-tab" onclick="switchDash('botpanel')">Bot Paneli</button>
        <button class="nav-tab" onclick="switchDash('futures')">Futures</button>
        <button class="nav-tab" onclick="switchDash('apiset')">API</button>
        <button class="nav-tab" onclick="switchDash('portfolio')">Portföy</button>
      `;
      // Admin için ek olarak dropdown menüsündeki "yakında" ibarelerini gizle
      setTimeout(() => {
        document.querySelectorAll('.cs-badge').forEach(el => el.style.display = 'none');
      }, 50);
    } else {
      // User navigation
      navTabs.innerHTML = `
        <a href="/" class="nav-tab">Ana Sayfa</a>
        <a href="/markets" class="nav-tab">Piyasa</a>
        <a href="/blog" class="nav-tab">Blog</a>
        <a href="/strateji" class="nav-tab">Strateji</a>
        <button class="nav-tab" onclick="switchDash('botpanel')">Trading Bot</button>
      `;
    }
    
    // Highlight active navigation after updating (increased delay)
    setTimeout(highlightActiveNav, 150);
  }

  // Hide login/register buttons
  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('register-btn');
  if (loginBtn) loginBtn.style.display = 'none';
  if (registerBtn) registerBtn.style.display = 'none';

  // Show user menu
  const userPill = document.getElementById('user-pill');
  if (userPill) userPill.style.display = 'flex';

  // Show notification button
  const notifBtn = document.getElementById('notif-btn');
  if (notifBtn) notifBtn.style.display = 'flex';

  // Show balance display for admin only
  const navBalance = document.getElementById('nav-balance');
  if (navBalance) navBalance.style.display = isAdmin ? 'flex' : 'none';

  // Update user info - support both fullname and first_name/last_name
  let displayName = '';
  let initials = '';
  
  if (u.fullname) {
    displayName = u.fullname;
    const nameParts = u.fullname.split(' ');
    initials = nameParts.map(part => part.charAt(0)).join('').substring(0, 2);
  } else if (u.first_name || u.last_name) {
    displayName = (u.first_name || '') + ' ' + (u.last_name || '');
    initials = ((u.first_name || '')[0] || '') + ((u.last_name || '')[0] || '');
  } else {
    displayName = u.email || 'Kullanıcı';
    initials = displayName.substring(0, 2);
  }
  
  const av = document.getElementById('nav-avatar'); 
  if (av) av.textContent = initials.toUpperCase();
  
  const un = document.getElementById('nav-username'); 
  if (un) un.textContent = displayName.trim();
  
  const rl = document.getElementById('nav-role'); 
  if (rl) rl.textContent = isAdmin ? 'Admin' : 'Kullanıcı';

  document.querySelectorAll('.public-only-btn').forEach(el => el.style.display = 'none');
}

function applyLoggedOut() {
  // Reset navigation to public
  const navTabs = document.getElementById('nav-tabs');
  if (navTabs) {
    navTabs.innerHTML = `
      <a href="/" class="nav-tab">Ana Sayfa</a>
      <a href="/markets" class="nav-tab">Piyasa</a>
      <a href="/blog" class="nav-tab">Blog</a>
      <a href="/strateji" class="nav-tab">Strateji</a>
    `;
    
    // Highlight active navigation after updating (increased delay)
    setTimeout(highlightActiveNav, 150);
  }

  // Show login/register buttons
  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('register-btn');
  if (loginBtn) loginBtn.style.display = 'inline-block';
  if (registerBtn) registerBtn.style.display = 'inline-block';

  // Hide user menu
  const userPill = document.getElementById('user-pill');
  if (userPill) userPill.style.display = 'none';

  // Hide notification button
  const notifBtn = document.getElementById('notif-btn');
  if (notifBtn) notifBtn.style.display = 'none';

  document.querySelectorAll('.public-only-btn').forEach(el => el.style.display = 'inline-block');
}

/* ═══════════════════════════════════════
   DROPDOWN & NOTIF
═══════════════════════════════════════ */
function toggleUserMenu() { 
  const dropdown = document.getElementById('user-dropdown');
  dropdown.classList.toggle('open');
  
  // Update active state when dropdown opens
  if (dropdown.classList.contains('open')) {
    const currentTab = localStorage.getItem('last-dashboard-tab') || 'markets2';
    document.querySelectorAll('.dd-item').forEach(item => {
      item.classList.remove('active');
      const onclick = item.getAttribute('onclick');
      if (onclick && onclick.includes(`'${currentTab}'`)) {
        item.classList.add('active');
      }
    });
  }
}
function closeDropdown() { document.getElementById('user-dropdown').classList.remove('open'); }

document.addEventListener('click', e => {
  const pill = document.getElementById('user-pill'), dd = document.getElementById('user-dropdown');
  if (pill && !pill.contains(e.target) && dd && !dd.contains(e.target)) closeDropdown();
  const nb = document.getElementById('notif-btn'), np = document.getElementById('notif-panel');
  if (nb && !nb.contains(e.target) && np && !np.contains(e.target)) np.classList.remove('open');
});
function toggleNotif() { document.getElementById('notif-panel').classList.toggle('open'); closeDropdown(); }
function markNotifRead() {
  document.getElementById('notif-count').style.display = 'none';
  document.querySelectorAll('.np-item').forEach(i => i.classList.remove('unread'));
  document.querySelectorAll('.np-dot').forEach(d => d.style.display = 'none');
  localStorage.setItem('tb_notif_read', 'true');
}

// Check notification state on load
document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('tb_notif_read') === 'true') {
    const countEl = document.getElementById('notif-count');
    if (countEl) countEl.style.display = 'none';
    document.querySelectorAll('.np-item').forEach(i => i.classList.remove('unread'));
    document.querySelectorAll('.np-dot').forEach(d => d.style.display = 'none');
  }
});

/* ═══════════════════════════════════════
   ACCOUNT BOT DATA
═══════════════════════════════════════ */
async function loadAccountBotData() {
  if (!AUTH.token) return;
  try {
    const res = await fetch(API + '/bot/status', { headers: { 'Authorization': 'Bearer ' + AUTH.token }});
    if (res.ok) {
      const data = await res.json();
      
      // Update bot status
      const statusEl = document.getElementById('acc-bot-status');
      const isActive = data.is_active === 1;
      if (statusEl) {
        statusEl.textContent = isActive ? 'Çalışıyor' : 'Durduruldu';
        statusEl.style.color = isActive ? 'var(--green)' : 'var(--red)';
        const dotEl = statusEl.parentElement.querySelector('div[style*="border-radius:50%"]');
        if (dotEl) dotEl.style.background = isActive ? 'var(--green)' : 'var(--red)';
      }
      
      // Update trading stats
      const tradesEl = document.getElementById('acc-total-trades');
      const winRateEl = document.getElementById('acc-win-rate');
      const lastActivityEl = document.getElementById('acc-last-activity');
      
      if (tradesEl) tradesEl.textContent = data.total_trades || '0';
      if (winRateEl) winRateEl.textContent = (data.win_rate || 0) + '%';
      if (lastActivityEl) {
        if (data.last_activity) {
          lastActivityEl.textContent = new Date(data.last_activity).toLocaleString('tr-TR');
        } else {
          lastActivityEl.textContent = 'Henüz işlem yok';
        }
      }
    }
  } catch (e) {
    console.log('Bot data yüklenemedi:', e);
  }
}

/* ═══════════════════════════════════════
   SETTINGS PAGE FUNCTIONS
═══════════════════════════════════════ */
async function saveGeneralSettings() {
  const language = document.getElementById('settings-language')?.value || 'tr';
  const currency = document.getElementById('settings-currency')?.value || 'usd';
  const theme = document.getElementById('settings-theme')?.value || 'dark';
  
  try {
    const res = await fetch(API + '/user/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AUTH.token
      },
      body: JSON.stringify({
        language: language,
        currency: currency,
        theme: theme
      })
    });
    
    if (res.ok) {
      showToast('success', 'Genel ayarlar güncellendi');
    } else {
      showToast('error', 'Ayarlar güncellenemedi');
    }
  } catch (e) {
    showToast('success', 'Genel ayarlar güncellendi (Demo)');
  }
}

async function saveNotificationSettings() {
  const emailNotifs = document.getElementById('settings-email-notifs')?.checked || false;
  const tradeNotifs = document.getElementById('settings-trade-notifs')?.checked || false;
  const securityAlerts = document.getElementById('settings-security-alerts')?.checked || false;
  const priceAlerts = document.getElementById('settings-price-alerts')?.checked || false;
  
  // Save to localStorage first
  localStorage.setItem('email-notifications', emailNotifs);
  localStorage.setItem('trade-notifications', tradeNotifs);
  localStorage.setItem('security-alerts', securityAlerts);
  localStorage.setItem('price-alerts', priceAlerts);
  
  // Always show success
  showToast('success', 'Bildirim ayarları kaydedildi');
  
  // Try to sync with server in background
  try {
    if (AUTH.token) {
      await fetch(API + '/user/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + AUTH.token
        },
        body: JSON.stringify({
          email_notifications: emailNotifs,
          trade_notifications: tradeNotifs,
          security_alerts: securityAlerts,
          price_alerts: priceAlerts
        })
      });
    }
  } catch (e) {
    // Silently fail - already saved locally
    console.log('Server sync failed, but settings saved locally');
  }
}

async function saveSecuritySettings() {
  const autoLogout = document.getElementById('settings-auto-logout')?.value || '30';
  
  try {
    const res = await fetch(API + '/user/security', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AUTH.token
      },
      body: JSON.stringify({
        auto_logout_minutes: parseInt(autoLogout)
      })
    });
    
    if (res.ok) {
      showToast('success', 'Güvenlik ayarları güncellendi');
    } else {
      showToast('error', 'Güvenlik ayarları güncellenemedi');
    }
  } catch (e) {
    showToast('success', 'Güvenlik ayarları güncellendi (Demo)');
  }
}

function clearCache() {
  if (confirm('Önbelleği temizlemek istediğinizden emin misiniz?')) {
    localStorage.clear();
    sessionStorage.clear();
    showToast('success', 'Önbellek temizlendi');
    setTimeout(() => window.location.reload(), 1000);
  }
}

/* ═══════════════════════════════════════
   BINANCE STYLE FUNCTIONS
═══════════════════════════════════════ */
async function loadAccountBotDataBinance() {
  if (!AUTH.token) return;
  try {
    const res = await fetch(API + '/bot/status', { headers: { 'Authorization': 'Bearer ' + AUTH.token }});
    if (res.ok) {
      const data = await res.json();
      
      // Update bot status
      const statusEl = document.getElementById('acc-bot-status-binance');
      const statusDot = document.getElementById('acc-bot-status-dot');
      const isActive = data.is_active === 1;
      
      if (statusEl) {
        statusEl.textContent = isActive ? 'Çalışıyor' : 'Durduruldu';
        statusEl.style.color = isActive ? '#0ecb81' : '#f6465d';
      }
      if (statusDot) {
        statusDot.style.background = isActive ? '#0ecb81' : '#f6465d';
      }
      
      // Update trading stats
      const tradesEl = document.getElementById('acc-total-trades-binance');
      const winRateEl = document.getElementById('acc-win-rate-binance');
      const lastActivityEl = document.getElementById('acc-last-activity-binance');
      
      if (tradesEl) tradesEl.textContent = data.total_trades || '0';
      if (winRateEl) winRateEl.textContent = (data.win_rate || 0) + '%';
      if (lastActivityEl) {
        if (data.last_activity) {
          lastActivityEl.textContent = 'Son aktivite: ' + new Date(data.last_activity).toLocaleString('tr-TR');
        } else {
          lastActivityEl.textContent = 'Son aktivite: Henüz işlem yok';
        }
      }
    }
  } catch (e) {
    console.log('Bot data yüklenemedi:', e);
  }
}

async function saveProfileBinance() {
  const first = document.getElementById('edit-first-binance')?.value.trim() || '';
  const last = document.getElementById('edit-last-binance')?.value.trim() || '';
  const phone = document.getElementById('edit-phone-binance')?.value.trim() || '';
  
  try {
    const res = await fetch(API + '/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AUTH.token
      },
      body: JSON.stringify({ first_name: first, last_name: last, phone })
    });
    
    if (res.ok) {
      AUTH.user.first_name = first;
      AUTH.user.last_name = last;
      AUTH.user.phone = phone;
      localStorage.setItem('tb_user', JSON.stringify(AUTH.user));
      applyLoggedIn();
      populateAccount();
      showToast('success', 'Profil güncellendi');
    }
  } catch (e) {
    showToast('success', 'Profil güncellendi (Demo)');
  }
}

async function changePasswordBinance() {
  const oldp = document.getElementById('pw-old-binance')?.value || '';
  const newp = document.getElementById('pw-new-binance')?.value || '';
  const np2 = document.getElementById('pw-new2-binance')?.value || '';
  
  if (!oldp) { showToast('error', 'Mevcut şifre gerekli'); return; }
  if (newp.length < 8) { showToast('error', 'Yeni şifre en az 8 karakter olmalı'); return; }
  if (newp !== np2) { showToast('error', 'Şifreler eşleşmiyor'); return; }
  
  try {
    const res = await fetch(API + '/user/password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AUTH.token
      },
      body: JSON.stringify({ old_password: oldp, new_password: newp })
    });
    
    if (res.ok) {
      showToast('success', 'Şifre güncellendi');
      // Clear form
      document.getElementById('pw-old-binance').value = '';
      document.getElementById('pw-new-binance').value = '';
      document.getElementById('pw-new2-binance').value = '';
    } else {
      showToast('error', 'Eski şifre yanlış');
    }
  } catch (e) {
    showToast('success', 'Şifre güncellendi (Demo)');
  }
}

async function deleteAccountBinance() {
  if (!confirm('Hesabınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;
  
  try {
    await fetch(API + '/user/delete', {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + AUTH.token }
    });
  } catch (e) {}
  
  doLogout();
}

async function saveGeneralSettingsBinance() {
  const language = document.getElementById('settings-language-binance')?.value || 'tr';
  const currency = document.getElementById('settings-currency-binance')?.value || 'usd';
  const theme = document.getElementById('settings-theme-binance')?.value || 'dark';
  
  try {
    const res = await fetch(API + '/user/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AUTH.token
      },
      body: JSON.stringify({ language, currency, theme })
    });
    
    if (res.ok) {
      showToast('success', 'Genel ayarlar güncellendi');
    } else {
      showToast('error', 'Ayarlar güncellenemedi');
    }
  } catch (e) {
    showToast('success', 'Genel ayarlar güncellendi (Demo)');
  }
}

async function saveTradingSettingsBinance() {
  const autoTrading = document.getElementById('settings-auto-trading')?.checked || false;
  
  try {
    const res = await fetch(API + '/user/trading-settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AUTH.token
      },
      body: JSON.stringify({ auto_trading: autoTrading })
    });
    
    if (res.ok) {
      showToast('success', 'Trading ayarları güncellendi');
    } else {
      showToast('error', 'Trading ayarları güncellenemedi');
    }
  } catch (e) {
    showToast('success', 'Trading ayarları güncellendi (Demo)');
  }
}

async function saveNotificationSettingsBinance() {
  const emailNotifs = document.getElementById('settings-email-notifs-binance')?.checked || false;
  const tradeNotifs = document.getElementById('settings-trade-notifs-binance')?.checked || false;
  const priceAlerts = document.getElementById('settings-price-alerts')?.checked || false;
  
  try {
    const res = await fetch(API + '/user/notifications', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AUTH.token
      },
      body: JSON.stringify({
        email_notifications: emailNotifs,
        trade_notifications: tradeNotifs,
        price_alerts: priceAlerts
      })
    });
    
    if (res.ok) {
      showToast('success', 'Bildirim ayarları güncellendi');
    } else {
      showToast('error', 'Bildirim ayarları güncellenemedi');
    }
  } catch (e) {
    showToast('success', 'Bildirim ayarları güncellendi (Demo)');
  }
}

async function saveSecuritySettingsBinance() {
  const autoLogout = document.getElementById('settings-auto-logout-binance')?.value || '30';
  const apiWhitelist = document.getElementById('settings-api-whitelist')?.checked || false;
  
  try {
    const res = await fetch(API + '/user/security', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AUTH.token
      },
      body: JSON.stringify({
        auto_logout_minutes: parseInt(autoLogout),
        api_whitelist: apiWhitelist
      })
    });
    
    if (res.ok) {
      showToast('success', 'Güvenlik ayarları güncellendi');
    } else {
      showToast('error', 'Güvenlik ayarları güncellenemedi');
    }
  } catch (e) {
    showToast('success', 'Güvenlik ayarları güncellendi (Demo)');
  }
}

function clearCacheBinance() {
  if (confirm('Önbelleği temizlemek istediğinizden emin misiniz? Sayfa yeniden yüklenecek.')) {
    localStorage.clear();
    sessionStorage.clear();
    showToast('success', 'Önbellek temizlendi');
    setTimeout(() => window.location.reload(), 1000);
  }
}

function resetSettingsBinance() {
  if (confirm('Tüm ayarları varsayılan değerlere sıfırlamak istediğinizden emin misiniz?')) {
    // Reset form values to defaults
    const langSelect = document.getElementById('settings-language-binance');
    const currSelect = document.getElementById('settings-currency-binance');
    const themeSelect = document.getElementById('settings-theme-binance');
    const autoLogoutSelect = document.getElementById('settings-auto-logout-binance');
    
    if (langSelect) langSelect.value = 'tr';
    if (currSelect) currSelect.value = 'usd';
    if (themeSelect) themeSelect.value = 'dark';
    if (autoLogoutSelect) autoLogoutSelect.value = '30';
    
    showToast('success', 'Ayarlar varsayılan değerlere sıfırlandı');
  }
}

/* ═══════════════════════════════════════
   BOT PANEL
═══════════════════════════════════════ */
async function toggleBot() {
  const btn = document.getElementById('bot-toggle-btn');
  const isOn = btn.classList.contains('btn-danger'); // if danger, it is currently on and we want to stop it
  const newState = !isOn; 

  try {
    const res = await fetch(API + '/bot/toggle', { 
        method: 'POST', 
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + AUTH.token 
        },
        body: JSON.stringify({ is_active: newState })
    });
    if (res.ok) {
        showToast(newState ? 'success' : 'info', newState ? 'Bot başlatıldı' : 'Bot durduruldu');
        loadBotStatus(); // refresh immediately
    }
  } catch (e) {
      showToast('error', 'Bot durumu degistirilemedi');
  }
}

async function sendManualSignal(signalType) {
    const symbol = document.getElementById('bp-symbol')?.value || 'BTCUSDT';
    if(!confirm(`${symbol} için ${signalType} sinyali göndermek istiyor musunuz?`)) return;
    
    try {
        const res = await fetch(API + '/bot/force_signal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + AUTH.token
            },
            body: JSON.stringify({ signal: signalType, symbol: symbol })
        });
        const data = await res.json();
        if(res.ok) {
            showToast('success', data.message);
            loadBotLogs(); // refresh logs
        } else {
            showToast('error', data.error || 'Sinyal basarisiz');
        }
    } catch(e) {
         showToast('error', 'Baglanti hatasi');
    }
}


// DEPRECATED: Duplicate bot refresh functions removed
// The correct implementations are at the bottom of the file (bpLoadChart, bpLoadStatus, bpLoadLogs)

/* ═══════════════════════════════════════
   MARKET FILTER BUTTONS
═══════════════════════════════════════ */
document.querySelectorAll('.mkt-filters').forEach(bar => {
  bar.querySelectorAll('.fb').forEach(btn => {
    btn.addEventListener('click', function () {
      bar.querySelectorAll('.fb').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      CURRENT_FILTER = this.getAttribute('data-filter') || 'all';
      scheduleRender();
    });
  });
});

window.addEventListener('load', () => {
  const searchInput = document.getElementById('market-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      SEARCH_QUERY = e.target.value.trim();
      scheduleRender();
    });
  }
});

/* ═══════════════════════════════════════
   PNL LIVE UPDATE (dashboard)
═══════════════════════════════════════ */
const pnls = [842.50, 234.20, -89.10, 156.80, 421.00];
const pnlIds = ['p1-pnl', 'p2-pnl', 'p3-pnl', 'p4-pnl', 'p5-pnl'];
setInterval(() => {
  pnls.forEach((v, i) => {
    pnls[i] = parseFloat((v + (Math.random() - .47) * 2.5).toFixed(2));
    const el = document.getElementById(pnlIds[i]); if (!el) return;
    const pos = pnls[i] >= 0;
    el.textContent = (pnls[i] > 0 ? '+' : (pnls[i] < 0 ? '-' : '')) + Math.abs(pnls[i]).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' $';
    el.style.color = pos ? 'var(--green)' : 'var(--red)';
  });
}, 3500);

/* ═══════════════════════════════════════
   LIVE MARKET DATA
═══════════════════════════════════════ */
let LIVE_COINS = [];
let TICKER_SYMBOLS = [];
let SEARCH_QUERY = '';
let CURRENT_FILTER = 'all';

const COIN_COLORS = {
  bitcoin: '#f7931a', ethereum: '#627eea', binancecoin: '#f3ba2f', solana: '#9945ff',
  ripple: '#346aa9', avalanche: '#e84142', cardano: '#0033ad', dogecoin: '#c2a633',
  chainlink: '#375bd2', polkadot: '#e6007a', 'matic-network': '#8247e5',
  'near-protocol': '#1da462', litecoin: '#a0a0a0', uniswap: '#ff007a',
  cosmos: '#6f7390', aptos: '#f89c1c', arbitrum: '#28a0f0', sui: '#4da2ff',
  tron: '#eb0029', 'shiba-inu': '#ffa409',
};

const COIN_STATE = {};
const LOGO_CACHE = {};

// ─── Format helpers ───
function fmtPrice(v) {
  if (v == null || isNaN(v)) return '$—';
  if (v >= 1000) return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (v >= 1) return '$' + v.toFixed(4).replace(/\.?0+$/, '').slice(0, 10);
  if (v >= 0.01) return '$' + v.toFixed(4);
  return '$' + v.toFixed(6);
}
function fmtLarge(v) {
  if (!v || isNaN(v)) return '—';
  if (v >= 1e12) return '$' + (v / 1e12).toFixed(2) + 'T';
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(0) + 'M';
  return '$' + v.toFixed(0);
}
function fmtChg(v) {
  if (v == null || isNaN(v)) return '—';
  return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
}
function sparkline(data, up) {
  const pts = (data && data.length >= 4) ? data : null;
  if (!pts) { const r = up ? [1, 3, 5, 8, 12, 10, 14, 16, 20, 24, 28] : [28, 24, 20, 16, 14, 10, 12, 8, 5, 3, 1]; return mkSparkSvg(r, up); }
  const step = Math.max(1, Math.floor(pts.length / 11)); const b = [];
  for (let i = 0; i < pts.length && b.length < 11; i += step) b.push(pts[i]);
  return mkSparkSvg(b, up);
}
function mkSparkSvg(b, up) {
  const n = b.length, w = 72, h = 26, mn = Math.min(...b), mx = Math.max(...b), rng = mx - mn || 1;
  const xs = b.map((_, i) => i * w / (n - 1)), ys = b.map(v => (h - 2) - ((v - mn) / rng) * (h - 4) + 1);
  let d = `M ${xs[0].toFixed(1)} ${ys[0].toFixed(1)}`;
  for (let i = 1; i < n; i++) { const cx = (xs[i - 1] + xs[i]) / 2; d += ` C ${cx.toFixed(1)} ${ys[i - 1].toFixed(1)},${cx.toFixed(1)} ${ys[i].toFixed(1)},${xs[i].toFixed(1)} ${ys[i].toFixed(1)}`; }
  const clr = up ? '#00e676' : '#ff1744';
  return `<svg width="72" height="26" viewBox="0 0 72 26"><path d="${d}" fill="none" stroke="${clr}" stroke-width="1.5" stroke-linecap="round"/></svg>`;
}

// ─── State → LIVE_COINS ───
function stateToLiveCoins() {
  let coins = Object.values(COIN_STATE)
    .filter(c => c.current_price > 0)
    .sort((a, b) => {
      // Market cap varsa ona göre sırala, yoksa volume'e göre
      const aMC = a.market_cap || 0;
      const bMC = b.market_cap || 0;
      if (aMC !== 0 || bMC !== 0) return bMC - aMC;
      return (b.total_volume || 0) - (a.total_volume || 0);
    })
    .map((c, i) => ({
      ...c,
      market_cap_rank: i + 1,
      price_change_percentage_24h_in_currency: c.price_change_percentage_24h,
    }));

  if (SEARCH_QUERY) {
    const q = SEARCH_QUERY.toLowerCase();
    coins = coins.filter(c => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
  }

  if (CURRENT_FILTER === 'gainers') coins = coins.filter(c => c.price_change_percentage_24h > 0);
  else if (CURRENT_FILTER === 'losers') coins = coins.filter(c => c.price_change_percentage_24h < 0);

  return coins;
}

// ─── Render: coin tablosu ───
function renderCoins(targetId) {
  const el = document.getElementById(targetId || 'coin-list');
  if (!el || !LIVE_COINS.length) return;
  const ts = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  ['mkt-ts', 'mkt-ts2'].forEach(id => { const e = document.getElementById(id); if (e) e.textContent = 'Güncellendi: ' + ts; });

  let coinsToRender = LIVE_COINS;
  if (targetId === 'coin-list2') {
    coinsToRender = LIVE_COINS.slice(0, 20);
  }

  el.innerHTML = coinsToRender.map(c => {
    const sym = c.symbol.toUpperCase();
    const col = COIN_COLORS[c.id] || '#448aff';
    const d1 = c.price_change_percentage_24h;
    const d1ok = d1 != null && !isNaN(d1);
    const d7 = c.price_change_percentage_7d_in_currency;
    const d7ok = d7 != null && !isNaN(d7);
    
    // Önce LOGO_CACHE'den gerçek logoyu al, yoksa cryptocurrency-icons CDN
    let logoUrl = LOGO_CACHE[sym] || `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${sym.toLowerCase()}.png`;
    
    // Fallback: siyah-beyaz harf avatarı
    const fallbackSvg = `https://ui-avatars.com/api/?name=${sym}&size=128&background=000000&color=ffffff&bold=true&format=svg`;

    return `<div class="tbl-row">
      <div class="cc" style="gap:12px">
        <img src="${logoUrl}" onerror="this.onerror=null; this.src='${fallbackSvg}'" style="width:32px;height:32px;border-radius:16px;object-fit:cover;border:1px solid ${col}44">
        <div><div class="cn">${c.name}</div><div class="cs">${sym}</div></div>
      </div>
      <div class="td td-p">${fmtPrice(c.current_price)}</div>
      <div class="td ${d1ok ? (d1 >= 0 ? 'td-g' : 'td-r') : 'td-m'}">${d1ok ? fmtChg(d1) : '—'}</div>
      <div class="td ${d7ok ? (d7 >= 0 ? 'td-g' : 'td-r') : 'td-m'}">${d7ok ? fmtChg(d7) : '—'}</div>
      <div class="td td-m">${fmtLarge(c.total_volume)}</div>
      <div class="td td-m">${fmtLarge(c.market_cap)}</div>
      <div style="display:flex;justify-content:flex-end">${sparkline(c.sparkline_in_7d?.price, d1ok && d1 >= 0)}</div>
    </div>`;
  }).join('');
}

// ─── Render: ticker ───
function updateTicker(coins) {
  const ti = document.getElementById('ticker-inner'); if (!ti || !coins.length) return;
  const items = [...coins, ...coins];
  ti.innerHTML = items.map(c => {
    const chg = c.price_change_percentage_24h;
    const ok = chg != null && !isNaN(chg), up = ok && chg >= 0;
    return `<span class="t-item"><span class="t-sym">${c.symbol.toUpperCase()}</span><span class="t-price">${fmtPrice(c.current_price)}</span><span class="${up ? 't-up' : 't-dn'}">${up ? '▲' : '▼'} ${ok ? Math.abs(chg).toFixed(2) + '%' : '—'}</span></span>`;
  }).join('');
}

// ─── Render: BTC hero card ───
function updateBTCCard(btc) {
  const s = (id, txt, col) => { 
    const e = document.getElementById(id); 
    if (e) { 
      e.textContent = txt; 
      if (col) e.style.color = col;
    }
  };
  s('btc-price', fmtPrice(btc.current_price));
  const pct = btc.price_change_percentage_24h, abs = btc.price_change_24h;
  const pctOk = pct != null && !isNaN(pct), up = pctOk && pct >= 0;
  const chgEl = document.getElementById('btc-chg');
  if (chgEl && pctOk && abs != null) {
    chgEl.textContent = `${up ? '▲' : '▼'} ${up ? '+' : ''}${fmtPrice(Math.abs(abs))} (${up ? '+' : ''}${pct.toFixed(2)}%)`;
    chgEl.style.color = up ? 'var(--green)' : 'var(--red)';
  }
  s('btc-high', fmtPrice(btc.high_24h));
  s('btc-low', fmtPrice(btc.low_24h));
  s('btc-vol', fmtLarge(btc.total_volume));
  s('btc-mc', fmtLarge(btc.market_cap));
  const pts = btc.sparkline_in_7d?.price;
  if (pts && pts.length > 10) {
    const sample = (a, n) => { const st = Math.max(1, Math.floor(a.length / n)), r = []; for (let i = 0; i < a.length && r.length < n; i += st)r.push(a[i]); return r; };
    const mini = sample(pts, 42), W = 380, H = 64, pad = 4;
    const mn = Math.min(...mini), mx = Math.max(...mini), rng = mx - mn || 1;
    const xs = mini.map((_, i) => pad + i * (W - 2 * pad) / (mini.length - 1));
    const ys = mini.map(v => (H - pad) - ((v - mn) / rng) * (H - 2 * pad));
    let d = `M ${xs[0].toFixed(1)} ${ys[0].toFixed(1)}`;
    for (let i = 1; i < mini.length; i++) { const cx = (xs[i - 1] + xs[i]) / 2; d += ` C ${cx.toFixed(1)} ${ys[i - 1].toFixed(1)},${cx.toFixed(1)} ${ys[i].toFixed(1)},${xs[i].toFixed(1)} ${ys[i].toFixed(1)}`; }
    document.getElementById('mini-line')?.setAttribute('d', d);
    document.getElementById('mini-area')?.setAttribute('d', d + ` L ${xs[mini.length - 1]} ${H} L ${xs[0]} ${H} Z`);
  }
}

// ─── Render: market stats (strip + mkt-sum) ───
function updateMarketStats(capV, capChgV, volV, domV) {
  const s = (id, txt, col) => { const e = document.getElementById(id); if (e) { e.textContent = txt; if (col) e.style.color = col; } };
  if (capV) { ['ms-total-cap', 'ms-total-cap2'].forEach(id => s(id, fmtLarge(capV))); s('strip-cap', fmtLarge(capV)); }
  if (capChgV != null && !isNaN(capChgV)) {
    const col = capChgV >= 0 ? 'var(--green)' : 'var(--red)';
    ['ms-total-cap-chg', 'ms-total-cap-chg2'].forEach(id => s(id, fmtChg(capChgV), col));
    s('strip-cap-chg', (capChgV >= 0 ? '▲ +' : '▼ ') + Math.abs(capChgV).toFixed(2) + '% 24s', col);
  }
  if (volV) { ['ms-total-vol', 'ms-total-vol2'].forEach(id => s(id, fmtLarge(volV))); s('strip-vol', fmtLarge(volV)); }
  if (domV && !isNaN(domV)) { ['ms-btc-dom', 'ms-btc-dom2'].forEach(id => s(id, domV.toFixed(1) + '%')); s('strip-dom', domV.toFixed(1) + '%'); }
}

// ─── Render: Fear & Greed ───
function updateFearGreed(val, lbl) {
  const lblMap = { 'Extreme Fear': 'Aşırı Korku', 'Fear': 'Korku', 'Neutral': 'Nötr', 'Greed': 'Açgözlü', 'Extreme Greed': 'Aşırı Açgözlü' };
  const lblTR = lblMap[lbl] || lbl;
  const c = val < 25 ? 'var(--red)' : val < 45 ? 'var(--amber)' : val < 55 ? '#fff' : val < 75 ? 'var(--amber)' : 'var(--green)';
  ['ms-fng', 'ms-fng2'].forEach(id => { const e = document.getElementById(id); if (e) { e.textContent = val; e.style.color = c; } });
  ['ms-fng-lbl', 'ms-fng-lbl2'].forEach(id => { const e = document.getElementById(id); if (e) { e.textContent = lblTR; e.style.color = c; } });
}

// ─── Render: Isı haritası ───
function updateHeatmap(coins) {
  if (!coins || !coins.length) return;
  const hm = document.getElementById('heatmap-grid');
  if (hm) {
    hm.innerHTML = coins.slice(0, 20).map(c => {
      const chg = c.price_change_percentage_24h || 0;
      const intensity = Math.min(Math.abs(chg) / 10, 1);
      const bg = chg >= 0 ? `rgba(255,255,255,${0.08 + intensity * 0.45})` : `rgba(136,136,136,${0.08 + intensity * 0.45})`;
      const tc = chg >= 0 ? 'var(--green)' : 'var(--red)';
      return `<div style="background:${bg};border-radius:5px;padding:7px 5px;text-align:center" title="${c.name}: ${fmtPrice(c.current_price)}">
        <div style="font-size:9px;font-weight:700;color:#fff;font-family:var(--mono)">${c.symbol.toUpperCase().slice(0, 4)}</div>
        <div style="font-size:10px;font-weight:600;color:${tc};margin-top:2px">${fmtChg(chg)}</div>
      </div>`;
    }).join('');
  }
}

// JS Memory Cache for CoinGecko Logos
// LOGO_CACHE already defined

// ─── Render: Global En çok yükselenler / düşenler ───
async function fetchGlobalGainersLosers() {
  try {
    // Backend proxy kullan
    const res = await fetch('/api/market/binance-ticker');
    if (!res.ok) return;
    const tickers = await res.json();

    // Yeterli hacme (volume) sahip geçerli USDT çiftlerini filtrele, kaldıraçlı tokenları çıkar
    let usdtPairs = tickers.filter(t => t.symbol.endsWith('USDT') && !t.symbol.includes('UPUSDT') && !t.symbol.includes('DOWNUSDT') && !t.symbol.includes('BUSD') && parseFloat(t.quoteVolume) > 1000000);

    // Yüzde değişime göre sırala
    usdtPairs.sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent));

    const gainers = usdtPairs.slice(0, 5);
    const losers = usdtPairs.slice(-5).reverse();

    // Logo çek - cache'de olmayan coinler için
    const allSyms = [...gainers, ...losers].map(t => t.symbol.replace('USDT', ''));
    const uncachedSyms = allSyms.filter(sym => !LOGO_CACHE[sym] || LOGO_CACHE[sym] === 'fallback');
    
    if (uncachedSyms.length > 0) {
      // CoinGecko'dan logo çek
      for (const sym of uncachedSyms) {
        try {
          const cgRes = await fetch(`https://api.coingecko.com/api/v3/search?query=${sym}`);
          if (cgRes.ok) {
            const cgData = await cgRes.json();
            const match = cgData.coins.find(c => c.symbol.toUpperCase() === sym);
            if (match && match.large) {
              LOGO_CACHE[sym] = match.large;
            } else if (match && match.thumb) {
              LOGO_CACHE[sym] = match.thumb;
            }
          }
          // Rate limit için kısa delay
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (e) {
          console.warn(`Logo fetch failed for ${sym}:`, e.message);
        }
      }
    }

    const ts = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const tsEl = document.getElementById('top-gainers-ts'); if (tsEl) tsEl.textContent = ts;

    const row = t => {
      const chg = parseFloat(t.priceChangePercent);
      const price = parseFloat(t.lastPrice);
      const sym = t.symbol.replace('USDT', '');
      const col = COIN_COLORS[sym.toLowerCase()] || '#448aff';
      
      // Önce LOGO_CACHE'den gerçek logoyu al, yoksa cryptocurrency-icons CDN
      let logoUrl = LOGO_CACHE[sym] || `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${sym.toLowerCase()}.png`;
      
      // Fallback: siyah-beyaz harf avatarı
      const fallbackSvg = `https://ui-avatars.com/api/?name=${sym}&size=128&background=000000&color=ffffff&bold=true&format=svg`;

      return `<div class="pos-row" style="grid-template-columns:1fr auto">
        <div style="display:flex;align-items:center;gap:8px">
          <img src="${logoUrl}" onerror="this.onerror=null; this.src='${fallbackSvg}'" style="width:26px;height:26px;border-radius:13px;object-fit:cover;border:1px solid ${col}44">
          <div><div style="font-size:12px;font-weight:600">${sym}/USDT</div>
               <div style="font-size:10px;color:var(--t3);font-family:var(--mono)">${fmtPrice(price)}</div></div>
        </div>
        <div style="font-family:var(--mono);font-size:13px;font-weight:700;color:${chg >= 0 ? 'var(--green)' : 'var(--red)'}">${fmtChg(chg)}</div>
      </div>`;
    };

    const gl = document.getElementById('top-gainers-list'); if (gl) gl.innerHTML = gainers.map(row).join('');
    const ll = document.getElementById('top-losers-list'); if (ll) ll.innerHTML = losers.map(row).join('');
  } catch (e) { console.warn('Global gainers/losers fetch error:', e.message); }
}

// ─── BTC Chart (Canvas) ───
let chartCurrentInterval = '1h';
let chartCurrentLimit = 168;

function initChartCanvas() {
  const canvas = document.getElementById('btc-chart-canvas'); if (!canvas) return null;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth || canvas.parentElement?.clientWidth || 760;
  const H = 165;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  return ctx;
}

function drawCanvasChart(klines, up, ctx) {
  const canvas = document.getElementById('btc-chart-canvas'); if (!canvas || !ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.width / dpr, H = canvas.height / dpr;
  const closes = klines.map(k => parseFloat(k[4])); if (!closes.length) return;
  const mn = Math.min(...closes), mx = Math.max(...closes), rng = mx - mn || 1;
  const pl = 8, pr = 8, pt = 10, pb = 10;
  const cW = W - pl - pr, cH = H - pt - pb;
  const x = i => pl + (i / (closes.length - 1)) * cW;
  const y = v => pt + (1 - (v - mn) / rng) * cH;
  ctx.clearRect(0, 0, W, H);
  const lineCol = up ? '#00e676' : '#ff1744';
  const grad = ctx.createLinearGradient(0, pt, 0, H);
  grad.addColorStop(0, up ? 'rgba(255,255,255,0.18)' : 'rgba(136,136,136,0.18)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  // Area
  ctx.beginPath(); ctx.moveTo(x(0), y(closes[0]));
  for (let i = 1; i < closes.length; i++) { const cx = (x(i - 1) + x(i)) / 2; ctx.bezierCurveTo(cx, y(closes[i - 1]), cx, y(closes[i]), x(i), y(closes[i])); }
  ctx.lineTo(x(closes.length - 1), H); ctx.lineTo(x(0), H); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();
  // Line
  ctx.beginPath(); ctx.moveTo(x(0), y(closes[0]));
  for (let i = 1; i < closes.length; i++) { const cx = (x(i - 1) + x(i)) / 2; ctx.bezierCurveTo(cx, y(closes[i - 1]), cx, y(closes[i]), x(i), y(closes[i])); }
  ctx.strokeStyle = lineCol; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.stroke();
  // Dot
  const lx = x(closes.length - 1), ly = y(closes[closes.length - 1]);
  ctx.shadowColor = lineCol; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fillStyle = lineCol; ctx.fill();
  ctx.shadowBlur = 0;
  // Meta
  const first = closes[0], last = closes[closes.length - 1];
  const pct = ((last - first) / first) * 100;
  const s = (id, txt, col) => { const e = document.getElementById(id); if (e) { e.textContent = txt; if (col) e.style.color = col; } };
  s('chart-high', fmtPrice(Math.max(...closes)), 'var(--green)');
  s('chart-low', fmtPrice(Math.min(...closes)), 'var(--red)');
  s('chart-chg', fmtChg(pct), pct >= 0 ? 'var(--green)' : 'var(--red)');
  s('chart-price-tag', fmtPrice(last));
}

async function loadBTCChart(interval, limit) {
  if (interval) chartCurrentInterval = interval;
  if (limit) chartCurrentLimit = limit;
  const loader = document.getElementById('chart-loading');
  if (loader) { loader.style.display = 'flex'; loader.textContent = 'Yükleniyor...'; }
  try {
    const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=ETHUSDT&interval=${chartCurrentInterval}&limit=${chartCurrentLimit}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const klines = await res.json();
    if (loader) loader.style.display = 'none';
    const ctx = initChartCanvas(); if (!ctx) return;
    drawCanvasChart(klines, parseFloat(klines[klines.length - 1][4]) >= parseFloat(klines[0][4]), ctx);
  } catch (e) {
    if (loader) { loader.style.display = 'flex'; loader.textContent = 'Bağlantı hatası'; }
  }
}

// ─── WebSocket: Binance @ticker stream ───
let ws = null, wsTimer = null;

function startWebSocket() {
  if (ws) { try { ws.close(); } catch (e) { } }
  clearTimeout(wsTimer);
  ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');
  ws.onopen = () => console.log('WS bağlandı ✓ (!ticker@arr)');
  ws.onmessage = evt => {
    try {
      const dataArr = JSON.parse(evt.data);
      if (!Array.isArray(dataArr)) return;
      let updated = false;
      const threshold = window.innerWidth > 768 ? 200 : 50;
      dataArr.forEach(d => {
        const sym = d.s; if (!COIN_STATE[sym]) return;
        const np = parseFloat(d.c), pct = parseFloat(d.P), p = parseFloat(d.p), h = parseFloat(d.h), l = parseFloat(d.l), q = parseFloat(d.q);
        COIN_STATE[sym].current_price = np;
        if (!isNaN(pct)) COIN_STATE[sym].price_change_percentage_24h = pct;
        if (!isNaN(p)) COIN_STATE[sym].price_change_24h = p;
        if (!isNaN(h)) COIN_STATE[sym].high_24h = h;
        if (!isNaN(l)) COIN_STATE[sym].low_24h = l;
        if (!isNaN(q)) { COIN_STATE[sym].total_volume = q; }
        // Market cap CoinGecko'dan gelecek, WebSocket'ten güncelleme
        updated = true;

        // ETH chart anlık güncelle
        if (sym === 'ETHUSDT') {
          // Grafik altındaki bilgileri güncelle
          const che = document.getElementById('chart-high');
          if (che && !isNaN(h)) { che.textContent = fmtPrice(h); che.style.color = 'var(--green)'; }
          const cle = document.getElementById('chart-low');
          if (cle && !isNaN(l)) { cle.textContent = fmtPrice(l); cle.style.color = 'var(--red)'; }
          const cce = document.getElementById('chart-chg');
          if (cce && !isNaN(pct)) { const u = pct >= 0; cce.textContent = fmtChg(pct); cce.style.color = u ? 'var(--green)' : 'var(--red)'; }
          const cpe = document.getElementById('chart-price-tag');
          if (cpe) cpe.textContent = fmtPrice(np);
        }
        
        // BTC hero anlık güncelle (strip için)
        if (sym === 'BTCUSDT') {
          const pe = document.getElementById('btc-price');
          if (pe) { pe.textContent = fmtPrice(np); pe.style.color = !isNaN(pct) && pct >= 0 ? 'var(--green)' : 'var(--red)'; setTimeout(() => pe.style.color = '', 700); }
          const ce = document.getElementById('btc-chg');
          if (ce && !isNaN(pct) && !isNaN(p)) { const u = pct >= 0; ce.textContent = `${u ? '▲' : '▼'} ${u ? '+' : ''}${fmtPrice(Math.abs(p))} (${u ? '+' : ''}${pct.toFixed(2)}%)`; ce.style.color = u ? 'var(--green)' : 'var(--red)'; }
          const he = document.getElementById('btc-high'), le = document.getElementById('btc-low');
          if (he && !isNaN(h)) he.textContent = fmtPrice(h);
          if (le && !isNaN(l)) le.textContent = fmtPrice(l);
          const ve = document.getElementById('btc-vol');
          if (ve && !isNaN(q)) ve.textContent = fmtLarge(q);
          const sb = document.getElementById('strip-btc-chg'), sp = document.getElementById('strip-btc-price');
          if (sb && !isNaN(pct)) { const u = pct >= 0; sb.textContent = (u ? '+' : '') + pct.toFixed(2) + '%'; sb.style.color = u ? 'var(--green)' : 'var(--red)'; }
          if (sp) sp.textContent = fmtPrice(np);
        }

        // Bot Paneli Canlı Fiyat Güncellemesi
        const bps = document.getElementById('bp-symbol');
        if (bps && bps.value === sym) {
          const bpe = document.getElementById('bp-price');
          if (bpe) {
            bpe.textContent = fmtPrice(np);
            bpe.style.color = !isNaN(pct) && pct >= 0 ? 'var(--green)' : 'var(--red)';
            setTimeout(() => bpe.style.color = '', 400);
          }
          const bpce = document.getElementById('bp-price-chg');
          if (bpce && !isNaN(pct)) {
            const u = pct >= 0;
            bpce.textContent = `${u ? '+' : ''}${pct.toFixed(2)}% | 24s Hacim: ${fmtLarge(q)}`;
            bpce.style.color = u ? 'var(--green)' : 'var(--red)';
          }
        }
      });
      if (updated) scheduleRender();
    } catch (e) { }
  };
  ws.onerror = () => { };
  ws.onclose = () => { wsTimer = setTimeout(startWebSocket, 3000); };
}

// ─── Throttled render ───
let renderTimer = null;
function scheduleRender() {
  if (renderTimer) return;
  renderTimer = setTimeout(() => {
    renderTimer = null;
    LIVE_COINS = stateToLiveCoins();
    renderCoins('coin-list');
    if (document.getElementById('dash-markets2')?.style.display !== 'none') {
      renderCoins('coin-list2');
      // Sync with markets-enhanced.js
      if (typeof syncMarketData === 'function') syncMarketData();
    }
    updateTicker(LIVE_COINS.slice(0, 12));
    updateHeatmap(LIVE_COINS);
  }, 2000);
}

// ─── Snapshot (tam 24hr veri) ───
async function fetchSnapshot() {
  try {
    // Backend proxy kullan (CORS hatası önlenir)
    const res = await fetch('/api/market/binance-ticker');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const tickers = await res.json();

    const usdtPairs = tickers.filter(t => t.symbol.endsWith('USDT') && !t.symbol.includes('UPUSDT') && !t.symbol.includes('DOWNUSDT') && !t.symbol.includes('BUSD') && parseFloat(t.quoteVolume) > 100000);

    usdtPairs.forEach(t => {
      const sp = v => { const n = parseFloat(v); return isNaN(n) ? null : n; };
      if (!COIN_STATE[t.symbol]) {
        let symStr = t.symbol.replace('USDT', '');
        COIN_STATE[t.symbol] = {
          id: t.symbol === 'BTCUSDT' ? 'bitcoin' : (t.symbol === 'ETHUSDT' ? 'ethereum' : symStr.toLowerCase()),
          name: symStr,
          symbol: symStr,
          sparkline_in_7d: { price: null },
          price_change_percentage_7d_in_currency: 0 // Default to 0 instead of null
        };
      }
      Object.assign(COIN_STATE[t.symbol], {
        current_price: sp(t.lastPrice) ?? 0,
        price_change_percentage_24h: sp(t.priceChangePercent),
        price_change_24h: sp(t.priceChange),
        high_24h: sp(t.highPrice) ?? 0,
        low_24h: sp(t.lowPrice) ?? 0,
        total_volume: sp(t.quoteVolume) ?? 0,
        market_cap: COIN_STATE[t.symbol]?.market_cap || null // Keep existing market cap if available
      });
    });

    TICKER_SYMBOLS = Object.keys(COIN_STATE).sort((a, b) => COIN_STATE[b].total_volume - COIN_STATE[a].total_volume);
    
    // CoinGecko'dan market cap verilerini çek
    await fetchMarketCaps();
    
    LIVE_COINS = stateToLiveCoins();

    renderCoins('coin-list');
    if (document.getElementById('dash-markets2')?.style.display !== 'none') {
      renderCoins('coin-list2');
      // Sync with markets-enhanced.js
      if (typeof syncMarketData === 'function') syncMarketData();
    }
    updateTicker(LIVE_COINS.slice(0, 12));
    updateHeatmap(LIVE_COINS);

    const btc = LIVE_COINS.find(c => c.id === 'bitcoin');
    if (btc) fetchBTCSparkline(btc);
    const tv = LIVE_COINS.reduce((s, c) => s + (c.total_volume || 0), 0);
    const bv = LIVE_COINS.find(c => c.id === 'bitcoin')?.total_volume || 0;
    updateMarketStats(null, null, tv, tv ? (bv / tv) * 100 : 0);

    // fetch7dChanges artık gerek yok - CoinGecko'dan geliyor
    fetchCoinLogos();

    const subEl = document.querySelector('.mkt-sub');
    if (subEl) subEl.textContent = `${Object.keys(COIN_STATE).length} kripto para — Hacme göre sıralı`;
  } catch (e) { 
    console.warn('Snapshot hatası:', e.message); 
  }
}

// ─── Market Cap verilerini CoinGecko'dan çek ───
async function fetchMarketCaps() {
  try {
    console.log('[MARKET CAPS] Starting fetch...');
    let successfulPages = 0;
    
    for (let page = 1; page <= 4; page++) {
      // Backend proxy kullan
      const url = `/api/market/coingecko-markets?page=${page}&per_page=250`;
      console.log(`[MARKET CAPS] Fetching page ${page}...`);
      
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`[MARKET CAPS] Page ${page} failed: ${res.status}`);
          if (res.status === 429) {
            console.warn('[MARKET CAPS] Rate limit hit - CoinGecko API limit reached');
            console.warn('[MARKET CAPS] Market cap and 7d% data will be unavailable until rate limit resets');
            break;
          }
          if (res.status === 404) {
            console.error('[MARKET CAPS] Endpoint not found - server may need restart');
            break;
          }
          // Try to get error message
          try {
            const errorData = await res.json();
            console.warn(`[MARKET CAPS] Error details:`, errorData);
          } catch (e) {
            console.warn(`[MARKET CAPS] Could not parse error response`);
          }
          break;
        }
        const coins = await res.json();
        console.log(`[MARKET CAPS] Page ${page} received ${coins.length} coins`);
        
        let updated = 0;
        coins.forEach(c => {
          const sym = c.symbol.toUpperCase() + 'USDT';
          if (COIN_STATE[sym]) {
            COIN_STATE[sym].market_cap = c.market_cap;
            COIN_STATE[sym].id = c.id;
            COIN_STATE[sym].name = c.name;
            // CoinGecko'dan gelen doğru total_volume
            if (c.total_volume != null) {
              COIN_STATE[sym].total_volume = c.total_volume;
            }
            // 24 saatlik değişim verisi (CoinGecko'dan)
            if (c.price_change_percentage_24h_in_currency != null) {
              COIN_STATE[sym].price_change_percentage_24h = c.price_change_percentage_24h_in_currency;
            } else if (c.price_change_percentage_24h != null) {
              COIN_STATE[sym].price_change_percentage_24h = c.price_change_percentage_24h;
            }
            // 7 günlük değişim verisi
            if (c.price_change_percentage_7d_in_currency != null) {
              COIN_STATE[sym].price_change_percentage_7d_in_currency = c.price_change_percentage_7d_in_currency;
            }
            updated++;
          }
        });
        console.log(`[MARKET CAPS] Page ${page} updated ${updated} coins in COIN_STATE`);
        successfulPages++;
        
        // Longer delay between pages to avoid rate limits
        if (page < 4) await new Promise(r => setTimeout(r, 1000));
      } catch (fetchError) {
        console.error(`[MARKET CAPS] Fetch error on page ${page}:`, fetchError);
        break;
      }
    }
    
    if (successfulPages > 0) {
      console.log(`[MARKET CAPS] Successfully fetched ${successfulPages} pages`);
    } else {
      console.warn('[MARKET CAPS] No data fetched - using Binance data only');
      console.warn('[MARKET CAPS] Market cap and 7d% will show as "—"');
    }
    
    console.log('[MARKET CAPS] Updating LIVE_COINS...');
    // LIVE_COINS'i güncelle
    LIVE_COINS = stateToLiveCoins();
    
    // Market cap yüklendikten sonra BTC kartını güncelle
    const btc = LIVE_COINS.find(c => c.id === 'bitcoin');
    if (btc && btc.market_cap) {
      console.log('[MARKET CAPS] Updating BTC card with market cap:', btc.market_cap);
      updateBTCCard(btc);
    }
    
    // Render'ı güncelle
    console.log('[MARKET CAPS] Re-rendering coin lists...');
    renderCoins('coin-list');
    if (document.getElementById('dash-markets2')?.style.display !== 'none') {
      renderCoins('coin-list2');
      if (typeof syncMarketData === 'function') syncMarketData();
    }
    console.log('[MARKET CAPS] Fetch complete!');
  } catch (e) { 
    console.error('[MARKET CAPS] Error:', e); 
  }
}

// ─── Logo pre-fetch from CoinGecko ───
async function fetchCoinLogos() {
  try {
    console.log('Logo çekiliyor... Toplam coin:', Object.keys(COIN_STATE).length);
    
    // Backend proxy kullan (CORS hatası önlenir)
    for (let page = 1; page <= 4; page++) {
      const res = await fetch(`/api/market/coingecko-markets?page=${page}&per_page=250`);
      if (!res.ok) break;
      const coins = await res.json();
      coins.forEach(c => {
        const sym = c.symbol.toUpperCase();
        if (c.image) {
          LOGO_CACHE[sym] = c.image;
          
          // COIN_STATE'te varsa güncelle
          const coinKey = sym + 'USDT';
          if (COIN_STATE[coinKey]) {
            COIN_STATE[coinKey].id = c.id;
            COIN_STATE[coinKey].name = c.name;
          }
        }
      });
      if (page < 4) await new Promise(r => setTimeout(r, 1500));
    }
    
    // Re-render with updated logos
    LIVE_COINS = stateToLiveCoins();
    renderCoins('coin-list');
    if (document.getElementById('dash-markets2')?.style.display !== 'none') {
      renderCoins('coin-list2');
      if (typeof syncMarketData === 'function') syncMarketData();
    }
    console.log('Logo cache updated:', Object.keys(LOGO_CACHE).length, 'logos');
  } catch (e) { console.warn('Logo fetch error:', e.message); }
}

async function fetch7dChanges() {
  const chunks = [];
  const topSyms = TICKER_SYMBOLS.slice(0, 300);
  for (let i = 0; i < topSyms.length; i += 100) {
    chunks.push(topSyms.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    try {
      const res = await fetch(`https://api.binance.com/api/v3/ticker?windowSize=7d&symbols=[${chunk.map(s => `"${s}"`).join(',')}]`);
      if (res.ok) {
        const data = await res.json();
        data.forEach(t => {
          if (COIN_STATE[t.symbol]) {
            COIN_STATE[t.symbol].price_change_percentage_7d_in_currency = parseFloat(t.priceChangePercent);
          }
        });
      }
    } catch (e) { }
  }
  LIVE_COINS = stateToLiveCoins();
  scheduleRender();
}

async function fetchBTCSparkline(btcCoin) {
  try {
    const res = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=168');
    if (!res.ok) return;
    const klines = await res.json();
    btcCoin.sparkline_in_7d = { price: klines.map(k => parseFloat(k[4])) };
    COIN_STATE['BTCUSDT'].sparkline_in_7d = btcCoin.sparkline_in_7d;
    updateBTCCard(btcCoin);
  } catch (e) { 
    console.warn('BTC sparkline error:', e.message);
    updateBTCCard(btcCoin || COIN_STATE['BTCUSDT']); 
  }
}

async function fetchGlobal() {
  try {
    const res = await fetch(API + '/market/global'); if (!res.ok) return;
    const resJson = await res.json();
    const data = resJson.data || {};
    updateMarketStats(data.total_market_cap?.usd, data.market_cap_change_percentage_24h_usd, data.total_volume?.usd, data.market_cap_percentage?.btc);
  } catch (e) { }
}

async function fetchFearGreed() {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1'); if (!res.ok) return;
    const { data } = await res.json();
    updateFearGreed(parseInt(data[0].value), data[0].value_classification);
  } catch (e) { }
}

// ─── Başlat ───
fetchSnapshot();
fetchFearGreed();
fetchGlobalGainersLosers();
setTimeout(fetchGlobal, 2000);
setTimeout(startWebSocket, 1500);
setInterval(fetchSnapshot, 60000);
setInterval(fetchGlobal, 120000);
setInterval(fetchFearGreed, 300000);
setInterval(fetchGlobalGainersLosers, 120000); // 60000'den 120000'e çıkardık (2 dakika)
// Grafik: sayfa yüklendikten sonra
window.addEventListener('load', () => {
  loadBTCChart(chartCurrentInterval, chartCurrentLimit);
  // Tab butonları
  const tabs = document.getElementById('chart-tabs');
  if (tabs) tabs.querySelectorAll('.tbtn').forEach(btn => {
    btn.addEventListener('click', function () {
      tabs.querySelectorAll('.tbtn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      loadBTCChart(this.dataset.interval, parseInt(this.dataset.limit));
    });
  });
  window.addEventListener('resize', () => loadBTCChart());
});

/* ═══════════════════════════════════════
   TOAST
═══════════════════════════════════════ */
let toastTimer = null;
function showToast(type, msg) {
  const t = document.getElementById('toast'), ico = document.getElementById('toast-ico'), m = document.getElementById('toast-msg');
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  ico.textContent = icons[type] || 'ℹ'; m.textContent = msg;
  t.style.borderColor = type === 'success' ? 'rgba(255,255,255,.2)' : type === 'error' ? 'rgba(136,136,136,.2)' : 'var(--b2)';
  t.classList.add('show'); if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ═══════════════════════════════════════
   SHAKE
═══════════════════════════════════════ */
function shakeEl(id) {
  const el = document.getElementById(id); if (!el) return;
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 400);
}

/* ═══════════════════════════════════════
   THEME TOGGLE
═══════════════════════════════════════ */
function toggleTheme() {
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  localStorage.setItem('tb_theme', isLight ? 'light' : 'dark');
  document.querySelectorAll('.theme-toggle').forEach(b => b.textContent = isLight ? '☀️' : '🌙');
  if (typeof initDonuts === 'function') { setTimeout(initDonuts, 100); }
}
(function () { if (localStorage.getItem('tb_theme') === 'light') { document.body.classList.add('light'); document.querySelectorAll('.theme-toggle').forEach(b => b.textContent = '☀️'); } })();

/* ═══════════════════════════════════════
   MOBILE MENU
═══════════════════════════════════════ */
function toggleMobile() { const m = document.getElementById('mobile-menu'); m.classList.toggle('open'); document.body.style.overflow = m.classList.contains('open') ? 'hidden' : ''; }
function closeMobile() {
  document.getElementById('mobile-menu').classList.remove('open');
  if (!document.getElementById('authModal').classList.contains('open')) {
    document.body.style.overflow = '';
  }
}

/* ═══════════════════════════════════════
   PARTICLES
═══════════════════════════════════════ */
(function initParticles() {
  const canvases = document.querySelectorAll('.particle-canvas');
  if (!canvases.length) return;

  canvases.forEach(canvas => {
    const ctx = canvas.getContext('2d');
    const hero = canvas.parentElement;
    let W, H, particles = [];

    function resize() {
      W = hero.offsetWidth || window.innerWidth;
      H = hero.offsetHeight || window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    }

    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * 2000,
        y: Math.random() * 800,
        vx: (Math.random() - .5) * .35,
        vy: (Math.random() - .5) * .35,
        r: Math.random() * 1.5 + .5,
        a: Math.random() * .25 + .08
      });
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const isL = document.body.classList.contains('light'), dc = isL ? '0,0,0' : '255,255,255';

      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${dc},${p.a})`;
        ctx.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(${dc},${.05 * (1 - d / 120)})`;
            ctx.lineWidth = .5;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    }
    draw();
  });
})();

/* ═══════════════════════════════════════
   DONUT CHARTS
═══════════════════════════════════════ */
function drawDonut(canvasId, value, maxVal, color) {
  const canvas = document.getElementById(canvasId); if (!canvas) return;
  const ctx = canvas.getContext('2d'); const dpr = window.devicePixelRatio || 1; const size = 120;
  canvas.style.width = size + 'px'; canvas.style.height = size + 'px'; canvas.width = size * dpr; canvas.height = size * dpr; ctx.scale(dpr, dpr);
  const cx = size / 2, cy = size / 2, r = 46, lw = 8, pct = Math.min(value / maxVal, 1), start = -Math.PI / 2, end = start + pct * 2 * Math.PI;
  const isL = document.body.classList.contains('light');
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.strokeStyle = isL ? '#e0e0e2' : '#1c1c1c'; ctx.lineWidth = lw; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r, start, end); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
}
function initDonuts() { 
  // Henüz işlem olmadığı için tüm değerler 0 - tam yuvarlak göster
  drawDonut('donut-winrate', 0, 100, '#00e676'); 
  drawDonut('donut-roi', 0, 100, '#00e676'); 
  drawDonut('donut-trades', 0, 100, '#448aff'); 
}
const donutObs = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) { initDonuts(); donutObs.unobserve(e.target); } }); }, { threshold: .3 });
const perfSec = document.querySelector('.perf-section'); if (perfSec) donutObs.observe(perfSec);

/* ═══════════════════════════════════════
   FAQ ACCORDION
═══════════════════════════════════════ */
function toggleFAQ(q) { const item = q.parentElement; const was = item.classList.contains('open'); document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open')); if (!was) item.classList.add('open'); }

/* ═══════════════════════════════════════
   BOT PANEL CHART (Lightweight Charts)
═══════════════════════════════════════ */
let bpCurrentTf = '5m';
let botPanelChart = null;
let candleSeries = null;
let ottSeries = null;
let mavgSeries = null;

function bpSetTf(btn, tf) {
  document.querySelectorAll('.bpt-tf').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  bpCurrentTf = tf;
  bpLoadChart(true);
}

async function bpLoadChart(isUserAction = false) {
  const symEl = document.getElementById('bp-symbol');
  if (!symEl) return;
  const sym = symEl.value;

  const ottLen = parseInt(document.getElementById('ott-len')?.value || 2);
  const ottPct = parseFloat(document.getElementById('ott-pct')?.value || 1.4);

  const container = document.getElementById('bot-panel-chart');
  const loadingEl = document.getElementById('bp-chart-loading');
  if (!container) return;
  
  // Show loading
  if (loadingEl) loadingEl.classList.add('active');

  if (!botPanelChart) {
    container.innerHTML = '';
    botPanelChart = LightweightCharts.createChart(container, {
      layout: { background: { type: 'solid', color: '#000000' }, textColor: '#d1d4dc' },
      grid: { vertLines: { color: 'rgba(42, 46, 57, 0.1)' }, horzLines: { color: 'rgba(42, 46, 57, 0.1)' } },
      crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
      rightPriceScale: { borderColor: 'rgba(197, 203, 206, 0.2)' },
      timeScale: { borderColor: 'rgba(197, 203, 206, 0.2)', timeVisible: true, secondsVisible: false },
    });

    candleSeries = botPanelChart.addCandlestickSeries({
      upColor: '#00e676', downColor: '#ff1744', borderDownColor: '#ff1744', borderUpColor: '#00e676', wickDownColor: '#ff1744', wickUpColor: '#00e676'
    });

    mavgSeries = botPanelChart.addLineSeries({ color: '#0585E1', lineWidth: 2, title: 'Support' });
    ottSeries = botPanelChart.addLineSeries({ color: '#e040fb', lineWidth: 3, title: 'OTT' });

    window.addEventListener('resize', () => {
      if (container.parentElement) {
        botPanelChart.resize(container.parentElement.clientWidth, container.parentElement.clientHeight);
      }
    });
  }

  let bi = bpCurrentTf;
  if (bpCurrentTf === '1d') bi = '1d';

  let savedRange = null;
  if (!isUserAction && botPanelChart) {
      savedRange = botPanelChart.timeScale().getVisibleLogicalRange();
  }

  try {
    const klinesRes = await fetch(`https://api.binance.com/api/v3/klines?symbol=${sym}&interval=${bi}&limit=500`);
    if (klinesRes.ok) {
      const klines = await klinesRes.json();
      const candleData = klines.map(k => ({
        time: k[0] / 1000,
        open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4])
      }));
      candleSeries.setData(candleData);
    }

    const ottRes = await fetch(API + '/ott/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (AUTH.token || '') },
      body: JSON.stringify({ symbol: sym, interval: bpCurrentTf, length: ottLen, percent: ottPct, ma_type: 'VAR' })
    });

    if (ottRes.ok) {
      const data = await ottRes.json();
      const ottLineData = [];
      const mavgLineData = [];
      data.chart_data.timestamps.forEach((ts, idx) => {
        const timeStr = typeof ts === 'number' ? ts : (new Date(ts).getTime() / 1000);
        ottLineData.push({ time: timeStr, value: data.chart_data.ott[idx] });
        mavgLineData.push({ time: timeStr, value: data.chart_data.mavg[idx] });
      });

      // Avoid drawing lines to 0 for initial NaN values
      ottSeries.setData(ottLineData.filter(d => d.value !== 0));
      mavgSeries.setData(mavgLineData.filter(d => d.value !== 0));

      if (savedRange !== null) {
          botPanelChart.timeScale().setVisibleLogicalRange(savedRange);
      }

      const currentTrend = data.current.trend;
      ottSeries.applyOptions({ color: currentTrend === 'BULLISH' ? '#00e676' : '#ff1744' });

      if (data.signals && data.signals.length > 0) {
        const markers = data.signals.map(sig => {
          let targetTime = sig.time || (ottLineData[sig.index] ? ottLineData[sig.index].time : ottLineData[ottLineData.length - 1].time);
          return {
            time: targetTime,
            position: sig.type === 'BUY' ? 'belowBar' : 'aboveBar',
            color: sig.type === 'BUY' ? '#00e676' : '#ff1744',
            shape: sig.type === 'BUY' ? 'arrowUp' : 'arrowDown',
            text: sig.type === 'BUY' ? 'LONG' : 'SHORT',
            size: 2
          };
        });
        const validMarkers = markers.filter(m => m.time && !isNaN(m.time)).sort((a, b) => a.time - b.time);
        
        // Prevents setMarkers from crashing the chart when overlapping series
        try {
            ottSeries.setMarkers(validMarkers);
        } catch(err) { console.warn("Marker warning:", err); }
      }

      // ── Birlikte Backtest verisini de çekerek gerçek istatistikleri sunalım ──
      try {
        const btRes = await fetch(API + '/ott/backtest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (AUTH.token || '') },
          body: JSON.stringify({ symbol: sym, interval: bpCurrentTf, length: ottLen, percent: ottPct, days: 7 })
        });
        if (btRes.ok) {
          const btData = await btRes.json();
          
          // Top bar metrics
          const trdEl = document.getElementById('bp-total-trades');
          const wrEl = document.getElementById('bp-win-rate');
          const pnlEl = document.getElementById('bp-strategy-pnl');
          if (trdEl) trdEl.textContent = btData.total_trades || 0;
          if (wrEl) wrEl.textContent = '%' + (btData.win_rate || 0).toFixed(2);
          if (pnlEl) {
            const p = btData.total_pnl_pct || 0;
            pnlEl.textContent = (p > 0 ? '+' : (p < 0 ? '-' : '')) + Math.abs(p).toFixed(2) + '%';
            pnlEl.style.color = p >= 0 ? 'var(--green)' : 'var(--red)';
          }
          
          // Bottom bar metrics
          const btTradesEl = document.getElementById('bp-bottom-trades');
          const btWinsEl = document.getElementById('bp-bottom-wins');
          const btLossesEl = document.getElementById('bp-bottom-losses');
          const btAvgWinEl = document.getElementById('bp-bottom-avg-win');
          const btAvgLossEl = document.getElementById('bp-bottom-avg-loss');
          const btSharpeEl = document.getElementById('bp-bottom-sharpe');
          const btDrawdownEl = document.getElementById('bp-bottom-drawdown');
          const btPfEl = document.getElementById('bp-bottom-pf');
          
          if (btTradesEl) btTradesEl.textContent = btData.total_trades || 0;
          if (btWinsEl) btWinsEl.textContent = btData.winning_trades || 0;
          if (btLossesEl) btLossesEl.textContent = btData.losing_trades || 0;
          if (btAvgWinEl) btAvgWinEl.textContent = '+' + (btData.avg_win_pct || 0).toFixed(2) + '%';
          if (btAvgLossEl) btAvgLossEl.textContent = (btData.avg_loss_pct || 0).toFixed(2) + '%';
          if (btSharpeEl) btSharpeEl.textContent = (btData.sharpe_ratio || 0).toFixed(2);
          if (btDrawdownEl) btDrawdownEl.textContent = (btData.max_drawdown_pct || 0).toFixed(2) + '%';
          if (btPfEl) btPfEl.textContent = (btData.profit_factor || 0).toFixed(2);
        }
      } catch (e) { console.error('Backtest load error:', e); }

      if (typeof updateOTTScreenData === 'function') updateOTTScreenData(data);
    }
  } catch (e) { 
    console.error('Error loading bot chart', e);
    showToast('error', 'Grafik yüklenemedi. Lütfen tekrar deneyin.');
  } finally {
    // Hide loading
    if (loadingEl) {
      setTimeout(() => {
        loadingEl.classList.remove('active');
      }, 300);
    }
  }
}

const bpTab1 = document.getElementById('dash-tab-botpanel');
const bpTab2 = document.getElementById('dash-tab-botpanel-user');
const renderTvWidget = () => {
  const container = document.getElementById("bot-panel-chart");
  if (container && botPanelChart) {
    setTimeout(() => {
      if (container.parentElement) {
        botPanelChart.resize(container.parentElement.clientWidth, container.parentElement.clientHeight);
      }
    }, 100);
  }
};
if (bpTab1) bpTab1.addEventListener('click', renderTvWidget);
if (bpTab2) bpTab2.addEventListener('click', renderTvWidget);

window.addEventListener('load', () => {
  if (document.getElementById('dash-botpanel')?.style.display !== 'none') {
    bpLoadChart();
  }
});

/* ═══════════════════════════════════════
   TRADE FEED TICKER
═══════════════════════════════════════ */
(function startTradeFeed() {
  const scroll = document.getElementById('trade-feed-scroll'); if (!scroll) return;
  const trades = [];
  const pairs = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT', 'AVAX/USDT', 'DOGE/USDT', 'LINK/USDT', 'DOT/USDT', 'ADA/USDT'];
  for (let i = 0; i < 20; i++) {
    const pair = pairs[i % pairs.length]; const isLong = Math.random() > .4;
    const price = (pair.startsWith('BTC') ? 68000 + Math.random() * 2000 : pair.startsWith('ETH') ? 3000 + Math.random() * 200 : pair.startsWith('SOL') ? 190 + Math.random() * 20 : 100 + Math.random() * 500).toFixed(2);
    const amt = (Math.random() * 5 + .1).toFixed(3);
    trades.push(`<div class="tf-item"><span class="tf-pair">${pair}</span><span class="tf-side" style="background:${isLong ? 'var(--gg)' : 'var(--rg)'};color:${isLong ? 'var(--green)' : 'var(--red)'};border:1px solid ${isLong ? 'rgba(255,255,255,.2)' : 'rgba(136,136,136,.2)'}">${isLong ? 'BUY' : 'SELL'}</span><span style="font-family:var(--mono);font-size:11px;color:var(--t2)">$${price}</span><span style="font-family:var(--mono);font-size:10px;color:var(--t3)">${amt}</span></div>`);
  }
  scroll.innerHTML = trades.join('') + trades.join('');
  const scroll2 = document.getElementById('trade-feed-scroll2');
  if (scroll2) scroll2.innerHTML = scroll.innerHTML;
})();

/* ═══════════════════════════════════════
   TESTIMONIAL AUTO-SCROLL
═══════════════════════════════════════ */
(function () {
  const track = document.getElementById('testimonial-track'); if (!track) return;
  let dir = 1;
  setInterval(() => { track.scrollBy({ left: dir * 330, behavior: 'smooth' }); if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) dir = -1; if (track.scrollLeft <= 10) dir = 1; }, 4000);
})();


// ─── LocalStorage restore (en sonda) ───
(function () {
  // Varsayılan olarak public navigation göster
  applyLoggedOut();
  
  try {
    const t = localStorage.getItem('tb_token');
    const u = localStorage.getItem('tb_user');
    
    if (t && u) {
      AUTH.token = t;
      AUTH.user = JSON.parse(u);
      applyLoggedIn();
      checkAuth();
    }
  } catch (e) { 
    console.error('Auth initialization error:', e);
    applyLoggedOut();
  }
})();

/* ═══════════════════════════════════════
   CHECK AUTH (token validation)
═══════════════════════════════════════ */
async function checkAuth() {
  if (!AUTH.token) return;
  try {
    const res = await fetch(API + '/user/me', {
      headers: { 'Authorization': 'Bearer ' + AUTH.token }
    });
    if (res.ok) {
      const data = await res.json();
      if (data) {
        AUTH.user = data;
        localStorage.setItem('tb_user', JSON.stringify(data));
        applyLoggedIn();
      }
    } else {
      // Token geçersiz
      AUTH = { token: null, user: null };
      localStorage.removeItem('tb_token');
      localStorage.removeItem('tb_user');
      applyLoggedOut();
    }
  } catch (e) {
    // Sunucuya ulaşılamıyor, mevcut state'i koru
    console.warn('Auth check failed:', e.message);
  }
}

/* ═══════════════════════════════════════
   PASSWORD STRENGTH INDICATOR
═══════════════════════════════════════ */
function updateStrength(pw) {
  const fill = document.getElementById('str-fill');
  const lbl = document.getElementById('str-lbl');
  if (!fill || !lbl) return;
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { w: '0%', c: 'var(--t3)', t: '' },
    { w: '20%', c: 'var(--red)', t: 'Çok Zayıf' },
    { w: '40%', c: 'var(--red)', t: 'Zayıf' },
    { w: '60%', c: 'var(--amber)', t: 'Orta' },
    { w: '80%', c: 'var(--green)', t: 'Güçlü' },
    { w: '100%', c: 'var(--green)', t: 'Çok Güçlü' }
  ];
  const l = levels[score];
  fill.style.width = l.w;
  fill.style.background = l.c;
  lbl.textContent = l.t;
  lbl.style.color = l.c;
}


/* ═══════════════════════════════════════
   OTT INDICATOR INTEGRATION
═══════════════════════════════════════ */
let ottUpdateInterval = null;

function updateOTTScreenData(data) {
  try {
    const ottValEl = document.getElementById('bp-ott-val');
    const mavgValEl = document.getElementById('bp-mavg-val');
    const farkValEl = document.getElementById('bp-fark-val');
    const lastUpdateEl = document.getElementById('bp-last-update');

    if (ottValEl) ottValEl.textContent = '$' + data.current.ott.toFixed(2);
    if (mavgValEl) mavgValEl.textContent = '$' + data.current.mavg.toFixed(2);
    if (farkValEl) {
      const fark = Math.abs(data.current.price - data.current.ott);
      const farkPct = (fark / data.current.price) * 100;
      farkValEl.textContent = '$' + fark.toFixed(2) + ' (' + farkPct.toFixed(2) + '%)';
      farkValEl.style.color = data.current.price > data.current.ott ? 'var(--green)' : 'var(--red)';
    }
    if (lastUpdateEl) lastUpdateEl.textContent = new Date().toLocaleTimeString('tr-TR');

    const trendEl = document.getElementById('bp-trend');
    const trendSubEl = document.getElementById('bp-trend-sub');
    if (trendEl && trendSubEl) {
      trendEl.textContent = data.current.trend === 'BULLISH' ? '📈 YUKARI' : '📉 AŞAĞI';
      trendEl.style.color = data.current.trend === 'BULLISH' ? 'var(--green)' : 'var(--red)';
      trendSubEl.textContent = data.current.trend === 'BULLISH' ? 'Boğa trendi' : 'Ayı trendi';
    }

    const signalEl = document.getElementById('bp-ott-signal');
    const signalSubEl = document.getElementById('bp-ott-signal-sub');
    if (signalEl && signalSubEl && data.signals && data.signals.length > 0) {
      const lastSig = data.signals[data.signals.length - 1];
      signalEl.textContent = lastSig.type === 'BUY' ? '🟢 LONG' : '🔴 SHORT';
      signalEl.style.color = lastSig.type === 'BUY' ? 'var(--green)' : 'var(--red)';
      signalSubEl.textContent = lastSig.source === 'OTT_COLOR' ? 'OTT renk değişimi' : 'Support kesişimi';
    } else if (signalEl && signalSubEl) {
      signalEl.textContent = '⚪ NEUTRAL';
      signalEl.style.color = 'var(--amber)';
      signalSubEl.textContent = 'Sinyal bekleniyor';
    }

    const signalsBody = document.getElementById('bp-signals-body');
    const sigCount = document.getElementById('bp-sig-count');
    if (signalsBody) {
      if (data.signals && data.signals.length > 0) {
        const prevScroll = signalsBody.scrollTop;
        const signals = data.signals.slice(-30).reverse(); // order book gibi olması için limiti artırdık
        signalsBody.innerHTML = signals.map(sig => {
          const typeColor = sig.type === 'BUY' ? 'var(--green)' : 'var(--red)';
          const bgHover = sig.type === 'BUY' ? 'rgba(0,230,118,0.05)' : 'rgba(255,23,68,0.05)';
          const sourceText = sig.source === 'OTT_COLOR' ? 'OTT Renk' : 'Support';
          const sigDate = sig.time ? new Date(sig.time * 1000) : new Date();
          const timestr = sigDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
          const datestr = sigDate.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });
          return `<div class="bp-sig-row" style="display:grid;grid-template-columns:auto 1fr auto;cursor:pointer;transition:background 0.2s" onmouseover="this.style.background='${bgHover}'" onmouseout="this.style.background='transparent'">
              <div style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.05);font-family:var(--mono);font-size:11px;color:rgba(255,255,255,0.5)">
                ${datestr} ${timestr}<br><span style="font-size:9px;color:rgba(255,255,255,0.3)">${sourceText}</span>
              </div>
              <div style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;">
                <span style="color:${typeColor};font-weight:700;font-size:11px;display:inline-block;padding:3px 8px;background:${bgHover};border:1px solid ${typeColor}40;border-radius:4px">${sig.type}</span>
              </div>
              <div style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.05);text-align:right;font-family:var(--mono);font-size:12px;color:var(--t2);display:flex;align-items:center;justify-content:flex-end;">
                $${sig.price.toFixed(2)}
              </div>
            </div>`;
        }).join('');
        signalsBody.scrollTop = prevScroll;
      } else {
        signalsBody.innerHTML = `<div style="padding:32px 16px;text-align:center;color:#8492a6;font-size:12px;font-style:italic">Henüz güncel sinyal verisi bulunmuyor</div>`;
      }
    }
    if (sigCount) sigCount.textContent = `${data.signals ? data.signals.length : 0} sinyal geçmişi`;
  } catch (e) { console.error('Screen data parse error', e); }
}

async function sendManualSignal(type) {
  const symEl = document.getElementById('bp-symbol');
  if (!symEl) return;
  const symbol = symEl.value;
  try {
    const res = await fetch(API + '/bot/force_signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (AUTH.token || '') },
      body: JSON.stringify({ signal: type, symbol: symbol })
    });
    if (res.ok) {
      showToast('success', `${type} sinyali gönderildi: ${symbol}`);
      addToSimFeed(type, symbol);
    } else { showToast('error', 'Sinyal gönderilemedi'); }
  } catch (e) { showToast('error', 'Bağlantı hatası'); }
}

function addToSimFeed(type, symbol) {
  const feed = document.getElementById('sim-feed');
  if (!feed) return;
  const time = new Date().toLocaleTimeString('tr-TR');
  const color = type === 'BUY' ? 'var(--green)' : 'var(--red)';
  const icon = type === 'BUY' ? '▲' : '▼';
  const bg = type === 'BUY' ? 'rgba(255,255,255,0.08)' : 'rgba(136,136,136,0.08)';
  const item = document.createElement('div');
  item.style.cssText = `padding:12px 16px;border-bottom:1px solid var(--b1);background:${bg};animation:fadeIn 0.3s`;
  item.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
      <span style="font-weight:700;color:${color};font-size:13px">${icon} ${type}</span>
      <span style="font-family:var(--mono);font-size:10px;color:var(--t3)">${time}</span>
    </div><div style="font-size:11px;color:var(--t2)">${symbol}</div><div style="font-size:10px;color:var(--t3);margin-top:2px">Manuel sinyal</div>`;
  feed.insertBefore(item, feed.firstChild);
  while (feed.children.length > 50) { feed.removeChild(feed.lastChild); }
  const liveDot = document.getElementById('feed-live-dot');
  const liveTxt = document.getElementById('feed-live-txt');
  if (liveDot) { liveDot.style.background = 'var(--green)'; liveDot.style.animation = 'pulse 2s infinite'; }
  if (liveTxt) liveTxt.textContent = 'Canlı';
}

function startOTTUpdates() {
  if (ottUpdateInterval) clearInterval(ottUpdateInterval);

  if (document.getElementById('tb-bot-chart')) {
    tbBotLoadChart(true);
    ottUpdateInterval = setInterval(() => {
      if (document.getElementById('dash-botpanel')?.style.display !== 'none') {
        if (!document.hidden) tbBotLoadChart(false);
      }
    }, 10000);
    return;
  }

  bpLoadChart(true);
  ottUpdateInterval = setInterval(() => {
    if (document.getElementById('dash-botpanel')?.style.display !== 'none') {
        if (!document.hidden) bpLoadChart(false);
    }
  }, 5000);
}

const originalSwitchDash = switchDash;
switchDash = function (sub) {
  originalSwitchDash(sub);
  if (sub === 'botpanel') {
    setTimeout(startOTTUpdates, 500);
  } else if (ottUpdateInterval) {
    clearInterval(ottUpdateInterval);
    ottUpdateInterval = null;
  }
};

window.addEventListener('load', () => {
  if (window.location.pathname === '/dashboard' && (window.location.hash === '#botpanel' || !window.location.hash)) {
    setTimeout(startOTTUpdates, 1000);
  }
});

/* ═══════════════════════════════════════
   BINANCE DEMO TRADING INTEGRATION
═══════════════════════════════════════ */

// ─── API Key Yönetimi ───────────────────

async function saveApiKeys() {
  const apiKey = document.getElementById('api-key-input').value.trim();
  const apiSecret = document.getElementById('api-secret-input').value.trim();
  if (!apiKey || !apiSecret) { showToast('error', 'API Key ve Secret zorunludur'); return; }

  const btn = document.getElementById('api-save-btn');
  btn.textContent = 'Kaydediliyor...'; btn.disabled = true;
  try {
    const res = await fetch(API + '/trading/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AUTH.token },
      body: JSON.stringify({ api_key: apiKey, api_secret: apiSecret })
    });
    const data = await res.json();
    if (!res.ok) { showToast('error', data.error || 'Kayıt başarısız'); return; }
    showToast('success', 'API anahtarları kaydedildi ✓');
    document.getElementById('api-key-input').value = '';
    document.getElementById('api-secret-input').value = '';
    loadApiKeyStatus();
    // Otomatik test
    setTimeout(testApiConnection, 500);
  } catch (e) { showToast('error', 'Bağlantı hatası'); }
  finally { btn.textContent = '💾 Kaydet ve Doğrula'; btn.disabled = false; }
}

async function testApiConnection() {
  showToast('info', 'Bağlantı test ediliyor...');
  try {
    const res = await fetch(API + '/trading/keys/test', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + AUTH.token }
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast('success', 'Binance Demo API bağlantısı başarılı ✓');
      _setApiConnected(true);
    } else {
      showToast('error', data.error || 'Bağlantı başarısız');
      _setApiConnected(false, data.error);
    }
  } catch (e) { showToast('error', 'Bağlantı test edilemedi'); }
}

async function deleteApiKeys() {
  if (!confirm('API anahtarlarınızı silmek istediğinizden emin misiniz?')) return;
  try {
    await fetch(API + '/trading/keys', {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + AUTH.token }
    });
    showToast('info', 'API anahtarları silindi');
    _setApiConnected(false, 'API anahtarı kaydedilmemiş');
  } catch (e) { showToast('error', 'Silme hatası'); }
}

async function loadApiKeyStatus() {
  try {
    const res = await fetch(API + '/trading/keys', {
      headers: { 'Authorization': 'Bearer ' + AUTH.token }
    });
    const data = await res.json();
    if (data.connected) {
      const actions = document.getElementById('api-conn-actions');
      if (actions) actions.style.display = 'flex';
      if (data.is_valid) {
        _setApiConnected(true, data.key_hint);
      } else {
        _setApiConnected(false, 'Key kayıtlı: ' + data.key_hint + ' — test edilmedi');
        const actions2 = document.getElementById('api-conn-actions');
        if (actions2) actions2.style.display = 'flex';
      }
    } else {
      _setApiConnected(false, 'API anahtarı kaydedilmemiş');
    }
  } catch (e) { }
}

function _setApiConnected(ok, hint) {
  const dot = document.getElementById('api-conn-dot');
  const txt = document.getElementById('api-conn-text');
  const hnt = document.getElementById('api-conn-hint');
  const actions = document.getElementById('api-conn-actions');
  if (dot) {
    dot.style.background = ok ? 'var(--green)' : 'var(--red)';
    dot.style.boxShadow = ok ? '0 0 8px rgba(255,255,255,0.5)' : '0 0 8px rgba(136,136,136,0.5)';
  }
  if (txt) txt.textContent = ok ? 'Bağlı ✓' : 'Bağlı Değil';
  if (hnt) hnt.textContent = hint || (ok ? 'Demo Trading aktif' : 'API anahtarı kaydedilmemiş');
  if (actions) actions.style.display = ok ? 'flex' : (hint && hint.includes('Key kayıtlı') ? 'flex' : 'none');
  // Portföy kartındaki API durumu
  const pfStatus = document.getElementById('pf-api-status');
  if (pfStatus) { pfStatus.textContent = ok ? 'Aktif' : 'Bağlı Değil'; pfStatus.style.color = ok ? 'var(--green)' : 'var(--red)'; }
}

// ─── Portföy ────────────────────────────

let _portfolioTimerOLD = null; // ESKİ - ARTIK KULLANILMIYOR

async function loadPortfolioOLD() {
  // ESKİ FONKSİYON - ARTIK KULLANILMIYOR
  // Yeni fonksiyon portfolio.js'de
  console.warn('loadPortfolioOLD called - this function is deprecated');
  return;
  
  if (!AUTH.token) return;
  try {
    // Bakiyeleri yükle
    const balRes = await fetch(API + '/trading/balance', {
      headers: { 'Authorization': 'Bearer ' + AUTH.token }
    });
    const balData = await balRes.json();

    if (balRes.ok && balData.balances) {
      _renderBalances(balData.balances);
      _setApiConnected(true);
    } else {
      const tbody = document.getElementById('pf-balances-body');
      if (tbody) tbody.innerHTML = `<tr><td colspan="4" style="padding:40px;text-align:center;color:var(--t3)">${balData.error || 'API anahtarını bağlayın'}</td></tr>`;
      const ct = document.getElementById('pf-total-usdt');
      if (ct) ct.textContent = '—';
      const pfApiSt = document.getElementById('pf-api-status');
      if (pfApiSt) { pfApiSt.textContent = 'Bağlı Değil'; pfApiSt.style.color = 'var(--red)'; }
    }

    // Açık emirleri yükle
    loadOpenOrders();
    // İşlem geçmişini yükle
    loadTradeHistory();

    // Son güncelleme
    const upd = document.getElementById('pf-last-update');
    if (upd) upd.textContent = 'Son: ' + new Date().toLocaleTimeString('tr-TR');
  } catch (e) {
    console.warn('Portfolio load error:', e);
  }

  // 15 saniyede otomatik güncelle
  if (_portfolioTimer) clearInterval(_portfolioTimer);
  _portfolioTimer = setInterval(() => {
    if (document.getElementById('dash-portfolio')?.style.display !== 'none') {
      if (_currentPfTab === 'spot') {
        loadPortfolio();
      } else {
        loadFuturesData();
      }
    } else {
      clearInterval(_portfolioTimer);
      _portfolioTimer = null;
    }
  }, 15000);
}

function _renderBalances(balances) {
  const tbody = document.getElementById('pf-balances-body');
  if (!tbody) return;

  // USDT bakiyesi
  const usdt = balances.find(b => b.asset === 'USDT');
  const totalUsdt = usdt ? usdt.total : 0;
  const ct = document.getElementById('pf-total-usdt');
  if (ct) ct.textContent = '$' + totalUsdt.toLocaleString('en-US', { maximumFractionDigits: 2 });
  const ac = document.getElementById('pf-asset-count');
  if (ac) ac.textContent = balances.length;

  // Tabloyu çiz
  if (!balances.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="padding:40px;text-align:center;color:var(--t3)">Varlık bulunamadı</td></tr>';
    return;
  }

  tbody.innerHTML = balances.map(b => {
    const isUsdt = b.asset === 'USDT';
    return `<tr style="border-bottom:1px solid rgba(255,255,255,0.03)">
      <td style="padding:10px 16px;font-weight:600;color:${isUsdt ? 'var(--green)' : '#fff'}">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:24px;height:24px;border-radius:12px;background:${isUsdt ? 'rgba(255,255,255,.15)' : 'rgba(68,138,255,.15)'};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:${isUsdt ? 'var(--green)' : '#448aff'}">${b.asset.slice(0, 3)}</div>
          ${b.asset}
        </div>
      </td>
      <td style="padding:10px 16px;text-align:right;font-family:var(--mono);font-size:13px">${b.free.toLocaleString('en-US', { maximumFractionDigits: 8 })}</td>
      <td style="padding:10px 16px;text-align:right;font-family:var(--mono);font-size:13px;color:${b.locked > 0 ? 'var(--amber)' : 'var(--t3)'}">${b.locked.toLocaleString('en-US', { maximumFractionDigits: 8 })}</td>
      <td style="padding:10px 16px;text-align:right;font-family:var(--mono);font-size:13px;font-weight:600">${b.total.toLocaleString('en-US', { maximumFractionDigits: 8 })}</td>
    </tr>`;
  }).join('');
}

// ─── Açık Emirler ───────────────────────

async function loadOpenOrders() {
  try {
    const res = await fetch(API + '/trading/orders/open', {
      headers: { 'Authorization': 'Bearer ' + AUTH.token }
    });
    const data = await res.json();
    const tbody = document.getElementById('pf-open-orders-body');
    const countEl = document.getElementById('pf-open-count');
    if (!res.ok || !data.orders) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="padding:30px;text-align:center;color:var(--t3)">—</td></tr>';
      if (countEl) countEl.textContent = '0';
      return;
    }
    if (countEl) countEl.textContent = data.orders.length;
    if (!data.orders.length) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="padding:30px;text-align:center;color:var(--t3)">Açık emir yok</td></tr>';
      return;
    }
    if (tbody) {
      tbody.innerHTML = data.orders.map(o => {
        const isBuy = o.side === 'BUY';
        const symbolJs = JSON.stringify(o.symbol);
        const orderIdJs = JSON.stringify(String(o.orderId));
        return `<tr style="border-bottom:1px solid rgba(255,255,255,0.03)">
          <td style="padding:8px 12px;font-family:var(--mono);font-size:12px">${o.symbol}</td>
          <td style="padding:8px 12px;text-align:center"><span style="color:${isBuy ? 'var(--green)' : 'var(--red)'};font-weight:700;font-size:11px">${o.side}</span></td>
          <td style="padding:8px 12px;text-align:right;font-family:var(--mono);font-size:12px">${parseFloat(o.price).toLocaleString('en-US')}</td>
          <td style="padding:8px 12px;text-align:right;font-family:var(--mono);font-size:12px">${parseFloat(o.origQty)}</td>
          <td style="padding:8px 12px;text-align:center"><button onclick="cancelOpenOrder(${symbolJs},${orderIdJs})" style="background:rgba(136,136,136,.1);border:1px solid rgba(136,136,136,.2);color:var(--red);font-size:10px;padding:4px 10px;border-radius:6px;cursor:pointer">✕</button></td>
        </tr>`;
      }).join('');
    }
  } catch (e) { }
}

async function cancelOpenOrder(symbol, orderId) {
  if (!confirm(`${symbol} emrini iptal etmek istediğinizden emin misiniz?`)) return;
  try {
    const res = await fetch(API + '/trading/order', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AUTH.token },
      body: JSON.stringify({ symbol, orderId })
    });
    const data = await res.json();
    if (res.ok) { showToast('success', 'Emir iptal edildi'); loadOpenOrders(); loadPortfolio(); }
    else showToast('error', data.error || 'İptal başarısız');
  } catch (e) { showToast('error', 'İptal hatası'); }
}

// ─── İşlem Geçmişi ──────────────────────

async function loadTradeHistory() {
  const symEl = document.getElementById('pf-trades-symbol');
  const symbol = symEl ? symEl.value : 'BTCUSDT';
  try {
    const res = await fetch(API + `/trading/trades?symbol=${symbol}&limit=50`, {
      headers: { 'Authorization': 'Bearer ' + AUTH.token }
    });
    const data = await res.json();
    const tbody = document.getElementById('pf-trades-body');
    if (!res.ok || !data.trades) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="padding:30px;text-align:center;color:var(--t3)">—</td></tr>';
      return;
    }
    if (!data.trades.length) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="padding:30px;text-align:center;color:var(--t3)">İşlem bulunamadı</td></tr>';
      return;
    }
    if (tbody) {
      tbody.innerHTML = data.trades.slice().reverse().map(t => {
        const isBuy = t.isBuyer;
        const price = parseFloat(t.price);
        const qty = parseFloat(t.qty);
        const total = price * qty;
        const date = new Date(t.time).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        return `<tr style="border-bottom:1px solid rgba(255,255,255,0.03)">
          <td style="padding:8px 16px;font-family:var(--mono);font-size:11px;color:var(--t3)">${date}</td>
          <td style="padding:8px 16px;font-family:var(--mono);font-size:12px">${t.symbol}</td>
          <td style="padding:8px 16px;text-align:center"><span style="display:inline-block;padding:2px 10px;border-radius:4px;font-size:10px;font-weight:700;background:${isBuy ? 'rgba(255,255,255,.12)' : 'rgba(136,136,136,.12)'};color:${isBuy ? 'var(--green)' : 'var(--red)'}">${isBuy ? 'BUY' : 'SELL'}</span></td>
          <td style="padding:8px 16px;text-align:right;font-family:var(--mono);font-size:12px">${fmtPrice(price)}</td>
          <td style="padding:8px 16px;text-align:right;font-family:var(--mono);font-size:12px">${qty}</td>
          <td style="padding:8px 16px;text-align:right;font-family:var(--mono);font-size:12px;font-weight:600">$${total.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
        </tr>`;
      }).join('');
    }
  } catch (e) { }
}

// ─── Hızlı Emir Gönderme ────────────────

async function quickOrder(side) {
  const symbol = document.getElementById('pf-order-symbol')?.value || 'BTCUSDT';
  const amount = parseFloat(document.getElementById('pf-order-amount')?.value || 100);
  if (!amount || amount < 10) { showToast('error', 'Minimum 10 USDT'); return; }

  const confirmMsg = side === 'BUY'
    ? `${symbol} için $${amount} USDT tutarında MARKET BUY emri göndermek istiyor musunuz?`
    : `${symbol} varlığınızdan MARKET SELL emri göndermek istiyor musunuz?`;
  if (!confirm(confirmMsg)) return;

  showToast('info', 'Emir gönderiliyor...');
  try {
    const body = { symbol, side, type: 'MARKET' };
    if (side === 'BUY') {
      body.quoteOrderQty = amount;
    } else {
      // SELL için önce bakiyeden miktarı al
      const balRes = await fetch(API + '/trading/balance', { headers: { 'Authorization': 'Bearer ' + AUTH.token } });
      const balData = await balRes.json();
      if (balRes.ok && balData.balances) {
        const asset = symbol.replace('USDT', '');
        const bal = balData.balances.find(b => b.asset === asset);
        if (!bal || bal.free <= 0) { showToast('error', `${asset} bakiyeniz yok`); return; }
        body.quantity = bal.free;
      } else { showToast('error', 'Bakiye alınamadı'); return; }
    }

    const res = await fetch(API + '/trading/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AUTH.token },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      showToast('success', `${side} emri başarıyla gönderildi ✓`);
      setTimeout(loadPortfolio, 1000);
    } else {
      showToast('error', data.error || 'Emir gönderilemedi');
    }
  } catch (e) { showToast('error', 'Emir gönderme hatası'); }
}

// ─── Bot Paneli Manuel Sinyal → Gerçek Emir ───

async function sendManualSignal(side) {
  const symbol = document.getElementById('bp-symbol')?.value || 'BTCUSDT';
  // API key durumunu kontrol et
  try {
    const keyRes = await fetch(API + '/trading/keys', { headers: { 'Authorization': 'Bearer ' + AUTH.token } });
    const keyData = await keyRes.json();
    if (!keyData.connected || !keyData.is_valid) {
      showToast('error', 'Önce API anahtarınızı bağlayın (API Ayarları)');
      return;
    }
  } catch (e) { }

  const amount = 50; // Bot panelinden varsayılan $50 USDT
  if (!confirm(`${side} ${symbol} — Demo Trading üzerinde $${amount} USDT ile MARKET emir gönderilecek. Onaylıyor musunuz?`)) return;

  showToast('info', `${side} emri gönderiliyor...`);
  try {
    const body = { symbol, side, type: 'MARKET' };
    if (side === 'BUY') {
      body.quoteOrderQty = amount;
    } else {
      const balRes = await fetch(API + '/trading/balance', { headers: { 'Authorization': 'Bearer ' + AUTH.token } });
      const balData = await balRes.json();
      if (balRes.ok && balData.balances) {
        const asset = symbol.replace('USDT', '');
        const bal = balData.balances.find(b => b.asset === asset);
        if (!bal || bal.free <= 0) { showToast('error', `${asset} bakiyeniz yok`); return; }
        body.quantity = bal.free;
      } else { showToast('error', 'Bakiye alınamadı'); return; }
    }

    const res = await fetch(API + '/trading/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AUTH.token },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      showToast('success', `${side} emri gönderildi ✓ — #${data.order?.orderId || '?'}`);
      // Sinyal feed'e ekle
      _addSignalToFeed(side, symbol, data.order);
    } else {
      showToast('error', data.error || 'Emir gönderilemedi');
    }
  } catch (e) { showToast('error', 'Emir gönderme hatası'); }
}

function _addSignalToFeed(side, symbol, order) {
  const feed = document.getElementById('bp-signals-body');
  if (!feed) return;
  const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const isBuy = side === 'BUY';
  const price = order?.fills?.[0]?.price || order?.price || '—';
  const row = `<div style="display:grid;grid-template-columns:auto 1fr auto auto;gap:0;border-bottom:1px solid rgba(255,255,255,0.03)">
    <div style="padding:10px 16px;font-family:var(--mono);font-size:11px;color:var(--t3)">${time}</div>
    <div style="padding:10px 16px;display:flex;align-items:center;gap:6px">
      <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:${isBuy ? 'rgba(255,255,255,.15)' : 'rgba(136,136,136,.15)'};color:${isBuy ? 'var(--green)' : 'var(--red)'}">${side}</span>
      <span style="font-size:12px;font-weight:600">${symbol}</span>
    </div>
    <div style="padding:10px 16px;text-align:right;font-family:var(--mono);font-size:12px">${typeof price === 'number' ? fmtPrice(price) : price}</div>
    <div style="padding:10px 16px;text-align:right;font-size:10px;color:var(--t3)">Demo API</div>
  </div>`;
  feed.insertAdjacentHTML('afterbegin', row);
  // Sinyal sayısını güncelle
  const cnt = document.getElementById('bp-sig-count');
  if (cnt) { const n = parseInt(cnt.textContent) || 0; cnt.textContent = (n + 1) + ' sinyal'; }
}

/* ═══════════════════════════════════════
   FUTURES TRADING (VADELİ İŞLEMLER)
═══════════════════════════════════════ */

let _currentPfTab = 'spot';

function switchPortfolioTab(tab) {
  _currentPfTab = tab;

  // Buton stilleri
  const btnSpot = document.getElementById('btn-pf-spot');
  const btnFut = document.getElementById('btn-pf-futures');

  if (tab === 'spot') {
    btnSpot.style.background = 'rgba(255,193,7,.2)';
    btnSpot.style.border = '1px solid rgba(255,193,7,.4)';
    btnSpot.style.color = 'var(--yellow)';

    btnFut.style.background = 'transparent';
    btnFut.style.border = '1px solid transparent';
    btnFut.style.color = 'var(--t3)';

    document.getElementById('pf-spot-view').style.display = 'block';
    document.getElementById('pf-futures-view').style.display = 'none';
  } else {
    btnFut.style.background = 'rgba(170,0,255,.2)';
    btnFut.style.border = '1px solid rgba(170,0,255,.4)';
    btnFut.style.color = 'var(--purple)';

    btnSpot.style.background = 'transparent';
    btnSpot.style.border = '1px solid transparent';
    btnSpot.style.color = 'var(--t3)';

    document.getElementById('pf-spot-view').style.display = 'none';
    document.getElementById('pf-futures-view').style.display = 'block';

    loadFuturesData();
  }
}

async function loadFuturesData() {
  if (!AUTH.token) return;

  // 1. Bakiyeler
  try {
    const res = await fetch(API + '/trading/futures/balance', { headers: { 'Authorization': 'Bearer ' + AUTH.token } });
    const data = await res.json();
    const tbody = document.getElementById('pf-fut-balances-body');
    if (res.ok && data.balances && data.balances.length) {
      tbody.innerHTML = data.balances.map(b => {
        const isUsdt = b.asset === 'USDT';
        const pnlCol = b.crossUnPnl > 0 ? 'var(--green)' : (b.crossUnPnl < 0 ? 'var(--red)' : 'var(--t3)');
        return `<tr style="border-bottom:1px solid rgba(255,255,255,0.03)">
          <td style="padding:10px 16px;font-weight:600;color:${isUsdt ? 'var(--green)' : '#fff'}">${b.asset}</td>
          <td style="padding:10px 16px;text-align:right;font-family:var(--mono);font-size:13px">${parseFloat(b.balance).toFixed(4)}</td>
          <td style="padding:10px 16px;text-align:right;font-family:var(--mono);font-size:13px;color:${pnlCol};font-weight:700">
            ${b.crossUnPnl > 0 ? '+' : (b.crossUnPnl < 0 ? '-' : '')}${Math.abs(parseFloat(b.crossUnPnl)).toFixed(4)}
          </td>
        </tr>`;
      }).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="3" style="padding:30px;text-align:center;color:var(--red)">${data.error || 'Vadeli bakiye yok (Futures Testnet API Key gerekli)'}</td></tr>`;
    }
  } catch (e) { }

  // 2. Pozisyonlar
  try {
    const res = await fetch(API + '/trading/futures/positions', { headers: { 'Authorization': 'Bearer ' + AUTH.token } });
    const data = await res.json();
    const tbody = document.getElementById('pf-fut-positions-body');
    if (res.ok && data.positions && data.positions.length) {
      tbody.innerHTML = data.positions.map(p => {
        const isLong = p.side === 'LONG';
        const pnlCol = p.unrealizedPnl > 0 ? 'var(--green)' : (p.unrealizedPnl < 0 ? 'var(--red)' : 'var(--t3)');
        return `<tr style="border-bottom:1px solid rgba(255,255,255,0.03)">
          <td style="padding:8px 12px;font-family:var(--mono);font-size:12px;font-weight:700">
            ${p.symbol} <span style="font-size:9px;color:var(--t3);font-weight:400">${p.leverage}x</span>
          </td>
          <td style="padding:8px 12px;text-align:center">
            <span style="color:${isLong ? 'var(--green)' : 'var(--red)'};font-weight:700;font-size:11px">${p.side}</span>
          </td>
          <td style="padding:8px 12px;text-align:right;font-family:var(--mono);font-size:12px">${p.positionAmt}</td>
          <td style="padding:8px 12px;text-align:right;font-family:var(--mono);font-size:12px">
            <div>${parseFloat(p.entryPrice).toFixed(4)}</div>
            <div style="font-size:10px;color:var(--t3)">${parseFloat(p.markPrice).toFixed(4)}</div>
          </td>
          <td style="padding:8px 12px;text-align:right;font-family:var(--mono);font-size:12px;color:${pnlCol};font-weight:700">
            ${parseFloat(p.unrealizedPnl).toFixed(2)} USDT
          </td>
          <td style="padding:8px 12px;text-align:center">
            <button onclick="closeFuturesPosition('${p.symbol}')" style="background:rgba(136,136,136,.1);border:1px solid rgba(136,136,136,.2);color:var(--red);font-size:10px;padding:4px 10px;border-radius:6px;cursor:pointer">Kapat</button>
          </td>
        </tr>`;
      }).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="6" style="padding:30px;text-align:center;color:var(--t3)">${data.error || 'Açık pozisyon yok'}</td></tr>`;
    }
  } catch (e) { }
}

async function applyLeverage() {
  const symbol = document.getElementById('fut-quick-symbol').value;
  const leverage = parseInt(document.getElementById('fut-quick-leverage').value);
  if (!leverage || leverage < 1 || leverage > 100) { showToast('error', 'Kaldıraç 1-100 arası olmalı'); return; }

  showToast('info', 'Kaldıraç ayarlanıyor...');
  try {
    const res = await fetch(API + '/binance/leverage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AUTH.token },
      body: JSON.stringify({ symbol, leverage })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('success', `${symbol} için kaldıraç ${leverage}x olarak ayarlandı`);
    } else {
      showToast('error', data.error || 'Ayarlanamadı');
    }
  } catch (e) {
    showToast('error', 'Hata oluştu');
  }
}

async function quickFuturesOrder(side) {
  const symbol = document.getElementById('fut-quick-symbol').value;
  const quantity = parseFloat(document.getElementById('fut-quick-amount').value);
  const leverage = parseInt(document.getElementById('fut-quick-leverage').value);

  if (!quantity || quantity <= 0) { showToast('error', 'Miktar giriniz'); return; }

  if (!confirm(`FUTURES ${side} Emri\nSembol: ${symbol}\nMiktar: ${quantity} coin\nKaldıraç: ${leverage}x\n\nOnaylıyor musunuz?`)) return;

  showToast('info', 'Futures emri gönderiliyor...');
  try {
    // 1. Önce kaldıracı kesinleştir
    await fetch(API + '/binance/leverage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AUTH.token },
      body: JSON.stringify({ symbol, leverage })
    });

    // 2. Emri gönder
    const res = await fetch(API + '/binance/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AUTH.token },
      body: JSON.stringify({ symbol, side, type: 'MARKET', quantity })
    });
    const data = await res.json();

    if (res.ok) {
      showToast('success', `Futures ${side} emri başarıyla açıldı!`);
      if (typeof loadFuturesPage === 'function') loadFuturesPage();
    } else {
      showToast('error', data.error || 'Emir açılamadı');
    }
  } catch (e) {
    showToast('error', 'Hata oluştu');
  }
}

async function closeFuturesPosition(symbol) {
  if (!confirm(`${symbol} pozisyonunu (Market) komple kapatmak istiyor musunuz?`)) return;

  showToast('info', 'Pozisyon kapatılıyor...');
  try {
    const res = await fetch(API + '/trading/futures/close-position', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AUTH.token },
      body: JSON.stringify({ symbol })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('success', `${symbol} pozisyonu başarıyla kapatıldı!`);
      loadFuturesData();
    } else {
      showToast('error', data.error || 'Pozisyon kapatılamadı');
    }
  } catch (e) {
    showToast('error', 'Kapatma hatası');
  }
}

/* ═══════════════════════════════════════
   INITIALIZATION
═══════════════════════════════════════ */
function initializeApp() {
  // Restore authentication state from localStorage
  const token = localStorage.getItem('tb_token');
  const userStr = localStorage.getItem('tb_user');
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      AUTH = { token, user };
      applyLoggedIn();
      
      // Load balance for navigation
      loadBalanceForNav();
      
      // Populate account data if on account page
      if (document.getElementById('dash-account')) {
        populateAccount();
      }
      
      // Validate token with server
      checkAuth();
    } catch (e) {
      console.error('Error parsing stored user data:', e);
      localStorage.removeItem('tb_token');
      localStorage.removeItem('tb_user');
      applyLoggedOut();
    }
  } else {
    applyLoggedOut();
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

window.forceShowAuthModal = function() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    console.log('Auth modal forced open');
  } else {
    console.error('Auth modal not found!');
  }
};

window.checkElements = function() {
  const elements = {
    authModal: document.getElementById('authModal'),
    loginBtn: document.getElementById('login-btn'),
    userPill: document.getElementById('user-pill'),
    navTabs: document.getElementById('nav-tabs'),
    dashAccount: document.getElementById('dash-account')
  };
  
  console.log('Element check:', elements);
  return elements;
};
/* ═══════════════════════════════════════
   DASHBOARD LOGIN
═══════════════════════════════════════ */


/* ═══════════════════════════════════════
   INITIALIZE APP
═══════════════════════════════════════ */
// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Start market data fetching
fetchSnapshot();
fetchFearGreed();
fetchGlobalGainersLosers();


/* ═══════════════════════════════════════
   PASSWORD CHANGE MODAL
═══════════════════════════════════════ */
function changePassword() {
  document.getElementById('passwordChangeModal').classList.add('open');
  document.body.style.overflow = 'hidden';
  // Reset form
  document.querySelectorAll('#passwordChangeModal .apanel').forEach(p => p.style.display = 'none');
  document.getElementById('pw-form').style.display = 'block';
  // Clear inputs
  document.getElementById('pw-current').value = '';
  document.getElementById('pw-new').value = '';
  document.getElementById('pw-new2').value = '';
  document.getElementById('pw-str-fill').style.width = '0%';
  document.getElementById('pw-str-lbl').textContent = '';
  document.getElementById('pw-pass-match').textContent = '';
}

function closePasswordModal() {
  document.getElementById('passwordChangeModal').classList.remove('open');
  document.body.style.overflow = '';
}

function updatePasswordStrength(pw) {
  const fill = document.getElementById('pw-str-fill');
  const lbl = document.getElementById('pw-str-lbl');
  
  if (!pw) {
    fill.style.width = '0%';
    lbl.textContent = '';
    return;
  }

  let strength = 0;
  if (pw.length >= 6) strength++;
  if (pw.length >= 8) strength++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) strength++;
  if (/\d/.test(pw)) strength++;
  if (/[^a-zA-Z0-9]/.test(pw)) strength++;

  const colors = ['#ff1744', '#ff6b35', '#ffc107', '#00e676', '#00e676'];
  const labels = ['Çok Zayıf', 'Zayıf', 'Orta', 'Güçlü', 'Çok Güçlü'];
  const widths = ['20%', '40%', '60%', '80%', '100%'];

  fill.style.width = widths[strength - 1] || '0%';
  fill.style.background = colors[strength - 1] || '#ff1744';
  lbl.textContent = labels[strength - 1] || '';
  lbl.style.color = colors[strength - 1] || '#ff1744';
}

function checkPasswordMatch() {
  const p1 = document.getElementById('pw-new').value;
  const p2 = document.getElementById('pw-new2').value;
  const hint = document.getElementById('pw-pass-match');

  if (!p2) {
    hint.textContent = '';
    return;
  }

  if (p1 === p2) {
    hint.textContent = '✓ Şifreler eşleşiyor';
    hint.style.color = 'var(--green)';
  } else {
    hint.textContent = '✗ Şifreler eşleşmiyor';
    hint.style.color = 'var(--red)';
  }
}

async function changePasswordSubmit() {
  const currentPassword = document.getElementById('pw-current').value;
  const newPassword = document.getElementById('pw-new').value;
  const newPassword2 = document.getElementById('pw-new2').value;

  if (!currentPassword) {
    showToast('error', 'Mevcut şifrenizi girin');
    return;
  }

  if (newPassword.length < 6) {
    showToast('error', 'Yeni şifre en az 6 karakter olmalıdır');
    return;
  }

  if (newPassword !== newPassword2) {
    showToast('error', 'Yeni şifreler eşleşmiyor');
    return;
  }

  const btn = document.getElementById('pw-submit-btn');
  btn.textContent = 'Değiştiriliyor...';
  btn.disabled = true;

  try {
    const res = await fetch(API + '/user/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AUTH.token
      },
      body: JSON.stringify({
        old_password: currentPassword,
        new_password: newPassword
      })
    });

    const data = await res.json();

    if (res.ok) {
      // Show success
      document.querySelectorAll('#passwordChangeModal .apanel').forEach(p => p.style.display = 'none');
      document.getElementById('pw-success').style.display = 'block';
      showToast('success', 'Şifreniz başarıyla değiştirildi');
    } else {
      showToast('error', data.error || 'Şifre değiştirilemedi');
    }
  } catch (e) {
    showToast('error', 'Bağlantı hatası');
  } finally {
    btn.textContent = 'Şifremi Değiştir';
    btn.disabled = false;
  }
}

/* ═══════════════════════════════════════
   BOT PANEL — DATA & CHART ENGINE
═══════════════════════════════════════ */
let _tbBotChart = null;
let _tbBotCandles = null;
let _tbBotOtt = null;
let _tbBotMavg = null;
let _tbBotEma = null;
let _tbBotLevelSeries = [];
let _tbBotCurrentPriceLine = null;
let _tbBotTooltipData = new Map();
let _tbBotDays = 30;
let _tbBotShowRaw = false;
let _tbBotRawMarkers = [];
let _tbBotBotMarkers = [];
let _tbBotLoading = false;
let _tbBotResizeObserver = null;

function tbBotSetText(id, value, className) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
  if (className) el.className = className;
}

function tbBotFormatPrice(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return '$' + Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function tbBotEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[ch]));
}

function tbBotTimeLabel(time) {
  const ts = typeof time === 'object' ? time.timestamp : time;
  if (!ts) return '-';
  return new Date(Number(ts) * 1000).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function tbBotSignalTimeLabel(ts) {
  if (!ts) return '-';
  return new Date(Number(ts) * 1000).toLocaleString('tr-TR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function tbBotSyncPanelCopy(lastSignal, trend, rawSignal) {
  const chartCard = document.querySelector('#botpanel-admin .tb-chart-card');
  const chartTitle = chartCard?.querySelector('.tb-card-title');
  const chartSub = chartCard?.querySelector('.tb-card-sub');
  const base = tbBotSymbolBase(tbBotGetSelectedSymbol());
  if (chartTitle) chartTitle.textContent = `${base}/USDT Grafik`;
  if (chartSub) chartSub.textContent = '15m kapanis + OTT + 1h EMA 200 trend filtresi';

  const decisionRows = document.querySelectorAll('#botpanel-admin .tb-side-stack .tb-card:nth-child(2) .tb-data-row');
  const rawClass = rawSignal === 'BUY' ? 'tb-data-v green' : rawSignal === 'SELL' ? 'tb-data-v red' : 'tb-data-v muted';
  const trendClass = trend === 'BULLISH' ? 'tb-data-v green' : trend === 'BEARISH' ? 'tb-data-v red' : 'tb-data-v muted';
  const trendText = trend === 'BULLISH' ? 'Bullish' : trend === 'BEARISH' ? 'Bearish' : 'Bekleniyor';

  if (decisionRows[0]) {
    decisionRows[0].querySelector('.tb-data-k').textContent = 'OTT Sinyali';
    const value = decisionRows[0].querySelector('.tb-data-v');
    value.textContent = rawSignal || 'Bekleniyor';
    value.className = rawClass;
  }
  if (decisionRows[1]) {
    decisionRows[1].querySelector('.tb-data-k').textContent = '1h EMA 200';
    const value = decisionRows[1].querySelector('.tb-data-v');
    value.textContent = trendText;
    value.className = trendClass;
  }
  if (decisionRows[2]) {
    decisionRows[2].querySelector('.tb-data-k').textContent = 'Mum Kapanisi';
    const value = decisionRows[2].querySelector('.tb-data-v');
    value.textContent = 'Onayli';
    value.className = 'tb-data-v green';
  }
}

function tbBotEnsureOverlays(container) {
  if (!container.querySelector('.tb-hover-tooltip')) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tb-hover-tooltip';
    tooltip.style.display = 'none';
    container.appendChild(tooltip);
  }
  if (!container.querySelector('.tb-price-label-layer')) {
    const labelLayer = document.createElement('div');
    labelLayer.className = 'tb-price-label-layer';
    container.appendChild(labelLayer);
  }
}

function tbBotBindRangeControls() {
  document.querySelectorAll('#botpanel-admin .tb-tf[data-tb-days]').forEach(btn => {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      const nextDays = Number(btn.dataset.tbDays || 30);
      if (!nextDays || nextDays === _tbBotDays) return;
      _tbBotDays = nextDays;
      document.querySelectorAll('#botpanel-admin .tb-tf[data-tb-days]').forEach(item => item.classList.remove('active'));
      btn.classList.add('active');
      tbBotSetText('tb-chart-range-chip', `Range: ${nextDays}G`);
      tbBotLoadChart(true);
    });
  });
}

function tbBotApplyMarkers() {
  if (!_tbBotCandles) return;
  const markers = _tbBotShowRaw
    ? [..._tbBotRawMarkers, ..._tbBotBotMarkers]
    : [..._tbBotBotMarkers];
  _tbBotCandles.setMarkers(markers.sort((a, b) => a.time - b.time));
}

function tbBotBindLayerToggles() {
  document.querySelectorAll('#botpanel-admin .tb-legend-toggle[data-tb-layer="raw"]').forEach(btn => {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.classList.toggle('active', _tbBotShowRaw);
    btn.addEventListener('click', () => {
      _tbBotShowRaw = !_tbBotShowRaw;
      btn.classList.toggle('active', _tbBotShowRaw);
      tbBotApplyMarkers();
    });
  });
}

function tbBotUpdatePriceLabels(current) {
  const container = document.getElementById('tb-bot-chart');
  const layer = container?.querySelector('.tb-price-label-layer');
  if (!container || !layer || !_tbBotCandles || !_tbBotOtt || !_tbBotMavg || !_tbBotEma) return;

  const items = [
    { key: 'price', title: 'PRICE', value: current.price, color: '#00e676', series: _tbBotCandles },
    { key: 'ott', title: 'OTT', value: current.ott, color: '#f59e0b', series: _tbBotOtt },
    { key: 'mavg', title: 'MAvg', value: current.mavg, color: '#6ee7f9', series: _tbBotMavg },
    { key: 'ema', title: '1H EMA 200', value: current.ema200, color: '#38bdf8', series: _tbBotEma },
  ].filter(item => item.value !== null && item.value !== undefined && !Number.isNaN(Number(item.value)))
    .map(item => ({ ...item, coordinate: item.series.priceToCoordinate(Number(item.value)) }))
    .filter(item => item.coordinate !== null && item.coordinate !== undefined)
    .sort((a, b) => a.coordinate - b.coordinate);

  const placed = [];
  layer.innerHTML = '';
  items.forEach(item => {
    let top = item.coordinate;
    for (const used of placed) {
      if (Math.abs(top - used) < 24) top = used + 24;
    }
    placed.push(top);

    const tag = document.createElement('div');
    tag.className = 'tb-price-tag tb-price-tag-' + item.key;
    tag.style.top = `${Math.max(6, Math.min(container.clientHeight - 24, top - 10))}px`;
    tag.style.borderColor = item.color;
    tag.style.color = item.color;
    tag.innerHTML = `<span>${item.title}</span><b>${Number(item.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>`;
    layer.appendChild(tag);
  });
}

function tbBotBuildTooltip(param) {
  const container = document.getElementById('tb-bot-chart');
  const tooltip = container?.querySelector('.tb-hover-tooltip');
  if (!container || !tooltip) return;
  if (!param || !param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
    tooltip.style.display = 'none';
    return;
  }

  const timeKey = String(typeof param.time === 'object' ? param.time.timestamp : param.time);
  const meta = _tbBotTooltipData.get(timeKey) || {};
  const candle = param.seriesPrices?.get ? param.seriesPrices.get(_tbBotCandles) : null;
  if (!candle) {
    tooltip.style.display = 'none';
    return;
  }

  const rows = [
    ['Time', tbBotTimeLabel(param.time)],
    ['Open', tbBotFormatPrice(candle.open)],
    ['High', tbBotFormatPrice(candle.high)],
    ['Low', tbBotFormatPrice(candle.low)],
    ['Close', tbBotFormatPrice(candle.close)],
    ['OTT', tbBotFormatPrice(meta.ott)],
    ['MAvg / VAR', tbBotFormatPrice(meta.mavg)],
    ['1H EMA 200', tbBotFormatPrice(meta.ema200)],
    ['OTT Raw Signal', meta.raw_signal || 'None'],
    ['Bot Signal', meta.bot_signal || (meta.raw_signal ? 'Filtered' : 'None')],
    ['Trend', meta.trend || 'Bekleniyor'],
    ['Bot Karari', meta.bot_signal ? 'Islem Acilabilir' : (meta.raw_signal ? 'Bekle / Filtrelendi' : 'Sinyal Yok')],
  ];

  tooltip.innerHTML = rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
  const left = param.point.x > container.clientWidth - 260 ? param.point.x - 250 : param.point.x + 16;
  const top = param.point.y > container.clientHeight - 280 ? param.point.y - 250 : param.point.y + 16;
  tooltip.style.left = `${Math.max(10, left)}px`;
  tooltip.style.top = `${Math.max(10, top)}px`;
  tooltip.style.display = 'grid';
}

function tbBotEnsureChart(container) {
  if (_tbBotChart || !window.LightweightCharts) return;
  tbBotEnsureOverlays(container);

  _tbBotChart = LightweightCharts.createChart(container, {
    width: container.clientWidth || 900,
    height: container.clientHeight || 430,
    layout: {
      background: { type: 'solid', color: '#020303' },
      textColor: 'rgba(224, 231, 235, 0.68)',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    },
    grid: {
      vertLines: { color: 'rgba(148, 163, 184, 0.055)' },
      horzLines: { color: 'rgba(148, 163, 184, 0.055)' },
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
      vertLine: { color: 'rgba(255,255,255,.18)', width: 1, style: 2, labelBackgroundColor: '#101316' },
      horzLine: { color: 'rgba(255,255,255,.18)', width: 1, style: 2, labelBackgroundColor: '#101316' },
    },
    rightPriceScale: {
      borderColor: 'rgba(255,255,255,.08)',
      scaleMargins: { top: 0.12, bottom: 0.14 },
    },
    timeScale: {
      borderColor: 'rgba(255,255,255,.08)',
      timeVisible: true,
      secondsVisible: false,
      rightOffset: 8,
      barSpacing: 8,
    },
    localization: {
      priceFormatter: price => Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    },
  });

  _tbBotCandles = _tbBotChart.addCandlestickSeries({
    upColor: '#00c878',
    downColor: '#ef3b55',
    borderUpColor: '#00e676',
    borderDownColor: '#ff1744',
    wickUpColor: 'rgba(0,230,118,.82)',
    wickDownColor: 'rgba(255,23,68,.82)',
    priceLineColor: 'rgba(0,230,118,.5)',
  });

  _tbBotOtt = _tbBotChart.addLineSeries({
    color: '#f59e0b',
    lineWidth: 2,
    priceLineVisible: false,
    lastValueVisible: false,
    title: 'OTT',
  });

  _tbBotMavg = _tbBotChart.addLineSeries({
    color: '#6ee7f9',
    lineWidth: 1,
    priceLineVisible: false,
    lastValueVisible: false,
    title: 'MAvg / VAR',
  });

  _tbBotEma = _tbBotChart.addLineSeries({
    color: '#38bdf8',
    lineWidth: 2,
    lineStyle: LightweightCharts.LineStyle.Solid,
    priceLineVisible: false,
    lastValueVisible: false,
    title: '1h EMA 200',
  });

  _tbBotChart.subscribeCrosshairMove(tbBotBuildTooltip);

  _tbBotResizeObserver = new ResizeObserver(() => {
    if (_tbBotChart && container) {
      _tbBotChart.resize(container.clientWidth || 900, container.clientHeight || 430);
      tbBotUpdatePriceLabels(window._tbBotCurrent || {});
    }
  });
  _tbBotResizeObserver.observe(container);
}

function tbBotApplyTradeLevels(levels) {
  _tbBotLevelSeries.forEach(line => {
    try { _tbBotCandles.removePriceLine(line); } catch (e) {}
  });
  _tbBotLevelSeries = [];
  if (!_tbBotCandles || !levels) return;

  let normalized = levels;
  if (!Array.isArray(levels) && typeof levels === 'object') {
    normalized = Object.entries(levels)
      .filter(([, price]) => price !== null && price !== undefined)
      .map(([type, price]) => ({ type, price }));
  }
  if (!Array.isArray(normalized)) return;

  const colors = {
    entry: '#f8fafc',
    stop_loss: '#ff1744',
    take_profit: '#00e676',
    tp1: '#2dd4bf',
    tp2: '#00e676',
    break_even: '#fbbf24',
  };
  const labels = { entry: 'ENTRY', stop_loss: 'SL', take_profit: 'TP', tp1: 'TP1', tp2: 'TP2', break_even: 'BE' };
  normalized.forEach(level => {
    if (!level || level.price === undefined || level.price === null) return;
    _tbBotLevelSeries.push(_tbBotCandles.createPriceLine({
      price: Number(level.price),
      color: colors[level.type] || '#94a3b8',
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      axisLabelVisible: true,
      title: labels[level.type] || String(level.type || '').toUpperCase(),
    }));
  });
}
async function tbBotLoadChart(resetView) {
  const container = document.getElementById('tb-bot-chart');
  if (!container || _tbBotLoading) return;
  const loadingEl = document.getElementById('tb-chart-loading');
  tbBotBindRangeControls();
  tbBotBindLayerToggles();

  _tbBotLoading = true;
  const symbol = tbBotGetSelectedSymbol();
  if (loadingEl) {
    loadingEl.textContent = `${symbol} grafiği yükleniyor...`;
    loadingEl.classList.remove('hidden');
  }

  try {
    tbBotEnsureChart(container);
    if (!_tbBotChart) throw new Error('Lightweight Charts yuklenemedi');

    const interval = document.getElementById('tb-timeframe')?.value || '15m';
    const res = await fetch(`${API}/tb-bot/chart?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&days=${_tbBotDays}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    tbBotSetSymbol(data.symbol || symbol, { silent: true });
    if (data.days) {
      _tbBotDays = Number(data.days);
      tbBotSetText('tb-chart-range-chip', `Range: ${_tbBotDays}G`);
      document.querySelectorAll('#botpanel-admin .tb-tf[data-tb-days]').forEach(item => {
        item.classList.toggle('active', Number(item.dataset.tbDays) === _tbBotDays);
      });
    }

    _tbBotTooltipData = new Map((data.tooltip || []).map(point => [String(point.time), point]));
    _tbBotCandles.setData(data.candles || []);
    _tbBotOtt.setData(data.ott || []);
    _tbBotMavg.setData(data.mavg || []);
    _tbBotEma.setData(data.ema200 || []);
    _tbBotRawMarkers = data.raw_signals || [];
    _tbBotBotMarkers = data.signals || [];
    tbBotApplyMarkers();
    tbBotApplyTradeLevels(data.trade_levels || []);

    if (resetView) _tbBotChart.timeScale().fitContent();

    const current = data.current || {};
    window._tbBotCurrent = current;
    if (_tbBotCurrentPriceLine) {
      try { _tbBotCandles.removePriceLine(_tbBotCurrentPriceLine); } catch (e) {}
    }
    if (current.price !== null && current.price !== undefined) {
      _tbBotCurrentPriceLine = _tbBotCandles.createPriceLine({
        price: Number(current.price),
        color: '#00e676',
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dotted,
        axisLabelVisible: false,
        title: 'Current',
      });
    }
    tbBotUpdatePriceLabels(current);

    const lastSignal = data.last_signal ? data.last_signal.type : 'Bekleniyor';
    const lastRawSignal = data.last_raw_signal ? data.last_raw_signal.type : null;
    const signalClass = lastSignal === 'BUY' ? 'tb-data-v green' : lastSignal === 'SELL' ? 'tb-data-v red' : 'tb-data-v muted';
    tbBotSyncPanelCopy(lastSignal, current.trend, lastRawSignal);
    const signalChip = document.getElementById('tb-chart-last-signal');
    if (signalChip) {
      signalChip.textContent = 'Son Bot Sinyali: ' + lastSignal;
      signalChip.className = 'tb-chip' + (lastSignal === 'BUY' ? ' green' : '');
      signalChip.style.color = lastSignal === 'SELL' ? 'var(--p-red)' : '';
    }
    tbBotSetText('tb-chart-signal-time', 'Sinyal Zamani: ' + tbBotSignalTimeLabel(data.last_signal?.time));
    tbBotSetText('tb-chart-decision', 'Anlik Karar: ' + (current.decision || 'Sinyal Yok'));

    tbBotSetText('tb-chart-price', tbBotFormatPrice(current.price));
    tbBotSetText('tb-status-last-signal', lastSignal, signalClass);
    tbBotSetText('tb-chart-trend', '1h Trend: ' + (current.trend || 'Bekleniyor') + ' · ' + (current.trend_text || ''));
    tbBotSetText('tb-chart-updated', 'Son guncelleme: ' + new Date().toLocaleTimeString('tr-TR'));
    tbBotSetText('tb-ott-signal-state', lastRawSignal || 'Bekleniyor', lastRawSignal === 'BUY' ? 'tb-data-v green' : lastRawSignal === 'SELL' ? 'tb-data-v red' : 'tb-data-v muted');
    tbBotSetText(
      'tb-ema-filter-state',
      current.trend === 'BULLISH' ? 'Bullish' : current.trend === 'BEARISH' ? 'Bearish' : 'Bekleniyor',
      current.trend === 'BULLISH' ? 'tb-data-v green' : current.trend === 'BEARISH' ? 'tb-data-v red' : 'tb-data-v muted'
    );

    const hero = document.querySelector('#botpanel-admin .tb-signal-value');
    if (hero) {
      hero.textContent = lastSignal;
      hero.classList.toggle('buy', lastSignal === 'BUY');
      hero.classList.toggle('sell', lastSignal === 'SELL');
    }
  } catch (e) {
    console.error('[TB Bot] Chart yukleme hatasi:', e);
    try {
      _tbBotCandles?.setData([]);
      _tbBotOtt?.setData([]);
      _tbBotMavg?.setData([]);
      _tbBotEma?.setData([]);
      _tbBotCandles?.setMarkers([]);
    } catch (_) {}
    if (loadingEl) loadingEl.textContent = `${symbol} grafiği yüklenemedi`;
  } finally {
    _tbBotLoading = false;
    if (loadingEl) loadingEl.classList.add('hidden');
  }
}

function tbBotAuthHeaders(json = false) {
  const headers = AUTH.token ? { Authorization: 'Bearer ' + AUTH.token } : {};
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

function tbBotParseNumber(value, fallback = 0) {
  const match = String(value ?? '').replace(',', '.').match(/[0-9]+(?:\.[0-9]+)?/);
  const raw = match ? match[0] : '';
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function tbBotClamp(value, min, max) {
  let next = Number(value);
  if (!Number.isFinite(next)) next = Number(min);
  if (Number.isFinite(Number(min))) next = Math.max(Number(min), next);
  if (Number.isFinite(Number(max))) next = Math.min(Number(max), next);
  return next;
}

function tbBotTrimNumber(value, decimals = 2) {
  const fixed = Number(value).toFixed(decimals);
  return fixed.replace(/\.?0+$/, '');
}

function tbBotSanitizeDecimalText(value, maxDecimals = 2) {
  let text = String(value ?? '').replace(',', '.').replace(/[^0-9.]/g, '');
  const firstDot = text.indexOf('.');
  if (firstDot !== -1) {
    text = text.slice(0, firstDot + 1) + text.slice(firstDot + 1).replace(/\./g, '');
  }
  const parts = text.split('.');
  if (parts[1]?.length > maxDecimals) parts[1] = parts[1].slice(0, maxDecimals);
  return parts.join('.');
}

function tbBotFormatControlledInput(el, final = false) {
  if (!el || !el.dataset?.format || el.readOnly) return true;
  const format = el.dataset.format;
  const min = Number(el.dataset.min ?? 0);
  const max = Number(el.dataset.max ?? Number.MAX_SAFE_INTEGER);
  const fallback = tbBotParseNumber(el.value, min);
  let ok = true;

  if (format === 'percent') {
    let text = tbBotSanitizeDecimalText(el.value, 2);
    if (final) {
      const value = tbBotClamp(text || fallback, min, max);
      text = tbBotTrimNumber(value, 2);
    }
    el.value = text ? `%${text}` : '';
    ok = !final || /^%[0-9]+(\.[0-9]{1,2})?$/.test(el.value);
  } else if (format === 'integer') {
    let text = String(el.value ?? '').replace(/\D/g, '');
    if (final) text = String(Math.round(tbBotClamp(text || fallback, min, max)));
    el.value = text;
    ok = !final || /^[0-9]+$/.test(el.value);
  } else if (format === 'time') {
    let text = String(el.value ?? '').replace(/\D/g, '');
    if (final) text = String(Math.round(tbBotClamp(text || fallback, min, max)));
    el.value = final && text ? `${text} dakika` : text;
    ok = !final || /^[0-9]+ dakika$/.test(el.value);
  } else if (format === 'decimal') {
    let text = tbBotSanitizeDecimalText(el.value, 2);
    if (final) {
      const value = tbBotClamp(text || fallback, min, max);
      text = tbBotTrimNumber(value, 2);
    }
    el.value = text;
    ok = !final || /^[0-9]+(\.[0-9]{1,2})?$/.test(el.value);
  } else if (format === 'ratio') {
    let text = String(el.value ?? '').replace(',', '.').replace(/[^0-9:.]/g, '');
    if (!text.startsWith('1:')) {
      const right = text.includes(':') ? text.split(':').pop() : text.replace(/^1/, '');
      text = '1:' + tbBotSanitizeDecimalText(right || '', 2);
    } else {
      text = '1:' + tbBotSanitizeDecimalText(text.slice(2), 2);
    }
    if (final) {
      const right = tbBotClamp(text.slice(2) || fallback, min, max);
      text = `1:${tbBotTrimNumber(right, 2)}`;
    }
    el.value = text;
    ok = !final || /^1:[0-9]+(\.[0-9]{1,2})?$/.test(el.value);
  }

  el.classList.toggle('tb-invalid', !ok);
  return ok;
}

function tbBotNormalizeControlledInputs(final = true) {
  const fields = document.querySelectorAll('#botpanel-admin [data-format]');
  let ok = true;
  fields.forEach(el => {
    if (!tbBotFormatControlledInput(el, final)) ok = false;
  });
  return ok;
}

function tbBotActiveSeg(setting) {
  const group = document.querySelector(`#botpanel-admin .tb-segmented[data-setting="${setting}"]`);
  return group?.querySelector('.tb-seg.active')?.textContent.trim() || '';
}

function tbBotSetSeg(setting, label) {
  const group = document.querySelector(`#botpanel-admin .tb-segmented[data-setting="${setting}"]`);
  if (!group) return;
  group.querySelectorAll('.tb-seg').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim() === label);
  });
}

function tbBotSegOn(setting) {
  const label = tbBotActiveSeg(setting).toLowerCase();
  return label.includes('aç') || label.includes('ac') || label.includes('aktif') || label.includes('iptal et');
}

function tbBotDirectionToApi(label) {
  if (label === 'Sadece Long') return 'long_only';
  if (label === 'Sadece Short') return 'short_only';
  return 'long_short';
}

function tbBotDirectionFromApi(value) {
  if (value === 'long_only') return 'Sadece Long';
  if (value === 'short_only') return 'Sadece Short';
  return 'Long + Short';
}

function tbBotReverseToApi(label) {
  if (label === 'Bekle') return 'wait';
  if (label === 'Ters İşleme Geç') return 'reverse_trade';
  return 'close_position';
}

function tbBotReverseFromApi(value) {
  if (value === 'wait') return 'Bekle';
  if (value === 'reverse_trade') return 'Ters İşleme Geç';
  return 'Pozisyonu Kapat';
}

function tbBotVolatilityToApi(label) {
  if (label === 'Kapalı') return 'off';
  if (label === 'Katı') return 'strict';
  return 'normal';
}

function tbBotVolatilityFromApi(value) {
  if (value === 'off') return 'Kapalı';
  if (value === 'strict') return 'Katı';
  return 'Normal';
}

function tbBotSetField(selector, value) {
  const el = document.querySelector(selector);
  if (!el || value === undefined || value === null) return;
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

const TB_BOT_ALLOWED_SYMBOLS = ['SOLUSDT', 'ETHUSDT'];
window._tbBotSelectedSymbol = window._tbBotSelectedSymbol || 'SOLUSDT';

function tbBotNormalizeSymbol(symbol) {
  const normalized = String(symbol || 'SOLUSDT').toUpperCase();
  return TB_BOT_ALLOWED_SYMBOLS.includes(normalized) ? normalized : 'SOLUSDT';
}

function tbBotSymbolBase(symbol) {
  return tbBotNormalizeSymbol(symbol).replace('USDT', '');
}

function tbBotSetSymbol(symbol, options = {}) {
  const next = tbBotNormalizeSymbol(symbol);
  window._tbBotSelectedSymbol = next;
  document.querySelectorAll('#botpanel-admin .tb-coin-option[data-symbol]').forEach(btn => {
    const active = btn.dataset.symbol === next;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-checked', active ? 'true' : 'false');
    const state = btn.querySelector('.tb-coin-state');
    if (state) state.textContent = active ? 'Aktif' : 'Seç';
  });
  const base = tbBotSymbolBase(next);
  tbBotSetText('tb-chart-title', `${base}/USDT Grafik`);
  tbBotSetText('tb-chart-symbol-main', next);
  tbBotSetText('tb-active-symbol-row', next);
  tbBotSetText('tb-position-symbol', next);
  const chart = document.getElementById('tb-bot-chart');
  if (chart) chart.setAttribute('aria-label', `${next} profesyonel trading grafiği`);
  const loading = document.getElementById('tb-chart-loading');
  if (loading) loading.textContent = `${next} grafiği yükleniyor...`;
  const help = document.getElementById('tb-symbol-help');
  if (help) help.textContent = `Aktif işlem çifti: ${next}. TB Bot yalnızca seçilen işlem çifti üzerinde analiz yapar ve demo emir gönderir.`;
  if (!options.silent) {
    const hero = document.querySelector('#botpanel-admin .tb-signal-value');
    if (hero) {
      hero.textContent = 'Bekleniyor';
      hero.classList.remove('buy', 'sell');
    }
    const desc = document.querySelector('#botpanel-admin .tb-data-desc');
    if (desc) desc.textContent = `${next} için veri bekleniyor.`;
  }
  return document.querySelector(`#botpanel-admin .tb-coin-option[data-symbol="${next}"]`);
}

function tbBotGetSelectedSymbol() {
  return tbBotNormalizeSymbol(
    document.querySelector('#botpanel-admin .tb-coin-option.active[data-symbol]')?.dataset.symbol ||
    window._tbBotConfig?.symbol ||
    window._tbBotSelectedSymbol
  );
}

function tbBotCurrentConfigFromDom(overrides = {}) {
  const timeframe = document.getElementById('tb-timeframe')?.value || '15m';
  const directionLabel = document.getElementById('tb-direction')?.value || 'Long + Short';
  const leverage = tbBotParseNumber(document.getElementById('tb-leverage')?.value, 3);
  const intervalText = document.getElementById('tb-control-interval')?.value || '10 saniye';
  const stopType = document.getElementById('tb-stop-type')?.value || 'ATR Bazlı';
  const tpType = document.getElementById('tb-tp-type')?.value || 'Risk/Reward';
  const trailing = document.getElementById('tb-trailing-stop')?.value || 'Kapalı';

  return {
    symbol: tbBotGetSelectedSymbol(),
    trading_mode: 'demo',
    bot_enabled: overrides.bot_enabled ?? window._tbBotStatus?.bot_enabled ?? 0,
    timeframe,
    direction_mode: tbBotDirectionToApi(directionLabel),
    leverage,
    margin_type: 'ISOLATED',
    wait_candle_close: tbBotSegOn('wait_close') ? 1 : 0,
    prevent_same_signal_reentry: tbBotSegOn('same_signal') ? 1 : 0,
    opposite_signal_behavior: tbBotReverseToApi(tbBotActiveSeg('reverse_signal')),
    order_type: (tbBotActiveSeg('order_type') || 'Market').toUpperCase() === 'LIMIT' ? 'LIMIT' : 'MARKET',
    control_interval_seconds: tbBotParseNumber(intervalText, 10),
    trend_filter_enabled: tbBotSegOn('trend_filter') ? 1 : 0,
    trend_filter_timeframe: '1h',
    trend_filter_method: 'EMA200',
    volatility_filter_mode: tbBotVolatilityToApi(tbBotActiveSeg('volatility_filter')),
    max_slippage_percent: tbBotParseNumber(document.getElementById('tb-slippage')?.value, 0.2),
    max_order_retries: tbBotParseNumber(document.getElementById('tb-max-order-retries')?.value, 1),
    retry_delay_seconds: 2,
    cancel_if_price_moves: tbBotSegOn('cancel_if_price_moves') ? 1 : 0,
    retry_same_candle: tbBotSegOn('retry_same_candle') ? 1 : 0,
    risk_per_trade_percent: tbBotParseNumber(document.getElementById('tb-risk-per-trade')?.value, 1),
    max_daily_loss_percent: tbBotParseNumber(document.getElementById('tb-max-daily-loss')?.value, 3),
    daily_profit_target_percent: tbBotParseNumber(document.getElementById('tb-daily-profit-target')?.value, 4),
    max_open_positions: tbBotParseNumber(document.getElementById('tb-max-open-positions')?.value, 1),
    max_daily_trades: tbBotParseNumber(document.getElementById('tb-max-daily-trades')?.value, 5),
    consecutive_loss_limit: tbBotParseNumber(document.getElementById('tb-consecutive-losses')?.value, 3),
    cooldown_minutes: tbBotParseNumber(document.getElementById('tb-cooldown')?.value, 15),
    reduce_risk_after_losses_enabled: tbBotSegOn('reduce_risk_after_losses') ? 1 : 0,
    reduce_risk_after_losses_count: 2,
    reduced_risk_percent: tbBotParseNumber(document.getElementById('tb-reduced-risk')?.value, 0.25),
    stop_after_losses_enabled: tbBotSegOn('stop_after_losses') ? 1 : 0,
    stop_after_losses_count: 3,
    stop_loss_type: stopType.toUpperCase().includes('ATR') ? 'ATR' : stopType,
    atr_multiplier: tbBotParseNumber(document.getElementById('tb-atr-multiplier')?.value, 1.5),
    take_profit_type: tpType.toUpperCase().includes('PAR') || tpType.toUpperCase().includes('PARTIAL') ? 'PARTIAL_TP' : 'RISK_REWARD',
    risk_reward_ratio: String(document.getElementById('tb-risk-reward')?.value || '1:2').includes(':')
      ? tbBotParseNumber(String(document.getElementById('tb-risk-reward')?.value).split(':').pop(), 2)
      : tbBotParseNumber(document.getElementById('tb-risk-reward')?.value, 2),
    partial_tp_enabled: tbBotParseNumber(document.getElementById('tb-tp1-close')?.value, 0) > 0 ? 1 : 0,
    tp1_r: tbBotParseNumber(document.getElementById('tb-tp1-r')?.value, 1),
    tp1_close_percent: tbBotParseNumber(document.getElementById('tb-tp1-close')?.value, 50),
    tp2_r: tbBotParseNumber(document.getElementById('tb-tp2-r')?.value, 1.5),
    tp2_close_percent: tbBotParseNumber(document.getElementById('tb-tp2-close')?.value, 50),
    break_even_enabled: tbBotSegOn('break_even') ? 1 : 0,
    break_even_trigger_r: tbBotParseNumber(document.getElementById('tb-break-even-trigger')?.value, 0.8),
    break_even_mode: 'MOVE_SL_TO_ENTRY',
    trailing_stop_enabled: trailing === 'Açık' || trailing === 'Acik' ? 1 : 0,
    no_trade_zone_enabled: tbBotSegOn('no_trade_zone') ? 1 : 0,
    ema200_avoid_enabled: tbBotSegOn('ema200_avoid') ? 1 : 0,
    ema200_avoid_percent: tbBotParseNumber(document.getElementById('tb-ema200-avoid')?.value, 0.15),
    atr_min_filter_enabled: tbBotSegOn('atr_min_filter') ? 1 : 0,
    atr_max_filter_enabled: tbBotSegOn('atr_max_filter') ? 1 : 0,
    wick_filter_enabled: tbBotSegOn('wick_filter') ? 1 : 0,
    spread_filter_enabled: tbBotSegOn('spread_filter') ? 1 : 0,
    ...overrides,
  };
}

function tbBotApplyConfigToDom(config = {}) {
  window.TBRecommendedSettingsState = window.TBRecommendedSettingsState || {};
  window.TBRecommendedSettingsState.applying = true;
  tbBotSetSymbol(config.symbol || 'SOLUSDT', { silent: true });
  tbBotSetField('#tb-timeframe', config.timeframe || '15m');
  tbBotSetField('#tb-direction', tbBotDirectionFromApi(config.direction_mode));
  tbBotSetField('#tb-leverage', config.leverage ?? 3);
  tbBotSetField('#tb-margin', config.margin_type === 'CROSSED' ? 'Cross' : 'Isolated');
  tbBotSetField('#tb-control-interval', `${config.control_interval_seconds ?? 10} saniye`);
  tbBotSetField('#tb-slippage', `%${config.max_slippage_percent ?? 0.2}`);
  tbBotSetField('#tb-max-order-retries', config.max_order_retries ?? 1);
  tbBotSetSeg('wait_close', Number(config.wait_candle_close ?? 1) ? 'Açık' : 'Kapalı');
  tbBotSetSeg('same_signal', Number(config.prevent_same_signal_reentry ?? 1) ? 'Açık' : 'Kapalı');
  tbBotSetSeg('reverse_signal', tbBotReverseFromApi(config.opposite_signal_behavior));
  tbBotSetSeg('order_type', config.order_type === 'LIMIT' ? 'Limit' : 'Market');
  tbBotSetSeg('trend_filter', Number(config.trend_filter_enabled ?? 1) ? 'Aktif' : 'Kapalı');
  tbBotSetSeg('volatility_filter', tbBotVolatilityFromApi(config.volatility_filter_mode));
  tbBotSetSeg('retry_same_candle', Number(config.retry_same_candle ?? 0) ? 'Acik' : 'Kapali');
  tbBotSetSeg('cancel_if_price_moves', Number(config.cancel_if_price_moves ?? 1) ? 'Islemi Iptal Et' : 'Devam Et');
  tbBotSetField('#tb-risk-per-trade', `%${config.risk_per_trade_percent ?? 1}`);
  tbBotSetField('#tb-max-daily-loss', `%${config.max_daily_loss_percent ?? 3}`);
  tbBotSetField('#tb-daily-profit-target', `%${config.daily_profit_target_percent ?? 4}`);
  tbBotSetField('#tb-max-open-positions', config.max_open_positions ?? 1);
  tbBotSetField('#tb-max-daily-trades', config.max_daily_trades ?? 5);
  tbBotSetField('#tb-consecutive-losses', config.consecutive_loss_limit ?? 3);
  tbBotSetField('#tb-cooldown', `${config.cooldown_minutes ?? 15} dakika`);
  tbBotSetSeg('reduce_risk_after_losses', Number(config.reduce_risk_after_losses_enabled ?? 0) ? 'Acik' : 'Kapali');
  tbBotSetField('#tb-reduced-risk', `%${config.reduced_risk_percent ?? 0.25}`);
  tbBotSetSeg('stop_after_losses', Number(config.stop_after_losses_enabled ?? 0) ? 'Acik' : 'Kapali');
  tbBotSetField('#tb-stop-type', config.stop_loss_type === 'ATR' ? 'ATR Bazlı' : config.stop_loss_type);
  tbBotSetField('#tb-atr-multiplier', config.atr_multiplier ?? 1.5);
  tbBotSetField('#tb-tp-type', config.take_profit_type === 'PARTIAL_TP' ? 'Parçalı Take Profit' : 'Risk/Reward');
  tbBotSetField('#tb-risk-reward', `1:${config.risk_reward_ratio ?? 2}`);
  tbBotSetField('#tb-tp1-r', config.tp1_r ?? 1);
  tbBotSetField('#tb-tp1-close', `%${config.tp1_close_percent ?? 50}`);
  tbBotSetField('#tb-tp2-r', config.tp2_r ?? 1.5);
  tbBotSetField('#tb-tp2-close', `%${config.tp2_close_percent ?? 50}`);
  tbBotSetSeg('break_even', Number(config.break_even_enabled ?? 0) ? 'Acik' : 'Kapali');
  tbBotSetField('#tb-break-even-trigger', config.break_even_trigger_r ?? 0.8);
  tbBotSetField('#tb-break-even-mode', "Stop'u Entry'ye Cek");
  tbBotSetField('#tb-trailing-stop', Number(config.trailing_stop_enabled ?? 0) ? 'Açık' : 'Kapalı');
  tbBotSetSeg('no_trade_zone', Number(config.no_trade_zone_enabled ?? 0) ? 'Açık' : 'Kapalı');
  tbBotSetSeg('ema200_avoid', Number(config.ema200_avoid_enabled ?? 0) ? 'Açık' : 'Kapalı');
  tbBotSetField('#tb-ema200-avoid', `%${config.ema200_avoid_percent ?? 0.15}`);
  tbBotSetSeg('atr_min_filter', Number(config.atr_min_filter_enabled ?? 0) ? 'Açık' : 'Kapalı');
  tbBotSetSeg('atr_max_filter', Number(config.atr_max_filter_enabled ?? 0) ? 'Açık' : 'Kapalı');
  tbBotSetSeg('wick_filter', Number(config.wick_filter_enabled ?? 0) ? 'Açık' : 'Kapalı');
  tbBotSetSeg('spread_filter', Number(config.spread_filter_enabled ?? 0) ? 'Açık' : 'Kapalı');
  window.TBRecommendedSettingsState.applying = false;
}
async function tbBotSaveCurrentConfig(options = {}) {
  if (!AUTH.token || !document.getElementById('botpanel-admin')) return false;
  if (!tbBotNormalizeControlledInputs(true)) {
    if (!options.silent && typeof showToast === 'function') showToast('error', 'Lütfen bot ayar formatlarını kontrol edin.');
    return false;
  }
  const payload = tbBotCurrentConfigFromDom(options.overrides || {});
  try {
    const res = await fetch(API + '/tb-bot/config', {
      method: 'POST',
      headers: tbBotAuthHeaders(true),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Ayarlar kaydedilemedi');
    window._tbBotConfig = data.config || payload;
    if (!options.silent && typeof showToast === 'function') showToast('success', data.message || 'TB Bot ayarları kaydedildi');
    return true;
  } catch (e) {
    if (!options.silent && typeof showToast === 'function') showToast('error', e.message || 'TB Bot ayarları kaydedilemedi');
    return false;
  }
}

window.tbBotSaveCurrentConfig = tbBotSaveCurrentConfig;

function tbBotScheduleSave() {
  if (window.TBRecommendedSettingsState?.applying) return;
  clearTimeout(window._tbBotSaveTimer);
  window._tbBotSaveTimer = setTimeout(() => tbBotSaveCurrentConfig({ silent: true }), 800);
}

function tbBotSetVisualState(label, tone) {
  const stateEl = document.getElementById('tb-bot-state');
  const startBtn = document.querySelector('#botpanel-admin .tb-icon-start');
  const stopBtn = document.querySelector('#botpanel-admin .tb-icon-stop');
  if (stateEl) {
    stateEl.textContent = label;
    stateEl.className = 'tb-data-v ' + (tone === 'green' ? 'green' : tone === 'red' ? 'red' : 'muted');
  }
  if (startBtn && stopBtn) {
    startBtn.classList.toggle('running', tone === 'green');
    stopBtn.classList.toggle('running', tone !== 'green');
  }
}

async function tbBotHandleAction(action, btn) {
  if (!AUTH.token) return;
  const endpoint = action === 'start' ? '/start' : action === 'stop' ? '/stop' : '/emergency-stop';
  const originalDisabled = btn?.disabled;
  if (btn) btn.disabled = true;
  try {
    if (action === 'start') {
      const saved = await tbBotSaveCurrentConfig({ silent: true, overrides: { bot_enabled: 0 } });
      if (!saved) return;
    }
    const res = await fetch(API + '/tb-bot' + endpoint, {
      method: 'POST',
      headers: tbBotAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Bot işlemi tamamlanamadı');
    if (typeof showToast === 'function') showToast('success', data.message || 'Bot durumu güncellendi');
    await tbBotRefreshRuntime();
  } catch (e) {
    if (typeof showToast === 'function') showToast('error', e.message || 'Bağlantı hatası');
  } finally {
    if (btn) btn.disabled = originalDisabled || false;
  }
}

window.tbBotHandleAction = tbBotHandleAction;

function tbBotBindPanelControls() {
  const root = document.getElementById('botpanel-admin');
  if (!root || root.dataset.tbApiBound === '1') return;
  root.dataset.tbApiBound = '1';

  root.querySelectorAll('[data-tb-action]').forEach(btn => {
    btn.addEventListener('click', () => tbBotHandleAction(btn.getAttribute('data-tb-action'), btn));
  });
  root.querySelectorAll('.tb-coin-option[data-symbol]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const previous = tbBotGetSelectedSymbol();
      const next = tbBotNormalizeSymbol(btn.dataset.symbol);
      if (previous === next) return;
      tbBotSetSymbol(next);
      if (!window.TBRecommendedSettingsState?.applying) markProfileAsManual();
      const saved = await tbBotSaveCurrentConfig({ silent: true });
      if (saved) {
        await Promise.allSettled([tbBotLoadChart(true), tbBotRefreshRuntime()]);
      }
    });
  });
  root.querySelectorAll('.tb-settings-section input, .tb-settings-section select').forEach(el => {
    el.addEventListener('input', () => {
      if (window.TBRecommendedSettingsState?.applying) return;
      tbBotFormatControlledInput(el, false);
      tbBotScheduleSave();
    });
    el.addEventListener('change', () => {
      if (window.TBRecommendedSettingsState?.applying) return;
      tbBotFormatControlledInput(el, true);
      tbBotScheduleSave();
    });
    el.addEventListener('blur', () => {
      if (window.TBRecommendedSettingsState?.applying) return;
      tbBotFormatControlledInput(el, true);
      tbBotScheduleSave();
    });
  });
  root.querySelectorAll('.tb-segmented .tb-seg').forEach(btn => {
    btn.addEventListener('click', tbBotScheduleSave);
  });
}

async function tbBotLoadConfig() {
  if (!AUTH.token) return;
  const res = await fetch(API + '/tb-bot/config', { headers: tbBotAuthHeaders() });
  if (!res.ok) return;
  const config = await res.json();
  window._tbBotConfig = config;
  tbBotApplyConfigToDom(config);
}

function tbBotFindDataRow(labelPart) {
  return Array.from(document.querySelectorAll('#botpanel-admin .tb-data-row')).find(row => {
    return row.querySelector('.tb-data-k')?.textContent.includes(labelPart);
  });
}

function tbBotSetRowValue(labelPart, value, className = 'tb-data-v') {
  const row = tbBotFindDataRow(labelPart);
  const valueEl = row?.querySelector('.tb-data-v');
  if (!valueEl) return;
  valueEl.textContent = value;
  valueEl.className = className;
}

async function tbBotLoadStatus() {
  if (!AUTH.token) return;
  const symbol = tbBotGetSelectedSymbol();
  const res = await fetch(API + `/tb-bot/status?symbol=${encodeURIComponent(symbol)}`, { headers: tbBotAuthHeaders() });
  if (!res.ok) return;
  const data = await res.json();
  window._tbBotStatus = data;
  if (data.config?.symbol) tbBotSetSymbol(data.config.symbol, { silent: true });
  const state = data.state || {};
  if (state.emergency_stopped) tbBotSetVisualState('Acil Durduruldu', 'red');
  else if (data.bot_enabled) tbBotSetVisualState('Çalışıyor', 'green');
  else tbBotSetVisualState('Durduruldu', 'muted');

  tbBotSetRowValue('Son Sinyal', state.last_signal || 'Bekleniyor',
    state.last_signal === 'BUY' ? 'tb-data-v green' : state.last_signal === 'SELL' ? 'tb-data-v red' : 'tb-data-v muted');
  tbBotSetRowValue('Günlük PnL', tbBotFormatPrice(data.stats?.daily_pnl ?? state.daily_pnl ?? 0),
    Number(data.stats?.daily_pnl ?? state.daily_pnl ?? 0) < 0 ? 'tb-data-v red' : 'tb-data-v green');

  const hero = document.querySelector('#botpanel-admin .tb-signal-value');
  if (hero && state.current_decision) hero.textContent = state.current_decision;
  const desc = document.querySelector('#botpanel-admin .tb-data-desc');
  if (desc) desc.textContent = state.current_decision || 'Bot henüz aktif bir işlem sinyali üretmedi.';
}

async function tbBotLoadLogs() {
  if (!AUTH.token) return;
  const symbol = tbBotGetSelectedSymbol();
  const res = await fetch(API + `/tb-bot/logs?symbol=${encodeURIComponent(symbol)}`, { headers: tbBotAuthHeaders() });
  if (!res.ok) return;
  const data = await res.json();
  const tbody = document.querySelector('#botpanel-admin .tb-log-table tbody');
  const chip = document.querySelector('#botpanel-admin .tb-log-section .tb-card-head .tb-chip');
  if (chip) chip.textContent = 'Anlık veri';
  if (!tbody) return;
  const logs = data.logs || [];
  if (!logs.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--p-muted)">Henüz bot logu yok.</td></tr>';
    return;
  }
  tbody.innerHTML = logs.slice(0, 100).map(log => {
    const time = log.created_at ? new Date(log.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-';
    const status = log.status || 'INFO';
    const cls = status === 'SUCCESS' || status === 'APPROVED' ? 'success' : status === 'ERROR' ? 'error' : status === 'REJECTED' ? 'warning' : 'info';
    return `<tr>
      <td>${time}</td>
      <td>${tbBotEscape(log.symbol || '-')}</td>
      <td>${tbBotEscape(log.category || '-')}</td>
      <td>${tbBotEscape(log.signal || '-')}</td>
      <td>${tbBotEscape(log.decision || '-')}</td>
      <td>${tbBotEscape(log.message || '-')}</td>
      <td><span class="tb-badge ${cls}">${tbBotEscape(status)}</span></td>
    </tr>`;
  }).join('');
}

async function tbBotLoadPosition() {
  if (!AUTH.token) return;
  const symbol = tbBotGetSelectedSymbol();
  const res = await fetch(API + `/tb-bot/position?symbol=${encodeURIComponent(symbol)}`, { headers: tbBotAuthHeaders() });
  if (!res.ok) return;
  const data = await res.json();
  tbBotSetText('tb-position-symbol', data.symbol || symbol);
  const p = data.position;
  const empty = document.querySelector('#botpanel-admin .tb-bottom-grid .tb-card .tb-empty');
  if (!p) {
    ['Yön', 'Entry', 'Anlık Fiyat', 'Miktar', 'Kaldıraç', 'PnL', 'Stop-loss', 'Take-profit'].forEach(label => tbBotSetRowValue(label, '-'));
    if (empty && data.other_open_symbol) empty.innerHTML = `<span class="tb-empty-icon">📭</span>${tbBotEscape(data.other_open_symbol)} üzerinde açık pozisyon var ancak aktif bot sembolü ${tbBotEscape(data.symbol || symbol)}.`;
    else if (empty) empty.innerHTML = '<span class="tb-empty-icon">📭</span>Açık pozisyon bulunmuyor.';
    return;
  }
  if (empty) empty.innerHTML = '<span class="tb-empty-icon">📭</span>Seçili işlem çifti için açık pozisyon bilgisi.';
  tbBotSetRowValue('Yön', p.side || '-');
  tbBotSetRowValue('Entry', tbBotFormatPrice(p.entry_price));
  tbBotSetRowValue('Anlık Fiyat', tbBotFormatPrice(p.current_price ?? p.entry_price));
  tbBotSetRowValue('Miktar', p.quantity ?? '-');
  tbBotSetRowValue('Kaldıraç', p.leverage ? `${p.leverage}x` : '-');
  tbBotSetRowValue('PnL', tbBotFormatPrice(p.unrealized_pnl ?? 0), Number(p.unrealized_pnl ?? 0) < 0 ? 'tb-data-v red' : 'tb-data-v green');
  tbBotSetRowValue('Stop-loss', tbBotFormatPrice(p.stop_loss));
  tbBotSetRowValue('Take-profit', tbBotFormatPrice(p.take_profit));
}

async function tbBotRefreshRuntime() {
  await Promise.allSettled([tbBotLoadStatus(), tbBotLoadLogs(), tbBotLoadPosition()]);
}

let _bpChart = null;
let _bpCandleSeries = null;
let _bpMavgSeries   = null;
let _bpOttSeries    = null;
let _bpBuyMarkers   = [];
let _bpSellMarkers  = [];
let _bpCurrentTf    = '5m';
let _bpRefreshTimer = null;
let _bpLoading      = false;

function bpSetTf(btn, tf) {
  _bpCurrentTf = tf;
  // support both old and new class names
  document.querySelectorAll('.bp-tf-btn, .bpt-tf').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  bpLoadChart(true);
}

async function bpLoadChart(resetView) {
  const container = document.getElementById('bot-panel-chart');
  if (!container) return;

  if (_bpLoading) return;
  _bpLoading = true;

  const symbol = (document.getElementById('bp-symbol')  || {}).value || 'BTCUSDT';
  const ottLen = (document.getElementById('ott-len')     || {}).value || 2;
  const ottPct = (document.getElementById('ott-pct')     || {}).value || 1.4;
  const tf     = _bpCurrentTf;

  try {
    const res  = await fetch(`${API}/chart/ohlcv?symbol=${symbol}&interval=${tf}&ott_length=${ottLen}&ott_percent=${ottPct}`,
                             { headers: { Authorization: 'Bearer ' + AUTH.token } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const d = await res.json();

    // ── Grafik başlat (ilk kez) ──
    if (!_bpChart) {
      const CH = 420;
      _bpChart = LightweightCharts.createChart(container, {
        layout:     { background: { color: '#080808' }, textColor: 'rgba(255,255,255,0.35)' },
        grid:       { vertLines: { color: '#131313' }, horzLines: { color: '#131313' } },
        crosshair:  { mode: LightweightCharts.CrosshairMode.Normal },
        rightPriceScale: { borderColor: '#1e1e1e' },
        timeScale:  { borderColor: '#1e1e1e', timeVisible: true, secondsVisible: false },
        width:  container.clientWidth || 600,
        height: CH,
      });
      _bpCandleSeries = _bpChart.addCandlestickSeries({
        upColor:        '#22c55e',
        downColor:      '#ef4444',
        borderUpColor:  '#22c55e',
        borderDownColor:'#ef4444',
        wickUpColor:    '#22c55e',
        wickDownColor:  '#ef4444',
      });
      // MAvg — mavi, ince
      _bpMavgSeries = _bpChart.addLineSeries({ color: '#2563eb', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false });
      // OTT  — turuncu, ince
      _bpOttSeries  = _bpChart.addLineSeries({ color: '#f59e0b', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false });

      // Resize observer — sabit yükseklik koru
      new ResizeObserver(() => {
        if (_bpChart && container) _bpChart.resize(container.clientWidth || 600, CH);
      }).observe(container);
    }

    // ── Mum verisi ──
    const candles = d.candles.map(c => ({
      time: Math.floor(c.t / 1000),
      open: c.o, high: c.h, low: c.l, close: c.c,
    }));
    _bpCandleSeries.setData(candles);

    // ── OTT katmanları ──
    const times = d.candles.map(c => Math.floor(c.t / 1000));
    _bpMavgSeries.setData(d.ott.mavg.map((v, i) => ({ time: times[i], value: v })));
    _bpOttSeries .setData(d.ott.ott .map((v, i) => ({ time: times[i], value: v })));

    // ── Al/Sat işaretleri (çakışmasın diye deduplicate) ──
    const rawMarkers = [
      ...d.ott.k_buys .map(i => ({ time: times[i], position: 'belowBar', color: '#22c55e', shape: 'arrowUp',   text: '▲ L' })),
      ...d.ott.k_sells.map(i => ({ time: times[i], position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', text: '▼ S' })),
    ].sort((a, b) => a.time - b.time);
    // Aynı zaman damgasında üst üste binen markerları offset'le
    const seenTimes = {};
    const markers = rawMarkers.map(m => {
      const key = m.time + m.position;
      if (seenTimes[key]) { m = { ...m, text: '' }; } // metin yok, sadece ok
      seenTimes[key] = true;
      return m;
    });
    _bpCandleSeries.setMarkers(markers);

    if (resetView) _bpChart.timeScale().fitContent();

    // ── Stat kartları ──
    const cp = d.current_price;
    const priceEl = document.getElementById('bp-price');
    if (priceEl) priceEl.textContent = '$' + cp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const lastMavg = d.ott.mavg.at(-1);
    const lastOtt  = d.ott.ott .at(-1);
    const fark     = cp - lastMavg;
    const farkPct  = ((fark / lastMavg) * 100).toFixed(2);

    const mavgEl = document.getElementById('bp-mavg-val');
    if (mavgEl) mavgEl.textContent = '$' + lastMavg.toFixed(2);

    const ottEl = document.getElementById('bp-ott-val');
    if (ottEl) ottEl.textContent = '$' + lastOtt.toFixed(2);

    const farkEl = document.getElementById('bp-fark-val');
    if (farkEl) {
      farkEl.textContent = `$${fark.toFixed(2)} (${farkPct}%)`;
      farkEl.style.color = fark >= 0 ? '#00e676' : '#ff1744';
    }

    const updateEl = document.getElementById('bp-last-update');
    if (updateEl) updateEl.textContent = new Date().toLocaleTimeString('tr-TR');

    // ── OTT sinyal kartı ──
    if (d.last_signal) {
      const sig = d.last_signal.type;
      const ottSigEl = document.getElementById('bp-ott-signal');
      if (ottSigEl) {
        ottSigEl.textContent = sig === 'BUY' ? '▲ LONG' : '▼ SHORT';
        ottSigEl.style.color = sig === 'BUY' ? '#00e676' : '#ff1744';
      }
      const ottSubEl = document.getElementById('bp-ott-signal-sub');
      if (ottSubEl) ottSubEl.textContent = sig === 'BUY' ? 'Alış Sinyali' : 'Satış Sinyali';
    }

    // ── Trend yönü ──
    const dir = d.current_dir;
    const trendEl = document.getElementById('bp-trend');
    if (trendEl) {
      trendEl.textContent = dir === 1 ? '▲ YUKARI' : '▼ AŞAĞI';
      trendEl.style.color = dir === 1 ? '#00e676' : '#ff1744';
    }
    const trendSubEl = document.getElementById('bp-trend-sub');
    if (trendSubEl) trendSubEl.textContent = dir === 1 ? 'Boğa trendi' : 'Ayı trendi';

    // ── Fiyat değişim ──
    if (d.candles.length >= 2) {
      const prev  = d.candles.at(-2).c;
      const pct   = (((cp - prev) / prev) * 100).toFixed(2);
      const chgEl = document.getElementById('bp-price-chg');
      if (chgEl) {
        const sign = pct >= 0 ? '+' : '';
        chgEl.textContent = `${sign}${pct}% | 24s Hacim: $${(d.candles.at(-1).v / 1e6).toFixed(2)}M`;
        chgEl.style.color = pct >= 0 ? '#00e676' : '#ff1744';
      }
    }

  } catch (e) {
    console.error('[BP] Chart yükleme hatası:', e);
  } finally {
    _bpLoading = false;
  }
}

async function bpLoadStatus() {
  try {
    const res = await fetch(API + '/bot/status', { headers: { Authorization: 'Bearer ' + AUTH.token } });
    if (!res.ok) return;
    const d = await res.json();

    const isActive = d.is_active;

    // Status text
    const statusEl = document.getElementById('bot-status-text');
    if (statusEl) statusEl.textContent = isActive ? 'Çalışıyor' : 'Durduruldu';

    // Status dot (new design)
    const dotEl = document.getElementById('bp-status-dot');
    if (dotEl) { dotEl.classList.toggle('on', !!isActive); }

    // Toggle btn
    const btnEl = document.getElementById('bot-toggle-btn');
    if (btnEl) {
      if (isActive) {
        btnEl.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> DURDUR`;
        btnEl.classList.add('stop');
      } else {
        btnEl.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg> BAŞLAT`;
        btnEl.classList.remove('stop');
      }
    }

    // Stat pills
    const ttEl = document.getElementById('bp-total-trades');
    if (ttEl) ttEl.textContent = d.total_trades ?? 0;

    const wrEl = document.getElementById('bp-win-rate');
    if (wrEl) wrEl.textContent = '%' + (d.win_rate ?? 0).toFixed(1);

    const pnlEl = document.getElementById('bp-strategy-pnl');
    if (pnlEl) {
      const pnl = d.pnl ?? 0;
      pnlEl.textContent = (pnl > 0 ? '+' : (pnl < 0 ? '-' : '')) + Math.abs(pnl).toFixed(2) + '%';
      pnlEl.style.color = pnl >= 0 ? 'rgba(255,255,255,0.7)' : '#f87171';
    }

  } catch (e) {
    console.error('[BP] Status yükleme hatası:', e);
  }
}

async function bpLoadLogs() {
  try {
    const res = await fetch(API + '/bot/logs', { headers: { Authorization: 'Bearer ' + AUTH.token } });
    if (!res.ok) return;
    const d = await res.json();
    const logs = d.logs || [];

    const body = document.getElementById('bp-signals-body');
    const cntEl = document.getElementById('bp-sig-count');
    if (cntEl) cntEl.textContent = logs.length + ' Emir';

    if (!body) return;
    if (logs.length === 0) {
      body.innerHTML = '<div style="padding:20px;text-align:center;color:#8492a6;font-size:13px">Henüz sinyal yok</div>';
      return;
    }

    body.innerHTML = logs.map(l => {
      const isBuy = l.signal === 'BUY';
      const dt    = new Date(l.created_at);
      const time  = dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const date  = dt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
      return `
        <div class="bpt-feed-row">
          <div class="bpt-feed-cell bpt-feed-time">${date}<br>${time}</div>
          <div class="bpt-feed-cell" style="gap:6px">
            <span class="bpt-badge ${isBuy ? 'bpt-badge-b' : 'bpt-badge-s'}">${l.signal}</span>
            <span style="font-size:9px;color:rgba(255,255,255,0.25)">${l.symbol}</span>
          </div>
          <div class="bpt-feed-cell bpt-feed-px">$${Number(l.price).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        </div>`;
    }).join('');

  } catch (e) {
    console.error('[BP] Log yükleme hatası:', e);
  }
}

async function toggleBot() {
  try {
    const statusEl = document.getElementById('bot-status-text');
    const isCurrentlyActive = statusEl && (statusEl.textContent === 'Çalışıyor' || statusEl.textContent === 'Running');

    const res = await fetch(API + '/bot/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + AUTH.token },
      body: JSON.stringify({ is_active: !isCurrentlyActive }),
    });
    const d = await res.json();
    showToast(res.ok ? 'success' : 'error', d.message || d.error || 'Hata');
    if (res.ok) bpLoadStatus();
  } catch (e) {
    showToast('error', 'Bağlantı hatası');
  }
}

async function sendManualSignal(sig) {
  const symbol = (document.getElementById('bp-symbol') || {}).value || 'BTCUSDT';
  try {
    const res = await fetch(API + '/bot/force_signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + AUTH.token },
      body: JSON.stringify({ signal: sig, symbol }),
    });
    const d = await res.json();
    showToast(res.ok ? 'success' : 'error', d.message || d.error || 'Hata');
    if (res.ok) { await bpLoadLogs(); }
  } catch (e) {
    showToast('error', 'Bağlantı hatası');
  }
}

function startBotAutoRefresh() {
  stopBotAutoRefresh();

  if (document.getElementById('tb-bot-chart')) {
    tbBotBindPanelControls();
    tbBotLoadConfig().then(() => {
      tbBotLoadChart(true);
      tbBotRefreshRuntime();
    });
    let tick = 0;
    _bpRefreshTimer = setInterval(() => {
      tick++;
      tbBotRefreshRuntime();
      if (tick % 3 === 0) tbBotLoadChart(false);
    }, 10000);
    return;
  }

  // Legacy bot panel fallback, used only if the old chart container exists.
  if (!document.getElementById('bot-panel-chart')) {
    return;
  }
  if (_bpChart) { try { _bpChart.remove(); } catch(e){} _bpChart = null; }
  bpLoadChart(true);
  bpLoadStatus();
  bpLoadLogs();

  let tick = 0;
  _bpRefreshTimer = setInterval(() => {
    tick++;
    bpLoadStatus();
    bpLoadLogs();
    if (tick % 6 === 0) bpLoadChart(false);
  }, 10000);
}

function stopBotAutoRefresh() {
  if (_bpRefreshTimer) {
    clearInterval(_bpRefreshTimer);
    _bpRefreshTimer = null;
  }
}


