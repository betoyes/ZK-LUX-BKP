import { motion } from 'framer-motion';
import claudioImg from '@assets/Claudio-01_1764351367392.png';
import { ArrowDown } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero / Manifesto Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* Image Side */}
        <div className="relative h-[80vh] lg:h-screen order-1 lg:order-2 bg-black overflow-hidden">
          <motion.div 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="w-full h-full"
          >
            <img 
              src={claudioImg} 
              alt="Claudio Rezk" 
              className="w-full h-full object-cover object-top grayscale contrast-125"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent lg:hidden" />
          </motion.div>
          
          <div className="absolute bottom-8 left-8 lg:hidden text-white">
            <p className="font-mono text-xs uppercase tracking-widest mb-2">O Visionário</p>
            <h2 className="font-display text-4xl">Claudio Rezk</h2>
          </div>
        </div>

        {/* Content Side */}
        <div className="order-2 lg:order-1 flex flex-col justify-center p-8 md:p-20 lg:p-32 bg-background relative">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground mb-8 block">
              Manifesto
            </span>
            
            <h1 className="font-display text-6xl md:text-8xl font-bold tracking-tighter leading-[0.9] mb-12">
              A Alma <br/> da Matéria
            </h1>

            <div className="space-y-8 font-light text-lg md:text-xl leading-relaxed max-w-md text-muted-foreground">
              <p>
                "Joias não são apenas adornos. São arquitetura para o corpo, memórias forjadas em metal e luz."
              </p>
              <p>
                Fundada em 1985, a <strong className="text-foreground font-medium">ZK REZK</strong> nasceu de uma obsessão: transcender o tradicional. Sob a direção criativa de Claudio Rezk, unimos a precisão da engenharia com a fluidez da arte contemporânea.
              </p>
              <p>
                Não seguimos tendências. Criamos o futuro da alta joalheria, peça por peça, desafiando os limites do que o ouro e os diamantes podem expressar.
              </p>
            </div>

            <div className="mt-20 hidden lg:block">
              <p className="font-display text-2xl mb-2">Claudio Rezk</p>
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Diretor Criativo & Fundador</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values Grid - Brutalist Style */}
      <section className="border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
          {[
            {
              title: "Essência",
              desc: "Minimalismo radical. Removemos o excesso para revelar a verdade do material."
            },
            {
              title: "Mestria",
              desc: "Artesanato do velho mundo, tecnologia do novo mundo. Precisão absoluta em cada mícron."
            },
            {
              title: "Legado",
              desc: "Peças criadas não para uma temporada, mas para atravessar gerações."
            }
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="p-12 md:p-16 hover:bg-secondary/20 transition-colors group"
            >
              <span className="font-mono text-xs text-muted-foreground mb-8 block">0{i + 1}</span>
              <h3 className="font-display text-3xl mb-6 group-hover:translate-x-2 transition-transform duration-500">{item.title}</h3>
              <p className="text-muted-foreground font-light leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
