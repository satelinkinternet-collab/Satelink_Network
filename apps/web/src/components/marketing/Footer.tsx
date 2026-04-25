"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function Footer() {
  const [isHealthy, setIsHealthy] = useState(true);

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch("https://rpc.satelink.network/rpc/health");
        setIsHealthy(res.ok);
      } catch {
        setIsHealthy(false);
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="py-16 border-t border-[var(--border-subtle)]">
      <div className="container-marketing">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 bg-[var(--brand-primary)] rounded-lg opacity-50" />
                <div className="absolute inset-1 bg-[var(--bg-deep)] rounded-md flex items-center justify-center">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="w-4 h-4"
                    stroke="var(--brand-primary)"
                    strokeWidth="2"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
              </div>
              <span
                className="text-xl font-bold"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                <span className="text-[var(--text-primary)]">Sate</span>
                <span className="text-[var(--brand-primary)]">link</span>
              </span>
            </Link>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Autonomous infrastructure for machine economies.
            </p>
            <div className="flex gap-3">
              <SocialLink href="https://twitter.com/satelinknetwork" label="Twitter">
                <TwitterIcon />
              </SocialLink>
              <SocialLink href="https://github.com/satelinkinternet-collab" label="GitHub">
                <GitHubIcon />
              </SocialLink>
              <SocialLink href="https://discord.gg/satelink" label="Discord">
                <DiscordIcon />
              </SocialLink>
              <SocialLink href="https://t.me/satelinknetwork" label="Telegram">
                <TelegramIcon />
              </SocialLink>
            </div>
          </div>

          {/* Developers */}
          <div>
            <h4 className="font-semibold text-[var(--text-primary)] mb-4">
              Developers
            </h4>
            <ul className="space-y-2">
              <FooterLink href="/developers">Documentation</FooterLink>
              <FooterLink href="/developers#api">API Reference</FooterLink>
              <FooterLink href="/developers#websocket">WebSocket</FooterLink>
              <FooterLink href="https://github.com/satelinkinternet-collab">
                GitHub
              </FooterLink>
            </ul>
          </div>

          {/* Nodes */}
          <div>
            <h4 className="font-semibold text-[var(--text-primary)] mb-4">
              Nodes
            </h4>
            <ul className="space-y-2">
              <FooterLink href="/nodes">Earn USDT</FooterLink>
              <FooterLink href="/nodes#calculator">Calculator</FooterLink>
              <FooterLink href="/nodes#setup">Setup Guide</FooterLink>
              <FooterLink href="/dashboard/node-setup">Register Node</FooterLink>
            </ul>
          </div>

          {/* Network */}
          <div>
            <h4 className="font-semibold text-[var(--text-primary)] mb-4">
              Network
            </h4>
            <ul className="space-y-2">
              <FooterLink href="/network">Live Status</FooterLink>
              <FooterLink href="/pricing">Pricing</FooterLink>
              <FooterLink href="/network#providers">Providers</FooterLink>
              <FooterLink href="/network#metrics">Metrics</FooterLink>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-[var(--text-primary)] mb-4">
              Company
            </h4>
            <ul className="space-y-2">
              <FooterLink href="/about">About</FooterLink>
              <FooterLink href="/brand">Brand</FooterLink>
              <FooterLink href="/legal/terms">Terms</FooterLink>
              <FooterLink href="/legal/privacy">Privacy</FooterLink>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-[var(--border-subtle)] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-[var(--text-muted)]">
            <span>&copy; {new Date().getFullYear()} Satelink Network</span>
            <span className="hidden md:inline">|</span>
            <Link
              href="/legal/privacy"
              className="hover:text-[var(--brand-primary)] transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/legal/terms"
              className="hover:text-[var(--brand-primary)] transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/legal/cookies"
              className="hover:text-[var(--brand-primary)] transition-colors"
            >
              Cookies
            </Link>
          </div>

          <div className="flex items-center gap-6 text-sm text-[var(--text-muted)]">
            <span className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isHealthy
                    ? "bg-[var(--brand-accent)] animate-pulse"
                    : "bg-red-500"
                }`}
              />
              {isHealthy ? "All systems operational" : "Degraded"}
            </span>
            <span>Built on Polygon</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const isExternal = href.startsWith("http");
  if (isExternal) {
    return (
      <li>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--brand-primary)] transition-colors"
        >
          {children}
        </a>
      </li>
    );
  }
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-[var(--text-secondary)] hover:text-[var(--brand-primary)] transition-colors"
      >
        {children}
      </Link>
    </li>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-9 h-9 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all"
    >
      {children}
    </a>
  );
}

function TwitterIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.463 2 11.97c0 4.404 2.865 8.14 6.839 9.458.5.092.682-.216.682-.48 0-.236-.008-.864-.013-1.695-2.782.602-3.369-1.337-3.369-1.337-.454-1.151-1.11-1.458-1.11-1.458-.908-.618.069-.606.069-.606 1.003.07 1.531 1.027 1.531 1.027.892 1.524 2.341 1.084 2.91.828.092-.643.35-1.083.636-1.332-2.22-.251-4.555-1.107-4.555-4.927 0-1.088.39-1.979 1.029-2.675-.103-.252-.446-1.266.098-2.638 0 0 .84-.268 2.75 1.022A9.607 9.607 0 0112 6.82c.85.004 1.705.114 2.504.336 1.909-1.29 2.747-1.022 2.747-1.022.546 1.372.202 2.386.1 2.638.64.696 1.028 1.587 1.028 2.675 0 3.83-2.339 4.673-4.566 4.92.359.307.678.915.678 1.846 0 1.332-.012 2.407-.012 2.734 0 .267.18.577.688.48 3.97-1.32 6.833-5.054 6.833-9.458C22 6.463 17.522 2 12 2z"
      />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}
