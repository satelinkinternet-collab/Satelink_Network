export default function PrivacyPage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - Satelink Network</title>
  <meta name="description" content="Satelink Network privacy policy. How we collect, use, and protect your data.">
  <link rel="canonical" href="https://satelink.network/privacy">
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
        <a href="/terms">Terms</a>
      </div>
    </div>
  </header>

  <main class="content">
    <h1>Privacy Policy</h1>
    <p class="subtitle">Last updated: May 1, 2026</p>

    <p>Satelink Network ("we", "us", or "our") operates the satelink.network website and related services. This page informs you of our policies regarding the collection, use, and disclosure of personal information when you use our Service.</p>

    <h2>Information We Collect</h2>
    <p>We collect several types of information for various purposes to provide and improve our Service:</p>
    <ul>
      <li><strong>Wallet Addresses:</strong> When you connect your cryptocurrency wallet, we store your public wallet address to facilitate transactions and settlements.</li>
      <li><strong>Usage Data:</strong> We collect information on how the Service is accessed and used, including API call counts, timestamps, and request metadata.</li>
      <li><strong>Device Information:</strong> We may collect information about the device you use to access our Service, including IP address (anonymized), browser type, and operating system.</li>
    </ul>

    <h2>How We Use Your Information</h2>
    <p>We use the collected information for various purposes:</p>
    <ul>
      <li>To provide and maintain our Service</li>
      <li>To process settlements and payments on-chain</li>
      <li>To monitor usage and billing</li>
      <li>To detect and prevent fraud or abuse</li>
      <li>To improve our Service</li>
    </ul>

    <h2>On-Chain Data</h2>
    <p>Satelink settles payments on the Polygon blockchain. Transaction data on public blockchains is permanent and publicly visible. This includes wallet addresses, transaction amounts, and timestamps. We cannot delete or modify on-chain data.</p>

    <h2>Data Retention</h2>
    <p>We retain usage data for up to 90 days for billing and analytics purposes. Wallet addresses and settlement records are retained indefinitely as they are necessary for on-chain verification and dispute resolution.</p>

    <h2>Data Security</h2>
    <p>We implement industry-standard security measures to protect your information. However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security but we take all reasonable precautions.</p>

    <h2>Third-Party Services</h2>
    <p>We may use third-party services that collect information:</p>
    <ul>
      <li><strong>Polygon Network:</strong> For on-chain settlement</li>
      <li><strong>Vercel:</strong> For hosting and analytics</li>
      <li><strong>RPC Providers:</strong> For blockchain connectivity</li>
    </ul>

    <h2>Your Rights</h2>
    <p>You have the right to:</p>
    <ul>
      <li>Access the personal data we hold about you</li>
      <li>Request correction of inaccurate data</li>
      <li>Request deletion of your data (where technically possible)</li>
      <li>Object to processing of your data</li>
    </ul>

    <h2>Contact Us</h2>
    <p>If you have questions about this Privacy Policy, please contact us at:</p>
    <p><a href="mailto:privacy@satelink.network">privacy@satelink.network</a></p>

    <h2>Changes to This Policy</h2>
    <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.</p>
  </main>

  <footer class="footer">
    <div class="footer-links">
      <a href="/">Home</a>
      <a href="/terms">Terms</a>
      <a href="/about">About</a>
    </div>
    <p class="footer-copy">© 2026 Satelink Network. All rights reserved.</p>
  </footer>
</body>
</html>
    `}} />
  )
}
