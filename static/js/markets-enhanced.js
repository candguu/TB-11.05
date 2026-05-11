/* ═══════════════════════════════════════
   ENHANCED MARKETS - Pagination, Sorting, Watchlist
═══════════════════════════════════════ */

// Format large numbers (volume, market cap)
function formatLargeNumber(value) {
  if (!value || isNaN(value)) return '—';
  if (value >= 1e12) return '$' + (value / 1e12).toFixed(2) + 'T';
  if (value >= 1e9) return '$' + (value / 1e9).toFixed(2) + 'B';
  if (value >= 1e6) return '$' + (value / 1e6).toFixed(2) + 'M';
  if (value >= 1e3) return '$' + (value / 1e3).toFixed(2) + 'K';
  return '$' + value.toFixed(2);
}

// State
let marketState = {
  currentPage: 1,
  itemsPerPage: 25,
  currentTab: 'all',
  sortBy: 'marketcap',
  sortOrder: 'desc',
  allCoins: [],
  watchlist: JSON.parse(localStorage.getItem('watchlist') || '[]')
};

// Update last update time
function updateLastUpdateTime() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const elem = document.getElementById('last-update-time');
  if (elem) elem.textContent = timeStr;
}

// Switch Market Tab
function switchMarketTab(tab) {
  marketState.currentTab = tab;
  marketState.currentPage = 1;
  
  // Update tab buttons
  document.querySelectorAll('.mkt-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  
  renderMarketTable();
}

// Toggle Watchlist
function toggleWatchlist(coinId) {
  const index = marketState.watchlist.indexOf(coinId);
  
  if (index > -1) {
    marketState.watchlist.splice(index, 1);
    showToast('info', 'Favorilerden kaldırıldı');
  } else {
    marketState.watchlist.push(coinId);
    showToast('success', 'Favorilere eklendi');
  }
  
  localStorage.setItem('watchlist', JSON.stringify(marketState.watchlist));
  updateWatchlistCount();
  
  if (marketState.currentTab === 'watchlist') {
    renderMarketTable();
  }
}

// Update Watchlist Count
function updateWatchlistCount() {
  const elem = document.getElementById('watchlist-count');
  if (elem) elem.textContent = marketState.watchlist.length;
}

// Sort Table
function sortTable(column) {
  if (marketState.sortBy === column) {
    marketState.sortOrder = marketState.sortOrder === 'asc' ? 'desc' : 'asc';
  } else {
    marketState.sortBy = column;
    marketState.sortOrder = 'desc';
  }
  
  // Update UI
  document.querySelectorAll('.th.sortable').forEach(th => {
    th.classList.remove('asc', 'desc');
    if (th.dataset.sort === column) {
      th.classList.add(marketState.sortOrder);
    }
  });
  
  renderMarketTable();
}

// Get Filtered Coins
function getFilteredCoins() {
  let coins = [...marketState.allCoins];
  
  // Search filter
  const searchInput = document.getElementById('market-search');
  if (searchInput && searchInput.value.trim()) {
    const query = searchInput.value.trim().toLowerCase();
    coins = coins.filter(c => 
      c.symbol.toLowerCase().includes(query) || 
      c.name.toLowerCase().includes(query)
    );
  }
  
  // Tab filter
  if (marketState.currentTab === 'watchlist') {
    coins = coins.filter(c => marketState.watchlist.includes(c.id));
  } else if (marketState.currentTab === 'gainers') {
    // Only gainers (positive 24h change)
    coins = coins.filter(c => (c.price_change_percentage_24h || 0) > 0);
    // Sort by highest gain
    coins = coins.sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0));
  } else if (marketState.currentTab === 'losers') {
    // Only losers (negative 24h change)
    coins = coins.filter(c => (c.price_change_percentage_24h || 0) < 0);
    // Sort by biggest loss
    coins = coins.sort((a, b) => (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0));
  }
  
  // Filter buttons (gainers/losers)
  const activeFilter = document.querySelector('.fb.active');
  if (activeFilter) {
    const filter = activeFilter.dataset.filter;
    if (filter === 'gainers') {
      coins = coins.filter(c => (c.price_change_percentage_24h || 0) > 0);
    } else if (filter === 'losers') {
      coins = coins.filter(c => (c.price_change_percentage_24h || 0) < 0);
    }
  }
  
  // Sort
  coins.sort((a, b) => {
    let aVal, bVal;
    
    switch (marketState.sortBy) {
      case 'price':
        aVal = a.current_price;
        bVal = b.current_price;
        break;
      case 'change24h':
        aVal = a.price_change_percentage_24h || 0;
        bVal = b.price_change_percentage_24h || 0;
        break;
      case 'change7d':
        aVal = a.price_change_percentage_7d_in_currency || 0;
        bVal = b.price_change_percentage_7d_in_currency || 0;
        break;
      case 'volume':
        aVal = a.total_volume;
        bVal = b.total_volume;
        break;
      case 'marketcap':
      default:
        aVal = a.market_cap;
        bVal = b.market_cap;
        break;
    }
    
    return marketState.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });
  
  return coins;
}

// Render Market Table
function renderMarketTable() {
  const coins = getFilteredCoins();
  const start = (marketState.currentPage - 1) * marketState.itemsPerPage;
  const end = start + marketState.itemsPerPage;
  const pageCoins = coins.slice(start, end);
  
  const listEl = document.getElementById('coin-list2');
  if (!listEl) return;
  
  if (pageCoins.length === 0) {
    listEl.innerHTML = `
      <div style="padding:60px 20px;text-align:center;color:var(--t3)">
        ${marketState.currentTab === 'watchlist' ? 'Favoriler boş. Coin eklemek için ⭐ ikonuna tıklayın.' : 'Coin bulunamadı'}
      </div>
    `;
    return;
  }
  
  listEl.innerHTML = pageCoins.map((coin, idx) => {
    const rank = start + idx + 1;
    const isInWatchlist = marketState.watchlist.includes(coin.id);
    const change24h = coin.price_change_percentage_24h || 0;
    const change7d = coin.price_change_percentage_7d_in_currency || 0;
    const changeColor = change24h >= 0 ? 'var(--green)' : 'var(--red)';
    const change7dColor = change7d >= 0 ? 'var(--green)' : 'var(--red)';
    const baseSym = coin.symbol.toLowerCase().replace('usdt', '');
    // Simple logo fallback
    const coinLogo = (typeof LOGO_CACHE !== 'undefined' && LOGO_CACHE[coin.symbol.toUpperCase()]) 
                     ? LOGO_CACHE[coin.symbol.toUpperCase()]
                     : `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/${baseSym}.png`;
    
    // Generate synthetic sparkline if real data not available
    let sparklineData = coin.sparkline_in_7d?.price;
    if (!sparklineData || !Array.isArray(sparklineData) || sparklineData.length === 0) {
      // Create synthetic sparkline based on 7d change
      const change7d = coin.price_change_percentage_7d_in_currency || 0;
      const currentPrice = coin.current_price || 1;
      const startPrice = currentPrice / (1 + change7d / 100);
      
      // Generate 20 points with some randomness
      sparklineData = [];
      for (let i = 0; i < 20; i++) {
        const progress = i / 19;
        const trend = startPrice + (currentPrice - startPrice) * progress;
        const noise = (Math.random() - 0.5) * Math.abs(currentPrice - startPrice) * 0.1;
        sparklineData.push(trend + noise);
      }
    }
    
    const hasSpark = sparklineData && sparklineData.length > 0;

    return `
      <div class="tbl-row" style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:12px; margin-bottom:8px; transition:all 0.2s">
        <div class="td" style="text-align:center">
          <button onclick="toggleWatchlist('${coin.id}')" 
                  style="background:transparent;border:none;cursor:pointer;padding:6px;color:${isInWatchlist ? 'var(--amber)' : 'rgba(255,255,255,0.2)'};transition:all 0.2s;display:flex;align-items:center;justify-content:center"
                  onmouseover="this.style.transform='scale(1.15)';this.style.color='var(--amber)'"
                  onmouseout="this.style.transform='scale(1)';this.style.color='${isInWatchlist ? 'var(--amber)' : 'rgba(255,255,255,0.2)'}'">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${isInWatchlist ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"></polygon>
            </svg>
          </button>
        </div>
        <div class="td" style="color:var(--t3);font-size:12px;text-align:center">${rank}</div>
        <div class="td">
          <div style="display:flex;align-items:center;gap:10px">
            <img src="${coinLogo}" 
                 onerror="this.onerror=null;this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(coin.symbol)}&background=random&size=128&bold=true&format=svg'" 
                 alt="${coin.name}" 
                 style="width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.05)">
            <div>
              <div style="font-weight:600;font-size:13px">${coin.name}</div>
              <div style="font-size:11px;color:var(--t3);text-transform:uppercase">${coin.symbol}</div>
            </div>
          </div>
        </div>
        <div class="td" style="text-align:right;font-family:var(--mono);font-size:13px">
          $${coin.current_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
        </div>
        <div class="td" style="text-align:right;color:${changeColor};font-weight:600;font-size:13px">
          ${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%
        </div>
        <div class="td" style="text-align:right;color:${change7dColor};font-weight:600;font-size:13px">
          ${change7d >= 0 ? '+' : ''}${change7d.toFixed(2)}%
        </div>
        <div class="td" style="text-align:right;font-family:var(--mono);font-size:12px;color:var(--t2)">
          ${coin.total_volume ? formatLargeNumber(coin.total_volume) : '—'}
        </div>
        <div class="td" style="text-align:right;font-family:var(--mono);font-size:12px;color:var(--t2)">
          ${coin.market_cap ? formatLargeNumber(coin.market_cap) : '—'}
        </div>
        <div class="td" style="text-align:center;">
          <button onclick="openFuturesWithSymbol('${coin.symbol.toUpperCase()}USDT')"
                  style="padding:6px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:var(--t2);font-size:11px;cursor:pointer;transition:all 0.2s"
                  onmouseover="this.style.background='rgba(255,255,255,0.08)';this.style.color='#fff'"
                  onmouseout="this.style.background='rgba(255,255,255,0.04)';this.style.color='var(--t2)'">
            Trade
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  updatePagination(coins.length);
}

// Open Futures with Symbol
function openFuturesWithSymbol(symbol) {
  // Giriş yapmamış kullanıcılar için kayıt ol panelini aç
  if (typeof AUTH === 'undefined' || !AUTH.token) {
    if (typeof openAuth === 'function') {
      openAuth('register');
    }
    return;
  }
  
  // Giriş yapmış kullanıcılar için futures sekmesine yönlendir
  switchDash('futures');
  
  // Set symbol (if there's a symbol selector)
  setTimeout(() => {
    const symbolInput = document.getElementById('symbol-input');
    if (symbolInput) {
      symbolInput.value = symbol;
      // Trigger change event if needed
      symbolInput.dispatchEvent(new Event('change'));
    }
  }, 100);
}

// Render Sparkline
function renderSparkline(prices, isPositive) {
  if (!prices || prices.length === 0) return '—';
  
  const color = isPositive ? 'var(--green)' : 'var(--red)';
  const max = Math.max(...prices);
  const min = Math.min(...prices);
  const range = max - min;
  
  const points = prices.map((price, i) => {
    const x = (i / (prices.length - 1)) * 100;
    const y = 100 - ((price - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  
  return `
    <svg width="100" height="40" style="display:block">
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" />
    </svg>
  `;
}

// Update Pagination
function updatePagination(totalItems) {
  const totalPages = Math.ceil(totalItems / marketState.itemsPerPage);
  const start = (marketState.currentPage - 1) * marketState.itemsPerPage + 1;
  const end = Math.min(start + marketState.itemsPerPage - 1, totalItems);
  
  // Update range
  document.getElementById('showing-range').textContent = `${start}-${end}`;
  document.getElementById('total-coins').textContent = totalItems;
  
  // Update buttons
  const firstBtn = document.getElementById('first-page');
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');
  const lastBtn = document.getElementById('last-page');
  
  if (firstBtn) firstBtn.disabled = marketState.currentPage === 1;
  if (prevBtn) prevBtn.disabled = marketState.currentPage === 1;
  if (nextBtn) nextBtn.disabled = marketState.currentPage === totalPages;
  if (lastBtn) lastBtn.disabled = marketState.currentPage === totalPages;
  
  // Update page numbers
  const pageNumbersEl = document.getElementById('page-numbers');
  if (pageNumbersEl) {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Sliding window: always show 5 consecutive pages centered on current page
      let startPage = Math.max(1, marketState.currentPage - 2);
      let endPage = Math.min(totalPages, startPage + maxVisible - 1);
      
      // Adjust if we're near the end
      if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
      }
      
      // Add first page and ellipsis if needed
      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) {
          pages.push('...');
        }
      }
      
      // Add visible page range
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      // Add ellipsis and last page if needed
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push('...');
        }
        pages.push(totalPages);
      }
    }
    
    pageNumbersEl.innerHTML = pages.map(p => {
      if (p === '...') {
        return `<span style="padding:8px 4px;color:var(--t3)">...</span>`;
      }
      return `
        <button onclick="goToPage(${p})"
                style="padding:8px 12px;background:${p === marketState.currentPage ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'};border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:${p === marketState.currentPage ? '#fff' : 'var(--t2)'};font-size:12px;cursor:pointer;min-width:40px;font-weight:${p === marketState.currentPage ? '600' : '400'}">
          ${p}
        </button>
      `;
    }).join('');
  }
}

// Change Page
function changePage(delta) {
  const totalPages = Math.ceil(getFilteredCoins().length / marketState.itemsPerPage);
  const newPage = marketState.currentPage + delta;
  
  if (newPage >= 1 && newPage <= totalPages) {
    marketState.currentPage = newPage;
    renderMarketTable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Go to Page
function goToPage(page) {
  marketState.currentPage = page;
  renderMarketTable();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Go to Last Page
function goToLastPage() {
  const totalPages = Math.ceil(getFilteredCoins().length / marketState.itemsPerPage);
  marketState.currentPage = totalPages;
  renderMarketTable();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Initialize Sorting
function initSorting() {
  document.querySelectorAll('.th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      sortTable(th.dataset.sort);
    });
  });
}

// Initialize Search
function initSearch() {
  const searchInput = document.getElementById('market-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      marketState.currentPage = 1;
      renderMarketTable();
    });
  }
}

// Initialize Filter Buttons
function initFilterButtons() {
  document.querySelectorAll('.fb').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.fb').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      marketState.currentPage = 1;
      renderMarketTable();
    });
  });
}

// Sync with LIVE_COINS from app.js
function syncMarketData() {
  if (typeof LIVE_COINS !== 'undefined' && LIVE_COINS.length > 0) {
    marketState.allCoins = LIVE_COINS;
    renderMarketTable();
    
    // Update stat cards (both dashboard and public markets page)
    updateStatCards();
  }
}

// Update stat cards from global market data
function updateStatCards() {
  // These are updated by app.js fetchGlobal function
  // Just sync the IDs for public markets page (with '2' suffix)
  const syncStat = (id1, id2) => {
    const el1 = document.getElementById(id1);
    const el2 = document.getElementById(id2);
    if (el1 && el2) el2.textContent = el1.textContent;
    if (el1 && el2 && el1.style.color) el2.style.color = el1.style.color;
  };
  
  syncStat('ms-total-cap', 'ms-total-cap2');
  syncStat('ms-total-cap-chg', 'ms-total-cap-chg2');
  syncStat('ms-total-vol', 'ms-total-vol2');
  syncStat('ms-btc-dom', 'ms-btc-dom2');
  syncStat('ms-fng', 'ms-fng2');
  syncStat('ms-fng-lbl', 'ms-fng-lbl2');
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  updateWatchlistCount();
  updateLastUpdateTime();
  initSorting();
  initSearch();
  initFilterButtons();
  
  // Sync with LIVE_COINS if available
  syncMarketData();
  
  // Update time every minute
  setInterval(updateLastUpdateTime, 60000);
});

// Export sync function for app.js to call
window.syncMarketData = syncMarketData;
