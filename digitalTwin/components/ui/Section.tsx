import type { ReactNode } from "react";

type SectionProps = {
  id: string;
  "aria-labelledby": string;
  children: ReactNode;
  className?: string;
};

export function Section({ id, "aria-labelledby": ariaLabelledBy, children, className = "" }: SectionProps) {
  return (
    <section id={id} aria-labelledby={ariaLabelledBy} className={`scroll-mt-24 ${className}`}>
      {children}
    </section>
  );
}
