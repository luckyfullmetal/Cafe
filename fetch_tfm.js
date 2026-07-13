const fs = require('fs');
const https = require('https');

// Read dynamic data sent directly from Roblox
const targetUser = process.env.TFM_USERNAME || "Username#0000"; 
const expectedCode = process.env.VERIFY_CODE || "NO_CODE"; 

const encodedUser = encodeURIComponent(targetUser); 
const profileUrl = `https://atelier801.com/profile?pr=${encodedUser}`;

function verifyPlayer() {
    if (expectedCode === "NO_CODE") {
        console.log("No verification code provided. Skipping.");
        return;
    }

    https.get(profileUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Roblox Verification Bot)' }
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                // 1. Extract Biography text
                const bioMatch = data.match(/class="profile-bio"[^>]*>([\s\S]*?)<\/div>/i);
                let bioText = bioMatch ? bioMatch[1].replace(/<[^>]*>/g, '').trim() : "";

                // 2. Extract Avatar URL
                const avatarMatch = data.match(/<img[^>]+src="([^"]+avatar[^"]+)"/i) || 
                                    data.match(/class="avatar"[^>]+src="([^"]+)"/i);
                let avatarUrl = avatarMatch ? avatarMatch[1] : "https://atelier801.com/img/elements/avatar-default.png";
                if (avatarUrl.startsWith('//')) avatarUrl = 'https:' + avatarUrl;

                // 3. Open current verified database
                let database = {};
                if (fs.existsSync('tfm_data.json')) {
                    try { database = JSON.parse(fs.readFileSync('tfm_data.json', 'utf8')); } catch (e) {}
                }

                // 4. Verification Check
                if (bioText.includes(expectedCode)) {
                    database[targetUser] = {
                        verified: true,
                        avatar: avatarUrl,
                        linkedRobloxId: process.env.ROBLOX_ID || "Unknown",
                        timestamp: new Date().toISOString()
                    };
                    fs.writeFileSync('tfm_data.json', JSON.stringify(database, null, 4));
                    console.log(`SUCCESS: ${targetUser} matched code ${expectedCode} and is now VERIFIED!`);
                } else {
                    console.log(`FAILED: Code ${expectedCode} was not found in ${targetUser}'s bio.`);
                }
                
            } catch (err) {
                console.error("Parsing failed:", err);
            }
        });
    }).on('error', (err) => {
        console.error("HTTP Fetch Error:", err.message);
    });
}

verifyPlayer();
