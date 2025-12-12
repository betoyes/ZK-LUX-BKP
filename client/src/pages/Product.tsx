import { useState, useEffect } from 'react';
import { useRoute, Link } from 'wouter';
import { useProducts } from '@/context/ProductContext';
import { Button } from '@/components/ui/button';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, Plus, ArrowRight, Ruler } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Product() {
  const [match, params] = useRoute('/product/:id');
  const { products, categories, collections } = useProducts();
  const { toast } = useToast();
  const [mainImage, setMainImage] = useState('');
  const [selectedVersion, setSelectedVersion] = useState(1);
  
  if (!match) return null;

  const product = products.find(p => p.id === parseInt(params.id));
  
  // Check if product is a ring
  const isRing = product && (
    categories.find(c => c.id === product.categoryId)?.name?.toLowerCase().includes('anel') ||
    categories.find(c => c.id === product.categoryId)?.name?.toLowerCase().includes('anéis')
  );

  // Build versions for rings - use main image and gallery images as different versions
  const ringVersions = product ? [
    { version: 1, image: product.imageColor || product.image, name: 'Versão 1' },
    { version: 2, image: product.gallery?.[0] || product.image, name: 'Versão 2' },
    { version: 3, image: product.gallery?.[1] || product.gallery?.[0] || product.image, name: 'Versão 3' },
  ] : [];

  useEffect(() => {
    if (product) {
      if (isRing && ringVersions[selectedVersion - 1]) {
        setMainImage(ringVersions[selectedVersion - 1].image);
      } else {
        setMainImage(product.imageColor || product.image);
      }
    }
  }, [product, selectedVersion]);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 bg-background text-foreground">
        <h1 className="font-display text-2xl">Artefato Não Encontrado</h1>
        <Link href="/shop"><Button variant="outline">Voltar ao Arquivo</Button></Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    toast({
      title: "Adicionado à Sacola",
      description: `${product.name} foi reservado.`,
    });
  };

  // Get related products (same category, excluding current)
  const relatedProducts = products
    .filter(p => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, 3);

  // All images for carousel (Main + Gallery)
  const allImages = [
    product.imageColor || product.image,
    ...(product.gallery || [])
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-background pt-32 pb-24">
      <div className="container mx-auto px-6 md:px-12">
        <div className="mb-12">
           <Link href="/shop" className="group inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" /> Voltar ao Arquivo
           </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 mb-32">
          {/* Product Image - Sticky on Desktop */}
          <div className="lg:col-span-7 relative">
             <div className="sticky top-32 space-y-6">
               <div className="aspect-[3/4] bg-secondary overflow-hidden">
                 <img 
                  src={mainImage || product.imageColor || product.image} 
                  alt={product.name} 
                  className="w-full h-full object-cover transition-opacity duration-300"
                />
               </div>
               
               {/* Small Carousel / Thumbnails */}
               {allImages.length > 1 && (
                 <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                   {allImages.map((img, idx) => (
                     <button 
                        key={idx} 
                        onClick={() => setMainImage(img)}
                        className={`shrink-0 w-24 aspect-[3/4] bg-secondary overflow-hidden border transition-all snap-start ${
                          mainImage === img ? 'border-black ring-1 ring-black opacity-100' : 'border-transparent hover:border-gray-300 opacity-70 hover:opacity-100'
                        }`}
                     >
                       <img 
                        src={img} 
                        alt={`${product.name} thumbnail ${idx + 1}`} 
                        className="w-full h-full object-cover"
                      />
                     </button>
                   ))}
                 </div>
               )}
             </div>
          </div>

          {/* Product Details */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="border-t border-black pt-4 mb-8">
              <div className="flex justify-between items-start mb-4">
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Coleção {collections.find(c => c.id === product.collectionId)?.name || ''}
                </span>
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Ref. {product.id.toString().padStart(4, '0')}
                </span>
              </div>
              <h1 className="font-display text-5xl md:text-6xl font-medium tracking-tight mb-6 leading-none">{product.name}</h1>
              <p className="font-mono text-xl">R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>

            <p className="text-lg leading-relaxed mb-8 text-muted-foreground font-light">
              {product.description}
            </p>

            {/* Ring Version Selector - Only for rings */}
            {isRing && (
              <div className="mb-10">
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4 block">
                  Escolha sua versão
                </span>
                <div className="flex gap-3">
                  {ringVersions.map((v) => (
                    <button
                      key={v.version}
                      onClick={() => setSelectedVersion(v.version)}
                      className={`group relative flex-1 border transition-all duration-300 ${
                        selectedVersion === v.version 
                          ? 'border-black ring-1 ring-black' 
                          : 'border-border hover:border-black/50'
                      }`}
                    >
                      <div className="aspect-square overflow-hidden">
                        <img 
                          src={v.image} 
                          alt={v.name}
                          className={`w-full h-full object-cover transition-all duration-300 ${
                            selectedVersion === v.version ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
                          }`}
                        />
                      </div>
                      <div className={`absolute bottom-0 left-0 right-0 py-2 text-center font-mono text-[10px] uppercase tracking-widest transition-all ${
                        selectedVersion === v.version 
                          ? 'bg-black text-white' 
                          : 'bg-white/90 text-muted-foreground group-hover:bg-black/10'
                      }`}>
                        {v.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-6 mb-16">
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  size="lg" 
                  className="w-full rounded-none h-16 bg-transparent border border-black text-black hover:bg-black hover:text-white font-mono text-xs uppercase tracking-widest flex items-center justify-center px-8"
                  onClick={handleAddToCart}
                >
                  <span>Adicionar à Sacola</span>
                </Button>
                <Link href="/checkout">
                  <Button 
                    size="lg" 
                    className="w-full rounded-none h-16 bg-black text-white hover:bg-primary font-mono text-xs uppercase tracking-widest flex items-center justify-between px-8"
                  >
                    <span>Comprar Agora</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              
              {/* Ring Size Guide Button - Only for rings */}
              {isRing ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="w-full flex items-center justify-center gap-2 py-3 text-muted-foreground hover:text-foreground transition-colors font-mono text-xs uppercase tracking-widest border-b border-border hover:border-foreground">
                      <Ruler className="h-4 w-4" />
                      Tabela de Medidas
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="font-display text-2xl md:text-3xl tracking-tight">
                        Guia de Medidas para Anéis
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <p className="text-muted-foreground leading-relaxed">
                        A tabela abaixo foi desenvolvida para ajudá-lo(a) a identificar, de forma prática, o diâmetro aproximado do seu anel em centímetros, e seu número correspondente. Para uma medição precisa, recomendamos visitar uma de nossas lojas. Vale lembrar que o tamanho dos dedos pode variar entre as mãos.
                      </p>
                      
                      <div className="space-y-4">
                        <h3 className="font-display text-lg font-medium">Siga os 3 passos abaixo:</h3>
                        <ol className="space-y-3 text-muted-foreground">
                          <li className="flex gap-3">
                            <span className="font-mono text-xs bg-foreground text-background w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">1</span>
                            <span>Posicione um anel que se ajuste confortavelmente ao seu dedo sobre uma folha de papel e desenhe a parte interna do aro, contornando a circunferência com precisão.</span>
                          </li>
                          <li className="flex gap-3">
                            <span className="font-mono text-xs bg-foreground text-background w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">2</span>
                            <span>Com o auxílio de uma régua, trace uma linha reta de um extremo ao outro da circunferência, passando exatamente pelo centro — esta será a medida do diâmetro interno.</span>
                          </li>
                          <li className="flex gap-3">
                            <span className="font-mono text-xs bg-foreground text-background w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">3</span>
                            <span>Compare a medida em centímetros com os valores da tabela e descubra o número correspondente ao seu anel.</span>
                          </li>
                        </ol>
                      </div>

                      <div className="border-t border-border pt-6">
                        <h3 className="font-display text-lg font-medium mb-4">Tabela de Conversão</h3>
                        <div className="grid grid-cols-3 gap-x-8 gap-y-2 font-mono text-sm">
                          <div className="text-muted-foreground">1,52 cm = <span className="text-foreground">Aro 11</span></div>
                          <div className="text-muted-foreground">1,56 cm = <span className="text-foreground">Aro 12</span></div>
                          <div className="text-muted-foreground">1,59 cm = <span className="text-foreground">Aro 13</span></div>
                          
                          <div className="text-muted-foreground">1,62 cm = <span className="text-foreground">Aro 14</span></div>
                          <div className="text-muted-foreground">1,65 cm = <span className="text-foreground">Aro 15</span></div>
                          <div className="text-muted-foreground">1,69 cm = <span className="text-foreground">Aro 16</span></div>
                          
                          <div className="text-muted-foreground">1,73 cm = <span className="text-foreground">Aro 17</span></div>
                          <div className="text-muted-foreground">1,76 cm = <span className="text-foreground">Aro 18</span></div>
                          <div className="text-muted-foreground">1,80 cm = <span className="text-foreground">Aro 19</span></div>
                          
                          <div className="text-muted-foreground">1,83 cm = <span className="text-foreground">Aro 20</span></div>
                          <div className="text-muted-foreground">1,86 cm = <span className="text-foreground">Aro 21</span></div>
                          <div className="text-muted-foreground">1,90 cm = <span className="text-foreground">Aro 22</span></div>
                          
                          <div className="text-muted-foreground">1,93 cm = <span className="text-foreground">Aro 23</span></div>
                          <div className="text-muted-foreground">1,96 cm = <span className="text-foreground">Aro 24</span></div>
                          <div className="text-muted-foreground">1,99 cm = <span className="text-foreground">Aro 25</span></div>
                          
                          <div className="text-muted-foreground">2,03 cm = <span className="text-foreground">Aro 26</span></div>
                          <div className="text-muted-foreground">2,06 cm = <span className="text-foreground">Aro 27</span></div>
                          <div className="text-muted-foreground">2,09 cm = <span className="text-foreground">Aro 28</span></div>
                          
                          <div className="text-muted-foreground">2,13 cm = <span className="text-foreground">Aro 29</span></div>
                          <div className="text-muted-foreground">2,16 cm = <span className="text-foreground">Aro 30</span></div>
                          <div className="text-muted-foreground">2,20 cm = <span className="text-foreground">Aro 31</span></div>
                          
                          <div className="text-muted-foreground">2,24 cm = <span className="text-foreground">Aro 32</span></div>
                          <div className="text-muted-foreground">2,27 cm = <span className="text-foreground">Aro 33</span></div>
                          <div className="text-muted-foreground">2,30 cm = <span className="text-foreground">Aro 34</span></div>
                          
                          <div className="text-muted-foreground">2,33 cm = <span className="text-foreground">Aro 35</span></div>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : null}
              
              <div className="font-mono text-[10px] uppercase tracking-widest text-center text-muted-foreground">
                Envio Global Grátis • Garantia Vitalícia
              </div>
            </div>

            {/* Technical Details Accordion */}
            <div className="border-t border-border">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="details" className="border-b border-border">
                  <AccordionTrigger className="font-mono text-xs uppercase tracking-widest py-6 hover:no-underline">Especificações Técnicas</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground font-light pb-6">
                    <ul className="space-y-2">
                      {product.specs && product.specs.length > 0 ? (
                        product.specs.map((spec, idx) => (
                          <li key={idx}>{spec}</li>
                        ))
                      ) : (
                        <>
                          <li>Material: Ouro 18K Sólido</li>
                          <li>Gema: Diamante Certificado Livre de Conflitos</li>
                          <li>Peso: Aprox. 5g</li>
                          <li>Origem: Feito à mão na Itália</li>
                        </>
                      )}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="shipping" className="border-b border-border">
                  <AccordionTrigger className="font-mono text-xs uppercase tracking-widest py-6 hover:no-underline">Envio e Devoluções</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground font-light pb-6">
                    Envio expresso gratuito para todo o mundo. Aceitamos devoluções em até 14 dias após a entrega, na condição original.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="border-t border-border pt-24">
            <h2 className="font-display text-3xl mb-12">Você também pode gostar</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedProducts.map((related) => (
                <Link key={related.id} href={`/product/${related.id}`} className="group cursor-pointer block">
                  <div className="aspect-[3/4] bg-secondary overflow-hidden mb-4 relative">
                    <img 
                      src={related.image} 
                      alt={related.name}
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105 grayscale group-hover:grayscale-0"
                    />
                  </div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-display text-lg leading-none mb-1 group-hover:underline underline-offset-4 decoration-1">{related.name}</h3>
                    <p className="font-mono text-xs">R$ {related.price.toLocaleString('pt-BR')}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
