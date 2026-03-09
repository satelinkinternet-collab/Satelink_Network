import fetch from 'node-fetch';
import { ethers } from 'ethers';

async function run() {
    console.log("=== External Wallet (MetaMask) Simulation ===");

    // 1. Generate a random wallet (Simulating MetaMask account)
    const wallet = ethers.Wallet.createRandom();
    const address = wallet.address;
    console.log(`[1] Simulating MetaMask Account: ${address}`);

    try {
        // 2. Start Auth (Get Nonce)
        console.log(`[2] Requesting Nonce...`);
        const startRes = await fetch('http://localhost:3000/auth/embedded/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address })
        });

        const startData = await startRes.json();
        if (!startData.ok) throw new Error(startData.error || 'Failed to start auth');

        const { nonce, message_template, created_at } = startData;
        console.log(`✅ Nonce received: ${nonce}`);

        const message = message_template
            .replace('${nonce}', nonce)
            .replace('${address}', address)
            .replace('${timestamp}', created_at);

        // 3. Sign Message (Simulate 'personal_sign')
        console.log(`[3] Signing message...`);
        // ethers wallet.signMessage adds the prefix automatically, same as personal_sign
        const signature = await wallet.signMessage(message);
        console.log(`✅ Signed: ${signature.substring(0, 20)}...`);

        // 4. Finish Auth
        console.log(`[4] Verifying signature...`);
        const finishRes = await fetch('http://localhost:3000/auth/embedded/finish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                address,
                signature,
                device_public_id: 'simulated_metamask_device'
            })
        });

        const finishData = await finishRes.json();

        if (finishData.ok) {
            console.log(`✅ Auth Successful! Token: ${finishData.token.substring(0, 20)}...`);
            console.log(`   User Role: ${finishData.user.role}`);
        } else {
            console.error(`❌ Auth Failed:`, finishData.error);
            process.exit(1);
        }

    } catch (e) {
        console.error("❌ Error:", e.message);
        process.exit(1);
    }
}

run();
