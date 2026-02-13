/**
 * AlertGenerator.js
 * Creates explainable alerts with full context
 * Includes behavior summary, patterns, timeline, and network relationships
 */
class AlertGenerator {
    constructor(store, evidenceEngine) {
        this.store = store;
        this.evidenceEngine = evidenceEngine;
    }

    /**
     * Generate alert for an account if threshold is met
     * @param {Object} evaluation - Account evaluation from EvidenceEngine
     * @returns {Object|null} Alert object or null if no alert needed
     */
    generateAlert(evaluation) {
        // Only generate alerts for Suspicious or higher
        if (evaluation.score < 30) {
            return null;
        }

        const alert = {
            id: 'ALERT-' + Date.now(),
            accountId: evaluation.accountId,
            severity: this.mapRiskToSeverity(evaluation.riskLevel),
            riskLevel: evaluation.riskLevel,
            score: evaluation.score,
            timestamp: new Date().toISOString(),
            status: 'open',

            // Core alert components
            summary: this.generateSummary(evaluation),
            behaviorSummary: this.generateBehaviorSummary(evaluation),
            detectedPatterns: this.formatPatterns(evaluation.details.patterns),
            timeline: this.generateTimeline(evaluation),
            networkRelationships: this.formatNetworkSignals(evaluation.details.networkSignals),

            // Evidence breakdown
            evidenceBreakdown: {
                suspiciousTransactions: evaluation.evidence.suspiciousTransactions,
                confirmedPatterns: evaluation.evidence.confirmedPatterns,
                networkSignals: evaluation.evidence.networkSignals
            },

            // Recommendations
            recommendations: this.generateRecommendations(evaluation)
        };

        return alert;
    }

    /**
     * Map risk level to alert severity
     */
    mapRiskToSeverity(riskLevel) {
        const mapping = {
            'Normal': 'low',
            'Suspicious': 'medium',
            'High Risk': 'high',
            'Probable Money Laundering': 'critical'
        };
        return mapping[riskLevel] || 'low';
    }

    /**
     * Generate one-line summary
     */
    generateSummary(evaluation) {
        const { accountId, evidence, details } = evaluation;
        const parts = [];

        if (evidence.suspiciousTransactions > 0) {
            parts.push(`${evidence.suspiciousTransactions} suspicious transactions`);
        }

        if (evidence.confirmedPatterns > 0) {
            const patternTypes = details.patterns.map(p => p.type).join(', ');
            parts.push(`patterns detected: ${patternTypes}`);
        }

        if (evidence.networkSignals > 0) {
            parts.push(`${evidence.networkSignals} network signals`);
        }

        return `Account "${accountId}": ${parts.join(', ')}`;
    }

    /**
     * Generate detailed behavior summary
     */
    generateBehaviorSummary(evaluation) {
        const { baseline, evidence, details } = evaluation;
        const summary = [];

        // Account profile
        summary.push(`Account Age: ${baseline.accountAge} days`);
        summary.push(`Total Transactions: ${baseline.totalTransactions}`);
        summary.push(`Avg Daily Inflow: $${baseline.avgDailyInflow.toFixed(2)}`);
        summary.push(`Avg Daily Outflow: $${baseline.avgDailyOutflow.toFixed(2)}`);

        // Suspicious activity
        if (evidence.suspiciousTransactions > 0) {
            const txDetails = details.suspiciousTxs.map(stx => {
                if (stx.type === 'baseline_deviation') {
                    const devDesc = stx.deviations.map(d => d.description).join('; ');
                    return `- TX ${stx.txId}: ${devDesc}`;
                }
                return `- TX ${stx.txId}: ${stx.flag?.description || 'Flagged'}`;
            });
            summary.push('\nSuspicious Transactions:');
            summary.push(...txDetails);
        }

        return summary.join('\n');
    }

    /**
     * Format detected patterns
     */
    formatPatterns(patterns) {
        if (patterns.length === 0) {
            return 'No patterns detected';
        }

        return patterns.map(pattern => {
            const lines = [
                `Pattern: ${pattern.type.toUpperCase()}`,
                `Severity: ${pattern.severity}`,
                `Description: ${pattern.description}`
            ];

            // Add evidence details
            if (pattern.evidence) {
                lines.push('Evidence:');
                Object.entries(pattern.evidence).forEach(([key, value]) => {
                    if (typeof value === 'object' && !Array.isArray(value)) {
                        return; // Skip complex objects
                    }
                    if (Array.isArray(value) && value.length > 3) {
                        lines.push(`  - ${key}: ${value.length} items`);
                    } else {
                        lines.push(`  - ${key}: ${JSON.stringify(value)}`);
                    }
                });
            }

            return lines.join('\n');
        }).join('\n\n');
    }

    /**
     * Generate timeline of evidence
     */
    generateTimeline(evaluation) {
        const events = [];

        // Add suspicious transactions to timeline
        evaluation.details.suspiciousTxs.forEach(stx => {
            events.push({
                timestamp: stx.transaction.timestamp,
                type: 'suspicious_transaction',
                description: `Suspicious transaction: ${stx.type}`,
                txId: stx.txId
            });
        });

        // Add pattern detection events
        evaluation.details.patterns.forEach(pattern => {
            events.push({
                timestamp: new Date().toISOString(), // Pattern detected now
                type: 'pattern_detected',
                description: `Pattern detected: ${pattern.type}`,
                severity: pattern.severity
            });
        });

        // Sort by timestamp
        events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        return events;
    }

    /**
     * Format network signals
     */
    formatNetworkSignals(signals) {
        if (signals.length === 0) {
            return 'No network signals detected';
        }

        return signals.map(signal => {
            const lines = [
                `Signal: ${signal.type.toUpperCase()}`,
                `Severity: ${signal.severity}`,
                `Description: ${signal.description}`
            ];

            // Add specific evidence
            if (signal.type === 'circular_flow' && signal.evidence.path) {
                lines.push('Fund Flow Path:');
                signal.evidence.path.forEach((step, i) => {
                    lines.push(`  ${i + 1}. ${step.from} → ${step.to} ($${step.amount})`);
                });
            }

            if (signal.type === 'hub_account') {
                lines.push(`Unique Senders: ${signal.evidence.uniqueSenders}`);
                lines.push(`Unique Receivers: ${signal.evidence.uniqueReceivers}`);
                lines.push(`Rapid Redistributions: ${signal.evidence.rapidRedistributions}`);
            }

            if (signal.type === 'flagged_links') {
                lines.push(`Linked Accounts: ${signal.evidence.linkedAccounts.join(', ')}`);
            }

            return lines.join('\n');
        }).join('\n\n');
    }

    /**
     * Generate recommendations
     */
    generateRecommendations(evaluation) {
        const recommendations = [];

        if (evaluation.riskLevel === 'Probable Money Laundering') {
            recommendations.push('IMMEDIATE ACTION REQUIRED: File Suspicious Activity Report (SAR)');
            recommendations.push('Escalate to compliance team for investigation');
            recommendations.push('Consider account freeze pending investigation');
        } else if (evaluation.riskLevel === 'High Risk') {
            recommendations.push('Enhanced due diligence required');
            recommendations.push('Review account activity with compliance team');
            recommendations.push('Monitor closely for additional suspicious activity');
        } else if (evaluation.riskLevel === 'Suspicious') {
            recommendations.push('Continue monitoring account activity');
            recommendations.push('Document suspicious patterns');
            recommendations.push('Escalate if additional evidence emerges');
        }

        return recommendations;
    }

    /**
     * Generate and save alert
     */
    createAndSaveAlert(accountId) {
        const evaluation = this.evidenceEngine.evaluateAccount(accountId);
        const alert = this.generateAlert(evaluation);

        if (alert) {
            // Save to store
            const data = this.store.getData();
            if (!data.alerts) {
                data.alerts = [];
            }

            // Check if similar alert already exists (within last hour)
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const existingAlert = data.alerts.find(a =>
                a.accountId === accountId &&
                new Date(a.timestamp) > oneHourAgo
            );

            if (!existingAlert) {
                data.alerts.push(alert);
                this.store.saveData(data);
                this.store.logAudit('System', 'Alert Generated',
                    `${alert.severity.toUpperCase()} alert for account ${accountId}: ${alert.summary}`
                );
            }

            return alert;
        }

        return null;
    }

    /**
     * Get all alerts
     */
    getAllAlerts() {
        const data = this.store.getData();
        return data.alerts || [];
    }

    /**
     * Get alerts by severity
     */
    getAlertsBySeverity(severity) {
        return this.getAllAlerts().filter(a => a.severity === severity);
    }
}

// Global instance
window.AlertGenerator = new AlertGenerator(window.Store, window.EvidenceEngine);
