export default function AboutPage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>About - Satelink Network</title>
  <meta name="description" content="Learn about Satelink Network's mission to democratize infrastructure access through decentralized technology.">
  <link rel="canonical" href="https://satelink.network/about">
  <meta property="og:title" content="About Satelink Network">
  <meta property="og:description" content="Decentralized infrastructure for the machine economy">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%23408A71' rx='18' width='100' height='100'/><text x='50' y='66' font-size='48' fill='white' text-anchor='middle' font-family='system-ui' font-weight='700'>S</text></svg>">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #408A71;
      --accent: #5CB89A;
      --bg-base: #0B0D0F;
      --bg-subtle: #111316;
      --bg-card: rgba(28, 31, 36, 0.7);
      --text-primary: #ECEDEE;
      --text-secondary: #9BA1A6;
      --text-muted: #6C7075;
      --border: rgba(255, 255, 255, 0.08);
      --font-sans: 'Inter', -apple-system, sans-serif;
    }
    [data-theme="light"] {
      --bg-base: #FFFFFF;
      --bg-subtle: #FAFAFA;
      --bg-card: rgba(255, 255, 255, 0.9);
      --text-primary: #18181B;
      --text-secondary: #52525B;
      --text-muted: #A1A1AA;
      --border: rgba(0, 0, 0, 0.08);
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: var(--font-sans); background: var(--bg-base); color: var(--text-primary); line-height: 1.7; }
    .header { position: sticky; top: 0; background: rgba(11, 13, 15, 0.9); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); z-index: 100; padding: 16px 24px; }
    [data-theme="light"] .header { background: rgba(255, 255, 255, 0.9); }
    .header-inner { max-width: 1000px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
    .logo { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 18px; text-decoration: none; color: var(--text-primary); }
    .logo-icon { width: 32px; height: 32px; background: linear-gradient(135deg, var(--accent), var(--primary)); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; }
    .header-links a { color: var(--text-secondary); text-decoration: none; font-size: 14px; margin-left: 24px; }
    .header-links a:hover { color: var(--text-primary); }
    .hero { padding: 100px 24px 80px; text-align: center; border-bottom: 1px solid var(--border); background: var(--bg-subtle); }
    .hero h1 { font-size: 56px; font-weight: 800; margin-bottom: 24px; background: linear-gradient(135deg, var(--text-primary), var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hero p { font-size: 20px; color: var(--text-secondary); max-width: 700px; margin: 0 auto; }
    .section { padding: 80px 24px; max-width: 1000px; margin: 0 auto; }
    .section-alt { background: var(--bg-subtle); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
    h2 { font-size: 36px; font-weight: 800; margin-bottom: 24px; text-align: center; }
    .lead { font-size: 18px; color: var(--text-secondary); text-align: center; max-width: 700px; margin: 0 auto 48px; }
    .values-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
    @media (max-width: 768px) { .values-grid { grid-template-columns: 1fr; } }
    .value-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 32px; text-align: center; }
    .value-icon { font-size: 48px; margin-bottom: 20px; }
    .value-title { font-size: 20px; font-weight: 700; margin-bottom: 12px; }
    .value-desc { font-size: 15px; color: var(--text-secondary); }
    .timeline { max-width: 600px; margin: 0 auto; }
    .timeline-item { display: flex; gap: 24px; margin-bottom: 32px; }
    .timeline-year { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700; color: var(--accent); min-width: 60px; }
    .timeline-content { flex: 1; }
    .timeline-title { font-weight: 600; margin-bottom: 4px; }
    .timeline-desc { font-size: 14px; color: var(--text-secondary); }
    .team-note { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 40px; text-align: center; max-width: 600px; margin: 0 auto; }
    .team-note p { font-size: 16px; color: var(--text-secondary); margin-bottom: 16px; }
    .team-note strong { color: var(--text-primary); }
    .cta { text-align: center; padding: 80px 24px; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 16px 32px; background: linear-gradient(135deg, var(--accent), var(--primary)); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; text-decoration: none; transition: all 0.2s; }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(92, 184, 154, 0.3); }
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
        <a href="/careers">Careers</a>
        <a href="/blog">Blog</a>
      </div>
    </div>
  </header>

  <section class="hero">
    <h1>About Satelink</h1>
    <p>Building decentralized infrastructure for the machine economy. Real workloads. Real revenue. Verifiable on-chain.</p>
  </section>

  <section class="section">
    <h2>Our Mission</h2>
    <p class="lead">Democratize infrastructure access by connecting developers who need compute with hardware owners who have idle capacity.</p>
    <p style="text-align: center; color: var(--text-secondary); max-width: 700px; margin: 0 auto;">
      Traditional cloud providers are centralized, expensive, and opaque. We're building an alternative where anyone can contribute infrastructure and earn, while developers get transparent, pay-per-use access to distributed compute.
    </p>
  </section>

  <section class="section section-alt">
    <h2>Our Values</h2>
    <div class="values-grid">
      <div class="value-card">
        <div class="value-icon">&#128269;</div>
        <h3 class="value-title">Transparency</h3>
        <p class="value-desc">Every settlement on-chain. Open source code. Verifiable metrics. No black boxes.</p>
      </div>
      <div class="value-card">
        <div class="value-icon">&#9889;</div>
        <h3 class="value-title">Reliability</h3>
        <p class="value-desc">Infrastructure that works. 99.8% uptime. Automatic failover. Built for production.</p>
      </div>
      <div class="value-card">
        <div class="value-icon">&#9878;</div>
        <h3 class="value-title">Fairness</h3>
        <p class="value-desc">50% to node operators. Transparent pricing. No hidden fees. Everyone earns fairly.</p>
      </div>
    </div>
  </section>

  <section class="section">
    <h2>Our Story</h2>
    <div class="timeline">
      <div class="timeline-item">
        <div class="timeline-year">2025</div>
        <div class="timeline-content">
          <div class="timeline-title">Project Started</div>
          <div class="timeline-desc">Initial concept: monetize idle hardware through real workloads with blockchain settlement.</div>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-year">Q1 2026</div>
        <div class="timeline-content">
          <div class="timeline-title">Core Protocol Built</div>
          <div class="timeline-desc">RPC gateway, billing system, and ClaimsContract deployed on Polygon.</div>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-year">Q2 2026</div>
        <div class="timeline-content">
          <div class="timeline-title">First Settlement</div>
          <div class="timeline-desc">$1.29 USDT claimed on-chain. Proof that the economic model works.</div>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-year">Now</div>
        <div class="timeline-content">
          <div class="timeline-title">Growing the Network</div>
          <div class="timeline-desc">1.7M+ API calls. $53+ USDT distributed. Opening node operator program.</div>
        </div>
      </div>
    </div>
  </section>

  <section class="section section-alt">
    <h2>The Team</h2>
    <div class="team-note">
      <p><strong>Built by infrastructure engineers who believe in decentralization.</strong></p>
      <p>We're a small, focused team working to prove that decentralized infrastructure can compete with centralized alternatives.</p>
      <p>Interested in joining? Check out our <a href="/careers" style="color: var(--accent);">open positions</a>.</p>
    </div>
  </section>

  <section class="cta">
    <h2>Ready to Build?</h2>
    <p style="color: var(--text-secondary); margin-bottom: 32px;">Get started with Satelink in minutes.</p>
    <a href="https://app.satelink.network/satelink/os/plans" class="btn">
      Get API Key
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </a>
  </section>

  <footer class="footer">
    <div class="footer-links">
      <a href="/">Home</a>
      <a href="/privacy">Privacy</a>
      <a href="/terms">Terms</a>
      <a href="/press">Press</a>
    </div>
    <p class="footer-copy">&copy; 2026 Satelink Network. All rights reserved.</p>
  </footer>
</body>
</html>
    `}} />
  )
}
