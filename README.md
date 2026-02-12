# AML Anti Money Laundering 
AML Detection AI Agent is a browser-based Anti-Money Laundering system built using TypeScript, JavaScript, HTML, and CSS. It analyzes transactions, calculates risk scores, detects suspicious patterns, generates alerts, and provides dashboards with audit logs, all without any backend or frameworks.
Anti-Money Laundering (AML) System Project Introduction This project delivers a comprehensive, production-ready Anti-Money Laundering system built on modern microservices architecture. The system provides real-time transaction monitoring, AI-powered risk assessment, and automated regulatory reporting capabilities that meet enterprise-grade compliance requirements. System Architecture Microservices Overview The system consists of six specialized microservices, each designed for specific AML functions: Service Port Primary Function Key Capabilities Ingestion API 8001 Data Processing Batch upload, validation, event publishing Feature Engine 8002 Risk Analysis 32+ risk indicators, velocity analysis, structuring detection Risk Scorer 8003 ML Assessment Ensemble models, SHAP explanations, business rules Graph Analysis 8004 Network Analysis Community detection, pattern recognition, flow analysis Alert Manager 8005 Case Management Alert lifecycle

🎯 Project Objective
The objective of this project is to develop a complete Anti-Money Laundering (AML) Detection System that simulates how real banking compliance software works. The system is designed to analyze financial transactions, calculate risk scores using weighted logic, detect suspicious activities, and automatically generate alerts when risk thresholds are exceeded.
It also allows compliance analysts to review alerts, make decisions, add remarks, and maintain proper audit records. The platform includes dashboards and explainable risk breakdowns so users can clearly understand why a transaction was flagged.
Overall, the system mimics the core workflow of real-world AML monitoring tools used in financial institutions.


🧠 AML Detection Workflow :

Step 1: Data Ingestion 
The system collects transaction data and account information in either real-time or batch 
mode. 
Step 2: Data Preprocessing 
The data is cleaned and prepared by: -Removing inconsistencies -Handling missing values -Normalizing transaction amounts -Extracting relevant features 
Step 3: Feature Engineering 
Key behavioral and network-related features are generated, such as: 
-Transaction frequency -Average transaction value -Account activity patterns -Transaction connectivity metrics 
Step 4: Behavioral Analysis 
The agent compares current transaction patterns with historical behavior to detect unusual 
deviations. 
Step 5: Network Graph Analysis 
A transaction graph is constructed to identify: -Suspicious clusters -Circular fund movements -High-risk connected accounts 
Step 6: Risk Score Calculation 
The system combines behavioral and network insights to generate a dynamic risk score for 
each transaction or account. 
Step 7: Explainable Report Generation 
If a transaction or account crosses a risk threshold, the system generates a structured report 
explaining: 
●  Why it was flagged 
●  Risk score breakdown 
●  Detected suspicious patterns 


🎨 User Interface
The system features a professional banking-style interface with a gradient blue theme and a clean layout. It includes:
Dashboard with summary cards
Risk distribution charts (bar and pie using Canvas)
Structured sidebar navigation
Separate pages for transactions, alerts, SAR reports, and audit logs


Key Use Cases of AML Systems
1) Transaction Monitoring
Continuously monitor customer transactions in real-time to detect suspicious patterns such as unusually large transfers or rapid fund movement.
2) High-Risk Country Transactions
Flag transactions involving countries with high corruption, sanctions, or terrorism risk.
3) Sanctions Screening
Check customers and transactions against global sanctions lists (OFAC, UN, EU, etc.).
4) Suspicious Activity Report (SAR) Generation
Automatically generate compliance reports for regulatory authorities when suspicious behavior is detected.
5) Fraud & Behavioral Anomaly Detection
Detect unusual customer behavior, such as:
Sudden high-value transfers
Dormant account activation
Unusual transaction times
6) Money Laundering Stage Detection
AML systems detect the 3 stages:
Placement (introducing illegal money)
Layering (moving funds through complex transactions)
Integration (reintroducing funds as legitimate)
7) Risk-Based Customer Profiling
Assign risk scores to customers based on transaction history, geography, and behavior.
8) Audit & Regulatory Compliance
Maintain detailed logs for investigation and regulatory review.

🔐 Security & Access Control
Role-based access is implemented with three roles:
Analyst – full operational access
Auditor – read-only access
Admin – complete system control
Authentication is simulated using session storage.


Project Structure :
cyber-aml-system/
│
├── index.html                # Main application entry point
│
├── css/                      # Styling Layer
│   ├── style.css             # Core UI styles (layout, theme, components)
│   └── charts.css            # Chart-specific styling
│
├── js/                       # Application Logic Layer
│   ├── app.js                # Main controller & UI orchestration
│   ├── aml_engine.js         # Risk scoring & AML rule engine
│   ├── auth.js               # Authentication & role-based access
│   └── store.js              # LocalStorage data management
│
└── README.md                 # Project documentation




