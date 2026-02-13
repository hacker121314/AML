/**
 * PatternDetector.js
 * Identifies suspicious behavioral patterns in account activity
 * Patterns: Smurfing, Layering, Structuring, Income Mismatch
 */
class PatternDetector {
    constructor(store, baselineEngine) {
        this.store = store;
        this.baselineEngine = baselineEngine;
    }

    /**
     * Detect all patterns for a given account
     * @param {string} accountId - Account to analyze
     * @param {Array} transactions - All transactions
     * @returns {Array} Detected patterns
     */
    detectPatterns(accountId, transactions) {
        const patterns = [];

        // compute baseline once for reuse
        const baseline = this.baselineEngine.calculateBaseline(accountId, transactions);

        // Get recent activity (48 hours)
        const recentTxs = this.baselineEngine.getRecentActivity(accountId, transactions, 48);

        // Pattern A: Smurfing (Many-to-One)
        const smurfing = this.detectSmurfing(accountId, recentTxs);
        if (smurfing.detected) patterns.push(smurfing);

        // Pattern B: Layering (Rapid In-Out)
        const layering = this.detectLayering(accountId, transactions);
        if (layering.detected) patterns.push(layering);

        // Pattern C: Structuring (uses baseline for threshold)
        const structuring = this.detectStructuring(accountId, transactions, baseline);
        if (structuring.detected) patterns.push(structuring);

        // Pattern D: Income Mismatch (baseline used inside)
        const mismatch = this.detectIncomeMismatch(accountId, transactions);
        if (mismatch.detected) patterns.push(mismatch);

        return patterns;
    }

    /**
     * Pattern A: Smurfing (Many-to-One)
     * ≥6 unique senders within 48 hours, amounts clustered or structured
     */
    detectSmurfing(accountId, recentTxs) {
        const inflows = recentTxs.filter(tx => tx.receiver === accountId);
        const uniqueSenders = new Set(inflows.map(tx => tx.sender));

        if (uniqueSenders.size >= 6) {
            // Check if amounts are clustered (similar values)
            const amounts = inflows.map(tx => tx.amount);
            const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
            const clustered = amounts.filter(amt =>
                Math.abs(amt - avgAmount) / avgAmount < 0.2 // Within 20% of average
            ).length >= amounts.length * 0.6; // 60% of transactions clustered

            return {
                detected: true,
                type: 'smurfing',
                severity: 'high',
                description: `Received funds from ${uniqueSenders.size} unique senders in 48h`,
                evidence: {
                    uniqueSenders: uniqueSenders.size,
                    totalTransactions: inflows.length,
                    clustered,
                    timeWindow: '48h'
                }
            };
        }

        return { detected: false };
    }

    /**
     * Pattern B: Layering (Rapid In-Out)
     * Funds exit within <2 hours of entry, pattern repeats ≥3 times
     */
    detectLayering(accountId, transactions) {
        const rapidCycles = [];

        // Get all inflows
        const inflows = transactions
            .filter(tx => tx.receiver === accountId)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // For each inflow, check if there's a matching outflow within 2 hours
        inflows.forEach(inflow => {
            const inflowTime = new Date(inflow.timestamp);
            const twoHoursLater = new Date(inflowTime.getTime() + 2 * 60 * 60 * 1000);

            const matchingOutflow = transactions.find(tx =>
                tx.sender === accountId &&
                new Date(tx.timestamp) > inflowTime &&
                new Date(tx.timestamp) < twoHoursLater &&
                Math.abs(tx.amount - inflow.amount) / inflow.amount < 0.1 // Within 10%
            );

            if (matchingOutflow) {
                const timeDiff = (new Date(matchingOutflow.timestamp) - inflowTime) / (1000 * 60); // minutes
                rapidCycles.push({
                    inflowId: inflow.id,
                    outflowId: matchingOutflow.id,
                    amount: inflow.amount,
                    timeDiffMinutes: timeDiff
                });
            }
        });

        if (rapidCycles.length >= 3) {
            return {
                detected: true,
                type: 'layering',
                severity: 'high',
                description: `${rapidCycles.length} rapid in-out cycles detected`,
                evidence: {
                    cycleCount: rapidCycles.length,
                    avgTimeDiff: rapidCycles.reduce((sum, c) => sum + c.timeDiffMinutes, 0) / rapidCycles.length,
                    cycles: rapidCycles
                }
            };
        }

        return { detected: false };
    }

    /**
     * Pattern C: Structuring
     * Repeated transactions just below thresholds across multiple days
     */
    detectStructuring(accountId, transactions, baseline) {
        // dynamic threshold: use either the upper typical amount or regulatory default
        const defaultThreshold = 10000;
        const upperTypical = baseline.typicalAmountRange[1] || 0;
        const threshold = Math.max(upperTypical * 1.1, defaultThreshold);

        const lowerBound = threshold * 0.85;
        const upperBound = threshold * 0.99;

        // Get outflows in the structuring range
        const structuredTxs = transactions.filter(tx =>
            tx.sender === accountId &&
            tx.amount >= lowerBound &&
            tx.amount <= upperBound
        );

        if (structuredTxs.length >= 3) {
            // Check if spread across multiple days
            const dates = structuredTxs.map(tx =>
                new Date(tx.timestamp).toDateString()
            );
            const uniqueDays = new Set(dates).size;

            if (uniqueDays >= 2) {
                return {
                    detected: true,
                    type: 'structuring',
                    severity: 'high',
                    description: `${structuredTxs.length} transactions just below dynamic threshold ($${threshold.toFixed(2)})`,
                    evidence: {
                        transactionCount: structuredTxs.length,
                        daysSpread: uniqueDays,
                        threshold,
                        avgAmount: structuredTxs.reduce((sum, tx) => sum + tx.amount, 0) / structuredTxs.length
                    }
                };
            }
        }

        return { detected: false };
    }

    /**
     * Pattern D: Income/Behavior Mismatch
     * Observed inflow inconsistent with historical behavior
     */
    detectIncomeMismatch(accountId, transactions) {
        const baseline = this.baselineEngine.calculateBaseline(accountId, transactions);

        // Only check if account has enough history
        if (baseline.accountAge < 7) {
            return { detected: false };
        }

        // Get recent inflows (last 7 days)
        const recentTxs = this.baselineEngine.getRecentActivity(accountId, transactions, 24 * 7);
        const recentInflows = recentTxs.filter(tx => tx.receiver === accountId);
        const recentInflowTotal = recentInflows.reduce((sum, tx) => sum + tx.amount, 0);
        const recentDailyAvg = recentInflowTotal / 7;

        // Compare to baseline
        if (baseline.avgDailyInflow > 0) {
            const ratio = recentDailyAvg / baseline.avgDailyInflow;

            if (ratio > 3) {
                return {
                    detected: true,
                    type: 'income_mismatch',
                    severity: ratio > 5 ? 'high' : 'medium',
                    description: `Recent inflow ${ratio.toFixed(1)}x higher than historical average`,
                    evidence: {
                        recentDailyAvg,
                        baselineAvg: baseline.avgDailyInflow,
                        ratio,
                        accountAge: baseline.accountAge
                    }
                };
            }
        }

        return { detected: false };
    }

    /**
     * Get pattern summary for an account
     */
    getPatternSummary(accountId, transactions) {
        const patterns = this.detectPatterns(accountId, transactions);
        return {
            accountId,
            patternCount: patterns.length,
            patterns: patterns.map(p => p.type),
            highSeverityCount: patterns.filter(p => p.severity === 'high').length,
            details: patterns
        };
    }
}

// Global instance
window.PatternDetector = new PatternDetector(window.Store, window.BaselineEngine);
