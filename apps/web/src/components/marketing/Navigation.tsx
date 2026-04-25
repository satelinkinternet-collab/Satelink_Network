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

  const navLinks = [
    { href: "/network", label: "Network" },
    { href: "/developers", label: "Developers" },
    { href: "/nodes", label: "Nodes" },
    { href: "/pricing", label: "Pricing" },
    { href: "/about", label: "About" },
  ];

  return (
    <nav className="nav" style={{
      background: isScrolled ? "rgba(8, 14, 26, 0.9)" : "rgba(8, 14, 26, 0.6)",
      borderBottomColor: isScrolled ? "var(--border-default)" : "transparent"
    }}>
      <div className="nav-container">
        <Link href="/" className="nav-logo">
          <span>Satelink</span>
          <span className="nav-logo-dot" />
        </Link>

        <div className="nav-links">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="nav-actions">
          <Link href="/developers#api-key" className="btn btn-signal-outline btn-sm desktop-only">
            Get API Key
          </Link>
          <Link href="/network" className="btn btn-ghost btn-sm desktop-only">
            Dashboard
          </Link>
          <button
            className="mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {isMobileMenuOpen ? (
                <path d="M6 6l12 12M6 18L18 6" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="mobile-menu">
          <div className="mobile-menu-links">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="mobile-menu-link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mobile-menu-divider" />
            <Link
              href="/developers#api-key"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Get API Key
            </Link>
          </div>
        </div>
      )}

      <style jsx>{`
        .desktop-only {
          display: inline-flex;
        }

        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: var(--space-2);
          border-radius: var(--radius-md);
          transition: background 0.2s;
        }

        .mobile-menu-btn:hover {
          background: var(--signal-dim);
        }

        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: flex;
          }
          .desktop-only {
            display: none;
          }
        }

        .mobile-menu {
          position: fixed;
          top: 65px;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--bg-page);
          z-index: var(--z-modal);
          padding: var(--space-6);
          animation: fade-in 0.2s ease-out;
        }

        .mobile-menu-links {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .mobile-menu-link {
          display: block;
          padding: var(--space-4);
          font-family: var(--font-body);
          font-size: 1.125rem;
          font-weight: 500;
          color: var(--text-primary);
          text-decoration: none;
          border-radius: var(--radius-lg);
          transition: background 0.2s;
        }

        .mobile-menu-link:hover {
          background: var(--signal-dim);
          color: var(--signal);
        }

        .mobile-menu-divider {
          height: 1px;
          background: var(--border-subtle);
          margin: var(--space-4) 0;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </nav>
  );
}
