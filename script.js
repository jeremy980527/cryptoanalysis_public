// 【重要】請確認這裡是你 Ngrok 的最新網址
const API_URL = "https://tunefully-abstemious-shu.ngrok-free.dev/api/results";

// 狀態變數
let previousDataMap = { bull: [], bear: [] }; // 用來比對通知 (Toast)
let isFirstLoad = true;

let settings = {
    notifications: false,
    sound: false,
    volume: 0.5,
    direction: 'all' // all, bull, bear
};

// 初始化音效環境
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playBell() {
    if (!settings.sound) return;
    if (audioContext.state === 'suspended') audioContext.resume();
    const now = audioContext.currentTime;
    const vol = settings.volume;

    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.type = 'sine'; osc1.frequency.setValueAtTime(1100, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(vol, now + 0.01);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    osc1.start(now); osc1.stop(now + 1.5);

    const osc2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();
    osc2.connect(gain2);
    gain2.connect(audioContext.destination);
    osc2.type = 'sine'; osc2.frequency.setValueAtTime(1650, now);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(vol * 0.5, now + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.start(now); osc2.stop(now + 0.5);
}

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupModal();
    updateDashboard();
    setInterval(updateDashboard, 10000); 
});

async function updateDashboard() {
    const statusText = document.getElementById('statusText');
    const dot = document.getElementById('dot');
    
    try {
        const res = await fetch(`${API_URL}?t=${new Date().getTime()}`, {
            headers: new Headers({ "ngrok-skip-browser-warning": "true" }),
        });
        const json = await res.json();
        
        if (json.status === 'success') {
            statusText.innerText = `最後更新: ${json.timestamp}`;
            dot.className = 'dot green';
            
            // 渲染列表 (包含排名比對)
            renderLists(json.data);

            // 檢查通知變動 (Toast)
            checkDiffAndNotify(json.data);
            
            // 更新狀態
            previousDataMap.bull = json.data.bull.map(i => i.name);
            previousDataMap.bear = json.data.bear.map(i => i.name);
            isFirstLoad = false;

        } else if (json.status === 'waiting') {
            statusText.innerText = '伺服器正在爬取運算中...';
            dot.className = 'dot orange';
        } else {
            statusText.innerText = '伺服器錯誤';
            dot.className = 'dot red';
        }
    } catch (e) {
        console.error(e);
        statusText.innerText = '無法連線';
        dot.className = 'dot red';
    }
}

// --- 渲染與排名邏輯 ---
function renderLists(data) {
    const container = document.getElementById('content');
    container.innerHTML = ''; 

    // 讀取上一輪排名數據
    let history = JSON.parse(localStorage.getItem('crypto_history')) || {};
    let newHistory = {}; 

    const createSection = (title, list, typeClass, icon) => {
        const sec = document.createElement('div');
        sec.className = `section ${typeClass}`;
        
        let listHtml = '';
        if (list.length === 0) {
            listHtml = '<div class="empty-msg">目前無符合條件幣種</div>';
        } else {
            listHtml = '<ul>' + list.map((item, index) => {
                const currentRank = index + 1;
                const name = item.name;
                
                // 儲存現在狀態
                newHistory[name] = { rank: currentRank, score: item.score };

                // 計算變動
                let rankDiffHtml = '';
                let scoreDiffHtml = '';
                
                if (history[name]) {
                    const prevRank = history[name].rank;
                    const rDiff = prevRank - currentRank; // 數字變小代表名次上升
                    
                    if (rDiff > 0) rankDiffHtml = `<span class="rank-change rank-up">▲${rDiff}</span>`;
                    else if (rDiff < 0) rankDiffHtml = `<span class="rank-change rank-down">▼${Math.abs(rDiff)}</span>`;
                    else rankDiffHtml = `<span class="rank-change rank-same">-</span>`;

                    const sDiff = item.score - history[name].score;
                    if (sDiff > 0) scoreDiffHtml = `<span style="color:#4CAF50; font-size:0.8em;">(+${sDiff})</span>`;
                    else if (sDiff < 0) scoreDiffHtml = `<span style="color:#F44336; font-size:0.8em;">(${sDiff})</span>`;
                } else {
                    rankDiffHtml = `<span class="rank-change rank-up" style="background:#2196F3; color:white;">NEW</span>`;
                }

                let displayMsg = item.msg.includes('爆量') 
                    ? item.msg.replace('爆量', '<span class="fire">🔥爆量</span>') 
                    : item.msg;

                // 構建 HTML
                return `
                <li onclick="toggleDetails(this)">
                    <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                        <div style="display:flex; align-items:center;">
                            <span style="color:#666; font-size:0.9em; margin-right:10px; width:20px;">#${currentRank}</span>
                            <span class="coin-name">${name}</span>
                            ${rankDiffHtml}
                        </div>
                        <div class="badges">
                            <span class="badge msg-badge">${displayMsg}</span>
                            <span class="badge score-badge">${item.score} <span style="font-size:0.8em;">分</span></span>
                            <span class="expand-icon">▼</span>
                        </div>
                    </div>
                    <div class="coin-details">
                        <div class="detail-item">
                            <span class="detail-label">分數變動</span>
                            <div class="detail-value">${scoreDiffHtml || '-'}</div>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">資金費率</span>
                            <div class="detail-value" style="color:${item.funding > 0 ? '#4CAF50':'#F44336'}">${item.funding}%</div>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">年化 APR</span>
                            <div class="detail-value">${item.apr}%</div>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">持倉/市值比</span>
                            <div class="detail-value">${item.oi_ratio}%</div>
                        </div>
                    </div>
                </li>
            `}).join('') + '</ul>';
        }
        sec.innerHTML = `<h3>${icon} ${title}</h3>${listHtml}`;
        return sec;
    };

    container.appendChild(createSection('多頭異常', data.bull, 'bull', '🚀'));
    container.appendChild(createSection('空頭異常', data.bear, 'bear', '📉'));
    container.appendChild(createSection('等待突破', data.neut, 'neut', '⚖️'));

    localStorage.setItem('crypto_history', JSON.stringify(newHistory));
}

// 展開詳情功能
function toggleDetails(element) {
    element.classList.toggle('expanded');
}

// --- 通知比對邏輯 ---
function checkDiffAndNotify(newData) {
    if (isFirstLoad) return; 

    const currBull = newData.bull.map(i => i.name);
    const currBear = newData.bear.map(i => i.name);

    const bullDiff = getDiff(previousDataMap.bull, currBull);
    const bearDiff = getDiff(previousDataMap.bear, currBear);

    let shouldNotify = false;
    let notifyDetails = [];
    let alertType = 'mixed';

    const watchBull = settings.direction === 'all' || settings.direction === 'bull';
    const watchBear = settings.direction === 'all' || settings.direction === 'bear';

    if (watchBull && (bullDiff.added.length > 0 || bullDiff.removed.length > 0)) {
        shouldNotify = true;
        if (bullDiff.added.length) notifyDetails.push(`<span class="added">🚀 多頭新增: ${bullDiff.added.join(', ')}</span>`);
        if (bullDiff.removed.length) notifyDetails.push(`<span class="removed">💨 多頭移除: ${bullDiff.removed.join(', ')}</span>`);
        alertType = 'bull';
    }

    if (watchBear && (bearDiff.added.length > 0 || bearDiff.removed.length > 0)) {
        shouldNotify = true;
        if (bearDiff.added.length) notifyDetails.push(`<span class="added">📉 空頭新增: ${bearDiff.added.join(', ')}</span>`);
        if (bearDiff.removed.length) notifyDetails.push(`<span class="removed">💨 空頭移除: ${bearDiff.removed.join(', ')}</span>`);
        alertType = (watchBull && (bullDiff.added.length || bullDiff.removed.length)) ? 'mixed' : 'bear';
    }

    if (shouldNotify) {
        playBell();
        showToastAlert("市場名單變動", notifyDetails.join('<br>'), alertType);
        if (settings.notifications && Notification.permission === "granted") {
            const summary = notifyDetails.map(s => s.replace(/<[^>]*>/g, '')).join('\n');
            new Notification("監控名單更新", { body: summary, icon: "https://cdn-icons-png.flaticon.com/512/2272/2272825.png" });
        }
    }
}

function getDiff(prev, curr) {
    return { added: curr.filter(x => !prev.includes(x)), removed: prev.filter(x => !curr.includes(x)) };
}

function showToastAlert(title, htmlContent, type) {
    const container = document.getElementById('notificationContainer');
    const toast = document.createElement('div');
    toast.className = `toast-alert ${type}`;
    toast.innerHTML = `<div class="toast-header"><span>${title}</span><span class="toast-close" onclick="this.parentElement.parentElement.remove()">✕</span></div><div class="toast-body">${htmlContent}</div>`;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 15000);
}

function setupModal() {
    const modal = document.getElementById("settingsModal");
    const btn = document.getElementById("settingsBtn");
    const close = document.getElementsByClassName("close-btn")[0];
    btn.onclick = () => modal.style.display = "block";
    close.onclick = () => modal.style.display = "none";
    window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; }

    const notifyToggle = document.getElementById("notifyToggle");
    const soundToggle = document.getElementById("soundToggle");
    const directionSelect = document.getElementById("directionSelect");
    const volSlider = document.getElementById("volumeSlider");
    const volText = document.getElementById("volValue");
    const testBtn = document.getElementById("testNotifyBtn");

    notifyToggle.checked = settings.notifications;
    soundToggle.checked = settings.sound;
    directionSelect.value = settings.direction;
    volSlider.value = settings.volume * 100;
    volText.innerText = Math.round(settings.volume * 100) + "%";

    notifyToggle.onchange = () => { settings.notifications = notifyToggle.checked; if(settings.notifications && Notification.permission!=="granted") Notification.requestPermission(); saveSettings(); };
    soundToggle.onchange = () => { settings.sound = soundToggle.checked; if(settings.sound && audioContext.state==='suspended') audioContext.resume(); saveSettings(); };
    directionSelect.onchange = () => { settings.direction = directionSelect.value; saveSettings(); };
    volSlider.oninput = () => { settings.volume = volSlider.value/100; volText.innerText = volSlider.value+"%"; saveSettings(); };
    testBtn.onclick = () => { playBell(); showToastAlert("測試通知", "<span class='added'>🚀 多頭新增: BTC</span>", "bull"); };
}

function saveSettings() { localStorage.setItem('cryptoMonitorSettings', JSON.stringify(settings)); }
function loadSettings() { const saved = localStorage.getItem('cryptoMonitorSettings'); if (saved) settings = { ...settings, ...JSON.parse(saved) }; }
