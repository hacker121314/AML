/**
 * Store.js
 * Handles LocalStorage persistence and initial data seeding.
 */
class Store {
    constructor() {
        this.dbName = 'AML_System_DB';
        this.init();
    }

    init() {
        if (!localStorage.getItem(this.dbName)) {
            const initialData = {
                users: [
                    { id: 'u1', username: 'analyst', role: 'analyst', password: 'password' },
                    { id: 'u2', username: 'auditor', role: 'auditor', password: 'password' }
                ],
                transactions: [],
                alerts: [],
                auditLogs: [],
                watchlist: ['SanctionedEntity_001', 'BadActor_99', 'Launderer_X'],
                accountEvidence: {} // New: stores account risk scores and evidence
            };
            this.saveData(initialData);
            this.logAudit('System', 'Initialization', 'System initialized with default data.');
        }
    }

    getData() {
        return JSON.parse(localStorage.getItem(this.dbName));
    }

    saveData(data) {
        localStorage.setItem(this.dbName, JSON.stringify(data));
    }

    addUser(user) {
        const data = this.getData();
        data.users.push(user);
        this.saveData(data);
        this.logAudit('System', 'User Registered', `New user registered: ${user.username} (${user.role})`);
    }

    // --- Transactions ---
    addTransaction(transaction) {
        const data = this.getData();
        data.transactions.unshift(transaction); // Add to beginning
        this.saveData(data);
        this.logAudit('System', 'Transaction Added', `ID: ${transaction.id}, Amount: ${transaction.amount}`);
    }

    getTransactions() {
        return this.getData().transactions;
    }

    /**
     * Update an existing transaction entry by id
     */
    updateTransaction(updatedTx) {
        const data = this.getData();
        const idx = data.transactions.findIndex(t => t.id === updatedTx.id);
        if (idx !== -1) {
            data.transactions[idx] = { ...data.transactions[idx], ...updatedTx };
            this.saveData(data);
            this.logAudit('System', 'Transaction Updated', `ID: ${updatedTx.id}`);
        }
    }

    // --- Alerts ---
    addAlert(alert) {
        const data = this.getData();
        data.alerts.unshift(alert);
        this.saveData(data);
        this.logAudit('System', 'Alert Generated', `Alert ID: ${alert.id} for Transaction ${alert.transactionId}`);
    }

    getAlerts() {
        return this.getData().alerts;
    }

    updateAlert(alertId, updates, user) {
        const data = this.getData();
        const index = data.alerts.findIndex(a => a.id === alertId);
        if (index !== -1) {
            data.alerts[index] = { ...data.alerts[index], ...updates };
            this.saveData(data);
            this.logAudit(user, 'Alert Updated', `Alert ${alertId} updated. Status: ${updates.status || 'unchanged'}`);
        }
    }

    // --- Audit ---
    logAudit(user, action, details) {
        const data = this.getData();
        const log = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            timestamp: new Date().toISOString(),
            user,
            action,
            details
        };
        data.auditLogs.unshift(log);
        this.saveData(data);
    }

    getAuditLogs() {
        return this.getData().auditLogs;
    }

    getWatchlist() {
        return this.getData().watchlist;
    }

    resetData() {
        localStorage.removeItem(this.dbName);
        this.init();
        window.location.reload();
    }
}

// Global instance
window.Store = new Store();
