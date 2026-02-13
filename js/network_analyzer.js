/**
 * NetworkAnalyzer.js
 * Detects money laundering through fund flow analysis
 * Identifies circular movement, hub accounts, and network linkages
 */
class NetworkAnalyzer {
    constructor(store) {
        this.store = store;
    }

    /**
     * Analyze network for a specific account
     * @param {string} accountId - Account to analyze
     * @param {Array} transactions - All transactions
     * @returns {Object} Network analysis results
     */
    analyzeAccount(accountId, transactions) {
        const signals = [];

        // Signal 1: Circular fund movement
        const circular = this.detectCircularFlow(accountId, transactions);
        if (circular.detected) signals.push(circular);

        // Signal 2: Hub account behavior
        const hub = this.detectHubBehavior(accountId, transactions);
        if (hub.detected) signals.push(hub);

        // Signal 3: Links to flagged accounts
        const links = this.detectFlaggedLinks(accountId, transactions);
        if (links.detected) signals.push(links);

        return {
            accountId,
            networkSignals: signals.length,
            isProbableML: signals.length >= 2, // 2+ signals = probable money laundering
            signals
        };
    }

    /**
     * Detect circular fund movement
     * Same funds passing through ≥3 accounts and returning
     */
    detectCircularFlow(accountId, transactions) {
        const paths = this.traceFundPaths(accountId, transactions, 5); // Max depth 5

        // Look for paths that return to origin
        const circularPaths = paths.filter(path => {
            const lastAccount = path[path.length - 1].receiver;
            return lastAccount === accountId && path.length >= 3;
        });

        if (circularPaths.length > 0) {
            // Find the most suspicious circular path
            const mainPath = circularPaths.reduce((longest, current) =>
                current.length > longest.length ? current : longest
            );

            return {
                detected: true,
                type: 'circular_flow',
                severity: 'critical',
                description: `Funds returned to origin through ${mainPath.length} accounts`,
                evidence: {
                    pathLength: mainPath.length,
                    accounts: mainPath.map(tx => tx.receiver),
                    totalAmount: mainPath[0].amount,
                    path: mainPath.map(tx => ({
                        from: tx.sender,
                        to: tx.receiver,
                        amount: tx.amount,
                        time: tx.timestamp
                    }))
                }
            };
        }

        return { detected: false };
    }

    /**
     * Trace fund paths from an account
     * @param {string} startAccount - Starting account
     * @param {Array} transactions - All transactions
     * @param {number} maxDepth - Maximum path depth
     * @returns {Array} All paths found
     */
    traceFundPaths(startAccount, transactions, maxDepth, currentPath = [], visited = new Set()) {
        if (currentPath.length >= maxDepth) return [currentPath];

        const paths = [];
        const lastAccount = currentPath.length > 0
            ? currentPath[currentPath.length - 1].receiver
            : startAccount;

        // Find outflows from last account
        const outflows = transactions.filter(tx =>
            tx.sender === lastAccount &&
            !visited.has(tx.id)
        );

        if (outflows.length === 0) {
            return currentPath.length > 0 ? [currentPath] : [];
        }

        outflows.forEach(tx => {
            const newVisited = new Set(visited);
            newVisited.add(tx.id);
            const newPath = [...currentPath, tx];

            // Continue tracing
            const subPaths = this.traceFundPaths(
                startAccount,
                transactions,
                maxDepth,
                newPath,
                newVisited
            );
            paths.push(...subPaths);
        });

        return paths;
    }

    /**
     * Detect hub account behavior
     * Account collecting funds then redistributing
     */
    detectHubBehavior(accountId, transactions) {
        const inflows = transactions.filter(tx => tx.receiver === accountId);
        const outflows = transactions.filter(tx => tx.sender === accountId);

        // Hub characteristics:
        // 1. Multiple unique senders
        // 2. Multiple unique receivers
        // 3. Rapid redistribution

        const uniqueSenders = new Set(inflows.map(tx => tx.sender)).size;
        const uniqueReceivers = new Set(outflows.map(tx => tx.receiver)).size;

        if (uniqueSenders >= 5 && uniqueReceivers >= 5) {
            // Check for rapid redistribution
            let rapidRedistributions = 0;
            inflows.forEach(inflow => {
                const inflowTime = new Date(inflow.timestamp);
                const matchingOutflow = outflows.find(outflow => {
                    const outflowTime = new Date(outflow.timestamp);
                    const timeDiff = (outflowTime - inflowTime) / (1000 * 60 * 60); // hours
                    return timeDiff > 0 && timeDiff < 24; // Within 24 hours
                });
                if (matchingOutflow) rapidRedistributions++;
            });

            if (rapidRedistributions >= 3) {
                return {
                    detected: true,
                    type: 'hub_account',
                    severity: 'critical',
                    description: `Hub behavior: ${uniqueSenders} senders → ${uniqueReceivers} receivers`,
                    evidence: {
                        uniqueSenders,
                        uniqueReceivers,
                        rapidRedistributions,
                        totalInflows: inflows.length,
                        totalOutflows: outflows.length
                    }
                };
            }
        }

        return { detected: false };
    }

    /**
     * Detect links to previously flagged accounts
     */
    detectFlaggedLinks(accountId, transactions) {
        // Get all flagged accounts from evidence
        const accountEvidence = this.store.getData().accountEvidence || {};
        const flaggedAccounts = Object.keys(accountEvidence).filter(acc =>
            accountEvidence[acc].riskLevel === 'High Risk' ||
            accountEvidence[acc].riskLevel === 'Probable Money Laundering'
        );

        if (flaggedAccounts.length === 0) {
            return { detected: false };
        }

        // Find connections to flagged accounts
        const connections = transactions.filter(tx =>
            (tx.sender === accountId && flaggedAccounts.includes(tx.receiver)) ||
            (tx.receiver === accountId && flaggedAccounts.includes(tx.sender))
        );

        if (connections.length > 0) {
            const linkedAccounts = new Set(
                connections.map(tx =>
                    tx.sender === accountId ? tx.receiver : tx.sender
                )
            );

            return {
                detected: true,
                type: 'flagged_links',
                severity: 'high',
                description: `Linked to ${linkedAccounts.size} flagged accounts`,
                evidence: {
                    linkedAccounts: Array.from(linkedAccounts),
                    connectionCount: connections.length,
                    connections: connections.map(tx => ({
                        txId: tx.id,
                        counterparty: tx.sender === accountId ? tx.receiver : tx.sender,
                        amount: tx.amount,
                        timestamp: tx.timestamp
                    }))
                }
            };
        }

        return { detected: false };
    }

    /**
     * Build network graph for visualization
     * @param {Array} transactions - Transactions to include
     * @returns {Object} Network graph data
     */
    buildNetworkGraph(transactions) {
        const nodes = new Set();
        const edges = [];

        transactions.forEach(tx => {
            nodes.add(tx.sender);
            nodes.add(tx.receiver);
            edges.push({
                source: tx.sender,
                target: tx.receiver,
                amount: tx.amount,
                timestamp: tx.timestamp,
                txId: tx.id
            });
        });

        return {
            nodes: Array.from(nodes).map(id => ({ id })),
            edges
        };
    }
}

// Global instance
window.NetworkAnalyzer = new NetworkAnalyzer(window.Store);
