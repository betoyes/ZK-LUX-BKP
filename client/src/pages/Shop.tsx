import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { categories } from '@/lib/mockData';
import { useProducts } from '@/context/ProductContext';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { ArrowRight, Heart, ChevronDown } from 'lucide-react';

// Stone type options
const STONE_TYPES = [
  { id: 'natural', label: 'Diamante Natural', priceField: 'price', descField: 'description' },
  { id: 'synthetic', label: 'Diamante Sintético', priceField: 'priceDiamondSynthetic', descField: 'descriptionDiamondSynthetic' },
  { id: 'zirconia', label: 'Zircônia', priceField: 'priceZirconia', descField: 'descriptionZirconia' },
];

export default function Shop() {
  const { products, categories, collections, wishlist, toggleWishlist } = useProducts();
  const [location] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const initialCategory = urlParams.get('category') || 'all';
  const searchQuery = urlParams.get('search') || '';

  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategory === 'all' ? [] : [initialCategory]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [sortOption, setSortOption] = useState('newest');
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

  // Update selected categories if URL changes
  useEffect(() => {
    if (initialCategory !== 'all' && !selectedCategories.includes(initialCategory)) {
      setSelectedCategories([initialCategory]);
    }
  }, [initialCategory]);

  const filteredProducts = (Array.isArray(products) ? products : []).filter(product => {
    // Search Filter
    if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Category Filter - compare by slug or ID
    const productCategory = categories.find(c => c.id === product.categoryId);
    const categoryMatch = selectedCategories.length === 0 || 
      (productCategory && selectedCategories.includes(productCategory.slug || String(productCategory.id)));
    
    // Collection Filter - compare by slug or ID
    const productCollection = collections.find(c => c.id === product.collectionId);
    const collectionMatch = selectedCollections.length === 0 || 
      (productCollection && selectedCollections.includes(productCollection.slug || String(productCollection.id)));
    
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
    setPriceRange([0, 50000]);
    setSortOption('newest');
    window.history.pushState({}, '', '/shop'); // Clear URL params
  };

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
            <div className="font-mono text-xs mb-2">
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

        <div className="flex flex-col lg:flex-row gap-16">
          {/* Sidebar Filters */}
          <div className="w-full lg:w-64 space-y-12 sticky top-32 h-fit bg-background z-10">
            {/* Categories */}
            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest mb-6 text-muted-foreground">Categorias</h3>
              <div className="space-y-3">
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
                      checked={selectedCollections.includes(col.slug || String(col.id))}
                      onCheckedChange={() => toggleCollection(col.slug || String(col.id))}
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
                  defaultValue={[0, 50000]} 
                  max={50000} 
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
                  const stoneType = selectedStoneTypes[product.id] || 'natural';
                  const productUrl = stoneType !== 'natural' ? `/product/${product.id}?stone=${stoneType}` : `/product/${product.id}`;
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
                        <img 
                          src={product.image} 
                          alt={product.name}
                          loading="lazy"
                          className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${(!product.imageColor || product.image === product.imageColor) ? 'grayscale group-hover:grayscale-0' : ''}`}
                        />
                        {product.imageColor && product.image !== product.imageColor && (
                          <img 
                            src={product.imageColor} 
                            alt={product.name}
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-105 opacity-0 group-hover:opacity-100"
                          />
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                        
                        {/* Hover Overlay - Stone Type Dropdown for Rings, Button for Others */}
                        <div className="absolute bottom-0 left-0 w-full p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                           {hasStoneVariations(product) ? (
                             <div 
                               className="bg-white/10 backdrop-blur-md border border-white/20 text-white"
                               onClick={(e) => e.preventDefault()}
                             >
                               <Select 
                                 value={selectedStoneTypes[product.id] || 'natural'}
                                 onValueChange={(val) => setSelectedStoneTypes(prev => ({...prev, [product.id]: val}))}
                               >
                                 <SelectTrigger className="w-full bg-transparent border-none text-white font-mono text-xs uppercase tracking-widest h-12 focus:ring-0 [&>svg]:text-white">
                                   <SelectValue />
                                 </SelectTrigger>
                                 <SelectContent className="bg-black/90 backdrop-blur-md border-white/20">
                                   {STONE_TYPES.map(stone => (
                                     <SelectItem 
                                       key={stone.id} 
                                       value={stone.id}
                                       className="font-mono text-xs uppercase tracking-widest text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
                                     >
                                       {stone.label}
                                     </SelectItem>
                                   ))}
                                 </SelectContent>
                               </Select>
                             </div>
                           ) : (
                             <div className="bg-white/10 backdrop-blur-md border border-white/20 text-white py-3 px-4 flex justify-between items-center">
                               <span className="font-mono text-xs uppercase tracking-widest">Ver Detalhes</span>
                               <ArrowRight className="h-3 w-3" />
                             </div>
                           )}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-display text-xl leading-none mb-2 group-hover:underline underline-offset-4 decoration-1">{product.name}</h3>
                          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{collections.find(c => c.id === product.collectionId)?.name || ''}</span>
                        </div>
                        <p className="font-mono text-sm">R$ {(getProductPrice(product) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </Link>
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
