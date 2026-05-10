let TOKEN = "";
let ACTIVE_CHAN_ID = "";

// This is the most reliable bridge for Discord headers
const PROXY = "https://proxy.cors.sh/"; 

async function discordRequest(path, method = "GET", body = null) {
    const url = `https://discord.com/api/v10${path}`;
    
    const response = await fetch(PROXY + url, {
        method: method,
        headers: {
            "Authorization": `Bot ${TOKEN}`,
            "Content-Type": "application/json",
            "x-cors-gratis": "true" // Required for this specific proxy
        },
        body: body ? JSON.stringify(body) : null
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Code ${response.status}: ${errText}`);
    }
    return await response.json();
}

document.getElementById('login-btn').addEventListener('click', async () => {
    TOKEN = document.getElementById('token-input').value.trim();
    const status = document.getElementById('login-status');
    status.innerText = "Authenticating...";

    try {
        const user = await discordRequest('/users/@me');
        status.innerText = `Logged in as ${user.username}`;
        setTimeout(() => {
            document.getElementById('login-screen').classList.add('hidden');
            loadGuilds();
        }, 8000); // Give the proxy a second to warm up
    } catch (err) {
        status.innerText = "Check Token / Proxy Blocked";
        console.error(err);
    }
});

async function loadGuilds() {
    try {
        const guilds = await discordRequest('/users/@me/guilds');
        document.getElementById('guild-list').innerHTML = guilds.map(g => `
            <div onclick="loadChannels('${g.id}', '${g.name.replace(/'/g, "")}')" 
                 class="w-12 h-12 bg-[#313338] rounded-[24px] flex items-center justify-center cursor-pointer server-icon overflow-hidden">
                ${g.icon ? `<img src="https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png" class="w-full h-full">` : g.name[0]}
            </div>
        `).join('');
    } catch (e) { console.error(e); }
}

async function loadChannels(guildId, guildName) {
    document.getElementById('guild-name').innerText = guildName;
    const list = document.getElementById('chan-list');
    list.innerHTML = "Loading...";

    try {
        // Fetching the ACTUAL channel list
        const channels = await discordRequest(`/guilds/${guildId}/channels`);
        const filtered = channels.filter(c => c.type === 0 || c.type === 5);
        
        list.innerHTML = filtered.map(c => `
            <div onclick="selectChannel('${c.id}', '${c.name}')" id="btn-${c.id}" class="chan-item p-2 rounded text-gray-400 hover:bg-[#35373c] cursor-pointer text-sm truncate flex items-center">
                <span class="mr-2">#</span> ${c.name}
            </div>
        `).join('');

        if (filtered.length > 0) selectChannel(filtered[0].id, filtered[0].name);
    } catch (err) {
        list.innerHTML = `<div class="text-red-500 p-2 text-[10px]">Verify Bot has 'View Channels' perm.</div>`;
    }
}

function selectChannel(id, name) {
    ACTIVE_CHAN_ID = id;
    document.getElementById('chan-name').innerText = name;
    fetchMessages();
}

async function fetchMessages() {
    if (!ACTIVE_CHAN_ID) return;
    try {
        const msgs = await discordRequest(`/channels/${ACTIVE_CHAN_ID}/messages?limit=30`);
        const box = document.getElementById('chat-box');
        box.innerHTML = msgs.reverse().map(m => `
            <div class="mb-2 border-l-2 border-[#5865f2] pl-2">
                <div class="text-[10px] font-bold text-white opacity-70">${m.author.username}</div>
                <div class="text-sm text-gray-200">${m.content || 'Embed/Image'}</div>
            </div>
        `).join('');
        box.scrollTop = box.scrollHeight;
    } catch (e) { }
}

async function handleSend() {
    const input = document.getElementById('msg-input');
    const content = input.value;
    if (!content || !ACTIVE_CHAN_ID) return;
    input.value = "";
    try {
        await discordRequest(`/channels/${ACTIVE_CHAN_ID}/messages`, "POST", { content });
        fetchMessages();
    } catch (e) { alert("Error sending."); }
}

document.getElementById('send-btn').addEventListener('click', handleSend);
setInterval(() => { if(ACTIVE_CHAN_ID) fetchMessages(); }, 5000);
