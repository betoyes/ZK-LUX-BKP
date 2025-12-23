import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Search, ShoppingBag, User, Menu, Heart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { motion, AnimatePresence } from 'framer-motion';
import { useProducts } from '@/context/ProductContext';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useLocation();
  const { wishlist, branding, getCartCount } = useProducts();
  
  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/shop?search=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 text-white ${
          isScrolled 
            ? 'py-4 bg-black/80 backdrop-blur-md border-b border-white/10' 
            : 'py-8 bg-gradient-to-b from-black/80 via-black/40 to-transparent'
        }`}
      >
        <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
          {/* Logo - Left Aligned for Modern Feel */}
          <div className="z-50 flex items-center gap-8">
            <Link href="/" className="font-display text-2xl md:text-3xl font-bold tracking-tighter hover:opacity-70 transition-opacity">
              {branding.companyName}®
            </Link>
            
            {/* Desktop Links - Moved here for better layout balance */}
            <div className="hidden lg:flex items-center gap-8 ml-8">
              {['Loja', 'Lookbook', 'Noivas', 'Atelier', 'Journal', 'Manifesto'].map((item) => {
                const href = item === 'Loja' ? '/shop' : 
                             item === 'Lookbook' ? '/lookbook' : 
                             item === 'Noivas' ? '/noivas' :
                             item === 'Atelier' ? '/atelier' :
                             item === 'Journal' ? '/journal' :
                             item === 'Manifesto' ? '/manifesto' : '/about';
                const isActive = location === href || (href === '/shop' && location.startsWith('/shop'));
                return (
                  <Link key={item} href={href} className={`text-xs font-mono tracking-widest hover:underline underline-offset-4 uppercase ${isActive ? 'underline' : ''}`}>
                    {item}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-6 z-50">
            <div className="hidden md:block font-mono text-xs tracking-widest mr-4">
              EST. 2026
            </div>
            
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSearchOpen(true)} className="hover:opacity-70 transition-opacity">
                <Search className="h-4 w-4" />
              </button>

              <Link href="/wishlist" className="relative hover:opacity-70 transition-opacity">
                <Heart className="h-4 w-4" />
                {wishlist.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-white text-black text-[8px] font-bold h-4 w-4 flex items-center justify-center rounded-full">
                    {wishlist.length}
                  </span>
                )}
              </Link>

              <Link href="/cart">
                <button className="hover:opacity-70 transition-opacity font-mono text-sm flex items-center gap-2" data-testid="nav-cart-link">
                  SACOLA ({getCartCount()})
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
                          { name: 'Lookbook', href: '/lookbook' },
                          { name: 'Noivas', href: '/noivas' },
                          { name: 'Atelier', href: '/atelier' },
                          { name: 'Journal', href: '/journal' },
                          { name: 'Manifesto', href: '/manifesto' },
                          { name: 'Sobre', href: '/about' },
                          { name: 'Contato', href: '/contact' }
                        ].map((item) => {
                          const isActive = location === item.href || (item.href === '/shop' && location.startsWith('/shop'));
                          return (
                            <Link key={item.name} href={item.href} className={`block font-display text-5xl md:text-6xl font-medium hover:text-white/50 transition-colors tracking-tighter ${isActive ? 'underline underline-offset-8' : ''}`}>
                              {item.name}
                            </Link>
                          );
                        })}
                      </div>
                      <div className="font-mono text-xs tracking-widest text-white/50">
                        {branding.companyName} JEWELRY © 2026
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <button 
              onClick={() => setIsSearchOpen(false)} 
              className="absolute top-8 right-8 text-white hover:opacity-70"
            >
              <X className="h-8 w-8" />
            </button>
            <div className="w-full max-w-3xl">
              <form onSubmit={handleSearch}>
                <input
                  type="text"
                  autoFocus
                  placeholder="O que você procura?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-white text-white text-3xl md:text-5xl font-display placeholder:text-white/30 focus:outline-none py-4 text-center"
                />
              </form>
              <p className="text-center text-white/50 mt-4 font-mono text-xs uppercase tracking-widest">
                Pressione Enter para buscar
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
