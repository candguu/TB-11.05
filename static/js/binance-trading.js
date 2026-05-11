/* ═══════════════════════════════════════════════════════════════
   BINANCE-STYLE TRADING INTERFACE - JavaScript Functions
═══════════════════════════════════════════════════════════════ */

// ─── Global State ───
let currentFutPair = 'ETHUSDT';
let currentFutTimeframe = '4h';
let futChart = null;
let orderBookUpdateInterval = null;
let marketTradesUpdateInterval = null;

// ─── Initialize ───
function initBinanceTrading() {
  console.log('[FUTURES] Initializing Binance Trading...');
  console.log('[FUTURES] Current pair:', currentFutPair);
  console.log('[FUTURES] Document ready state:', document.readyState);
  
  // Test API connectivity
  testBinanceAPI();
  
  // Initialize Futures chart when page is shown
  if (document.getElementById('dash-futures')) {
    console.log('[FUTURES] Futures page found, loading...');
    initFuturesChart();
    loadFuturesPage();
    startBinanceAutoRefresh();
  } else {
    console.error('[FUTURES] Futures page element not found!');
  }
}

// ─── Test API Connectivity ───
async function testBinanceAPI() {
  console.log('[FUTURES] Testing Binance API connectivity via backend...');
  try {
    const response = await fetch(API + '/binance/public/ping');
    const data = await response.json();
    
    if (response.ok && data.status === 'ok') {
      console.log('[FUTURES] ✓ Binance API is accessible via backend proxy');
    } else {
      console.error('[FUTURES] ✗ Backend proxy error:', data.message);
    }
  } catch (error) {
    console.error('[FUTURES] ✗ Backend proxy is not accessible:', error);
  }
}

// ─── Load Spot Balances ───
async function loadSpotBalances() {
  if (!AUTH || !AUTH.token) return;
  
  try {
    const res = await fetch(API + '/binance/balance', {
      headers: { 'Authorization': 'Bearer ' + AUTH.token }
    });
    
    if (!res.ok) {
      // 400 hatası - API key yapılandırılmamış, sessizce geç
      if (res.status === 400) {
        console.log('Binance API not configured yet');
        return;
      }
      throw new Error(`HTTP ${res.status}`);
    }
    
    const data = await res.json();
    
    const buyAvailEl = document.getElementById('spot-buy-available');
    const sellAvailEl = document.getElementById('spot-sell-available');
    
    if (buyAvailEl) {
      buyAvailEl.textContent = (data.availableBalance || 0).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' USDT';
    }
    if (sellAvailEl) {
      // For sell, show BTC balance (0 for now, will be updated when we have BTC)
      sellAvailEl.textContent = '0.00000000 BTC';
    }
  } catch (e) {
    console.warn('Load spot balances error:', e.message);
  }
}

// ─── Load Futures Balances ───
async function loadFutBalances() {
  if (!AUTH || !AUTH.token) return;
  
  try {
    const res = await fetch(API + '/binance/account', {
      headers: { 'Authorization': 'Bearer ' + AUTH.token }
    });
    
    if (!res.ok) {
      // 400 hatası - API key yapılandırılmamış, sessizce geç
      if (res.status === 400) {
        console.log('Binance API not configured yet');
        return;
      }
      throw new Error(`HTTP ${res.status}`);
    }
    
    const data = await res.json();
    
    // Update available balance
    const longAvailEl = document.getElementById('fut-long-available');
    const shortAvailEl = document.getElementById('fut-short-available');
    
    const available = data.availableBalance || 0;
    const availText = available.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' USDT';
    
    if (longAvailEl) longAvailEl.textContent = availText;
    if (shortAvailEl) shortAvailEl.textContent = availText;
    
    // Update account info section
    const balanceEl = document.getElementById('fut-balance');
    const unrealizedPnlEl = document.getElementById('fut-unrealized-pnl');
    const marginBalanceEl = document.getElementById('fut-margin-balance');
    const maintMarginEl = document.getElementById('fut-maint-margin');
    const marginRatioEl = document.getElementById('fut-margin-ratio');
    const marginGaugeEl = document.getElementById('fut-margin-gauge');
    
    if (balanceEl) {
      balanceEl.textContent = (data.totalWalletBalance || 0).toLocaleString('en-US', {minimumFractionDigits:4}) + ' USDT';
    }
    
    if (unrealizedPnlEl) {
      const pnl = data.totalUnrealizedProfit || 0;
      unrealizedPnlEl.textContent = pnl.toLocaleString('en-US', {minimumFractionDigits:4}) + ' USDT';
      unrealizedPnlEl.style.color = pnl >= 0 ? 'var(--binance-green)' : 'var(--binance-red)';
    }
    
    if (marginBalanceEl) {
      marginBalanceEl.textContent = (data.totalMarginBalance || 0).toLocaleString('en-US', {minimumFractionDigits:4}) + ' USDT';
    }
    
    if (maintMarginEl) {
      maintMarginEl.textContent = (data.totalMaintMargin || 0).toLocaleString('en-US', {minimumFractionDigits:4}) + ' USDT';
    }
    
    // Update margin ratio with gauge
    if (marginRatioEl && marginGaugeEl) {
      const marginRatio = data.marginRatio || 0;
      marginRatioEl.textContent = marginRatio.toFixed(2) + '%';
      
      // Update gauge width
      const gaugeWidth = Math.min(marginRatio, 100);
      marginGaugeEl.style.width = gaugeWidth + '%';
      
      // Update color based on risk level
      if (marginRatio < 50) {
        marginRatioEl.className = 'binance-account-value green';
        marginGaugeEl.style.background = 'var(--binance-green)';
      } else if (marginRatio < 80) {
        marginRatioEl.className = 'binance-account-value';
        marginRatioEl.style.color = 'var(--binance-yellow)';
        marginGaugeEl.style.background = 'var(--binance-yellow)';
      } else {
        marginRatioEl.className = 'binance-account-value';
        marginRatioEl.style.color = 'var(--binance-red)';
        marginGaugeEl.style.background = 'var(--binance-red)';
      }
    }
    
  } catch (e) {
    console.warn('Load futures balances error:', e.message);
  }
}

/* ═══════════════════════════════════════════════════════════════
// SPOT TRADING FUNCTIONS - REMOVED
// All spot trading functions have been removed as spot trading
// is no longer supported. Only Futures trading is available.
═══════════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════════════════════
// FUTURES TRADING FUNCTIONS
// ═══════════════════════════════════════════════════════════════
  const container = document.getElementById('spot-chart-container');
  if (!container) return;
  
  // Create TradingView widget
  container.innerHTML = `
    <div style="height:100%;width:100%">
      <iframe 
        src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=BINANCE:BTCUSDT&interval=240&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=dark&style=1&timezone=Etc/UTC&withdateranges=1&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=localhost&utm_medium=widget_new&utm_campaign=chart&utm_term=BINANCE:BTCUSDT"
        style="width:100%;height:100%;border:none;margin:0;padding:0"
        frameborder="0"
        allowtransparency="true"
        scrolling="no"
        allowfullscreen
      ></iframe>
    </div>
  `;
}

// ─── Order Book ───
async function loadSpotOrderBook() {
  const asksContainer = document.getElementById('spot-orderbook-asks');
  const bidsContainer = document.getElementById('spot-orderbook-bids');
  const priceEl = document.getElementById('spot-current-price');
  const changeEl = document.getElementById('spot-current-change');
  
  if (!asksContainer || !bidsContainer) return;
  
  try {
    // Fetch order book from Binance Testnet
    const response = await fetch(`https://testnet.binancefuture.com/fapi/v1/depth?symbol=${currentSpotPair}&limit=20`);
    const data = await response.json();
    
    // Render asks (sell orders) - reversed to show highest at bottom
    const asks = data.asks.slice(0, 15).reverse();
    asksContainer.innerHTML = asks.map(([price, qty]) => {
      const total = (parseFloat(price) * parseFloat(qty)).toFixed(2);
      return `
        <div class="binance-orderbook-row" style="--depth-color:var(--binance-red);--depth-width:${Math.random() * 60 + 20}%">
          <div class="binance-orderbook-cell">${parseFloat(price).toLocaleString('en-US', {minimumFractionDigits:2})}</div>
          <div class="binance-orderbook-cell">${parseFloat(qty).toFixed(5)}</div>
          <div class="binance-orderbook-cell">${total}</div>
        </div>
      `;
    }).join('');
    
    // Render bids (buy orders)
    const bids = data.bids.slice(0, 15);
    bidsContainer.innerHTML = bids.map(([price, qty]) => {
      const total = (parseFloat(price) * parseFloat(qty)).toFixed(2);
      return `
        <div class="binance-orderbook-row" style="--depth-color:var(--binance-green);--depth-width:${Math.random() * 60 + 20}%">
          <div class="binance-orderbook-cell">${parseFloat(price).toLocaleString('en-US', {minimumFractionDigits:2})}</div>
          <div class="binance-orderbook-cell">${parseFloat(qty).toFixed(5)}</div>
          <div class="binance-orderbook-cell">${total}</div>
        </div>
      `;
    }).join('');
    
    // Update current price
    if (bids.length > 0 && priceEl) {
      const currentPrice = parseFloat(bids[0][0]);
      priceEl.textContent = currentPrice.toLocaleString('en-US', {minimumFractionDigits:2});
      priceEl.className = 'binance-orderbook-spread-price green';
    }
    
  } catch (e) {
    console.warn('Order book load error:', e);
  }
}

// ─── Market Trades ───
async function loadSpotMarketTrades() {
  const container = document.getElementById('spot-market-trades');
  if (!container) return;
  
  try {
    const response = await fetch(`https://testnet.binancefuture.com/fapi/v1/trades?symbol=${currentSpotPair}&limit=50`);
    const data = await response.json();
    
    container.innerHTML = data.slice(0, 30).map(trade => {
      const price = parseFloat(trade.price);
      const qty = parseFloat(trade.qty);
      const time = new Date(trade.time).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
      const isBuy = trade.isBuyerMaker === false;
      
      return `
        <div class="binance-market-trades-row">
          <div class="binance-market-trades-cell" style="color:${isBuy ? 'var(--binance-green)' : 'var(--binance-red)'}">${price.toLocaleString('en-US', {minimumFractionDigits:2})}</div>
          <div class="binance-market-trades-cell">${qty.toFixed(5)}</div>
          <div class="binance-market-trades-cell">${time}</div>
        </div>
      `;
    }).join('');
    
  } catch (e) {
    console.warn('Market trades load error:', e);
  }
}

// ─── Pair List ───
async function loadSpotPairList() {
  const container = document.getElementById('spot-pair-list');
  if (!container) return;
  
  const pairs = [
    {symbol: 'BTCUSDT', price: 68954.63, change: 2.41},
    {symbol: 'ETHUSDT', price: 3842.15, change: 3.12},
    {symbol: 'BNBUSDT', price: 612.45, change: -1.23},
    {symbol: 'SOLUSDT', price: 142.89, change: 5.67},
    {symbol: 'XRPUSDT', price: 0.6234, change: -0.89},
    {symbol: 'ADAUSDT', price: 0.5821, change: 1.45},
    {symbol: 'DOGEUSDT', price: 0.1523, change: 4.23},
    {symbol: 'AVAXUSDT', price: 38.92, change: -2.15}
  ];
  
  container.innerHTML = pairs.map(p => {
    const isPositive = p.change >= 0;
    return `
      <div class="binance-pair-row ${p.symbol === currentSpotPair ? 'active' : ''}" onclick="selectSpotPair('${p.symbol}')">
        <div class="binance-pair-symbol">${p.symbol.replace('USDT', '/USDT')}</div>
        <div class="binance-pair-price">${p.price.toLocaleString('en-US')}</div>
        <div class="binance-pair-change ${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : ''}${p.change.toFixed(2)}%</div>
      </div>
    `;
  }).join('');
}

// ─── Trading Functions ───
function selectSpotPair(symbol) {
  currentSpotPair = symbol;
  document.getElementById('spot-current-pair').textContent = symbol.replace('USDT', '/USDT');
  loadSpotOrderBook();
  loadSpotMarketTrades();
  loadSpotPairList();
  
  // Update chart
  const container = document.getElementById('spot-chart-container');
  if (container) {
    const iframe = container.querySelector('iframe');
    if (iframe) {
      iframe.src = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=BINANCE:${symbol}&interval=240&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=dark&style=1&timezone=Etc/UTC&withdateranges=1&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=localhost&utm_medium=widget_new&utm_campaign=chart&utm_term=BINANCE:${symbol}`;
    }
  }
}

function setSpotBuyPercentage(percent) {
  const availableEl = document.getElementById('spot-buy-available');
  if (!availableEl) return;
  
  const available = parseFloat(availableEl.textContent.replace(/[^0-9.]/g, '')) || 0;
  const priceEl = document.getElementById('spot-buy-price');
  const amountEl = document.getElementById('spot-buy-amount');
  const totalEl = document.getElementById('spot-buy-total');
  
  if (!priceEl || !amountEl || !totalEl) return;
  
  let price = parseFloat(priceEl.value) || 0;
  
  // If no price entered, get current market price
  if (price <= 0) {
    const currentPriceEl = document.getElementById('spot-current-price');
    if (currentPriceEl) {
      price = parseFloat(currentPriceEl.textContent.replace(/[^0-9.]/g, '')) || 0;
      priceEl.value = price.toFixed(2);
    }
  }
  
  if (price <= 0) return;
  
  const total = (available * percent / 100);
  const amount = total / price;
  
  amountEl.value = amount.toFixed(6);
  totalEl.value = total.toFixed(2);
}

// Auto-calculate total when price or amount changes
function updateSpotBuyTotal() {
  const priceEl = document.getElementById('spot-buy-price');
  const amountEl = document.getElementById('spot-buy-amount');
  const totalEl = document.getElementById('spot-buy-total');
  
  if (!priceEl || !amountEl || !totalEl) return;
  
  const price = parseFloat(priceEl.value) || 0;
  const amount = parseFloat(amountEl.value) || 0;
  
  if (price > 0 && amount > 0) {
    totalEl.value = (price * amount).toFixed(2);
  }
}

function setSpotSellPercentage(percent) {
  const availableEl = document.getElementById('spot-sell-available');
  if (!availableEl) return;
  
  const available = parseFloat(availableEl.textContent.replace(/[^0-9.]/g, '')) || 0;
  const amountEl = document.getElementById('spot-sell-amount');
  const priceEl = document.getElementById('spot-sell-price');
  const totalEl = document.getElementById('spot-sell-total');
  
  if (!amountEl || !priceEl || !totalEl) return;
  
  const amount = (available * percent / 100);
  let price = parseFloat(priceEl.value) || 0;
  
  // If no price entered, get current market price
  if (price <= 0) {
    const currentPriceEl = document.getElementById('spot-current-price');
    if (currentPriceEl) {
      price = parseFloat(currentPriceEl.textContent.replace(/[^0-9.]/g, '')) || 0;
      priceEl.value = price.toFixed(2);
    }
  }
  
  amountEl.value = amount.toFixed(6);
  if (price > 0) {
    totalEl.value = (amount * price).toFixed(2);
  }
}

// Auto-calculate total when price or amount changes
function updateSpotSellTotal() {
  const priceEl = document.getElementById('spot-sell-price');
  const amountEl = document.getElementById('spot-sell-amount');
  const totalEl = document.getElementById('spot-sell-total');
  
  if (!priceEl || !amountEl || !totalEl) return;
  
  const price = parseFloat(priceEl.value) || 0;
  const amount = parseFloat(amountEl.value) || 0;
  
  if (price > 0 && amount > 0) {
    totalEl.value = (price * amount).toFixed(2);
  }
}

async function executeSpotBuy() {
  const symbol = currentSpotPair;
  const price = parseFloat(document.getElementById('spot-buy-price')?.value || 0);
  const amount = parseFloat(document.getElementById('spot-buy-amount')?.value || 0);
  
  if (!amount || amount <= 0) {
    showToast('error', 'Geçerli bir miktar girin');
    return;
  }
  
  if (!confirm(`${symbol} için ${amount} adet BUY emri göndermek istiyor musunuz?`)) return;
  
  showToast('info', 'Emir gönderiliyor...');
  
  try {
    const res = await fetch(API + '/binance/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AUTH.token
      },
      body: JSON.stringify({
        symbol,
        side: 'BUY',
        type: price > 0 ? 'LIMIT' : 'MARKET',
        quantity: amount,
        price: price > 0 ? price : undefined
      })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      showToast('success', 'BUY emri başarıyla oluşturuldu!');
      loadSpotData();
      switchSpotBottomTab('open-orders');
    } else {
      showToast('error', data.error || 'Emir başarısız');
    }
  } catch (e) {
    showToast('error', 'Emir hatası: ' + e.message);
  }
}

async function executeSpotSell() {
  const symbol = currentSpotPair;
  const price = parseFloat(document.getElementById('spot-sell-price')?.value || 0);
  const amount = parseFloat(document.getElementById('spot-sell-amount')?.value || 0);
  
  if (!amount || amount <= 0) {
    showToast('error', 'Geçerli bir miktar girin');
    return;
  }
  
  if (!confirm(`${symbol} için ${amount} adet SELL emri göndermek istiyor musunuz?`)) return;
  
  showToast('info', 'Emir gönderiliyor...');
  
  try {
    const res = await fetch(API + '/binance/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AUTH.token
      },
      body: JSON.stringify({
        symbol,
        side: 'SELL',
        type: price > 0 ? 'LIMIT' : 'MARKET',
        quantity: amount,
        price: price > 0 ? price : undefined
      })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      showToast('success', 'SELL emri başarıyla oluşturuldu!');
      loadSpotData();
      switchSpotBottomTab('open-orders');
    } else {
      showToast('error', data.error || 'Emir başarısız');
    }
  } catch (e) {
    showToast('error', 'Emir hatası: ' + e.message);
  }
}

// ─── Bottom Panel Tabs ───
function switchSpotBottomTab(tab) {
  const tabs = document.querySelectorAll('#dash-spot .binance-bottom-tab');
  tabs.forEach(t => t.classList.remove('active'));
  
  const activeTab = Array.from(tabs).find(t => t.getAttribute('onclick')?.includes(tab));
  if (activeTab) activeTab.classList.add('active');
  
  const content = document.getElementById('spot-bottom-content');
  if (!content) return;
  
  if (tab === 'open-orders') {
    loadSpotOpenOrders();
  } else if (tab === 'order-history') {
    content.innerHTML = '<div style="text-align:center;padding:60px;color:var(--binance-text-secondary)">Order history coming soon</div>';
  } else if (tab === 'trade-history') {
    content.innerHTML = '<div style="text-align:center;padding:60px;color:var(--binance-text-secondary)">Trade history coming soon</div>';
  } else if (tab === 'funds') {
    loadSpotFunds();
  }
}

async function loadSpotOpenOrders() {
  const content = document.getElementById('spot-bottom-content');
  if (!content) return;
  
  try {
    const res = await fetch(API + '/binance/orders', {
      headers: { 'Authorization': 'Bearer ' + AUTH.token }
    });
    const data = await res.json();
    
    if (!res.ok || !data.orders || data.orders.length === 0) {
      content.innerHTML = `
        <div style="text-align:center;padding:60px;color:var(--binance-text-secondary)">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin:0 auto 16px;opacity:0.3">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
          </svg>
          <div>You have no open orders</div>
        </div>
      `;
      return;
    }
    
    content.innerHTML = `
      <table class="binance-orders-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Pair</th>
            <th>Type</th>
            <th>Side</th>
            <th>Price</th>
            <th>Amount</th>
            <th>Filled</th>
            <th>Total</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${data.orders.map(o => {
            const isBuy = o.side === 'BUY';
            const date = new Date(o.time).toLocaleString('en-US', {month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit'});
            const orderIdJs = JSON.stringify(String(o.orderId));
            const symbolJs = JSON.stringify(o.symbol);
            return `
              <tr>
                <td>${date}</td>
                <td style="font-weight:600">${o.symbol}</td>
                <td>${o.type}</td>
                <td style="color:${isBuy ? 'var(--binance-green)' : 'var(--binance-red)'}">${o.side}</td>
                <td style="font-family:var(--mono)">${parseFloat(o.price).toLocaleString('en-US')}</td>
                <td style="font-family:var(--mono)">${parseFloat(o.origQty)}</td>
                <td style="font-family:var(--mono)">${parseFloat(o.executedQty)}</td>
                <td style="font-family:var(--mono)">${(parseFloat(o.price) * parseFloat(o.origQty)).toFixed(2)}</td>
                <td>
                  <button onclick="cancelSpotOrder(${symbolJs}, ${orderIdJs})" style="background:rgba(246,70,93,0.1);border:1px solid rgba(246,70,93,0.3);color:var(--binance-red);padding:4px 12px;border-radius:4px;cursor:pointer;font-size:11px">Cancel</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  } catch (e) {
    console.warn('Load open orders error:', e);
  }
}

async function cancelSpotOrder(symbol, orderId) {
  if (!confirm('Cancel this order?')) return;
  
  try {
    const res = await fetch(API + `/binance/order/${orderId}?symbol=${symbol}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + AUTH.token }
    });
    
    if (res.ok) {
      showToast('success', 'Order cancelled');
      loadSpotOpenOrders();
    } else {
      const data = await res.json();
      showToast('error', data.error || 'Cancel failed');
    }
  } catch (e) {
    showToast('error', 'Cancel error');
  }
}

async function loadSpotFunds() {
  const content = document.getElementById('spot-bottom-content');
  if (!content) return;
  
  try {
    const res = await fetch(API + '/binance/balance', {
      headers: { 'Authorization': 'Bearer ' + AUTH.token }
    });
    const data = await res.json();
    
    if (res.ok) {
      content.innerHTML = `
        <table class="binance-orders-table">
          <thead>
            <tr>
              <th>Coin</th>
              <th>Total</th>
              <th>Available</th>
              <th>In Order</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight:600">USDT</td>
              <td style="font-family:var(--mono)">${(data.balance || 0).toLocaleString('en-US', {minimumFractionDigits:2})}</td>
              <td style="font-family:var(--mono)">${(data.availableBalance || 0).toLocaleString('en-US', {minimumFractionDigits:2})}</td>
              <td style="font-family:var(--mono)">0.00</td>
            </tr>
          </tbody>
        </table>
      `;
    }
  } catch (e) {
    console.warn('Load funds error:', e);
  }
}

// ═══════════════════════════════════════════════════════════════
// FUTURES TRADING FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// ─── Load Futures Page Data ───
async function loadFuturesPage() {
  console.log('[FUTURES] Loading page data...');
  console.log('[FUTURES] AUTH:', AUTH);
  console.log('[FUTURES] API:', API);
  
  // Load saved leverage from localStorage
  const savedLeverage = localStorage.getItem('fut-leverage');
  if (savedLeverage) {
    const leverageInput = document.getElementById('fut-quick-leverage');
    if (leverageInput) {
      leverageInput.value = savedLeverage;
    }
  }
  
  try {
    // Load all data in parallel
    await Promise.all([
      loadFutBalances(),
      loadFutOrderBook(),
      loadFutMarketTrades(),
      loadFutPairList(),
      loadFut24hStats(),
      loadFutPositions()  // This now updates the main positions table
    ]);
    console.log('[FUTURES] Page data loaded successfully');
  } catch (error) {
    console.error('[FUTURES] Error loading page data:', error);
  }
}

// ─── Chart Initialization ───
async function initFuturesChart() {
  const container = document.getElementById('fut-chart-container');
  if (!container) return;
  
  // Create TradingView widget for Ethereum
  container.innerHTML = `
    <div style="height:100%;width:100%">
      <iframe 
        src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=BINANCE:ETHUSDT&interval=240&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=0b0e11&studies=[]&theme=dark&style=1&timezone=Etc/UTC&withdateranges=1&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=localhost&utm_medium=widget_new&utm_campaign=chart&utm_term=BINANCE:ETHUSDT"
        style="width:100%;height:100%;border:none;margin:0;padding:0"
        frameborder="0"
        allowtransparency="true"
        scrolling="no"
        allowfullscreen
      ></iframe>
    </div>
  `;
}

// ─── Order Book ───
async function loadFutOrderBook() {
  console.log('[FUTURES] Loading order book for', currentFutPair);
  const asksContainer = document.getElementById('fut-orderbook-asks');
  const bidsContainer = document.getElementById('fut-orderbook-bids');
  const priceEl = document.getElementById('fut-current-price');
  const changeEl = document.getElementById('fut-current-change');
  
  if (!asksContainer || !bidsContainer) {
    console.error('[FUTURES] Order book containers not found');
    console.error('[FUTURES] asksContainer:', asksContainer);
    console.error('[FUTURES] bidsContainer:', bidsContainer);
    return;
  }
  
  // Show loading state
  asksContainer.innerHTML = '<div style="padding:20px;text-align:center;color:var(--binance-text-secondary)">Loading...</div>';
  bidsContainer.innerHTML = '<div style="padding:20px;text-align:center;color:var(--binance-text-secondary)">Loading...</div>';
  
  try {
    // Use backend proxy to avoid CORS
    const url = `${API}/binance/public/orderbook?symbol=${currentFutPair}&limit=20`;
    console.log('[FUTURES] Fetching order book from backend:', url);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[FUTURES] Order book data received:', data.bids?.length, 'bids,', data.asks?.length, 'asks');
    
    if (!data.asks || !data.bids) {
      console.error('[FUTURES] Invalid order book data:', data);
      throw new Error('Invalid data structure');
    }
    
    if (data.asks.length === 0 || data.bids.length === 0) {
      console.error('[FUTURES] Empty order book data');
      throw new Error('No order book data available');
    }
    
    // Calculate max quantity for depth visualization
    const allQuantities = [...data.asks.slice(0, 15), ...data.bids.slice(0, 15)].map(([_, qty]) => parseFloat(qty));
    const maxQty = Math.max(...allQuantities);
    console.log('[FUTURES] Max quantity for depth:', maxQty);
    
    const asks = data.asks.slice(0, 15).reverse();
    asksContainer.innerHTML = asks.map(([price, qty]) => {
      const total = (parseFloat(price) * parseFloat(qty)).toFixed(2);
      const depthPercent = (parseFloat(qty) / maxQty * 100).toFixed(0);
      return `
        <div class="binance-orderbook-row" style="--depth-color:var(--binance-red);--depth-width:${depthPercent}%">
          <div class="binance-orderbook-cell">${parseFloat(price).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
          <div class="binance-orderbook-cell">${parseFloat(qty).toFixed(4)}</div>
          <div class="binance-orderbook-cell">${total}</div>
        </div>
      `;
    }).join('');
    
    const bids = data.bids.slice(0, 15);
    bidsContainer.innerHTML = bids.map(([price, qty]) => {
      const total = (parseFloat(price) * parseFloat(qty)).toFixed(2);
      const depthPercent = (parseFloat(qty) / maxQty * 100).toFixed(0);
      return `
        <div class="binance-orderbook-row" style="--depth-color:var(--binance-green);--depth-width:${depthPercent}%">
          <div class="binance-orderbook-cell">${parseFloat(price).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
          <div class="binance-orderbook-cell">${parseFloat(qty).toFixed(4)}</div>
          <div class="binance-orderbook-cell">${total}</div>
        </div>
      `;
    }).join('');
    
    if (bids.length > 0 && priceEl) {
      const currentPrice = parseFloat(bids[0][0]);
      priceEl.textContent = currentPrice.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
      priceEl.className = 'binance-orderbook-spread-price green';
      
      if (changeEl) {
        changeEl.textContent = '▲ +0.00%';
        changeEl.className = 'binance-orderbook-spread-change green';
      }
    }
    
    console.log('[FUTURES] Order book rendered successfully');
    
  } catch (e) {
    console.error('[FUTURES] Order book error:', e);
    console.error('[FUTURES] Error details:', e.message, e.stack);
    // Show error in UI
    asksContainer.innerHTML = `<div style="padding:20px;text-align:center;color:#ff1744;font-size:11px">
      <div>Failed to load</div>
      <div style="margin-top:4px;opacity:0.7">${e.message}</div>
    </div>`;
    bidsContainer.innerHTML = `<div style="padding:20px;text-align:center;color:#ff1744;font-size:11px">
      <div>Failed to load</div>
      <div style="margin-top:4px;opacity:0.7">${e.message}</div>
    </div>`;
  }
}

// ─── Market Trades ───
async function loadFutMarketTrades() {
  console.log('[FUTURES] Loading market trades for', currentFutPair);
  const container = document.getElementById('fut-market-trades');
  if (!container) {
    console.error('[FUTURES] Market trades container not found');
    return;
  }
  
  // Show loading state
  container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--binance-text-secondary);font-size:11px">Loading...</div>';
  
  try {
    // Use backend proxy to avoid CORS
    const url = `${API}/binance/public/trades?symbol=${currentFutPair}&limit=50`;
    console.log('[FUTURES] Fetching market trades from backend:', url);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[FUTURES] Market trades received:', data.length, 'trades');
    
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No trades data available');
    }
    
    container.innerHTML = data.slice(0, 30).map(trade => {
      const price = parseFloat(trade.price);
      const qty = parseFloat(trade.qty);
      const time = new Date(trade.time).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
      const isBuy = trade.isBuyerMaker === false;
      
      return `
        <div class="binance-market-trades-row">
          <div class="binance-market-trades-cell" style="color:${isBuy ? 'var(--binance-green)' : 'var(--binance-red)'}">${price.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
          <div class="binance-market-trades-cell">${qty.toFixed(4)}</div>
          <div class="binance-market-trades-cell">${time}</div>
        </div>
      `;
    }).join('');
    
    console.log('[FUTURES] Market trades rendered successfully');
    
  } catch (e) {
    console.error('[FUTURES] Market trades error:', e);
    console.error('[FUTURES] Error details:', e.message, e.stack);
    container.innerHTML = `<div style="padding:20px;text-align:center;color:#ff1744;font-size:11px">
      <div>Failed to load</div>
      <div style="margin-top:4px;opacity:0.7">${e.message}</div>
    </div>`;
  }
}

// ─── Pair List ───
async function loadFutPairList() {
  console.log('[FUTURES] Loading pair list...');
  const container = document.getElementById('fut-pair-list');
  if (!container) {
    console.error('[FUTURES] Pair list container not found!');
    return;
  }
  
  console.log('[FUTURES] Pair list container found:', container);
  
  try {
    // Fetch real data from Binance
    const response = await fetch('https://demo-fapi.binance.com/fapi/v1/ticker/24hr');
    const data = await response.json();
    
    // Filter USDT pairs and sort by volume
    const usdtPairs = data
      .filter(p => p.symbol.endsWith('USDT'))
      .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, 20); // Top 20 pairs
    
    const html = usdtPairs.map(p => {
      const change = parseFloat(p.priceChangePercent);
      const isPositive = change >= 0;
      const price = parseFloat(p.lastPrice);
      
      return `
        <div class="binance-pair-row ${p.symbol === currentFutPair ? 'active' : ''}" onclick="selectFutPair('${p.symbol}')">
          <div class="binance-pair-symbol">${p.symbol.replace('USDT', '')}/USDT</div>
          <div class="binance-pair-price">${price < 1 ? price.toFixed(4) : price.toFixed(2)}</div>
          <div class="binance-pair-change ${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : ''}${change.toFixed(2)}%</div>
        </div>
      `;
    }).join('');
    
    container.innerHTML = html;
    console.log('[FUTURES] Pair list rendered:', usdtPairs.length, 'pairs');
    
  } catch (error) {
    console.error('[FUTURES] Pair list error:', error);
    
    // Fallback to static data
    const pairs = [
      {symbol: 'ETHUSDT', price: 3842.15, change: 3.12},
      {symbol: 'BTCUSDT', price: 68954.63, change: 2.41},
      {symbol: 'BNBUSDT', price: 612.45, change: -1.23},
      {symbol: 'SOLUSDT', price: 142.89, change: 5.67},
      {symbol: 'XRPUSDT', price: 0.6234, change: -0.89},
      {symbol: 'ADAUSDT', price: 0.5821, change: 1.45},
      {symbol: 'DOGEUSDT', price: 0.1523, change: 4.23},
      {symbol: 'AVAXUSDT', price: 38.92, change: -2.15}
    ];
    
    const html = pairs.map(p => {
      const isPositive = p.change >= 0;
      return `
        <div class="binance-pair-row ${p.symbol === currentFutPair ? 'active' : ''}" onclick="selectFutPair('${p.symbol}')">
          <div class="binance-pair-symbol">${p.symbol}</div>
          <div class="binance-pair-price">${p.price.toLocaleString('en-US')}</div>
          <div class="binance-pair-change ${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : ''}${p.change.toFixed(2)}%</div>
        </div>
      `;
    }).join('');
    
    container.innerHTML = html;
  }
}

function selectFutPair(symbol) {
  console.log('[FUTURES] Selecting pair:', symbol);
  currentFutPair = symbol;
  
  // Update UI
  document.getElementById('fut-current-pair').textContent = symbol;
  
  // Update chart
  const container = document.getElementById('fut-chart-container');
  if (container) {
    const iframe = container.querySelector('iframe');
    if (iframe) {
      const newSrc = iframe.src.replace(/symbol=BINANCE:[^&]+/, `symbol=BINANCE:${symbol}`);
      iframe.src = newSrc;
      console.log('[FUTURES] Chart updated for', symbol);
    }
  }
  
  // Reload data for new pair
  loadFutOrderBook();
  loadFutMarketTrades();
  loadFut24hStats();
  loadFutPairList(); // Refresh to update active state
  
  showToast('info', `Switched to ${symbol}`);
}

// ─── Leverage Control ───
function updateFutLongLeverage(value) {
  document.getElementById('fut-long-leverage-value').textContent = value + 'x';
  document.getElementById('fut-leverage-display').textContent = value + 'x';
}

function updateFutShortLeverage(value) {
  document.getElementById('fut-short-leverage-value').textContent = value + 'x';
  document.getElementById('fut-leverage-display').textContent = value + 'x';
}

function setFutLongPercentage(percent) {
  const availableEl = document.getElementById('fut-long-available');
  if (!availableEl) return;
  
  const available = parseFloat(availableEl.textContent.replace(/[^0-9.]/g, '')) || 0;
  const priceEl = document.getElementById('fut-long-price');
  const sizeEl = document.getElementById('fut-long-size');
  const leverageEl = document.getElementById('fut-long-leverage-slider');
  const costEl = document.getElementById('fut-long-cost');
  const maxEl = document.getElementById('fut-long-max');
  
  if (!priceEl || !sizeEl || !leverageEl) return;
  
  let price = parseFloat(priceEl.value) || 0;
  const leverage = parseInt(leverageEl.value) || 10;
  
  // If no price entered, get current market price
  if (price <= 0) {
    const currentPriceEl = document.getElementById('fut-current-price');
    if (currentPriceEl) {
      price = parseFloat(currentPriceEl.textContent.replace(/[^0-9.]/g, '')) || 0;
      priceEl.value = price.toFixed(1);
    }
  }
  
  if (price <= 0) return;
  
  const cost = (available * percent / 100);
  const size = (cost * leverage) / price;
  
  sizeEl.value = size.toFixed(3);
  if (costEl) costEl.textContent = cost.toFixed(2) + ' USDT';
  if (maxEl) maxEl.textContent = ((available * leverage) / price).toFixed(3) + ' BTC';
}

// Auto-calculate cost when size or price changes
function updateFutLongCost() {
  const priceEl = document.getElementById('fut-long-price');
  const sizeEl = document.getElementById('fut-long-size');
  const costEl = document.getElementById('fut-long-cost');
  const maxEl = document.getElementById('fut-long-max');
  const liqPriceEl = document.getElementById('fut-long-liq-price');
  
  if (!priceEl || !sizeEl || !costEl) return;
  
  const price = parseFloat(priceEl.value || 0);
  const size = parseFloat(sizeEl.value || 0);
  const leverage = window.currentLongLeverage || 10;
  const availableBalance = 10000; // TODO: Get from actual balance
  
  if (price > 0 && size > 0) {
    // Cost = (Price * Size) / Leverage
    const cost = (price * size) / leverage;
    costEl.textContent = cost.toFixed(2) + ' USDT';
    
    // Calculate liquidation price
    const liqPrice = calculateLiquidationPrice('LONG', price, leverage);
    if (liqPriceEl) {
      liqPriceEl.textContent = liqPrice > 0 ? liqPrice.toFixed(2) + ' USDT' : '—';
    }
  } else {
    costEl.textContent = '0.00 USDT';
    if (liqPriceEl) liqPriceEl.textContent = '—';
  }
  
  // Calculate max size
  if (price > 0 && maxEl) {
    const maxSize = (availableBalance * leverage) / price;
    maxEl.textContent = maxSize.toFixed(3) + ' ETH';
  }
}

function setFutShortPercentage(percent) {
  const availableEl = document.getElementById('fut-short-available');
  if (!availableEl) return;
  
  const available = parseFloat(availableEl.textContent.replace(/[^0-9.]/g, '')) || 0;
  const priceEl = document.getElementById('fut-short-price');
  const sizeEl = document.getElementById('fut-short-size');
  const leverageEl = document.getElementById('fut-short-leverage-slider');
  const costEl = document.getElementById('fut-short-cost');
  const maxEl = document.getElementById('fut-short-max');
  
  if (!priceEl || !sizeEl || !leverageEl) return;
  
  let price = parseFloat(priceEl.value) || 0;
  const leverage = parseInt(leverageEl.value) || 10;
  
  // If no price entered, get current market price
  if (price <= 0) {
    const currentPriceEl = document.getElementById('fut-current-price');
    if (currentPriceEl) {
      price = parseFloat(currentPriceEl.textContent.replace(/[^0-9.]/g, '')) || 0;
      priceEl.value = price.toFixed(1);
    }
  }
  
  if (price <= 0) return;
  
  const cost = (available * percent / 100);
  const size = (cost * leverage) / price;
  
  sizeEl.value = size.toFixed(3);
  if (costEl) costEl.textContent = cost.toFixed(2) + ' USDT';
  if (maxEl) maxEl.textContent = ((available * leverage) / price).toFixed(3) + ' BTC';
}

// Auto-calculate cost when size or price changes
function updateFutShortCost() {
  const priceEl = document.getElementById('fut-short-price');
  const sizeEl = document.getElementById('fut-short-size');
  const costEl = document.getElementById('fut-short-cost');
  const maxEl = document.getElementById('fut-short-max');
  const liqPriceEl = document.getElementById('fut-short-liq-price');
  
  if (!priceEl || !sizeEl || !costEl) return;
  
  const price = parseFloat(priceEl.value || 0);
  const size = parseFloat(sizeEl.value || 0);
  const leverage = window.currentShortLeverage || 10;
  const availableBalance = 10000; // TODO: Get from actual balance
  
  if (price > 0 && size > 0) {
    // Cost = (Price * Size) / Leverage
    const cost = (price * size) / leverage;
    costEl.textContent = cost.toFixed(2) + ' USDT';
    
    // Calculate liquidation price
    const liqPrice = calculateLiquidationPrice('SHORT', price, leverage);
    if (liqPriceEl) {
      liqPriceEl.textContent = liqPrice > 0 ? liqPrice.toFixed(2) + ' USDT' : '—';
    }
  } else {
    costEl.textContent = '0.00 USDT';
    if (liqPriceEl) liqPriceEl.textContent = '—';
  }
  
  // Calculate max size
  if (price > 0 && maxEl) {
    const maxSize = (availableBalance * leverage) / price;
    maxEl.textContent = maxSize.toFixed(3) + ' ETH';
  }
}
    costEl.textContent = cost.toFixed(2) + ' USDT';
  }
}

async function executeFuturesLong() {
  const symbol = currentFutPair;
  const orderType = window.currentLongOrderType || 'limit';
  const price = parseFloat(document.getElementById('fut-long-price')?.value || 0);
  const stopPrice = parseFloat(document.getElementById('fut-long-stop-price')?.value || 0);
  const size = parseFloat(document.getElementById('fut-long-size')?.value || 0);
  const leverage = window.currentLongLeverage || 10;
  
  // Validation
  if (!size || size <= 0) {
    showToast('error', 'Geçerli bir miktar girin');
    return;
  }
  
  if (orderType === 'limit' && (!price || price <= 0)) {
    showToast('error', 'Limit emri için fiyat gerekli');
    return;
  }
  
  if (orderType === 'stop-limit' && (!stopPrice || stopPrice <= 0)) {
    showToast('error', 'Stop-Limit emri için stop fiyatı gerekli');
    return;
  }
  
  // Confirmation
  const orderTypeText = orderType === 'market' ? 'MARKET' : 
                       orderType === 'limit' ? 'LIMIT' : 'STOP-LIMIT';
  const priceText = orderType === 'market' ? 'market price' : 
                   orderType === 'limit' ? `${price} USDT` : 
                   `stop: ${stopPrice} USDT`;
  
  if (!confirm(`${symbol} için ${leverage}x kaldıraçla ${size} ETH LONG pozisyonu açmak istiyor musunuz?\n\nOrder Type: ${orderTypeText}\nPrice: ${priceText}`)) {
    return;
  }
  
  showToast('info', 'Pozisyon açılıyor...');
  
  try {
    // Set leverage first
    const leverageRes = await fetch(API + '/binance/leverage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AUTH.token
      },
      body: JSON.stringify({ symbol, leverage })
    });
    
    if (!leverageRes.ok) {
      const leverageError = await leverageRes.json();
      console.warn('[FUTURES] Leverage set warning:', leverageError);
      // Continue anyway, leverage might already be set
    }
    
    // Prepare order data
    const orderData = {
      symbol,
      side: 'BUY',
      quantity: size
    };
    
    // Set order type and parameters
    if (orderType === 'market') {
      orderData.type = 'MARKET';
    } else if (orderType === 'limit') {
      orderData.type = 'LIMIT';
      orderData.price = price;
      orderData.timeInForce = 'GTC';
    } else if (orderType === 'stop-limit') {
      orderData.type = 'STOP_MARKET';
      orderData.stopPrice = stopPrice;
      if (price > 0) {
        orderData.price = price;
      }
    }
    
    // Place order
    const res = await fetch(API + '/binance/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AUTH.token
      },
      body: JSON.stringify(orderData)
    });
    
    const data = await res.json();
    
    if (res.ok) {
      showToast('success', `LONG pozisyonu açıldı! (${orderTypeText})`);
      
      // Clear inputs
      document.getElementById('fut-long-size').value = '';
      updateFutLongCost();
      
      // Refresh data
      loadFuturesPage();
      switchFutBottomTab('positions');
    } else {
      const errorMsg = data.error || data.msg || 'Emir başarısız';
      showToast('error', errorMsg);
      console.error('[FUTURES] Order error:', data);
    }
  } catch (e) {
    console.error('[FUTURES] Order exception:', e);
    
    let errorMsg = 'Emir gönderilemedi';
    if (e.message.includes('timeout')) {
      errorMsg = 'Bağlantı zaman aşımı. Lütfen tekrar deneyin.';
    } else if (e.message.includes('insufficient')) {
      errorMsg = 'Yetersiz bakiye';
    }
    
    showToast('error', errorMsg);
  }
}

async function executeFuturesShort() {
  const symbol = currentFutPair;
  const orderType = window.currentShortOrderType || 'limit';
  const price = parseFloat(document.getElementById('fut-short-price')?.value || 0);
  const stopPrice = parseFloat(document.getElementById('fut-short-stop-price')?.value || 0);
  const size = parseFloat(document.getElementById('fut-short-size')?.value || 0);
  const leverage = window.currentShortLeverage || 10;
  
  // Validation
  if (!size || size <= 0) {
    showToast('error', 'Geçerli bir miktar girin');
    return;
  }
  
  if (orderType === 'limit' && (!price || price <= 0)) {
    showToast('error', 'Limit emri için fiyat gerekli');
    return;
  }
  
  if (orderType === 'stop-limit' && (!stopPrice || stopPrice <= 0)) {
    showToast('error', 'Stop-Limit emri için stop fiyatı gerekli');
    return;
  }
  
  // Confirmation
  const orderTypeText = orderType === 'market' ? 'MARKET' : 
                       orderType === 'limit' ? 'LIMIT' : 'STOP-LIMIT';
  const priceText = orderType === 'market' ? 'market price' : 
                   orderType === 'limit' ? `${price} USDT` : 
                   `stop: ${stopPrice} USDT`;
  
  if (!confirm(`${symbol} için ${leverage}x kaldıraçla ${size} ETH SHORT pozisyonu açmak istiyor musunuz?\n\nOrder Type: ${orderTypeText}\nPrice: ${priceText}`)) {
    return;
  }
  
  showToast('info', 'Pozisyon açılıyor...');
  
  try {
    // Set leverage first
    const leverageRes = await fetch(API + '/binance/leverage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AUTH.token
      },
      body: JSON.stringify({ symbol, leverage })
    });
    
    if (!leverageRes.ok) {
      const leverageError = await leverageRes.json();
      console.warn('[FUTURES] Leverage set warning:', leverageError);
      // Continue anyway, leverage might already be set
    }
    
    // Prepare order data
    const orderData = {
      symbol,
      side: 'SELL',
      quantity: size
    };
    
    // Set order type and parameters
    if (orderType === 'market') {
      orderData.type = 'MARKET';
    } else if (orderType === 'limit') {
      orderData.type = 'LIMIT';
      orderData.price = price;
      orderData.timeInForce = 'GTC';
    } else if (orderType === 'stop-limit') {
      orderData.type = 'STOP_MARKET';
      orderData.stopPrice = stopPrice;
      if (price > 0) {
        orderData.price = price;
      }
    }
    
    // Place order
    const res = await fetch(API + '/binance/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AUTH.token
      },
      body: JSON.stringify(orderData)
    });
    
    const data = await res.json();
    
    if (res.ok) {
      showToast('success', `SHORT pozisyonu açıldı! (${orderTypeText})`);
      
      // Clear inputs
      document.getElementById('fut-short-size').value = '';
      updateFutShortCost();
      
      // Refresh data
      loadFuturesPage();
      switchFutBottomTab('positions');
    } else {
      const errorMsg = data.error || data.msg || 'Emir başarısız';
      showToast('error', errorMsg);
      console.error('[FUTURES] Order error:', data);
    }
  } catch (e) {
    console.error('[FUTURES] Order exception:', e);
    
    let errorMsg = 'Emir gönderilemedi';
    if (e.message.includes('timeout')) {
      errorMsg = 'Bağlantı zaman aşımı. Lütfen tekrar deneyin.';
    } else if (e.message.includes('insufficient')) {
      errorMsg = 'Yetersiz bakiye';
    }
    
    showToast('error', errorMsg);
  }
}

// ─── Bottom Panel Tabs ───
function switchFutBottomTab(tab) {
  const tabs = document.querySelectorAll('#dash-futures .binance-bottom-tab');
  tabs.forEach(t => t.classList.remove('active'));
  
  const activeTab = Array.from(tabs).find(t => t.getAttribute('onclick')?.includes(tab));
  if (activeTab) activeTab.classList.add('active');
  
  const content = document.getElementById('fut-bottom-content');
  if (!content) return;
  
  if (tab === 'positions') {
    loadFutPositions();
  } else if (tab === 'open-orders') {
    loadFutOpenOrders();
  } else if (tab === 'order-history') {
    content.innerHTML = '<div style="text-align:center;padding:60px;color:var(--binance-text-secondary)">Order history coming soon</div>';
  } else if (tab === 'trade-history') {
    content.innerHTML = '<div style="text-align:center;padding:60px;color:var(--binance-text-secondary)">Trade history coming soon</div>';
  } else if (tab === 'transaction-history') {
    content.innerHTML = '<div style="text-align:center;padding:60px;color:var(--binance-text-secondary)">Transaction history coming soon</div>';
  } else if (tab === 'assets') {
    loadFutAssets();
  }
}

async function loadFutPositions() {
  console.log('[FUTURES] Loading positions...');
  const tableBody = document.getElementById('fut-positions-table');
  if (!tableBody) {
    console.error('[FUTURES] Positions table not found');
    return;
  }
  
  // Update stats cards
  const totalBalanceEl = document.getElementById('fut-total-balance');
  const unrealizedPnlEl = document.getElementById('fut-unrealized-pnl');
  const availableBalanceEl = document.getElementById('fut-available-balance');
  const positionCountEl = document.getElementById('fut-position-count');
  const pnlBadgeEl = document.getElementById('fut-pnl-badge');
  const longCountEl = document.getElementById('fut-long-count');
  const shortCountEl = document.getElementById('fut-short-count');
  
  try {
    // Load account info
    const accountRes = await fetch(API + '/binance/account', {
      headers: { 'Authorization': 'Bearer ' + AUTH.token }
    });
    
    if (!accountRes.ok) {
      if (accountRes.status === 400) {
        console.log('[FUTURES] Binance API not configured');
        if (totalBalanceEl) totalBalanceEl.textContent = '—';
        if (unrealizedPnlEl) unrealizedPnlEl.textContent = '—';
        if (availableBalanceEl) availableBalanceEl.textContent = '—';
        if (positionCountEl) positionCountEl.textContent = '0';
        tableBody.innerHTML = `
          <tr>
            <td colspan="10" style="padding:80px;text-align:center;color:rgba(255,255,255,0.4)">
              <div style="font-size:14px;margin-bottom:8px">⚠️ Binance API yapılandırılmamış</div>
              <div style="font-size:12px">API anahtarlarınızı ayarlar bölümünden ekleyin</div>
            </td>
          </tr>
        `;
        return;
      }
      throw new Error(`HTTP ${accountRes.status}`);
    }
    
    const accountData = await accountRes.json();
    console.log('[FUTURES] Account data:', accountData);
    
    // Update stats
    const totalBalance = accountData.totalWalletBalance || 0;
    const unrealizedPnl = accountData.totalUnrealizedProfit || 0;
    const availableBalance = accountData.availableBalance || 0;
    
    if (totalBalanceEl) totalBalanceEl.textContent = totalBalance.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
    if (unrealizedPnlEl) {
      unrealizedPnlEl.textContent = unrealizedPnl.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
      unrealizedPnlEl.style.color = unrealizedPnl >= 0 ? 'var(--green)' : 'var(--red)';
    }
    if (availableBalanceEl) availableBalanceEl.textContent = availableBalance.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
    
    // Load positions
    const posRes = await fetch(API + '/binance/positions', {
      headers: { 'Authorization': 'Bearer ' + AUTH.token }
    });
    
    if (!posRes.ok) throw new Error(`HTTP ${posRes.status}`);
    
    const posData = await posRes.json();
    console.log('[FUTURES] Positions data:', posData);
    
    const positions = posData.positions || [];
    const openPositions = positions.filter(p => Math.abs(parseFloat(p.positionAmt)) > 0);
    
    // Update position count
    if (positionCountEl) positionCountEl.textContent = openPositions.length;
    
    // Count long/short
    const longCount = openPositions.filter(p => parseFloat(p.positionAmt) > 0).length;
    const shortCount = openPositions.filter(p => parseFloat(p.positionAmt) < 0).length;
    if (longCountEl) longCountEl.textContent = longCount;
    if (shortCountEl) shortCountEl.textContent = shortCount;
    
    // Update PnL badge
    if (pnlBadgeEl) {
      if (unrealizedPnl >= 0) {
        pnlBadgeEl.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"/></svg> +${Math.abs(unrealizedPnl).toFixed(2)} USDT`;
        pnlBadgeEl.style.color = 'var(--green)';
      } else {
        pnlBadgeEl.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg> -${Math.abs(unrealizedPnl).toFixed(2)} USDT`;
        pnlBadgeEl.style.color = 'var(--red)';
      }
    }
    
    if (openPositions.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="10" style="padding:80px;text-align:center">
            <div style="opacity:0.3;margin-bottom:12px">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
              </svg>
            </div>
            <div style="color:rgba(255,255,255,0.4);font-size:13px">Açık pozisyon yok</div>
          </td>
        </tr>
      `;
      return;
    }
    
    // Render positions
    tableBody.innerHTML = openPositions.map(p => {
      const positionAmt = parseFloat(p.positionAmt);
      const isLong = positionAmt > 0;
      const entryPrice = parseFloat(p.entryPrice);
      const markPrice = parseFloat(p.markPrice);
      const liquidationPrice = parseFloat(p.liquidationPrice);
      const unrealizedProfit = parseFloat(p.unrealizedProfit || p.unRealizedProfit || 0);
      const leverage = parseInt(p.leverage) || 1;
      const marginType = p.marginType || 'cross';
      const marginRatio = parseFloat(p.marginRatio || 0);
      
      // Calculate ROE
      const notional = Math.abs(positionAmt) * entryPrice;
      const margin = notional / leverage;
      const roe = margin > 0 ? (unrealizedProfit / margin * 100) : 0;
      
      const pnlColor = unrealizedProfit >= 0 ? 'var(--green)' : 'var(--red)';
      const directionColor = isLong ? 'var(--green)' : 'var(--red)';
      
      // Margin ratio rengi
      let marginRatioColor = 'rgba(255,255,255,0.6)';
      if (marginRatio > 0.8) marginRatioColor = 'var(--red)';
      else if (marginRatio > 0.5) marginRatioColor = 'var(--yellow)';
      else if (marginRatio > 0) marginRatioColor = 'var(--green)';
      
      return `
        <tr>
          <td style="font-weight:600;font-family:var(--mono)">${p.symbol}</td>
          <td style="text-align:center">
            <span style="display:inline-block;padding:4px 12px;border-radius:4px;font-size:11px;font-weight:700;background:${isLong ? 'rgba(14,203,129,0.1)' : 'rgba(246,70,93,0.1)'};color:${directionColor}">
              ${isLong ? 'LONG' : 'SHORT'}
            </span>
          </td>
          <td style="text-align:right;font-family:var(--mono)">${Math.abs(positionAmt).toFixed(3)}</td>
          <td style="text-align:right;font-family:var(--mono)">${entryPrice.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
          <td style="text-align:right;font-family:var(--mono)">${markPrice.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
          <td style="text-align:right;font-family:var(--mono);color:var(--red)">${liquidationPrice > 0 ? liquidationPrice.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2}) : '—'}</td>
          <td style="text-align:right;font-family:var(--mono);color:${pnlColor};font-weight:600">
            ${unrealizedProfit >= 0 ? '+' : ''}${unrealizedProfit.toFixed(2)} USDT
            <div style="font-size:10px;opacity:0.7">(${roe >= 0 ? '+' : ''}${roe.toFixed(2)}%)</div>
          </td>
          <td style="text-align:center">
            <span style="display:inline-block;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:700;background:rgba(138,43,226,0.1);color:var(--purple)">
              ${leverage}x
            </span>
          </td>
          <td style="text-align:center;text-transform:uppercase;font-size:11px;color:rgba(255,255,255,0.6)">${marginType}</td>
          <td style="text-align:center">
            <button onclick="closeFutPosition('${p.symbol}', ${positionAmt})" class="btn-enhanced" style="background:rgba(246,70,93,0.1);border:1px solid rgba(246,70,93,0.3);color:var(--red);padding:6px 14px;font-size:11px">
              Kapat
            </button>
          </td>
        </tr>
      `;
    }).join('');
    
    console.log('[FUTURES] Positions loaded successfully');
    
  } catch (e) {
    console.error('[FUTURES] Load positions error:', e);
    tableBody.innerHTML = `
      <tr>
        <td colspan="10" style="padding:80px;text-align:center;color:#ff1744">
          <div style="margin-bottom:8px">❌ Pozisyonlar yüklenemedi</div>
          <div style="font-size:12px;opacity:0.7">${e.message}</div>
        </td>
      </tr>
    `;
  }
}

async function closeFutPosition(symbol, positionAmt) {
  const side = positionAmt > 0 ? 'SELL' : 'BUY';
  const quantity = Math.abs(positionAmt);
  const positionType = positionAmt > 0 ? 'LONG' : 'SHORT';
  
  // Enhanced confirmation with details
  const confirmed = confirm(
    `${symbol} ${positionType} pozisyonunu kapatmak istediğinizden emin misiniz?\n\n` +
    `Miktar: ${quantity} ETH\n` +
    `İşlem: ${side} @ Market Price\n\n` +
    `⚠️ Bu işlem geri alınamaz!`
  );
  
  if (!confirmed) return;
  
  showToast('info', 'Pozisyon kapatılıyor...');
  
  try {
    const res = await fetch(API + '/binance/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + AUTH.token
      },
      body: JSON.stringify({
        symbol,
        side,
        type: 'MARKET',
        quantity,
        reduceOnly: true  // Ensure we're only closing, not opening new position
      })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      showToast('success', `${symbol} ${positionType} pozisyonu kapatıldı!`);
      
      // Refresh data
      loadFutPositions();
      loadFuturesPage();
    } else {
      const errorMsg = data.error || data.msg || 'Pozisyon kapatılamadı';
      showToast('error', errorMsg);
      console.error('[FUTURES] Close position error:', data);
    }
  } catch (e) {
    console.error('[FUTURES] Close position exception:', e);
    showToast('error', 'Pozisyon kapatma hatası: ' + e.message);
  }
}

async function loadFutOpenOrders() {
  const content = document.getElementById('fut-bottom-content');
  if (!content) return;
  
  try {
    const res = await fetch(API + '/binance/orders', {
      headers: { 'Authorization': 'Bearer ' + AUTH.token }
    });
    const data = await res.json();
    
    const countEl = document.getElementById('fut-open-orders-count');
    if (countEl) countEl.textContent = data.count || 0;
    
    if (!res.ok || !data.orders || data.orders.length === 0) {
      content.innerHTML = '<div style="text-align:center;padding:60px;color:var(--binance-text-secondary)">No open orders</div>';
      return;
    }
    
    content.innerHTML = `
      <table class="binance-orders-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Symbol</th>
            <th>Type</th>
            <th>Side</th>
            <th>Price</th>
            <th>Amount</th>
            <th>Filled</th>
            <th>Total</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${data.orders.map(o => {
            const isBuy = o.side === 'BUY';
            const date = new Date(o.time).toLocaleString('en-US', {month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit'});
            const orderIdJs = JSON.stringify(String(o.orderId));
            const symbolJs = JSON.stringify(o.symbol);
            return `
              <tr>
                <td>${date}</td>
                <td style="font-weight:600">${o.symbol}</td>
                <td>${o.type}</td>
                <td style="color:${isBuy ? 'var(--binance-green)' : 'var(--binance-red)'}">${o.side}</td>
                <td style="font-family:var(--mono)">${parseFloat(o.price).toLocaleString('en-US')}</td>
                <td style="font-family:var(--mono)">${parseFloat(o.origQty)}</td>
                <td style="font-family:var(--mono)">${parseFloat(o.executedQty)}</td>
                <td style="font-family:var(--mono)">${(parseFloat(o.price) * parseFloat(o.origQty)).toFixed(2)}</td>
                <td>
                  <button onclick="cancelFutOrder(${symbolJs}, ${orderIdJs})" style="background:rgba(246,70,93,0.1);border:1px solid rgba(246,70,93,0.3);color:var(--binance-red);padding:4px 12px;border-radius:4px;cursor:pointer;font-size:11px">Cancel</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  } catch (e) {
    console.warn('Load open orders error:', e);
  }
}

async function cancelFutOrder(symbol, orderId) {
  if (!confirm('Cancel this order?')) return;
  
  try {
    const res = await fetch(API + `/binance/order/${orderId}?symbol=${symbol}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + AUTH.token }
    });
    
    if (res.ok) {
      showToast('success', 'Order cancelled');
      loadFutOpenOrders();
    } else {
      const data = await res.json();
      showToast('error', data.error || 'Cancel failed');
    }
  } catch (e) {
    showToast('error', 'Cancel error');
  }
}

async function loadFutAssets() {
  const content = document.getElementById('fut-bottom-content');
  if (!content) return;
  
  try {
    const res = await fetch(API + '/binance/account', {
      headers: { 'Authorization': 'Bearer ' + AUTH.token }
    });
    const data = await res.json();
    
    if (res.ok && data.assets) {
      content.innerHTML = `
        <table class="binance-orders-table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Wallet Balance</th>
              <th>Unrealized PNL</th>
              <th>Margin Balance</th>
              <th>Available Balance</th>
            </tr>
          </thead>
          <tbody>
            ${data.assets.map(a => {
              const pnlColor = a.unrealizedProfit >= 0 ? 'var(--binance-green)' : 'var(--binance-red)';
              return `
                <tr>
                  <td style="font-weight:600">${a.asset}</td>
                  <td style="font-family:var(--mono)">${a.walletBalance.toFixed(2)}</td>
                  <td style="font-family:var(--mono);color:${pnlColor}">${a.unrealizedProfit > 0 ? '+' : (a.unrealizedProfit < 0 ? '-' : '')}${Math.abs(a.unrealizedProfit).toFixed(2)}</td>
                  <td style="font-family:var(--mono)">${a.marginBalance.toFixed(2)}</td>
                  <td style="font-family:var(--mono)">${a.availableBalance.toFixed(2)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }
  } catch (e) {
    console.warn('Load assets error:', e);
  }
}

// ─── Auto-refresh ───
function startBinanceAutoRefresh() {
  console.log('[FUTURES] Starting auto-refresh...');
  
  // Refresh order book every 1 second
  if (orderBookUpdateInterval) clearInterval(orderBookUpdateInterval);
  orderBookUpdateInterval = setInterval(() => {
    if (document.getElementById('dash-futures')?.style.display !== 'none') {
      loadFutOrderBook();
    }
  }, 3000);
  
  // Refresh market trades every 2 seconds
  if (marketTradesUpdateInterval) clearInterval(marketTradesUpdateInterval);
  marketTradesUpdateInterval = setInterval(() => {
    if (document.getElementById('dash-futures')?.style.display !== 'none') {
      loadFutMarketTrades();
    }
  }, 3000);
  
  // Refresh 24h stats every 5 seconds
  setInterval(() => {
    if (document.getElementById('dash-futures')?.style.display !== 'none') {
      loadFut24hStats();
    }
  }, 10000);
  
  console.log('[FUTURES] Auto-refresh started');
}

function stopBinanceAutoRefresh() {
  if (orderBookUpdateInterval) {
    clearInterval(orderBookUpdateInterval);
    orderBookUpdateInterval = null;
  }
  if (marketTradesUpdateInterval) {
    clearInterval(marketTradesUpdateInterval);
    marketTradesUpdateInterval = null;
  }
}

// ─── Initialize on page load ───
console.log('[FUTURES] binance-trading.js loaded');

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[FUTURES] DOMContentLoaded event fired');
    // Don't auto-init, wait for switchDash to call it
  });
} else {
  console.log('[FUTURES] Document already loaded');
}

// ═══════════════════════════════════════════════════════════════
// LEVERAGE MODAL & ORDER TYPE SWITCHING
// ═══════════════════════════════════════════════════════════════

// Global variables for order types and leverage
window.currentLongOrderType = 'limit';
window.currentShortOrderType = 'limit';
window.currentLongLeverage = 10;
window.currentShortLeverage = 10;

function openLeverageModal(side) {
  const currentLeverage = side === 'long' ? window.currentLongLeverage : 
                         side === 'short' ? window.currentShortLeverage : 
                         window.currentLongLeverage;
  
  // Create modal
  const modal = document.createElement('div');
  modal.id = 'leverage-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  modal.innerHTML = `
    <div style="background: var(--binance-bg-secondary); border-radius: 8px; padding: 24px; width: 400px; max-width: 90%;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; color: #fff; font-size: 18px;">Adjust Leverage</h3>
        <button onclick="closeLeverageModal()" style="background: none; border: none; color: #fff; font-size: 24px; cursor: pointer; padding: 0; width: 30px; height: 30px;">&times;</button>
      </div>
      
      <div style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="color: var(--binance-text-secondary); font-size: 14px;">Leverage</span>
          <span id="leverage-value-display" style="color: var(--binance-yellow); font-size: 24px; font-weight: 700;">${currentLeverage}x</span>
        </div>
        
        <input type="range" id="leverage-slider" min="1" max="125" value="${currentLeverage}" 
          style="width: 100%; height: 6px; background: var(--binance-border); border-radius: 3px; outline: none; -webkit-appearance: none;"
          oninput="updateLeverageDisplay(this.value)">
        
        <div style="display: flex; justify-content: space-between; margin-top: 8px;">
          <span style="color: var(--binance-text-secondary); font-size: 12px;">1x</span>
          <span style="color: var(--binance-text-secondary); font-size: 12px;">125x</span>
        </div>
      </div>
      
      <div style="background: rgba(255,193,7,0.1); border: 1px solid rgba(255,193,7,0.3); border-radius: 4px; padding: 12px; margin-bottom: 20px;">
        <div style="color: var(--binance-yellow); font-size: 12px; margin-bottom: 4px;">⚠️ Warning</div>
        <div style="color: var(--binance-text-secondary); font-size: 11px;">
          Higher leverage = Higher risk. You can lose your entire position if the market moves against you.
        </div>
      </div>
      
      <div style="display: flex; gap: 12px;">
        <button onclick="closeLeverageModal()" style="flex: 1; padding: 12px; background: var(--binance-border); border: none; border-radius: 4px; color: #fff; cursor: pointer; font-size: 14px;">
          Cancel
        </button>
        <button onclick="saveLeverage('${side}')" style="flex: 1; padding: 12px; background: var(--binance-yellow); border: none; border-radius: 4px; color: #000; cursor: pointer; font-size: 14px; font-weight: 600;">
          Confirm
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeLeverageModal();
  });
}

function updateLeverageDisplay(value) {
  document.getElementById('leverage-value-display').textContent = value + 'x';
}

function saveLeverage(side) {
  const value = parseInt(document.getElementById('leverage-slider').value);
  
  if (side === 'long') {
    window.currentLongLeverage = value;
    document.getElementById('fut-long-leverage-value').textContent = value + 'x';
  } else if (side === 'short') {
    window.currentShortLeverage = value;
    document.getElementById('fut-short-leverage-value').textContent = value + 'x';
  } else if (side === 'both') {
    window.currentLongLeverage = value;
    window.currentShortLeverage = value;
    document.getElementById('fut-long-leverage-value').textContent = value + 'x';
    document.getElementById('fut-short-leverage-value').textContent = value + 'x';
    document.getElementById('fut-leverage-display').textContent = value + 'x';
  }
  
  // Update cost calculations
  updateFutLongCost();
  updateFutShortCost();
  
  closeLeverageModal();
  showToast('success', `Leverage set to ${value}x`);
}

function closeLeverageModal() {
  const modal = document.getElementById('leverage-modal');
  if (modal) modal.remove();
}

// Order Type Switching
function switchLongOrderType(type) {
  window.currentLongOrderType = type;
  
  // Update tabs
  const tabs = document.querySelectorAll('#dash-futures .binance-trade-form:first-child .binance-trade-tab');
  tabs.forEach(tab => tab.classList.remove('active'));
  event.target.classList.add('active');
  
  // Show/hide inputs based on order type
  const priceGroup = document.getElementById('fut-long-price-group');
  const stopPriceGroup = document.getElementById('fut-long-stop-price-group');
  
  if (type === 'market') {
    priceGroup.style.display = 'none';
    stopPriceGroup.style.display = 'none';
  } else if (type === 'limit') {
    priceGroup.style.display = 'block';
    stopPriceGroup.style.display = 'none';
  } else if (type === 'stop-limit') {
    priceGroup.style.display = 'block';
    stopPriceGroup.style.display = 'block';
  }
}

function switchShortOrderType(type) {
  window.currentShortOrderType = type;
  
  // Update tabs
  const tabs = document.querySelectorAll('#dash-futures .binance-trade-form:last-child .binance-trade-tab');
  tabs.forEach(tab => tab.classList.remove('active'));
  event.target.classList.add('active');
  
  // Show/hide inputs based on order type
  const priceGroup = document.getElementById('fut-short-price-group');
  const stopPriceGroup = document.getElementById('fut-short-stop-price-group');
  
  if (type === 'market') {
    priceGroup.style.display = 'none';
    stopPriceGroup.style.display = 'none';
  } else if (type === 'limit') {
    priceGroup.style.display = 'block';
    stopPriceGroup.style.display = 'none';
  } else if (type === 'stop-limit') {
    priceGroup.style.display = 'block';
    stopPriceGroup.style.display = 'block';
  }
}

// ═══════════════════════════════════════════════════════════════
// LIQUIDATION PRICE CALCULATION
// ═══════════════════════════════════════════════════════════════

function calculateLiquidationPrice(side, entryPrice, leverage, marginRatio = 0.01) {
  /*
   * Liquidation Price Formula:
   * LONG: Liq Price = Entry Price * (1 - 1/Leverage + Margin Ratio)
   * SHORT: Liq Price = Entry Price * (1 + 1/Leverage - Margin Ratio)
   */
  
  if (!entryPrice || !leverage || leverage <= 0) return 0;
  
  if (side === 'LONG' || side === 'BUY' || side === 'long') {
    return entryPrice * (1 - (1 / leverage) + marginRatio);
  } else {
    return entryPrice * (1 + (1 / leverage) - marginRatio);
  }
}

// Make functions globally available
window.initBinanceTrading = initBinanceTrading;
window.loadFuturesPage = loadFuturesPage;
window.selectFutPair = selectFutPair;
window.updateFutLongLeverage = updateFutLongLeverage;
window.updateFutShortLeverage = updateFutShortLeverage;
window.setFutLongPercentage = setFutLongPercentage;
window.setFutShortPercentage = setFutShortPercentage;
window.updateFutLongCost = updateFutLongCost;
window.updateFutShortCost = updateFutShortCost;
window.executeFuturesLong = executeFuturesLong;
window.executeFuturesShort = executeFuturesShort;
window.switchFutBottomTab = switchFutBottomTab;
window.closeFutPosition = closeFutPosition;
window.cancelFutOrder = cancelFutOrder;
window.startBinanceAutoRefresh = startBinanceAutoRefresh;
window.stopBinanceAutoRefresh = stopBinanceAutoRefresh;
window.openLeverageModal = openLeverageModal;
window.closeLeverageModal = closeLeverageModal;
window.saveLeverage = saveLeverage;
window.updateLeverageDisplay = updateLeverageDisplay;
window.switchLongOrderType = switchLongOrderType;
window.switchShortOrderType = switchShortOrderType;
window.calculateLiquidationPrice = calculateLiquidationPrice;

console.log('[FUTURES] All functions registered globally');


// ─── Load 24h Stats ───
async function loadSpot24hStats() {
  const currentSpotPair = 'BTCUSDT'; // Default pair
  try {
    const response = await fetch(`https://testnet.binancefuture.com/fapi/v1/ticker/24hr?symbol=${currentSpotPair}`);
    const data = await response.json();
    
    if (data && data.priceChange) {
      const changeEl = document.getElementById('spot-24h-change');
      const highEl = document.getElementById('spot-24h-high');
      const lowEl = document.getElementById('spot-24h-low');
      const volumeEl = document.getElementById('spot-24h-volume');
      const volumeUsdtEl = document.getElementById('spot-24h-volume-usdt');
      
      const priceChange = parseFloat(data.priceChange);
      const priceChangePercent = parseFloat(data.priceChangePercent);
      const isPositive = priceChange >= 0;
      
      if (changeEl) {
        changeEl.textContent = `${isPositive ? '+' : ''}${priceChange.toFixed(2)} ${isPositive ? '+' : ''}${priceChangePercent.toFixed(2)}%`;
        changeEl.className = `binance-price-value ${isPositive ? 'green' : 'red'}`;
      }
      if (highEl) highEl.textContent = parseFloat(data.highPrice).toLocaleString('en-US', {minimumFractionDigits:2});
      if (lowEl) lowEl.textContent = parseFloat(data.lowPrice).toLocaleString('en-US', {minimumFractionDigits:2});
      if (volumeEl) volumeEl.textContent = parseFloat(data.volume).toLocaleString('en-US', {maximumFractionDigits:2});
      if (volumeUsdtEl) volumeUsdtEl.textContent = (parseFloat(data.quoteVolume) / 1000000000).toFixed(2) + 'B';
    }
  } catch (e) {
    console.warn('Load 24h stats error:', e);
  }
}

// ─── Load 24h Stats ───
async function loadFut24hStats() {
  console.log('[FUTURES] Loading 24h stats for', currentFutPair);
  try {
    // Use backend proxy to avoid CORS
    const url = `${API}/binance/public/ticker24h?symbol=${currentFutPair}`;
    console.log('[FUTURES] Fetching 24h stats from backend:', url);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[FUTURES] 24h stats received:', data);
    
    if (data && data.priceChange) {
      const changeEl = document.getElementById('fut-24h-change');
      const highEl = document.getElementById('fut-24h-high');
      const lowEl = document.getElementById('fut-24h-low');
      const volumeEl = document.getElementById('fut-24h-volume');
      const markPriceEl = document.getElementById('fut-mark-price');
      const indexPriceEl = document.getElementById('fut-index-price');
      
      const priceChange = parseFloat(data.priceChange);
      const priceChangePercent = parseFloat(data.priceChangePercent);
      const isPositive = priceChange >= 0;
      
      if (changeEl) {
        changeEl.textContent = `${isPositive ? '+' : ''}${priceChange.toFixed(2)} ${isPositive ? '+' : ''}${priceChangePercent.toFixed(2)}%`;
        changeEl.className = `binance-price-value ${isPositive ? 'green' : 'red'}`;
      }
      if (highEl) highEl.textContent = parseFloat(data.highPrice).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
      if (lowEl) lowEl.textContent = parseFloat(data.lowPrice).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
      if (volumeEl) volumeEl.textContent = (parseFloat(data.quoteVolume) / 1000000000).toFixed(2) + 'B';
      if (markPriceEl) markPriceEl.textContent = parseFloat(data.lastPrice).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
      if (indexPriceEl) indexPriceEl.textContent = parseFloat(data.lastPrice).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
      
      console.log('[FUTURES] 24h stats rendered successfully');
    }
  } catch (e) {
    console.error('[FUTURES] Load futures 24h stats error:', e);
  }
}

// Call stats loading on init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (document.getElementById('dash-spot')?.style.display !== 'none') {
        loadSpot24hStats();
      }
      if (document.getElementById('dash-futures')?.style.display !== 'none') {
        loadFut24hStats();
      }
    }, 1000);
  });
}
