import { useProducts } from '@/context/ProductContext';
import { Link } from 'wouter';
import { ArrowRight, Heart, Sparkles, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

// Helper function to render YouTube or regular media
function renderHeroMedia(url: string | null | undefined, mediaType: string | null | undefined, fallbackImage: string) {
  const effectiveUrl = url || fallbackImage;
  const isVideo = mediaType === 'video' || effectiveUrl.includes('youtube') || effectiveUrl.includes('youtu.be');
  
  if (isVideo && effectiveUrl) {
    // Check if it's a YouTube URL
    const youtubeMatch = effectiveUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (youtubeMatch) {
      const videoId = youtubeMatch[1];
      return (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1`}
          allow="autoplay; encrypted-media"
          allowFullScreen
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ 
            border: 'none',
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '177.78vh',
            height: '100vh',
            minWidth: '100%',
            minHeight: '56.25vw',
            transform: 'translate(-50%, -50%)',
            filter: 'grayscale(30%)'
          }}
        />
      );
    }
    // Regular video
    return (
      <video 
        autoPlay 
        loop 
        muted 
        playsInline 
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: 'grayscale(30%)' }}
      >
        <source src={effectiveUrl} type="video/mp4" />
      </video>
    );
  }
  // Image fallback
  return (
    <div 
      className="absolute inset-0 bg-cover bg-center"
      style={{ 
        backgroundImage: `url(${effectiveUrl})`,
        filter: 'grayscale(30%)'
      }}
    />
  );
}

export default function Noivas() {
  const { products, posts, branding } = useProducts();
  
  const bridalProducts = products.filter(p => 
    p.name?.toLowerCase().includes('noiva') || 
    p.name?.toLowerCase().includes('wedding') ||
    p.name?.toLowerCase().includes('bridal') ||
    p.categoryId === 1
  ).slice(0, 6);
  
  const bridalPosts = posts.filter(p => 
    p.category?.toLowerCase().includes('noiva') ||
    p.title?.toLowerCase().includes('noiva') ||
    p.category?.toLowerCase().includes('casamento')
  );

  return (
    <div className="min-h-screen bg-background">
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-background z-10" />
        {renderHeroMedia(branding.noivasMediaUrl, branding.noivasMediaType, branding.journalHeroImage || '/placeholder-bridal.jpg')}
        <motion.div 
          className="relative z-20 text-center text-white px-6 max-w-4xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          <div className="flex justify-center mb-6">
            <Crown className="w-12 h-12 text-white/80" />
          </div>
          <h1 className="font-display text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter mb-6">
            Noivas
          </h1>
          <p className="font-mono text-sm md:text-base uppercase tracking-[0.3em] text-white/80 mb-8">
            Joias exclusivas para o dia mais especial
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/shop?category=rings">
              <Button 
                variant="outline" 
                className="rounded-none border-white text-white hover:bg-white hover:text-black px-8 py-6 text-xs uppercase tracking-widest"
                data-testid="button-shop-rings"
              >
                Ver Alianças <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button 
                variant="outline" 
                className="rounded-none border-white text-white hover:bg-white hover:text-black px-8 py-6 text-xs uppercase tracking-widest"
                data-testid="button-contact-bridal"
              >
                Agendar Consulta <Heart className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="py-24 bg-background">
        <div className="container mx-auto px-6 md:px-12">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Sparkles className="w-8 h-8 mx-auto mb-6 text-muted-foreground" />
            <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tighter mb-4">
              Coleção Noivas
            </h2>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground max-w-xl mx-auto">
              Peças únicas criadas para eternizar momentos inesquecíveis
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-16">
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h3 className="font-display text-3xl tracking-tight">Atendimento Personalizado</h3>
              <p className="text-muted-foreground leading-relaxed">
                Cada noiva é única, e sua joia deve refletir sua essência. Oferecemos 
                consultoria exclusiva para criar peças sob medida que contam a sua história de amor.
              </p>
              <ul className="space-y-3 font-mono text-sm">
                <li className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 bg-black rounded-full" />
                  Alianças personalizadas
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 bg-black rounded-full" />
                  Anéis de noivado exclusivos
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 bg-black rounded-full" />
                  Joias para cerimônia
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 bg-black rounded-full" />
                  Presentes para madrinhas
                </li>
              </ul>
            </motion.div>
            <motion.div 
              className="aspect-[4/5] bg-secondary overflow-hidden"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <img 
                src={bridalProducts[0]?.image || branding.journalHeroImage}
                alt="Coleção Noivas"
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {bridalProducts.length > 0 && (
        <section className="py-24 bg-secondary/30">
          <div className="container mx-auto px-6 md:px-12">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tighter">
                  Peças para Noivas
                </h2>
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mt-2">
                  Seleção especial
                </p>
              </div>
              <Link href="/shop">
                <Button variant="ghost" className="text-xs uppercase tracking-widest" data-testid="link-view-all-bridal">
                  Ver Todos <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {bridalProducts.map((product) => (
                <Link key={product.id} href={`/product/${product.id}`}>
                  <motion.div 
                    className="group cursor-pointer"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    data-testid={`card-product-${product.id}`}
                  >
                    <div className="aspect-square bg-secondary overflow-hidden mb-4">
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                    <h3 className="font-display text-lg mb-1">{product.name}</h3>
                    <p className="font-mono text-sm text-muted-foreground">
                      {(product.price / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {bridalPosts.length > 0 && (
        <section className="py-24">
          <div className="container mx-auto px-6 md:px-12">
            <div className="text-center mb-12">
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tighter mb-4">
                Journal: Noivas
              </h2>
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Inspirações e histórias para o grande dia
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {bridalPosts.slice(0, 3).map((post) => (
                <Link key={post.id} href={`/journal/${post.id}`}>
                  <motion.div 
                    className="group cursor-pointer"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    data-testid={`card-post-${post.id}`}
                  >
                    <div className="aspect-[4/5] bg-secondary overflow-hidden mb-4">
                      <img 
                        src={post.image} 
                        alt={post.title}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      />
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                      {post.category} • {post.date}
                    </div>
                    <h3 className="font-display text-xl group-hover:underline underline-offset-4">
                      {post.title}
                    </h3>
                  </motion.div>
                </Link>
              ))}
            </div>
            
            <div className="text-center mt-12">
              <Link href="/journal?category=noivas">
                <Button variant="outline" className="rounded-none px-8" data-testid="link-view-all-bridal-posts">
                  Ver Mais no Journal <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="py-24 bg-black text-white">
        <div className="container mx-auto px-6 md:px-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Heart className="w-10 h-10 mx-auto mb-8 text-white/60" />
            <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tighter mb-6">
              Agende sua Consulta
            </h2>
            <p className="font-mono text-sm uppercase tracking-widest text-white/60 max-w-xl mx-auto mb-8">
              Venha conhecer nossa coleção exclusiva e receba atendimento personalizado 
              para criar a joia perfeita para o seu casamento.
            </p>
            <Link href="/contact">
              <Button 
                variant="outline" 
                className="rounded-none border-white text-white hover:bg-white hover:text-black px-12 py-6 text-xs uppercase tracking-widest"
                data-testid="button-schedule-consultation"
              >
                Entrar em Contato <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
