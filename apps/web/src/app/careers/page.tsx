export default function CareersPage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Careers - Satelink Network</title>
  <meta name="description" content="Join Satelink Network. Help build the future of decentralized infrastructure.">
  <link rel="canonical" href="https://satelink.network/careers">
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
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: var(--font-sans); background: var(--bg-base); color: var(--text-primary); line-height: 1.7; }
    .header { position: sticky; top: 0; background: rgba(11, 13, 15, 0.9); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); z-index: 100; padding: 16px 24px; }
    .header-inner { max-width: 900px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
    .logo { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 18px; text-decoration: none; color: var(--text-primary); }
    .logo-icon { width: 32px; height: 32px; background: linear-gradient(135deg, var(--accent), var(--primary)); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; }
    .header-links a { color: var(--text-secondary); text-decoration: none; font-size: 14px; margin-left: 24px; }
    .header-links a:hover { color: var(--text-primary); }
    .hero { padding: 100px 24px 80px; text-align: center; border-bottom: 1px solid var(--border); background: var(--bg-subtle); }
    .hero h1 { font-size: 56px; font-weight: 800; margin-bottom: 24px; background: linear-gradient(135deg, var(--text-primary), var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hero p { font-size: 20px; color: var(--text-secondary); max-width: 600px; margin: 0 auto; }
    .section { padding: 80px 24px; max-width: 900px; margin: 0 auto; }
    h2 { font-size: 32px; font-weight: 800; margin-bottom: 24px; text-align: center; }
    .benefits-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-bottom: 64px; }
    @media (max-width: 640px) { .benefits-grid { grid-template-columns: 1fr; } }
    .benefit-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 24px; }
    .benefit-icon { font-size: 32px; margin-bottom: 12px; }
    .benefit-title { font-weight: 600; margin-bottom: 8px; }
    .benefit-desc { font-size: 14px; color: var(--text-secondary); }
    .jobs-list { margin-top: 48px; }
    .job-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 32px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; }
    .job-info { flex: 1; min-width: 250px; }
    .job-title { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
    .job-meta { display: flex; gap: 16px; font-size: 14px; color: var(--text-muted); }
    .job-tag { background: rgba(92, 184, 154, 0.1); color: var(--accent); padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    .job-desc { margin-top: 12px; font-size: 14px; color: var(--text-secondary); }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: linear-gradient(135deg, var(--accent), var(--primary)); color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; text-decoration: none; }
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
        <a href="/about">About</a>
        <a href="/blog">Blog</a>
      </div>
    </div>
  </header>

  <section class="hero">
    <h1>Join Satelink</h1>
    <p>We're building the future of decentralized infrastructure. Join us.</p>
  </section>

  <section class="section">
    <h2>Why Satelink?</h2>
    <div class="benefits-grid">
      <div class="benefit-card">
        <div class="benefit-icon">🌍</div>
        <h3 class="benefit-title">Remote First</h3>
        <p class="benefit-desc">Work from anywhere. We're a distributed team building distributed infrastructure.</p>
      </div>
      <div class="benefit-card">
        <div class="benefit-icon">🚀</div>
        <h3 class="benefit-title">Meaningful Work</h3>
        <p class="benefit-desc">Your code runs in production. Real users. Real revenue. Real impact.</p>
      </div>
      <div class="benefit-card">
        <div class="benefit-icon">🌱</div>
        <h3 class="benefit-title">Early Stage</h3>
        <p class="benefit-desc">Shape the product and culture. Your decisions matter.</p>
      </div>
      <div class="benefit-card">
        <div class="benefit-icon">📚</div>
        <h3 class="benefit-title">Learn & Grow</h3>
        <p class="benefit-desc">Web3, distributed systems, smart contracts. Expand your skills.</p>
      </div>
    </div>

    <h2>Open Positions</h2>

    <div class="jobs-list">
      <div class="job-card">
        <div class="job-info">
          <h3 class="job-title">Backend Engineer</h3>
          <div class="job-meta">
            <span>Node.js / TypeScript</span>
            <span>Remote</span>
            <span class="job-tag">Full-time</span>
          </div>
          <p class="job-desc">Build and scale our RPC gateway, billing system, and node orchestration layer.</p>
        </div>
        <a href="mailto:careers@satelink.network?subject=Backend Engineer Application" class="btn">Apply</a>
      </div>

      <div class="job-card">
        <div class="job-info">
          <h3 class="job-title">Smart Contract Developer</h3>
          <div class="job-meta">
            <span>Solidity / Foundry</span>
            <span>Remote</span>
            <span class="job-tag">Full-time</span>
          </div>
          <p class="job-desc">Design and implement settlement contracts, staking mechanisms, and protocol upgrades.</p>
        </div>
        <a href="mailto:careers@satelink.network?subject=Smart Contract Developer Application" class="btn">Apply</a>
      </div>

      <div class="job-card">
        <div class="job-info">
          <h3 class="job-title">DevOps Engineer</h3>
          <div class="job-meta">
            <span>Kubernetes / Docker</span>
            <span>Remote</span>
            <span class="job-tag">Full-time</span>
          </div>
          <p class="job-desc">Build infrastructure for a global node network. CI/CD, monitoring, incident response.</p>
        </div>
        <a href="mailto:careers@satelink.network?subject=DevOps Engineer Application" class="btn">Apply</a>
      </div>

      <div class="job-card">
        <div class="job-info">
          <h3 class="job-title">Community Manager</h3>
          <div class="job-meta">
            <span>Discord / Twitter</span>
            <span>Remote</span>
            <span class="job-tag">Part-time</span>
          </div>
          <p class="job-desc">Grow our node operator community. Support, engagement, content creation.</p>
        </div>
        <a href="mailto:careers@satelink.network?subject=Community Manager Application" class="btn">Apply</a>
      </div>
    </div>

    <div style="text-align: center; margin-top: 48px; color: var(--text-secondary);">
      <p>Don't see a perfect fit? Send us your resume anyway.</p>
      <p style="margin-top: 8px;"><a href="mailto:careers@satelink.network" style="color: var(--accent);">careers@satelink.network</a></p>
    </div>
  </section>

  <footer class="footer">
    <div class="footer-links">
      <a href="/">Home</a>
      <a href="/about">About</a>
      <a href="/privacy">Privacy</a>
      <a href="/terms">Terms</a>
    </div>
    <p class="footer-copy">© 2026 Satelink Network. All rights reserved.</p>
  </footer>
</body>
</html>
    `}} />
  )
}
