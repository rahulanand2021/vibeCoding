import Link from "next/link";
import { profile } from "@/lib/profile";
import { Container } from "@/components/ui/Container";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border/60 py-10">
      <Container className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <p className="text-sm text-muted">
          © {year} {profile.name}. All rights reserved.
        </p>
        <ul className="flex flex-wrap gap-6 text-sm">
          <li>
            <Link
              href={`mailto:${profile.contact.email}`}
              className="text-muted transition hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Email
            </Link>
          </li>
          <li>
            <Link
              href={profile.contact.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className="text-muted transition hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              LinkedIn
            </Link>
          </li>
          <li>
            <Link
              href="#top"
              className="text-muted transition hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Back to top
            </Link>
          </li>
        </ul>
      </Container>
    </footer>
  );
}
