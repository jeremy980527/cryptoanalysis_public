// 請確認這是你的 Ngrok 網址
const API_BASE = "https://tunefully-abstemious-shu.ngrok-free.dev";

// --- 密碼鎖邏輯 ---
document.getElementById('loginBtn').onclick = checkPassword;
document.getElementById('loginInput').addEventListener("keypress", (e) => {
    if (e.key === "Enter") checkPassword();
});

function checkPassword() {
    const input = document.getElementById('loginInput').value;
    // 🔒 這裡設定你的後台密碼 (目前是 1234)
    if (input === "1234") {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('adminContent').style.display = 'block';
        fetchData(); // 登入成功後開始抓資料
    } else {
        alert("密碼錯誤！");
        document.getElementById('loginInput').value = "";
    }
}

// --- 圖表變數 ---
let pieChartInstance = null;
let barChartInstance = null;

async function fetchData() {
    try {
        // 呼叫我們剛寫好的 Admin API
        const res = await fetch(`${API_BASE}/api/admin/data`);
        const json = await res.json();

        // 1. 更新瀏覽人數
        document.getElementById('visitCount').innerText = json.stats.total_visits;

        // 2. 準備圖表資料
        const bulls = json.market.bull || [];
        const bears = json.market.bear || [];
        const neuts = json.market.neut || [];

        // 畫圓餅圖 (分佈)
        renderPieChart(bulls.length, bears.length, neuts.length);

        // 畫長條圖 (Top 5 高分)
        // 合併所有幣種並排序，取前 5 名
        const allCoins = [...bulls, ...bears, ...neuts]
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
        renderBarChart(allCoins);

    } catch (e) {
        console.error(e);
        alert("無法連線到後端，請確認 Ngrok 是否開啟");
    }
}

function renderPieChart(b, be, n) {
    const ctx = document.getElementById('pieChart').getContext('2d');
    if (pieChartInstance) pieChartInstance.destroy(); // 重繪前先銷毀舊的

    pieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['多頭', '空頭', '等待'],
            datasets: [{
                data: [b, be, n],
                backgroundColor: ['#4CAF50', '#F44336', '#2196F3'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom', labels: { color: 'white' } } }
        }
    });
}

function renderBarChart(topCoins) {
    const ctx = document.getElementById('barChart').getContext('2d');
    if (barChartInstance) barChartInstance.destroy();

    barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topCoins.map(c => c.name),
            datasets: [{
                label: '綜合分數',
                data: topCoins.map(c => c.score),
                backgroundColor: topCoins.map(c => {
                    // 根據分數高低給不同顏色
                    if (c.score >= 80) return '#FF9800'; // 金色
                    return '#2196F3'; // 藍色
                }),
                borderColor: 'rgba(0,0,0,0)',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, grid: { color: '#444' }, ticks: { color: '#ccc' } },
                x: { grid: { display: false }, ticks: { color: '#ccc' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}