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
