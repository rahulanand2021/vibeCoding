"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { profile } from "@/lib/profile";
import { Container } from "@/components/ui/Container";

export function Hero() {
  return (
    <div id="top" className="relative noise overflow-hidden border-b border-border/60 pb-20 pt-16 sm:pb-28 sm:pt-20 md:pt-24">
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-20 top-0 h-80 w-80 rounded-full bg-[#6b8cff]/15 blur-3xl" aria-hidden />

      <Container className="relative">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface/50 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-glow" aria-hidden />
          Enterprise architecture
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl"
        >
          {profile.name}
          <span className="mt-3 block text-lg font-normal text-muted sm:text-xl md:text-2xl">
            {profile.title}
            <span className="mx-2 text-border">·</span>
            {profile.location}
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 max-w-2xl text-base leading-relaxed text-muted sm:text-lg"
        >
          {profile.summary[0]}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex flex-wrap items-center gap-3"
        >
          <Link
            href={`mailto:${profile.contact.email}`}
            className="inline-flex items-center justify-center rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-canvas transition hover:bg-accent hover:text-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Email me
          </Link>
          <Link
            href={profile.contact.linkedinUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-border bg-surface/40 px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-accent/50 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            LinkedIn
          </Link>
          <Link
            href="#journey"
            className="inline-flex items-center justify-center px-3 py-2.5 text-sm font-medium text-muted underline-offset-4 transition hover:text-foreground hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            View career journey
          </Link>
        </motion.div>
      </Container>
    </div>
  );
}
