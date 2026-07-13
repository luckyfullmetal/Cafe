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

    https.get(profileUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                let database = {};
                if (fs.existsSync('tfm_data.json')) {
                    try { database = JSON.parse(fs.readFileSync('tfm_data.json', 'utf8')); } catch (e) {}
                }

                // 1. STRICT CAFEID CHECK: Must look exactly like "CAFEID: TFM-VERIFY-XXXXXX"
                const idRegex = new RegExp(`CAFEID:\\s*${expectedCode}`, 'i');
                
                if (idRegex.test(data)) {
                    console.log(`SUCCESS: Found strict matching CAFEID for ${expectedCode}`);
                    
                    // 2. STRICT CAFEPFP CHECK: Must look exactly like "CAFEPFP: https://..."
                    const pfpRegex = /CAFEPFP:\s*(https?:\/\/[^\s<]+?\.(?:png|jpg|jpeg))/i;
                    const match = data.match(pfpRegex);
                    
                    let finalAvatarUrl = "";
                    if (match && match[1]) {
                        finalAvatarUrl = match[1];
                        console.log(`Found strict matching CAFEPFP: ${finalAvatarUrl}`);
                    } else {
                        console.log("STRICT REJECTION: CAFEPFP tag or link format missing.");
                    }

                    database[targetUser] = {
                        verified: true,
                        avatar: finalAvatarUrl, 
                        linkedRobloxId: process.env.ROBLOX_ID || "Unknown",
                        timestamp: new Date().toISOString()
                    };
                    
                    fs.writeFileSync('tfm_data.json', JSON.stringify(database, null, 4));
                } else {
                    console.log(`FAILED: Bio does not contain the strict pattern "CAFEID: ${expectedCode}"`);
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
