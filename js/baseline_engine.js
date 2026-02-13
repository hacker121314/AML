/**
 * BaselineEngine.js
 * Maintains personalized behavioral baselines for each account
 * Foundation for behavior-based AML detection
 */
class BaselineEngine {
    constructor(store) {
        this.store = store;
    }

    /**
     * Calculate baseline for a specific account (sender or receiver)
     * @param {string} accountId - Account identifier
     * @param {Array} allTransactions - All historical transactions
     * @returns {Object} Baseline metrics
     */
    calculateBaseline(accountId, allTransactions) {
        // Filter transactions involving this account
        const accountTxs = allTransactions.filter(tx =>
            tx.sender === accountId || tx.receiver === accountId
        );

        if (accountTxs.length === 0) {
            return this.getDefaultBaseline(accountId);
        }

        // Calculate account age (days since first transaction)
        const firstTx = accountTxs.reduce((earliest, tx) =>
            new Date(tx.timestamp) < new Date(earliest.timestamp) ? tx : earliest
        );
        const accountAge = Math.floor(
            (Date.now() - new Date(firstTx.timestamp)) / (1000 * 60 * 60 * 24)
        ) || 1; // Minimum 1 day

        // Separate inflows and outflows
        const inflows = accountTxs.filter(tx => tx.receiver === accountId);
        const outflows = accountTxs.filter(tx => tx.sender === accountId);

        // Calculate daily averages
        const totalInflow = inflows.reduce((sum, tx) => sum + tx.amount, 0);
        const totalOutflow = outflows.reduce((sum, tx) => sum + tx.amount, 0);
        const avgDailyInflow = totalInflow / accountAge;
        const avgDailyOutflow = totalOutflow / accountAge;

        // Transaction frequency
        const avgTxFrequency = accountTxs.length / accountAge;

        // Unique counterparties
        const uniqueSenders = new Set(inflows.map(tx => tx.sender)).size;
        const uniqueReceivers = new Set(outflows.map(tx => tx.receiver)).size;
        const avgUniqueSenders = uniqueSenders / accountAge;
        const avgUniqueReceivers = uniqueReceivers / accountAge;

        // Typical amount range (10th to 90th percentile)
        const amounts = accountTxs.map(tx => tx.amount).sort((a, b) => a - b);
        const p10 = amounts[Math.floor(amounts.length * 0.1)] || 0;
        const p90 = amounts[Math.floor(amounts.length * 0.9)] || 0;

        return {
            accountId,
            avgDailyInflow,
            avgDailyOutflow,
            avgTxFrequency,
            avgUniqueSenders,
            avgUniqueReceivers,
            typicalAmountRange: [p10, p90],
            accountAge,
            totalTransactions: accountTxs.length,
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Get default baseline for new accounts
     */
    getDefaultBaseline(accountId) {
        return {
            accountId,
            avgDailyInflow: 0,
            avgDailyOutflow: 0,
            avgTxFrequency: 0,
            avgUniqueSenders: 0,
            avgUniqueReceivers: 0,
            typicalAmountRange: [0, 0],
            accountAge: 0,
            totalTransactions: 0,
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Calculate baselines for all accounts
     * @returns {Object} Map of accountId -> baseline
     */
    calculateAllBaselines() {
        const transactions = this.store.getTransactions();
        const baselines = {};

        // Get all unique accounts
        const accounts = new Set();
        transactions.forEach(tx => {
            accounts.add(tx.sender);
            accounts.add(tx.receiver);
        });

        // Calculate baseline for each account
        accounts.forEach(accountId => {
            baselines[accountId] = this.calculateBaseline(accountId, transactions);
        });

        return baselines;
    }

    /**
     * Check if transaction deviates from account baseline
     * @param {Object} transaction - Transaction to check
     * @param {Object} baseline - Account baseline
     * @returns {Object} Deviation analysis
     */
    checkDeviation(transaction, baseline) {
        const deviations = [];

        // Amount deviation (sender perspective)
        if (transaction.sender) {
            if (baseline.avgDailyOutflow > 0) {
                const amountRatio = transaction.amount / baseline.avgDailyOutflow;
                if (amountRatio > 3) {
                    deviations.push({
                        type: 'amount_deviation',
                        severity: amountRatio > 5 ? 'high' : 'medium',
                        ratio: amountRatio,
                        description: `Transaction amount is ${amountRatio.toFixed(1)}x the daily average`
                    });
                }
            } else if (transaction.amount > 0) {
                // No prior outflows -> first transaction
                deviations.push({
                    type: 'first_transaction',
                    severity: 'medium',
                    description: `First recorded outflow of $${transaction.amount}`
                });
            }
        }

        // Out of typical range
        const [minTypical, maxTypical] = baseline.typicalAmountRange;
        if (maxTypical > 0 && transaction.amount > maxTypical * 1.5) {
            deviations.push({
                type: 'range_deviation',
                severity: 'medium',
                description: `Amount exceeds typical range (${minTypical}-${maxTypical})`
            });
        }

        return {
            hasDeviation: deviations.length > 0,
            deviations,
            baseline
        };
    }

    /**
     * Get recent activity for an account (last 48 hours)
     */
    getRecentActivity(accountId, transactions, hoursBack = 48) {
        const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
        return transactions.filter(tx =>
            (tx.sender === accountId || tx.receiver === accountId) &&
            new Date(tx.timestamp) > cutoff
        );
    }
}

// Global instance
window.BaselineEngine = new BaselineEngine(window.Store);
