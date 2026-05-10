let TOKEN = "";
let ACTIVE_CHAN_ID = "";
const PROXY = "https://corsproxy.io/?";

async function discordRequest(path, method = "GET", body = null) {
    const url = `https://discord.com/api/v10${path}`;
    const headers = {
        "Authorization": `Bot ${TOKEN}`,
        "Content-Type": "application/json"
    };

    const response = await fetch(`${PROXY}${encodeURIComponent(url)}`, {
        method: method,
        headers: headers,
        body: body ? JSON.stringify(body) : null
    });

    if (!response.ok) throw new Error(response.status);
    return await response.json();
}

// LOGIN & GUILDS
document.getElementById('login-btn').addEventListener('click', async () => {
    TOKEN = document.getElementById('token-input').value.trim();
    try {
        await discordRequest('/users/@me');
        document.getElementById('login-screen').classList.add('hidden');
        loadGuilds();
    } catch (err) { alert("Login Fail: " + err.message); }
});

async function loadGuilds() {
    const guilds = await discordRequest('/users/@me/guilds');
    document.getElementById('guild-list').innerHTML = guilds.map(g => `
        <div onclick="pulseScan('${g.id}', '${g.name.replace(/'/g, "")}')" 
             class="w-12 h-12 bg-[#313338] rounded-[24px] flex items-center justify-center cursor-pointer server-icon overflow-hidden">
            ${g.icon ? `<img src="https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png" class="w-full h-full">` : g.name[0]}
        </div>
    `).join('');
}

// THE PULSE SCAN LOGIC
async function pulseScan(guildId, guildName) {
    document.getElementById('guild-name').innerText = "Scanning: " + guildName;
    const list = document.getElementById('chan-list');
    list.innerHTML = `<div class="text-[10px] text-blue-400 p-2 animate-pulse">Pulse scanning channels...</div>`;

    try {
        // We still try to get the list once; if 403, we move to brute discovery
        const channels = await discordRequest(`/guilds/${guildId}/channels`);
        
        let foundAny = false;
        list.innerHTML = "";

        for (const chan of channels) {
            // Only try text channels (Type 0)
            if (chan.type === 0) {
                try {
                    // Send a dot
                    const sent = await discordRequest(`/channels/${chan.id}/messages`, "POST", { content: "." });
                    // Immediately delete it
                    await discordRequest(`/channels/${chan.id}/messages/${sent.id}`, "DELETE");
                    
                    // If successful, add to list
                    foundAny = true;
                    list.innerHTML += `
                        <div onclick="selectChannel('${chan.id}', '${chan.name}')" id="btn-${chan.id}" class="chan-item p-2 rounded text-green-400 hover:bg-[#35373c] cursor-pointer text-sm truncate flex items-center">
                            <span class="mr-2">#</span> ${chan.name} (Verified)
                        </div>`;
                } catch (e) {
                    // Bot can't talk here, skip quietly
                    console.log(`Skipped ${chan.name}: No Write Perms`);
                }
            }
        }

        if (!foundAny) list.innerHTML = `<div class="p-2 text-xs text-red-500">Scan finished: No writeable channels found.</div>`;
        else selectChannel(document.querySelector('.chan-item').id.replace('btn-', ''), "first-found");

    } catch (err) {
        list.innerHTML = `<div class="text-red-500 p-2 text-xs">Scan Blocked: ${err.message}</div>`;
    }
}

// CHAT FUNCTIONS
function selectChannel(id, name) {
    ACTIVE_CHAN_ID = id;
    document.getElementById('chan-name').innerText = name;
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
            <div class="flex flex-col mb-2">
                <span class="font-bold text-white text-xs">${m.author.username}</span>
                <span class="text-sm text-gray-300">${m.content || 'Media'}</span>
            </div>
        `).join('');
        box.scrollTop = box.scrollHeight;
    } catch (e) { }
}

async function handleSend() {
    const input = document.getElementById('msg-input');
    const content = input.value.trim();
    if (!content || !ACTIVE_CHAN_ID) return;
    input.value = "";
    try {
        await discordRequest(`/channels/${ACTIVE_CHAN_ID}/messages`, "POST", { content });
        fetchMessages();
    } catch (e) { alert("Send failed."); }
}

document.getElementById('send-btn').addEventListener('click', handleSend);
document.getElementById('msg-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });
setInterval(() => { if(ACTIVE_CHAN_ID) fetchMessages(); }, 4000);
