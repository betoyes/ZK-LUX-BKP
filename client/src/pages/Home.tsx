import { useState, useCallback } from 'react';
import { Link } from 'wouter';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, ArrowUpRight, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { collections } from '@/lib/mockData';
import { useProducts } from '@/context/ProductContext';
import heroImage from '@assets/generated_images/luxury_jewelry_hero_image_with_model.png';
import necklaceImage from '@assets/generated_images/gold_necklace_product_shot.png';
import campaignVideo from '@assets/generated_videos/b&w_jewelry_fashion_b-roll.mp4';
import useEmblaCarousel from 'embla-carousel-react';

export default function Home() {
  const { products } = useProducts();
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const y2 = useTransform(scrollY, [0, 500], [0, -100]);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  
  // Carousel setup
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      
      {/* Modern Hero Section */}
      <section className="relative h-screen w-full overflow-hidden bg-black">
        <motion.div 
          style={{ y: y1 }}
          className="absolute inset-0 opacity-60"
        >
          <img 
            src={heroImage} 
            alt="Luxury Jewelry Model" 
            className="w-full h-full object-cover grayscale contrast-125"
          />
        </motion.div>
        
        <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-12 z-10 mix-blend-difference text-white pointer-events-none">
          <div className="flex justify-between items-start">
            <span className="font-mono text-xs tracking-[0.5em] uppercase">Coleção 01</span>
            <span className="font-mono text-xs tracking-[0.5em] uppercase text-right hidden md:block">
              São Paulo<br/>Paris<br/>Tóquio
            </span>
          </div>
          
          <div className="space-y-4">
            <h1 className="font-display text-[12vw] leading-[0.8] font-bold tracking-tighter uppercase">
              Herança<br/><span className="ml-[10vw]">Futura</span>
            </h1>
          </div>

          <div className="flex justify-between items-end pointer-events-auto">
            <Dialog open={isVideoOpen} onOpenChange={setIsVideoOpen}>
              <DialogTrigger asChild>
                <button className="group flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                    <Play className="h-4 w-4 fill-current" />
                  </div>
                  <span className="font-mono text-xs tracking-widest uppercase hidden md:block">Ver Campanha</span>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[800px] p-0 bg-black border-none overflow-hidden aspect-video">
                <video 
                  src={campaignVideo} 
                  controls 
                  autoPlay 
                  className="w-full h-full object-cover"
                />
              </DialogContent>
            </Dialog>
            
            <Link href="/shop">
              <Button variant="outline" className="rounded-full px-8 py-6 bg-transparent text-white border-white hover:bg-white hover:text-black font-mono text-xs tracking-widest uppercase transition-all">
                Ver Lançamento
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Editorial Grid Section */}
      <section className="py-32 px-4 md:px-12 bg-background">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-4 flex flex-col justify-between">
            <div>
              <h2 className="font-display text-4xl md:text-5xl font-medium mb-8 tracking-tight leading-[1.1]">
                Redefinindo<br/>o Luxo
              </h2>
              <p className="font-mono text-sm text-muted-foreground leading-relaxed max-w-xs mb-12">
                Acreditamos em joias que falam a linguagem da arquitetura moderna. Linhas limpas, formas ousadas e uma presença inegável.
              </p>
            </div>
            <Link href="/about" className="group flex items-center gap-2 font-mono text-xs uppercase tracking-widest hover:opacity-50 transition-opacity">
              Ler Manifesto <ArrowUpRight className="h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </Link>
          </div>
          
          <div className="md:col-span-8">
            <div className="relative aspect-[16/9] overflow-hidden bg-secondary">
              <img 
                src={necklaceImage} 
                alt="Detail Shot" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 ease-out grayscale"
              />
              <div className="absolute bottom-0 left-0 p-8 bg-white/10 backdrop-blur-md w-full">
                <div className="flex justify-between items-center text-white">
                  <span className="font-display text-2xl">Corrente Aurora</span>
                  <span className="font-mono text-sm">Ouro 18K</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee / Running Text */}
      <div className="py-12 border-y border-border overflow-hidden bg-foreground text-background whitespace-nowrap">
        <motion.div 
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
          className="flex gap-12 font-display text-8xl md:text-9xl font-bold tracking-tighter uppercase opacity-20"
        >
          <span>ZK REZK</span>
          <span>Eterno</span>
          <span>Moderno</span>
          <span>Luxo</span>
          <span>ZK REZK</span>
          <span>Eterno</span>
          <span>Moderno</span>
          <span>Luxo</span>
        </motion.div>
      </div>

      {/* Horizontal Product Carousel Section */}
      <section className="py-32 pl-4 md:pl-12 overflow-hidden">
        <div className="flex justify-between items-end pr-12 mb-16">
          <h2 className="font-display text-4xl font-medium">Últimos Drops</h2>
          <div className="flex items-center gap-4">
            <button 
              onClick={scrollPrev}
              className="h-10 w-10 rounded-full border border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button 
              onClick={scrollNext}
              className="h-10 w-10 rounded-full border border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-hidden cursor-grab active:cursor-grabbing" ref={emblaRef}>
          <div className="flex gap-8 pr-12">
            {products.slice(0, 8).map((product, idx) => (
              <Link key={product.id} href={`/product/${product.id}`} className="shrink-0 w-[300px] md:w-[400px] group cursor-pointer select-none">
                <div className="aspect-[3/4] bg-secondary overflow-hidden mb-6 relative">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:grayscale-0 grayscale"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
                <div className="flex justify-between items-start border-b border-border pb-2 group-hover:border-black transition-colors">
                  <div>
                    <h3 className="font-display text-xl mb-1">{product.name}</h3>
                    <span className="font-mono text-xs text-muted-foreground uppercase">{product.category}</span>
                  </div>
                  <span className="font-mono text-sm">
                    R$ {product.price.toLocaleString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
        
        <div className="mt-12 pr-12 flex justify-center md:justify-end">
           <Link href="/shop" className="font-mono text-xs uppercase tracking-widest hover:underline underline-offset-4">Ver Toda a Coleção</Link>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="h-[60vh] flex items-center justify-center bg-black text-white px-4 text-center relative overflow-hidden">
         <motion.div 
          style={{ y: y2 }}
          className="absolute inset-0 opacity-20"
        >
           <img src={heroImage} className="w-full h-full object-cover blur-3xl scale-110 grayscale" />
        </motion.div>
        
        <div className="relative z-10 max-w-2xl space-y-8">
          <h2 className="font-display text-5xl md:text-7xl font-bold tracking-tighter leading-[0.9]">
            Entre para o <br/> Círculo Interno
          </h2>
          <p className="font-mono text-sm text-white/60 max-w-md mx-auto">
            Receba acesso antecipado a lançamentos limitados e eventos exclusivos.
          </p>
          <div className="flex gap-0 border-b border-white/30 max-w-md mx-auto">
            <input 
              type="email" 
              placeholder="SEU EMAIL" 
              className="bg-transparent w-full py-4 focus:outline-none font-mono text-sm placeholder:text-white/30"
            />
            <button className="font-mono text-xs uppercase tracking-widest hover:text-white/70">Inscrever</button>
          </div>
        </div>
      </section>
    </div>
  );
}
