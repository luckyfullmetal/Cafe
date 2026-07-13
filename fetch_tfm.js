const fs = require('fs');
const https = require('https');

const targetUser = process.env.TFM_USERNAME || "Username#0000"; 
const expectedCode = process.env.VERIFY_CODE || "NO_CODE"; 

const encodedUser = encodeURIComponent(targetUser); 
const profileUrl = `https://atelier801.com/profile?pr=${encodedUser}`;

function verifyPlayer() {
    if (expectedCode === "NO_CODE") {
        console.log("No verification code provided. Skipping.");
        return;
    }

    console.log(`Fetching profile for: ${targetUser}`);
    console.log(`Looking for verification string: ${expectedCode}`);

    https.get(profileUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                // Open or initialize your json database file
                let database = {};
                if (fs.existsSync('tfm_data.json')) {
                    try { database = JSON.parse(fs.readFileSync('tfm_data.json', 'utf8')); } catch (e) {}
                }

                // Bulletproof check: Scan the ENTIRE webpage raw HTML for your code
                if (data.includes(expectedCode)) {
                    // Quick attempt to capture avatar if present, otherwise default
                    const avatarMatch = data.match(/src="([^"]+avatar[^"]+)"/i);
                    let avatarUrl = avatarMatch ? avatarMatch[1] : "https://atelier801.com/img/elements/avatar-default.png";
                    if (avatarUrl.startsWith('//')) avatarUrl = 'https:' + avatarUrl;

                    database[targetUser] = {
                        verified: true,
                        avatar: avatarUrl,
                        linkedRobloxId: process.env.ROBLOX_ID || "Unknown",
                        timestamp: new Date().toISOString()
                    };
                    
                    fs.writeFileSync('tfm_data.json', JSON.stringify(database, null, 4));
                    console.log(`SUCCESS: ${targetUser} verified code ${expectedCode}! Database updated.`);
                } else {
                    console.log(`FAILED: Code [${expectedCode}] was not found anywhere on the profile page.`);
                    console.log("Double check your Atelier801 profile settings to ensure your bio text is saved publicly.");
                }
                
            } catch (err) {
                console.error("Internal Parsing script failure:", err);
            }
        });
    }).on('error', (err) => {
        console.error("Network Fetch Error:", err.message);
    });
}

verifyPlayer();
