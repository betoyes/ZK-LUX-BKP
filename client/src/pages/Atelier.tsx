import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { ArrowRight, Gem, Clock, Shield, Sparkles, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Atelier() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="min-h-[70vh] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-transparent" />
        <div className="container mx-auto px-6 md:px-12 text-center relative z-10 pt-32 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground mb-6 block">
              Nosso Processo
            </span>
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-[0.9] mb-8">
              Atelier
            </h1>
            <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
              Do esboço à peça finalizada, cada joia passa por um processo meticuloso que une 
              tradição artesanal e tecnologia de ponta. Conheça o caminho que transforma 
              matéria-prima em arte.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Materiais Section */}
      <section className="border-t border-border py-24" id="materiais">
        <div className="container mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4 block">01</span>
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-8">
                Materiais Nobres
              </h2>
              <div className="space-y-6 text-muted-foreground font-light leading-relaxed">
                <p>
                  <strong className="text-foreground font-medium">Ouro 18K (750):</strong> Utilizamos 
                  exclusivamente ouro 18 quilates em todas as nossas peças. Essa liga contém 75% de 
                  ouro puro, garantindo durabilidade superior sem comprometer a riqueza do brilho 
                  característico do metal precioso.
                </p>
                <p>
                  <strong className="text-foreground font-medium">Diamantes Certificados:</strong> Cada 
                  diamante acima de 0.30ct possui certificação internacional (GIA, IGI ou equivalente). 
                  Selecionamos apenas pedras livres de conflitos, com rastreabilidade completa desde 
                  a origem.
                </p>
                <p>
                  <strong className="text-foreground font-medium">Gemas Preciosas:</strong> Rubis, 
                  esmeraldas e safiras são cuidadosamente selecionadas por nossos gemólogos. Priorizamos 
                  pedras de origem ética, com cores vivas e inclusões mínimas.
                </p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="aspect-[4/5] bg-secondary/20 flex items-center justify-center"
            >
              <Gem className="h-32 w-32 text-muted-foreground/30" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Processo Section */}
      <section className="border-t border-border py-24 bg-secondary/10" id="processo">
        <div className="container mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4 block">02</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
              Etapas do Processo
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                title: "Conceituação",
                desc: "Desenhos e renderizações 3D dão forma à visão inicial. Cada detalhe é planejado antes da execução."
              },
              {
                step: "02",
                title: "Prototipagem",
                desc: "Modelos em cera ou impressão 3D permitem ajustes finos antes da fundição em metal precioso."
              },
              {
                step: "03",
                title: "Fundição & Cravação",
                desc: "O ouro é fundido e moldado. Gemas são cravadas uma a uma por mestres ourives com décadas de experiência."
              },
              {
                step: "04",
                title: "Acabamento",
                desc: "Polimento, rodinagem (para ouro branco) e inspeção final garantem a perfeição de cada peça."
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-background p-8 border border-border hover:border-foreground/30 transition-colors group"
              >
                <span className="font-mono text-4xl font-bold text-muted-foreground/20 mb-4 block group-hover:text-muted-foreground/40 transition-colors">
                  {item.step}
                </span>
                <h3 className="font-display text-xl mb-4">{item.title}</h3>
                <p className="text-muted-foreground font-light text-sm leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Sob Medida Section */}
      <section className="border-t border-border py-24" id="sob-medida">
        <div className="container mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="aspect-[4/5] bg-secondary/20 flex items-center justify-center order-2 lg:order-1"
            >
              <Sparkles className="h-32 w-32 text-muted-foreground/30" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="order-1 lg:order-2"
            >
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4 block">03</span>
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-8">
                Criação Sob Medida
              </h2>
              <div className="space-y-6 text-muted-foreground font-light leading-relaxed">
                <p>
                  Transformamos sua ideia em realidade. Seja um anel de noivado único, uma releitura 
                  de joia de família ou uma peça completamente original, nosso atelier está preparado 
                  para criar exatamente o que você imagina.
                </p>
                <p>
                  <strong className="text-foreground font-medium">O processo inclui:</strong>
                </p>
                <ul className="space-y-3 ml-4">
                  <li className="flex items-start gap-3">
                    <span className="text-foreground mt-1">•</span>
                    <span>Consulta inicial para entender seu desejo e orçamento</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-foreground mt-1">•</span>
                    <span>Esboços e renderizações 3D para aprovação</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-foreground mt-1">•</span>
                    <span>Seleção de materiais com sua participação</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-foreground mt-1">•</span>
                    <span>Acompanhamento fotográfico de cada etapa</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-foreground mt-1">•</span>
                    <span>Certificado de autenticidade exclusivo</span>
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Prazos Section */}
      <section className="border-t border-border py-24 bg-secondary/10" id="prazos">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4 block">04</span>
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
                Prazos de Produção
              </h2>
            </div>
            
            <div className="space-y-6">
              {[
                {
                  icon: Clock,
                  title: "Peças em Estoque",
                  time: "2-3 dias úteis",
                  desc: "Após confirmação do pagamento, despachamos via transportadora com rastreamento."
                },
                {
                  icon: Gem,
                  title: "Produção Padrão",
                  time: "15-25 dias úteis",
                  desc: "Para peças que precisam ser confeccionadas no tamanho ou acabamento escolhido."
                },
                {
                  icon: Sparkles,
                  title: "Sob Medida / Personalizado",
                  time: "30-45 dias úteis",
                  desc: "Projetos exclusivos requerem mais tempo para garantir perfeição em cada detalhe."
                },
                {
                  icon: Shield,
                  title: "Ajustes e Reparos",
                  time: "5-10 dias úteis",
                  desc: "Redimensionamento de anéis, polimento e pequenos reparos."
                }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-6 p-6 bg-background border border-border hover:border-foreground/30 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <item.icon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <h3 className="font-display text-lg">{item.title}</h3>
                      <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                        {item.time}
                      </span>
                    </div>
                    <p className="text-muted-foreground font-light text-sm">
                      {item.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Cuidados Section */}
      <section className="border-t border-border py-24" id="cuidados">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4 block">05</span>
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
                Cuidados com suas Joias
              </h2>
            </div>
            
            <div className="space-y-8 text-muted-foreground font-light leading-relaxed">
              <div>
                <h3 className="font-display text-xl text-foreground mb-3">Armazenamento</h3>
                <p>
                  Guarde cada peça separadamente em porta-joias forrado ou nos estojos originais. 
                  Evite contato entre peças para prevenir arranhões. Mantenha longe de umidade excessiva.
                </p>
              </div>
              
              <div>
                <h3 className="font-display text-xl text-foreground mb-3">Limpeza</h3>
                <p>
                  Para limpeza doméstica, use água morna com sabão neutro e uma escova de cerdas 
                  macias. Seque completamente com pano macio. Para limpeza profissional, recomendamos 
                  revisão anual em nosso atelier.
                </p>
              </div>
              
              <div>
                <h3 className="font-display text-xl text-foreground mb-3">O que Evitar</h3>
                <ul className="space-y-2 ml-4">
                  <li>• Contato com perfumes, cremes e produtos químicos</li>
                  <li>• Uso durante atividades físicas, piscina ou praia</li>
                  <li>• Exposição prolongada ao sol (pode alterar gemas)</li>
                  <li>• Impactos e quedas (podem soltar engastes)</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-display text-xl text-foreground mb-3">Revisão Anual</h3>
                <p>
                  Oferecemos revisão gratuita uma vez ao ano. Verificamos engastes, polimento e 
                  integridade geral da peça. Agende pelo WhatsApp ou email.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border py-24 bg-black text-white" id="contato">
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
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-8">
                Agende sua Consulta
              </h2>
              <p className="text-white/70 font-light text-lg mb-12 max-w-xl mx-auto">
                Converse com nossos especialistas para discutir seu projeto, tirar dúvidas sobre 
                materiais ou agendar uma visita ao atelier.
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
                    <svg viewBox="0 0 24 24" className="h-4 w-4 mr-2 fill-current">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
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
