// public/js/dashboard.js

function openDrawer(title, dataHtml) {
    const drawer = document.getElementById('details-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    const titleEl = document.getElementById('drawer-title');
    const contentEl = document.getElementById('drawer-content');

    titleEl.textContent = title;
    contentEl.innerHTML = dataHtml;

    drawer.classList.remove('translate-x-full');
    backdrop.classList.remove('hidden');
    // slight delay to allow display:block to apply before opacity transition
    setTimeout(() => backdrop.classList.remove('opacity-0'), 10);
}

function closeDrawer() {
    const drawer = document.getElementById('details-drawer');
    const backdrop = document.getElementById('drawer-backdrop');

    drawer.classList.add('translate-x-full');
    backdrop.classList.add('opacity-0');

    setTimeout(() => {
        backdrop.classList.add('hidden');
    }, 300);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Simple toast or feedback could go here
        // console.log('Copied to clipboard: ' + text);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

function filterTable(inputId, tableId) {
    const input = document.getElementById(inputId);
    const filter = input.value.toUpperCase();
    const table = document.getElementById(tableId);
    const tr = table.getElementsByTagName("tr");

    for (let i = 1; i < tr.length; i++) { // Skip header
        let visible = false;
        const tds = tr[i].getElementsByTagName("td");
        for (let j = 0; j < tds.length; j++) {
            if (tds[j]) {
                const txtValue = tds[j].textContent || tds[j].innerText;
                if (txtValue.toUpperCase().indexOf(filter) > -1) {
                    visible = true;
                    break;
                }
            }
        }
        tr[i].style.display = visible ? "" : "none";
    }
}

// Admin Diagnostics
async function createDiagLink() {
    try {
        const res = await fetch('/diag/share', { method: 'POST' });
        const data = await res.json();
        if (data.shareUrl) {
            const container = document.getElementById('diag-link-container');
            const urlEl = document.getElementById('diag-url');
            urlEl.textContent = data.shareUrl;
            container.classList.remove('hidden');
        }
    } catch (e) {
        alert('Failed to create diag link: ' + e.message);
    }
}

function copyDiagLink() {
    const urlEl = document.getElementById('diag-url');
    if (urlEl) {
        copyToClipboard(urlEl.textContent);
    }
}

// Init Danger Zone Lock (Task 12)
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/api/mode');
        const data = await res.json();

        if (data.ok && data.mode === 'live') {
            const dangerKeywords = ['simulate', 'dev', 'test', 'seed'];
            const elements = document.querySelectorAll('button, a');

            elements.forEach(el => {
                const text = (el.textContent || el.innerText || '').toLowerCase();
                const id = (el.id || '').toLowerCase();
                const cls = (el.className || '').toLowerCase();
                const combined = `${text} ${id} ${cls}`;

                if (dangerKeywords.some(kw => combined.includes(kw))) {
                    if (el.tagName === 'A') {
                        el.style.pointerEvents = 'none';
                        el.removeAttribute('href');
                    } else {
                        el.disabled = true;
                    }
                    el.classList.add('opacity-50', 'cursor-not-allowed');
                    el.title = 'Disabled in LIVE mode';
                }
            });
        }

        // Init Config Status Panel (Task 29)
        if (data.ok && data.mode === 'simulation') {
            const configPanel = document.getElementById('config-status-panel');
            const configContent = document.getElementById('config-status-content');

            if (configPanel && configContent) {
                try {
                    const snapRes = await fetch('/api/config-snapshot');
                    const snapData = await snapRes.json();

                    // Handle legacy snapshot format or the new flags format
                    const dataObj = snapData.flags || snapData.snapshot || {};

                    if (snapData.ok && Object.keys(dataObj).length > 0) {
                        configPanel.classList.remove('hidden');
                        let html = '';

                        Object.keys(dataObj).forEach(key => {
                            if (key === 'mode') return; // Skip Mode entry visually
                            const val = dataObj[key];

                            // For features flags (boolean) vs legacy snapshot (objects)
                            const isSet = typeof val === 'object' ? val.isSet : val === true;
                            const label = typeof val === 'object' ? val.label : (val ? 'ON' : 'OFF');

                            const icon = isSet ?
                                '<i class="fas fa-shield-alt text-amber-500 mr-2"></i>' :
                                '<i class="fas fa-check-circle text-emerald-500 mr-2"></i>';

                            html += `
                                <div class="flex items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    ${icon}
                                    <div class="flex flex-col">
                                        <span class="text-xs font-mono text-gray-900">${key}</span>
                                        <span class="text-[10px] text-gray-500 font-bold uppercase mt-0.5">${label}</span>
                                    </div>
                                </div>
                            `;
                        });
                        configContent.innerHTML = html;
                    }
                } catch (e) {
                    console.warn("Failed to retrieve config snapshot", e);
                }
            }
        }

        // Init Debug Footer for Request IDs (Task 26)
        if (data.ok && data.mode === 'simulation') {
            const debugContainer = document.createElement('div');
            debugContainer.id = 'simulation-debug-footer';
            debugContainer.className = 'fixed bottom-4 right-4 bg-slate-900 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-mono shadow-2xl z-50 opacity-80 hover:opacity-100 transition-opacity flex items-center shadow-[0_0_15px_rgba(16,185,129,0.3)]';
            debugContainer.innerHTML = '<span class="flex h-2 w-2 relative mr-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>Last Req: <span id="last-req-id" class="text-satelink-accent ml-1">None</span>';
            document.body.appendChild(debugContainer);

            // Intercept fetches to grab the request id
            const originalFetch = window.fetch;
            window.fetch = async function () {
                const response = await originalFetch.apply(this, arguments);
                const urlStr = arguments[0] instanceof Request ? arguments[0].url : arguments[0];
                if (urlStr && urlStr.includes('/api/')) {
                    const reqId = response.headers.get('x-request-id');
                    if (reqId) {
                        const span = document.getElementById('last-req-id');
                        if (span) span.innerText = reqId.split('-')[0] + '...'; // truncate for UI
                    }
                }
                return response;
            };
        }
    } catch (e) {
        console.warn('Failed to fetch mode for Danger Zone lock:', e);
    }
});
