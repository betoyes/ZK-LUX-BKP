import { Link } from 'wouter';
import { Facebook, Instagram, Twitter } from 'lucide-react';
import { useProducts } from '@/context/ProductContext';
import { filterVisibleCategories } from '@/lib/categoryVisibility';

export function Footer() {
  const { branding, categories } = useProducts();
  const visibleCategories = filterVisibleCategories(categories);
  return (
    <footer className="bg-background border-t border-border pt-20 pb-10">
      <div className="container mx-auto px-4 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-24">
          
          {/* Brand / Big Logo */}
          <div className="md:col-span-6 flex flex-col justify-between h-full">
            <div className="font-display text-[10vw] leading-[0.8] font-bold tracking-tighter opacity-10 select-none">
              {branding.companyName}
            </div>
            <div className="mt-8 max-w-sm">
              <p className="font-mono text-xs text-muted-foreground uppercase leading-relaxed line-clamp-3">
                {branding.manifestoText}
              </p>
            </div>
          </div>

          {/* Links Grid */}
          <div className="md:col-span-2">
            <h4 className="font-mono text-xs uppercase tracking-widest mb-8 text-muted-foreground">Loja</h4>
            <ul className="space-y-4">
              <li><Link href="/shop" className="font-display text-xl hover:text-muted-foreground transition-colors">Ver Tudo</Link></li>
              {visibleCategories.map((cat: any) => (
                <li key={cat.id || cat.slug}>
                  <Link href={`/shop?category=${cat.slug || cat.id}`} className="font-display text-xl hover:text-muted-foreground transition-colors">
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="font-mono text-xs uppercase tracking-widest mb-8 text-muted-foreground">Editorial</h4>
            <ul className="space-y-4">
              <li><Link href="/journal" className="font-display text-xl hover:text-muted-foreground transition-colors">Journal</Link></li>
              <li><Link href="/manifesto" className="font-display text-xl hover:text-muted-foreground transition-colors">Manifesto</Link></li>
              <li><Link href="/lookbook" className="font-display text-xl hover:text-muted-foreground transition-colors">Lookbook</Link></li>
              <li><Link href="/atelier" className="font-display text-xl hover:text-muted-foreground transition-colors">Atelier</Link></li>
              <li><Link href="/about" className="font-display text-xl hover:text-muted-foreground transition-colors">Sobre</Link></li>
            </ul>
          </div>
          
           <div className="md:col-span-2">
            <h4 className="font-mono text-xs uppercase tracking-widest mb-8 text-muted-foreground">Social</h4>
            <ul className="space-y-4">
              <li><a href="#" className="font-display text-xl hover:text-muted-foreground transition-colors">LinkedIn</a></li>
              <li><a href="#" className="font-display text-xl hover:text-muted-foreground transition-colors">Instagram</a></li>
              <li><a href="#" className="font-display text-xl hover:text-muted-foreground transition-colors">Facebook</a></li>
              <li><a href="#" className="font-display text-xl hover:text-muted-foreground transition-colors">Tik Tok</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
          <p>&copy; 2026 {branding.companyName} JEWELRY. TODOS OS DIREITOS RESERVADOS.</p>
          <div className="flex gap-8">
            <Link href="/privacy-policy" className="hover:text-foreground">Política de Privacidade</Link>
            <Link href="/terms-of-use" className="hover:text-foreground">Termos de Uso</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
