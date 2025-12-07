const https = require('https');

const url = "https://catalogo-production-7cef.up.railway.app/api/detect/P552100";

console.log("Testing Production URL:", url);

const req = https.get(url, (res) => {
    console.log("Status Code:", res.statusCode);
    let chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        console.log("Body length:", body.length);
        try {
            const json = JSON.parse(body);
            console.log("--- RESPONSE START ---");
            console.log(JSON.stringify(json, null, 2));
            console.log("--- RESPONSE END ---");

            if (json.sku && json.success === true) {
                console.log(`\n✅ SUCCESS: Server is UP and returning SKU ${json.sku}`);
            } else {
                console.log("\n❌ FAILURE: Server returned unexpected data or error.");
            }
        } catch (e) {
            console.log("RAW BODY (Not JSON):", body.substring(0, 500));
        }
    });
});

req.on('error', (e) => {
    console.error("Connection Error:", e.message);
});

req.end();
