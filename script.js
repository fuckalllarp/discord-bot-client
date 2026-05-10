let TOKEN = "";
let ACTIVE_CHAN_ID = "";
const PROXY = "https://corsproxy.io/?";

// --- API ENGINE ---
async function discordRequest(path, method = "GET", body = null) {
    const url = `https://discord.com/api/v10${path}`;
    const encodedUrl = encodeURIComponent(url);
    
    const headers = {
        "Authorization": `Bot ${TOKEN}`,
        "Content-Type": "application/json"
    };

    try {
        const response = await fetch(`${PROXY}${encodedUrl}`, {
            method: method,
            headers: headers,
            body: body ? JSON.stringify(body) : null
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Status ${response.status}: ${errorData.message || 'Unknown'}`);
        }
        return await response.json();
    } catch (err) {
        console.error("API Error:", err);
        throw err;
    }
}

// --- UI HANDLERS ---
document.getElementById('login-btn').addEventListener('click', async () => {
    TOKEN = document.getElementById('token-input').value.trim();
    const status = document.getElementById('login-status');
    status.innerText = "Connecting...";

    try {
        await discordRequest('/users/@me');
        document.getElementById('login-screen').classList.add('hidden');
        loadGuilds();
    } catch (err) {
        status.innerText = `Error: ${err.message}. Check token or internet.`;
    }
});

async function loadGuilds() {
    const guilds = await discordRequest('/users/@me/guilds');
    const container = document.getElementById('guild-list');
    
    container.innerHTML = guilds.map(g => `
        <div onclick="loadChannels('${g.id}', '${g.name.replace(/'/g, "\\'")}')" 
             class="w-12 h-12 bg-[#313338] rounded-[24px] flex items-center justify-center cursor-pointer server-icon overflow-hidden">
            ${g.icon ? `<img src="https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png" class="w-full h-full">` : g.name[0]}
        </div>
    `).join('');
}

async function loadChannels(guildId, guildName) {
    document.getElementById('guild-name').innerText = guildName;
    const list = document.getElementById('chan-list');
    list.innerHTML = `<div class="text-xs text-gray-500 p-2">Loading channels...</div>`;

    try {
        const channels = await discordRequest(`/guilds/${guildId}/channels`);
        const textChannels = channels.filter(c => [0, 5, 11, 12].includes(c.type));

        if (textChannels.length === 0) {
            list.innerHTML = `<div class="text-xs text-yellow-500 p-2">No accessible text channels.</div>`;
            return;
        }

        list.innerHTML = textChannels.map(c => `
            <div onclick="selectChannel('${c.id}', '${c.name.replace(/'/g, "\\'")}')" 
                 id="btn-${c.id}" 
                 class="chan-item p-2 rounded text-gray-400 hover:bg-[#35373c] hover:text-white cursor-pointer text-sm truncate flex items-center">
                <span class="mr-2 opacity-50">#</span> ${c.name}
            </div>
        `).join('');

        // AUTO-SELECT FIRST CHANNEL
        selectChannel(textChannels[0].id, textChannels[0].name);

    } catch (err) {
        list.innerHTML = `<div class="text-red-500 p-2 text-xs">Failed: ${err.message}</div>`;
    }
}

function selectChannel(id, name) {
    ACTIVE_CHAN_ID = id;
    document.getElementById('chan-name').innerText = name;
    
    // UI Highlight
    document.querySelectorAll('.chan-item').forEach(el => el.classList.remove('active-chan'));
    document.getElementById(`btn-${id}`)?.classList.add('active-chan');
    
    fetchMessages();
}

async function fetchMessages() {
    if (!ACTIVE_CHAN_ID) return;
    try {
        const msgs = await discordRequest(`/channels/${ACTIVE_CHAN_ID}/messages?limit=40`);
        const box = document.getElementById('chat-box');
        
        box.innerHTML = msgs.reverse().map(m => `
            <div class="flex flex-col message-item">
                <div class="flex items-center space-x-2">
                    <span class="font-bold text-white text-sm">${m.author.username}</span>
                    <span class="text-[10px] text-gray-500">${new Date(m.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="text-sm text-gray-300 leading-tight">${m.content || '<i class="opacity-30">Embed/Media</i>'}</div>
            </div>
        `).join('');
        box.scrollTop = box.scrollHeight;
    } catch (e) { console.error("Msg fetch fail:", e); }
}

async function handleSend() {
    const input = document.getElementById('msg-input');
    const content = input.value.trim();
    if (!content || !ACTIVE_CHAN_ID) return;

    input.value = "";
    try {
        await discordRequest(`/channels/${ACTIVE_CHAN_ID}/messages`, "POST", { content });
        fetchMessages();
    } catch (e) { alert("Failed to send."); }
}

// Listeners
document.getElementById('send-btn').addEventListener('click', handleSend);
document.getElementById('msg-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
});

// Auto-refresh every 4 seconds
setInterval(() => { if(ACTIVE_CHAN_ID) fetchMessages(); }, 4000);
