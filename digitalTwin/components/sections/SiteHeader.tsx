"use client";

import Link from "next/link";
import { Container } from "@/components/ui/Container";

const nav = [
  { href: "#about", label: "About" },
  { href: "#journey", label: "Journey" },
  { href: "#expertise", label: "Expertise" },
  { href: "#portfolio", label: "Portfolio" },
  { href: "#contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-canvas/75 backdrop-blur-md">
      <Container className="flex h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:h-16 sm:flex-nowrap">
        <Link
          href="#top"
          className="font-display text-sm font-semibold tracking-tight text-foreground transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          RA<span className="text-accent">.</span>
        </Link>
        <nav aria-label="Primary" className="order-3 w-full md:order-none md:w-auto">
          <ul className="flex max-w-[100vw] items-center gap-0.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] md:max-w-none md:flex-wrap md:gap-1 md:overflow-visible md:pb-0 lg:gap-2 [&::-webkit-scrollbar]:hidden">
            {nav.map((item) => (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  className="rounded-md px-2.5 py-2 text-xs text-muted transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:px-3 md:text-sm"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <Link
          href="#contact"
          className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition hover:border-accent hover:bg-accent/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:px-4 sm:text-sm"
        >
          Let&apos;s talk
        </Link>
      </Container>
    </header>
  );
}
