import Link from "next/link";
import { profile } from "@/lib/profile";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";

export function Contact() {
  return (
    <Section id="contact" aria-labelledby="contact-heading" className="py-20 md:py-28">
      <Container>
        <div className="relative overflow-hidden rounded-3xl border border-border glass px-6 py-14 md:px-14 md:py-16">
          <div className="pointer-events-none absolute -right-20 top-10 h-64 w-64 rounded-full bg-accent/10 blur-3xl" aria-hidden />
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Contact</p>
            <h2 id="contact-heading" className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Let&apos;s connect on what you&apos;re building next
            </h2>
            <p className="mt-4 max-w-2xl text-base text-muted">
              Engagements spanning enterprise architecture, platform strategy, delivery leadership, and team development.
            </p>
          </Reveal>
          <Reveal delay={0.08} className="mt-10 flex flex-wrap gap-4">
            <Link
              href={`mailto:${profile.contact.email}`}
              className="inline-flex items-center justify-center rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-canvas transition hover:bg-accent hover:text-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {profile.contact.email}
            </Link>
            <Link
              href={profile.contact.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition hover:border-accent/50 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {profile.contact.linkedinLabel}
            </Link>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
