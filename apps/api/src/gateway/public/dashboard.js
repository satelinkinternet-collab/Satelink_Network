async function fetchStats() {
    try {
        // 1. Fetch current stats
        const statsRes = await fetch('/operations/epoch-stats');
        const statsData = await statsRes.json();

        if (statsData.ok) {
            const s = statsData.stats;
            document.getElementById('current-epoch').innerText = `#${s.epochId}`;
            document.getElementById('active-nodes').innerText = s.active_nodes;
            document.getElementById('total-ops').innerText = s.total_ops;
            document.getElementById('est-revenue').innerText = `$${s.revenue.toFixed(2)}`;
        }

        // 2. Fetch Treasury balance
        const treasuryRes = await fetch('/ledger/treasury');
        const treasuryData = await treasuryRes.json();
        if (treasuryData.ok) {
            document.getElementById('treasury-balance').innerText = `$${treasuryData.available.toFixed(2)}`;

            // Basic Alert logic: if treasury is negative, show alert
            if (treasuryData.available < 0) {
                document.getElementById('freeze-alert').classList.remove('hidden');
            } else {
                document.getElementById('freeze-alert').classList.add('hidden');
            }
        }

        // 3. Fetch Epoch History
        const epochsRes = await fetch('/ledger/epochs');
        const epochsData = await epochsRes.json();
        if (epochsData.ok) {
            const list = document.getElementById('epoch-list');
            list.innerHTML = '';
            epochsData.epochs.forEach(e => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>Epoch #${e.epochId}</td>
                    <td>${e.active_nodes}</td>
                    <td>${e.total_ops}</td>
                    <td>$${e.revenue.toFixed(2)}</td>
                    <td><span class="status-badge ${e.isFinalized ? 'finalized' : 'active'}">${e.isFinalized ? 'Finalized' : 'Active'}</span></td>
                `;
                list.appendChild(tr);
            });
        }


        // 4. Fetch Payouts (Protected: Requires Admin Key)
        /*
        const payoutsRes = await fetch('/ledger/payouts?status=PENDING');
        ...
        */

    } catch (e) {
        console.error("Failed to load dashboard data", e);
    }
}

// ─── WALLET CONNECT ──────────────────────────────────────────
let connectedWallet = null;

async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            handleAccountsChanged(accounts);
        } catch (error) {
            console.error(error);
            alert("Failed to connect wallet");
        }
    } else {
        alert("Please install MetaMask or another Web3 wallet");
    }
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        console.log('Please connect to MetaMask.');
        connectedWallet = null;
    } else {
        connectedWallet = accounts[0];
        updateWalletUI(connectedWallet);
        fetchNodeStats(connectedWallet);
    }
}

function updateWalletUI(wallet) {
    const btn = document.getElementById('connect-wallet');
    const info = document.getElementById('wallet-info');
    const addr = document.getElementById('wallet-address');

    btn.classList.add('hidden');
    info.classList.remove('hidden');
    addr.innerText = `${wallet.substring(0, 6)}...${wallet.substring(38)}`;
}

async function fetchNodeStats(wallet) {
    try {
        const res = await fetch(`/integrations/node/${wallet}`);
        const data = await res.json();

        const dot = document.getElementById('node-active-dot');
        const text = document.getElementById('node-status-text');

        if (data.is_registered) {
            if (data.active) {
                dot.className = 'status-dot green';
                text.innerText = `Active (Score: ${data.uptime_score})`;
            } else {
                dot.className = 'status-dot red';
                text.innerText = 'Inactive';
            }
        } else {
            dot.className = 'status-dot gray';
            text.innerText = 'Not Registered';
        }
    } catch (e) {
        console.error("Failed to fetch node stats", e);
    }
}

// ─── INITIALIZATION ──────────────────────────────────────────

document.getElementById('connect-wallet').addEventListener('click', connectWallet);

if (window.ethereum) {
    window.ethereum.on('accountsChanged', handleAccountsChanged);
}

// Initial fetch
fetchStats();

// Poll every 10 seconds
setInterval(() => {
    fetchStats();
    if (connectedWallet) fetchNodeStats(connectedWallet);
}, 10000);

