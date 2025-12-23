import { useState, useEffect } from 'react';
import { useRoute, Link, useSearch } from 'wouter';
import { useProducts } from '@/context/ProductContext';
import { Button } from '@/components/ui/button';
import { SEO, ProductSchema } from '@/components/SEO';
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
  
  // Check if product has actual versions (version1/2/3) - for showing version selector
  const hasRealVersions = product && (
    (product as any).version1 || (product as any).version2 || (product as any).version3
  );
  
  // Check if product has videos
  const hasVideos = product && (
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

  const productUrl = typeof window !== 'undefined' ? `${window.location.origin}/product/${product.id}` : '';
  const productImage = product.image?.startsWith('http') ? product.image : 
    typeof window !== 'undefined' ? `${window.location.origin}${product.image}` : product.image;
  const currentPrice = getCurrentPrice();
  const seoDescription = getCurrentDescription()?.slice(0, 160) || `${product.name} - Joia exclusiva ZK REZK em ouro 18K.`;

  return (
    <div className="min-h-screen bg-background pt-32 pb-24">
      <SEO
        title={product.name}
        description={seoDescription}
        image={productImage}
        url={productUrl}
        type="product"
        product={{
          name: product.name,
          description: seoDescription,
          image: productImage,
          price: currentPrice,
          currency: 'BRL',
          availability: 'InStock',
          sku: `ZK-${product.id.toString().padStart(4, '0')}`,
          brand: 'ZK REZK',
        }}
      />
      <ProductSchema
        name={product.name}
        description={seoDescription}
        image={productImage}
        price={currentPrice}
        currency="BRL"
        availability="InStock"
        sku={`ZK-${product.id.toString().padStart(4, '0')}`}
        brand="ZK REZK"
        url={productUrl}
      />
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

            {/* Version Selector - Only show if product has actual versions */}
            {hasRealVersions && (
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
            <div className="border-t border-border" data-testid="product-info-accordion">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="shipping" className="border-b border-border">
                  <AccordionTrigger className="font-mono text-xs uppercase tracking-widest py-6 hover:no-underline">
                    Envio e Devoluções
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground font-light pb-6 space-y-3">
                    <p>
                      Oferecemos envio expresso para todo o Brasil com rastreamento completo. 
                      Peças em estoque são despachadas em até 2 dias úteis.
                    </p>
                    <p>
                      Aceitamos devoluções em até 14 dias após a entrega, desde que a peça esteja 
                      na embalagem original e em perfeitas condições. O reembolso é processado 
                      em até 7 dias úteis após recebermos o produto.
                    </p>
                    <a 
                      href="https://wa.me/5511999999999?text=Olá! Tenho uma dúvida sobre envio ou devolução."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-foreground font-medium hover:underline underline-offset-4"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Falar no WhatsApp
                    </a>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="warranty" className="border-b border-border">
                  <AccordionTrigger className="font-mono text-xs uppercase tracking-widest py-6 hover:no-underline">
                    Garantia
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground font-light pb-6 space-y-3">
                    <p>
                      Todas as peças ZK REZK possuem garantia vitalícia contra defeitos de fabricação. 
                      Isso inclui problemas com soldas, engastes e acabamentos.
                    </p>
                    <p>
                      A garantia não cobre desgaste natural, arranhões de uso, danos por mau uso ou 
                      reparos realizados por terceiros. Recomendamos revisões anuais para manter 
                      sua joia sempre impecável.
                    </p>
                    <a 
                      href="https://wa.me/5511999999999?text=Olá! Preciso de suporte sobre garantia."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-foreground font-medium hover:underline underline-offset-4"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Falar no WhatsApp
                    </a>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="certification" className="border-b border-border">
                  <AccordionTrigger className="font-mono text-xs uppercase tracking-widest py-6 hover:no-underline">
                    Certificação e Procedência
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground font-light pb-6 space-y-3">
                    <p>
                      Utilizamos exclusivamente ouro 18K certificado e diamantes livres de conflitos, 
                      com rastreabilidade completa desde a origem até a peça finalizada.
                    </p>
                    <p>
                      Cada peça acompanha certificado de autenticidade com informações detalhadas 
                      sobre materiais, peso e especificações técnicas. Diamantes acima de 0.30ct 
                      possuem certificação internacional (GIA, IGI ou equivalente).
                    </p>
                    <p>
                      Nossos fornecedores seguem práticas de mineração responsável e são auditados 
                      regularmente para garantir conformidade ética e ambiental.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="production" className="border-b border-border">
                  <AccordionTrigger className="font-mono text-xs uppercase tracking-widest py-6 hover:no-underline">
                    Prazo de Produção e Ajustes
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground font-light pb-6 space-y-3">
                    <p>
                      <strong className="text-foreground">Peças em estoque:</strong> Envio em até 2 dias úteis após confirmação do pagamento.
                    </p>
                    <p>
                      <strong className="text-foreground">Produção sob encomenda:</strong> Prazo de 15 a 25 dias úteis, dependendo 
                      da complexidade da peça. Você receberá atualizações durante todo o processo.
                    </p>
                    <p>
                      <strong className="text-foreground">Ajustes de tamanho:</strong> Oferecemos o primeiro ajuste gratuito para 
                      anéis e pulseiras. Ajustes adicionais têm custo a partir de R$ 150, dependendo 
                      do tipo de peça e material.
                    </p>
                    <p>
                      <strong className="text-foreground">Gravações personalizadas:</strong> Disponíveis para a maioria das peças. 
                      Consulte antes de finalizar a compra.
                    </p>
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
