"""Synthetic regulatory filings and earnings transcripts for RAG demo."""

SYNTHETIC_DOCS = [
    {
        "id": "RELIANCE_Q1FY26_EARNINGS",
        "ticker": "RELIANCE",
        "type": "earnings_transcript",
        "date": "2025-07-20",
        "title": "Reliance Industries Q1 FY26 Earnings Call Transcript",
        "content": """
Reliance Industries Limited reported consolidated revenue of ₹2.45 lakh crore for Q1 FY26, up 12% YoY. 
EBITDA stood at ₹45,200 crore, margin expansion of 80 bps driven by Jio platforms and Retail. 
Oil-to-chemicals segment faced margin pressure due to soft refining cracks. 
Management guided for Capex of ₹1.2 lakh crore in FY26 focused on new energy and 5G expansion. 
Net debt reduced by ₹8,000 crore sequentially. 
CEO: "We remain confident of double-digit growth in digital and retail. Green energy projects on track for first production in late 2026."
Risks highlighted: crude price volatility, regulatory changes in telecom spectrum pricing.
Analyst Q: On Jio subscriber growth - ARPU improved 4% QoQ.
        """
    },
    {
        "id": "RELIANCE_SEBI_FILING_2025",
        "ticker": "RELIANCE",
        "type": "sebi_filing",
        "date": "2025-08-15",
        "title": "SEBI Disclosure - Related Party Transactions and Corporate Governance Update",
        "content": """
Pursuant to SEBI (LODR) Regulations, Reliance Industries discloses related party transactions with Jio Platforms and Reliance Retail for the quarter ended June 2025 totaling ₹18,500 crore, all at arm's length. 
Board approved expansion of new energy vertical. No material litigation updates. 
Promoter holding stable at 50.01%. Compliance with corporate governance norms confirmed. 
Independent directors affirmed no conflict.
        """
    },
    {
        "id": "TCS_Q1FY26_EARNINGS",
        "ticker": "TCS",
        "type": "earnings_transcript",
        "date": "2025-07-11",
        "title": "Tata Consultancy Services Q1 FY26 Earnings Call",
        "content": """
TCS reported revenue of $7.8 billion, up 5.2% YoY in constant currency. 
Operating margin at 25.1%, sequential improvement. 
Deal TCV $9.4 billion, strong in BFSI and Manufacturing. 
Attrition at 12.1%, lowest in recent years. 
Management: "AI and GenAI deals contributing 8% of TCV. We expect gradual recovery in discretionary spends."
Guidance: Mid-single digit revenue growth for FY26. 
Risks: Currency volatility (INR), client concentration in North America (50%+), geopolitical uncertainties.
CFO noted strong free cash flow conversion of 95%.
        """
    },
    {
        "id": "TCS_SEBI_ANNUAL",
        "ticker": "TCS",
        "type": "sebi_filing",
        "date": "2025-05-20",
        "title": "TCS Annual Report Excerpt - Risk Factors and Strategy",
        "content": """
Key risks: Cybersecurity threats, talent retention in AI skills, competition from pure-play AI firms, macroeconomic slowdown in US/Europe. 
Strategy: Invest ₹5,000 crore in AI research and cloud capabilities. Focus on industry verticals with high GenAI adoption. 
Dividend policy maintained. ESG targets: Net zero by 2030 for Scope 1&2.
        """
    },
    {
        "id": "HDFCBANK_Q1_EARNINGS",
        "ticker": "HDFCBANK",
        "type": "earnings_transcript",
        "date": "2025-07-19",
        "title": "HDFC Bank Q1 FY26 Results Conference Call",
        "content": """
HDFC Bank reported net interest income of ₹30,200 crore, up 8% YoY. 
Net profit ₹16,800 crore. NIM stable at 3.5%. 
Loan growth 12% YoY, deposits 14%. CASA ratio 38%. 
Asset quality: GNPA 1.3%, stable. Credit cost 0.4%. 
Management optimistic on retail and SME recovery. 
Integration of HDFC Ltd synergies tracking ahead of plan, cost savings ₹2,000 crore annualized.
Risks: Interest rate cycle, unsecured retail portfolio stress in micro segments, regulatory capital requirements.
        """
    },
    {
        "id": "INFY_EARNINGS_Q1",
        "ticker": "INFY",
        "type": "earnings_transcript",
        "date": "2025-07-18",
        "title": "Infosys Q1 FY26 Earnings Transcript",
        "content": """
Infosys revenue $4.9 billion, 3.8% YoY CC growth. Operating margin 21.2%. 
Large deal TCV $3.2 billion. Guidance revised to 3-5% for FY26. 
Strong performance in Financial Services and Retail. 
AI platforms (Topaz) contributing meaningfully. 
Risks: Deal ramp-up delays, pricing pressure, high competition in digital transformation.
        """
    },
    {
        "id": "MARKET_MACRO_SEBI",
        "ticker": "MACRO",
        "type": "regulatory",
        "date": "2025-08-01",
        "title": "SEBI Market Surveillance Update - F&O Participation and Retail Risk",
        "content": """
SEBI notes continued high retail participation in equity F&O. 89% of retail F&O traders incurred losses in FY25 as per latest analysis. 
Measures under consideration: higher margin requirements for weekly options, position limits review. 
Advice to investors: Understand leverage risks, avoid speculative trading without risk capital. 
FII flows positive in July but volatile. Domestic mutual fund SIP flows at record ₹25,000 crore monthly.
        """
    },
    {
        "id": "NIFTY_SECTOR_NOTE",
        "ticker": "MACRO",
        "type": "research_note",
        "date": "2025-08-25",
        "title": "Sector Outlook - IT and Banking",
        "content": """
IT sector: Recovery in discretionary spends expected H2 FY26. Valuations reasonable after correction. Focus on companies with strong AI pipeline. 
Banking: Credit growth moderating but asset quality benign. Prefer private banks with strong liability franchise. 
Overall market: Nifty near all-time highs, elevated valuations in midcaps. Prefer quality largecaps for risk-averse investors.
        """
    },
]

def get_docs_for_ticker(ticker: str):
    t = ticker.upper().replace(".NS", "").replace(".BO", "")
    return [d for d in SYNTHETIC_DOCS if d["ticker"] in (t, "MACRO")]
