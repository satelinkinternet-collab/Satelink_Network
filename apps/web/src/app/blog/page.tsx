export default function BlogPage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog - Satelink Network</title>
  <meta name="description" content="Satelink Network blog. Articles about DePIN, decentralized infrastructure, RPC, and on-chain settlement.">
  <link rel="canonical" href="https://satelink.network/blog">
  <meta property="og:title" content="Satelink Blog">
  <meta property="og:description" content="Insights on DePIN, decentralized infrastructure, and the machine economy">
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
    .hero { padding: 80px 24px 60px; text-align: center; border-bottom: 1px solid var(--border); background: var(--bg-subtle); }
    .hero h1 { font-size: 48px; font-weight: 800; margin-bottom: 16px; background: linear-gradient(135deg, var(--text-primary), var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hero p { font-size: 18px; color: var(--text-secondary); }
    .section { padding: 60px 24px 100px; max-width: 900px; margin: 0 auto; }
    .articles { display: flex; flex-direction: column; gap: 32px; }
    .article-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 32px; transition: all 0.3s; }
    .article-card:hover { border-color: var(--accent); transform: translateY(-4px); }
    .article-meta { display: flex; gap: 16px; font-size: 13px; color: var(--text-muted); margin-bottom: 12px; }
    .article-tag { background: rgba(92, 184, 154, 0.1); color: var(--accent); padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .article-title { font-size: 24px; font-weight: 700; margin-bottom: 12px; line-height: 1.3; }
    .article-excerpt { font-size: 15px; color: var(--text-secondary); line-height: 1.7; margin-bottom: 16px; }
    .article-read { font-size: 14px; font-weight: 600; color: var(--accent); display: inline-flex; align-items: center; gap: 6px; }
    .newsletter { background: linear-gradient(135deg, rgba(92, 184, 154, 0.1), rgba(64, 138, 113, 0.05)); border: 1px solid rgba(92, 184, 154, 0.2); border-radius: 16px; padding: 40px; text-align: center; margin-top: 48px; }
    .newsletter h3 { font-size: 24px; font-weight: 700; margin-bottom: 12px; }
    .newsletter p { color: var(--text-secondary); margin-bottom: 24px; }
    .newsletter-form { display: flex; gap: 12px; max-width: 400px; margin: 0 auto; }
    .newsletter-form input { flex: 1; padding: 14px 16px; background: var(--bg-base); border: 1px solid var(--border); border-radius: 10px; color: var(--text-primary); font-size: 14px; }
    .newsletter-form button { padding: 14px 24px; background: linear-gradient(135deg, var(--accent), var(--primary)); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
    @media (max-width: 480px) { .newsletter-form { flex-direction: column; } }
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
        <a href="https://docs.satelink.network">Docs</a>
      </div>
    </div>
  </header>

  <section class="hero">
    <h1>Satelink Blog</h1>
    <p>Insights on DePIN, decentralized infrastructure, and the machine economy</p>
  </section>

  <section class="section">
    <div class="articles">
      <article class="article-card">
        <div class="article-meta">
          <span class="article-tag">DePIN</span>
          <span>May 1, 2026</span>
          <span>8 min read</span>
        </div>
        <h2 class="article-title">How DePIN Networks Monetize Idle Hardware</h2>
        <p class="article-excerpt">
          Decentralized Physical Infrastructure Networks (DePIN) are revolutionizing how we think about infrastructure ownership and monetization. Unlike traditional cloud providers where a single company owns and operates all hardware, DePIN networks enable anyone with spare compute capacity to participate in the infrastructure economy.
        </p>
        <span class="article-read">Read more →</span>
      </article>

      <article class="article-card">
        <div class="article-meta">
          <span class="article-tag">Settlement</span>
          <span>April 15, 2026</span>
          <span>6 min read</span>
        </div>
        <h2 class="article-title">On-Chain Settlement: Why USDT on Polygon Matters</h2>
        <p class="article-excerpt">
          Traditional infrastructure platforms use centralized payment processors with settlement times measured in days or weeks. Satelink settles directly on Polygon with USDT, enabling instant, verifiable payments that anyone can audit.
        </p>
        <span class="article-read">Read more →</span>
      </article>

      <article class="article-card">
        <div class="article-meta">
          <span class="article-tag">Infrastructure</span>
          <span>April 1, 2026</span>
          <span>7 min read</span>
        </div>
        <h2 class="article-title">RPC Infrastructure: The Backbone of Web3</h2>
        <p class="article-excerpt">
          Every dApp needs reliable RPC access. When you connect your wallet, sign a transaction, or read blockchain state, you're making RPC calls. Yet most developers rely on a handful of centralized providers, creating concentration risk for the entire ecosystem.
        </p>
        <span class="article-read">Read more →</span>
      </article>
    </div>

    <div class="newsletter">
      <h3>Stay Updated</h3>
      <p>Get new articles and product updates delivered to your inbox.</p>
      <form class="newsletter-form">
        <input type="email" placeholder="Enter your email" required>
        <button type="submit">Subscribe</button>
      </form>
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
