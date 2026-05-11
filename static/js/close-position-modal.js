// Close Position Modal Functions

// Delegated click - portföy tablosundaki Kapat butonları (dinamik içerik)
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.pf-close-btn');
    if (btn) {
        e.preventDefault();
        e.stopPropagation();
        const symbol = btn.dataset.symbol;
        const amount = parseFloat(btn.dataset.amount);
        const side = btn.dataset.side;
        const positionSide = btn.dataset.positionSide;
        if (symbol != null && !isNaN(amount)) {
            closePosition(symbol, amount, side || 'Long', positionSide);
        }
    }
});

async function closePosition(symbol, positionAmt, side, positionSide) {
    if (!AUTH.token) {
        alert('Oturum bulunamadı!');
        return;
    }
    
    const sel = positionSide && (positionSide === 'LONG' || positionSide === 'SHORT')
        ? `.position-row[data-symbol="${symbol}"][data-position-side="${positionSide}"]`
        : `.position-row[data-symbol="${symbol}"]`;
    const row = document.querySelector(sel);
    if (!row) return;
    
    const cells = Array.from(row.querySelectorAll('td'));
    if (cells.length < 9) return;
    
    const entryPrice = cells[2]?.textContent.trim() || '--';
    const lastPrice = cells[3]?.textContent.trim() || '--';
    const markPrice = cells[4]?.textContent.trim() || '--';
    const liqPrice = cells[5]?.textContent.trim() || '--';
    const margin = cells[6]?.textContent.trim() || '--';
    const marginRatio = cells[7]?.textContent.trim() || '--';
    
    const pnlCell = cells[8];
    const pnlDivs = pnlCell?.querySelectorAll('div');
    const pnlText = pnlDivs?.[0]?.textContent.trim() || '--';
    const roiText = pnlDivs?.[1]?.textContent.trim() || '--';
    
    showClosePositionModal({
        symbol, positionAmt, side, positionSide: positionSide || (side === 'Long' ? 'LONG' : 'SHORT'),
        entryPrice, lastPrice, markPrice, liqPrice, margin, marginRatio, pnl: pnlText, roi: roiText
    });
}

function showClosePositionModal(data) {
    const existingModal = document.getElementById('close-position-modal');
    if (existingModal) existingModal.remove();
    
    const isPnlPositive = data.pnl.includes('+');
    const pnlColor = isPnlPositive ? '#0ecb81' : '#f6465d';
    const sideColor = data.side === 'Long' ? '#0ecb81' : '#f6465d';
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 19).replace('T', ' ');
    
    const modal = document.createElement('div');
    modal.id = 'close-position-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);backdrop-filter:blur(10px);z-index:9999;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.3s';
    
    modal.innerHTML = `<div style="background:linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);border-radius:16px;padding:0;width:500px;max-width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);overflow:hidden;animation:slideUp 0.3s"><div style="background:linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);padding:24px;border-bottom:1px solid rgba(255,255,255,0.1);position:relative"><div style="position:absolute;top:16px;right:16px;font-size:10px;color:rgba(255,255,255,0.4);font-family:var(--mono)">${dateStr}</div><div style="font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Trading Bot</div><div style="font-size:24px;font-weight:700;color:#fff;margin-bottom:4px">${data.symbol} Perpetual</div><div style="display:flex;align-items:center;gap:12px"><span style="padding:4px 10px;border-radius:4px;font-size:11px;font-weight:700;background:${data.side === 'Long' ? 'rgba(14,203,129,.15)' : 'rgba(246,70,93,.15)'};color:${sideColor}">${data.side}</span><span style="font-size:13px;color:rgba(255,255,255,0.6)">10x Leverage</span></div></div><div style="padding:32px 24px;text-align:center;background:rgba(0,0,0,0.3)"><div style="font-size:48px;font-weight:700;color:${pnlColor};font-family:var(--mono);margin-bottom:8px">${data.pnl}</div><div style="font-size:20px;font-weight:600;color:${pnlColor};font-family:var(--mono)">${data.roi}</div></div><div style="padding:24px;display:grid;grid-template-columns:1fr 1fr;gap:20px"><div><div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">Entry Price</div><div style="font-size:16px;font-weight:600;color:#fff;font-family:var(--mono)">${data.entryPrice}</div></div><div><div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">Last Price</div><div style="font-size:16px;font-weight:600;color:#fbbf24;font-family:var(--mono)">${data.lastPrice}</div></div><div><div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">Mark Price</div><div style="font-size:16px;font-weight:600;color:#fff;font-family:var(--mono)">${data.markPrice}</div></div><div><div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">Liq. Price</div><div style="font-size:16px;font-weight:600;color:#f6465d;font-family:var(--mono)">${data.liqPrice}</div></div><div><div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">Margin</div><div style="font-size:16px;font-weight:600;color:#fff;font-family:var(--mono)">${data.margin}</div></div><div><div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">Margin Ratio</div><div style="font-size:16px;font-weight:600;color:#fff;font-family:var(--mono)">${data.marginRatio}</div></div></div><div style="padding:0 24px 24px;border-top:1px solid rgba(255,255,255,0.05);padding-top:20px"><div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">Position Size</div><div style="font-size:18px;font-weight:700;color:#fff;font-family:var(--mono)">${Math.abs(data.positionAmt).toFixed(3)} ${data.symbol.replace('USDT', '')}</div></div><div style="padding:24px;background:rgba(0,0,0,0.3);display:flex;gap:12px;border-top:1px solid rgba(255,255,255,0.1)"><button id="modal-cancel-btn" style="flex:1;padding:14px;border-radius:8px;border:2px solid rgba(255,255,255,0.2);background:transparent;color:#fff;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s;text-transform:uppercase;letter-spacing:0.5px">İptal</button><button id="modal-confirm-btn" style="flex:1;padding:14px;border-radius:8px;border:2px solid #f6465d;background:#f6465d;color:#fff;font-size:14px;font-weight:700;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 20px rgba(246,70,93,0.4);text-transform:uppercase;letter-spacing:0.5px">Pozisyonu Kapat</button></div></div>`;
    
    document.body.appendChild(modal);
    
    document.getElementById('modal-cancel-btn').addEventListener('click', closeClosePositionModal);
    document.getElementById('modal-confirm-btn').addEventListener('click', () => {
        confirmClosePosition(data.symbol, data.positionAmt, data.side, data.positionSide);
    });
    
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            closeClosePositionModal();
            document.removeEventListener('keydown', escHandler);
        }
    });
}

function closeClosePositionModal() {
    const modal = document.getElementById('close-position-modal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.2s';
        setTimeout(() => modal.remove(), 200);
    }
}

async function confirmClosePosition(symbol, positionAmt, side, positionSide) {
    if (!AUTH.token) return;
    
    try {
        const closeQty = Math.abs(positionAmt);
        const closeSide = positionAmt > 0 ? 'SELL' : 'BUY';
        const body = {
            symbol: symbol,
            side: closeSide,
            type: 'MARKET',
            quantity: parseFloat(closeQty.toFixed(3)),
            reduceOnly: true
        };
        if (positionSide && (positionSide === 'LONG' || positionSide === 'SHORT')) {
            body.positionSide = positionSide;
        }
        
        const res = await fetch(API + '/binance/order', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + AUTH.token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        const data = await res.json();
        
        if (res.ok) {
            closeClosePositionModal();
            showSuccessNotification(`${symbol} pozisyonu başarıyla kapatıldı!`);
            loadPositions(false);
            loadPortfolio();
        } else {
            alert(`❌ Pozisyon kapatılamadı: ${data.error || 'Bilinmeyen hata'}`);
        }
    } catch (e) {
        alert(`❌ Hata: ${e.message}`);
    }
}

function showSuccessNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = 'position:fixed;top:20px;right:20px;background:#0ecb81;color:#fff;padding:16px 24px;border-radius:8px;font-size:14px;font-weight:600;box-shadow:0 4px 20px rgba(14,203,129,0.4);z-index:10000;animation:slideInRight 0.3s';
    notification.textContent = '✓ ' + message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

window.closePosition = closePosition;
window.closeClosePositionModal = closeClosePositionModal;
window.confirmClosePosition = confirmClosePosition;
