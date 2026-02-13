/**
 * App.js
 * Main application controller. Handles routing and view rendering.
 */
class App {
    constructor() {
        this.store = window.Store;
        this.amlEngine = window.AMLEngine;
        this.auth = window.Auth;
        this.currentView = 'login';

        this.init();
    }

    init() {
        // Check for active session
        const user = this.auth.checkSession();
        if (user) {
            this.navigateTo('dashboard');
        } else {
            this.renderView('login');
        }

        this.bindEvents();
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.target.getAttribute('data-view');
                this.navigateTo(view);
            });
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.auth.logout();
            this.navigateTo('login');
        });

        // Reset Data
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Are you sure you want to reset all data (Transactions, Alerts, Logs)? This cannot be undone.')) {
                    this.store.resetData();
                }
            });
        }

        // Registration Flow
        const registerLink = document.getElementById('show-register-link');
        const registerModal = document.getElementById('register-modal');
        const closeRegister = document.getElementById('close-register');
        const registerForm = document.getElementById('register-form');

        if (registerLink) {
            registerLink.addEventListener('click', (e) => {
                e.preventDefault();
                registerModal.classList.remove('hidden');
            });
        }

        if (closeRegister) {
            closeRegister.addEventListener('click', () => {
                registerModal.classList.add('hidden');
            });
        }

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const u = document.getElementById('reg-username').value;
                const p = document.getElementById('reg-password').value;
                const r = document.getElementById('reg-role').value;

                const res = this.auth.register(u, p, r);
                if (res.success) {
                    alert('Registration Successful! Please login.');
                    registerModal.classList.add('hidden');
                    registerForm.reset();
                } else {
                    alert('Error: ' + res.message);
                }
            });
        }
    }

    navigateTo(view) {
        this.currentView = view;

        // Hide all views
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');

        // Update Sidebar Active State
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        const activeLink = document.querySelector(`.nav-link[data-view="${view}"]`);
        if (activeLink) activeLink.classList.add('active');

        // Render specific view
        if (view === 'login') {
            document.getElementById('main-app').classList.add('hidden');
            document.getElementById('auth-screen').classList.remove('hidden');
        } else {
            this.renderView(view);
        }
    }

    renderView(view) {
        const container = document.getElementById(`${view}-view`);
        if (container) {
            container.classList.remove('hidden');

            // Trigger specific render functions
            if (view === 'dashboard') this.renderDashboard();
            if (view === 'transactions') this.renderTransactions();
            if (view === 'alerts') this.renderAlerts();
            if (view === 'sar') this.renderSARs();
            if (view === 'audit') this.renderAudit();
        } else if (view === 'login') {
            document.getElementById('auth-screen').classList.remove('hidden');
            document.getElementById('main-app').classList.add('hidden');
        }
    }

    // --- View Renderers ---

    renderDashboard() {
        const stats = this.getStats();
        document.getElementById('total-tx-count').textContent = stats.totalTx;
        document.getElementById('alert-count').textContent = stats.openAlerts;
        document.getElementById('sar-count').textContent = stats.sarsFiled;

        // --- Update Charts with Real Data ---
        const txs = this.store.getTransactions();

        // --- populate recent transactions list (latest 5)
        const recentBody = document.getElementById('recent-tx-body');
        if (recentBody) {
            const recent = txs.slice(0, 5);
            recentBody.innerHTML = recent.map(tx => {
                const history = tx.riskLevel !== 'Normal' ? 'Unsafe' : 'Safe';
                return `
                <tr>
                    <td>${tx.id}</td>
                    <td>${new Date(tx.timestamp).toLocaleString()}</td>
                    <td>${tx.sender}</td>
                    <td>${tx.receiver}</td>
                    <td>$${tx.amount.toLocaleString()}</td>
                    <td>${tx.riskLevel}</td>
                    <td>${history}</td>
                </tr>
            `;
            }).join('');
        }

        // 1. Pie Chart (Risk Distribution)
        const donutChart = document.querySelector('.donut-chart');
        if (donutChart) {
            if (txs.length === 0) {
                donutChart.style.background = `conic-gradient(#333 0deg 360deg)`;
            } else {
                const riskCounts = {
                    'Normal': 0,
                    'Suspicious': 0,
                    'High Risk': 0,
                    'Probable Money Laundering': 0
                };
                txs.forEach(tx => {
                    if (riskCounts[tx.riskLevel] !== undefined) riskCounts[tx.riskLevel]++;
                });

                const total = txs.length;
                let currentDeg = 0;
                const gradientParts = [];
                const colors = {
                    'Normal': 'var(--risk-low)',
                    'Suspicious': 'var(--risk-medium)',
                    'High Risk': 'var(--risk-high)',
                    'Probable Money Laundering': 'var(--risk-critical)'
                };

                ['Normal','Suspicious','High Risk','Probable Money Laundering'].forEach(level => {
                    const count = riskCounts[level];
                    const pct = (count / total) * 360;
                    const endDeg = currentDeg + pct;
                    gradientParts.push(`${colors[level]} ${currentDeg}deg ${endDeg}deg`);
                    currentDeg = endDeg;
                });

                donutChart.style.background = `conic-gradient(${gradientParts.join(', ')})`;
            }
        }

        // 2. Bar Chart (Weekly Volume)
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        // Build daily counts with risk breakdown
        const dayCounts = new Array(7).fill(null).map(() => ({ total: 0, suspicious: 0, highRisk: 0, probable: 0 }));

        txs.forEach(tx => {
            const date = new Date(tx.timestamp);
            const dayIndex = date.getDay();
            dayCounts[dayIndex].total++;
            if (tx.riskLevel === 'Suspicious') dayCounts[dayIndex].suspicious++;
            if (tx.riskLevel === 'High Risk') dayCounts[dayIndex].highRisk++;
            if (tx.riskLevel === 'Probable Money Laundering') dayCounts[dayIndex].probable++;
        });

        const totals = dayCounts.map(d => d.total);
        const maxVal = Math.max(...totals, 5);
        const barWrappers = document.querySelectorAll('.bar-wrapper');

        barWrappers.forEach((wrapper, index) => {
            const dayIndex = (index + 1) % 7;
            const dayData = dayCounts[dayIndex];
            const count = dayData.total;
            const heightPct = (count / maxVal) * 100;

            const bar = wrapper.querySelector('.bar');
            if (bar) {
                const displayHeight = count > 0 ? Math.max(heightPct, 5) : 0;
                bar.style.height = `${displayHeight}%`;

                // determine color by highest risk present
                let color = 'var(--risk-low)';
                if (dayData.probable > 0) color = 'var(--risk-critical)';
                else if (dayData.highRisk > 0) color = 'var(--risk-high)';
                else if (dayData.suspicious > 0) color = 'var(--risk-medium)';
                bar.style.background = color;

                const tooltip = `${count} txs` +
                    (dayData.suspicious ? `, ${dayData.suspicious} suspicious` : '') +
                    (dayData.highRisk ? `, ${dayData.highRisk} high risk` : '') +
                    (dayData.probable ? `, ${dayData.probable} probable` : '');
                bar.setAttribute('title', tooltip);
                bar.setAttribute('data-value', count > 0 ? count : '');
            }
        });
    }

    renderTransactions() {
        const transactions = this.store.getTransactions();
        const tbody = document.getElementById('tx-table-body');
        tbody.innerHTML = transactions.map(tx => {
            const history = tx.riskLevel && tx.riskLevel !== 'Normal' ? 'Unsafe' : 'Safe';
            return `
            <tr>
                <td>${tx.id}</td>
                <td>${new Date(tx.timestamp).toLocaleString()}</td>
                <td>${tx.sender}</td>
                <td>${tx.receiver}</td>
                <td>${tx.bankAccount || ''}</td>
                <td>$${tx.amount.toLocaleString()}</td>
                <td><span class="badge ${this.getRiskClass(tx.riskLevel)}">${tx.riskLevel}</span></td>
                <td>${history}</td>
            </tr>
        `;
        }).join('');
    }

    renderAlerts() {
        const alerts = this.store.getAlerts();
        const tbody = document.getElementById('alerts-table-body');
        tbody.innerHTML = alerts.map(alert => `
            <tr>
                <td>${alert.id}</td>
                <td>${alert.accountId || ''}</td>
                <td>${alert.riskLevel || ''}</td>
                <td>${alert.score != null ? alert.score : ''}</td>
                <td>${alert.severity || ''}</td>
                <td>${new Date(alert.timestamp).toLocaleString()}</td>
                <td><span class="badge ${alert.status === 'open' ? 'bg-critical' : 'bg-low'}">${alert.status || 'open'}</span></td>
                <td>
                    ${alert.status === 'open' ? `
                        <button class="btn btn-small btn-success" onclick="window.App.resolveAlert('${alert.id}', 'closed')">Close</button>
                        <button class="btn btn-small btn-danger" onclick="window.App.resolveAlert('${alert.id}', 'sar_filed')">File SAR</button>
                    ` : 'Resolved'}
                </td>
            </tr>
        `).join('');
    }

    renderSARs() {
        const alerts = this.store.getAlerts().filter(a => a.status === 'sar_filed');
        const list = document.getElementById('sar-list');
        if (alerts.length === 0) {
            list.innerHTML = '<p>No Suspicious Activity Reports filed.</p>';
            return;
        }
        list.innerHTML = alerts.map(a => `
            <div class="card mb-2">
                <h4>SAR Reference: SAR-${a.id}</h4>
                <p><strong>Account:</strong> ${a.accountId || ''}</p>
                <p><strong>Risk Level:</strong> ${a.riskLevel || ''} (${a.score || 0})</p>
                <p><strong>Summary:</strong> ${a.summary || ''}</p>
                <p><strong>Filed details:</strong> High risk activity detected and confirmed by analyst.</p>
            </div>
        `).join('');
    }

    renderAudit() {
        if (!this.auth.hasRole('auditor')) {
            document.getElementById('audit-view').innerHTML = '<div class="card"><h3>Access Denied</h3><p>Only Auditors can view this page.</p></div>';
            return;
        }
        const logs = this.store.getAuditLogs();
        const tbody = document.getElementById('audit-table-body');
        tbody.innerHTML = logs.map(log => `
            <tr>
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td>${log.user}</td>
                <td>${log.action}</td>
                <td>${log.details}</td>
            </tr>
        `).join('');
    }

    // --- Helpers ---

    getStats() {
        const txs = this.store.getTransactions();
        const alerts = this.store.getAlerts();
        return {
            totalTx: txs.length,
            openAlerts: alerts.filter(a => a.status === 'open').length,
            sarsFiled: alerts.filter(a => a.status === 'sar_filed').length
        };
    }

    getRiskClass(level) {
        // Only color significant risk levels; normal activity gets no badge
        switch (level) {
            case 'Probable Money Laundering': return 'bg-critical';
            case 'High Risk': return 'bg-high';
            case 'Suspicious': return 'bg-medium';
            default: return ''; // normal or low -> no badge
        }
    }

    // --- Actions ---

    simulateTransaction(e) {
        e.preventDefault();
        const form = e.target;
        const amount = parseFloat(form.amount.value);
        const sender = form.sender.value;
        const receiver = form.receiver.value;
        const bankAccount = form.bankAccount.value;

        const tx = {
            id: 'TX-' + Date.now(),
            amount,
            sender,
            receiver,
            bankAccount,
            timestamp: new Date().toISOString(),
            riskScore: 0,
            riskLevel: 'Normal',
            alerts: []
        };

        // Run AML Engine with new behavior-driven pipeline
        const result = this.amlEngine.processTransaction(tx);
        // determine the highest risk account involved
        const highest = result.highestRisk || {};
        tx.riskScore = highest.score || 0;
        tx.riskLevel = highest.riskLevel || 'Normal';

        // update stored transaction entry with computed risk info
        this.store.updateTransaction(tx);

        // AMLEngine.processTransaction already persists the transaction to the store
        // now refresh UI components
        this.renderTransactions();
        this.renderDashboard(); // reflect new totals

        // alerts are generated within the engine; no separate logic needed here
        // refresh alerts section if any generated
        if (result.accounts.some(a => a.alertGenerated)) {
            this.renderAlerts();
            this.renderDashboard(); // open alert count may changed
        }

        form.reset();
        alert(`Transaction Processed. Risk Level: ${tx.riskLevel} (${tx.riskScore})`);
    }

    resolveAlert(alertId, status) {
        const comment = prompt("Enter remarks for this action:");
        if (comment) {
            this.store.updateAlert(alertId, { status, analystComments: comment }, this.auth.currentUser.username);
            this.renderAlerts();
            this.renderDashboard(); // Update stats
        }
    }
}

// Global instance
window.addEventListener('DOMContentLoaded', () => {
    window.App = new App();

    // Bind global transaction form
    const txForm = document.getElementById('tx-form');
    if (txForm) {
        txForm.addEventListener('submit', (e) => window.App.simulateTransaction(e));
    }
});
