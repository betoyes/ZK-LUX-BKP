import { useState, useEffect } from 'react';
import { useRoute, Link, useSearch } from 'wouter';
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
  DialogDescription,
} from '@/components/ui/dialog';
import { ArrowLeft, Plus, ArrowRight, Ruler, Gem } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import StoneSelector, { hasStoneVariations, getStonePrice, getStoneOptions, getStoneLabel } from '@/components/StoneSelector';

export default function Product() {
  const [match, params] = useRoute('/product/:id');
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const stoneFromUrl = urlParams.get('stone');
  
  const { products, categories, collections, addToCart } = useProducts();
  const { toast } = useToast();
  const [mainImage, setMainImage] = useState('');
  const [selectedVersion, setSelectedVersion] = useState(1);
  const [selectedStoneType, setSelectedStoneType] = useState(stoneFromUrl || 'main');

  const product = match ? products.find(p => p.id === parseInt(params.id)) : null;
  
  // Check if product has stone variations
  const productHasVariations = product ? hasStoneVariations(product) : false;

  // Build versions for all products - use version1, version2, version3 fields
  const productVersions = product ? [
    { version: 1, image: (product as any).version1 || product.imageColor || product.image, name: 'Versão 1' },
    { version: 2, image: (product as any).version2 || (product.gallery as any)?.[0] || product.image, name: 'Versão 2' },
    { version: 3, image: (product as any).version3 || (product.gallery as any)?.[1] || product.image, name: 'Versão 3' },
  ] : [];
  
  // Check if product has versions or videos (show version selector for all products)
  const hasVersionsOrMedia = product && (
    (product as any).version1 || (product as any).version2 || (product as any).version3 ||
    (product as any).video || (product as any).video2
  );

  // Get current price based on stone type
  const getCurrentPrice = () => {
    if (!product) return 0;
    return getStonePrice(product, selectedStoneType);
  };

  // Get current description based on stone type
  const getCurrentDescription = () => {
    if (!product) return '';
    // For legacy variations, use specific descriptions
    if (selectedStoneType === 'synthetic' && (product as any).descriptionDiamondSynthetic) {
      return (product as any).descriptionDiamondSynthetic;
    }
    if (selectedStoneType === 'zirconia' && (product as any).descriptionZirconia) {
      return (product as any).descriptionZirconia;
    }
    // For dynamic variations, check if there's a description
    if (selectedStoneType.startsWith('var_') && product.stoneVariations) {
      try {
        const variations = typeof product.stoneVariations === 'string' 
          ? JSON.parse(product.stoneVariations) 
          : product.stoneVariations;
        const idx = parseInt(selectedStoneType.replace('var_', ''));
        if (variations[idx]?.description) {
          return variations[idx].description;
        }
      } catch (e) {}
    }
    return product.description;
  };

  // Get current specs based on stone type
  const getCurrentSpecs = (): string[] => {
    if (!product) return [];
    if (selectedStoneType === 'synthetic' && (product as any).specsDiamondSynthetic?.length) {
      return (product as any).specsDiamondSynthetic;
    }
    if (selectedStoneType === 'zirconia' && (product as any).specsZirconia?.length) {
      return (product as any).specsZirconia;
    }
    return (product.specs as string[]) || [];
  };

  useEffect(() => {
    if (product) {
      // Always use main product image as default, not version1
      setMainImage(product.image || product.imageColor || '');
    }
  }, [product]);
  
  // Separate effect for version changes (only when user clicks a version)
  const handleVersionChange = (version: number) => {
    setSelectedVersion(version);
    if (productVersions[version - 1]) {
      setMainImage(productVersions[version - 1].image);
    }
  };

  if (!match) return null;

  // Show loading while products are being fetched
  if (products.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 bg-background text-foreground">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-6 w-32 bg-muted rounded mb-4" />
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 bg-background text-foreground">
        <h1 className="font-display text-2xl">Artefato Não Encontrado</h1>
        <Link href="/shop"><Button variant="outline">Voltar ao Arquivo</Button></Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    addToCart(product.id, 1, selectedStoneType);
    toast({
      title: "Adicionado à Sacola",
      description: `${product.name} foi adicionado à sua sacola.`,
    });
  };

  // Get related products (same category, excluding current)
  const relatedProducts = products
    .filter(p => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, 3);

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
                  src={mainImage || product.image || product.imageColor} 
                  alt={product.name} 
                  loading="lazy"
                  className="w-full h-full object-cover transition-opacity duration-300"
                />
               </div>
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
              <p className="font-mono text-xl">R$ {((productHasVariations ? getCurrentPrice() : product.price) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>

            <p className="text-lg leading-relaxed mb-8 text-muted-foreground font-light">
              {productHasVariations ? getCurrentDescription() : product.description}
            </p>

            {/* Technical Specifications - Always visible */}
            <div className="mb-8 border-t border-border pt-6">
              <h3 className="font-mono text-xs uppercase tracking-widest mb-4">Especificações Técnicas</h3>
              <ul className="space-y-2 text-muted-foreground font-light">
                {(productHasVariations ? getCurrentSpecs() : ((product.specs as string[]) || [])).length > 0 ? (
                  (productHasVariations ? getCurrentSpecs() : ((product.specs as string[]) || [])).map((spec: string, idx: number) => (
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
            </div>

            {/* Stone Type Selector - Dynamic */}
            {productHasVariations && (
              <div className="mb-8">
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3 block flex items-center gap-2">
                  <Gem className="h-3 w-3" /> Tipo de Pedra
                </span>
                <StoneSelector
                  product={product}
                  value={selectedStoneType}
                  onChange={setSelectedStoneType}
                  size="lg"
                />
              </div>
            )}

            {/* Version Selector - Only show if product has versions or videos */}
            {hasVersionsOrMedia && (
            <div className="mb-10">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4 block">
                Escolha sua versão
              </span>
              
              {/* Row 1: Version Photos - only show versions that have unique images */}
              {(() => {
                const uniqueVersions = productVersions.filter((v, idx, arr) => {
                  if (idx === 0) return !!(product as any).version1;
                  if (idx === 1) return !!(product as any).version2;
                  if (idx === 2) return !!(product as any).version3;
                  return false;
                });
                if (uniqueVersions.length === 0) return null;
                const gridCols = uniqueVersions.length === 1 ? 'grid-cols-1' : uniqueVersions.length === 2 ? 'grid-cols-2' : 'grid-cols-3';
                return (
                  <div className={`grid ${gridCols} gap-3 mb-3`}>
                    {uniqueVersions.map((v) => (
                      <button
                        key={v.version}
                        onClick={() => handleVersionChange(v.version)}
                        className={`group relative border transition-all duration-300 ${
                          selectedVersion === v.version 
                            ? 'border-black ring-1 ring-black' 
                            : 'border-border hover:border-black/50'
                        }`}
                      >
                        <div className="aspect-square overflow-hidden">
                          <img 
                            src={v.image} 
                            alt={v.name}
                            loading="lazy"
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
                );
              })()}
              
              {/* Row 2: Main Photo + Videos - only show slots that have content */}
              {(() => {
                const hasVideo1 = !!(product as any).video;
                const hasVideo2 = !!(product as any).video2;
                const itemCount = 1 + (hasVideo1 ? 1 : 0) + (hasVideo2 ? 1 : 0);
                const gridCols = itemCount === 1 ? 'grid-cols-1' : itemCount === 2 ? 'grid-cols-2' : 'grid-cols-3';
                return (
                  <div className={`grid ${gridCols} gap-3`}>
                    {/* Main Photo */}
                    <button
                      onClick={() => setMainImage(product.image)}
                      className={`group relative border transition-all duration-300 ${
                        mainImage === product.image 
                          ? 'border-black ring-1 ring-black' 
                          : 'border-border hover:border-black/50'
                      }`}
                    >
                      <div className="aspect-square overflow-hidden">
                        <img 
                          src={product.image} 
                          alt="Principal"
                          loading="lazy"
                          className={`w-full h-full object-cover transition-all duration-300 ${
                            mainImage === product.image ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
                          }`}
                        />
                      </div>
                      <div className={`absolute bottom-0 left-0 right-0 py-2 text-center font-mono text-[10px] uppercase tracking-widest transition-all ${
                        mainImage === product.image 
                          ? 'bg-black text-white' 
                          : 'bg-white/90 text-muted-foreground group-hover:bg-black/10'
                      }`}>
                        Principal
                      </div>
                    </button>
                    
                    {/* Video 1 - only render if exists */}
                    {hasVideo1 && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <button className="group relative border border-border hover:border-black/50 transition-all duration-300">
                            <div className="aspect-square overflow-hidden bg-black flex items-center justify-center">
                              <div className="text-white text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-1 opacity-80 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 py-2 text-center font-mono text-[10px] uppercase tracking-widest bg-white/90 text-muted-foreground group-hover:bg-black/10 transition-all">
                              Vídeo 1
                            </div>
                          </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] p-0">
                          <DialogHeader className="sr-only">
                            <DialogTitle>Vídeo do Produto</DialogTitle>
                            <DialogDescription>Assistir vídeo do produto</DialogDescription>
                          </DialogHeader>
                          <div className="aspect-[9/16] w-full max-h-[85vh]">
                            <video
                              src={(product as any).video}
                              controls
                              autoPlay
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    
                    {/* Video 2 - only render if exists */}
                    {hasVideo2 && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <button className="group relative border border-border hover:border-black/50 transition-all duration-300">
                            <div className="aspect-square overflow-hidden bg-black flex items-center justify-center">
                              <div className="text-white text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-1 opacity-80 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 py-2 text-center font-mono text-[10px] uppercase tracking-widest bg-white/90 text-muted-foreground group-hover:bg-black/10 transition-all">
                              Vídeo 2
                            </div>
                          </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] p-0">
                          <DialogHeader className="sr-only">
                            <DialogTitle>Vídeo do Produto 2</DialogTitle>
                            <DialogDescription>Assistir segundo vídeo do produto</DialogDescription>
                          </DialogHeader>
                          <div className="aspect-[9/16] w-full max-h-[85vh]">
                            <video
                              src={(product as any).video2}
                              controls
                              autoPlay
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                );
              })()}
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
              {productHasVariations ? (
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
                      <DialogDescription className="sr-only">
                        Tabela de conversão e instruções para medir o tamanho do seu anel
                      </DialogDescription>
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

            {/* Additional Details Accordion */}
            <div className="border-t border-border">
              <Accordion type="single" collapsible className="w-full">
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
                      loading="lazy"
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105 grayscale group-hover:grayscale-0"
                    />
                  </div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-display text-lg leading-none mb-1 group-hover:underline underline-offset-4 decoration-1">{related.name}</h3>
                    <p className="font-mono text-xs">R$ {(related.price / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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
