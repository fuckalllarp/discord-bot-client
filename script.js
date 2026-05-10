const API_BASE = "http://45.134.39.212:4173/api"; 
let currentChan = null;
let lastMsgId = null;

// Handle Login
async function connectBot() {
    const token = document.getElementById('token-input').value;
    const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ token })
    });
    const data = await res.json();
    if(data.success) {
        document.getElementById('login-screen').style.display = 'none';
        renderGuilds(data.guilds);
    } else {
        alert("Token rejected by Lumix");
    }
}

// Load Channels & Auto-Select
async function loadChannels(gid) {
    const res = await fetch(`${API_BASE}/guild/${gid}/channels`);
    const chans = await res.json();
    
    document.getElementById('chan-list').innerHTML = chans.map(c => `
        <div onclick="selectChannel('${c.id}', '${c.name}')" id="btn-${c.id}" class="chan-item">
            # ${c.name}
        </div>
    `).join('');

    // AUTO-SELECT FIRST CHANNEL
    if (chans.length > 0) selectChannel(chans[0].id, chans[0].name);
}

function selectChannel(id, name) {
    currentChan = id;
    document.getElementById('chan-name').innerText = name;
    
    // Start the 1-second Loop
    if (window.poller) clearInterval(window.poller);
    window.poller = setInterval(updateMessages, 1000);
}

async function updateMessages() {
    if (!currentChan) return;
    const res = await fetch(`${API_BASE}/channel/${currentChan}/messages`);
    const msgs = await res.json();
    
    // Only update if there's a new message
    if (msgs[0]?.id !== lastMsgId) {
        lastMsgId = msgs[0]?.id;
        const box = document.getElementById('chat-box');
        box.innerHTML = msgs.reverse().map(m => `
            <div class="msg"><b>${m.user}:</b> ${m.content}</div>
        `).join('');
        box.scrollTop = box.scrollHeight;
    }
}
