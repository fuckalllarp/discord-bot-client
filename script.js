const LUMIX_IP = "http://45.134.39.212:3000";
let currentChannelId = null;
let lastMessageId = null;

// --- LOGIN ---
async function login() {
    const token = document.getElementById('token-input').value;
    const res = await fetch(`${LUMIX_IP}/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ token })
    });
    
    const data = await res.json();
    if (data.success) {
        document.getElementById('login-screen').style.display = 'none';
        renderGuilds(data.guilds);
    } else {
        alert("Login failed!");
    }
}

// --- CHANNELS & AUTO-SELECT ---
async function loadChannels(guildId) {
    const res = await fetch(`${LUMIX_IP}/guild/${guildId}/channels`);
    const channels = await res.json();
    
    // Render list
    const list = document.getElementById('chan-list');
    list.innerHTML = channels.map(c => `<div onclick="selectChannel('${c.id}')" class="chan">#${c.name}</div>`).join('');
    
    // AUTO-SELECT FIRST CHANNEL
    if (channels.length > 0) selectChannel(channels[0].id);
}

// --- MESSAGE POLLING (Every 1 sec) ---
function selectChannel(id) {
    currentChannelId = id;
    // Clear old interval if exists, then start polling
    if (window.msgInterval) clearInterval(window.msgInterval);
    window.msgInterval = setInterval(pollMessages, 1000);
}

async function pollMessages() {
    if (!currentChannelId) return;
    const res = await fetch(`${LUMIX_IP}/channel/${currentChannelId}/messages`);
    const messages = await res.json();
    
    // Simple check: if top message ID changed, re-render
    if (messages[0]?.id !== lastMessageId) {
        lastMessageId = messages[0]?.id;
        renderMessages(messages.reverse());
    }
}

// --- SENDING ---
async function sendMessage() {
    const content = document.getElementById('msg-input').value;
    await fetch(`${LUMIX_IP}/send`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ cid: currentChannelId, content })
    });
    document.getElementById('msg-input').value = "";
}
