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

// Initial fetch
fetchStats();

// Poll every 10 seconds
setInterval(fetchStats, 10000);
