# AML
AML Detection AI Agent is a browser-based Anti-Money Laundering system built using TypeScript, JavaScript, HTML, and CSS. It analyzes transactions, calculates risk scores, detects suspicious patterns, generates alerts, and provides dashboards with audit logs, all without any backend or frameworks.
Anti-Money Laundering (AML) System Project Introduction This project delivers a comprehensive, production-ready Anti-Money Laundering system built on modern microservices architecture. The system provides real-time transaction monitoring, AI-powered risk assessment, and automated regulatory reporting capabilities that meet enterprise-grade compliance requirements. System Architecture Microservices Overview The system consists of six specialized microservices, each designed for specific AML functions: Service Port Primary Function Key Capabilities Ingestion API 8001 Data Processing Batch upload, validation, event publishing Feature Engine 8002 Risk Analysis 32+ risk indicators, velocity analysis, structuring detection Risk Scorer 8003 ML Assessment Ensemble models, SHAP explanations, business rules Graph Analysis 8004 Network Analysis Community detection, pattern recognition, flow analysis Alert Manager 8005 Case Management Alert lifecycle

🎯 Project Objective
The objective of this project is to develop a complete Anti-Money Laundering (AML) Detection System that simulates how real banking compliance software works. The system is designed to analyze financial transactions, calculate risk scores using weighted logic, detect suspicious activities, and automatically generate alerts when risk thresholds are exceeded.
It also allows compliance analysts to review alerts, make decisions, add remarks, and maintain proper audit records. The platform includes dashboards and explainable risk breakdowns so users can clearly understand why a transaction was flagged.
Overall, the system mimics the core workflow of real-world AML monitoring tools used in financial institutions.
🧠 AML Detection Workflow
1. Transaction Input
Users can add transactions through an HTML form or upload data using a CSV file. Each transaction contains fields such as transaction ID, sender, receiver, amount, currency, country, transaction time, and type.
2. Data Validation
The system performs required field checks, verifies numeric values, prevents duplicate entries, and normalizes currency formats before processing.
3. Feature Engineering
After validation, the system calculates transaction frequency per user, amount deviation from average behavior, country-based risk scores, velocity checks, and structuring patterns involving multiple small transactions.
4. Risk Scoring Engine
Each transaction is assigned a score between 0 and 100 based on amount risk, frequency risk, country risk, and behavioral anomalies.
Risk levels are categorized as Low, Medium, High, or Critical.
Every alert includes a detailed score breakdown for transparency.
5. Rule-Based Checks
Additional AML rules detect large transactions, high-risk countries, rapid transaction bursts, dormant account activity, and unusual timing patterns.
6. Alert Generation
If a transaction exceeds the defined threshold, an alert is automatically created and stored locally. Alerts include the risk score, triggered rules, and a clear explanation.
7. Analyst Review
Compliance officers can approve or reject alerts, update their status, and add remarks.
8. Audit Logging
All actions—such as transaction creation, alert generation, login activity, and analyst decisions—are timestamped and stored for review.

🎨 User Interface
The system features a professional banking-style interface with a gradient blue theme and a clean layout. It includes:
Dashboard with summary cards
Risk distribution charts (bar and pie using Canvas)
Structured sidebar navigation
Separate pages for transactions, alerts, SAR reports, and audit logs

🔐 Security & Access Control
Role-based access is implemented with three roles:
Analyst – full operational access
Auditor – read-only access
Admin – complete system control
Authentication is simulated using session storage.
