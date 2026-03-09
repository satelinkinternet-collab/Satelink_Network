
import crypto from 'crypto';
import "dotenv/config";

const SECRET = process.env.MOONPAY_WEBHOOK_SECRET;
const URL = "http://localhost:8080/webhooks/moonpay";

if (!SECRET) {
    console.error("Missing MOONPAY_WEBHOOK_SECRET in .env or .env.sandbox");
    process.exit(1);
}

const payload = {
    id: `mp_test_${Date.now()}`,
    type: "transaction_created",
    data: {
        id: `tx_${Date.now()}`,
        status: "completed",
        baseCurrencyAmount: 10,
        baseCurrencyCode: "USD",
        currencyCode: "USDT",
        walletAddress: "0xTestWallet_" + Math.floor(Math.random() * 10000),
        externalCustomerId: "cust_123"
    }
};

const body = JSON.stringify(payload);
const sig = crypto.createHmac('sha256', SECRET).update(body).digest('hex');

console.log(`Sending webhook to ${URL}...`);
try {
    const res = await fetch(URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Moonpay-Signature-V2': sig
        },
        body: body
    });

    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(text);
    if (!res.ok) process.exit(1);
} catch (e) {
    console.error(e);
    process.exit(1);
}
