import { ethers } from "ethers";

async function signHeartbeat() {
    const wallet = ethers.Wallet.createRandom();
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = Date.now(); // Using current time as a simple unique nonce
    const stats = { cpu: 12, ram: 45 };
    const statsStr = JSON.stringify(stats);

    const message =
        "SATELINK_HEARTBEAT\n" +
        `wallet=${wallet.address}\n` +
        `timestamp=${timestamp}\n` +
        `nonce=${nonce}\n` +
        `stats=${statsStr}`;

    const signature = await wallet.signMessage(message);

    const payload = {
        nodeWallet: wallet.address,
        timestamp,
        nonce,
        stats,
        signature
    };

    console.log(JSON.stringify(payload, null, 2));
}

signHeartbeat().catch(err => {
    console.error(err);
    process.exit(1);
});
