import Link from "next/link";
import { profile } from "@/lib/profile";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";

export function Portfolio() {
  return (
    <Section id="portfolio" aria-labelledby="portfolio-heading" className="border-t border-border/60 py-20 md:py-28">
      <Container>
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Work</p>
          <h2 id="portfolio-heading" className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Portfolio
          </h2>
          <p className="mt-4 max-w-2xl text-base text-muted">
            Public artifacts are on the way. Meanwhile, the narrative lives in the journey above—detailed history on LinkedIn.
          </p>
        </Reveal>

        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {profile.portfolio.map((item, index) => (
            <li key={item.title}>
              <Reveal delay={index * 0.06}>
                <article className="group flex h-full flex-col rounded-2xl border border-border bg-surface/30 p-6 transition hover:border-accent/35 hover:bg-surface/50">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg font-semibold text-foreground">{item.title}</h3>
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                      {item.status === "live" ? "Live" : "Soon"}
                    </span>
                  </div>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{item.description}</p>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="mt-5 inline-flex text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      View project
                    </Link>
                  ) : (
                    <p className="mt-5 text-sm font-medium text-muted">Link will appear here.</p>
                  )}
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
