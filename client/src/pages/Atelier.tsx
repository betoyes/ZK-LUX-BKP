import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { ArrowRight, Gem, Clock, Shield, Sparkles, Phone, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProducts } from '@/context/ProductContext';

function renderHeroMedia(url: string | null | undefined, mediaType: string | null | undefined) {
  if (!url) return null;
  
  const isVideo = mediaType === 'video' || url.includes('youtube') || url.includes('youtu.be');
  
  if (isVideo) {
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
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
            transform: 'translate(-50%, -50%)'
          }}
        />
      );
    }
    return (
      <video 
        autoPlay 
        loop 
        muted 
        playsInline 
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={url} type="video/mp4" />
      </video>
    );
  }
  
  return (
    <div 
      className="absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: `url(${url})` }}
    />
  );
}

export default function Atelier() {
  const { branding } = useProducts();
  const hasMedia = branding.atelierMediaUrl;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section with Video/Image Support */}
      <section className={`relative ${hasMedia ? 'h-screen' : 'min-h-[70vh]'} flex items-center justify-center overflow-hidden`}>
        {hasMedia && (
          <>
            <div className="absolute inset-0 bg-black/50 z-10" />
            {renderHeroMedia(branding.atelierMediaUrl, branding.atelierMediaType)}
          </>
        )}
        {!hasMedia && <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-transparent" />}
        
        <div className={`container mx-auto px-6 md:px-12 text-center relative z-20 ${hasMedia ? 'text-white' : ''} pt-32 pb-20`}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className={`font-mono text-xs uppercase tracking-[0.3em] ${hasMedia ? 'text-white/70' : 'text-muted-foreground'} mb-6 block`}>
              Nosso Processo
            </span>
            <h1 className="font-display text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter leading-[0.9] mb-8">
              Atelier
            </h1>
            <p className={`max-w-2xl mx-auto text-lg md:text-xl ${hasMedia ? 'text-white/80' : 'text-muted-foreground'} font-light leading-relaxed`}>
              Do esboço à peça finalizada, cada joia passa por um processo meticuloso que une 
              tradição artesanal e tecnologia de ponta.
            </p>
            {hasMedia && (
              <motion.div 
                className="mt-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <a href="#materiais" className="inline-flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-white/80 hover:text-white transition-colors">
                  Explorar <ArrowRight className="h-4 w-4" />
                </a>
              </motion.div>
            )}
          </motion.div>
        </div>
        
        {hasMedia && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
            <motion.div 
              animate={{ y: [0, 10, 0] }} 
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center pt-2"
            >
              <div className="w-1 h-2 bg-white/70 rounded-full" />
            </motion.div>
          </div>
        )}
      </section>

      {/* Stats Banner */}
      <section className="py-16 bg-black text-white">
        <div className="container mx-auto px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { number: "15+", label: "Anos de Experiência" },
              { number: "1.000+", label: "Joias Criadas" },
              { number: "100%", label: "Ouro 18K" },
              { number: "GIA", label: "Diamantes Certificados" }
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <span className="font-display text-4xl md:text-5xl font-bold block mb-2">{stat.number}</span>
                <span className="font-mono text-xs uppercase tracking-widest text-white/60">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Materiais Section - Full Width Image Layout */}
      <section className="py-24" id="materiais">
        <div className="container mx-auto px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4 block">01</span>
            <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Materiais Nobres
            </h2>
            <p className="max-w-2xl mx-auto text-muted-foreground font-light">
              Trabalhamos apenas com materiais de excelência, selecionados criteriosamente para garantir 
              durabilidade e beleza em cada peça.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Ouro 18K",
                subtitle: "750 - Padrão Internacional",
                desc: "75% de ouro puro, garantindo durabilidade superior sem comprometer o brilho característico do metal precioso.",
                icon: "✦"
              },
              {
                title: "Diamantes",
                subtitle: "Certificados GIA/IGI",
                desc: "Cada diamante acima de 0.30ct possui certificação internacional. Selecionamos apenas pedras livres de conflitos.",
                icon: "◇"
              },
              {
                title: "Gemas Preciosas",
                subtitle: "Origem Ética",
                desc: "Rubis, esmeraldas e safiras selecionadas por nossos gemólogos. Cores vivas e inclusões mínimas.",
                icon: "◆"
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="bg-secondary/10 p-10 border border-border hover:border-foreground/20 transition-all duration-300 group"
              >
                <span className="text-4xl mb-6 block opacity-30 group-hover:opacity-60 transition-opacity">{item.icon}</span>
                <h3 className="font-display text-2xl mb-2">{item.title}</h3>
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4 block">{item.subtitle}</span>
                <p className="text-muted-foreground font-light text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Processo Section - Horizontal Timeline */}
      <section className="py-24 bg-black text-white" id="processo">
        <div className="container mx-auto px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-white/60 mb-4 block">02</span>
            <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
              Do Esboço à Realidade
            </h2>
          </motion.div>
          
          <div className="relative">
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-px bg-white/20" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
              {[
                { step: "01", title: "Conceituação", desc: "Desenhos e renderizações 3D dão forma à visão inicial. Cada detalhe é planejado." },
                { step: "02", title: "Prototipagem", desc: "Modelos em cera ou impressão 3D permitem ajustes finos antes da fundição." },
                { step: "03", title: "Fundição", desc: "O ouro é fundido e moldado. Gemas são cravadas uma a uma por mestres ourives." },
                { step: "04", title: "Acabamento", desc: "Polimento, rodinagem e inspeção final garantem a perfeição da peça." }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="relative text-center lg:text-left"
                >
                  <div className="lg:absolute lg:-top-4 lg:left-0 w-8 h-8 bg-white text-black font-mono text-sm font-bold rounded-full flex items-center justify-center mx-auto lg:mx-0 mb-6 lg:mb-0">
                    {item.step}
                  </div>
                  <div className="lg:pt-12">
                    <h3 className="font-display text-2xl mb-4">{item.title}</h3>
                    <p className="text-white/60 font-light text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sob Medida Section */}
      <section className="py-24" id="sob-medida">
        <div className="container mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4 block">03</span>
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-8">
                Criação Sob Medida
              </h2>
              <p className="text-muted-foreground font-light leading-relaxed mb-8">
                Transformamos sua ideia em realidade. Seja um anel de noivado único, uma releitura 
                de joia de família ou uma peça completamente original.
              </p>
              
              <div className="space-y-4">
                {[
                  "Consulta inicial para entender seu desejo",
                  "Esboços e renderizações 3D para aprovação",
                  "Seleção de materiais com sua participação",
                  "Acompanhamento fotográfico de cada etapa",
                  "Certificado de autenticidade exclusivo"
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-2 h-2 bg-black rounded-full flex-shrink-0" />
                    <span className="font-light">{item}</span>
                  </motion.div>
                ))}
              </div>
              
              <Link href="/contact">
                <Button 
                  size="lg"
                  className="mt-10 rounded-none h-14 px-10 bg-black text-white hover:bg-black/80 font-mono text-xs uppercase tracking-widest"
                  data-testid="button-iniciar-projeto"
                >
                  Iniciar Projeto <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="aspect-square bg-secondary/20 flex items-center justify-center relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-transparent" />
              <Sparkles className="h-32 w-32 text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors duration-500" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Prazos Section */}
      <section className="py-24 bg-secondary/10" id="prazos">
        <div className="container mx-auto px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4 block">04</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
              Prazos de Produção
            </h2>
          </motion.div>
          
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { icon: Clock, title: "Peças em Estoque", time: "2-3 dias úteis", desc: "Após confirmação do pagamento" },
              { icon: Gem, title: "Produção Padrão", time: "15-25 dias úteis", desc: "Tamanho ou acabamento customizado" },
              { icon: Sparkles, title: "Sob Medida", time: "30-45 dias úteis", desc: "Projetos exclusivos e personalizados" },
              { icon: Shield, title: "Ajustes e Reparos", time: "5-10 dias úteis", desc: "Redimensionamento e polimento" }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-6 p-8 bg-background border border-border hover:border-foreground/20 transition-colors"
              >
                <item.icon className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                    <h3 className="font-display text-lg">{item.title}</h3>
                    <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{item.time}</span>
                  </div>
                  <p className="text-muted-foreground font-light text-sm">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Cuidados Section */}
      <section className="py-24" id="cuidados">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4 block">05</span>
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
                Cuidados com suas Joias
              </h2>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  title: "Armazenamento",
                  tips: ["Guarde cada peça separadamente", "Use porta-joias forrado", "Evite umidade excessiva"]
                },
                {
                  title: "Limpeza",
                  tips: ["Água morna com sabão neutro", "Escova de cerdas macias", "Revisão anual no atelier"]
                },
                {
                  title: "Evitar",
                  tips: ["Perfumes e produtos químicos", "Atividades físicas e piscina", "Impactos e quedas"]
                },
                {
                  title: "Revisão Anual",
                  tips: ["Verificação de engastes", "Polimento profissional", "100% gratuita para clientes"]
                }
              ].map((category, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-6 border border-border"
                >
                  <h3 className="font-display text-xl mb-4">{category.title}</h3>
                  <ul className="space-y-2">
                    {category.tips.map((tip, j) => (
                      <li key={j} className="flex items-center gap-3 text-muted-foreground font-light text-sm">
                        <span className="w-1 h-1 bg-foreground rounded-full" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-black text-white" id="contato">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-white/60 mb-6 block">
                Vamos Criar Juntos
              </span>
              <h2 className="font-display text-5xl md:text-6xl font-bold tracking-tight mb-8">
                Agende sua Consulta
              </h2>
              <p className="text-white/70 font-light text-lg mb-12 max-w-xl mx-auto">
                Converse com nossos especialistas para discutir seu projeto, tirar dúvidas ou 
                agendar uma visita ao atelier.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/contact">
                  <Button 
                    size="lg" 
                    className="rounded-none h-14 px-10 bg-white text-black hover:bg-white/90 font-mono text-xs uppercase tracking-widest"
                    data-testid="button-agendar-consulta"
                  >
                    Agendar Consulta
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                
                <a 
                  href="https://wa.me/5511999999999?text=Olá! Gostaria de saber mais sobre o atelier."
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="rounded-none h-14 px-10 border-white text-white hover:bg-white/10 font-mono text-xs uppercase tracking-widest"
                    data-testid="button-whatsapp-atelier"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Falar no WhatsApp
                  </Button>
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
