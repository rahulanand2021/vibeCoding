import { profile } from "@/lib/profile";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";

export function About() {
  return (
    <Section id="about" aria-labelledby="about-heading" className="py-20 md:py-28">
      <Container>
        <Reveal>
          <p id="about-eyebrow" className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            About
          </p>
          <h2 id="about-heading" className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Precision at enterprise scale; edge where it earns trust
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-14">
          <Reveal delay={0.05}>
            <div className="space-y-5 text-base leading-relaxed text-muted">
              {profile.summary.map((paragraph) => (
                <p key={paragraph.slice(0, 32)}>{paragraph}</p>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <ul className="grid gap-3 sm:grid-cols-2">
              {profile.highlights.map((h) => (
                <li
                  key={h.label}
                  className="glass rounded-2xl p-5 transition hover:shadow-glow"
                >
                  <p className="font-display text-lg font-semibold text-foreground">{h.label}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{h.detail}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
