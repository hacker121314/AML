/**
 * AMLEngine.js (REBUILT)
 * Orchestrates behavior-based AML detection
 * Coordinates: Baseline → Pattern → Network → Evidence → Alert
 */
class AMLEngine {
    constructor(store) {
        this.store = store;
        this.baselineEngine = window.BaselineEngine;
        this.patternDetector = window.PatternDetector;
        this.networkAnalyzer = window.NetworkAnalyzer;
        this.evidenceEngine = window.EvidenceEngine;
        this.alertGenerator = window.AlertGenerator;
    }

    /**
     * Process a new transaction through the AML pipeline
     * @param {Object} transaction - Transaction to process
     * @returns {Object} Processing result
     */
    processTransaction(transaction) {
        // 1. Add transaction to store
        this.store.addTransaction(transaction);

        // 2. Get all accounts involved
        const accounts = [transaction.sender, transaction.receiver];

        // 3. Evaluate each account
        const evaluations = [];
        accounts.forEach(accountId => {
            const evaluation = this.evidenceEngine.evaluateAccount(accountId);
            this.evidenceEngine.updateAccountEvidence(evaluation);
            evaluations.push(evaluation);

            // 4. Generate alert if threshold met
            if (evaluation.score >= 30) {
                const alert = this.alertGenerator.createAndSaveAlert(accountId);
                if (alert) {
                    evaluation.alertGenerated = true;
                    evaluation.alertId = alert.id;
                }
            }
        });

        // 5. Return processing summary
        return {
            transactionId: transaction.id,
            processed: true,
            accounts: evaluations.map(e => ({
                accountId: e.accountId,
                riskLevel: e.riskLevel,
                score: e.score,
                alertGenerated: e.alertGenerated || false
            })),
            highestRisk: evaluations.reduce((max, e) =>
                e.score > max.score ? e : max
            )
        };
    }

    /**
     * Evaluate a specific account (on-demand)
     * @param {string} accountId - Account to evaluate
     * @returns {Object} Full evaluation with alert
     */
    evaluateAccount(accountId) {
        const evaluation = this.evidenceEngine.evaluateAccount(accountId);
        this.evidenceEngine.updateAccountEvidence(evaluation);

        // Generate alert if needed
        if (evaluation.score >= 30) {
            const alert = this.alertGenerator.generateAlert(evaluation);
            evaluation.alert = alert;
        }

        return evaluation;
    }

    /**
     * Get account risk summary (for UI display)
     * @param {string} accountId - Account to check
     * @returns {Object} Risk summary
     */
    getAccountRisk(accountId) {
        const evidence = this.evidenceEngine.getAccountEvidence(accountId);

        if (!evidence) {
            return {
                accountId,
                riskLevel: 'Normal',
                score: 0,
                hasEvidence: false
            };
        }

        return {
            accountId,
            riskLevel: evidence.riskLevel,
            score: evidence.score,
            hasEvidence: true,
            suspiciousTransactions: evidence.suspiciousTransactions,
            confirmedPatterns: evidence.confirmedPatterns,
            networkSignals: evidence.networkSignals
        };
    }

    /**
     * Run full system analysis (evaluate all accounts)
     * Used for periodic batch processing
     */
    runFullAnalysis() {
        console.log('Running full AML analysis...');
        const results = this.evidenceEngine.evaluateAllAccounts();

        // Generate alerts for high-risk accounts
        results.forEach(evaluation => {
            if (evaluation.score >= 30) {
                this.alertGenerator.createAndSaveAlert(evaluation.accountId);
            }
        });

        return {
            totalAccounts: results.length,
            highRiskAccounts: results.filter(r => r.score >= 60).length,
            suspiciousAccounts: results.filter(r => r.score >= 30 && r.score < 60).length,
            alertsGenerated: this.store.getData().alerts.length
        };
    }

    /**
     * Get system-wide statistics
     */
    getSystemStats() {
        const data = this.store.getData();
        const accountEvidence = data.accountEvidence || {};

        const riskDistribution = {
            'Normal': 0,
            'Suspicious': 0,
            'High Risk': 0,
            'Probable Money Laundering': 0
        };

        Object.values(accountEvidence).forEach(evidence => {
            riskDistribution[evidence.riskLevel]++;
        });

        return {
            totalAccounts: Object.keys(accountEvidence).length,
            totalTransactions: data.transactions.length,
            totalAlerts: data.alerts.length,
            riskDistribution,
            highRiskAccounts: this.evidenceEngine.getHighRiskAccounts()
        };
    }

}

// Global instance
window.AMLEngine = new AMLEngine(window.Store);
