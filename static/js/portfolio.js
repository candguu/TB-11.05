/* ═══════════════════════════════════════
   PORTFOLIO MANAGEMENT - Binance Testnet Integration
═══════════════════════════════════════ */

let _portfolioTimer = null;
let _portfolioData = {
    balance: 0,
    assets: [],
    openOrders: [],
    openPositions: [],
    trades: [],
    income: [],
    dailyPnL: 0,
    weeklyPnL: 0,
    monthlyPnL: 0,
    totalPnL: 0
};

let _pnlChart = null;
let _pnlSeries = null;
let _doughnutChart = null;

// ─── Load Portfolio Data ───
async function loadPortfolio() {
    if (!AUTH.token) {
        console.error('No auth token!');
        return;
    }

    console.log('Loading portfolio...');

    try {
        // Check API key status
        console.log('Checking API status...');
        const statusRes = await fetch(API + '/binance/api-keys', {
            headers: { 'Authorization': 'Bearer ' + AUTH.token }
        });
        const statusData = await statusRes.json();
        console.log('API Status:', statusData);

        if (!statusRes.ok || !statusData.configured) {
            console.warn('API not configured');
            _setApiNotConfigured();
            return;
        }

        // Load account data
        console.log('Loading account data...');
        const balRes = await fetch(API + '/binance/account', {
            headers: { 'Authorization': 'Bearer ' + AUTH.token }
        });
        const balData = await balRes.json();

        console.log('Account data:', balData); // Debug

        if (balRes.ok) {
            _portfolioData.balance = balData.totalWalletBalance || 0;
            _renderBalance(balData);
            _setApiConnected(true);
        } else {
            _setApiError(balData.error);
            console.error('Account error:', balData.error);
        }

        // Load open orders
        await loadOpenOrders();

        // Load positions (initial load with loading state)
        await loadPositions(true);
        
        // Market verilerini otomatik güncellemeyi başlat
        if (typeof startMarketDataAutoRefresh === 'function') {
            startMarketDataAutoRefresh();
        }

        // Load trade history for multiple symbols
        await loadAllTrades();

        // Calculate statistics
        try {
            _calculateStatistics();
        } catch (statsError) {
            console.warn('Statistics calculation error:', statsError);
            // İstatistik hatası API hatasından farklı, API durumunu etkilemez
        }

    } catch (e) {
        console.warn('Portfolio load error:', e);
        _setApiError('Bağlantı hatası');
    }

    // ═══════════════════════════════════════════════════════════════
    // BİRLEŞTİRİLMİŞ AUTO-REFRESH (5 saniyede bir)
    // ═══════════════════════════════════════════════════════════════
    if (_portfolioTimer) clearInterval(_portfolioTimer);
    _portfolioTimer = setInterval(async () => {
        const portfolioPage = document.getElementById('dash-portfolio');
        if (!portfolioPage || portfolioPage.style.display === 'none') {
            clearInterval(_portfolioTimer);
            if (typeof stopMarketDataAutoRefresh === 'function') {
                stopMarketDataAutoRefresh();
            }
            _portfolioTimer = null;
            return;
        }

        try {
            // 1. Balance'ı yenile
            const balRes = await fetch(API + '/binance/account', {
                headers: { 'Authorization': 'Bearer ' + AUTH.token }
            });
            const balData = await balRes.json();
            if (balRes.ok) {
                _portfolioData.balance = balData.totalWalletBalance || 0;
                _renderBalance(balData);
                _setApiConnected(true);
            }

            // 2. Pozisyonları yenile (loading gösterme)
            await loadPositions(false);
            
            // 3. Orders'ı yenile
            await loadOpenOrders();
            
        } catch (e) {
            console.warn('Auto-refresh error:', e);
        }
    }, 5000); // 5 saniyede bir - TÜM GÜNCELLEMELER
}

// ─── Render Balance ───
function _renderBalance(data) {
    console.log('Rendering balance with data:', data);

    const totalBalance = parseFloat(data.totalWalletBalance || 0);
    console.log('Total balance:', totalBalance);

    // Update top navigation balance
    const navBalanceEl = document.getElementById('nav-balance-val');
    if (navBalanceEl) {
        navBalanceEl.textContent = '$ ' + totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    let assets = data.assets || [];

    console.log('Assets to render:', assets.length);
    
    // Asset verilerini global state'e kaydet (market data güncellemesi için)
    _portfolioData.assets = assets;
    _portfolioData.balance = totalBalance;

    if (assets.length === 0) {
        const listEl = document.getElementById('pf-assets-list');
        if (listEl) {
            listEl.innerHTML = '<div style="padding:40px;text-align:center;color:rgba(255,255,255,0.3)">Veri yok</div>';
        }
        return;
    }

    const totalValue = totalBalance;

    // Render Pie Chart
    renderAssetsPieChart(assets, totalValue);

    // Render Asset List - her seferinde güncel market verileriyle
    renderAssetsList(assets, totalValue);

    console.log('Assets rendered successfully');
}


// ─── Load Positions (for ticker) ───
async function loadPositions(showLoading = true) {
    if (!AUTH.token) return;

    const content = document.getElementById('pf-positions-content');
    
    // Loading state sadece ilk yüklemede göster
    if (showLoading && content) {
        content.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t3);width:100%"><div class="spinner"></div> Pozisyonlar yükleniyor...</div>';
    }

    try {
        const startTime = performance.now();
        
        const res = await fetch(API + '/binance/positions', {
            headers: { 'Authorization': 'Bearer ' + AUTH.token }
        });
        const data = await res.json();

        const endTime = performance.now();
        console.log(`🔥 POSITIONS RESPONSE (${(endTime - startTime).toFixed(0)}ms):`, data);

        if (res.ok && data.positions) {
            console.log('🔥 RENDERING POSITIONS:', data.positions.length, 'positions');
            
            // Pozisyonları global state'e kaydet (ortalama kaldıraç hesabı için)
            _portfolioData.openPositions = data.positions;
            
            _renderPositionsTicker(data.positions);
            
            // Ortalama kaldıraç hesapla ve güncelle
            _updateAverageLeverage(data.positions);
        } else {
            console.warn('❌ Positions error:', data);
            if (content) {
                content.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t3);width:100%">Pozisyon verisi alınamadı</div>';
            }
        }
    } catch (e) {
        console.error('❌ Positions load error:', e);
        if (content) {
            content.innerHTML = '<div style="padding:40px;text-align:center;color:#f6465d;width:100%">Hata: ' + e.message + '</div>';
        }
    }
}

// ─── Update Average Leverage ───
function _updateAverageLeverage(positions) {
    const avgLeverageEl = document.getElementById('pf-avg-leverage');
    const openPositionsCountEl = document.getElementById('pf-open-positions-count');
    
    // Sadece açık pozisyonları filtrele
    const openPositions = positions.filter(p => parseFloat(p.positionAmt || 0) !== 0);
    
    // Açık pozisyon sayısını güncelle
    if (openPositionsCountEl) {
        openPositionsCountEl.textContent = openPositions.length;
    }
    
    if (!avgLeverageEl) return;
    
    if (openPositions.length === 0) {
        avgLeverageEl.textContent = '—';
        avgLeverageEl.style.color = 'rgba(255,255,255,0.4)';
        return;
    }
    
    // Ortalama kaldıraç hesapla
    const totalLeverage = openPositions.reduce((sum, p) => sum + parseInt(p.leverage || 1), 0);
    const avgLeverage = totalLeverage / openPositions.length;
    
    // Göster
    avgLeverageEl.textContent = avgLeverage.toFixed(1) + 'x';
    
    // Renk kodlama: 1-5x yeşil, 6-10x sarı, 10+ kırmızı
    if (avgLeverage <= 5) {
        avgLeverageEl.style.color = '#10b981';
    } else if (avgLeverage <= 10) {
        avgLeverageEl.style.color = '#fbbf24';
    } else {
        avgLeverageEl.style.color = '#ef4444';
    }
    
    console.log(`[AVG LEVERAGE] ${openPositions.length} positions, avg: ${avgLeverage.toFixed(1)}x`);
}

function _renderPositionsTicker(positions) {
    const section = document.getElementById('pf-positions-section');
    const content = document.getElementById('pf-positions-content');
    
    if (!section || !content) return;

    // Sadece açık pozisyonları göster
    const openPositions = positions.filter(p => parseFloat(p.positionAmt || 0) !== 0);

    if (openPositions.length === 0) {
        content.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t3);width:100%">Açık pozisyon yok</div>';
        return;
    }

    // Tablo formatında render et
    content.innerHTML = `
        <table style="width:100%;border-collapse:collapse">
            <thead>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.1)">
                    <th style="padding:16px 20px;text-align:left;font-size:12px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.6px">Symbol</th>
                    <th style="padding:16px 20px;text-align:right;font-size:12px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.6px">Size</th>
                    <th style="padding:16px 20px;text-align:right;font-size:12px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.6px">Entry</th>
                    <th style="padding:16px 20px;text-align:right;font-size:12px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.6px">Last</th>
                    <th style="padding:16px 20px;text-align:right;font-size:12px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.6px">Mark</th>
                    <th style="padding:16px 20px;text-align:right;font-size:12px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.6px">Liq.</th>
                    <th style="padding:16px 20px;text-align:right;font-size:12px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.6px">Margin</th>
                    <th style="padding:16px 20px;text-align:right;font-size:12px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.6px">M.Ratio</th>
                    <th style="padding:16px 20px;text-align:right;font-size:12px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.6px">PNL(ROI)</th>
                    <th style="padding:16px 20px;text-align:center;font-size:12px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.6px"></th>
                </tr>
            </thead>
            <tbody>
                ${openPositions.map(p => {
                    const posAmt = parseFloat(p.positionAmt || 0);
                    const entryPrice = parseFloat(p.entryPrice || 0);
                    const markPrice = parseFloat(p.markPrice || 0);
                    
                    // LAST PRICE - PNL hesabı için (eğer yoksa mark price kullan)
                    const lastPrice = parseFloat(p.lastPrice || 0);
                    const priceForPnl = lastPrice > 0 ? lastPrice : markPrice;
                    
                    const liqPrice = parseFloat(p.liquidationPrice || 0);
                    const leverage = parseInt(p.leverage || 1);
                    const marginType = p.marginType || 'cross';
                    
                    // Position side belirleme
                    const isLong = posAmt > 0;
                    const sideColor = isLong ? '#0ecb81' : '#f6465d';
                    const sideText = isLong ? 'LONG' : 'SHORT';
                    
                    // Debug - hangi fiyatı kullandığımızı görelim
                    if (p.symbol === 'BTCUSDT' || p.symbol === 'ETHUSDT') {
                        console.log(`[PNL DEBUG] ${p.symbol} (${sideText}): lastPrice=${lastPrice}, markPrice=${markPrice}, using=${priceForPnl}`);
                    }
                    
                    // ═══════════════════════════════════════════════════════════
                    // PNL HESAPLAMA - LAST PRICE İLE (Binance Kuralı)
                    // ═══════════════════════════════════════════════════════════
                    let calculatedPnl = 0;
                    if (isLong) {
                        // Long: (Last Price - Entry Price) × Size
                        calculatedPnl = (priceForPnl - entryPrice) * Math.abs(posAmt);
                    } else {
                        // Short: (Entry Price - Last Price) × Size
                        calculatedPnl = (entryPrice - priceForPnl) * Math.abs(posAmt);
                    }
                    
                    const pnlColor = calculatedPnl >= 0 ? '#0ecb81' : '#f6465d';
                    const pnlSign = calculatedPnl > 0 ? '+' : (calculatedPnl < 0 ? '-' : '');
                    
                    // ═══════════════════════════════════════════════════════════
                    // MARGIN HESAPLAMA - BACKEND'DEN GELİYOR
                    // ═══════════════════════════════════════════════════════════
                    let displayMargin = parseFloat(p.initialMargin || 0);
                    
                    // Fallback: Eğer backend'den gelmediyse hesapla
                    if (displayMargin === 0) {
                        if (marginType === 'isolated') {
                            displayMargin = parseFloat(p.isolatedMargin || 0);
                        } else {
                            // Cross margin: (Position Size × Mark Price) / Leverage
                            const positionValue = Math.abs(posAmt) * markPrice;
                            displayMargin = positionValue / leverage;
                        }
                    }
                    
                    // ═══════════════════════════════════════════════════════════
                    // ROI HESAPLAMA: (Last Price PNL / Mark Price Margin) × 100
                    // ═══════════════════════════════════════════════════════════
                    const roi = displayMargin > 0 ? (calculatedPnl / displayMargin * 100) : 0;
                    
                    // ═══════════════════════════════════════════════════════════
                    // MARGIN RATIO - BİNANCE API'DEN DİREKT
                    // ═══════════════════════════════════════════════════════════
                    const marginRatioFromApi = parseFloat(p.marginRatio || 0);
                    const displayMarginRatio = marginRatioFromApi * 100; // Yüzdeye çevir
                    
                    // Debug
                    if (p.symbol === 'BTCUSDT' || p.symbol === 'ETHUSDT') {
                        console.log(`[MARGIN RATIO] ${p.symbol} (${sideText}): ${displayMarginRatio.toFixed(2)}% (API'den)`);
                        console.log(`[MARGIN] ${p.symbol} (${sideText}): ${displayMargin.toFixed(2)} USDT`);
                        console.log(`[MARK PRICE] ${p.symbol} (${sideText}): ${markPrice.toFixed(2)}`);
                        console.log(`[PNL] ${p.symbol} (${sideText}): ${calculatedPnl.toFixed(2)} USDT`);
                        console.log(`[ROI] ${p.symbol} (${sideText}): ${roi.toFixed(2)}%`);
                    }

                    return `
                        <tr style="border-bottom:1px solid rgba(255,255,255,0.03);transition:all 0.3s" 
                            class="position-row"
                            data-symbol="${p.symbol}"
                            data-amount="${posAmt}"
                            data-side="${isLong ? 'Long' : 'Short'}"
                            data-position-side="${(p.positionSide || (isLong ? 'LONG' : 'SHORT'))}">
                            <td style="padding:18px 16px;position:relative">
                                <div style="display:flex;align-items:center;gap:6px">
                                    <span style="font-weight:700;font-size:13px;color:#fff">${p.symbol}</span>
                                    <span style="padding:2px 5px;border-radius:3px;font-size:9px;font-weight:700;background:${isLong ? 'rgba(14,203,129,.15)' : 'rgba(246,70,93,.15)'};color:${sideColor}">${isLong ? 'Long' : 'Short'}</span>
                                    <span style="font-size:10px;color:rgba(255,255,255,0.5)">${leverage}x</span>
                                </div>
                            </td>
                            <td style="padding:12px 16px;text-align:right;position:relative">
                                <div style="font-size:13px;font-weight:600;color:#fff;font-family:var(--mono)">${Math.abs(posAmt).toFixed(3)}</div>
                            </td>
                            <td style="padding:12px 16px;text-align:right;position:relative">
                                <div style="font-size:13px;font-weight:500;color:#fff;font-family:var(--mono)">$${entryPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</div>
                            </td>
                            <td style="padding:12px 16px;text-align:right;position:relative">
                                <div style="font-size:13px;font-weight:600;color:#fbbf24;font-family:var(--mono)">$${priceForPnl.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</div>
                            </td>
                            <td style="padding:12px 16px;text-align:right;position:relative">
                                <div style="font-size:13px;font-weight:500;color:#fff;font-family:var(--mono)">$${markPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</div>
                            </td>
                            <td style="padding:12px 16px;text-align:right;position:relative">
                                <div style="font-size:13px;font-weight:500;color:${liqPrice > 0 ? '#f6465d' : 'rgba(255,255,255,0.5)'};font-family:var(--mono)">${liqPrice > 0 ? '$' + liqPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '--'}</div>
                            </td>
                            <td style="padding:12px 16px;text-align:right;position:relative">
                                <div style="font-size:13px;font-weight:600;color:#fff;font-family:var(--mono)">$${displayMargin.toFixed(1)}</div>
                            </td>
                            <td style="padding:12px 16px;text-align:right;position:relative">
                                <div style="font-size:13px;font-weight:500;color:#fff;font-family:var(--mono)">${displayMarginRatio > 0 ? displayMarginRatio.toFixed(2) + '%' : '--'}</div>
                            </td>
                            <td style="padding:12px 16px;text-align:right;position:relative">
                                <div style="font-size:13px;font-weight:700;color:${pnlColor};font-family:var(--mono)">${pnlSign}$${Math.abs(calculatedPnl).toFixed(2)}</div>
                                <div style="font-size:11px;font-weight:600;color:${pnlColor};font-family:var(--mono)">${pnlSign}${Math.abs(roi).toFixed(2)}%</div>
                            </td>
                            <td style="padding:12px 16px;text-align:center;vertical-align:middle">
                                <button type="button" class="pf-close-btn" data-symbol="${p.symbol}" data-amount="${posAmt}" data-side="${isLong ? 'Long' : 'Short'}" data-position-side="${p.positionSide || (isLong ? 'LONG' : 'SHORT')}" onclick="closePositionFromPortfolio('${p.symbol}', ${posAmt}, '${isLong ? 'Long' : 'Short'}', '${p.positionSide || (isLong ? 'LONG' : 'SHORT')}')">Kapat</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
            <tfoot>
                <tr style="border-top:2px solid rgba(255,255,255,0.15);background:${(() => {
                    const totalPnl = openPositions.reduce((sum, p) => {
                        const posAmt = parseFloat(p.positionAmt || 0);
                        const entryPrice = parseFloat(p.entryPrice || 0);
                        const lastPrice = parseFloat(p.lastPrice || 0);
                        const markPrice = parseFloat(p.markPrice || 0);
                        const priceForPnl = lastPrice > 0 ? lastPrice : markPrice;
                        const isLong = posAmt > 0;
                        let pnl = 0;
                        if (isLong) {
                            pnl = (priceForPnl - entryPrice) * Math.abs(posAmt);
                        } else {
                            pnl = (entryPrice - priceForPnl) * Math.abs(posAmt);
                        }
                        return sum + pnl;
                    }, 0);
                    return totalPnl >= 0 ? 'rgba(14,203,129,0.12)' : 'rgba(246,70,93,0.12)';
                })()}">
                    <td colspan="9" style="padding:18px 20px;text-align:right;font-size:14px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.8px">
                        Toplam P&L
                    </td>
                    <td style="padding:18px 20px;text-align:right">
                        ${(() => {
                            const totalPnl = openPositions.reduce((sum, p) => {
                                const posAmt = parseFloat(p.positionAmt || 0);
                                const entryPrice = parseFloat(p.entryPrice || 0);
                                const lastPrice = parseFloat(p.lastPrice || 0);
                                const markPrice = parseFloat(p.markPrice || 0);
                                const priceForPnl = lastPrice > 0 ? lastPrice : markPrice;
                                const isLong = posAmt > 0;
                                let pnl = 0;
                                if (isLong) {
                                    pnl = (priceForPnl - entryPrice) * Math.abs(posAmt);
                                } else {
                                    pnl = (entryPrice - priceForPnl) * Math.abs(posAmt);
                                }
                                return sum + pnl;
                            }, 0);
                            const color = totalPnl >= 0 ? '#0ecb81' : '#f6465d';
                            const sign = totalPnl > 0 ? '+' : (totalPnl < 0 ? '-' : '');
                            return `<div style="font-size:16px;font-weight:800;color:${color};font-family:var(--mono)">${sign}${Math.abs(totalPnl).toFixed(2)}</div>`;
                        })()}
                    </td>
                    <td></td>
                </tr>
            </tfoot>
        </table>
    `;
}

// ─── Load Open Orders ───
async function loadOpenOrders() {
    if (!AUTH.token) return;

    try {
        const res = await fetch(API + '/binance/orders', {
            headers: { 'Authorization': 'Bearer ' + AUTH.token }
        });
        const data = await res.json();

        if (res.ok) {
            _portfolioData.openOrders = data.orders || [];
            _renderOpenOrders(data.orders || []);
            
            const countEl = document.getElementById('pf-open-count');
            if (countEl) countEl.textContent = (data.orders || []).length;
        }
    } catch (e) {
        console.warn('Open orders load error:', e);
    }
}

function _renderOpenOrders(orders) {
    const tbody = document.getElementById('pf-open-orders-body');
    if (!tbody) return;

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="padding:40px;text-align:center;color:var(--t3)"><div style="font-size:48px;margin-bottom:16px;opacity:0.3">📋</div><div style="font-size:14px;font-weight:600;margin-bottom:8px">Açık emir yok</div><div style="font-size:12px;opacity:0.6">Limit emirleriniz burada görünecek</div></td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(o => {
        const isBuy = o.side === 'BUY';
        const symbolJs = JSON.stringify(o.symbol);
        const orderIdJs = JSON.stringify(String(o.orderId));
        return `<tr style="border-bottom:1px solid rgba(255,255,255,0.03)">
            <td style="padding:12px 14px;font-weight:600;font-family:var(--mono)">${o.symbol}</td>
            <td style="padding:12px 14px;text-align:center">
                <span style="padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;background:${isBuy ? 'rgba(0,230,118,.15)' : 'rgba(239,83,80,.15)'};color:${isBuy ? 'var(--green)' : 'var(--red)'}">${isBuy ? 'BUY' : 'SELL'}</span>
            </td>
            <td style="padding:12px 14px;text-align:right;font-family:var(--mono);font-size:13px">$${parseFloat(o.price).toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
            <td style="padding:12px 14px;text-align:right;font-family:var(--mono);font-size:13px">${parseFloat(o.origQty).toFixed(6)}</td>
            <td style="padding:12px 14px;text-align:center">
                <button onclick="cancelOrder(${symbolJs}, ${orderIdJs})" style="background:rgba(239,83,80,.15);border:1px solid rgba(239,83,80,.3);color:var(--red);padding:4px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;transition:all 0.2s" onmouseenter="this.style.background='rgba(239,83,80,.25)'" onmouseleave="this.style.background='rgba(239,83,80,.15)'">İptal</button>
            </td>
        </tr>`;
    }).join('');
}

async function cancelOrder(symbol, orderId) {
    if (!confirm('Bu emri iptal etmek istediğinizden emin misiniz?')) return;

    // Loading state
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '⏳';
    btn.disabled = true;

    try {
        const res = await fetch(API + `/binance/order/${orderId}?symbol=${symbol}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + AUTH.token }
        });

        const data = await res.json();
        if (res.ok) {
            showToast('success', '✅ Emir iptal edildi');
            loadOpenOrders();
        } else {
            showToast('error', '❌ ' + (data.error || 'İptal başarısız'));
            btn.textContent = originalText;
            btn.disabled = false;
        }
    } catch (e) {
        console.error('Cancel order error:', e);
        showToast('error', '❌ Bağlantı hatası: ' + e.message);
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// ─── Load All Trades (PARALLEL FETCH) ───
async function loadAllTrades() {
    if (!AUTH.token) return;

    let income = [];
    try {
        const incomeRes = await fetch(API + '/binance/income?limit=1000', {
            headers: { 'Authorization': 'Bearer ' + AUTH.token }
        });
        if (incomeRes.ok) {
            const incomeData = await incomeRes.json();
            income = Array.isArray(incomeData.income) ? incomeData.income : [];
        }
    } catch (e) {
        console.warn('Income history load error:', e);
    }

    const incomeSymbols = income
        .map(i => i.symbol)
        .filter(Boolean);
    const positionSymbols = (_portfolioData.openPositions || [])
        .map(p => p.symbol)
        .filter(Boolean);
    const symbols = [...new Set(['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', ...incomeSymbols, ...positionSymbols])];
    
    console.log(`[TRADES] Loading trades for ${symbols.length} symbols in parallel...`);
    
    try {
        // ═══════════════════════════════════════════════════════════════
        // PARALLEL FETCH - Tüm symbol'ları aynı anda çek
        // ═══════════════════════════════════════════════════════════════
        const startTime = performance.now();
        
        const tradePromises = symbols.map(symbol => 
            fetch(API + `/binance/trades?symbol=${symbol}&limit=50`, {
                headers: { 'Authorization': 'Bearer ' + AUTH.token }
            })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data && data.trades && data.trades.length > 0) {
                    return data.trades.map(t => ({
                        ...t,
                        isBuyer: t.buyer || t.side === 'BUY'
                    }));
                }
                return [];
            })
            .catch(e => {
                console.warn(`Failed to load trades for ${symbol}:`, e);
                return [];
            })
        );
        
        const allTradesArrays = await Promise.all(tradePromises);
        const allTrades = allTradesArrays.flat();
        
        const endTime = performance.now();
        console.log(`[TRADES] ✅ Loaded ${allTrades.length} trades in ${(endTime - startTime).toFixed(0)}ms (parallel)`);

        // Sort by time descending
        allTrades.sort((a, b) => b.time - a.time);
        
        _portfolioData.trades = allTrades;
        _portfolioData.income = income;
        _renderTradeHistory(allTrades);
        updatePnLChart(_getRealizedPnlEvents());
        
        console.log(`Loaded ${allTrades.length} trades and ${income.length} income rows total`);
        
    } catch (e) {
        console.warn('Trade history load error:', e);
    }
}

function _renderTradeHistory(trades) {
    const tbody = document.getElementById('pf-trades-body');
    if (!tbody) return;

    if (trades.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="padding:40px;text-align:center;color:var(--t3)"><div style="font-size:48px;margin-bottom:16px;opacity:0.3">📊</div><div style="font-size:14px;font-weight:600;margin-bottom:8px">Henüz işlem yok</div><div style="font-size:12px;opacity:0.6">İlk işleminizi yaptığınızda burada görünecek</div></td></tr>';
        
        // Reset commission total
        const commissionEl = document.getElementById('pf-total-commission');
        if (commissionEl) commissionEl.textContent = '$0.00';
        
        return;
    }

    // Calculate total commission
    let totalCommission = 0;
    trades.forEach(t => {
        totalCommission += parseFloat(t.commission || 0);
    });

    tbody.innerHTML = trades.slice(0, 100).map(t => {
        const isBuy = t.isBuyer;
        const date = new Date(t.time);
        const price = parseFloat(t.price);
        const qty = parseFloat(t.qty);
        const total = price * qty;
        const commission = parseFloat(t.commission || 0);

        return `<tr style="border-bottom:1px solid rgba(255,255,255,0.03)">
            <td style="padding:12px 16px;font-size:12px;color:var(--t3);font-family:var(--mono)">${date.toLocaleDateString('tr-TR')} ${date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</td>
            <td style="padding:12px 16px;font-weight:600;font-family:var(--mono)">${t.symbol}</td>
            <td style="padding:12px 16px;text-align:center">
                <span style="padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;background:${isBuy ? 'rgba(0,230,118,.15)' : 'rgba(239,83,80,.15)'};color:${isBuy ? 'var(--green)' : 'var(--red)'}">${isBuy ? 'BUY' : 'SELL'}</span>
            </td>
            <td style="padding:12px 16px;text-align:right;font-family:var(--mono);font-size:13px">$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
            <td style="padding:12px 16px;text-align:right;font-family:var(--mono);font-size:13px">${qty.toFixed(6)}</td>
            <td style="padding:12px 16px;text-align:right;font-family:var(--mono);font-size:13px;font-weight:600">$${total.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
            <td style="padding:12px 16px;text-align:right;font-family:var(--mono);font-size:12px;color:var(--t3)">$${commission.toFixed(4)}</td>
        </tr>`;
    }).join('');
    
    // Update total commission display (2 decimal places)
    const commissionEl = document.getElementById('pf-total-commission');
    if (commissionEl) {
        commissionEl.textContent = '$' + totalCommission.toFixed(2);
    }
}

// ─── Calculate Statistics ───
function _getRealizedPnlEvents() {
    const incomeRows = Array.isArray(_portfolioData.income) ? _portfolioData.income : [];
    const realizedRows = incomeRows
        .filter(i => i.incomeType === 'REALIZED_PNL')
        .map(i => ({
            time: Number(i.time || 0),
            pnl: Number(i.income || 0),
            symbol: i.symbol || ''
        }))
        .filter(i => Number.isFinite(i.time) && Number.isFinite(i.pnl));

    if (realizedRows.length > 0) {
        return realizedRows.sort((a, b) => a.time - b.time);
    }

    return (_portfolioData.trades || [])
        .map(t => ({
            time: Number(t.time || 0),
            pnl: Number(t.realizedPnl || 0),
            symbol: t.symbol || ''
        }))
        .filter(t => Number.isFinite(t.time) && Number.isFinite(t.pnl) && Math.abs(t.pnl) >= 0.01)
        .sort((a, b) => a.time - b.time);
}

function _getCommissionTotal(tradesForPeriod, periodStart = 0) {
    const incomeRows = Array.isArray(_portfolioData.income) ? _portfolioData.income : [];
    const commissionRows = incomeRows.filter(i => i.incomeType === 'COMMISSION' && Number(i.time || 0) >= periodStart);
    if (commissionRows.length > 0) {
        return commissionRows.reduce((sum, i) => sum + Math.abs(Number(i.income || 0)), 0);
    }
    return (tradesForPeriod || []).reduce((sum, t) => sum + Number(t.commission || 0), 0);
}

function _periodStart(period) {
    const now = Date.now();
    if (period === 'today') return now - 24 * 60 * 60 * 1000;
    if (period === 'week') return now - 7 * 24 * 60 * 60 * 1000;
    if (period === 'month') return now - 30 * 24 * 60 * 60 * 1000;
    return 0;
}

function _calculateStatistics(period = 'all') {
    const trades = _portfolioData.trades;

    try {
        const realizedEvents = _getRealizedPnlEvents();
        const periodStart = _periodStart(period);
        const periodEvents = realizedEvents.filter(e => e.time >= periodStart);
        const periodTrades = (trades || []).filter(t => Number(t.time || 0) >= periodStart);

        // Calculate P&L from realizedPnl field
        let totalPnL = 0;
        let totalVolume = 0;
        let totalCommission = 0;
        let wins = 0;
        let losses = 0;
        let breakeven = 0;
        let totalWinAmount = 0;
        let totalLossAmount = 0;
        let maxWin = 0;
        let maxLoss = 0;

        const now = Date.now();
        const dayAgo = now - 24 * 60 * 60 * 1000;
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

        let dailyPnL = 0, weeklyPnL = 0, monthlyPnL = 0;
        let dailyTrades = 0, dailyVolume = 0;
        
        // Maximum Drawdown hesaplama için
        let peak = 0;
        let maxDrawdown = 0;
        let runningBalance = 5000; // Başlangıç sermayesi

        periodTrades.forEach(t => {
            const price = parseFloat(t.price);
            const qty = parseFloat(t.qty);
            const total = price * qty;

            totalVolume += total;

            if (t.time >= dayAgo) {
                dailyTrades++;
                dailyVolume += total;
            }
        });

        totalCommission = _getCommissionTotal(periodTrades, periodStart);

        periodEvents.forEach(t => {
            const pnl = parseFloat(t.pnl || 0);
            totalPnL += pnl;

            // Running balance güncelle
            runningBalance += pnl;
            
            // Peak güncelle
            if (runningBalance > peak) {
                peak = runningBalance;
            }
            
            // Drawdown hesapla
            const drawdown = peak > 0 ? ((peak - runningBalance) / peak) * 100 : 0;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
            
            // Başa baş kontrolü (±$0.50 tolerans)
            if (Math.abs(pnl) < 0.50) {
                breakeven++;
            } else if (pnl > 0) {
                wins++;
                totalWinAmount += pnl;
                if (pnl > maxWin) maxWin = pnl;
            } else {
                losses++;
                totalLossAmount += Math.abs(pnl);
                if (Math.abs(pnl) > maxLoss) maxLoss = Math.abs(pnl);
            }

        });

        realizedEvents.forEach(t => {
            const pnl = Number(t.pnl || 0);
            if (t.time >= dayAgo) dailyPnL += pnl;
            if (t.time >= weekAgo) weeklyPnL += pnl;
            if (t.time >= monthAgo) monthlyPnL += pnl;
        });

        // Update portfolio data
        _portfolioData.totalPnL = totalPnL;
        _portfolioData.dailyPnL = dailyPnL;
        _portfolioData.weeklyPnL = weeklyPnL;
        _portfolioData.monthlyPnL = monthlyPnL;

        const winRate = wins + losses > 0 ? (wins / (wins + losses) * 100) : 0;
        const profitFactor = totalLossAmount > 0 ? (totalWinAmount / totalLossAmount) : (totalWinAmount > 0 ? 999 : 0);
        const avgWin = wins > 0 ? (totalWinAmount / wins) : 0;
        const avgLoss = losses > 0 ? (totalLossAmount / losses) : 0;
        const riskReward = avgLoss > 0 ? (avgWin / avgLoss) : (avgWin > 0 ? 999 : 0);
        const netPnlTotal = totalPnL - totalCommission;

        // Update P&L cards with correct colors
        const dailyPnlEl = document.getElementById('pf-daily-pnl');
        if (dailyPnlEl) {
            dailyPnlEl.textContent = _formatPnL(dailyPnL);
            dailyPnlEl.style.color = dailyPnL >= 0 ? '#0ecb81' : '#f6465d';
        }
        
        const weeklyPnlEl = document.getElementById('pf-weekly-pnl');
        if (weeklyPnlEl) {
            weeklyPnlEl.textContent = _formatPnL(weeklyPnL);
            weeklyPnlEl.style.color = weeklyPnL >= 0 ? '#0ecb81' : '#f6465d';
        }
        
        const monthlyPnlEl = document.getElementById('pf-monthly-pnl');
        if (monthlyPnlEl) {
            monthlyPnlEl.textContent = _formatPnL(_portfolioData.totalPnL);
            monthlyPnlEl.style.color = _portfolioData.totalPnL >= 0 ? '#0ecb81' : '#f6465d';
        }
        
        // Update mini charts
        if (typeof updatePnlCharts === 'function') {
            updatePnlCharts(dailyPnL, weeklyPnL, monthlyPnL);
        }

        // Performans Raporu - Kapsamlı
        const totalTradesEl = document.getElementById('pf-total-trades');
        const totalWinsEl = document.getElementById('pf-total-wins');
        const totalLossesEl = document.getElementById('pf-total-losses');
        const totalBreakevenEl = document.getElementById('pf-total-breakeven');
        const winRateEl = document.getElementById('pf-win-rate');
        const profitFactorEl = document.getElementById('pf-profit-factor');
        const avgWinEl = document.getElementById('pf-avg-win');
        const avgLossEl = document.getElementById('pf-avg-loss');
        const riskRewardEl = document.getElementById('pf-risk-reward');
        const maxWinEl = document.getElementById('pf-max-win');
        const maxLossEl = document.getElementById('pf-max-loss');
        const maxDrawdownEl = document.getElementById('pf-max-drawdown');
        const totalVolumeEl = document.getElementById('pf-total-volume');
        const totalCommissionReportEl = document.getElementById('pf-total-commission-report');
        const netPnlTotalEl = document.getElementById('pf-net-pnl-total');
        const dailyVolumeEl = document.getElementById('pf-daily-volume');
        
        if (totalTradesEl) totalTradesEl.textContent = periodEvents.length;
        if (totalWinsEl) totalWinsEl.textContent = wins;
        if (totalLossesEl) totalLossesEl.textContent = losses;
        if (totalBreakevenEl) totalBreakevenEl.textContent = breakeven;
        
        if (winRateEl) {
            winRateEl.textContent = winRate.toFixed(1) + '%';
            // Sadece metin rengi değişsin
            winRateEl.style.color = winRate >= 50 ? '#10b981' : '#ef4444';
        }
        
        if (profitFactorEl) {
            profitFactorEl.textContent = profitFactor >= 999 ? '∞' : profitFactor.toFixed(2);
            // Sadece metin rengi değişsin
            profitFactorEl.style.color = profitFactor >= 2 ? '#10b981' : (profitFactor >= 1 ? '#fbbf24' : '#ef4444');
        }
        
        if (avgWinEl) avgWinEl.textContent = '+$' + avgWin.toFixed(2);
        if (avgLossEl) avgLossEl.textContent = '-$' + avgLoss.toFixed(2);
        
        if (riskRewardEl) {
            riskRewardEl.textContent = riskReward >= 999 ? '∞' : riskReward.toFixed(2);
            riskRewardEl.style.color = riskReward >= 1.5 ? '#10b981' : (riskReward >= 1 ? '#fbbf24' : '#ef4444');
        }
        
        if (maxWinEl) maxWinEl.textContent = '+$' + maxWin.toFixed(2);
        if (maxLossEl) maxLossEl.textContent = '-$' + maxLoss.toFixed(2);
        
        if (maxDrawdownEl) {
            maxDrawdownEl.textContent = maxDrawdown.toFixed(2) + '%';
            // Sadece metin rengi değişsin
            maxDrawdownEl.style.color = maxDrawdown < 10 ? '#10b981' : (maxDrawdown < 20 ? '#fbbf24' : '#ef4444');
        }
        
        if (totalVolumeEl) totalVolumeEl.textContent = '$' + totalVolume.toLocaleString('en-US', { maximumFractionDigits: 0 });
        if (totalCommissionReportEl) totalCommissionReportEl.textContent = '$' + totalCommission.toFixed(2);
        
        if (netPnlTotalEl) {
            netPnlTotalEl.textContent = _formatPnL(netPnlTotal);
            // Sadece metin rengi değişsin, arka plan sabit
            netPnlTotalEl.style.color = netPnlTotal >= 0 ? '#10b981' : '#ef4444';
        }
        
        // Günlük metrikler
        if (dailyVolumeEl) dailyVolumeEl.textContent = '$' + dailyVolume.toLocaleString('en-US', { maximumFractionDigits: 0 });
        
        // Toplam P&L (en alttaki kart)
        const totalPnlBottomEl = document.getElementById('pf-total-pnl-bottom');
        if (totalPnlBottomEl) {
            totalPnlBottomEl.textContent = _formatPnL(totalPnL);
            // Sadece metin rengi değişsin
            totalPnlBottomEl.style.color = totalPnL >= 0 ? '#10b981' : '#ef4444';
        }
        
    } catch (error) {
        console.error('Error in _calculateStatistics:', error);
    }
}

// Tarih filtresi fonksiyonu
function filterReportByPeriod(period) {
    console.log('[FILTER] Filtering report by period:', period);
    
    // Aktif filter butonunu güncelle
    document.querySelectorAll('.period-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.period === period) {
            btn.classList.add('active');
        }
    });
    
    // İstatistikleri yeniden hesapla
    _calculateStatistics(period || 'all');
    
    // Trade history'yi filtrele ve yeniden render et
    const periodStart = _periodStart(period);
    const filteredTrades = _portfolioData.trades.filter(t => Number(t.time || 0) >= periodStart);
    _renderTradeHistory(filteredTrades);
    
    console.log(`[FILTER] Showing ${filteredTrades.length} trades for period: ${period}`);
}

function _setDefaultStats() {
    const zeros = ['pf-daily-pnl', 'pf-weekly-pnl', 'pf-monthly-pnl'];
    zeros.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = '—';
            el.style.color = 'rgba(255,255,255,0.4)';
        }
    });
    
    const numZeros = ['pf-daily-volume', 'pf-avg-leverage', 'pf-open-positions-count',
                      'pf-total-trades', 'pf-total-wins', 'pf-total-losses', 'pf-total-breakeven', 
                      'pf-win-rate', 'pf-profit-factor', 'pf-avg-win', 'pf-avg-loss', 
                      'pf-risk-reward', 'pf-max-win', 'pf-max-loss', 'pf-max-drawdown',
                      'pf-total-volume', 'pf-total-commission-report', 'pf-net-pnl-total', 'pf-total-pnl-bottom'];
    numZeros.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '—';
    });
}

function _formatPnL(value) {
    const sign = value > 0 ? '+' : (value < 0 ? '-' : '');
    return sign + '$' + Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

// ─── PnL Chart ───
function updatePnLChart(trades) {
    const chartContainer = document.getElementById('pf-pnl-chart');
    if (!chartContainer) return;

    if (!_pnlChart) {
        _pnlChart = LightweightCharts.createChart(chartContainer, {
            layout: { 
                background: { type: 'solid', color: 'transparent' }, 
                textColor: 'rgba(255, 255, 255, 0.5)' 
            },
            grid: { 
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' }, 
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' } 
            },
            timeScale: { 
                timeVisible: true,
                secondsVisible: false,
                borderColor: 'rgba(255,255,255,0.1)' 
            },
            rightPriceScale: { 
                borderColor: 'rgba(255,255,255,0.1)' 
            }
        });
        
        _pnlSeries = _pnlChart.addAreaSeries({
            topColor: 'rgba(0, 230, 118, 0.4)',
            bottomColor: 'rgba(0, 230, 118, 0.0)',
            lineColor: 'rgba(0, 230, 118, 1)',
            lineWidth: 2,
        });
        
        new ResizeObserver(entries => {
            if (entries.length === 0 || entries[0].target !== chartContainer) return;
            const newRect = entries[0].contentRect;
            _pnlChart.applyOptions({ height: newRect.height, width: newRect.width });
        }).observe(chartContainer);
    }
    
    // Sort trades ascending by time
    const sortedTrades = [...trades].sort((a, b) => a.time - b.time);
    
    let cumulative = 0;
    const chartData = [];
    
    if (sortedTrades.length === 0) {
        chartData.push({ time: Math.floor(Date.now() / 1000) - 86400, value: 0 });
        chartData.push({ time: Math.floor(Date.now() / 1000), value: 0 });
    } else {
        sortedTrades.forEach(t => {
            cumulative += parseFloat(t.pnl ?? t.realizedPnl ?? t.income ?? 0);
            chartData.push({
                time: Math.floor(t.time / 1000),
                value: cumulative
            });
        });
    }

    const uniqueData = [];
    chartData.forEach(d => {
        if (uniqueData.length > 0 && uniqueData[uniqueData.length - 1].time === d.time) {
            uniqueData[uniqueData.length - 1].value = d.value;
        } else {
            uniqueData.push(d);
        }
    });

    _pnlSeries.setData(uniqueData);
    
    if (cumulative < 0) {
        _pnlSeries.applyOptions({
            topColor: 'rgba(239, 83, 80, 0.4)',
            bottomColor: 'rgba(239, 83, 80, 0.0)',
            lineColor: 'rgba(239, 83, 80, 1)',
        });
    } else {
        _pnlSeries.applyOptions({
            topColor: 'rgba(0, 230, 118, 0.4)',
            bottomColor: 'rgba(0, 230, 118, 0.0)',
            lineColor: 'rgba(0, 230, 118, 1)',
        });
    }
    
    try {
        _pnlChart.timeScale().fitContent();
    } catch(e){}
}

// ─── Close Position from Portfolio ───
async function closePositionFromPortfolio(symbol, positionAmt, side, positionSide) {
    const amount = Math.abs(parseFloat(positionAmt));
    
    // Confirmation dialog
    const confirmed = confirm(
        `${symbol} pozisyonunu kapatmak istediğinizden emin misiniz?\n\n` +
        `Side: ${side}\n` +
        `Miktar: ${amount.toFixed(3)}\n\n` +
        `Bu işlem geri alınamaz!`
    );
    
    if (!confirmed) return;
    
    try {
        // Close position with market order
        const closeRes = await fetch(API + '/binance/order', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + AUTH.token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                symbol: symbol,
                side: side === 'Long' ? 'SELL' : 'BUY',  // Ters yön
                type: 'MARKET',
                quantity: amount,
                reduceOnly: true,
                positionSide: positionSide
            })
        });
        
        const closeData = await closeRes.json();
        
        if (closeRes.ok) {
            showToast('success', `${symbol} pozisyonu kapatıldı`);
            
            // Pozisyonları yenile
            setTimeout(() => {
                loadPositions(false);
                loadPortfolio();
            }, 1000);
        } else {
            showToast('error', closeData.error || 'Pozisyon kapatılamadı');
        }
    } catch (e) {
        console.error('Close position error:', e);
        showToast('error', 'Bağlantı hatası: ' + e.message);
    }
}

// ─── API Status Helpers ───
function _setApiConnected(connected) {
    const iconEl = document.getElementById('pf-api-status-icon');
    if (iconEl) {
        iconEl.textContent = connected ? '🟢' : '🔴';
        iconEl.style.textShadow = connected ? '0 0 10px rgba(16,185,129,0.5)' : '0 0 10px rgba(239,68,68,0.5)';
        iconEl.style.filter = 'none';
        iconEl.title = connected ? 'API Bağlı' : 'API Bağlantısı Yok';
    }
}

function _setApiNotConfigured() {
    const iconEl = document.getElementById('pf-api-status-icon');
    if (iconEl) {
        iconEl.textContent = '🔴';
        iconEl.style.textShadow = '0 0 10px rgba(239,68,68,0.5)';
        iconEl.style.filter = 'none';
        iconEl.title = 'API Yapılandırılmamış';
    }
    
    const listEl = document.getElementById('pf-assets-list');
    const tbody3 = document.getElementById('pf-trades-body');
    
    const msg = 'API anahtarları yapılandırılmamış. Lütfen API Ayarları bölümünden anahtarlarınızı ekleyin.';
    if (listEl) listEl.innerHTML = '<div style="padding:40px;text-align:center;color:rgba(255,255,255,0.3)">' + msg + '</div>';
    if (tbody3) tbody3.innerHTML = '<tr><td colspan="10" style="padding:40px;text-align:center;color:var(--t3)">' + msg + '</td></tr>';
    
    _setDefaultStats();
}

function _setApiError(error) {
    const iconEl = document.getElementById('pf-api-status-icon');
    if (iconEl) {
        iconEl.textContent = '🔴';
        iconEl.style.textShadow = '0 0 10px rgba(239,68,68,0.5)';
        iconEl.style.filter = 'none';
        iconEl.title = 'API Hatası: ' + error;
    }
    console.error('API Error:', error);
}

// ─── Portfolio Particles Animation ───
(function initPortfolioParticles() {
    const canvas = document.getElementById('portfolio-particle-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const container = document.getElementById('dash-portfolio');
    let W, H, particles = [];

    function resize() {
        W = container.offsetWidth || window.innerWidth;
        H = container.offsetHeight || window.innerHeight;
        canvas.width = W;
        canvas.height = H;
    }

    resize();
    window.addEventListener('resize', resize);

    // Create particles (20 yerine 40)
    for (let i = 0; i < 20; i++) {
        particles.push({
            x: Math.random() * W,
            y: Math.random() * H,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            r: Math.random() * 1.5 + 0.5,
            a: Math.random() * 0.2 + 0.05
        });
    }

    function draw() {
        // Only draw if portfolio page is visible
        if (container.style.display === 'none') {
            requestAnimationFrame(draw);
            return;
        }

        ctx.clearRect(0, 0, W, H);

        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = W;
            if (p.x > W) p.x = 0;
            if (p.y < 0) p.y = H;
            if (p.y > H) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${p.a})`;
            ctx.fill();
        });

        // Draw connections
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(255,255,255,${0.04 * (1 - d / 120)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(draw);
    }
    draw();
})();


// closePosition, showClosePositionModal, confirmClosePosition → close-position-modal.js
