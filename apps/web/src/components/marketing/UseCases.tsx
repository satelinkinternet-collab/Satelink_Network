"use client";

export function UseCases() {
  const useCases = [
    {
      title: "DeFi Protocols",
      description:
        "MEV bots, arbitrage engines, and DEX aggregators auto-route to the cheapest, fastest endpoint. No human needed.",
      icon: <BotIcon />,
    },
    {
      title: "AI Agents",
      description:
        "LangChain, AutoGPT, and custom agent pipelines call Web3 as a tool. Per-call billing. OpenAI-compatible interface coming.",
      icon: <BrainIcon />,
    },
    {
      title: "Infrastructure Bots",
      description:
        "Keepers, liquidators, oracle networks, and bridge validators. WebSocket subscriptions for real-time mempool access.",
      icon: <ServerIcon />,
    },
  ];

  return (
    <section className="section" id="use-cases">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="heading-lg mb-4">Built for Machines</h2>
          <p className="text-body-lg" style={{ maxWidth: "600px", margin: "0 auto" }}>
            Not humans. Automated systems that need reliable, fast blockchain access.
          </p>
        </div>

        <div className="feature-grid">
          {useCases.map((useCase, i) => (
            <div key={i} className="card feature-card">
              <div className="use-case-icon">{useCase.icon}</div>
              <h3 className="feature-title">{useCase.title}</h3>
              <p className="feature-description">{useCase.description}</p>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .use-case-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-lg);
          background: var(--signal-dim);
          border: 1px solid var(--signal-border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--signal);
          margin-bottom: var(--space-4);
        }
      `}</style>
    </section>
  );
}

function BotIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function ServerIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
    </svg>
  );
}
