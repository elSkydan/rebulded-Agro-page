import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/sections/Hero';
import { Services } from '@/components/sections/Services';
import { PricingSection } from '@/components/sections/pricing/PricingSection';
import { HowWeWork } from '@/components/sections/HowWeWork';
import { Works } from '@/components/sections/works/Works';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Services />
        <PricingSection />
        <HowWeWork />
        <Works />
      </main>
      <Footer />
    </>
  );
}
