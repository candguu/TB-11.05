/* PNL MINI CHARTS */
function renderLineChart(canvasId, data, initialBalance) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    if (!data || data.length === 0) {
        const y = height / 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(4, y);
        ctx.lineTo(width - 4, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Veri Yok', width / 2, y - 10);
        return;
    }
    const values = data.map(d => d.close);
    const minVal = Math.min(...values, initialBalance);
    const maxVal = Math.max(...values, initialBalance);
    const range = maxVal - minVal || 1;
    const padding = 8;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const baselineY = padding + chartHeight - ((initialBalance - minVal) / range) * chartHeight;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(padding, baselineY);
    ctx.lineTo(width - padding, baselineY);
    ctx.stroke();
    ctx.setLineDash([]);
    const denominator = Math.max(data.length - 1, 1);
    const points = data.map((d, i) => {
        const x = padding + (i / denominator) * chartWidth;
        const y = padding + chartHeight - ((d.close - minVal) / range) * chartHeight;
        return { x, y };
    });
    const lastValue = data[data.length - 1].close;
    const isPositive = lastValue >= initialBalance;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    if (isPositive) {
        gradient.addColorStop(0, 'rgba(14, 203, 129, 0.3)');
        gradient.addColorStop(1, 'rgba(14, 203, 129, 0)');
    } else {
        gradient.addColorStop(0, 'rgba(246, 70, 93, 0.3)');
        gradient.addColorStop(1, 'rgba(246, 70, 93, 0)');
    }
    ctx.beginPath();
    ctx.moveTo(points[0].x, height - padding);
    ctx.lineTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.lineTo(points[points.length - 1].x, height - padding);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = isPositive ? '#0ecb81' : '#f6465d';
    ctx.lineWidth = 2;
    ctx.stroke();
    points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
        ctx.fillStyle = isPositive ? '#0ecb81' : '#f6465d';
        ctx.fill();
    });
}
function generateMockLineData(count, initialBalance) {
    const data = [];
    let balance = initialBalance;
    for (let i = 0; i < count; i++) {
        const change = (Math.random() - 0.5) * 100;
        balance += change;
        data.push({
            timestamp: Date.now() - (count - i) * 60 * 60 * 1000,
            open: balance - change,
            high: balance + Math.abs(change) * 0.5,
            low: balance - Math.abs(change) * 0.5,
            close: balance
        });
    }
    return data;
}
async function updatePnlCharts(dailyPnl, weeklyPnl, monthlyPnl) {
    try {
        const token = (window.AUTH && AUTH.token) || localStorage.getItem('tb_token');
        if (!token) {
            renderLineChart('pf-daily-chart', [], 0);
            renderLineChart('pf-weekly-chart', [], 0);
            renderLineChart('pf-monthly-chart', [], 0);
            updateChangeIndicators([], [], [], 0);
            return;
        }
        const response = await fetch('/api/binance/pnl-history', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) {
            console.warn('PnL history API failed');
            renderLineChart('pf-daily-chart', [], 0);
            renderLineChart('pf-weekly-chart', [], 0);
            renderLineChart('pf-monthly-chart', [], 0);
            updateChangeIndicators([], [], [], 0);
            return;
        }
        const data = await response.json();
        const initialBalance = data.initialBalance || 5000;
        renderLineChart('pf-daily-chart', data.daily, initialBalance);
        renderLineChart('pf-weekly-chart', data.weekly, initialBalance);
        renderLineChart('pf-monthly-chart', data.total, initialBalance);
        updateChangeIndicators(data.daily, data.weekly, data.total, initialBalance);
    } catch (error) {
        console.error('Error:', error);
        renderLineChart('pf-daily-chart', [], 0);
        renderLineChart('pf-weekly-chart', [], 0);
        renderLineChart('pf-monthly-chart', [], 0);
        updateChangeIndicators([], [], [], 0);
    }
}
function updatePnlChartsWithMockData(dailyPnl, weeklyPnl, monthlyPnl) {
    const initialBalance = 5000;
    const dailyData = generateMockLineData(24, initialBalance);
    const weeklyData = generateMockLineData(7, initialBalance);
    const totalData = generateMockLineData(30, initialBalance);
    renderLineChart('pf-daily-chart', dailyData, initialBalance);
    renderLineChart('pf-weekly-chart', weeklyData, initialBalance);
    renderLineChart('pf-monthly-chart', totalData, initialBalance);
    updateChangeIndicators(dailyData, weeklyData, totalData, initialBalance);
}
function updateChangeIndicators(dailyData, weeklyData, totalData, initialBalance) {
    const calculateChange = (data) => {
        if (!data || data.length === 0) return null;
        const firstValue = data[0].open;
        const lastValue = data[data.length - 1].close;
        if (firstValue === 0) return lastValue > 0 ? 100 : (lastValue < 0 ? -100 : 0);
        return ((lastValue - firstValue) / Math.abs(firstValue)) * 100;
    };
    const dailyChange = calculateChange(dailyData);
    const weeklyChange = calculateChange(weeklyData);
    const totalChange = calculateChange(totalData);
    const dailyChangeEl = document.getElementById('pf-daily-change');
    const weeklyChangeEl = document.getElementById('pf-weekly-change');
    const monthlyChangeEl = document.getElementById('pf-monthly-change');
    if (dailyChangeEl) {
        if (dailyChange === null) {
            dailyChangeEl.textContent = 'Veri yok';
            dailyChangeEl.style.color = 'rgba(255,255,255,0.4)';
        } else {
            const sign = dailyChange > 0 ? '+' : '';
            dailyChangeEl.textContent = sign + dailyChange.toFixed(2) + '% (24 saat)';
            dailyChangeEl.style.color = dailyChange >= 0 ? '#0ecb81' : '#f6465d';
        }
    }
    if (weeklyChangeEl) {
        if (weeklyChange === null) {
            weeklyChangeEl.textContent = 'Veri yok';
            weeklyChangeEl.style.color = 'rgba(255,255,255,0.4)';
        } else {
            const sign = weeklyChange > 0 ? '+' : '';
            weeklyChangeEl.textContent = sign + weeklyChange.toFixed(2) + '% (7 gün)';
            weeklyChangeEl.style.color = weeklyChange >= 0 ? '#0ecb81' : '#f6465d';
        }
    }
    if (monthlyChangeEl) {
        if (totalChange === null) {
            monthlyChangeEl.textContent = 'Veri yok';
            monthlyChangeEl.style.color = 'rgba(255,255,255,0.4)';
        } else {
            const sign = totalChange > 0 ? '+' : '';
            monthlyChangeEl.textContent = sign + totalChange.toFixed(2) + '% (toplam)';
            monthlyChangeEl.style.color = totalChange >= 0 ? '#0ecb81' : '#f6465d';
        }
    }
}
