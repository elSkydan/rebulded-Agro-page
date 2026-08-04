import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/sections/Hero';
import { HowWeWork } from '@/components/sections/HowWeWork';
import { ExploreMore } from '@/components/sections/ExploreMore';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <HowWeWork />
        <ExploreMore />
      </main>
      <Footer />
    </>
  );
}
