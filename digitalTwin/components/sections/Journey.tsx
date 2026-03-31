import { profile } from "@/lib/profile";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";

export function Journey() {
  return (
    <Section id="journey" aria-labelledby="journey-heading" className="border-y border-border/60 py-20 md:py-28">
      <Container>
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Career</p>
          <h2 id="journey-heading" className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Journey
          </h2>
          <p className="mt-4 max-w-2xl text-base text-muted">
            From hands-on engineering through architecture leadership—delivery, strategy, and teams at global scale.
          </p>
        </Reveal>

        <div className="relative mt-14 md:mt-16">
          <div
            className="pointer-events-none absolute left-[5px] top-2 bottom-2 w-px bg-gradient-to-b from-accent/50 via-border to-transparent md:left-[7px]"
            aria-hidden
          />
          <ol className="relative space-y-10 md:space-y-12">
            {profile.experience.map((role, index) => (
              <li key={`${role.company}-${role.period}`} className="relative pl-10 md:pl-14">
                <span
                  className="absolute left-0 top-2 z-10 flex h-3 w-3 rounded-full border-2 border-accent bg-canvas shadow-[0_0_0_4px_var(--canvas)]"
                  aria-hidden
                />
                <Reveal delay={index * 0.05}>
                  <article className="glass rounded-2xl p-6 transition hover:shadow-glow md:p-8">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                      <div>
                        <h3 className="font-display text-xl font-semibold text-foreground">{role.title}</h3>
                        <p className="text-base font-medium text-muted">{role.company}</p>
                      </div>
                      <p className="mt-2 font-display text-xs font-semibold uppercase tracking-wider text-accent sm:mt-0">
                        {role.period}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-muted">{role.location}</p>
                    <ul className="mt-5 space-y-2.5 border-t border-border/60 pt-5">
                      {role.bullets.map((b) => (
                        <li key={b.slice(0, 48)} className="flex gap-3 text-sm leading-relaxed text-muted">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </Section>
  );
}
