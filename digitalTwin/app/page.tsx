import Link from "next/link";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Journey } from "@/components/sections/Journey";
import { Skills } from "@/components/sections/Skills";
import { Portfolio } from "@/components/sections/Portfolio";
import { Contact } from "@/components/sections/Contact";
import { DigitalTwinChat } from "@/components/sections/DigitalTwinChat";
import { SiteFooter } from "@/components/sections/SiteFooter";

export default function Home() {
  return (
    <>
      <Link
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-canvas"
      >
        Skip to content
      </Link>
      <SiteHeader />
      <main id="main">
        <Hero />
        <About />
        <Journey />
        <Skills />
        <Portfolio />
        <Contact />
        <DigitalTwinChat />
      </main>
      <SiteFooter />
    </>
  );
}
