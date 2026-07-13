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

                // 🛠️ CRITICAL FIX: Convert HTML line breaks to spaces and strip all other HTML tags
                const cleanText = data.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '');

                // Strict validation checks on completely raw text strings
                const hasStrictID = cleanText.includes(`CAFEID: ${expectedCode}`) || cleanText.includes(`CAFEID:${expectedCode}`);
                
                if (hasStrictID) {
                    console.log(`SUCCESS: Found matching strict CAFEID pattern!`);
                    
                    // Look for CAFEPFP: followed by the link anywhere in the clean text
                    const pfpRegex = /CAFEPFP:\s*(https?:\/\/[^\s]+?\.(?:png|jpg|jpeg))/i;
                    const match = cleanText.match(pfpRegex);
                    
                    let finalAvatarUrl = "";
                    if (match && match[1]) {
                        finalAvatarUrl = match[1];
                        console.log(`Found strict matching CAFEPFP: ${finalAvatarUrl}`);
                    } else {
                        console.log("CAFEPFP tag found, but link layout is invalid.");
                    }

                    database[targetUser] = {
                        verified: true,
                        avatar: finalAvatarUrl, 
                        linkedRobloxId: process.env.ROBLOX_ID || "Unknown",
                        timestamp: new Date().toISOString()
                    };
                    
                    fs.writeFileSync('tfm_data.json', JSON.stringify(database, null, 4));
                    console.log("Database written completely.");
                } else {
                    console.log(`FAILED: Raw text bio did not strictly match "CAFEID: ${expectedCode}"`);
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
