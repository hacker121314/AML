/**
 * EvidenceEngine.js
 * Accumulates evidence and calculates risk scores
 * Evidence-based scoring: transactions → patterns → network signals
 */
class EvidenceEngine {
    constructor(store, baselineEngine, patternDetector, networkAnalyzer) {
        this.store = store;
        this.baselineEngine = baselineEngine;
        this.patternDetector = patternDetector;
        this.networkAnalyzer = networkAnalyzer;

        // Evidence weighting
        this.weights = {
            suspiciousTransaction: 10,
            confirmedPattern: 20,
            networkSignal: 30
        };
    }

    /**
     * Evaluate account and accumulate evidence
     * @param {string} accountId - Account to evaluate
     * @returns {Object} Evidence summary and risk score
     */
    evaluateAccount(accountId) {
        const transactions = this.store.getTransactions();
        const baseline = this.baselineEngine.calculateBaseline(accountId, transactions);

        // 1. Check for suspicious transactions
        const suspiciousTxs = this.findSuspiciousTransactions(accountId, transactions, baseline);

        // 2. Detect behavioral patterns
        const patterns = this.patternDetector.detectPatterns(accountId, transactions);

        // 3. Analyze network
        const networkAnalysis = this.networkAnalyzer.analyzeAccount(accountId, transactions);

        // 4. Calculate evidence score
        const score = this.calculateScore(suspiciousTxs, patterns, networkAnalysis);

        // 5. Determine risk level
        const riskLevel = this.getRiskLevel(score);

        return {
            accountId,
            score,
            riskLevel,
            evidence: {
                suspiciousTransactions: suspiciousTxs.length,
                confirmedPatterns: patterns.length,
                networkSignals: networkAnalysis.networkSignals,
                isProbableML: networkAnalysis.isProbableML
            },
            details: {
                suspiciousTxs,
                patterns,
                networkSignals: networkAnalysis.signals
            },
            baseline,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Find suspicious transactions for an account
     */
    findSuspiciousTransactions(accountId, transactions, baseline) {
        const accountTxs = transactions.filter(tx =>
            tx.sender === accountId || tx.receiver === accountId
        );

        const suspicious = [];

        // helper: get today transactions for this account
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todaysTxs = accountTxs.filter(tx => new Date(tx.timestamp) >= startOfDay);

        // metrics for spikes
        const txCountToday = todaysTxs.length;
        const uniqueSendersToday = new Set(
            todaysTxs.filter(tx => tx.receiver === accountId).map(tx => tx.sender)
        ).size;

        accountTxs.forEach(tx => {
            // Check deviation from baseline (for sender)
            if (tx.sender === accountId) {
                const deviation = this.baselineEngine.checkDeviation(tx, baseline);
                if (deviation.hasDeviation) {
                    suspicious.push({
                        txId: tx.id,
                        type: 'baseline_deviation',
                        deviations: deviation.deviations,
                        transaction: tx
                    });
                }
            }

            // Check frequency spike (based on sender or receiver activity)
            if (baseline.avgTxFrequency > 0 && txCountToday > baseline.avgTxFrequency * 3) {
                suspicious.push({
                    txId: tx.id,
                    type: 'frequency_spike',
                    flag: {
                        description: `Transaction frequency today (${txCountToday}) is >3x daily average (${baseline.avgTxFrequency.toFixed(2)})`
                    },
                    transaction: tx
                });
            }

            // Check sender count spike for inflows
            if (tx.receiver === accountId && baseline.avgUniqueSenders > 0 &&
                uniqueSendersToday > baseline.avgUniqueSenders * 2) {
                suspicious.push({
                    txId: tx.id,
                    type: 'sender_count_spike',
                    flag: {
                        description: `Unique senders today (${uniqueSendersToday}) >2x baseline (${baseline.avgUniqueSenders.toFixed(2)})`
                    },
                    transaction: tx
                });
            }

            // Check for repeated similar-value transactions within 24h
            const windowStart = new Date(new Date(tx.timestamp).getTime() - 24 * 60 * 60 * 1000);
            const similarTxs = accountTxs.filter(o =>
                new Date(o.timestamp) >= windowStart &&
                Math.abs(o.amount - tx.amount) / tx.amount < 0.05 // within 5%
            );
            if (similarTxs.length >= 3) {
                suspicious.push({
                    txId: tx.id,
                    type: 'similar_value_repeat',
                    flag: {
                        description: `At least ${similarTxs.length} transactions with similar amount ($${tx.amount}) in 24h`
                    },
                    transaction: tx
                });
            }

            // Check for unusual timing
            const timingFlag = this.checkUnusualTiming(tx, accountTxs);
            if (timingFlag) {
                suspicious.push({
                    txId: tx.id,
                    type: 'unusual_timing',
                    flag: timingFlag,
                    transaction: tx
                });
            }
        });

        return suspicious;
    }

    /**
     * Check for unusual transaction timing
     */
    checkUnusualTiming(transaction, accountHistory) {
        const txTime = new Date(transaction.timestamp);
        const hour = txTime.getHours();

        // Flag transactions during unusual hours (midnight to 5 AM)
        if (hour >= 0 && hour < 5) {
            // Check if this is unusual for this account
            const normalHourTxs = accountHistory.filter(tx => {
                const h = new Date(tx.timestamp).getHours();
                return h >= 5 && h < 24;
            });

            if (normalHourTxs.length > accountHistory.length * 0.8) {
                return {
                    reason: 'unusual_hours',
                    hour,
                    description: 'Transaction during unusual hours (midnight-5AM)'
                };
            }
        }

        return null;
    }

    /**
     * Calculate total evidence score
     */
    calculateScore(suspiciousTxs, patterns, networkAnalysis) {
        let score = 0;

        // Add points for suspicious transactions
        score += suspiciousTxs.length * this.weights.suspiciousTransaction;

        // Add points for confirmed patterns
        score += patterns.length * this.weights.confirmedPattern;

        // Add points for network signals
        score += networkAnalysis.networkSignals * this.weights.networkSignal;

        // Bonus for probable money laundering (2+ network signals)
        if (networkAnalysis.isProbableML) {
            score += 20;
        }

        return Math.min(score, 100); // Cap at 100
    }

    /**
     * Determine risk level from score
     */
    getRiskLevel(score) {
        if (score >= 80) return 'Probable Money Laundering';
        if (score >= 60) return 'High Risk';
        if (score >= 30) return 'Suspicious';
        return 'Normal';
    }

    /**
     * Get or update account evidence
     * Persists evidence in store
     */
    getAccountEvidence(accountId) {
        const data = this.store.getData();
        if (!data.accountEvidence) {
            data.accountEvidence = {};
            this.store.saveData(data);
        }

        return data.accountEvidence[accountId] || null;
    }

    /**
     * Update account evidence in store
     */
    updateAccountEvidence(evaluation) {
        const data = this.store.getData();
        if (!data.accountEvidence) {
            data.accountEvidence = {};
        }

        data.accountEvidence[evaluation.accountId] = {
            score: evaluation.score,
            riskLevel: evaluation.riskLevel,
            suspiciousTransactions: evaluation.evidence.suspiciousTransactions,
            confirmedPatterns: evaluation.evidence.confirmedPatterns,
            networkSignals: evaluation.evidence.networkSignals,
            isProbableML: evaluation.evidence.isProbableML,
            lastUpdated: evaluation.timestamp
        };

        this.store.saveData(data);
    }

    /**
     * Evaluate all accounts and update evidence
     */
    evaluateAllAccounts() {
        const transactions = this.store.getTransactions();
        const accounts = new Set();

        transactions.forEach(tx => {
            accounts.add(tx.sender);
            accounts.add(tx.receiver);
        });

        const results = [];
        accounts.forEach(accountId => {
            const evaluation = this.evaluateAccount(accountId);
            this.updateAccountEvidence(evaluation);
            results.push(evaluation);
        });

        return results;
    }

    /**
     * Get high-risk accounts
     */
    getHighRiskAccounts() {
        const data = this.store.getData();
        const accountEvidence = data.accountEvidence || {};

        return Object.entries(accountEvidence)
            .filter(([_, evidence]) =>
                evidence.riskLevel === 'High Risk' ||
                evidence.riskLevel === 'Probable Money Laundering'
            )
            .map(([accountId, evidence]) => ({
                accountId,
                ...evidence
            }))
            .sort((a, b) => b.score - a.score);
    }
}

// Global instance
window.EvidenceEngine = new EvidenceEngine(
    window.Store,
    window.BaselineEngine,
    window.PatternDetector,
    window.NetworkAnalyzer
);
