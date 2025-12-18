import { useState, useCallback, useEffect } from 'react';
import { Link } from 'wouter';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, ArrowUpRight, Play, ChevronLeft, ChevronRight, Gem } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProducts } from '@/context/ProductContext';
import heroImage from '@assets/generated_images/luxury_jewelry_hero_image_with_model.png';
import necklaceImage from '@assets/generated_images/gold_necklace_product_shot.png';
import campaignVideo from '@assets/generated_videos/b&w_jewelry_fashion_b-roll.mp4';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useToast } from '@/hooks/use-toast';

// Stone type options
const STONE_TYPES = [
  { id: 'natural', label: 'Diamante Natural' },
  { id: 'synthetic', label: 'Diamante Sintético' },
  { id: 'zirconia', label: 'Zircônia' },
];

import { testimonials } from '@/lib/mockData';

import img_01 from "@assets/img-01.jpg";

export default function Home() {
  const { products, categories, collections, branding } = useProducts();
  const { toast } = useToast();
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const y2 = useTransform(scrollY, [0, 500], [0, -100]);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedStoneTypes, setSelectedStoneTypes] = useState<Record<number, string>>({});

  // Helper to check if a product has stone variations
  const hasStoneVariations = (product: any) => {
    return product.priceDiamondSynthetic || product.priceZirconia;
  };

  // Get price based on selected stone type
  const getProductPrice = (product: any) => {
    const stoneType = selectedStoneTypes[product.id] || 'natural';
    if (stoneType === 'synthetic' && product.priceDiamondSynthetic) {
      return product.priceDiamondSynthetic;
    }
    if (stoneType === 'zirconia' && product.priceZirconia) {
      return product.priceZirconia;
    }
    return product.price;
  };

  const handleSubscribe = async () => {
    if (!email || !email.includes('@')) {
      toast({ title: "Erro", description: "Por favor, insira um email válido.", variant: "destructive" });
      return;
    }
    
    try {
      const response = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: email.split('@')[0],
          email: email.toLowerCase(),
          date: new Date().toISOString().split('T')[0],
          status: 'active'
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        if (error.message?.includes('cadastrado')) {
          toast({ title: "Atenção", description: "Este email já está cadastrado.", variant: "default" });
        } else {
          throw new Error(error.message);
        }
        return;
      }
      
      setEmail('');
      toast({ title: "Bem-vindo(a)", description: "Você foi adicionado(a) à nossa lista exclusiva." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Não foi possível cadastrar. Tente novamente.", variant: "destructive" });
    }
  };
  
  // Autoplay plugin configuration
  const autoplayPlugin = Autoplay({
    delay: 3000,
    stopOnInteraction: false,
    stopOnMouseEnter: true,
    playOnInit: true,
  });

  // Carousel setup with autoplay
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    align: 'start',
    containScroll: false,
    dragFree: true,
    loop: true,
  }, [autoplayPlugin]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  // Filter and Sort Bestsellers
  const bestsellers = (Array.isArray(products) ? products : [])
    .filter(p => p.bestsellerOrder !== undefined && p.bestsellerOrder > 0)
    .sort((a, b) => (a.bestsellerOrder || 999) - (b.bestsellerOrder || 999));

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Modern Hero Section */}
      <section className="relative h-screen w-full overflow-hidden bg-black">
        <motion.div 
          style={{ y: y1 }}
          className="absolute inset-0 opacity-60"
        >
          {branding.heroMediaType === 'video' ? (
            <video 
              src={branding.heroMediaUrl || heroImage} 
              autoPlay 
              loop 
              muted 
              playsInline
              className="w-full h-full object-cover grayscale contrast-125"
            />
          ) : (
            <img 
              src={img_01} 
              alt="Luxury Jewelry Model" 
              className="w-full h-full object-cover grayscale contrast-125"
            />
          )}
        </motion.div>
        
        {/* Cidades - Lateral direita centralizada */}
        <div className="absolute right-6 md:right-12 top-1/2 -translate-y-1/2 z-[60] hidden md:block">
          <div className="flex flex-col items-end gap-3">
            <span className="font-mono text-xs tracking-[0.4em] uppercase text-white">São Paulo</span>
            <span className="font-mono text-xs tracking-[0.4em] uppercase text-white">Paris</span>
            <span className="font-mono text-xs tracking-[0.4em] uppercase text-white">Tóquio</span>
          </div>
        </div>
        
        {/* Frase/Assinatura - Fora do mix-blend para ter cor sólida */}
        <div className="absolute left-6 md:left-12 bottom-32 z-[60]">
          <div className="inline-block px-4 py-2 pl-[20px] pr-[20px] pt-[8px] pb-[8px] mt-[50px] mb-[50px] bg-[#2626267a]">
            <p className="font-mono text-sm md:text-base tracking-[0.2em] uppercase text-white font-light">
              Elegância que não grita, impõe
            </p>
          </div>
        </div>
        
        <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-12 z-50 mix-blend-difference text-white pointer-events-none">
          <div className="flex justify-between items-start">
            <span className="font-mono text-xs tracking-[0.5em] uppercase"></span>
            <span></span>
          </div>
          
          <div className="space-y-6">
            <h1 className="font-display text-[12vw] leading-[0.8] font-bold tracking-tighter uppercase">
              {branding.heroTitle.split('\n').map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
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
                <DialogTitle className="sr-only">Vídeo da Campanha</DialogTitle>
                <DialogDescription className="sr-only">Assista ao vídeo promocional da campanha ZK REZK</DialogDescription>
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
                {branding.manifestoTitle}
              </h2>
              <p className="font-mono text-sm text-muted-foreground leading-relaxed max-w-xs mb-12">
                {branding.manifestoText}
              </p>
            </div>
            <Link href="/manifesto" className="group flex items-center gap-2 font-mono text-xs uppercase tracking-widest hover:opacity-50 transition-opacity">
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
          <span>{branding.companyName}</span>
          <span>Eterno</span>
          <span>Moderno</span>
          <span>Luxo</span>
          <span>{branding.companyName}</span>
          <span>Eterno</span>
          <span>Moderno</span>
          <span>Luxo</span>
        </motion.div>
      </div>
      {/* Horizontal Product Carousel Section */}
      <section className="py-32 pl-4 md:pl-12 overflow-hidden">
        <div className="flex justify-between items-end pr-12 mb-16">
          <h2 className="font-display text-4xl font-medium">Bestsellers</h2>
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
          <div className="flex pr-12">
            {(bestsellers.length > 0 ? bestsellers : (Array.isArray(products) ? products : []).slice(0, 8)).map((product, idx) => {
              const stoneType = selectedStoneTypes[product.id] || 'natural';
              const productUrl = stoneType !== 'natural' ? `/product/${product.id}?stone=${stoneType}` : `/product/${product.id}`;
              return (
              <div key={product.id} className="shrink-0 w-[300px] md:w-[400px] group select-none mr-10">
                <Link href={productUrl} className="cursor-pointer">
                  <div className="aspect-[3/4] bg-secondary overflow-hidden mb-6 relative">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      loading="lazy"
                      className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${(!product.imageColor || product.image === product.imageColor) ? 'grayscale group-hover:grayscale-0' : ''}`}
                    />
                    {product.imageColor && product.image !== product.imageColor && (
                      <img 
                        src={product.imageColor} 
                        alt={product.name}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-110 opacity-0 group-hover:opacity-100"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                  </div>
                </Link>
                <div className="flex justify-between items-start border-b border-border pb-2 group-hover:border-black transition-colors">
                  <div>
                    <Link href={productUrl}>
                      <h3 className="font-display text-xl mb-1 hover:text-primary transition-colors">{product.name}</h3>
                    </Link>
                    <span className="font-mono text-xs text-muted-foreground uppercase">{categories.find(c => c.id === product.categoryId)?.name || ''}</span>
                  </div>
                  <span className="font-mono text-sm">
                    R$ {(getProductPrice(product) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {/* Stone Type Selector for Rings */}
                {hasStoneVariations(product) && (
                  <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                    <Select 
                      value={selectedStoneTypes[product.id] || 'natural'} 
                      onValueChange={(val) => setSelectedStoneTypes(prev => ({...prev, [product.id]: val}))}
                    >
                      <SelectTrigger className="w-full h-8 rounded-none text-xs font-mono border-black/30 hover:border-black transition-colors">
                        <div className="flex items-center gap-2">
                          <Gem className="h-3 w-3" />
                          <SelectValue placeholder="Tipo de Pedra" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {STONE_TYPES.map(stone => (
                          <SelectItem key={stone.id} value={stone.id} className="text-xs font-mono">
                            {stone.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            );
            })}
          </div>
        </div>
        
        <div className="mt-12 pr-12 flex justify-center md:justify-end">
           <Link href="/shop" className="font-mono text-xs uppercase tracking-widest hover:underline underline-offset-4">Ver Toda a Coleção</Link>
        </div>
      </section>
      {/* Impact Phrase & Testimonials */}
      <section className="py-32 bg-secondary/20">
        <div className="container mx-auto px-6 md:px-12">
          <div className="mb-24 text-center max-w-4xl mx-auto">
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground mb-6 block">Know How</span>
            <h2 className="font-display text-4xl md:text-6xl font-medium leading-tight tracking-tight">
              "{branding.impactPhrase}"
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-border pt-16">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="space-y-6">
                 <div className="flex gap-1">
                   {[1,2,3,4,5].map(i => (
                     <span key={i} className="text-xs">★</span>
                   ))}
                 </div>
                 <p className="font-serif text-xl leading-relaxed text-foreground/80 italic">
                   "{testimonial.text}"
                 </p>
                 <div>
                   <div className="font-display text-lg">{testimonial.name}</div>
                   <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                     {testimonial.role} — {testimonial.location}
                   </div>
                 </div>
              </div>
            ))}
          </div>
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button 
              onClick={handleSubscribe}
              className="font-mono text-xs uppercase tracking-widest hover:text-white/70"
            >
              Inscrever
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
