/* ===========================
   Joe Janos — Admin JS
   Lead Manager, Auth & Dashboard Logic
   =========================== */

document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('login-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    const loginForm = document.getElementById('adminLoginForm');
    const errorMsg = document.getElementById('errorMsg');
    const adminNameDisplay = document.getElementById('adminNameDisplay');
    const logoutBtn = document.getElementById('logoutBtn');
    const root = document.documentElement;

    // --- Theme Logic for Admin Page ---
    const adminThemeToggle = document.getElementById('adminThemeToggle');
    const sunIcon = adminThemeToggle.querySelector('.icon-sun');
    const moonIcon = adminThemeToggle.querySelector('.icon-moon');

    const applyTheme = (theme) => {
        if (theme === 'dark') {
            root.setAttribute('data-theme', 'dark');
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        } else {
            root.removeAttribute('data-theme');
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        }
    };

    const savedTheme = localStorage.getItem('hpn-theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    }

    adminThemeToggle.addEventListener('click', () => {
        const current = root.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem('hpn-theme', next);
    });

    // --- Authentication Logic ---
    const activeAdmin = sessionStorage.getItem('hpn-admin-user');
    if (activeAdmin) {
        showDashboard(activeAdmin);
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const usernameInput = document.getElementById('username').value.trim();
        const passwordInput = document.getElementById('password').value;

        const validPassword = 'Password44';
        const validUsers = [
            'Joe'
        ];

        const isUserValid = validUsers.some(user => user.toLowerCase() === usernameInput.toLowerCase());

        if (isUserValid && passwordInput === validPassword) {
            errorMsg.style.display = 'none';
            let displayName = usernameInput.split(' ')[0];
            displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1).toLowerCase();
            sessionStorage.setItem('hpn-admin-user', displayName);
            showDashboard(displayName);
        } else {
            errorMsg.style.display = 'block';
            loginForm.style.animation = 'shake 0.4s ease-in-out';
            setTimeout(() => {
                loginForm.style.animation = '';
            }, 400);
        }
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('hpn-admin-user');
        loginScreen.style.display = 'flex';
        dashboardScreen.style.display = 'none';
        document.getElementById('password').value = '';
    });

    function showDashboard(name) {
        loginScreen.style.display = 'none';
        dashboardScreen.style.display = 'block';
        adminNameDisplay.textContent = name;
        initLeadManager();
    }

    // --- Shake animation ---
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-8px); }
            50% { transform: translateX(8px); }
            75% { transform: translateX(-8px); }
        }
    `;
    document.head.appendChild(style);

    // ===========================================================
    //  LEAD MANAGER
    // ===========================================================

    // --- Firebase Initialization ---
    const firebaseConfig = {
        apiKey: "AIzaSyDcZKBXHaL_sQmKwKiexaX69jQ028qpUqg",
        authDomain: "hpn-project-da088.firebaseapp.com",
        projectId: "hpn-project-da088",
        storageBucket: "hpn-project-da088.firebasestorage.app",
        messagingSenderId: "414937667806",
        appId: "1:414937667806:web:d65eafb25c7459631f8a4f"
    };
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();

    let currentFilter = 'all';
    let leadsData = [];

    function getLeads() {
        return leadsData;
    }

    function initLeadManager() {
        // Realtime listener for leads
        db.collection('leads').orderBy('timestamp', 'desc').onSnapshot(snapshot => {
            leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderLeads();
            updateStats();
        }, err => {
            console.error("Error fetching leads:", err);
            document.getElementById('leadsContainer').innerHTML = `<p style="color:red;text-align:center;">Error loading leads from database. Ensure Firebase rules are configured.</p>`;
        });

        setupFilters();
        setupExport();
    }

    // --- Render Leads ---
    function renderLeads() {
        const container = document.getElementById('leadsContainer');
        const leads = getLeads();
        const filtered = currentFilter === 'all'
            ? leads
            : leads.filter(l => l.status === currentFilter);

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="leads-empty">
                    <div class="leads-empty-icon">📭</div>
                    <h4>${currentFilter === 'all' ? 'No leads yet' : 'No ' + currentFilter + ' leads'}</h4>
                    <p>${currentFilter === 'all' ? 'Leads from the contact form will appear here.' : 'Try a different filter to see more leads.'}</p>
                </div>
            `;
            return;
        }

        let html = '<div class="leads-list">';
        filtered.forEach(lead => {
            const statusClass = 'status-' + lead.status;
            const statusLabel = lead.status.charAt(0).toUpperCase() + lead.status.slice(1);
            const timeAgo = getTimeAgo(lead.timestamp);

            html += `
                <div class="lead-item" data-id="${lead.id}">
                    <div class="lead-info">
                        <div class="lead-name">${escapeHtml(lead.name)}</div>
                        <div class="lead-company">${escapeHtml(lead.company)}</div>
                        <div class="lead-message">"${escapeHtml(lead.message)}"</div>
                        <div class="lead-meta">${escapeHtml(lead.email)} · ${timeAgo}</div>
                    </div>
                    <div class="lead-status">
                        <button class="status-badge ${statusClass}" onclick="toggleStatusDropdown('${lead.id}')">${statusLabel}</button>
                        <div class="status-dropdown" id="dropdown-${lead.id}">
                            <button class="status-option" onclick="updateLeadStatus('${lead.id}', 'new')">🔴 New</button>
                            <button class="status-option" onclick="updateLeadStatus('${lead.id}', 'reviewed')">🔵 Reviewed</button>
                            <button class="status-option" onclick="updateLeadStatus('${lead.id}', 'contacted')">🟢 Contacted</button>
                            <button class="status-option" onclick="updateLeadStatus('${lead.id}', 'archived')">⚫ Archived</button>
                        </div>
                    </div>
                    <div class="lead-actions">
                        <button class="lead-action-btn" onclick="viewLead('${lead.id}')" title="View full message">👁</button>
                        <button class="lead-action-btn delete" onclick="deleteLead('${lead.id}')" title="Delete lead">✕</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    // --- Update Stats ---
    function updateStats() {
        const leads = getLeads();
        document.getElementById('statTotal').textContent = leads.length;
        document.getElementById('statNew').textContent = leads.filter(l => l.status === 'new').length;
        document.getElementById('statContacted').textContent = leads.filter(l => l.status === 'contacted').length;
    }

    // --- Filter Pills ---
    function setupFilters() {
        const pills = document.querySelectorAll('.filter-pill');
        pills.forEach(pill => {
            pill.addEventListener('click', () => {
                pills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                currentFilter = pill.dataset.filter;
                renderLeads();
            });
        });
    }

    // --- CSV Export ---
    function setupExport() {
        // Prevent multiple listeners if called multiple times
        const oldBtn = document.getElementById('exportCsvBtn');
        const newBtn = oldBtn.cloneNode(true);
        oldBtn.parentNode.replaceChild(newBtn, oldBtn);

        newBtn.addEventListener('click', () => {
            const leads = getLeads();
            if (leads.length === 0) {
                alert('No leads to export.');
                return;
            }

            const headers = ['Name', 'Email', 'Company', 'Message', 'Status', 'Date'];
            const rows = leads.map(l => [
                '"' + l.name.replace(/"/g, '""') + '"',
                '"' + l.email.replace(/"/g, '""') + '"',
                '"' + l.company.replace(/"/g, '""') + '"',
                '"' + l.message.replace(/"/g, '""') + '"',
                l.status,
                new Date(l.timestamp).toLocaleString()
            ]);

            let csv = headers.join(',') + '\n';
            rows.forEach(r => csv += r.join(',') + '\n');

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `hpn_leads_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    // --- Global Functions (called from onclick in rendered HTML) ---

    window.toggleStatusDropdown = (id) => {
        // Close all other dropdowns first
        document.querySelectorAll('.status-dropdown.open').forEach(dd => {
            if (dd.id !== 'dropdown-' + id) dd.classList.remove('open');
        });
        const dropdown = document.getElementById('dropdown-' + id);
        dropdown.classList.toggle('open');
    };

    window.updateLeadStatus = async (id, newStatus) => {
        try {
            await db.collection('leads').doc(id).update({ status: newStatus });
        } catch (e) {
            console.error("Error updating document: ", e);
            alert("Error updating status.");
        }
    };

    window.deleteLead = async (id) => {
        if (!confirm('Delete this lead permanently?')) return;
        try {
            await db.collection('leads').doc(id).delete();
        } catch (e) {
            console.error("Error deleting document: ", e);
            alert("Error deleting lead.");
        }
    };

    window.viewLead = (id) => {
        const leads = getLeads();
        const lead = leads.find(l => l.id === id);
        if (!lead) return;

        const overlay = document.createElement('div');
        overlay.className = 'lead-detail-overlay';
        overlay.innerHTML = `
            <div class="lead-detail-card">
                <h3>${escapeHtml(lead.name)}</h3>
                <div class="lead-company">${escapeHtml(lead.company)}</div>
                <div class="lead-detail-message">${escapeHtml(lead.message)}</div>
                <div class="lead-meta">
                    📧 ${escapeHtml(lead.email)}<br>
                    📅 ${new Date(lead.timestamp).toLocaleString()}
                </div>
                <button class="lead-detail-close" id="closeDetailBtn">Close</button>
            </div>
        `;
        document.body.appendChild(overlay);

        // Close on click
        overlay.querySelector('#closeDetailBtn').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    };

    // --- Helpers ---
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function getTimeAgo(isoString) {
        if (!isoString) return '';
        const now = new Date();
        const then = new Date(isoString);
        const diffMs = now - then;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = Math.floor(diffMs / 3600000);
        const diffDay = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return diffMin + 'm ago';
        if (diffHr < 24) return diffHr + 'h ago';
        if (diffDay < 7) return diffDay + 'd ago';
        return then.toLocaleDateString();
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.lead-status')) {
            document.querySelectorAll('.status-dropdown.open').forEach(dd => dd.classList.remove('open'));
        }
    });
});
