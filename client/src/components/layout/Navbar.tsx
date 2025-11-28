import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Search, ShoppingBag, User, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { motion } from 'framer-motion';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [location] = useLocation();
  
  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isHome = location === '/';

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 mix-blend-difference text-white ${
        isScrolled ? 'py-4' : 'py-8'
      }`}
    >
      <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
        {/* Logo - Left Aligned for Modern Feel */}
        <div className="z-50">
          <Link href="/" className="font-display text-2xl md:text-3xl font-bold tracking-tighter hover:opacity-70 transition-opacity">
            AURUM®
          </Link>
        </div>

        {/* Desktop Links - Center / Hidden on Mobile */}
        <div className="hidden md:flex items-center gap-12 absolute left-1/2 -translate-x-1/2">
          {['Loja', 'Coleções', 'Sobre'].map((item) => {
            const href = item === 'Loja' ? '/shop' : item === 'Coleções' ? '/collections' : '/about';
            return (
              <Link key={item} href={href} className="text-sm font-mono tracking-widest hover:underline underline-offset-4 uppercase">
                {item}
              </Link>
            );
          })}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-6 z-50">
          <div className="hidden md:block font-mono text-xs tracking-widest">
            EST. 2025
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/cart">
              <button className="hover:opacity-70 transition-opacity font-mono text-sm flex items-center gap-2">
                SACOLA (0)
              </button>
            </Link>

            <Link href="/login">
              <button className="hover:opacity-70 transition-opacity font-mono text-sm flex items-center gap-2">
                LOGIN
              </button>
            </Link>
            
            {/* Mobile Menu */}
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-current p-0 hover:bg-transparent">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="bg-black text-white border-l-white/10 w-full sm:w-[400px] p-0">
                  <div className="flex flex-col h-full p-8 justify-between">
                    <div className="space-y-8 mt-20">
                      {[
                        { name: 'Início', href: '/' },
                        { name: 'Loja', href: '/shop' },
                        { name: 'Coleções', href: '/collections' },
                        { name: 'Sobre', href: '/about' },
                        { name: 'Contato', href: '/contact' }
                      ].map((item) => (
                        <Link key={item.name} href={item.href} className="block font-display text-5xl md:text-6xl font-medium hover:text-white/50 transition-colors tracking-tighter">
                          {item.name}
                        </Link>
                      ))}
                    </div>
                    <div className="font-mono text-xs tracking-widest text-white/50">
                      AURUM JEWELRY © 2025
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
