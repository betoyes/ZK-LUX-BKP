import { useState } from 'react';
import { Link } from 'wouter';
import { useProducts } from '@/context/ProductContext';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpen, Package, DollarSign, Users, TrendingUp, Edit, Trash, Plus, Search, LayoutGrid, Tags, ShoppingCart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import ringImage from '@assets/generated_images/diamond_ring_product_shot.png';
import necklaceImage from '@assets/generated_images/gold_necklace_product_shot.png';
import earringsImage from '@assets/generated_images/pearl_earrings_product_shot.png';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

// Helper to select a random image based on category if user doesn't provide one (mock behavior)
const getMockImage = (category: string) => {
  if (category === 'aneis' || category === 'pulseiras') return ringImage;
  if (category === 'colares') return necklaceImage;
  return earringsImage;
};

export default function Dashboard() {
  const { 
    products, categories, collections, orders, customers,
    addProduct, updateProduct, deleteProduct,
    addCategory, deleteCategory,
    addCollection, deleteCollection,
    posts, addPost, deletePost, updatePost,
    updateOrder, branding, updateBranding
  } = useProducts();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState("overview");
  
  // Form States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddCatOpen, setIsAddCatOpen] = useState(false);
  const [isAddColOpen, setIsAddColOpen] = useState(false);
  const [isAddPostOpen, setIsAddPostOpen] = useState(false);
  const [isEditPostOpen, setIsEditPostOpen] = useState(false);
  
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [currentPost, setCurrentPost] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    category: '',
    collection: '',
    image: '',
    imageColor: '',
    gallery: [] as string[],
    specs: '',
    bestsellerOrder: ''
  });

  const [catFormData, setCatFormData] = useState({ name: '', description: '' });
  const [colFormData, setColFormData] = useState({ name: '', description: '' });
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  
  // Helper for file upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'image' | 'imageColor') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, gallery: [...prev.gallery, reader.result as string] }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeGalleryImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      gallery: prev.gallery.filter((_, i) => i !== index)
    }));
  };
  
  // Helper for collection/category product selection
  const toggleProductSelection = (productId: number) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };
  const [postFormData, setPostFormData] = useState({ title: '', excerpt: '', content: '', category: '', image: '' });
  const [brandingForm, setBrandingForm] = useState(branding);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredPosts = posts.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const salesData = [
    { name: "Seg", total: 1200 },
    { name: "Ter", total: 2400 },
    { name: "Qua", total: 1800 },
    { name: "Qui", total: 4500 },
    { name: "Sex", total: 6000 },
    { name: "Sab", total: 8500 },
    { name: "Dom", total: 3200 },
  ];

  // Product Handlers
  const handleAdd = () => {
    if (!formData.name || !formData.price || !formData.category) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    addProduct({
      name: formData.name,
      price: Number(formData.price),
      description: formData.description,
      category: formData.category,
      collection: formData.collection || 'eternal',
      image: formData.image || getMockImage(formData.category),
      imageColor: formData.imageColor || formData.image || getMockImage(formData.category),
      gallery: formData.gallery,
      specs: formData.specs.split('\n').filter(s => s.trim() !== ''),
      bestsellerOrder: formData.bestsellerOrder ? Number(formData.bestsellerOrder) : undefined,
      isNew: true
    });

    setIsAddOpen(false);
    resetForm();
    toast({ title: "Sucesso", description: "Produto adicionado com sucesso" });
  };

  const handleEdit = () => {
    if (!currentProduct) return;

    updateProduct(currentProduct.id, {
      name: formData.name,
      price: Number(formData.price),
      description: formData.description,
      category: formData.category,
      collection: formData.collection,
      image: formData.image,
      imageColor: formData.imageColor,
      gallery: formData.gallery,
      specs: formData.specs.split('\n').filter(s => s.trim() !== ''),
      bestsellerOrder: formData.bestsellerOrder ? Number(formData.bestsellerOrder) : undefined
    });

    setIsEditOpen(false);
    setCurrentProduct(null);
    resetForm();
    toast({ title: "Sucesso", description: "Produto atualizado com sucesso" });
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      deleteProduct(id);
      toast({ title: "Sucesso", description: "Produto removido" });
    }
  };

  const openEdit = (product: any) => {
    setCurrentProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      description: product.description,
      category: product.category,
      collection: product.collection,
      image: product.image,
      imageColor: product.imageColor || product.image,
      gallery: product.gallery || [],
      specs: product.specs ? product.specs.join('\n') : '',
      bestsellerOrder: product.bestsellerOrder ? product.bestsellerOrder.toString() : ''
    });
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      description: '',
      category: '',
      collection: '',
      image: '',
      imageColor: '',
      gallery: [],
      specs: '',
      bestsellerOrder: ''
    });
  };

  // Category Handlers
  const handleAddCategory = () => {
    if (!catFormData.name) return;
    
    // Create category
    addCategory({ name: catFormData.name, description: catFormData.description });
    
    // Update selected products to this category
    const newCategoryId = catFormData.name.toLowerCase().replace(/\s+/g, '-');
    selectedProductIds.forEach(pid => {
        updateProduct(pid, { category: newCategoryId });
    });

    setIsAddCatOpen(false);
    setCatFormData({ name: '', description: '' });
    setSelectedProductIds([]);
    toast({ title: "Sucesso", description: "Categoria adicionada e produtos vinculados" });
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm('Excluir categoria?')) {
      deleteCategory(id);
      toast({ title: "Sucesso", description: "Categoria removida" });
    }
  };

  // Collection Handlers
  const handleAddCollection = () => {
    if (!colFormData.name) return;
    
    addCollection({ name: colFormData.name, description: colFormData.description, image: '' });
    
    // Update selected products to this collection
    const newCollectionId = colFormData.name.toLowerCase().replace(/\s+/g, '-');
    selectedProductIds.forEach(pid => {
        updateProduct(pid, { collection: newCollectionId });
    });

    setIsAddColOpen(false);
    setColFormData({ name: '', description: '' });
    setSelectedProductIds([]);
    toast({ title: "Sucesso", description: "Coleção adicionada e produtos vinculados" });
  };

  const handleDeleteCollection = (id: string) => {
    if (confirm('Excluir coleção?')) {
      deleteCollection(id);
      toast({ title: "Sucesso", description: "Coleção removida" });
    }
  };

  // Post Handlers
  const handleAddPost = () => {
    if (!postFormData.title) return;
    addPost(postFormData);
    setIsAddPostOpen(false);
    setPostFormData({ title: '', excerpt: '', content: '', category: '', image: '' });
    toast({ title: "Sucesso", description: "Post adicionado" });
  };

  const handleEditPost = () => {
    if (!currentPost) return;
    updatePost(currentPost.id, postFormData);
    setIsEditPostOpen(false);
    setCurrentPost(null);
    setPostFormData({ title: '', excerpt: '', content: '', category: '', image: '' });
    toast({ title: "Sucesso", description: "Post atualizado" });
  };

  const handleDeletePost = (id: number) => {
    if (confirm('Excluir post?')) {
      deletePost(id);
      toast({ title: "Sucesso", description: "Post removido" });
    }
  };

  const openEditPost = (post: any) => {
    setCurrentPost(post);
    setPostFormData({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      image: post.image
    });
    setIsEditPostOpen(true);
  };

  const handleSaveBranding = () => {
    updateBranding(brandingForm);
    toast({ title: "Sucesso", description: "Branding atualizado com sucesso" });
  };

  return (
    <div className="min-h-screen bg-background pt-32 pb-24">
      <div className="container mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-border pb-8">
          <div>
            <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tighter mb-2">Painel Admin</h1>
            <p className="font-mono text-sm text-muted-foreground uppercase tracking-widest">
              Visão geral do sistema e inventário.
            </p>
          </div>
          
          <div className="flex gap-4">
            <Link href="/" className="text-sm font-mono uppercase tracking-widest hover:underline">
              Voltar ao Site
            </Link>
          </div>
        </div>

        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-12">
          <TabsList className="bg-transparent border-b border-border w-full justify-start h-auto p-0 rounded-none gap-8">
            <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:shadow-none px-0 py-4 font-mono text-xs uppercase tracking-widest">Visão Geral</TabsTrigger>
            <TabsTrigger value="products" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:shadow-none px-0 py-4 font-mono text-xs uppercase tracking-widest">Produtos</TabsTrigger>
            <TabsTrigger value="categories" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:shadow-none px-0 py-4 font-mono text-xs uppercase tracking-widest">Categorias</TabsTrigger>
            <TabsTrigger value="collections" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:shadow-none px-0 py-4 font-mono text-xs uppercase tracking-widest">Coleções</TabsTrigger>
            <TabsTrigger value="journal" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:shadow-none px-0 py-4 font-mono text-xs uppercase tracking-widest">Journal</TabsTrigger>
            <TabsTrigger value="customers" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:shadow-none px-0 py-4 font-mono text-xs uppercase tracking-widest">Clientes</TabsTrigger>
            <TabsTrigger value="branding" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:shadow-none px-0 py-4 font-mono text-xs uppercase tracking-widest">Branding</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { title: "Receita Total", value: "R$ 452.318,90", change: "+20.1%", icon: DollarSign },
                { title: "Vendas", value: `+${orders.length}`, change: "+12%", icon: TrendingUp },
                { title: "Produtos", value: products.length.toString(), change: "+2 novos", icon: Package },
                { title: "Clientes", value: customers.length.toString(), change: "+5 novos", icon: Users },
              ].map((stat, i) => (
                <div key={i} className="border border-border p-6 hover:border-black transition-colors group bg-card">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{stat.title}</h3>
                    <stat.icon className="h-4 w-4 text-muted-foreground group-hover:text-black transition-colors" />
                  </div>
                  <div className="font-display text-3xl mb-1">{stat.value}</div>
                  <p className="font-mono text-[10px] text-muted-foreground">{stat.change} desde o último mês</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="border border-border p-8 bg-card">
                <h3 className="font-display text-xl mb-6">Vendas da Semana</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesData}>
                      <XAxis 
                        dataKey="name" 
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        fontFamily="monospace"
                      />
                      <YAxis
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `R$${value}`}
                        fontFamily="monospace"
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '0px' }}
                        itemStyle={{ fontFamily: 'monospace', fontSize: '12px' }}
                      />
                      <Bar dataKey="total" fill="#000000" radius={[0, 0, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-border p-8 bg-card">
                <h3 className="font-display text-xl mb-6">Pedidos Recentes</h3>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border">
                      <TableHead className="font-mono text-xs uppercase tracking-widest">ID</TableHead>
                      <TableHead className="font-mono text-xs uppercase tracking-widest">Cliente</TableHead>
                      <TableHead className="font-mono text-xs uppercase tracking-widest text-right">Status</TableHead>
                      <TableHead className="font-mono text-xs uppercase tracking-widest text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map(order => (
                      <TableRow key={order.id} className="hover:bg-secondary/30 border-b border-border">
                        <TableCell className="font-mono text-xs">{order.id}</TableCell>
                        <TableCell className="font-display">{order.customer}</TableCell>
                        <TableCell className="font-mono text-xs text-right uppercase">
                          <Select 
                            defaultValue={order.status} 
                            onValueChange={(val) => {
                              updateOrder(order.id, val);
                              toast({ title: "Status Atualizado", description: `Pedido ${order.id} agora está ${val}.` });
                            }}
                          >
                            <SelectTrigger className="w-[130px] h-8 rounded-none border-transparent hover:border-border bg-transparent text-right justify-end px-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Processando">Processando</SelectItem>
                              <SelectItem value="Enviado">Enviado</SelectItem>
                              <SelectItem value="Entregue">Entregue</SelectItem>
                              <SelectItem value="Cancelado">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-right">R$ {order.total.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* PRODUCTS TAB */}
          <TabsContent value="products" className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar produtos..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-none border-border bg-transparent h-10 font-mono text-xs" 
                />
              </div>
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm} className="rounded-none bg-black text-white hover:bg-primary uppercase tracking-widest font-mono text-xs px-6 h-10 flex gap-2">
                    <Plus className="h-4 w-4" /> Novo Produto
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-background border border-border">
                  <DialogHeader>
                    <DialogTitle className="font-display text-2xl">Adicionar Produto</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nome</Label>
                      <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="rounded-none" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="price">Preço (R$)</Label>
                      <Input id="price" type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className="rounded-none" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="bestsellerOrder">Ordem no Bestsellers (Deixe vazio para ocultar)</Label>
                      <Input id="bestsellerOrder" type="number" placeholder="Ex: 1, 2, 3..." value={formData.bestsellerOrder} onChange={(e) => setFormData({...formData, bestsellerOrder: e.target.value})} className="rounded-none" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea id="description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="rounded-none" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="specs">Especificações Técnicas (uma por linha)</Label>
                      <Textarea 
                        id="specs" 
                        value={formData.specs} 
                        onChange={(e) => setFormData({...formData, specs: e.target.value})} 
                        className="rounded-none h-24" 
                        placeholder="Material: Ouro 18K&#10;Peso: 5g&#10;Gema: Diamante"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="category">Categoria</Label>
                      <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                        <SelectTrigger className="rounded-none">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="collection">Coleção</Label>
                      <Select value={formData.collection} onValueChange={(val) => setFormData({...formData, collection: val})}>
                        <SelectTrigger className="rounded-none">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {collections.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Imagem (P&B / Principal)</Label>
                      <div className="flex gap-4 items-center">
                        <Input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'image')}
                            className="rounded-none font-mono text-xs" 
                        />
                        {formData.image && <div className="h-10 w-10 bg-secondary"><img src={formData.image} className="h-full w-full object-cover" /></div>}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Galeria de Fotos</Label>
                      <div className="flex gap-4 items-center">
                        <Input 
                            type="file" 
                            accept="image/*"
                            multiple
                            onChange={handleGalleryUpload}
                            className="rounded-none font-mono text-xs" 
                        />
                      </div>
                      {formData.gallery.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          {formData.gallery.map((img, idx) => (
                            <div key={idx} className="relative group h-16 w-16 bg-secondary">
                              <img src={img} className="h-full w-full object-cover" />
                              <button 
                                onClick={() => removeGalleryImage(idx)}
                                className="absolute top-0 right-0 bg-red-500 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAdd} className="rounded-none w-full bg-black text-white hover:bg-primary uppercase tracking-widest font-mono text-xs">Salvar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12">Imagem</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12">Nome</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12">Categoria</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12">Coleção</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12 text-right">Preço</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                     <TableRow>
                       <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum produto encontrado.</TableCell>
                     </TableRow>
                  ) : (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id} className="hover:bg-secondary/30 border-b border-border transition-colors">
                        <TableCell className="py-4">
                          <div className="h-12 w-12 bg-secondary overflow-hidden">
                            <img src={product.image} alt={product.name} className="h-full w-full object-cover grayscale hover:grayscale-0 transition-all" />
                          </div>
                        </TableCell>
                        <TableCell className="font-display text-base">{product.name}</TableCell>
                        <TableCell className="font-mono text-xs uppercase tracking-widest">{product.category}</TableCell>
                        <TableCell className="font-mono text-xs uppercase tracking-widest">{product.collection}</TableCell>
                        <TableCell className="font-mono text-sm text-right">R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button onClick={() => openEdit(product)} variant="ghost" size="icon" className="h-8 w-8 hover:text-black hover:bg-transparent"><Edit className="h-4 w-4" /></Button>
                            <Button onClick={() => handleDelete(product.id)} variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive hover:bg-transparent"><Trash className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogContent className="sm:max-w-[425px] bg-background border border-border">
                <DialogHeader>
                  <DialogTitle className="font-display text-2xl">Editar Produto</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-name">Nome</Label>
                    <Input id="edit-name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="rounded-none" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-price">Preço (R$)</Label>
                    <Input id="edit-price" type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className="rounded-none" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-category">Categoria</Label>
                    <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                      <SelectTrigger className="rounded-none">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-collection">Coleção</Label>
                    <Select value={formData.collection} onValueChange={(val) => setFormData({...formData, collection: val})}>
                      <SelectTrigger className="rounded-none">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {collections.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-desc">Descrição</Label>
                    <Input id="edit-desc" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="rounded-none" />
                  </div>
                  <div className="grid gap-2">
                      <Label>Imagem (P&B / Principal)</Label>
                      <div className="flex gap-4 items-center">
                        <Input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'image')}
                            className="rounded-none font-mono text-xs" 
                        />
                        {formData.image && <div className="h-10 w-10 bg-secondary"><img src={formData.image} className="h-full w-full object-cover" /></div>}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Galeria de Fotos</Label>
                      <div className="flex gap-4 items-center">
                        <Input 
                            type="file" 
                            accept="image/*"
                            multiple
                            onChange={handleGalleryUpload}
                            className="rounded-none font-mono text-xs" 
                        />
                      </div>
                      {formData.gallery.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          {formData.gallery.map((img, idx) => (
                            <div key={idx} className="relative group h-16 w-16 bg-secondary">
                              <img src={img} className="h-full w-full object-cover" />
                              <button 
                                onClick={() => removeGalleryImage(idx)}
                                className="absolute top-0 right-0 bg-red-500 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleEdit} className="rounded-none w-full bg-black text-white hover:bg-primary uppercase tracking-widest font-mono text-xs">Atualizar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* CATEGORIES TAB */}
          <TabsContent value="categories" className="space-y-6">
            <div className="flex justify-end">
              <Dialog open={isAddCatOpen} onOpenChange={setIsAddCatOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-none bg-black text-white hover:bg-primary uppercase tracking-widest font-mono text-xs px-6 h-10 flex gap-2">
                    <Plus className="h-4 w-4" /> Nova Categoria
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-background border border-border">
                  <DialogHeader>
                    <DialogTitle className="font-display text-2xl">Adicionar Categoria</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Nome</Label>
                      <Input value={catFormData.name} onChange={(e) => setCatFormData({...catFormData, name: e.target.value})} className="rounded-none" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Descrição</Label>
                      <Input value={catFormData.description} onChange={(e) => setCatFormData({...catFormData, description: e.target.value})} className="rounded-none" />
                    </div>
                    
                    <div className="grid gap-2 mt-4">
                    <Label>Selecionar Produtos</Label>
                    <div className="border border-border p-4 h-48 overflow-y-auto space-y-2">
                        {products.map(p => (
                            <div key={p.id} className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id={`cat-prod-${p.id}`}
                                    checked={selectedProductIds.includes(p.id)}
                                    onChange={() => toggleProductSelection(p.id)}
                                    className="accent-black"
                                />
                                <label htmlFor={`cat-prod-${p.id}`} className="text-sm font-mono cursor-pointer truncate">
                                    {p.name}
                                </label>
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Os produtos selecionados serão movidos para esta categoria.</p>
                  </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddCategory} className="rounded-none w-full bg-black text-white hover:bg-primary uppercase tracking-widest font-mono text-xs">Salvar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map(cat => (
                <div key={cat.id} className="border border-border p-6 bg-card hover:border-black transition-all group relative">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button onClick={() => handleDeleteCategory(cat.id)} variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive hover:bg-transparent"><Trash className="h-4 w-4" /></Button>
                  </div>
                  <Tags className="h-8 w-8 mb-4 text-muted-foreground" />
                  <h3 className="font-display text-xl mb-2 capitalize">{cat.name}</h3>
                  <p className="font-mono text-xs text-muted-foreground">{cat.description}</p>
                  <div className="mt-4 pt-4 border-t border-border font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    ID: {cat.id}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* COLLECTIONS TAB */}
          <TabsContent value="collections" className="space-y-6">
             <div className="flex justify-end">
              <Dialog open={isAddColOpen} onOpenChange={setIsAddColOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-none bg-black text-white hover:bg-primary uppercase tracking-widest font-mono text-xs px-6 h-10 flex gap-2">
                    <Plus className="h-4 w-4" /> Nova Coleção
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-background border border-border">
                  <DialogHeader>
                    <DialogTitle className="font-display text-2xl">Adicionar Coleção</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Nome</Label>
                      <Input value={colFormData.name} onChange={(e) => setColFormData({...colFormData, name: e.target.value})} className="rounded-none" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Descrição</Label>
                      <Input value={colFormData.description} onChange={(e) => setColFormData({...colFormData, description: e.target.value})} className="rounded-none" />
                    </div>
                    
                    <div className="grid gap-2 mt-4">
                    <Label>Selecionar Produtos</Label>
                    <div className="border border-border p-4 h-48 overflow-y-auto space-y-2">
                        {products.map(p => (
                            <div key={p.id} className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id={`col-prod-${p.id}`}
                                    checked={selectedProductIds.includes(p.id)}
                                    onChange={() => toggleProductSelection(p.id)}
                                    className="accent-black"
                                />
                                <label htmlFor={`col-prod-${p.id}`} className="text-sm font-mono cursor-pointer truncate">
                                    {p.name}
                                </label>
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Os produtos selecionados serão movidos para esta coleção.</p>
                  </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddCollection} className="rounded-none w-full bg-black text-white hover:bg-primary uppercase tracking-widest font-mono text-xs">Salvar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map(col => (
                <div key={col.id} className="border border-border bg-card group relative overflow-hidden">
                   <div className="h-48 bg-secondary/30 overflow-hidden">
                     <img src={col.image} alt={col.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                   </div>
                   <div className="p-6 relative z-10 bg-card">
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button onClick={() => handleDeleteCollection(col.id)} variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive hover:bg-transparent"><Trash className="h-4 w-4" /></Button>
                      </div>
                      <h3 className="font-display text-xl mb-2">{col.name}</h3>
                      <p className="font-mono text-xs text-muted-foreground">{col.description}</p>
                   </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* CUSTOMERS TAB */}
          <TabsContent value="customers" className="space-y-6">
             <div className="border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12">Cliente</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12">Email</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12 text-right">Pedidos</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12 text-right">Total Gasto</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12 text-right">Última Compra</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id} className="hover:bg-secondary/30 border-b border-border transition-colors">
                      <TableCell className="font-display text-base">{customer.name}</TableCell>
                      <TableCell className="font-mono text-xs">{customer.email}</TableCell>
                      <TableCell className="font-mono text-sm text-right">{customer.orders}</TableCell>
                      <TableCell className="font-mono text-sm text-right">R$ {customer.totalSpent.toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-xs text-right text-muted-foreground">{customer.lastOrder}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* JOURNAL TAB */}
          <TabsContent value="journal" className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar posts..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-none border-border bg-transparent h-10 font-mono text-xs" 
                />
              </div>
              
              <Dialog open={isAddPostOpen} onOpenChange={setIsAddPostOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-none bg-black text-white hover:bg-primary uppercase tracking-widest font-mono text-xs px-6 h-10 flex gap-2">
                    <Plus className="h-4 w-4" /> Novo Post
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] bg-background border border-border">
                  <DialogHeader>
                    <DialogTitle className="font-display text-2xl">Adicionar Post</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Título</Label>
                      <Input value={postFormData.title} onChange={(e) => setPostFormData({...postFormData, title: e.target.value})} className="rounded-none" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Categoria</Label>
                      <Input value={postFormData.category} onChange={(e) => setPostFormData({...postFormData, category: e.target.value})} className="rounded-none" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Resumo</Label>
                      <Textarea value={postFormData.excerpt} onChange={(e) => setPostFormData({...postFormData, excerpt: e.target.value})} className="rounded-none" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Conteúdo Completo</Label>
                      <Textarea value={postFormData.content} onChange={(e) => setPostFormData({...postFormData, content: e.target.value})} className="rounded-none h-40" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Imagem (URL)</Label>
                      <Input value={postFormData.image} onChange={(e) => setPostFormData({...postFormData, image: e.target.value})} className="rounded-none" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddPost} className="rounded-none w-full bg-black text-white hover:bg-primary uppercase tracking-widest font-mono text-xs">Salvar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12">Imagem</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12">Título</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12">Data</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12">Categoria</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPosts.map((post) => (
                    <TableRow key={post.id} className="hover:bg-secondary/30 border-b border-border transition-colors">
                      <TableCell className="py-4">
                        <div className="h-12 w-12 bg-secondary overflow-hidden">
                          <img src={post.image} alt={post.title} className="h-full w-full object-cover" />
                        </div>
                      </TableCell>
                      <TableCell className="font-display text-base">{post.title}</TableCell>
                      <TableCell className="font-mono text-xs uppercase tracking-widest">{post.date}</TableCell>
                      <TableCell className="font-mono text-xs uppercase tracking-widest">{post.category}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button onClick={() => openEditPost(post)} variant="ghost" size="icon" className="h-8 w-8 hover:text-black hover:bg-transparent"><Edit className="h-4 w-4" /></Button>
                          <Button onClick={() => handleDeletePost(post.id)} variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive hover:bg-transparent"><Trash className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Edit Post Dialog */}
            <Dialog open={isEditPostOpen} onOpenChange={setIsEditPostOpen}>
              <DialogContent className="sm:max-w-[600px] bg-background border border-border">
                <DialogHeader>
                  <DialogTitle className="font-display text-2xl">Editar Post</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Título</Label>
                    <Input value={postFormData.title} onChange={(e) => setPostFormData({...postFormData, title: e.target.value})} className="rounded-none" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Categoria</Label>
                    <Input value={postFormData.category} onChange={(e) => setPostFormData({...postFormData, category: e.target.value})} className="rounded-none" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Resumo</Label>
                    <Textarea value={postFormData.excerpt} onChange={(e) => setPostFormData({...postFormData, excerpt: e.target.value})} className="rounded-none" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Conteúdo Completo</Label>
                    <Textarea value={postFormData.content} onChange={(e) => setPostFormData({...postFormData, content: e.target.value})} className="rounded-none h-40" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Imagem (URL)</Label>
                    <Input value={postFormData.image} onChange={(e) => setPostFormData({...postFormData, image: e.target.value})} className="rounded-none" />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleEditPost} className="rounded-none w-full bg-black text-white hover:bg-primary uppercase tracking-widest font-mono text-xs">Atualizar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </TabsContent>

          {/* BRANDING TAB */}
          <TabsContent value="branding" className="space-y-8 max-w-2xl">
            <div className="space-y-6 border border-border p-8 bg-card">
              <h2 className="font-display text-2xl">Identidade Visual</h2>
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label>Nome da Marca</Label>
                  <Input 
                    value={brandingForm.companyName} 
                    onChange={(e) => setBrandingForm({...brandingForm, companyName: e.target.value})}
                    className="rounded-none"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label>Título Principal (Hero)</Label>
                  <Textarea 
                    value={brandingForm.heroTitle} 
                    onChange={(e) => setBrandingForm({...brandingForm, heroTitle: e.target.value})}
                    className="rounded-none font-display text-xl"
                    rows={2}
                  />
                  <p className="text-[10px] text-muted-foreground">Use Enter para quebrar a linha e criar o efeito visual.</p>
                </div>

                <div className="grid gap-2">
                  <Label>Subtítulo (Hero)</Label>
                  <Input 
                    value={brandingForm.heroSubtitle} 
                    onChange={(e) => setBrandingForm({...brandingForm, heroSubtitle: e.target.value})}
                    className="rounded-none"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Mídia de Fundo (Hero)</Label>
                  <Select 
                    value={brandingForm.heroMediaType} 
                    onValueChange={(val: 'image' | 'video') => setBrandingForm({...brandingForm, heroMediaType: val})}
                  >
                    <SelectTrigger className="rounded-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Imagem</SelectItem>
                      <SelectItem value="video">Vídeo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>URL da Mídia</Label>
                  <Input 
                    value={brandingForm.heroMediaUrl} 
                    onChange={(e) => setBrandingForm({...brandingForm, heroMediaUrl: e.target.value})}
                    className="rounded-none"
                    placeholder="https://..."
                  />
                  <p className="text-[10px] text-muted-foreground">Cole a URL da imagem ou vídeo desejado.</p>
                </div>

                <div className="grid gap-2">
                  <Label>Título do Manifesto</Label>
                  <Input 
                    value={brandingForm.manifestoTitle} 
                    onChange={(e) => setBrandingForm({...brandingForm, manifestoTitle: e.target.value})}
                    className="rounded-none"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Texto do Manifesto</Label>
                  <Input 
                    value={brandingForm.manifestoText} 
                    onChange={(e) => setBrandingForm({...brandingForm, manifestoText: e.target.value})}
                    className="rounded-none"
                  />
                </div>

                <div className="border-t border-border my-6"></div>
                <h3 className="font-display text-lg">Configurações do Journal</h3>

                <div className="grid gap-2">
                  <Label>Título do Hero (Journal)</Label>
                  <Input 
                    value={brandingForm.journalHeroTitle} 
                    onChange={(e) => setBrandingForm({...brandingForm, journalHeroTitle: e.target.value})}
                    className="rounded-none"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Subtítulo do Hero (Journal)</Label>
                  <Input 
                    value={brandingForm.journalHeroSubtitle} 
                    onChange={(e) => setBrandingForm({...brandingForm, journalHeroSubtitle: e.target.value})}
                    className="rounded-none"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Imagem de Capa (Journal)</Label>
                  <Input 
                    value={brandingForm.journalHeroImage} 
                    onChange={(e) => setBrandingForm({...brandingForm, journalHeroImage: e.target.value})}
                    className="rounded-none"
                  />
                </div>

                <div className="border-t border-border my-6"></div>
                <h3 className="font-display text-lg">Frase de Impacto (Home)</h3>
                
                <div className="grid gap-2">
                  <Label>Texto da Frase</Label>
                  <Textarea 
                    value={brandingForm.impactPhrase} 
                    onChange={(e) => setBrandingForm({...brandingForm, impactPhrase: e.target.value})}
                    className="rounded-none font-display text-xl"
                    rows={3}
                  />
                </div>

                <Button onClick={handleSaveBranding} className="rounded-none bg-black text-white hover:bg-primary uppercase tracking-widest font-mono text-xs mt-4">
                  Salvar Alterações
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
