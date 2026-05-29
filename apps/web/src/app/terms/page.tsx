export default function TermsPage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terms of Service - Satelink Network</title>
  <meta name="description" content="Satelink Network terms of service. Rules and guidelines for using our decentralized infrastructure platform.">
  <link rel="canonical" href="https://satelink.network/terms">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%23408A71' rx='18' width='100' height='100'/><text x='50' y='66' font-size='48' fill='white' text-anchor='middle' font-family='system-ui' font-weight='700'>S</text></svg>">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #408A71;
      --accent: #5CB89A;
      --bg-base: #0B0D0F;
      --bg-subtle: #111316;
      --text-primary: #ECEDEE;
      --text-secondary: #9BA1A6;
      --text-muted: #6C7075;
      --border: rgba(255, 255, 255, 0.08);
      --font-sans: 'Inter', -apple-system, sans-serif;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: var(--font-sans); background: var(--bg-base); color: var(--text-primary); line-height: 1.8; }
    .header { position: sticky; top: 0; background: rgba(11, 13, 15, 0.95); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); z-index: 100; padding: 16px 24px; }
    .header-inner { max-width: 800px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
    .logo { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 18px; text-decoration: none; color: var(--text-primary); }
    .logo-icon { width: 32px; height: 32px; background: linear-gradient(135deg, var(--accent), var(--primary)); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; }
    .header-links a { color: var(--text-secondary); text-decoration: none; font-size: 14px; margin-left: 24px; }
    .header-links a:hover { color: var(--text-primary); }
    .content { max-width: 800px; margin: 0 auto; padding: 60px 24px 100px; }
    h1 { font-size: 40px; font-weight: 700; margin-bottom: 12px; }
    .subtitle { color: var(--text-muted); font-size: 14px; margin-bottom: 48px; }
    h2 { font-size: 22px; font-weight: 600; margin-top: 48px; margin-bottom: 16px; color: var(--accent); }
    p { color: var(--text-secondary); margin-bottom: 16px; }
    ul { color: var(--text-secondary); margin-left: 24px; margin-bottom: 16px; }
    li { margin-bottom: 8px; }
    a { color: var(--accent); }
    strong { color: var(--text-primary); }
    .footer { background: var(--bg-subtle); border-top: 1px solid var(--border); padding: 40px 24px; text-align: center; }
    .footer-links { display: flex; justify-content: center; gap: 24px; margin-bottom: 16px; }
    .footer-links a { color: var(--text-secondary); text-decoration: none; font-size: 14px; }
    .footer-copy { font-size: 13px; color: var(--text-muted); }
  </style>
</head>
<body>
  <header class="header">
    <div class="header-inner">
      <a href="/" class="logo"><div class="logo-icon">S</div><span>Satelink</span></a>
      <div class="header-links">
        <a href="/">Home</a>
        <a href="/privacy">Privacy</a>
      </div>
    </div>
  </header>

  <main class="content">
    <h1>Terms of Service</h1>
    <p class="subtitle">Last updated: May 1, 2026</p>

    <p>Welcome to Satelink Network. By accessing or using our Service, you agree to be bound by these Terms of Service ("Terms"). Please read them carefully.</p>

    <h2>1. Acceptance of Terms</h2>
    <p>By using Satelink Network's services, including our RPC gateway, AI inference, webhook delivery, and settlement platform, you agree to these Terms. If you do not agree, you may not use our services.</p>

    <h2>2. Description of Service</h2>
    <p>Satelink Network provides decentralized infrastructure services including:</p>
    <ul>
      <li>Multi-chain RPC endpoints (Polygon, Ethereum, Arbitrum, Base)</li>
      <li>AI inference routing</li>
      <li>Webhook delivery</li>
      <li>On-chain settlement via USDT on Polygon</li>
    </ul>

    <h2>3. Eligibility</h2>
    <p>You must be at least 18 years old to use our services. By using the Service, you represent that you are of legal age and have the legal capacity to enter into these Terms.</p>

    <h2>4. User Responsibilities</h2>
    <p>You agree to:</p>
    <ul>
      <li>Use the Service in compliance with all applicable laws</li>
      <li>Not attempt to disrupt or overload the network</li>
      <li>Not use the Service for any illegal activities</li>
      <li>Maintain the security of your API keys and wallet credentials</li>
      <li>Pay for services used according to our published pricing</li>
    </ul>

    <h2>5. Prohibited Uses</h2>
    <p>You may not use Satelink Network for:</p>
    <ul>
      <li>Illegal activities or transactions</li>
      <li>Distributing malware or harmful code</li>
      <li>Unauthorized access to systems or networks</li>
      <li>Harassment, spam, or abuse</li>
      <li>Activities that harm the network or other users</li>
    </ul>

    <h2>6. Payments and Settlement</h2>
    <p>All payments are processed on the Polygon blockchain using USDT. By using paid services, you agree to:</p>
    <ul>
      <li>Pay for all API calls made using your credentials</li>
      <li>Maintain sufficient USDT balance for your usage</li>
      <li>Accept that on-chain transactions are final and irreversible</li>
    </ul>

    <h2>7. Node Operators</h2>
    <p>If you operate a node on the Satelink network, you agree to:</p>
    <ul>
      <li>Maintain uptime and performance standards</li>
      <li>Accept the 50/30/20 revenue split (operators/platform/pool)</li>
      <li>Comply with all network protocols and standards</li>
    </ul>

    <h2>8. Disclaimer of Warranties</h2>
    <p>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. We do not guarantee 100% uptime, error-free operation, or specific performance levels. Use of the Service is at your own risk.</p>

    <h2>9. Limitation of Liability</h2>
    <p>Satelink Network shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service, including lost profits, data loss, or service interruptions.</p>

    <h2>10. Indemnification</h2>
    <p>You agree to indemnify and hold harmless Satelink Network from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.</p>

    <h2>11. Changes to Terms</h2>
    <p>We may modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new Terms. We will provide notice of material changes via our website or email.</p>

    <h2>12. Governing Law</h2>
    <p>These Terms shall be governed by the laws of the jurisdiction in which Satelink Network operates, without regard to conflict of law principles.</p>

    <h2>13. Contact</h2>
    <p>For questions about these Terms, contact us at:</p>
    <p><a href="mailto:legal@satelink.network">legal@satelink.network</a></p>
  </main>

  <footer class="footer">
    <div class="footer-links">
      <a href="/">Home</a>
      <a href="/privacy">Privacy</a>
      <a href="/about">About</a>
    </div>
    <p class="footer-copy">© 2026 Satelink Network. All rights reserved.</p>
  </footer>
</body>
</html>
    `}} />
  )
}
