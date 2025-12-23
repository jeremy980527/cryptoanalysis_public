const API_URL = "https://tunefully-abstemious-shu.ngrok-free.dev/api/results";

async function updateDashboard() {
    const statusText = document.getElementById('statusText');
    const dot = document.getElementById('dot');
    const content = document.getElementById('content');
    
    try {
        // 加上時間戳記防止快取，並加入通關密語 Header
        const res = await fetch(`${API_URL}?t=${new Date().getTime()}`, {
            headers: new Headers({
                "ngrok-skip-browser-warning": "true",
            }),
        });

        const json = await res.json();
        
        if (json.status === 'success') {
            statusText.innerText = `最後更新: ${json.timestamp}`;
            dot.className = 'dot green';
            renderLists(json.data);
        } else if (json.status === 'waiting') {
            statusText.innerText = '伺服器正在爬取運算中...';
            dot.className = 'dot orange';
        } else {
            statusText.innerText = '伺服器尚未運行, 請等待伺服器重新開啟...';
            //statusText.innerText = '伺服器發生內部錯誤';
            dot.className = 'dot red';
        }
    } catch (e) {
        console.error(e);
        statusText.innerText = '無法連線, 請稍後再試';
        dot.className = 'dot red';
    }
}

function renderLists(data) {
    const container = document.getElementById('content');
    container.innerHTML = ''; 

    const createSection = (title, list, typeClass, icon) => {
        const sec = document.createElement('div');
        sec.className = `section ${typeClass}`;
        
        let listHtml = '';
        if (list.length === 0) {
            listHtml = '<div class="empty-msg">目前無符合條件幣種</div>';
        } else {
            listHtml = '<ul>' + list.map(item => {
                let displayMsg = item.msg;
                if(displayMsg.includes('爆量')) {
                    displayMsg = displayMsg.replace('爆量', '<span class="fire">🔥爆量</span>');
                }
                return `
                <li>
                    <span class="coin-name">${item.name}</span>
                    <div class="badges">
                        <span class="badge msg-badge">${displayMsg}</span>
                        <span class="badge score-badge">綜合分數 ${item.score}%</span>
                    </div>
                </li>
            `}).join('') + '</ul>';
        }

        sec.innerHTML = `<h3>${icon} ${title}</h3>${listHtml}`;
        return sec;
    };

    container.appendChild(createSection('多頭異常 (Bullish)', data.bull, 'bull', '🚀'));
    container.appendChild(createSection('空頭異常 (Bearish)', data.bear, 'bear', '📉'));
    container.appendChild(createSection('等待突破 (Neutral)', data.neut, 'neut', '⚖️'));
}

// 啟動自動更新 (每 10 秒)
updateDashboard();
setInterval(updateDashboard, 10000);ㄇ