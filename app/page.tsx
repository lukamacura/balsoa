import { About } from "./_components/about";
import { Contact } from "./_components/contact";
import { Hero } from "./_components/hero";
import { Numbers } from "./_components/numbers";
import { PartnerMarquee } from "./_components/partner-marquee";
import { Reach } from "./_components/reach";
import { References } from "./_components/references";
import { RevealObserver } from "./_components/reveal-observer";
import { Services } from "./_components/services";
import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <PartnerMarquee />
        <About />
        <Reach />
        <Services />
        <Numbers />
        <References />
        <Contact />
      </main>
      <SiteFooter />
      <RevealObserver />
    </>
  );
}
