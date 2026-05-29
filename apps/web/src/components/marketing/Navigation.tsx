"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

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
    { href: "/developers", label: "Developers" },
    { href: "/nodes", label: "Nodes" },
    { href: "/network", label: "Network" },
    { href: "/pricing", label: "Pricing" },
    { href: "/economics", label: "Economics" },
    { href: "/security", label: "Security" },
  ];

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-14 border-b transition-all duration-200"
      style={{
        background: isScrolled ? "rgba(11,14,13,0.95)" : "rgba(11,14,13,0.8)",
        backdropFilter: "blur(12px)",
        borderColor: isScrolled ? "#1a2e25" : "transparent",
      }}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#408a71] dot-pulse" />
          <span className="text-[14px] font-semibold tracking-tight text-[#b0e4cc]">SATELINK</span>
          <span className="ml-1 rounded bg-[#285a48]/30 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-[#408a71]">
            BETA
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden items-center gap-6 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] font-medium text-[#408a71] transition-colors hover:text-[#b0e4cc]"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/satelink/os/overview"
            className="rounded bg-[#408a71] px-4 py-1.5 text-[11px] font-semibold text-[#0b0e0d] transition-colors hover:bg-[#4fa07f]"
          >
            Launch App
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="flex items-center justify-center p-2 text-[#408a71] lg:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-x-0 top-14 bottom-0 z-50 bg-[#0b0e0d] lg:hidden"
          style={{ animation: "fadeIn 0.15s ease-out" }}
        >
          <div className="flex flex-col gap-1 p-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded px-4 py-3 text-[14px] font-medium text-[#b0e4cc] transition-colors hover:bg-[#0f1e17]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="my-3 h-px bg-[#1a2e25]" />
            <Link
              href="/satelink/os/overview"
              className="rounded bg-[#408a71] px-4 py-3 text-center text-[13px] font-semibold text-[#0b0e0d]"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Launch App
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
