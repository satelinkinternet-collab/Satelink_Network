"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[var(--bg-deep)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)]"
          : "bg-transparent"
      }`}
    >
      <div className="container-marketing">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 bg-[var(--brand-primary)] rounded-lg animate-signal opacity-50" />
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
              className="text-xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              <span className="text-[var(--text-primary)]">Sate</span>
              <span className="text-[var(--brand-primary)]">link</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <NavLink href="#network">Network</NavLink>
            <NavLink href="#developers">Developers</NavLink>
            <NavLink href="#nodes">Nodes</NavLink>
            <NavLink href="#pricing">Pricing</NavLink>
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/developers"
              className="btn-outline text-sm px-4 py-2"
            >
              Get API Key
            </Link>
            <Link href="/nodes" className="btn-glow text-sm px-4 py-2">
              Run a Node
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-[var(--text-primary)]"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--border-subtle)] animate-fade-in">
            <div className="flex flex-col gap-4">
              <MobileNavLink href="#network" onClick={() => setIsMobileMenuOpen(false)}>
                Network
              </MobileNavLink>
              <MobileNavLink href="#developers" onClick={() => setIsMobileMenuOpen(false)}>
                Developers
              </MobileNavLink>
              <MobileNavLink href="#nodes" onClick={() => setIsMobileMenuOpen(false)}>
                Nodes
              </MobileNavLink>
              <MobileNavLink href="#pricing" onClick={() => setIsMobileMenuOpen(false)}>
                Pricing
              </MobileNavLink>
              <div className="flex flex-col gap-2 pt-4 border-t border-[var(--border-subtle)]">
                <Link
                  href="/developers"
                  className="btn-outline text-center text-sm py-3"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Get API Key
                </Link>
                <Link
                  href="/nodes"
                  className="btn-glow text-center text-sm py-3"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Run a Node
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm font-medium"
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="text-[var(--text-primary)] hover:text-[var(--brand-primary)] transition-colors text-lg font-medium py-2"
    >
      {children}
    </Link>
  );
}
