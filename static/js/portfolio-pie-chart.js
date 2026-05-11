/* Portfolio Pie Chart */
let _marketDataCache = {};
let _marketDataTimer = null;

async function fetchMarketData() {
    try {
        console.log('[MARKET DATA] Fetching from Binance...');
        const response = await fetch('/api/market/binance-ticker');
        const data = await response.json();
        
        if (!Array.isArray(data)) {
            console.error('[MARKET DATA] Invalid response format:', data);
            return _marketDataCache;
        }
        
        const marketMap = {};
        data.forEach(ticker => {
            marketMap[ticker.symbol] = {
                price: parseFloat(ticker.lastPrice),
                priceChange: parseFloat(ticker.priceChangePercent),
                quoteVolume: parseFloat(ticker.quoteVolume)
            };
        });
        _marketDataCache = marketMap;
        console.log(`[MARKET DATA] Cached ${Object.keys(marketMap).length} tickers`);
        return marketMap;
    } catch (e) {
        console.error('[MARKET DATA] Fetch error:', e);
        return _marketDataCache;
    }
}

// Market verilerini otomatik güncelle (her 5 saniyede bir)
function startMarketDataAutoRefresh() {
    if (_marketDataTimer) {
        clearInterval(_marketDataTimer);
    }
    
    // İlk yükleme
    fetchMarketData().then(() => {
        updateAssetsListWithLatestPrices();
    });
    
    // 5 saniyede bir güncelle
    _marketDataTimer = setInterval(async () => {
        await fetchMarketData();
        updateAssetsListWithLatestPrices();
    }, 5000);
}

// Asset listesini güncel fiyatlarla yeniden render et
function updateAssetsListWithLatestPrices() {
    const portfolioPage = document.getElementById('dash-portfolio');
    if (!portfolioPage || portfolioPage.style.display === 'none') {
        return;
    }
    
    if (typeof _portfolioData !== 'undefined' && _portfolioData.balance > 0) {
        const balanceData = {
            totalWalletBalance: _portfolioData.balance,
            assets: _portfolioData.assets || []
        };
        
        if (balanceData.assets.length > 0) {
            renderAssetsList(balanceData.assets, balanceData.totalWalletBalance);
        }
    }
}

function stopMarketDataAutoRefresh() {
    if (_marketDataTimer) {
        clearInterval(_marketDataTimer);
        _marketDataTimer = null;
    }
}

function renderAssetsPieChart(assets, totalValue) {
    const canvas = document.getElementById('pf-assets-pie-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const centerX = 180, centerY = 180, radius = 130, innerRadius = 80;
    const stablecoinColor = totalValue >= 5000 ? '#0ecb81' : '#f6465d';
    const coinColors = {
        'USDT': stablecoinColor,
        'USDC': stablecoinColor,
        'BTC': '#f7931a',
        'ETH': '#627eea',
        'BNB': '#f3ba2f',
        'SOL': '#14f195',
        'XRP': '#23292f',
        'ADA': '#0033ad',
        'DOGE': '#c2a633',
        'SHIB': '#f70000'
    };
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const totalValueEl = document.getElementById('pf-pie-total-value');
    if (totalValueEl && totalValue !== undefined) {
        totalValueEl.textContent = '$' + totalValue.toLocaleString('en-US', { maximumFractionDigits: 2 });
        totalValueEl.style.color = '#fff';
    }
    
    if (totalValue === 0) return;
    
    // Market data'dan fiyatları al
    const marketData = _marketDataCache;
    
    // Her asset için USDT cinsinden değeri hesapla
    const assetsWithValues = assets.map(asset => {
        const bal = parseFloat(asset.walletBalance || 0);
        const symbol = asset.asset + 'USDT';
        const ticker = marketData[symbol] || {};
        const isStablecoin = asset.asset === 'USDT' || asset.asset === 'USDC';
        const price = isStablecoin ? 1.00 : (ticker.price || 0);
        const usdtValue = bal * price;
        return { ...asset, usdtValue };
    });
    
    // Sadece değeri olan asset'leri göster
    const nonZeroAssets = assetsWithValues.filter(asset => asset.usdtValue > 0);
    
    // Toplam değeri hesapla
    const calculatedTotal = nonZeroAssets.reduce((sum, asset) => sum + asset.usdtValue, 0);
    const actualTotal = calculatedTotal > 0 ? calculatedTotal : totalValue;
    
    const sortOrder = ['USDT', 'USDC', 'BTC', 'ETH'];
    const sortedAssets = [...nonZeroAssets].sort((a, b) => {
        const aIndex = sortOrder.indexOf(a.asset);
        const bIndex = sortOrder.indexOf(b.asset);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return b.usdtValue - a.usdtValue;
    });
    
    let currentAngle = -Math.PI / 2;
    sortedAssets.forEach((asset) => {
        const percentage = (asset.usdtValue / actualTotal);
        const sliceAngle = percentage * 2 * Math.PI;
        const color = coinColors[asset.asset] || '#6b7280';
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
        currentAngle += sliceAngle;
    });
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
}

async function renderAssetsList(assets, totalValue) {
    const listEl = document.getElementById('pf-assets-list');
    if (!listEl) return;
    
    const marketData = _marketDataCache;
    const coinLogos = {
        'BTC': 'https://assets.coincap.io/assets/icons/btc@2x.png',
        'ETH': 'https://assets.coincap.io/assets/icons/eth@2x.png',
        'USDT': 'https://assets.coincap.io/assets/icons/usdt@2x.png',
        'USDC': 'https://assets.coincap.io/assets/icons/usdc@2x.png',
        'BNB': 'https://assets.coincap.io/assets/icons/bnb@2x.png',
        'SOL': 'https://assets.coincap.io/assets/icons/sol@2x.png',
        'DOGE': 'https://assets.coincap.io/assets/icons/doge@2x.png',
        'SHIB': 'https://assets.coincap.io/assets/icons/shib@2x.png'
    };
    
    const alwaysShowCoins = ['USDT', 'USDC', 'BTC', 'ETH', 'DOGE', 'SHIB'];
    const assetMap = {};
    
    assets.forEach(asset => { 
        assetMap[asset.asset] = asset; 
    });
    
    alwaysShowCoins.forEach(coin => {
        if (!assetMap[coin]) {
            assetMap[coin] = {
                asset: coin, 
                walletBalance: 0, 
                unrealizedProfit: 0, 
                marginBalance: 0, 
                availableBalance: 0
            };
        }
    });
    
    const allAssets = Object.values(assetMap);
    const sortOrder = ['USDT', 'USDC', 'BTC', 'ETH', 'DOGE', 'SHIB'];
    const sortedAssets = [...allAssets].sort((a, b) => {
        const aIndex = sortOrder.indexOf(a.asset);
        const bIndex = sortOrder.indexOf(b.asset);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return parseFloat(b.walletBalance || 0) - parseFloat(a.walletBalance || 0);
    });
    
    const formatLargeNumber = (num) => {
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        return num.toFixed(2);
    };
    
    // Toplam değeri hesapla (tüm asset'lerin USDT cinsinden değeri)
    let calculatedTotal = 0;
    const assetsWithValues = sortedAssets.map((asset) => {
        const bal = parseFloat(asset.walletBalance || 0);
        const symbol = asset.asset + 'USDT';
        const ticker = marketData[symbol] || {};
        const isStablecoin = asset.asset === 'USDT' || asset.asset === 'USDC';
        const price = isStablecoin ? 1.00 : (ticker.price || 0);
        const totalWalletValue = bal * price;
        calculatedTotal += totalWalletValue;
        return { asset, bal, price, totalWalletValue };
    });
    
    // Eğer hesaplanan toplam 0'dan büyükse onu kullan, değilse API'den gelen totalValue'yu kullan
    const actualTotal = calculatedTotal > 0 ? calculatedTotal : totalValue;
    
    console.log(`[ASSETS] Calculated total: $${calculatedTotal.toFixed(2)}, API total: $${totalValue.toFixed(2)}, Using: $${actualTotal.toFixed(2)}`);
    
    listEl.innerHTML = assetsWithValues.map(({ asset, bal, price, totalWalletValue }) => {
        // Yüzde hesaplaması - actualTotal'e göre
        const percentage = actualTotal > 0 ? (totalWalletValue / actualTotal * 100) : 0;
        const logoUrl = coinLogos[asset.asset] || 'https://assets.coincap.io/assets/icons/' + asset.asset.toLowerCase() + '@2x.png';
        
        return `<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:14px 24px;display:grid;grid-template-columns:auto 140px 140px;gap:24px;align-items:center;transition:all 0.2s" onmouseenter="this.style.background='rgba(255,255,255,0.04)';this.style.borderColor='rgba(255,255,255,0.1)'" onmouseleave="this.style.background='rgba(255,255,255,0.02)';this.style.borderColor='rgba(255,255,255,0.06)'">
            <div style="display:flex;align-items:center;gap:14px">
                <div style="width:40px;height:40px;border-radius:50%;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
                    <img src="${logoUrl}" alt="${asset.asset}" style="width:32px;height:32px;object-fit:contain" onerror="handleAssetLogoError(this, '${asset.asset}')">
                </div>
                <div>
                    <div style="font-size:16px;font-weight:700;color:#fff;margin-bottom:3px">${asset.asset}</div>
                    <div style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.5)">${percentage.toFixed(1)}%</div>
                </div>
            </div>
            <div style="text-align:right">
                <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Adet</div>
                <div style="font-size:15px;color:rgba(255,255,255,0.9);font-weight:600;font-family:var(--mono)">${bal === 0 ? '0.00' : bal.toLocaleString('en-US', { maximumFractionDigits: 4 })}</div>
            </div>
            <div style="text-align:right;padding-left:20px;border-left:1px solid rgba(255,255,255,0.08)">
                <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Toplam</div>
                <div style="font-size:16px;font-weight:700;color:#fff;font-family:var(--mono)">$${totalWalletValue > 0 ? formatLargeNumber(totalWalletValue) : '0.00'}</div>
            </div>
        </div>`;
    }).join('');
}

// ═══════════════════════════════════════════════════════════════
// GÜVENLI ASSET LOGO FALLBACK
// ═══════════════════════════════════════════════════════════════
function handleAssetLogoError(imgElement, assetSymbol) {
    // Güvenli DOM manipulation
    imgElement.style.display = 'none';
    const container = imgElement.parentElement;
    if (container) {
        const fallbackText = document.createElement('span');
        fallbackText.style.fontSize = '16px';
        fallbackText.style.fontWeight = '700';
        fallbackText.style.color = 'rgba(255,255,255,0.6)';
        fallbackText.textContent = assetSymbol.slice(0, 2);
        container.appendChild(fallbackText);
    }
}
