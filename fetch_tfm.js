const fs = require('fs');
const https = require('https');

// Change this to the target Transformice username you want to sync
const targetUser = "Username#0000"; 
// Format for URL encoding the '#' character
const encodedUser = encodeURIComponent(targetUser); 
const profileUrl = `https://atelier801.com/profile?pr=${encodedUser}`;

function fetchProfile() {
    https.get(profileUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Roblox TFM Sync Bot)' }
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                // 1. Extract Avatar URL using a rough HTML parse
                // The forum puts avatars inside a specific class container
                const avatarMatch = data.match(/<img[^>]+src="([^"]+avatar[^"]+)"/i) || 
                                    data.match(/class="avatar"[^>]+src="([^"]+)"/i);
                
                let avatarUrl = avatarMatch ? avatarMatch[1] : "https://atelier801.com/img/elements/avatar-default.png";
                if (avatarUrl.startsWith('//')) avatarUrl = 'https:' + avatarUrl;

                // 2. Extract verification text (e.g., looking for your "ROBLOX-VERIFY" tag in their bio)
                const bioMatch = data.match(/class="profile-bio"[^>]*>([\s\S]*?)<\/div>/i);
                let bioText = bioMatch ? bioMatch[1].replace(/<[^>]*>/g, '').trim() : "";

                // Assemble data object
                const outputData = {
                    username: targetUser,
                    avatar: avatarUrl,
                    bioText: bioText,
                    lastUpdated: new Date().toISOString()
                };

                // Save to local JSON file inside repository
                fs.writeFileSync('tfm_data.json', JSON.stringify(outputData, null, 4));
                console.log(`Successfully synced data for ${targetUser}!`);
                
            } catch (err) {
                console.error("Failed to parse HTML data:", err);
            }
        });
    }).on('error', (err) => {
        console.error("HTTP Fetch Error:", err.message);
    });
}

fetchProfile();
