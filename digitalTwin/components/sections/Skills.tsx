import { profile } from "@/lib/profile";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";

export function Skills() {
  return (
    <Section id="expertise" aria-labelledby="expertise-heading" className="py-20 md:py-28">
      <Container>
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Expertise</p>
          <h2 id="expertise-heading" className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Skills & credentials
          </h2>
          <p className="mt-4 max-w-2xl text-base text-muted">
            Technical depth with the communication stack to align executives, product, and engineering.
          </p>
        </Reveal>

        <Reveal delay={0.06} className="mt-12">
          <h3 className="sr-only">Core skills</h3>
          <ul className="flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <li key={skill}>
                <span className="inline-flex rounded-full border border-border bg-surface/40 px-3 py-1.5 text-sm text-foreground transition hover:border-accent/40 hover:text-accent">
                  {skill}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <Reveal delay={0.08} className="glass rounded-2xl p-6">
            <h3 className="font-display text-lg font-semibold text-foreground">Languages</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {profile.languages.map((lang) => (
                <li key={lang}>{lang}</li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1} className="glass rounded-2xl p-6">
            <h3 className="font-display text-lg font-semibold text-foreground">Certifications</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {profile.certifications.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.12} className="glass rounded-2xl p-6 md:col-span-1">
            <h3 className="font-display text-lg font-semibold text-foreground">Patents</h3>
            <ul className="mt-3 space-y-3 text-sm text-muted">
              {profile.patents.map((p) => (
                <li key={p.title}>
                  {p.href ? (
                    <a
                      href={p.href}
                      className="text-foreground underline decoration-border underline-offset-4 transition hover:decoration-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {p.title}
                    </a>
                  ) : (
                    <span className="text-foreground/90">{p.title}</span>
                  )}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={0.14} className="mt-12">
          <h3 className="font-display text-lg font-semibold text-foreground">Education</h3>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {profile.education.map((edu) => (
              <li key={edu.school} className="glass rounded-2xl p-6">
                <p className="font-medium text-foreground">{edu.school}</p>
                <p className="mt-1 text-sm text-muted">{edu.degree}</p>
                <p className="mt-2 font-display text-xs font-semibold uppercase tracking-wider text-accent">{edu.dates}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </Container>
    </Section>
  );
}
