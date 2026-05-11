/* BINANCE FUTURES TRADING - MINIMAL VERSION */

// Global state
let currentFutPair = 'ETHUSDT';
let orderBookUpdateInterval = null;
let marketTradesUpdateInterval = null;
let futuresAccountPositionsInterval = null;
let futuresPositionsInterval = null;
let futuresLeverageBrackets = [];
let futuresLeverageBracketSymbol = null;

/** Hardcoded fallback bracket table for ETHUSDT (Binance Demo Testnet)
 *  Used when API bracket data fails to load.
 *  Confirmed: Demo 100x max ≈ $100,000 notional */
const ETHUSDT_FALLBACK_BRACKETS = [
  { initialLeverage: 100, notionalFloor: 0,        notionalCap: 100000 },
  { initialLeverage: 75,  notionalFloor: 100000,   notionalCap: 250000 },
  { initialLeverage: 50,  notionalFloor: 250000,   notionalCap: 1000000 },
  { initialLeverage: 25,  notionalFloor: 1000000,  notionalCap: 5000000 },
  { initialLeverage: 10,  notionalFloor: 5000000,  notionalCap: 10000000 },
  { initialLeverage: 5,   notionalFloor: 10000000, notionalCap: 25000000 },
  { initialLeverage: 2,   notionalFloor: 25000000, notionalCap: 50000000 },
  { initialLeverage: 1,   notionalFloor: 50000000, notionalCap: 100000000 }
];
/** Binance GET /fapi/v1/positionSide/dual — emirlerde positionSide gerekir */
let futuresHedgeMode = false;

/**
 * Admin API ekranından kaydedilen anahtarlar (bot_configs) ile uyumlu:
 * önce kaldıraç, sonra POST /api/binance/order — /api/binance/futures/order diye bir route yok.
 */
/** Binance API hata mesajını kullanıcı dostu Türkçe'ye çevir */
function formatBinanceError(err) {
  if (!err || typeof err !== 'string') return err || 'Operation failed';
  const s = err.toLowerCase();
  if (s.includes('insufficient') || s.includes('balance')) return 'Insufficient balance';
  if (s.includes('min notional') || s.includes('minnotional')) return 'Minimum order value not met';
  if (s.includes('precision') || s.includes('lot size') || s.includes('-1111')) return 'Invalid quantity or price precision';
  if (s.includes('price')) return 'Invalid price';
  if (s.includes('quantity') || s.includes('qty')) return 'Invalid quantity';
  if (s.includes('leverage') || s.includes('kaldıraç')) return err;
  if (s.includes('reduce only') || s.includes('reduceonly')) return 'Reduce-only rule violated';
  if (s.includes('position') && s.includes('close')) return 'Pozisyon kapatılamadı';
  if (s.includes('timestamp')) return 'Zaman uyumsuzluğu - saati kontrol edin';
  if (s.includes('signature') || s.includes('api')) return 'API anahtarı hatası';
  if (s.includes('rate limit')) return 'Çok fazla istek - biraz bekleyin';
  return err;
}

/** "10x" veya eleman metninden kaldıraç (1-100). */
function parseFutLeverage(value) {
  if (value == null) return 10;
  const s = typeof value === 'string' ? value : (value.textContent != null ? value.textContent : String(value));
  const n = parseInt(String(s).replace(/[^0-9]/g, ''), 10);
  if (!isFinite(n) || n < 1) return 10;
  return Math.min(100, n);
}

/** Demo USDT-M ETHUSDT: genelde adım 0.001 (Binance -1111 hatasını azaltır). */
function futuresRoundQtyBase(qty) {
  const n = parseFloat(qty);
  if (!isFinite(n) || n <= 0) return null;
  const step = 0.001;
  const rounded = Math.floor(n / step) * step;
  if (rounded < step) return null;
  return parseFloat(rounded.toFixed(3));
}

async function refreshFuturesDualSide() {
  if (!AUTH?.token) {
    futuresHedgeMode = false;
    const b = document.getElementById('fut-hedge-badge');
    if (b) b.textContent = '';
    return;
  }
  try {
    const r = await fetch(API + '/binance/dual-side', { headers: { Authorization: 'Bearer ' + AUTH.token } });
    const d = await r.json();
    futuresHedgeMode = !!d.dualSidePosition;
    const badge = document.getElementById('fut-hedge-badge');
    if (badge) badge.textContent = futuresHedgeMode ? 'Hedge' : 'One-way';
  } catch (e) {
    futuresHedgeMode = false;
    const badge = document.getElementById('fut-hedge-badge');
    if (badge) badge.textContent = '';
  }
}

function futuresApplyHedgeToOpenOrder(orderData) {
  if (!futuresHedgeMode) return;
  if (orderData.side === 'BUY') orderData.positionSide = 'LONG';
  else if (orderData.side === 'SELL') orderData.positionSide = 'SHORT';
}

function normalizeFutLeverageBrackets(data) {
  const brackets = Array.isArray(data?.brackets) ? data.brackets : [];
  return brackets
    .map(b => ({
      initialLeverage: Number(b.initialLeverage),
      notionalFloor: Number(b.notionalFloor || 0),
      notionalCap: Number(b.notionalCap)
    }))
    .filter(b => Number.isFinite(b.initialLeverage) && Number.isFinite(b.notionalCap) && b.notionalCap > 0)
    .sort((a, b) => a.notionalCap - b.notionalCap);
}

async function loadFutLeverageBrackets(force = false) {
  if (!AUTH?.token) return futuresLeverageBrackets;
  if (!force && futuresLeverageBracketSymbol === currentFutPair && futuresLeverageBrackets.length) {
    return futuresLeverageBrackets;
  }

  try {
    const response = await fetch(`${API}/binance/leverage-bracket?symbol=${encodeURIComponent(currentFutPair)}`, {
      headers: { Authorization: 'Bearer ' + AUTH.token }
    });
    if (!response.ok) {
      console.warn('[FUTURES] Bracket API returned', response.status);
      return futuresLeverageBrackets;
    }
    const data = await response.json();
    console.log('[FUTURES] Bracket API raw data:', JSON.stringify(data));
    futuresLeverageBrackets = normalizeFutLeverageBrackets(data);
    console.log('[FUTURES] Normalized brackets:', futuresLeverageBrackets.length, 'entries');
    if (futuresLeverageBrackets.length > 0) {
      console.log('[FUTURES] 100x max notional:', getFutMaxNotionalForLeverage(100));
    }
    futuresLeverageBracketSymbol = currentFutPair;
    updateFutLongCost();
    updateFutShortCost();
    updateMaxPosition();
  } catch (e) {
    console.warn('[FUTURES] Leverage bracket load failed:', e);
  }

  return futuresLeverageBrackets;
}

async function ensureFutLeverageBrackets() {
  if (!futuresLeverageBrackets.length || futuresLeverageBracketSymbol !== currentFutPair) {
    await loadFutLeverageBrackets(true);
  }
}

function getFutMaxNotionalForLeverage(leverage) {
  const lev = parseFutLeverage(leverage);
  // Use loaded brackets, or fallback if empty
  let brackets = futuresLeverageBrackets;
  if (!brackets.length) {
    console.warn('[FUTURES] No bracket data loaded, using fallback for', currentFutPair);
    brackets = ETHUSDT_FALLBACK_BRACKETS;
  }
  // Find the bracket that exactly matches the requested leverage tier
  // Binance brackets: each tier has a max leverage and a notionalCap
  // For a given leverage, the applicable bracket is the one where initialLeverage >= lev
  // and it has the SMALLEST notionalCap (most restrictive for high leverage)
  const eligible = brackets.filter(b => b.initialLeverage >= lev);
  if (!eligible.length) {
    // No bracket supports this leverage, use the highest bracket as fallback
    const highest = brackets.reduce((a, b) => a.initialLeverage > b.initialLeverage ? a : b, brackets[0]);
    return highest ? highest.notionalCap : 10000;
  }
  return Math.min(...eligible.map(b => b.notionalCap));
}

function futFmtTime(ms) {
  if (ms == null || ms === '') return '—';
  try {
    return new Date(ms).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'medium' });
  } catch (e) {
    return '—';
  }
}

function escapeHtmlAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function futFmtUsd(value, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function parseFutMoneyText(text) {
  const n = Number(String(text || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function futFmtSignedUsd(value, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  return sign + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

const FUT_BOTTOM_PANEL_LABELS = {
  positions: 'Positions',
  'open-orders': 'Open Orders',
  'order-history': 'Order History',
  'trade-history': 'Trade History',
  assets: 'Assets'
};

function updateFutBottomPanelTitle(tab) {
  const titleEl = document.getElementById('fut-bottom-panel-title');
  if (!titleEl) return;
  const label = FUT_BOTTOM_PANEL_LABELS[tab] || 'Positions';
  if (tab === 'assets') {
    titleEl.innerHTML = 'Assets <span style="opacity:0.75;font-weight:500;font-size:10px;margin-left:6px">(USDT-M cüzdan)</span>';
  } else {
    titleEl.innerHTML = label + ' — <span id="fut-bottom-pair-label">' + currentFutPair + '</span>';
  }
}

async function binanceFuturesSendOrder(leverage, orderBody) {
  const sym = orderBody.symbol || currentFutPair;
  const lev = parseFutLeverage(leverage);
  
  console.log('[ORDER] Sending order:', {
    symbol: sym,
    leverage: lev,
    orderBody: orderBody
  });
  
  if (AUTH?.token) {
    const leverageRes = await fetch(API + '/binance/leverage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AUTH.token },
      body: JSON.stringify({ symbol: sym, leverage: lev })
    });
    
    if (!leverageRes.ok) {
      const leverageError = await leverageRes.json();
      console.error('[ORDER] Leverage set failed:', leverageError);
    } else {
      console.log('[ORDER] Leverage set to', lev + 'x');
    }
  }
  
  const payload = { ...orderBody };
  delete payload.leverage;
  
  if (payload.quantity != null) {
    const rq = futuresRoundQtyBase(payload.quantity);
    if (rq != null) payload.quantity = rq;
  }
  
  console.log('[ORDER] Final payload:', payload);
  
  const response = await fetch(API + '/binance/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AUTH.token },
    body: JSON.stringify(payload)
  });
  
  const responseData = await response.json();
  console.log('[ORDER] Response:', response.status, responseData);
  
  // Return a new response with the data
  return new Response(JSON.stringify(responseData), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Initialize
async function initBinanceTrading() {
  console.log('[FUTURES] Initializing...');
  
  // Restore saved leverage values
  const savedLongLeverage = localStorage.getItem('fut-long-leverage');
  const savedShortLeverage = localStorage.getItem('fut-short-leverage');
  
  if (savedLongLeverage) {
    const lev = parseFutLeverage(savedLongLeverage);
    document.getElementById('fut-long-leverage-value').textContent = lev + 'x';
    localStorage.setItem('fut-long-leverage', lev);
  }
  
  if (savedShortLeverage) {
    const lev = parseFutLeverage(savedShortLeverage);
    document.getElementById('fut-short-leverage-value').textContent = lev + 'x';
    localStorage.setItem('fut-short-leverage', lev);
  }
  
  await loadFuturesPage();
  startBinanceAutoRefresh();
  
  // Auto-fill current price after a short delay
  setTimeout(() => {
    fillCurrentPrice();
  }, 1000);
}

// Fill current price into inputs
function fillCurrentPrice() {
  const priceEl = document.getElementById('fut-current-price');
  if (priceEl && priceEl.textContent && priceEl.textContent !== '—') {
    const currentPrice = priceEl.textContent.replace(/[^0-9.]/g, '');
    
    const longPriceInput = document.getElementById('fut-long-price');
    const shortPriceInput = document.getElementById('fut-short-price');
    
    if (longPriceInput && !longPriceInput.value) {
      longPriceInput.value = currentPrice;
      updateFutLongCost();
    }
    
    if (shortPriceInput && !shortPriceInput.value) {
      shortPriceInput.value = currentPrice;
      updateFutShortCost();
    }
  }
}

// Load all data
async function loadFuturesPage() {
  console.log('[FUTURES] Loading page data...');
  const active = document.querySelector('.binance-bottom-tab.active');
  const tabNow = (active && active.dataset && active.dataset.tab) || 'positions';
  updateFutBottomPanelTitle(tabNow);
  
  // Load fast public data sequentially to avoid connection flood
  await loadFutOrderBook();
  await loadFutMarketTrades();
  await loadFut24hStats();
  
  if (AUTH && AUTH.token) {
    // Load slower private data sequentially
    await loadFutAccountInfo();
    await loadFutLeverageBrackets();
    await loadFutPositions();
    await refreshFuturesDualSide();
    await loadFutOpenOrders();
    await loadFutOrderHistory();
    await loadFutTradeHistory();
    await loadFutAssets();
  }
}

// Order Book
async function loadFutOrderBook() {
  console.log('[FUTURES] Loading order book...');
  const asksContainer = document.getElementById('fut-orderbook-asks');
  const bidsContainer = document.getElementById('fut-orderbook-bids');
  const priceEl = document.getElementById('fut-current-price');
  
  if (!asksContainer || !bidsContainer) return;
  
  try {
    const response = await fetch(`${API}/binance/public/orderbook?symbol=${currentFutPair}&limit=20`);
    const data = await response.json();
    
    const allQty = [...data.asks.slice(0,15), ...data.bids.slice(0,15)].map(([_,q]) => parseFloat(q));
    const maxQty = Math.max(...allQty);
    
    asksContainer.innerHTML = data.asks.slice(0,15).reverse().map(([price, qty]) => {
      const depth = (parseFloat(qty) / maxQty * 100).toFixed(0);
      return `<div class="binance-orderbook-row" style="--depth-color:var(--binance-red);--depth-width:${depth}%">
        <div class="binance-orderbook-cell">${futFmtUsd(price)}</div>
        <div class="binance-orderbook-cell">${parseFloat(qty).toFixed(4)}</div>
        <div class="binance-orderbook-cell">${futFmtUsd(parseFloat(price) * parseFloat(qty))}</div>
      </div>`;
    }).join('');
    
    bidsContainer.innerHTML = data.bids.slice(0,15).map(([price, qty]) => {
      const depth = (parseFloat(qty) / maxQty * 100).toFixed(0);
      return `<div class="binance-orderbook-row" style="--depth-color:var(--binance-green);--depth-width:${depth}%">
        <div class="binance-orderbook-cell">${futFmtUsd(price)}</div>
        <div class="binance-orderbook-cell">${parseFloat(qty).toFixed(4)}</div>
        <div class="binance-orderbook-cell">${futFmtUsd(parseFloat(price) * parseFloat(qty))}</div>
      </div>`;
    }).join('');
    
    if (priceEl && data.bids.length > 0) {
      const formattedPrice = futFmtUsd(data.bids[0][0]);
      priceEl.textContent = formattedPrice;
      // Update toolbar live price
      const toolbarPrice = document.getElementById('fut-toolbar-live-price');
      if (toolbarPrice) toolbarPrice.textContent = formattedPrice;
      
      // Auto-fill price inputs if empty
      const currentPrice = data.bids[0][0];
      const longPriceInput = document.getElementById('fut-long-price');
      const shortPriceInput = document.getElementById('fut-short-price');
      
      if (longPriceInput && !longPriceInput.value) {
        longPriceInput.value = parseFloat(currentPrice).toFixed(2);
        updateFutLongCost();
      }
      
      if (shortPriceInput && !shortPriceInput.value) {
        shortPriceInput.value = parseFloat(currentPrice).toFixed(2);
        updateFutShortCost();
      }
    }
    
    console.log('[FUTURES] Order book loaded');
  } catch (e) {
    console.error('[FUTURES] Order book error:', e);
  }
}

// Market Trades
async function loadFutMarketTrades() {
  console.log('[FUTURES] Loading market trades...');
  const container = document.getElementById('fut-market-trades');
  if (!container) return;
  
  try {
    const response = await fetch(`${API}/binance/public/trades?symbol=${currentFutPair}&limit=50`);
    const data = await response.json();
    
    container.innerHTML = data.slice(0,30).map(trade => {
      const isBuy = trade.isBuyerMaker === false;
      const time = new Date(trade.time).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
      return `<div class="binance-market-trades-row">
        <div class="binance-market-trades-cell" style="color:${isBuy ? 'var(--binance-green)' : 'var(--binance-red)'}">${futFmtUsd(trade.price)}</div>
        <div class="binance-market-trades-cell">${parseFloat(trade.qty).toFixed(4)}</div>
        <div class="binance-market-trades-cell">${time}</div>
      </div>`;
    }).join('');
    
    console.log('[FUTURES] Market trades loaded');
  } catch (e) {
    console.error('[FUTURES] Market trades error:', e);
  }
}

// 24h Stats
async function loadFut24hStats() {
  console.log('[FUTURES] Loading 24h stats...');
  try {
    const response = await fetch(`${API}/binance/public/ticker24h?symbol=${currentFutPair}`);
    const data = await response.json();
    
    const changeEl = document.getElementById('fut-24h-change');
    const highEl = document.getElementById('fut-24h-high');
    const lowEl = document.getElementById('fut-24h-low');
    const volumeEl = document.getElementById('fut-24h-volume');
    
    if (changeEl) {
      const change = parseFloat(data.priceChange);
      const changePercent = parseFloat(data.priceChangePercent);
      const isPositive = change >= 0;
      changeEl.textContent = `${futFmtSignedUsd(change)} ${isPositive ? '+' : ''}${changePercent.toFixed(2)}%`;
      changeEl.className = `binance-price-value ${isPositive ? 'green' : 'red'}`;
    }
    if (highEl) highEl.textContent = futFmtUsd(data.highPrice);
    if (lowEl) lowEl.textContent = futFmtUsd(data.lowPrice);
    if (volumeEl) volumeEl.textContent = '$' + (parseFloat(data.quoteVolume) / 1000000000).toFixed(2) + 'B';
    
    console.log('[FUTURES] 24h stats loaded');
  } catch (e) {
    console.error('[FUTURES] 24h stats error:', e);
  }
}

// Auto-refresh
function startBinanceAutoRefresh() {
  if (orderBookUpdateInterval) clearInterval(orderBookUpdateInterval);
  if (marketTradesUpdateInterval) clearInterval(marketTradesUpdateInterval);
  
  orderBookUpdateInterval = setInterval(() => {
    if (document.getElementById('dash-futures')?.style.display !== 'none') {
      loadFutOrderBook();
    }
  }, 3000);
  
  marketTradesUpdateInterval = setInterval(() => {
    if (document.getElementById('dash-futures')?.style.display !== 'none') {
      loadFutMarketTrades();
    }
  }, 3000);

  if (futuresAccountPositionsInterval) clearInterval(futuresAccountPositionsInterval);
  futuresAccountPositionsInterval = setInterval(async () => {
    if (document.getElementById('dash-futures')?.style.display !== 'none') {
      if (AUTH && AUTH.token) {
        await loadFutAccountInfo();
        await refreshFuturesDualSide();
        await loadFutOpenOrders();
        await loadFutOrderHistory();
        await loadFutTradeHistory();
        await loadFutAssets();
      }
    }
  }, 10000);
  
  if (futuresPositionsInterval) clearInterval(futuresPositionsInterval);
  futuresPositionsInterval = setInterval(async () => {
    if (document.getElementById('dash-futures')?.style.display !== 'none') {
      if (AUTH && AUTH.token) {
        await loadFutPositions();
      }
    }
  }, 1000);
  
  console.log('[FUTURES] Auto-refresh started');
}

function stopBinanceAutoRefresh() {
  if (orderBookUpdateInterval) clearInterval(orderBookUpdateInterval);
  if (marketTradesUpdateInterval) clearInterval(marketTradesUpdateInterval);
  if (futuresAccountPositionsInterval) clearInterval(futuresAccountPositionsInterval);
  if (futuresPositionsInterval) clearInterval(futuresPositionsInterval);
}

// Register globally
window.initBinanceTrading = initBinanceTrading;
window.stopBinanceAutoRefresh = stopBinanceAutoRefresh;

console.log('[FUTURES] Minimal version loaded');


// Account Info
async function loadFutAccountInfo() {
  console.log('[FUTURES] Loading account info...');
  try {
    const response = await fetch(`${API}/binance/account`, {
      headers: { 'Authorization': 'Bearer ' + (AUTH?.token || '') }
    });
    
    if (!response.ok) {
      const errEl = document.getElementById('fut-balance');
      if (errEl) {
        errEl.textContent = 'API not connected';
        errEl.style.color = 'var(--binance-red)';
      }
      const avL = document.getElementById('fut-long-available');
      const avS = document.getElementById('fut-short-available');
      if (avL) avL.textContent = '— Enter key in API Settings';
      if (avS) avS.textContent = '— Enter key in API Settings';
      currentBalance = 0;
      return;
    }
    
    const data = await response.json();
    const balanceEl = document.getElementById('fut-balance');
    if (balanceEl) balanceEl.style.color = '';
    updateAccountUI(data);
    console.log('[FUTURES] Account info loaded');
  } catch (e) {
    console.error('[FUTURES] Account info error:', e);
  }
}

function updateAccountUI(data) {
  const balanceEl = document.getElementById('fut-balance');
  const unrealizedPnlEl = document.getElementById('fut-unrealized-pnl');
  const marginBalanceEl = document.getElementById('fut-margin-balance');
  const marginRatioEl = document.getElementById('fut-margin-ratio');
  const marginGaugeEl = document.getElementById('fut-margin-gauge');
  const maintMarginEl = document.getElementById('fut-maint-margin');
  
  const balance = data.totalWalletBalance || 0;
  const unrealizedPnl = data.totalUnrealizedProfit || 0;
  const marginBalance = data.totalMarginBalance || (balance + unrealizedPnl);
  const availBalance = data.availableBalance ?? balance;
  const totalMaintMargin = data.totalMaintMargin || 0;
  
  // Update global balance ve available
  currentBalance = balance;
  currentAvailableBalance = availBalance;
  
  // Update available balance displays
  const avblStr = futFmtUsd(availBalance);
  const avblL = document.getElementById('fut-long-available');
  const avblS = document.getElementById('fut-short-available');
  if (avblL) avblL.textContent = avblStr;
  if (avblS) avblS.textContent = avblStr;
  
  if (balanceEl) balanceEl.textContent = futFmtUsd(balance, 4);
  if (unrealizedPnlEl) {
    unrealizedPnlEl.textContent = futFmtSignedUsd(unrealizedPnl, 4);
    unrealizedPnlEl.className = 'binance-account-value ' + (unrealizedPnl >= 0 ? 'green' : 'red');
  }
  if (marginBalanceEl) marginBalanceEl.textContent = futFmtUsd(marginBalance, 4);
  
  // Margin ratio = (totalMaintMargin / totalMarginBalance) * 100
  let marginRatio = 0;
  if (marginBalance > 0 && totalMaintMargin > 0) {
    marginRatio = (totalMaintMargin / marginBalance) * 100;
  }
  if (marginRatioEl) marginRatioEl.textContent = marginRatio.toFixed(2) + '%';
  if (marginGaugeEl) {
    marginGaugeEl.textContent = marginRatio.toFixed(0) + '%';
    marginGaugeEl.style.borderColor = marginRatio < 50 ? 'var(--binance-green)' : marginRatio < 80 ? 'var(--binance-yellow)' : 'var(--binance-red)';
  }
  if (maintMarginEl) maintMarginEl.textContent = futFmtUsd(totalMaintMargin, 4);
  
  // Single/Multi-Asset Mode butonunu güncelle
  updateFutSingleAssetButton();
}

async function updateFutSingleAssetButton() {
  const btn = document.getElementById('fut-single-asset-btn');
  if (!btn || !AUTH?.token) return;
  try {
    const r = await fetch(API + '/binance/multi-assets-mode', { headers: { Authorization: 'Bearer ' + AUTH.token } });
    const d = await r.json();
    const isMulti = !!d.multiAssetsMargin;
    btn.textContent = isMulti ? 'Multi-Asset Mode' : 'Single-Asset Mode';
    btn.title = isMulti ? 'Şu an Multi-Asset. Tıkla: Single-Asset\'e geç' : 'Şu an Single-Asset. Tıkla: Multi-Asset\'e geç';
  } catch (e) {
    btn.textContent = 'Single-Asset Mode';
  }
}

async function toggleFutSingleAssetMode() {
  if (!AUTH?.token) {
    if (typeof showNotification === 'function') showNotification('Giriş yapın', 'error');
    return;
  }
  const btn = document.getElementById('fut-single-asset-btn');
  if (btn) btn.disabled = true;
  try {
    const r = await fetch(API + '/binance/multi-assets-mode', { headers: { Authorization: 'Bearer ' + AUTH.token } });
    const d = await r.json();
    const currentlyMulti = !!d.multiAssetsMargin;
    const newMulti = !currentlyMulti;
    
    const res = await fetch(API + '/binance/multi-assets-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + AUTH.token },
      body: JSON.stringify({ multiAssetsMargin: newMulti })
    });
    const data = await res.json();
    
    if (res.ok) {
      const msg = newMulti ? 'Multi-Asset Mode active' : 'Single-Asset Mode active';
      if (typeof showNotification === 'function') showNotification(msg, 'success');
      loadFutAccountInfo();
    } else {
      if (typeof showNotification === 'function') showNotification(data.error || 'Could not be changed', 'error');
    }
  } catch (e) {
    if (typeof showNotification === 'function') showNotification('Connection error', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}


// ═══════════════════════════════════════
// TRADING FUNCTIONS
// ═══════════════════════════════════════

let currentBalance = 10000; // Will be updated from API

// Update Long Leverage (programmatic)
function setFutLongLeverage(value) {
  const el = document.getElementById('fut-long-leverage-value');
  if (el) el.textContent = value + 'x';
  localStorage.setItem('fut-long-leverage', value);
  updateFutLongCost();
}

// Update Short Leverage (programmatic)
function setFutShortLeverage(value) {
  const el = document.getElementById('fut-short-leverage-value');
  if (el) el.textContent = value + 'x';
  localStorage.setItem('fut-short-leverage', value);
  updateFutShortCost();
}

// Set Long Percentage (Binance logic: percentage of balance used as margin)
function setFutLongPercentage(percent) {
  const levEl = document.getElementById('fut-long-leverage-value');
  const leverage = parseFutLeverage(levEl?.textContent);
  const price = parseFloat(document.getElementById('fut-long-price').value) || 0;
  
  if (!price) {
    showNotification('Enter price first', 'error');
    return;
  }
  
  // Margin = (Balance * 0.98) × (percent / 100) to account for fees!
  // Size = (Margin × Leverage) / Price
  const size = getFutTradableMaxSize(leverage, price) * (percent / 100);
  
  document.getElementById('fut-long-size').value = size.toFixed(3);
  updateLongSizeSlider();
  updateFutLongCost();
}

// Set Short Percentage (Binance logic: percentage of balance used as margin)
function setFutShortPercentage(percent) {
  const levEl = document.getElementById('fut-short-leverage-value');
  const leverage = parseFutLeverage(levEl?.textContent);
  const price = parseFloat(document.getElementById('fut-short-price').value) || 0;
  
  if (!price) {
    showNotification('Enter price first', 'error');
    return;
  }
  
  // Margin = (Balance * 0.98) × (percent / 100) to account for fees!
  // Size = (Margin × Leverage) / Price
  const size = getFutTradableMaxSize(leverage, price) * (percent / 100);
  
  document.getElementById('fut-short-size').value = size.toFixed(3);
  updateShortSizeSlider();
  updateFutShortCost();
}

// Load Positions
async function loadFutPositions() {
  if (!AUTH || !AUTH.token) return;
  
  try {
    const response = await fetch(API + '/binance/positions', {
      headers: { 'Authorization': 'Bearer ' + AUTH.token }
    });
    
    if (!response.ok) return;
    
    const data = await response.json();
    const tbody = document.getElementById('fut-positions-tbody');
    
    if (!tbody) return;
    
    if (!data.positions || data.positions.length === 0) {
      tbody.innerHTML = `<tr>
        <td colspan="9" style="text-align:center;padding:60px;color:var(--binance-text-secondary)">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin:0 auto 16px;opacity:0.3">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
          </svg>
          <div>No open positions</div>
        </td>
      </tr>`;
      document.getElementById('fut-positions-count').textContent = '0';
      return;
    }
    
    document.getElementById('fut-positions-count').textContent = data.positions.length;
    window._futPositionsCache = data.positions;
    
    tbody.innerHTML = data.positions.map((pos, idx) => {
      const pnl = parseFloat(pos.unrealizedProfit || 0);
      const pnlClass = pnl >= 0 ? 'fut-pnl-green' : 'fut-pnl-red';
      const roe = parseFloat(pos.roe || 0);
      const marginRatioPct = (parseFloat(pos.marginRatio || 0) * 100).toFixed(2);
      const marginVal = parseFloat(pos.initialMargin || pos.isolatedMargin || 0);
      const posSide = pos.positionSide || (parseFloat(pos.positionAmt) > 0 ? 'LONG' : 'SHORT');
      const amt = parseFloat(pos.positionAmt);
      
      return `<tr>
        <td>${pos.symbol}</td>
        <td class="${posSide === 'LONG' ? 'fut-cell-long' : 'fut-cell-short'}">${amt}</td>
        <td>${futFmtUsd(pos.entryPrice)}</td>
        <td>${futFmtUsd(pos.markPrice || pos.lastPrice || 0)}</td>
        <td>${futFmtUsd(pos.liquidationPrice || 0)}</td>
        <td>${marginRatioPct}%</td>
        <td>${futFmtUsd(marginVal)}</td>
        <td class="${pnlClass}">${futFmtSignedUsd(pnl)} (${roe.toFixed(2)}%)</td>
        <td><button type="button" class="binance-percentage-btn" onclick="showClosePositionModal(${idx})">Kapat</button></td>
      </tr>`;
    }).join('');
    
  } catch (e) {
    console.error('Positions load error:', e);
  }
}

async function manualRefreshFutTables() {
  const btn = document.getElementById('fut-refresh-tables-btn');
  if (btn && btn.disabled) return;
  try {
    if (btn) {
      btn.disabled = true;
      btn.classList.add('is-loading');
    }
    await loadFutAccountInfo();
    await loadFutLeverageBrackets(true);
    await loadFutPositions();
    await loadFutOpenOrders();
    await loadFutOrderHistory();
    await loadFutTradeHistory();
    await loadFutAssets();
    if (typeof showNotification === 'function') {
      showNotification('Futures tablolari yenilendi', 'success');
    }
  } catch (e) {
    console.error('Manual futures tables refresh error:', e);
    if (typeof showNotification === 'function') {
      showNotification('Futures tablolari yenilenemedi', 'error');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('is-loading');
    }
  }
}

function manualRefreshFutPositions() {
  return manualRefreshFutTables();
}

async function loadFutOpenOrders() {
  if (!AUTH?.token) return;
  const tbody = document.getElementById('fut-open-orders-tbody');
  const cnt = document.getElementById('fut-open-orders-count');
  if (!tbody) return;
  try {
    const r = await fetch(API + '/binance/orders?symbol=' + encodeURIComponent(currentFutPair), {
      headers: { Authorization: 'Bearer ' + AUTH.token }
    });
    const data = await r.json();
    if (!r.ok) {
      const msg = data.error || data._error || 'Emirler yüklenemedi';
      tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:40px;color:var(--binance-red)">${msg}</td></tr>`;
      if (cnt) cnt.textContent = '0';
      return;
    }
    if (data._error && !(data.orders && data.orders.length)) {
      tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:40px;color:var(--binance-red)">${data._error}</td></tr>`;
      if (cnt) cnt.textContent = '0';
      return;
    }
    const orders = data.orders || [];
    if (cnt) cnt.textContent = String(orders.length);
    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:40px;color:var(--binance-text-secondary)">No open orders</td></tr>';
      return;
    }
    tbody.innerHTML = orders.map(o => {
      const oid = escapeHtmlAttr(String(o.orderId));
      const sym = escapeHtmlAttr(o.symbol);
      const stopStr = o.stopPrice != null && !isNaN(Number(o.stopPrice)) ? Number(o.stopPrice).toFixed(2) : '—';
      const px = o.price != null && !isNaN(Number(o.price)) ? Number(o.price).toFixed(2) : '—';
      return `<tr>
        <td>${o.symbol}</td>
        <td class="${o.side === 'BUY' ? 'fut-cell-long' : 'fut-cell-short'}">${o.side}</td>
        <td>${o.positionSide || 'BOTH'}</td>
        <td>${o.type}</td>
        <td>${o.price != null && !isNaN(Number(o.price)) ? futFmtUsd(o.price) : px}</td>
        <td>${o.stopPrice != null && !isNaN(Number(o.stopPrice)) ? futFmtUsd(o.stopPrice) : stopStr}</td>
        <td>${o.origQty}</td>
        <td>${o.executedQty}</td>
        <td>${o.reduceOnly ? 'Y' : '—'}</td>
        <td>${o.status}</td>
        <td><button type="button" class="binance-percentage-btn fut-cancel-order-btn" data-order-id="${oid}" data-symbol="${sym}">Cancel</button></td>
      </tr>`;
    }).join('');
    tbody.querySelectorAll('.fut-cancel-order-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        showCancelOrderModal(btn.dataset.orderId, btn.dataset.symbol);
      });
    });
  } catch (e) {
    console.error('[FUTURES] Open orders', e);
  }
}

async function loadFutOrderHistory() {
  if (!AUTH?.token) return;
  const tbody = document.getElementById('fut-order-history-tbody');
  if (!tbody) return;
  try {
    const r = await fetch(API + '/binance/order-history?symbol=' + encodeURIComponent(currentFutPair) + '&limit=50', {
      headers: { Authorization: 'Bearer ' + AUTH.token }
    });
    const data = await r.json();
    if (!r.ok) {
      const msg = data.error || data._error || 'Veri alınamadı';
      tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:40px;color:var(--binance-red)">${msg}</td></tr>`;
      return;
    }
    if (data._error && !(data.orders && data.orders.length)) {
      tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:40px;color:var(--binance-red)">${data._error}</td></tr>`;
      return;
    }
    const orders = data.orders || [];
    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:40px;color:var(--binance-text-secondary)">Bu sembol için emir geçmişi yok</td></tr>';
      return;
    }
    tbody.innerHTML = orders.map(o => {
      const stopStr = o.stopPrice != null && !isNaN(Number(o.stopPrice)) ? Number(o.stopPrice).toFixed(2) : '—';
      const avgStr = o.avgPrice != null && Number(o.avgPrice) > 0 ? Number(o.avgPrice).toFixed(2) : '—';
      const pxStr = o.price != null && Number(o.price) > 0 ? Number(o.price).toFixed(2) : '—';
      return `<tr>
        <td>${o.symbol}</td>
        <td class="${o.side === 'BUY' ? 'fut-cell-long' : 'fut-cell-short'}">${o.side}</td>
        <td>${o.positionSide || 'BOTH'}</td>
        <td>${o.type}</td>
        <td>${o.price != null && Number(o.price) > 0 ? futFmtUsd(o.price) : pxStr}</td>
        <td>${o.avgPrice != null && Number(o.avgPrice) > 0 ? futFmtUsd(o.avgPrice) : avgStr}</td>
        <td>${o.stopPrice != null && !isNaN(Number(o.stopPrice)) ? futFmtUsd(o.stopPrice) : stopStr}</td>
        <td>${o.origQty}</td>
        <td>${o.executedQty}</td>
        <td>${o.status}</td>
        <td>${futFmtTime(o.time)}</td>
      </tr>`;
    }).join('');
  } catch (e) {
    console.error('[FUTURES] Order history', e);
  }
}

async function loadFutTradeHistory() {
  if (!AUTH?.token) return;
  const tbody = document.getElementById('fut-trade-history-tbody');
  if (!tbody) return;
  try {
    const r = await fetch(API + '/binance/trades?symbol=' + encodeURIComponent(currentFutPair) + '&limit=50', {
      headers: { Authorization: 'Bearer ' + AUTH.token }
    });
    const data = await r.json();
    if (!r.ok) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--binance-red)">${data.error || data._error || 'Veri alınamadı'}</td></tr>`;
      return;
    }
    if (data._error && !(data.trades && data.trades.length)) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--binance-red)">${data._error}</td></tr>`;
      return;
    }
    const trades = data.trades || [];
    if (trades.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--binance-text-secondary)">Bu sembol için işlem yok</td></tr>';
      return;
    }
    tbody.innerHTML = trades.map(t => {
      const pnl = Number(t.realizedPnl || 0);
      const pnlClass = pnl >= 0 ? 'fut-pnl-green' : 'fut-pnl-red';
      return `<tr>
        <td>${t.symbol}</td>
        <td class="${t.side === 'BUY' ? 'fut-cell-long' : 'fut-cell-short'}">${t.side}</td>
        <td>${t.positionSide || 'BOTH'}</td>
        <td>${futFmtUsd(t.price)}</td>
        <td>${t.qty}</td>
        <td class="${pnlClass}">${futFmtSignedUsd(pnl, 4)}</td>
        <td>${futFmtUsd(t.commission, 4)}</td>
        <td>${futFmtTime(t.time)}</td>
      </tr>`;
    }).join('');
  } catch (e) {
    console.error('[FUTURES] Trade history', e);
  }
}

async function loadFutAssets() {
  if (!AUTH?.token) return;
  const tbody = document.getElementById('fut-assets-tbody');
  if (!tbody) return;
  try {
    const r = await fetch(API + '/binance/balances', { headers: { Authorization: 'Bearer ' + AUTH.token } });
    const data = await r.json();
    if (!r.ok) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--binance-red)">${data.error || 'Bakiye alınamadı'}</td></tr>`;
      return;
    }
    const balances = data.balances || [];
    if (balances.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--binance-text-secondary)">Bakiye yok veya API not connected</td></tr>';
      return;
    }
    tbody.innerHTML = balances.map(b => `<tr>
      <td>${b.asset}</td>
      <td>${futFmtUsd(b.balance, 8)}</td>
      <td>${futFmtUsd(b.availableBalance, 8)}</td>
      <td>${futFmtUsd(b.crossWalletBalance, 8)}</td>
      <td class="${Number(b.crossUnPnl || 0) >= 0 ? 'fut-pnl-green' : 'fut-pnl-red'}">${futFmtSignedUsd(b.crossUnPnl, 8)}</td>
    </tr>`).join('');
  } catch (e) {
    console.error('[FUTURES] Assets', e);
  }
}

let _pendingCancelOrderId = null;
let _pendingCancelSymbol = null;

function showCancelOrderModal(orderId, symbol) {
  _pendingCancelOrderId = orderId;
  _pendingCancelSymbol = symbol;
  const modal = document.getElementById('fut-cancel-order-modal');
  const btn = document.getElementById('fut-cancel-order-confirm');
  if (modal) modal.classList.add('open');
  if (btn) {
    btn.onclick = () => { closeFutCancelModal(); doCancelFutOrder(); };
  }
}

function closeFutCancelModal() {
  document.getElementById('fut-cancel-order-modal')?.classList.remove('open');
}

async function doCancelFutOrder() {
  if (!_pendingCancelOrderId || !_pendingCancelSymbol) return;
  const orderId = _pendingCancelOrderId;
  const symbol = _pendingCancelSymbol;
  _pendingCancelOrderId = _pendingCancelSymbol = null;
  try {
    const r = await fetch(API + '/binance/order/' + orderId + '?symbol=' + encodeURIComponent(symbol), {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + AUTH.token }
    });
    const data = await r.json();
    if (r.ok) {
      showNotification('Order cancelled', 'success');
      loadFutOpenOrders();
      loadFutOrderHistory();
    } else {
      showNotification(formatBinanceError(data.error) || 'Cancel başarısız', 'error');
    }
  } catch (e) {
    showNotification('Connection error', 'error');
  }
}

function showClosePositionModal(posIndex) {
  const cache = window._futPositionsCache;
  if (!cache || !cache[posIndex]) return;
  const pos = cache[posIndex];
  const pnl = parseFloat(pos.unrealizedProfit || 0);
  const posSide = pos.positionSide || (parseFloat(pos.positionAmt) > 0 ? 'LONG' : 'SHORT');
  const amt = parseFloat(pos.positionAmt);
  const entryPrice = futFmtUsd(pos.entryPrice || 0);
  const markPrice = futFmtUsd(pos.markPrice || pos.lastPrice || 0);
  const liqPrice = futFmtUsd(pos.liquidationPrice || 0);
  const marginRatioPct = (parseFloat(pos.marginRatio || 0) * 100).toFixed(2);
  const marginVal = futFmtUsd(pos.initialMargin || pos.isolatedMargin || 0);
  const roe = parseFloat(pos.roe || 0).toFixed(2);
  const lev = pos.leverage || 1;
  
  const pnlClass = pnl >= 0 ? 'pnl-positive' : 'pnl-negative';
  
  const html = `
    <div class="fut-close-details-grid">
      <div class="fut-close-detail-row"><span class="fut-close-detail-label">Sembol</span><span class="fut-close-detail-value">${pos.symbol}</span></div>
      <div class="fut-close-detail-row"><span class="fut-close-detail-label">Yön</span><span class="fut-close-detail-value ${posSide === 'LONG' ? 'fut-cell-long' : 'fut-cell-short'}">${posSide}</span></div>
      <div class="fut-close-detail-row"><span class="fut-close-detail-label">Pozisyon</span><span class="fut-close-detail-value">${amt}</span></div>
      <div class="fut-close-detail-row"><span class="fut-close-detail-label">Kaldıraç</span><span class="fut-close-detail-value">${lev}x</span></div>
      <div class="fut-close-detail-row"><span class="fut-close-detail-label">Entry Price</span><span class="fut-close-detail-value">${entryPrice}</span></div>
      <div class="fut-close-detail-row"><span class="fut-close-detail-label">Mark Price</span><span class="fut-close-detail-value">${markPrice}</span></div>
      <div class="fut-close-detail-row"><span class="fut-close-detail-label">Liq. Price</span><span class="fut-close-detail-value">${liqPrice}</span></div>
      <div class="fut-close-detail-row"><span class="fut-close-detail-label">Margin</span><span class="fut-close-detail-value">${marginVal}</span></div>
      <div class="fut-close-detail-row"><span class="fut-close-detail-label">Margin Ratio</span><span class="fut-close-detail-value">${marginRatioPct}%</span></div>
      <div class="fut-close-detail-row"><span class="fut-close-detail-label">ROE</span><span class="fut-close-detail-value">${roe}%</span></div>
      <div class="fut-close-detail-row" style="grid-column:1/-1;margin-top:8px;padding-top:12px;border-top:1px solid var(--binance-border)">
        <span class="fut-close-detail-label">Bekleyen PnL</span>
        <span class="fut-close-detail-value ${pnlClass}">${futFmtSignedUsd(pnl)}</span>
      </div>
    </div>
    <p style="margin-top:16px;font-size:12px;color:var(--binance-text-secondary)">Bu pozisyonu kapatmak istediğinizden emin misiniz?</p>
  `;
  
  const detailsEl = document.getElementById('fut-close-position-details');
  if (detailsEl) detailsEl.innerHTML = html;
  
  const modal = document.getElementById('fut-close-position-modal');
  const btn = document.getElementById('fut-close-position-confirm');
  if (modal) modal.classList.add('open');
  if (btn) {
    btn.onclick = () => {
      closeFutCloseModal();
      doCloseFutPosition(pos.symbol, posSide, amt);
    };
  }
}

function closeFutCloseModal() {
  document.getElementById('fut-close-position-modal')?.classList.remove('open');
}

async function doCloseFutPosition(symbol, positionSide, positionAmt) {
  const amt = parseFloat(positionAmt);
  if (!symbol || !amt) {
    showNotification('Geçersiz pozisyon', 'error');
    return;
  }
  const qtyRounded = futuresRoundQtyBase(Math.abs(amt));
  if (qtyRounded == null) {
    showNotification('Kapatma miktarı geçersiz', 'error');
    return;
  }
  let closeSide;
  if (positionSide === 'SHORT') closeSide = 'BUY';
  else if (positionSide === 'LONG') closeSide = 'SELL';
  else closeSide = amt > 0 ? 'SELL' : 'BUY';
  
  try {
    const closeBody = {
      symbol,
      side: closeSide,
      type: 'MARKET',
      quantity: qtyRounded,
      reduceOnly: true
    };
    if (futuresHedgeMode && (positionSide === 'LONG' || positionSide === 'SHORT')) {
      closeBody.positionSide = positionSide;
    }
    const response = await fetch(API + '/binance/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AUTH.token
      },
      body: JSON.stringify(closeBody)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showNotification('Position closed', 'success');
      loadFutPositions();
      loadFutOpenOrders();
      loadFutOrderHistory();
      loadFutTradeHistory();
      loadFutAccountInfo();
    } else {
      showNotification('Pozisyon kapatılamadı: ' + formatBinanceError(data.error), 'error');
    }
  } catch (e) {
    console.error('Close position error:', e);
    showNotification('Connection error', 'error');
  }
}

// Switch Bottom Tab
function switchFutBottomTab(tab) {
  document.querySelectorAll('.binance-orders-table').forEach(t => { t.style.display = 'none'; });
  if (tab === 'positions') {
    const pt = document.getElementById('fut-positions-table');
    if (pt) pt.style.display = 'table';
    loadFutPositions();
  }
  if (tab === 'open-orders') {
    const ot = document.getElementById('fut-open-orders-table');
    if (ot) ot.style.display = 'table';
    loadFutOpenOrders();
  }
  if (tab === 'order-history') {
    const ht = document.getElementById('fut-order-history-table');
    if (ht) ht.style.display = 'table';
    loadFutOrderHistory();
  }
  if (tab === 'trade-history') {
    const tt = document.getElementById('fut-trade-history-table');
    if (tt) tt.style.display = 'table';
    loadFutTradeHistory();
  }
  if (tab === 'assets') {
    const at = document.getElementById('fut-assets-table');
    if (at) at.style.display = 'table';
    loadFutAssets();
  }
  const order = ['positions', 'open-orders', 'order-history', 'trade-history', 'assets'];
  const idx = order.indexOf(tab);
  document.querySelectorAll('.binance-bottom-tab').forEach((el, i) => {
    el.classList.toggle('active', idx === i);
  });
  updateFutBottomPanelTitle(tab);
}

// Make functions globally available
window.updateFutLongCost = updateFutLongCost;
window.updateFutShortCost = updateFutShortCost;
window.setFutLongPercentage = setFutLongPercentage;
window.setFutShortPercentage = setFutShortPercentage;
window.loadFutPositions = loadFutPositions;
window.manualRefreshFutTables = manualRefreshFutTables;
window.manualRefreshFutPositions = manualRefreshFutPositions;
window.loadFutOpenOrders = loadFutOpenOrders;
window.showCancelOrderModal = showCancelOrderModal;
window.showClosePositionModal = showClosePositionModal;
window.closeFutCancelModal = closeFutCancelModal;
window.closeFutCloseModal = closeFutCloseModal;
window.switchFutBottomTab = switchFutBottomTab;

console.log('[FUTURES] Trading functions loaded');


// ═══════════════════════════════════════
// LEVERAGE MODAL
// ═══════════════════════════════════════

let currentLeverageType = 'long'; // 'long', 'short' veya 'both'
let tempLeverage = 10;
let currentAvailableBalance = 0; // Max hesaplaması için kullanılır

function openLeverageModal(type) {
  currentLeverageType = type;
  
  // Mevcut kaldıraç değerini oku: long/short/both için ilgili span'dan
  let currentLeverage = 10;
  if (type === 'long') {
    const el = document.getElementById('fut-long-leverage-value');
    currentLeverage = el ? parseFutLeverage(el.textContent) : parseInt(localStorage.getItem('fut-long-leverage')) || 10;
  } else if (type === 'short') {
    const el = document.getElementById('fut-short-leverage-value');
    currentLeverage = el ? parseFutLeverage(el.textContent) : parseInt(localStorage.getItem('fut-short-leverage')) || 10;
  } else {
    const longEl = document.getElementById('fut-long-leverage-value');
    currentLeverage = longEl ? parseFutLeverage(longEl.textContent) : parseInt(localStorage.getItem('fut-long-leverage')) || 10;
  }
  
  tempLeverage = Math.max(1, Math.min(100, currentLeverage));
  const slider = document.getElementById('modal-leverage-slider');
  if (slider) {
    slider.value = tempLeverage;
    slider.setAttribute('value', tempLeverage);
  }
  const valEl = document.getElementById('modal-leverage-value');
  if (valEl) valEl.textContent = tempLeverage + 'x';
  updateMaxPosition();
  
  document.getElementById('leverage-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLeverageModal() {
  document.getElementById('leverage-modal').classList.remove('open');
  document.body.style.overflow = '';
}

function updateModalLeverage(value) {
  tempLeverage = Math.max(1, Math.min(100, parseInt(value) || 10));
  const slider = document.getElementById('modal-leverage-slider');
  if (slider) slider.value = tempLeverage;
  const valEl = document.getElementById('modal-leverage-value');
  if (valEl) valEl.textContent = tempLeverage + 'x';
  updateMaxPosition();
}

function increaseLeverage() {
  if (tempLeverage < 100) {
    tempLeverage++;
    document.getElementById('modal-leverage-slider').value = tempLeverage;
    document.getElementById('modal-leverage-value').textContent = tempLeverage + 'x';
    updateMaxPosition();
  }
}

function decreaseLeverage() {
  if (tempLeverage > 1) {
    tempLeverage--;
    document.getElementById('modal-leverage-slider').value = tempLeverage;
    document.getElementById('modal-leverage-value').textContent = tempLeverage + 'x';
    updateMaxPosition();
  }
}

function updateMaxPosition() {
  const bal = getFutUsableBalance();
  const bracketNotional = getFutMaxNotionalForLeverage(tempLeverage);
  const maxNotional = Math.min(bal * tempLeverage, bracketNotional);
  const el = document.getElementById('modal-max-position');
  if (el) el.textContent = futFmtUsd(Number.isFinite(maxNotional) ? maxNotional : bal * tempLeverage, 0);
}

function confirmLeverage() {
  const lev = tempLeverage;
  
  // Long ve/veya Short kaldıraç değerlerini güncelle
  if (currentLeverageType === 'long' || currentLeverageType === 'both') {
    const longEl = document.getElementById('fut-long-leverage-value');
    if (longEl) longEl.textContent = lev + 'x';
    localStorage.setItem('fut-long-leverage', lev);
  }
  if (currentLeverageType === 'short' || currentLeverageType === 'both') {
    const shortEl = document.getElementById('fut-short-leverage-value');
    if (shortEl) shortEl.textContent = lev + 'x';
    localStorage.setItem('fut-short-leverage', lev);
  }
  localStorage.setItem('fut-leverage', lev);
  
  // Header'daki kaldıraç gösterimini güncelle
  const displayEl = document.getElementById('fut-leverage-display');
  if (displayEl) displayEl.textContent = lev + 'x';
  
  // Cost/max hesaplamalarını yenile
  updateFutLongCost();
  updateFutShortCost();
  
  closeLeverageModal();
  
  const msg = `Kaldıraç ${lev}x olarak ayarlandı`;
  if (typeof showNotification === 'function') {
    showNotification(msg, 'success');
  } else if (typeof showToast === 'function') {
    showToast('success', msg);
  }
}

/** Sembolden base asset çıkar (ETHUSDT->ETH, BTCUSDT->BTC) */
function getFutBaseAsset() {
  const s = (currentFutPair || 'ETHUSDT').toUpperCase();
  if (s.endsWith('USDT')) return s.slice(0, -4);
  if (s.endsWith('BUSD')) return s.slice(0, -4);
  return 'ETH';
}

function getFutUsableBalance() {
  const displayed = [
    parseFutMoneyText(document.getElementById('fut-long-available')?.textContent),
    parseFutMoneyText(document.getElementById('fut-short-available')?.textContent)
  ].filter(v => v > 0);
  const displayBalance = displayed.length ? Math.min(...displayed) : 0;
  const stateBalance = currentAvailableBalance > 0 ? currentAvailableBalance : currentBalance;
  if (displayBalance > 0 && stateBalance > 0) return Math.min(displayBalance, stateBalance);
  return displayBalance > 0 ? displayBalance : stateBalance;
}

function getFutOrderPrice(side) {
  const priceEl = document.getElementById(side === 'short' ? 'fut-short-price' : 'fut-long-price');
  const currentPriceEl = document.getElementById('fut-current-price');
  let price = parseFloat(priceEl?.value) || 0;
  if (price <= 0 && currentPriceEl?.textContent) {
    price = parseFloat(String(currentPriceEl.textContent).replace(/[^0-9.]/g, '')) || 0;
  }
  return price;
}

function getFutMaxSize(leverage, price) {
  const bal = getFutUsableBalance();
  if (price <= 0) return 0;
  const balanceNotional = bal * leverage;
  const bracketNotional = getFutMaxNotionalForLeverage(leverage);
  const maxNotional = Math.min(balanceNotional, bracketNotional);
  return Number.isFinite(maxNotional) && maxNotional > 0 ? maxNotional / price : balanceNotional / price;
}

function getFutTradableMaxSize(leverage, price) {
  const max = getFutMaxSize(leverage, price);
  return max > 0 ? max * 0.98 : 0;
}

function clampFutSizeInput(side, leverage, price) {
  const sizeEl = document.getElementById(side === 'short' ? 'fut-short-size' : 'fut-long-size');
  if (!sizeEl || price <= 0) return 0;
  const safeMax = getFutTradableMaxSize(leverage, price);
  let size = parseFloat(sizeEl.value) || 0;
  if (safeMax > 0 && size > safeMax) {
    size = futuresRoundQtyBase(safeMax) || safeMax;
    sizeEl.value = size.toFixed(3);
  }
  return size;
}

function setFutBudgetState(costEl, maxEl, cost, max, size) {
  const bal = getFutUsableBalance();
  const isOverBudget = cost > bal + 0.01 || (max > 0 && size > max + 0.0005);
  if (costEl) {
    costEl.textContent = futFmtUsd(cost);
    costEl.style.color = isOverBudget ? 'var(--binance-red)' : '';
  }
  if (maxEl) {
    maxEl.style.color = isOverBudget ? 'var(--binance-red)' : '';
  }
}

function validateFutOrderBudget(side, size, leverage, price) {
  if (!price || !size || !leverage) return true;

  const cost = (price * size) / leverage;
  const requestedNotional = price * size;
  const bal = getFutUsableBalance();
  const max = getFutMaxSize(leverage, price);
  const bracketNotional = getFutMaxNotionalForLeverage(leverage);

  if (cost > bal + 0.01 || (max > 0 && size > max + 0.0005)) {
    const baseAsset = getFutBaseAsset();
    const bracketText = Number.isFinite(bracketNotional) && requestedNotional > bracketNotional
      ? ` Binance ${leverage}x icin maksimum pozisyon degeri ${futFmtUsd(bracketNotional, 0)}.`
      : '';
    showNotification(
      `Pozisyon boyutu limiti asiyor. Maksimum: ${max.toFixed(3)} ${baseAsset}.${bracketText} Gerekli teminat: ${futFmtUsd(cost)}, kullanilabilir: ${futFmtUsd(bal)}.`,
      'error'
    );
    return false;
  }

  return true;
}

// Update cost functions - liq price size slider ile birlikte güncellenir
function updateFutLongCost() {
  const priceEl = document.getElementById('fut-long-price');
  const sizeEl = document.getElementById('fut-long-size');
  const levEl = document.getElementById('fut-long-leverage-value');
  const currentPriceEl = document.getElementById('fut-current-price');
  let price = parseFloat(priceEl?.value) || 0;
  if (price <= 0 && currentPriceEl?.textContent) {
    price = parseFloat(String(currentPriceEl.textContent).replace(/[^0-9.]/g, '')) || 0;
  }
  const leverage = parseFutLeverage(levEl?.textContent);
  const size = clampFutSizeInput('long', leverage, price);
  const bal = getFutUsableBalance();
  
  const cost = price > 0 && size > 0 ? (price * size) / leverage : 0;
  const max = getFutMaxSize(leverage, price);
  
  const baseAsset = getFutBaseAsset();
  const costEl = document.getElementById('fut-long-cost');
  const maxEl = document.getElementById('fut-long-max');
  const liqEl = document.getElementById('fut-long-liq-price');
  if (maxEl) {
    const maxNotional = (max || 0) * price;
    maxEl.textContent = futFmtUsd(maxNotional, 2) + ' USDT';
  }
  setFutBudgetState(costEl, maxEl, cost, max, size);
  
  if (price > 0 && size > 0 && leverage > 0 && liqEl) {
    const mmr = 0.004;
    const liqPrice = price * (1 - (1 / leverage) + mmr);
    liqEl.textContent = futFmtUsd(liqPrice);
  } else if (liqEl) {
    liqEl.textContent = '—';
  }
}

function updateFutShortCost() {
  const priceEl = document.getElementById('fut-short-price');
  const sizeEl = document.getElementById('fut-short-size');
  const levEl = document.getElementById('fut-short-leverage-value');
  const currentPriceEl = document.getElementById('fut-current-price');
  let price = parseFloat(priceEl?.value) || 0;
  if (price <= 0 && currentPriceEl?.textContent) {
    price = parseFloat(String(currentPriceEl.textContent).replace(/[^0-9.]/g, '')) || 0;
  }
  const leverage = parseFutLeverage(levEl?.textContent);
  const size = clampFutSizeInput('short', leverage, price);
  const bal = getFutUsableBalance();
  
  const cost = price > 0 && size > 0 ? (price * size) / leverage : 0;
  const max = getFutMaxSize(leverage, price);
  
  const baseAsset = getFutBaseAsset();
  const costEl = document.getElementById('fut-short-cost');
  const maxEl = document.getElementById('fut-short-max');
  const liqEl = document.getElementById('fut-short-liq-price');
  if (maxEl) {
    const maxNotional = (max || 0) * price;
    maxEl.textContent = futFmtUsd(maxNotional, 2) + ' USDT';
  }
  setFutBudgetState(costEl, maxEl, cost, max, size);
  
  if (price > 0 && size > 0 && leverage > 0 && liqEl) {
    const mmr = 0.004;
    const liqPrice = price * (1 + (1 / leverage) - mmr);
    liqEl.textContent = futFmtUsd(liqPrice);
  } else if (liqEl) {
    liqEl.textContent = '—';
  }
}

function setFutLongPercentage(percent) {
  const leverage = parseInt(document.getElementById('fut-long-leverage-value').textContent) || 10;
  const price = parseFloat(document.getElementById('fut-long-price').value) || 0;
  
  if (!price) {
    showNotification('Enter price first', 'error');
    return;
  }
  
  const size = getFutTradableMaxSize(leverage, price) * (percent / 100);
  
  document.getElementById('fut-long-size').value = size.toFixed(3);
  
  // Update slider
  const slider = document.getElementById('fut-long-size-slider');
  slider.value = percent;
  slider.style.setProperty('--slider-progress', percent + '%');
  
  updateFutLongCost();
}

function setFutShortPercentage(percent) {
  const leverage = parseInt(document.getElementById('fut-short-leverage-value').textContent) || 10;
  const price = parseFloat(document.getElementById('fut-short-price').value) || 0;
  
  if (!price) {
    showNotification('Enter price first', 'error');
    return;
  }
  
  const size = getFutTradableMaxSize(leverage, price) * (percent / 100);
  
  document.getElementById('fut-short-size').value = size.toFixed(3);
  
  // Update slider
  const slider = document.getElementById('fut-short-size-slider');
  slider.value = percent;
  slider.style.setProperty('--slider-progress', percent + '%');
  
  updateFutShortCost();
}

// Make modal and account functions globally available
window.openLeverageModal = openLeverageModal;
window.closeLeverageModal = closeLeverageModal;
window.toggleFutSingleAssetMode = toggleFutSingleAssetMode;
window.updateModalLeverage = updateModalLeverage;
window.increaseLeverage = increaseLeverage;
window.decreaseLeverage = decreaseLeverage;
window.confirmLeverage = confirmLeverage;

console.log('[FUTURES] Leverage modal loaded');


// ═══════════════════════════════════════
// SIZE SLIDER FUNCTIONS
// ═══════════════════════════════════════

// Update Long Size from Slider
function updateLongSizeFromSlider(percent) {
  const leverage = parseInt(document.getElementById('fut-long-leverage-value').textContent) || 10;
  const price = parseFloat(document.getElementById('fut-long-price').value) || 0;
  
  if (!price) return;
  
  // Calculate max size based on balance and leverage
  const maxSize = getFutTradableMaxSize(leverage, price);
  
  // Calculate size based on percentage
  const size = (maxSize * percent) / 100;
  
  document.getElementById('fut-long-size').value = size.toFixed(3);
  
  // Update slider progress
  const slider = document.getElementById('fut-long-size-slider');
  slider.style.setProperty('--slider-progress', percent + '%');
  
  updateFutLongCost();
}

// Update Long Slider from Size Input
function updateLongSizeSlider() {
  const leverage = parseInt(document.getElementById('fut-long-leverage-value').textContent) || 10;
  const price = parseFloat(document.getElementById('fut-long-price').value) || 0;
  const size = parseFloat(document.getElementById('fut-long-size').value) || 0;
  
  if (!price) return;
  
  const maxSize = getFutTradableMaxSize(leverage, price);
  const percent = maxSize > 0 ? (size / maxSize) * 100 : 0;
  
  const slider = document.getElementById('fut-long-size-slider');
  slider.value = Math.min(100, Math.max(0, percent));
  slider.style.setProperty('--slider-progress', slider.value + '%');
}

// Update Short Size from Slider
function updateShortSizeFromSlider(percent) {
  const leverage = parseInt(document.getElementById('fut-short-leverage-value').textContent) || 10;
  const price = parseFloat(document.getElementById('fut-short-price').value) || 0;
  
  if (!price) return;
  
  // Calculate max size based on balance and leverage
  const maxSize = getFutTradableMaxSize(leverage, price);
  
  // Calculate size based on percentage
  const size = (maxSize * percent) / 100;
  
  document.getElementById('fut-short-size').value = size.toFixed(3);
  
  // Update slider progress
  const slider = document.getElementById('fut-short-size-slider');
  slider.style.setProperty('--slider-progress', percent + '%');
  
  updateFutShortCost();
}

// Update Short Slider from Size Input
function updateShortSizeSlider() {
  const leverage = parseInt(document.getElementById('fut-short-leverage-value').textContent) || 10;
  const price = parseFloat(document.getElementById('fut-short-price').value) || 0;
  const size = parseFloat(document.getElementById('fut-short-size').value) || 0;
  
  if (!price) return;
  
  const maxSize = getFutTradableMaxSize(leverage, price);
  const percent = maxSize > 0 ? (size / maxSize) * 100 : 0;
  
  const slider = document.getElementById('fut-short-size-slider');
  slider.value = Math.min(100, Math.max(0, percent));
  slider.style.setProperty('--slider-progress', slider.value + '%');
}

// Make functions globally available
window.updateLongSizeFromSlider = updateLongSizeFromSlider;
window.updateLongSizeSlider = updateLongSizeSlider;
window.updateShortSizeFromSlider = updateShortSizeFromSlider;
window.updateShortSizeSlider = updateShortSizeSlider;

console.log('[FUTURES] Size slider functions loaded');


// ═══════════════════════════════════════
// SIZE TOOLTIP FUNCTIONS
// ═══════════════════════════════════════

function showSizeTooltip(type) {
  const tooltipId = type === 'long' ? 'fut-long-size-tooltip' : 'fut-short-size-tooltip';
  const tooltip = document.getElementById(tooltipId);
  if (tooltip) {
    tooltip.classList.add('show');
  }
}

function hideSizeTooltip(type) {
  const tooltipId = type === 'long' ? 'fut-long-size-tooltip' : 'fut-short-size-tooltip';
  const tooltip = document.getElementById(tooltipId);
  if (tooltip) {
    tooltip.classList.remove('show');
  }
}

function updateSizeTooltipPosition(type, value) {
  const tooltipId = type === 'long' ? 'fut-long-size-tooltip' : 'fut-short-size-tooltip';
  const sliderId = type === 'long' ? 'fut-long-size-slider' : 'fut-short-size-slider';
  
  const tooltip = document.getElementById(tooltipId);
  const slider = document.getElementById(sliderId);
  
  if (!tooltip || !slider) return;
  
  // Update tooltip text
  tooltip.textContent = parseFloat(value).toFixed(1) + '%';
  
  // Calculate position
  const sliderWidth = slider.offsetWidth;
  const thumbWidth = 16; // Width of the thumb
  const percent = value / 100;
  const position = (sliderWidth - thumbWidth) * percent + (thumbWidth / 2);
  
  tooltip.style.left = position + 'px';
}

// Update existing slider functions to also update tooltip
function updateLongSizeFromSlider(percent) {
  const leverage = parseInt(document.getElementById('fut-long-leverage-value').textContent) || 10;
  const price = parseFloat(document.getElementById('fut-long-price').value) || 0;
  
  if (!price) return;
  
  const maxSize = getFutTradableMaxSize(leverage, price);
  const size = (maxSize * percent) / 100;
  
  document.getElementById('fut-long-size').value = size.toFixed(3);
  
  const slider = document.getElementById('fut-long-size-slider');
  slider.style.setProperty('--slider-progress', percent + '%');
  
  updateSizeTooltipPosition('long', percent);
  updateFutLongCost();
}

function updateShortSizeFromSlider(percent) {
  const leverage = parseInt(document.getElementById('fut-short-leverage-value').textContent) || 10;
  const price = parseFloat(document.getElementById('fut-short-price').value) || 0;
  
  if (!price) return;
  
  const maxSize = getFutTradableMaxSize(leverage, price);
  const size = (maxSize * percent) / 100;
  
  document.getElementById('fut-short-size').value = size.toFixed(3);
  
  const slider = document.getElementById('fut-short-size-slider');
  slider.style.setProperty('--slider-progress', percent + '%');
  
  updateSizeTooltipPosition('short', percent);
  updateFutShortCost();
}

// Make functions globally available
window.showSizeTooltip = showSizeTooltip;
window.hideSizeTooltip = hideSizeTooltip;
window.updateSizeTooltipPosition = updateSizeTooltipPosition;

console.log('[FUTURES] Size tooltip functions loaded');


// ═══════════════════════════════════════
// ORDER TYPE SWITCHING
// ═══════════════════════════════════════

let currentLongOrderType = 'limit';
let currentShortOrderType = 'limit';

function switchLongOrderType(type) {
  currentLongOrderType = type;
  
  // Update active tab
  const tabs = document.querySelectorAll('.binance-trade-form:first-child .binance-trade-tab');
  tabs.forEach((tab, index) => {
    tab.classList.remove('active');
    if ((index === 0 && type === 'limit') || (index === 1 && type === 'market') || (index === 2 && type === 'stop-limit')) {
      tab.classList.add('active');
    }
  });
  
  // Show/hide inputs based on order type
  const priceGroup = document.getElementById('fut-long-price-group');
  const stopPriceGroup = document.getElementById('fut-long-stop-price-group');
  
  if (type === 'market') {
    // Market order: hide price input
    if (priceGroup) priceGroup.style.display = 'none';
    if (stopPriceGroup) stopPriceGroup.style.display = 'none';
  } else if (type === 'stop-limit') {
    // Stop-Limit: show both stop price and limit price
    if (priceGroup) priceGroup.style.display = 'block';
    if (stopPriceGroup) stopPriceGroup.style.display = 'block';
  } else {
    // Limit order: show only price input
    if (priceGroup) priceGroup.style.display = 'block';
    if (stopPriceGroup) stopPriceGroup.style.display = 'none';
  }
}

function switchShortOrderType(type) {
  currentShortOrderType = type;
  
  // Update active tab
  const tabs = document.querySelectorAll('.binance-trade-form:last-child .binance-trade-tab');
  tabs.forEach((tab, index) => {
    tab.classList.remove('active');
    if ((index === 0 && type === 'limit') || (index === 1 && type === 'market') || (index === 2 && type === 'stop-limit')) {
      tab.classList.add('active');
    }
  });
  
  // Show/hide inputs based on order type
  const priceGroup = document.getElementById('fut-short-price-group');
  const stopPriceGroup = document.getElementById('fut-short-stop-price-group');
  
  if (type === 'market') {
    // Market order: hide price input
    if (priceGroup) priceGroup.style.display = 'none';
    if (stopPriceGroup) stopPriceGroup.style.display = 'none';
  } else if (type === 'stop-limit') {
    // Stop-Limit: show both stop price and limit price
    if (priceGroup) priceGroup.style.display = 'block';
    if (stopPriceGroup) stopPriceGroup.style.display = 'block';
  } else {
    // Limit order: show only price input
    if (priceGroup) priceGroup.style.display = 'block';
    if (stopPriceGroup) stopPriceGroup.style.display = 'none';
  }
}

// Update execute functions to handle different order types
async function executeFuturesLong() {
  const size = parseFloat(document.getElementById('fut-long-size').value);
  const levEl = document.getElementById('fut-long-leverage-value');
  const leverage = parseFutLeverage(levEl ? levEl.textContent : 10);
  
  if (!size) {
    showNotification('Enter quantity', 'error');
    return;
  }
  
  if (!AUTH || !AUTH.token) {
    showNotification('Please log in', 'error');
    return;
  }
  
  const rq = futuresRoundQtyBase(size);
  if (rq == null) {
    showNotification('Enter valid quantity (min 0.001 ETH)', 'error');
    return;
  }

  let orderData = {
    symbol: currentFutPair,
    side: 'BUY',
    quantity: rq,
    leverage: leverage
  };
  
  if (currentLongOrderType === 'market') {
    orderData.type = 'MARKET';
  } else if (currentLongOrderType === 'stop-limit') {
    const stopPrice = parseFloat(document.getElementById('fut-long-stop-price').value);
    const price = parseFloat(document.getElementById('fut-long-price').value);
    
    if (!stopPrice || !price) {
      showNotification('Enter stop price and limit price', 'error');
      return;
    }
    
    orderData.type = 'STOP';
    orderData.stopPrice = stopPrice;
    orderData.price = price;
    orderData.timeInForce = 'GTC';
  } else {
    // Limit order
    const price = parseFloat(document.getElementById('fut-long-price').value);
    
    if (!price) {
      showNotification('Enter price', 'error');
      return;
    }
    
    orderData.type = 'LIMIT';
    orderData.price = price;
    orderData.timeInForce = 'GTC';
  }

  await ensureFutLeverageBrackets();
  const effectiveLongPrice = orderData.price || getFutOrderPrice('long');
  const clampedLongSize = clampFutSizeInput('long', leverage, effectiveLongPrice);
  const longQty = futuresRoundQtyBase(clampedLongSize);
  if (longQty == null) {
    showNotification('Enter valid quantity (min 0.001 ETH)', 'error');
    return;
  }
  if (longQty < rq && typeof showNotification === 'function') {
    showNotification(`Pozisyon boyutu maksimuma cekildi: ${longQty.toFixed(3)} ${getFutBaseAsset()}`, 'success');
  }
  orderData.quantity = longQty;
  if (!validateFutOrderBudget('long', longQty, leverage, effectiveLongPrice)) {
    updateFutLongCost();
    return;
  }
  
  const btn = document.querySelector('.binance-buy-btn');
  btn.disabled = true;
  btn.textContent = 'Processing...';
  
  try {
    futuresApplyHedgeToOpenOrder(orderData);
    const response = await binanceFuturesSendOrder(orderData.leverage, orderData);
    
    const data = await response.json();
    
    if (response.ok) {
      showNotification(`Long ${currentLongOrderType} order created!`, 'success');
      document.getElementById('fut-long-price').value = '';
      document.getElementById('fut-long-size').value = '';
      if (document.getElementById('fut-long-stop-price')) {
        document.getElementById('fut-long-stop-price').value = '';
      }
      updateFutLongCost();
      loadFutAccountInfo();
      loadFutPositions();
      loadFutOpenOrders();
      loadFutOrderHistory();
      loadFutTradeHistory();
    } else {
      const errorMsg = formatBinanceError(data.error);
      
      // Insufficient balance hatası için özel mesaj
      if (errorMsg.includes('Insufficient balance') || errorMsg.toLowerCase().includes('insufficient')) {
        showNotification('⚠️ Insufficient balance! Binance Testnet hesabınıza https://demo.binance.com adresinden giriş yapıp ücretsiz test USDT alın.', 'error');
      } else {
        showNotification('Could not open position: ' + errorMsg, 'error');
      }
    }
  } catch (e) {
    console.error('Long order error:', e);
    showNotification('Connection error', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Open Long';
  }
}

async function executeFuturesShort() {
  const size = parseFloat(document.getElementById('fut-short-size').value);
  const levEl = document.getElementById('fut-short-leverage-value');
  const leverage = parseFutLeverage(levEl ? levEl.textContent : 10);
  
  if (!size) {
    showNotification('Enter quantity', 'error');
    return;
  }
  
  if (!AUTH || !AUTH.token) {
    showNotification('Please log in', 'error');
    return;
  }

  const rq = futuresRoundQtyBase(size);
  if (rq == null) {
    showNotification('Enter valid quantity (min 0.001 ETH)', 'error');
    return;
  }
  
  let orderData = {
    symbol: currentFutPair,
    side: 'SELL',
    quantity: rq,
    leverage: leverage
  };
  
  if (currentShortOrderType === 'market') {
    orderData.type = 'MARKET';
  } else if (currentShortOrderType === 'stop-limit') {
    const stopPrice = parseFloat(document.getElementById('fut-short-stop-price').value);
    const price = parseFloat(document.getElementById('fut-short-price').value);
    
    if (!stopPrice || !price) {
      showNotification('Enter stop price and limit price', 'error');
      return;
    }
    
    orderData.type = 'STOP';
    orderData.stopPrice = stopPrice;
    orderData.price = price;
    orderData.timeInForce = 'GTC';
  } else {
    // Limit order
    const price = parseFloat(document.getElementById('fut-short-price').value);
    
    if (!price) {
      showNotification('Enter price', 'error');
      return;
    }
    
    orderData.type = 'LIMIT';
    orderData.price = price;
    orderData.timeInForce = 'GTC';
  }

  await ensureFutLeverageBrackets();
  const effectiveShortPrice = orderData.price || getFutOrderPrice('short');
  const clampedShortSize = clampFutSizeInput('short', leverage, effectiveShortPrice);
  const shortQty = futuresRoundQtyBase(clampedShortSize);
  if (shortQty == null) {
    showNotification('Enter valid quantity (min 0.001 ETH)', 'error');
    return;
  }
  if (shortQty < rq && typeof showNotification === 'function') {
    showNotification(`Pozisyon boyutu maksimuma cekildi: ${shortQty.toFixed(3)} ${getFutBaseAsset()}`, 'success');
  }
  orderData.quantity = shortQty;
  if (!validateFutOrderBudget('short', shortQty, leverage, effectiveShortPrice)) {
    updateFutShortCost();
    return;
  }
  
  const btn = document.querySelector('.binance-sell-btn');
  btn.disabled = true;
  btn.textContent = 'Processing...';
  
  try {
    futuresApplyHedgeToOpenOrder(orderData);
    const response = await binanceFuturesSendOrder(orderData.leverage, orderData);
    
    const data = await response.json();
    
    if (response.ok) {
      showNotification(`Short ${currentShortOrderType} order created!`, 'success');
      document.getElementById('fut-short-price').value = '';
      document.getElementById('fut-short-size').value = '';
      if (document.getElementById('fut-short-stop-price')) {
        document.getElementById('fut-short-stop-price').value = '';
      }
      updateFutShortCost();
      loadFutAccountInfo();
      loadFutPositions();
      loadFutOpenOrders();
      loadFutOrderHistory();
      loadFutTradeHistory();
    } else {
      const errorMsg = formatBinanceError(data.error);
      
      // Insufficient balance hatası için özel mesaj
      if (errorMsg.includes('Insufficient balance') || errorMsg.toLowerCase().includes('insufficient')) {
        showNotification('⚠️ Insufficient balance! Binance Testnet hesabınıza https://demo.binance.com adresinden giriş yapıp ücretsiz test USDT alın.', 'error');
      } else {
        showNotification('Could not open position: ' + errorMsg, 'error');
      }
    }
  } catch (e) {
    console.error('Short order error:', e);
    showNotification('Connection error', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Open Short';
  }
}

// Make functions globally available
window.switchLongOrderType = switchLongOrderType;
window.switchShortOrderType = switchShortOrderType;
window.executeFuturesLong = executeFuturesLong;
window.executeFuturesShort = executeFuturesShort;

console.log('[FUTURES] Order type switching loaded');
