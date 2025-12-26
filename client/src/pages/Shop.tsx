import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useProducts } from '@/context/ProductContext';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { ArrowRight, Heart, ChevronDown, Sparkles } from 'lucide-react';
import StoneSelector, { hasStoneVariations, getStonePrice } from '@/components/StoneSelector';

export default function Shop() {
  const { products, categories, collections, wishlist, toggleWishlist, isLoading } = useProducts();
  const [location] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const initialCategory = urlParams.get('category') || 'all';
  const initialCollection = urlParams.get('collection') || '';
  const searchQuery = urlParams.get('search') || '';

  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategory === 'all' ? [] : [initialCategory]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>(initialCollection ? [initialCollection] : []);
  const [priceRange, setPriceRange] = useState([0, 500000]);
  const [sortOption, setSortOption] = useState('newest');
  const [selectedStoneTypes, setSelectedStoneTypes] = useState<Record<number, string>>({});
  const [showNoivasSection, setShowNoivasSection] = useState(true);
  
  // Check if "Noivas" filter is active
  const isNoivasActive = selectedCategories.includes('noivas');

  // Get price based on selected stone type
  const getProductPrice = (product: any) => {
    const stoneId = selectedStoneTypes[product.id] || 'main';
    return getStonePrice(product, stoneId);
  };

  // Update selected categories if URL changes
  useEffect(() => {
    if (initialCategory !== 'all' && !selectedCategories.includes(initialCategory)) {
      setSelectedCategories([initialCategory]);
    }
  }, [initialCategory]);

  // Update selected collections if URL changes
  useEffect(() => {
    if (initialCollection && !selectedCollections.includes(initialCollection)) {
      setSelectedCollections([initialCollection]);
    }
  }, [initialCollection]);

  const filteredProducts = (Array.isArray(products) ? products : []).filter(product => {
    // Search Filter
    if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Category Filter - compare by slug or ID
    const productCategory = categories.find(c => c.id === product.categoryId);
    const categoryMatch = selectedCategories.length === 0 || 
      (productCategory && selectedCategories.includes(productCategory.slug || String(productCategory.id)));
    
    // Collection Filter - compare by ID
    const collectionMatch = selectedCollections.length === 0 || 
      selectedCollections.includes(String(product.collectionId));
    
    // Price Filter - priceRange is in reais, product.price is in centavos
    const priceInReais = product.price / 100;
    const priceMatch = priceInReais >= priceRange[0] && priceInReais <= priceRange[1];
    
    return categoryMatch && collectionMatch && priceMatch;
  }).sort((a, b) => {
    if (sortOption === 'price-asc') return a.price - b.price;
    if (sortOption === 'price-desc') return b.price - a.price;
    if (sortOption === 'newest') return (a.isNew === b.isNew) ? 0 : a.isNew ? -1 : 1;
    return 0;
  });

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleCollection = (id: string) => {
    setSelectedCollections(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedCollections([]);
    setPriceRange([0, 500000]);
    setSortOption('newest');
    window.history.pushState({}, '', '/shop'); // Clear URL params
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-32 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-mono text-sm text-muted-foreground uppercase tracking-widest">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-32">
      <div className="container mx-auto px-6 md:px-12 pb-24">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-border pb-8">
          <div>
             <h1 className="font-display text-6xl md:text-8xl font-bold tracking-tighter mb-4">Store</h1>
             {searchQuery && (
               <p className="font-mono text-sm text-muted-foreground mb-2">
                 Resultados para "{searchQuery}"
               </p>
             )}
             <p className="font-mono text-sm text-muted-foreground uppercase tracking-widest max-w-md">Seleção curada de jóias para pessoas com bom gosto.</p>
          </div>
          <div className="flex flex-col items-end gap-4">
            <div className="font-mono text-xs mb-2" data-testid="product-count">
              {filteredProducts.length} ITENS
            </div>
            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger className="w-[180px] rounded-none border-black">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Mais Recentes</SelectItem>
                <SelectItem value="price-asc">Menor Preço</SelectItem>
                <SelectItem value="price-desc">Maior Preço</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* NOIVAS Section Banner - Layout Preview */}
        {showNoivasSection && !isNoivasActive && (
          <motion.div 
            className="mb-12 relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-gradient-to-r from-rose-50 via-white to-rose-50 border border-rose-200/50 p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 flex items-center justify-center bg-rose-100/50 rounded-full">
                    <Sparkles className="w-8 h-8 text-rose-400" />
                  </div>
                  <div>
                    <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tighter mb-2">
                      Coleção Noivas
                    </h2>
                    <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                      Alianças e joias exclusivas para o seu grande dia
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    className="rounded-none border-rose-300 hover:bg-rose-50"
                    onClick={() => {
                      toggleCategory('noivas');
                      setShowNoivasSection(false);
                    }}
                    data-testid="button-filter-noivas"
                  >
                    Ver Produtos para Noivas
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Link href="/noivas">
                    <Button className="rounded-none bg-black hover:bg-black/90" data-testid="button-noivas-page">
                      Página Noivas
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setShowNoivasSection(false)} 
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Fechar"
            >
              <span className="font-mono text-xs">×</span>
            </button>
          </motion.div>
        )}

        {/* Active Noivas Filter Banner */}
        {isNoivasActive && (
          <motion.div 
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-gradient-to-r from-rose-100 via-rose-50 to-rose-100 border border-rose-200 p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <Sparkles className="w-6 h-6 text-rose-500" />
                  <div>
                    <h3 className="font-display text-2xl font-bold tracking-tight">
                      Exibindo: Produtos para Noivas
                    </h3>
                    <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                      Coleção especial com peças exclusivas para casamentos
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Link href="/noivas">
                    <Button variant="outline" className="rounded-none border-rose-300 hover:bg-rose-50">
                      Ver Página Noivas
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    className="rounded-none"
                    onClick={() => {
                      toggleCategory('noivas');
                      setShowNoivasSection(true);
                    }}
                  >
                    Limpar Filtro
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div className="flex flex-col lg:flex-row gap-16">
          {/* Sidebar Filters */}
          <div className="w-full lg:w-64 space-y-12 sticky top-32 h-fit bg-background z-10">
            {/* Categories */}
            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest mb-6 text-muted-foreground">Categorias</h3>
              <div className="space-y-3">
                {/* Special Noivas Category - Layout Preview */}
                <div className={`flex items-center space-x-3 p-2 -mx-2 rounded transition-colors ${isNoivasActive ? 'bg-rose-100' : 'hover:bg-rose-50'}`}>
                  <Checkbox 
                    id="cat-noivas"
                    checked={isNoivasActive}
                    onCheckedChange={() => {
                      toggleCategory('noivas');
                      setShowNoivasSection(!isNoivasActive);
                    }}
                    className="rounded-none border-rose-300 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
                  />
                  <label
                    htmlFor="cat-noivas"
                    className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-rose-400" />
                    Noivas
                  </label>
                </div>
                
                {/* Separator */}
                <div className="border-b border-border my-2" />
                
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center space-x-3">
                    <Checkbox 
                      id={`cat-${cat.id}`} 
                      checked={selectedCategories.includes(cat.slug || String(cat.id))}
                      onCheckedChange={() => toggleCategory(cat.slug || String(cat.id))}
                      className="rounded-none"
                    />
                    <label
                      htmlFor={`cat-${cat.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer capitalize"
                    >
                      {cat.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Collections */}
            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest mb-6 text-muted-foreground">Coleções</h3>
              <div className="space-y-3">
                {collections.map(col => (
                  <div key={col.id} className="flex items-center space-x-3">
                    <Checkbox 
                      id={`col-${col.id}`} 
                      checked={selectedCollections.includes(String(col.id))}
                      onCheckedChange={() => toggleCollection(String(col.id))}
                      className="rounded-none"
                    />
                    <label
                      htmlFor={`col-${col.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {col.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest mb-6 text-muted-foreground">Faixa de Preço</h3>
              <div className="space-y-6">
                <Slider 
                  defaultValue={[0, 500000]} 
                  max={500000} 
                  step={1000}
                  value={priceRange}
                  onValueChange={setPriceRange}
                  className="py-4"
                />
                <div className="flex justify-between font-mono text-xs">
                  <span>R$ {priceRange[0].toLocaleString()}</span>
                  <span>R$ {priceRange[1].toLocaleString()}+</span>
                </div>
              </div>
            </div>
            
            <Button variant="outline" onClick={clearFilters} className="w-full rounded-none uppercase tracking-widest font-mono text-xs">
              Limpar Filtros
            </Button>
          </div>

          {/* Product Grid */}
          <div className="flex-1">
            {filteredProducts.length === 0 ? (
              <div className="py-20 text-center border-t border-b border-border">
                <p className="font-display text-2xl mb-4">Nenhum artefato encontrado.</p>
                <Button variant="link" onClick={clearFilters} className="font-mono text-xs uppercase tracking-widest">
                  Limpar Filtros
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-16">
                {filteredProducts.map((product, idx) => {
                  const stoneId = selectedStoneTypes[product.id] || 'main';
                  const productUrl = stoneId !== 'main' ? `/product/${product.id}?stone=${stoneId}` : `/product/${product.id}`;
                  return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={product.id} 
                    className="group cursor-pointer relative"
                  >
                    {/* Quick Wishlist Action */}
                    <button 
                       onClick={(e) => { e.preventDefault(); toggleWishlist(product.id); }}
                       className={`absolute top-4 right-4 z-20 p-2 transition-colors rounded-none ${wishlist.includes(product.id) ? 'bg-black text-white' : 'bg-white/80 backdrop-blur-sm hover:bg-black hover:text-white'}`}
                    >
                      <Heart className={`h-4 w-4 ${wishlist.includes(product.id) ? 'fill-white' : 'fill-none'}`} />
                    </button>

                    <Link href={productUrl}>
                      <div className="relative aspect-[3/4] bg-secondary overflow-hidden mb-6">
                        {(() => {
                          const category = categories.find(c => c.id === product.categoryId);
                          const isNoivas = isNoivasActive || category?.slug === 'noivas' || category?.name?.toLowerCase() === 'noivas';
                          const hasColorImage = product.imageColor && product.image !== product.imageColor;
                          
                          const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
                            e.currentTarget.style.display = 'none';
                          };
                          
                          if (isNoivas) {
                            return (
                              <img 
                                src={hasColorImage ? product.imageColor : product.image} 
                                alt={product.name}
                                loading="lazy"
                                onError={handleImageError}
                                className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                              />
                            );
                          }
                          
                          return (
                            <>
                              <img 
                                src={product.image} 
                                alt={product.name}
                                loading="lazy"
                                onError={handleImageError}
                                className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 grayscale ${!hasColorImage ? 'group-hover:grayscale-0' : ''}`}
                              />
                              {hasColorImage && (
                                <img 
                                  src={product.imageColor} 
                                  alt={product.name}
                                  loading="lazy"
                                  onError={handleImageError}
                                  className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-105 opacity-0 group-hover:opacity-100"
                                />
                              )}
                            </>
                          );
                        })()}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                        
                        {/* Hover Overlay - Ver Detalhes button */}
                        <div className="absolute bottom-0 left-0 w-full p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="bg-white/10 backdrop-blur-md border border-white/20 text-white py-3 px-4 flex justify-between items-center">
                            <span className="font-mono text-xs uppercase tracking-widest">Ver Detalhes</span>
                            <ArrowRight className="h-3 w-3" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-start border-b border-border pb-2 group-hover:border-black transition-colors">
                        <div>
                          <h3 className="font-display text-xl leading-none mb-2 group-hover:underline underline-offset-4 decoration-1">{product.name}</h3>
                          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{collections.find(c => c.id === product.collectionId)?.name || ''}</span>
                        </div>
                        <p className="font-mono text-sm">R$ {(getProductPrice(product) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </Link>
                    {/* Stone Type Selector - Below the card */}
                    {hasStoneVariations(product) && (
                      <StoneSelector
                        product={product}
                        value={selectedStoneTypes[product.id] || 'main'}
                        onChange={(val) => setSelectedStoneTypes(prev => ({...prev, [product.id]: val}))}
                        className="mt-3"
                      />
                    )}
                  </motion.div>
                );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
