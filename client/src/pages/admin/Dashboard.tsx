import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useProducts } from '@/context/ProductContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpen, Package, DollarSign, Users, TrendingUp, Edit, Trash, Plus, Search, LayoutGrid, Tags, ShoppingCart, Download, Shield, UserPlus, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
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

const PRIMARY_ADMIN_EMAIL = "betoyes@gmail.com";

interface AdminUser {
  id: number;
  username: string;
  role: string;
  createdAt?: string;
}

interface Subscriber {
  id: number;
  name: string;
  email: string;
  date: string;
  status: string;
  type: string;
}

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
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState("overview");
  
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [adminFormData, setAdminFormData] = useState({ email: '', password: '', confirmPassword: '' });
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  
  const isPrimaryAdmin = user?.username === PRIMARY_ADMIN_EMAIL;
  
  // Fetch subscribers from API
  const fetchSubscribers = async () => {
    try {
      const response = await fetch('/api/subscribers', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setSubscribers(data);
      }
    } catch (err) {
      console.error('Erro ao carregar assinantes:', err);
    }
  };
  
  useEffect(() => {
    fetchSubscribers();
  }, []);
  
  useEffect(() => {
    if (isPrimaryAdmin && activeTab === 'admins') {
      fetchAdmins();
    }
  }, [isPrimaryAdmin, activeTab]);
  
  const fetchAdmins = async () => {
    setIsLoadingAdmins(true);
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setAdminUsers(data);
      }
    } catch (err) {
      console.error('Error fetching admins:', err);
    } finally {
      setIsLoadingAdmins(false);
    }
  };
  
  const handleAddAdmin = async () => {
    if (!adminFormData.email || !adminFormData.password) {
      toast({ title: "Erro", description: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    if (adminFormData.password !== adminFormData.confirmPassword) {
      toast({ title: "Erro", description: "As senhas não conferem", variant: "destructive" });
      return;
    }
    if (adminFormData.password.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminFormData.email, password: adminFormData.password })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      
      toast({ title: "Sucesso", description: "Administrador adicionado com sucesso" });
      setAdminFormData({ email: '', password: '', confirmPassword: '' });
      setIsAddAdminOpen(false);
      fetchAdmins();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Não foi possível adicionar administrador", variant: "destructive" });
    }
  };
  
  const handleDeleteAdmin = async (id: number, email: string) => {
    if (email === PRIMARY_ADMIN_EMAIL) {
      toast({ title: "Erro", description: "Não é possível remover o administrador principal", variant: "destructive" });
      return;
    }
    if (!confirm(`Tem certeza que deseja remover o administrador ${email}?`)) return;
    
    try {
      const response = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      toast({ title: "Sucesso", description: "Administrador removido" });
      fetchAdmins();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Não foi possível remover administrador", variant: "destructive" });
    }
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: "Até logo!", description: "Você foi desconectado." });
      setLocation('/admin/login');
    } catch {
      toast({ title: "Erro", description: "Não foi possível desconectar", variant: "destructive" });
    }
  };
  
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
    version1: '',
    version2: '',
    version3: '',
    video: '',
    video2: '',
    specs: '',
    bestsellerOrder: '',
    // Stone type variants for rings
    priceDiamondSynthetic: '',
    priceZirconia: '',
    descriptionDiamondSynthetic: '',
    descriptionZirconia: '',
    specsDiamondSynthetic: '',
    specsZirconia: ''
  });

  // Check if selected category is "Anéis" or "Anel"
  const isRingCategory = () => {
    const selectedCat = categories.find(c => String(c.id) === formData.category);
    return selectedCat?.name?.toLowerCase().includes('anel') || selectedCat?.name?.toLowerCase().includes('anéis');
  };

  const [catFormData, setCatFormData] = useState({ name: '', description: '' });
  const [colFormData, setColFormData] = useState({ name: '', description: '', image: '' });
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

  const handleCollectionImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setColFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeGalleryImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      gallery: prev.gallery.filter((_, i) => i !== index)
    }));
  };

  // Handle version image upload for rings
  const handleVersionUpload = (e: React.ChangeEvent<HTMLInputElement>, versionField: 'version1' | 'version2' | 'version3') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [versionField]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle video upload
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'video' | 'video2') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
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
  
  // Newsletter management state
  const [isAddSubscriberOpen, setIsAddSubscriberOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [subscriberFormData, setSubscriberFormData] = useState({ name: '', email: '', type: 'newsletter' });
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [subscriberFilter, setSubscriberFilter] = useState<'all' | 'newsletter' | 'lead' | 'customer'>('all');

  // Filter subscribers by type
  const filteredSubscribers = subscriberFilter === 'all' 
    ? subscribers 
    : subscribers.filter(s => s.type === subscriberFilter);
  
  // Get subscriber type counts
  // Newsletter = ALL (everyone is part of newsletter)
  // "Apenas Inscritos" = footer signups only (type='newsletter')
  // Leads = registered but no purchase
  // Clientes = made a purchase
  const subscriberCounts = {
    all: subscribers.length, // "Newsletter" - everyone
    newsletter: subscribers.filter(s => s.type === 'newsletter' || !s.type).length, // "Apenas Inscritos"
    lead: subscribers.filter(s => s.type === 'lead').length,
    customer: subscribers.filter(s => s.type === 'customer').length,
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'customer':
        return <span className="px-2 py-1 text-[10px] bg-emerald-600 text-white">Cliente</span>;
      case 'lead':
        return <span className="px-2 py-1 text-[10px] bg-amber-500 text-white">Lead</span>;
      default:
        return <span className="px-2 py-1 text-[10px] bg-gray-600 text-white">Inscrito</span>;
    }
  };

  const filteredProducts = (Array.isArray(products) ? products : []).filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredPosts = posts.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const salesData = [
    { name: "Seg", total: 0 },
    { name: "Ter", total: 0 },
    { name: "Qua", total: 0 },
    { name: "Qui", total: 0 },
    { name: "Sex", total: 0 },
    { name: "Sab", total: 0 },
    { name: "Dom", total: 0 },
  ];

  // Helper para converter preço em R$ para centavos
  const parsePriceToNumber = (priceStr: string): number => {
    const cleaned = priceStr.replace(/\./g, '').replace(',', '.');
    return Math.round(parseFloat(cleaned) * 100);
  };

  // Product Handlers
  const handleAdd = () => {
    if (!formData.name || !formData.price || !formData.category) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    const selectedCategory = categories.find(c => String(c.id) === formData.category);
    const selectedCollection = collections.find(c => String(c.id) === formData.collection);

    const mainImage = formData.image || getMockImage(formData.category);

    addProduct({
      name: formData.name,
      price: parsePriceToNumber(formData.price),
      description: formData.description,
      categoryId: selectedCategory ? selectedCategory.id : undefined,
      collectionId: selectedCollection ? selectedCollection.id : undefined,
      image: mainImage,
      imageColor: mainImage,
      gallery: formData.gallery,
      version1: formData.version1 || undefined,
      version2: formData.version2 || undefined,
      version3: formData.version3 || undefined,
      video: formData.video || undefined,
      video2: formData.video2 || undefined,
      specs: formData.specs.split('\n').filter(s => s.trim() !== ''),
      bestsellerOrder: formData.bestsellerOrder ? Number(formData.bestsellerOrder) : undefined,
      isNew: true,
      // Stone type variants
      priceDiamondSynthetic: formData.priceDiamondSynthetic ? parsePriceToNumber(formData.priceDiamondSynthetic) : undefined,
      priceZirconia: formData.priceZirconia ? parsePriceToNumber(formData.priceZirconia) : undefined,
      descriptionDiamondSynthetic: formData.descriptionDiamondSynthetic || undefined,
      descriptionZirconia: formData.descriptionZirconia || undefined,
      specsDiamondSynthetic: formData.specsDiamondSynthetic ? formData.specsDiamondSynthetic.split('\n').filter(s => s.trim() !== '') : undefined,
      specsZirconia: formData.specsZirconia ? formData.specsZirconia.split('\n').filter(s => s.trim() !== '') : undefined
    });

    setIsAddOpen(false);
    resetForm();
    toast({ title: "Sucesso", description: "Produto adicionado com sucesso" });
  };

  const handleEdit = () => {
    if (!currentProduct) return;

    const selectedCategory = categories.find(c => String(c.id) === formData.category);
    const selectedCollection = collections.find(c => String(c.id) === formData.collection);

    const mainImage = formData.image;

    updateProduct(currentProduct.id, {
      name: formData.name,
      price: parsePriceToNumber(formData.price),
      description: formData.description,
      categoryId: selectedCategory ? selectedCategory.id : undefined,
      collectionId: selectedCollection ? selectedCollection.id : undefined,
      image: mainImage,
      imageColor: mainImage,
      gallery: formData.gallery,
      version1: formData.version1 || undefined,
      version2: formData.version2 || undefined,
      version3: formData.version3 || undefined,
      video: formData.video || undefined,
      video2: formData.video2 || undefined,
      specs: formData.specs.split('\n').filter(s => s.trim() !== ''),
      bestsellerOrder: formData.bestsellerOrder ? Number(formData.bestsellerOrder) : undefined,
      // Stone type variants
      priceDiamondSynthetic: formData.priceDiamondSynthetic ? parsePriceToNumber(formData.priceDiamondSynthetic) : undefined,
      priceZirconia: formData.priceZirconia ? parsePriceToNumber(formData.priceZirconia) : undefined,
      descriptionDiamondSynthetic: formData.descriptionDiamondSynthetic || undefined,
      descriptionZirconia: formData.descriptionZirconia || undefined,
      specsDiamondSynthetic: formData.specsDiamondSynthetic ? formData.specsDiamondSynthetic.split('\n').filter(s => s.trim() !== '') : undefined,
      specsZirconia: formData.specsZirconia ? formData.specsZirconia.split('\n').filter(s => s.trim() !== '') : undefined
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

  // Helper para formatar centavos para exibição em R$
  const formatPriceForDisplay = (priceInCents: number): string => {
    const reais = priceInCents / 100;
    return reais.toFixed(2).replace('.', ',');
  };

  const openEdit = (product: any) => {
    setCurrentProduct(product);
    
    setFormData({
      name: product.name,
      price: formatPriceForDisplay(product.price),
      description: product.description,
      category: product.categoryId ? String(product.categoryId) : '',
      collection: product.collectionId ? String(product.collectionId) : '',
      image: product.image,
      imageColor: product.imageColor || product.image,
      gallery: product.gallery || [],
      version1: product.version1 || '',
      version2: product.version2 || '',
      version3: product.version3 || '',
      video: product.video || '',
      video2: product.video2 || '',
      specs: product.specs ? product.specs.join('\n') : '',
      bestsellerOrder: product.bestsellerOrder ? product.bestsellerOrder.toString() : '',
      // Stone type variants
      priceDiamondSynthetic: product.priceDiamondSynthetic ? formatPriceForDisplay(product.priceDiamondSynthetic) : '',
      priceZirconia: product.priceZirconia ? formatPriceForDisplay(product.priceZirconia) : '',
      descriptionDiamondSynthetic: product.descriptionDiamondSynthetic || '',
      descriptionZirconia: product.descriptionZirconia || '',
      specsDiamondSynthetic: product.specsDiamondSynthetic ? product.specsDiamondSynthetic.join('\n') : '',
      specsZirconia: product.specsZirconia ? product.specsZirconia.join('\n') : ''
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
      version1: '',
      version2: '',
      version3: '',
      video: '',
      video2: '',
      specs: '',
      bestsellerOrder: '',
      // Stone type variants
      priceDiamondSynthetic: '',
      priceZirconia: '',
      descriptionDiamondSynthetic: '',
      descriptionZirconia: '',
      specsDiamondSynthetic: '',
      specsZirconia: ''
    });
  };

  // Category Handlers
  const handleAddCategory = async () => {
    if (!catFormData.name) return;
    
    await addCategory({ name: catFormData.name, description: catFormData.description });
    
    const newCategory = categories.find(c => c.name === catFormData.name);
    if (newCategory && selectedProductIds.length > 0) {
      for (const pid of selectedProductIds) {
        await updateProduct(pid, { categoryId: newCategory.id });
      }
    }

    setIsAddCatOpen(false);
    setCatFormData({ name: '', description: '' });
    setSelectedProductIds([]);
    toast({ title: "Sucesso", description: "Categoria adicionada" + (selectedProductIds.length > 0 ? " e produtos vinculados" : "") });
  };

  const handleDeleteCategory = (id: number) => {
    if (confirm('Excluir categoria?')) {
      deleteCategory(id);
      toast({ title: "Sucesso", description: "Categoria removida" });
    }
  };

  // Collection Handlers
  const handleAddCollection = async () => {
    if (!colFormData.name) return;
    
    await addCollection({ name: colFormData.name, description: colFormData.description, image: colFormData.image });
    
    const newCollection = collections.find(c => c.name === colFormData.name);
    if (newCollection && selectedProductIds.length > 0) {
      for (const pid of selectedProductIds) {
        await updateProduct(pid, { collectionId: newCollection.id });
      }
    }

    setIsAddColOpen(false);
    setColFormData({ name: '', description: '', image: '' });
    setSelectedProductIds([]);
    toast({ title: "Sucesso", description: "Coleção adicionada" + (selectedProductIds.length > 0 ? " e produtos vinculados" : "") });
  };

  const handleDeleteCollection = (id: number) => {
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

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadCustomers = () => {
    const csvContent = [
      "ID,Nome,Email,Pedidos,Total Gasto,Ultima Compra",
      ...customers.map(c => `${c.id},"${c.name}",${c.email},${c.orders},${c.totalSpent},${c.lastOrder}`)
    ].join('\n');
    downloadCSV(csvContent, 'clientes.csv');
  };

  const handleDownloadSubscribers = () => {
    const csvContent = [
      "ID,Nome,Email,Tipo,Data,Status",
      ...filteredSubscribers.map(s => `${s.id},"${s.name || ''}",${s.email},${s.type || 'newsletter'},${s.date},${s.status}`)
    ].join('\n');
    const filename = subscriberFilter === 'all' ? 'todos_assinantes.csv' : `${subscriberFilter}.csv`;
    downloadCSV(csvContent, filename);
  };

  const handleAddSubscriber = async () => {
    if (!subscriberFormData.email) {
      toast({ title: "Erro", description: "Email é obrigatório", variant: "destructive" });
      return;
    }
    
    try {
      const response = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: subscriberFormData.name || subscriberFormData.email.split('@')[0],
          email: subscriberFormData.email.toLowerCase(),
          date: new Date().toISOString().split('T')[0],
          status: 'active',
          type: subscriberFormData.type || 'newsletter'
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      
      toast({ title: "Sucesso", description: "Assinante adicionado com sucesso" });
      setSubscriberFormData({ name: '', email: '', type: 'newsletter' });
      setIsAddSubscriberOpen(false);
      fetchSubscribers();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Não foi possível adicionar assinante", variant: "destructive" });
    }
  };

  const handleDeleteSubscriber = async (id: number, email: string) => {
    if (!confirm(`Tem certeza que deseja remover ${email} da lista?`)) return;
    
    try {
      const response = await fetch(`/api/subscribers/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Não foi possível remover assinante');
      }
      toast({ title: "Sucesso", description: "Assinante removido" });
      fetchSubscribers();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleImportSubscribers = async () => {
    if (!importText.trim()) {
      toast({ title: "Erro", description: "Cole a lista de emails", variant: "destructive" });
      return;
    }
    
    setIsImporting(true);
    
    try {
      const lines = importText.split('\n').filter(line => line.trim());
      const subscribersList = lines.map(line => {
        const parts = line.split(',').map(p => p.trim().replace(/"/g, ''));
        if (parts.length >= 2) {
          return { name: parts[0], email: parts[1] };
        } else {
          return { name: '', email: parts[0] };
        }
      }).filter(sub => sub.email && sub.email.includes('@'));
      
      const response = await fetch('/api/subscribers/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscribers: subscribersList })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message);
      }
      
      toast({ title: "Importação Concluída", description: data.message });
      setImportText('');
      setIsImportOpen(false);
      fetchSubscribers();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro na importação", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
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
          
          <div className="flex gap-4 items-center">
            <span className="font-mono text-xs text-muted-foreground">
              {user?.username}
            </span>
            <Link href="/" className="text-sm font-mono uppercase tracking-widest hover:underline">
              Voltar ao Site
            </Link>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleLogout}
              className="rounded-none border-black hover:bg-black hover:text-white font-mono text-xs uppercase tracking-widest flex items-center gap-2"
              data-testid="button-admin-logout"
            >
              <LogOut className="h-3 w-3" /> Sair
            </Button>
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
            <TabsTrigger value="newsletter" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:shadow-none px-0 py-4 font-mono text-xs uppercase tracking-widest">Newsletter</TabsTrigger>
            <TabsTrigger value="branding" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:shadow-none px-0 py-4 font-mono text-xs uppercase tracking-widest">Branding</TabsTrigger>
            {isPrimaryAdmin && (
              <TabsTrigger value="admins" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:shadow-none px-0 py-4 font-mono text-xs uppercase tracking-widest">Administradores</TabsTrigger>
            )}
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {(() => {
                const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order.total || 0), 0);
                const formattedRevenue = `R$ ${(totalRevenue / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                return [
                  { title: "Receita Total", value: formattedRevenue, change: orders.length > 0 ? "+0%" : "-", icon: DollarSign },
                  { title: "Vendas", value: `+${orders.length}`, change: "+0%", icon: TrendingUp },
                  { title: "Produtos", value: (Array.isArray(products) ? products.length : 0).toString(), change: "+0", icon: Package },
                  { title: "Clientes", value: (Array.isArray(customers) ? customers.length : 0).toString(), change: "+0", icon: Users },
                ];
              })().map((stat, i) => (
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
                    {(Array.isArray(orders) ? orders : []).map(order => (
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
                <DialogContent className="sm:max-w-[1100px] max-h-[90vh] bg-background border border-border overflow-hidden flex flex-col">
                  <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="font-display text-2xl">Adicionar Produto</DialogTitle>
                    <DialogDescription className="sr-only">Formulário para adicionar um novo produto ao catálogo</DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-4">
                      {/* LEFT COLUMN - Basic Info */}
                      <div className="space-y-4">
                        <h3 className="font-mono text-xs uppercase tracking-widest text-primary border-b border-border pb-2">Informações Básicas</h3>
                        
                        <div className="grid gap-2">
                          <Label htmlFor="name">Nome</Label>
                          <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="rounded-none" />
                        </div>
                        
                        <div className="grid gap-2">
                          <Label htmlFor="price">Preço (R$)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                            <Input 
                              id="price" 
                              type="text" 
                              value={formData.price} 
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^\d,]/g, '');
                                setFormData({...formData, price: value});
                              }} 
                              placeholder="0,00"
                              className="rounded-none pl-10" 
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="category">Categoria</Label>
                            <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                              <SelectTrigger className="rounded-none">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {(Array.isArray(categories) ? categories : []).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
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
                                {(Array.isArray(collections) ? collections : []).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="grid gap-2">
                          <Label htmlFor="description">Descrição</Label>
                          <Textarea id="description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="rounded-none h-20" />
                        </div>
                        
                        <div className="grid gap-2">
                          <Label htmlFor="specs">Especificações (uma por linha)</Label>
                          <Textarea 
                            id="specs" 
                            value={formData.specs} 
                            onChange={(e) => setFormData({...formData, specs: e.target.value})} 
                            className="rounded-none h-20" 
                            placeholder="Material: Ouro 18K&#10;Peso: 5g"
                          />
                        </div>
                        
                        <div className="grid gap-2">
                          <Label htmlFor="bestsellerOrder">Ordem no Bestsellers</Label>
                          <Input id="bestsellerOrder" type="number" placeholder="Deixe vazio para ocultar" value={formData.bestsellerOrder} onChange={(e) => setFormData({...formData, bestsellerOrder: e.target.value})} className="rounded-none" />
                        </div>
                        
                        {/* Stone Type Variants - for all products */}
                        <div className="border-t border-border pt-4 mt-4">
                          <h3 className="font-mono text-xs uppercase tracking-widest text-primary mb-4">Variações de Pedra (Opcional)</h3>
                          
                          <div className="space-y-4">
                            <div className="p-3 bg-secondary/30 border border-border">
                              <Label className="font-mono text-xs uppercase">Diamante Sintético</Label>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                <Input type="text" placeholder="Preço R$" value={formData.priceDiamondSynthetic} onChange={(e) => setFormData({...formData, priceDiamondSynthetic: e.target.value.replace(/[^\d,]/g, '')})} className="rounded-none text-sm" />
                              </div>
                              <Textarea placeholder="Descrição..." value={formData.descriptionDiamondSynthetic} onChange={(e) => setFormData({...formData, descriptionDiamondSynthetic: e.target.value})} className="rounded-none h-16 mt-2" />
                            </div>
                            
                            <div className="p-3 bg-secondary/30 border border-border">
                              <Label className="font-mono text-xs uppercase">Zircônia</Label>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                <Input type="text" placeholder="Preço R$" value={formData.priceZirconia} onChange={(e) => setFormData({...formData, priceZirconia: e.target.value.replace(/[^\d,]/g, '')})} className="rounded-none text-sm" />
                              </div>
                              <Textarea placeholder="Descrição..." value={formData.descriptionZirconia} onChange={(e) => setFormData({...formData, descriptionZirconia: e.target.value})} className="rounded-none h-16 mt-2" />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* RIGHT COLUMN - Media */}
                      <div className="space-y-4">
                        <h3 className="font-mono text-xs uppercase tracking-widest text-primary border-b border-border pb-2">Mídia do Produto</h3>
                        
                        {/* Image Grid - 4 boxes */}
                        <div className="grid grid-cols-4 gap-3">
                          {/* Main Image */}
                          <div className="space-y-2">
                            <Label className="text-xs">Imagem Principal</Label>
                            <div className="relative aspect-square bg-secondary border border-dashed border-border flex items-center justify-center overflow-hidden">
                              {formData.image ? (
                                <>
                                  <img src={formData.image} className="h-full w-full object-cover" />
                                  <button 
                                    onClick={() => setFormData(prev => ({...prev, image: ''}))}
                                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"
                                  >
                                    <Trash className="h-3 w-3" />
                                  </button>
                                </>
                              ) : (
                                <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                                  <Plus className="h-6 w-6 text-muted-foreground" />
                                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image')} className="hidden" />
                                </label>
                              )}
                            </div>
                          </div>
                          
                          {/* Version 1 */}
                          <div className="space-y-2">
                            <Label className="text-xs">Versão 1</Label>
                            <div className="relative aspect-square bg-secondary border border-dashed border-border flex items-center justify-center overflow-hidden">
                              {formData.version1 ? (
                                <>
                                  <img src={formData.version1} className="h-full w-full object-cover" />
                                  <button 
                                    onClick={() => setFormData(prev => ({...prev, version1: ''}))}
                                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"
                                  >
                                    <Trash className="h-3 w-3" />
                                  </button>
                                </>
                              ) : (
                                <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                                  <Plus className="h-6 w-6 text-muted-foreground" />
                                  <input type="file" accept="image/*" onChange={(e) => handleVersionUpload(e, 'version1')} className="hidden" />
                                </label>
                              )}
                            </div>
                          </div>
                          
                          {/* Version 2 */}
                          <div className="space-y-2">
                            <Label className="text-xs">Versão 2</Label>
                            <div className="relative aspect-square bg-secondary border border-dashed border-border flex items-center justify-center overflow-hidden">
                              {formData.version2 ? (
                                <>
                                  <img src={formData.version2} className="h-full w-full object-cover" />
                                  <button 
                                    onClick={() => setFormData(prev => ({...prev, version2: ''}))}
                                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"
                                  >
                                    <Trash className="h-3 w-3" />
                                  </button>
                                </>
                              ) : (
                                <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                                  <Plus className="h-6 w-6 text-muted-foreground" />
                                  <input type="file" accept="image/*" onChange={(e) => handleVersionUpload(e, 'version2')} className="hidden" />
                                </label>
                              )}
                            </div>
                          </div>
                          
                          {/* Version 3 */}
                          <div className="space-y-2">
                            <Label className="text-xs">Versão 3</Label>
                            <div className="relative aspect-square bg-secondary border border-dashed border-border flex items-center justify-center overflow-hidden">
                              {formData.version3 ? (
                                <>
                                  <img src={formData.version3} className="h-full w-full object-cover" />
                                  <button 
                                    onClick={() => setFormData(prev => ({...prev, version3: ''}))}
                                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"
                                  >
                                    <Trash className="h-3 w-3" />
                                  </button>
                                </>
                              ) : (
                                <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                                  <Plus className="h-6 w-6 text-muted-foreground" />
                                  <input type="file" accept="image/*" onChange={(e) => handleVersionUpload(e, 'version3')} className="hidden" />
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-[10px] text-muted-foreground">Clique em cada caixa para adicionar uma imagem. Versões aparecem na galeria do produto.</p>
                        
                        {/* Video Uploads - 2 videos */}
                        <div className="grid gap-2 pt-4 border-t border-border">
                          <Label>Vídeos do Produto (2)</Label>
                          <div className="grid grid-cols-2 gap-3">
                            {/* Video 1 */}
                            <div className="space-y-1">
                              <Label className="text-xs">Vídeo 1</Label>
                              <div className="relative aspect-[9/16] max-h-32 bg-secondary border border-dashed border-border flex items-center justify-center overflow-hidden">
                                {formData.video ? (
                                  <>
                                    <video src={formData.video} className="h-full w-full object-cover" muted />
                                    <button 
                                      onClick={() => setFormData(prev => ({...prev, video: ''}))}
                                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"
                                    >
                                      <Trash className="h-3 w-3" />
                                    </button>
                                  </>
                                ) : (
                                  <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                                    <Plus className="h-5 w-5 text-muted-foreground" />
                                    <input type="file" accept="video/*" onChange={(e) => handleVideoUpload(e, 'video')} className="hidden" />
                                  </label>
                                )}
                              </div>
                            </div>
                            {/* Video 2 */}
                            <div className="space-y-1">
                              <Label className="text-xs">Vídeo 2</Label>
                              <div className="relative aspect-[9/16] max-h-32 bg-secondary border border-dashed border-border flex items-center justify-center overflow-hidden">
                                {formData.video2 ? (
                                  <>
                                    <video src={formData.video2} className="h-full w-full object-cover" muted />
                                    <button 
                                      onClick={() => setFormData(prev => ({...prev, video2: ''}))}
                                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"
                                    >
                                      <Trash className="h-3 w-3" />
                                    </button>
                                  </>
                                ) : (
                                  <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                                    <Plus className="h-5 w-5 text-muted-foreground" />
                                    <input type="file" accept="video/*" onChange={(e) => handleVideoUpload(e, 'video2')} className="hidden" />
                                  </label>
                                )}
                              </div>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground">Faça upload dos vídeos do produto (formato vertical 9:16 recomendado)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="flex-shrink-0 pt-4 border-t border-border">
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
                        <TableCell className="font-mono text-xs uppercase tracking-widest">{categories.find(c => c.id === product.categoryId)?.name || '-'}</TableCell>
                        <TableCell className="font-mono text-xs uppercase tracking-widest">{collections.find(c => c.id === product.collectionId)?.name || '-'}</TableCell>
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
              <DialogContent className="sm:max-w-[1100px] max-h-[90vh] bg-background border border-border overflow-hidden flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle className="font-display text-2xl">Editar Produto</DialogTitle>
                  <DialogDescription className="sr-only">Formulário para editar um produto existente</DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto pr-2">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-4">
                    {/* LEFT COLUMN - Basic Info */}
                    <div className="space-y-4">
                      <h3 className="font-mono text-xs uppercase tracking-widest text-primary border-b border-border pb-2">Informações Básicas</h3>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="edit-name">Nome</Label>
                        <Input id="edit-name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="rounded-none" />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="edit-price">Preço (R$)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                          <Input 
                            id="edit-price" 
                            type="text" 
                            value={formData.price} 
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^\d,]/g, '');
                              setFormData({...formData, price: value});
                            }} 
                            placeholder="0,00"
                            className="rounded-none pl-10" 
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="edit-category">Categoria</Label>
                          <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                            <SelectTrigger className="rounded-none">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {(Array.isArray(categories) ? categories : []).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
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
                              {(Array.isArray(collections) ? collections : []).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="edit-desc">Descrição</Label>
                        <Textarea id="edit-desc" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="rounded-none h-20" />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="edit-specs">Especificações (uma por linha)</Label>
                        <Textarea 
                          id="edit-specs" 
                          value={formData.specs} 
                          onChange={(e) => setFormData({...formData, specs: e.target.value})} 
                          className="rounded-none h-20" 
                          placeholder="Material: Ouro 18K&#10;Peso: 5g"
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="edit-bestsellerOrder">Ordem no Bestsellers</Label>
                        <Input id="edit-bestsellerOrder" type="number" placeholder="Deixe vazio para ocultar" value={formData.bestsellerOrder} onChange={(e) => setFormData({...formData, bestsellerOrder: e.target.value})} className="rounded-none" />
                      </div>
                      
                      {/* Stone Type Variants - for all products */}
                      <div className="border-t border-border pt-4 mt-4">
                        <h3 className="font-mono text-xs uppercase tracking-widest text-primary mb-4">Variações de Pedra (Opcional)</h3>
                        
                        <div className="space-y-4">
                          <div className="p-3 bg-secondary/30 border border-border">
                            <Label className="font-mono text-xs uppercase">Diamante Sintético</Label>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <Input type="text" placeholder="Preço R$" value={formData.priceDiamondSynthetic} onChange={(e) => setFormData({...formData, priceDiamondSynthetic: e.target.value.replace(/[^\d,]/g, '')})} className="rounded-none text-sm" />
                            </div>
                            <Textarea placeholder="Descrição..." value={formData.descriptionDiamondSynthetic} onChange={(e) => setFormData({...formData, descriptionDiamondSynthetic: e.target.value})} className="rounded-none h-16 mt-2" />
                          </div>
                          
                          <div className="p-3 bg-secondary/30 border border-border">
                            <Label className="font-mono text-xs uppercase">Zircônia</Label>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <Input type="text" placeholder="Preço R$" value={formData.priceZirconia} onChange={(e) => setFormData({...formData, priceZirconia: e.target.value.replace(/[^\d,]/g, '')})} className="rounded-none text-sm" />
                            </div>
                            <Textarea placeholder="Descrição..." value={formData.descriptionZirconia} onChange={(e) => setFormData({...formData, descriptionZirconia: e.target.value})} className="rounded-none h-16 mt-2" />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* RIGHT COLUMN - Media */}
                    <div className="space-y-4">
                      <h3 className="font-mono text-xs uppercase tracking-widest text-primary border-b border-border pb-2">Mídia do Produto</h3>
                      
                      {/* Image Grid - 4 boxes */}
                      <div className="grid grid-cols-4 gap-3">
                        {/* Main Image */}
                        <div className="space-y-2">
                          <Label className="text-xs">Imagem Principal</Label>
                          <div className="relative aspect-square bg-secondary border border-dashed border-border flex items-center justify-center overflow-hidden">
                            {formData.image ? (
                              <>
                                <img src={formData.image} className="h-full w-full object-cover" />
                                <button 
                                  onClick={() => setFormData(prev => ({...prev, image: ''}))}
                                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"
                                >
                                  <Trash className="h-3 w-3" />
                                </button>
                              </>
                            ) : (
                              <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                                <Plus className="h-6 w-6 text-muted-foreground" />
                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image')} className="hidden" />
                              </label>
                            )}
                          </div>
                        </div>
                        
                        {/* Version 1 */}
                        <div className="space-y-2">
                          <Label className="text-xs">Versão 1</Label>
                          <div className="relative aspect-square bg-secondary border border-dashed border-border flex items-center justify-center overflow-hidden">
                            {formData.version1 ? (
                              <>
                                <img src={formData.version1} className="h-full w-full object-cover" />
                                <button 
                                  onClick={() => setFormData(prev => ({...prev, version1: ''}))}
                                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"
                                >
                                  <Trash className="h-3 w-3" />
                                </button>
                              </>
                            ) : (
                              <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                                <Plus className="h-6 w-6 text-muted-foreground" />
                                <input type="file" accept="image/*" onChange={(e) => handleVersionUpload(e, 'version1')} className="hidden" />
                              </label>
                            )}
                          </div>
                        </div>
                        
                        {/* Version 2 */}
                        <div className="space-y-2">
                          <Label className="text-xs">Versão 2</Label>
                          <div className="relative aspect-square bg-secondary border border-dashed border-border flex items-center justify-center overflow-hidden">
                            {formData.version2 ? (
                              <>
                                <img src={formData.version2} className="h-full w-full object-cover" />
                                <button 
                                  onClick={() => setFormData(prev => ({...prev, version2: ''}))}
                                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"
                                >
                                  <Trash className="h-3 w-3" />
                                </button>
                              </>
                            ) : (
                              <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                                <Plus className="h-6 w-6 text-muted-foreground" />
                                <input type="file" accept="image/*" onChange={(e) => handleVersionUpload(e, 'version2')} className="hidden" />
                              </label>
                            )}
                          </div>
                        </div>
                        
                        {/* Version 3 */}
                        <div className="space-y-2">
                          <Label className="text-xs">Versão 3</Label>
                          <div className="relative aspect-square bg-secondary border border-dashed border-border flex items-center justify-center overflow-hidden">
                            {formData.version3 ? (
                              <>
                                <img src={formData.version3} className="h-full w-full object-cover" />
                                <button 
                                  onClick={() => setFormData(prev => ({...prev, version3: ''}))}
                                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"
                                >
                                  <Trash className="h-3 w-3" />
                                </button>
                              </>
                            ) : (
                              <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                                <Plus className="h-6 w-6 text-muted-foreground" />
                                <input type="file" accept="image/*" onChange={(e) => handleVersionUpload(e, 'version3')} className="hidden" />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-[10px] text-muted-foreground">Clique em cada caixa para adicionar uma imagem. Versões aparecem na galeria do produto.</p>
                      
                      {/* Video Uploads - 2 videos */}
                      <div className="grid gap-2 pt-4 border-t border-border">
                        <Label>Vídeos do Produto (2)</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {/* Video 1 */}
                          <div className="space-y-1">
                            <Label className="text-xs">Vídeo 1</Label>
                            <div className="relative aspect-[9/16] max-h-32 bg-secondary border border-dashed border-border flex items-center justify-center overflow-hidden">
                              {formData.video ? (
                                <>
                                  <video src={formData.video} className="h-full w-full object-cover" muted />
                                  <button 
                                    onClick={() => setFormData(prev => ({...prev, video: ''}))}
                                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"
                                  >
                                    <Trash className="h-3 w-3" />
                                  </button>
                                </>
                              ) : (
                                <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                                  <Plus className="h-5 w-5 text-muted-foreground" />
                                  <input type="file" accept="video/*" onChange={(e) => handleVideoUpload(e, 'video')} className="hidden" />
                                </label>
                              )}
                            </div>
                          </div>
                          {/* Video 2 */}
                          <div className="space-y-1">
                            <Label className="text-xs">Vídeo 2</Label>
                            <div className="relative aspect-[9/16] max-h-32 bg-secondary border border-dashed border-border flex items-center justify-center overflow-hidden">
                              {formData.video2 ? (
                                <>
                                  <video src={formData.video2} className="h-full w-full object-cover" muted />
                                  <button 
                                    onClick={() => setFormData(prev => ({...prev, video2: ''}))}
                                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"
                                  >
                                    <Trash className="h-3 w-3" />
                                  </button>
                                </>
                              ) : (
                                <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                                  <Plus className="h-5 w-5 text-muted-foreground" />
                                  <input type="file" accept="video/*" onChange={(e) => handleVideoUpload(e, 'video2')} className="hidden" />
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Faça upload dos vídeos do produto (formato vertical 9:16 recomendado)</p>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter className="flex-shrink-0 pt-4 border-t border-border">
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
                    <DialogDescription className="sr-only">Formulário para adicionar uma nova categoria</DialogDescription>
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
                        {(Array.isArray(products) ? products : []).map(p => (
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
              {(Array.isArray(categories) ? categories : []).map(cat => (
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
                    <DialogDescription className="sr-only">Formulário para adicionar uma nova coleção</DialogDescription>
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

                    <div className="grid gap-2">
                      <Label>Imagem da Coleção</Label>
                      <div className="flex gap-4 items-center">
                        <Input 
                            type="file" 
                            accept="image/*"
                            onChange={handleCollectionImageUpload}
                            className="rounded-none font-mono text-xs" 
                        />
                        {colFormData.image && <div className="h-10 w-10 bg-secondary"><img src={colFormData.image} className="h-full w-full object-cover" /></div>}
                      </div>
                    </div>
                    
                    <div className="grid gap-2 mt-4">
                    <Label>Selecionar Produtos</Label>
                    <div className="border border-border p-4 h-48 overflow-y-auto space-y-2">
                        {(Array.isArray(products) ? products : []).map(p => (
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
              {(Array.isArray(collections) ? collections : []).map(col => (
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
             <div className="flex justify-end">
               <Button onClick={handleDownloadCustomers} variant="outline" className="rounded-none border-black text-black hover:bg-black hover:text-white uppercase tracking-widest font-mono text-xs px-6 h-10 flex gap-2">
                 <Download className="h-4 w-4" /> Exportar CSV
               </Button>
             </div>
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
                  {(Array.isArray(customers) ? customers : []).map((customer) => (
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
                    <DialogDescription className="sr-only">Formulário para adicionar um novo post ao blog</DialogDescription>
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
                  <DialogDescription className="sr-only">Formulário para editar um post existente</DialogDescription>
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

          {/* NEWSLETTER TAB */}
          <TabsContent value="newsletter" className="space-y-6">
             {/* Subscriber Type Filters */}
             <div className="flex flex-wrap gap-2 pb-2 border-b border-border">
               <Button 
                 variant={subscriberFilter === 'all' ? 'default' : 'outline'}
                 size="sm"
                 onClick={() => setSubscriberFilter('all')}
                 className={`rounded-none font-mono text-xs ${subscriberFilter === 'all' ? 'bg-black text-white' : 'border-black'}`}
                 data-testid="filter-all-subscribers"
               >
                 📧 Newsletter ({subscriberCounts.all})
               </Button>
               <Button 
                 variant={subscriberFilter === 'newsletter' ? 'default' : 'outline'}
                 size="sm"
                 onClick={() => setSubscriberFilter('newsletter')}
                 className={`rounded-none font-mono text-xs ${subscriberFilter === 'newsletter' ? 'bg-gray-600 text-white' : 'border-gray-600'}`}
                 data-testid="filter-newsletter-subscribers"
               >
                 Apenas Inscritos ({subscriberCounts.newsletter})
               </Button>
               <Button 
                 variant={subscriberFilter === 'lead' ? 'default' : 'outline'}
                 size="sm"
                 onClick={() => setSubscriberFilter('lead')}
                 className={`rounded-none font-mono text-xs ${subscriberFilter === 'lead' ? 'bg-amber-500 text-white' : 'border-amber-500 text-amber-600'}`}
                 data-testid="filter-lead-subscribers"
               >
                 Leads ({subscriberCounts.lead})
               </Button>
               <Button 
                 variant={subscriberFilter === 'customer' ? 'default' : 'outline'}
                 size="sm"
                 onClick={() => setSubscriberFilter('customer')}
                 className={`rounded-none font-mono text-xs ${subscriberFilter === 'customer' ? 'bg-emerald-600 text-white' : 'border-emerald-600 text-emerald-600'}`}
                 data-testid="filter-customer-subscribers"
               >
                 Clientes ({subscriberCounts.customer})
               </Button>
             </div>

             <div className="flex justify-between items-center">
               <p className="text-muted-foreground font-mono text-xs">{filteredSubscribers.length} assinantes {subscriberFilter !== 'all' && `(${subscriberFilter})`}</p>
               <div className="flex gap-3">
                 <Dialog open={isAddSubscriberOpen} onOpenChange={setIsAddSubscriberOpen}>
                   <DialogTrigger asChild>
                     <Button className="rounded-none bg-black text-white hover:bg-black/80 uppercase tracking-widest font-mono text-xs px-6 h-10 flex gap-2" data-testid="button-add-subscriber">
                       <Plus className="h-4 w-4" /> Adicionar
                     </Button>
                   </DialogTrigger>
                   <DialogContent className="sm:max-w-[400px] bg-background border border-border">
                     <DialogHeader>
                       <DialogTitle className="font-display text-2xl">Adicionar Assinante</DialogTitle>
                       <DialogDescription className="sr-only">Formulário para adicionar um novo assinante</DialogDescription>
                     </DialogHeader>
                     <div className="grid gap-4 py-4">
                       <div className="grid gap-2">
                         <Label>Nome</Label>
                         <Input 
                           value={subscriberFormData.name} 
                           onChange={(e) => setSubscriberFormData({...subscriberFormData, name: e.target.value})} 
                           className="rounded-none"
                           placeholder="Nome do contato"
                           data-testid="input-subscriber-name"
                         />
                       </div>
                       <div className="grid gap-2">
                         <Label>Email *</Label>
                         <Input 
                           type="email"
                           value={subscriberFormData.email} 
                           onChange={(e) => setSubscriberFormData({...subscriberFormData, email: e.target.value})} 
                           className="rounded-none"
                           placeholder="email@exemplo.com"
                           data-testid="input-subscriber-email"
                         />
                       </div>
                       <div className="grid gap-2">
                         <Label>Tipo</Label>
                         <Select 
                           value={subscriberFormData.type} 
                           onValueChange={(value) => setSubscriberFormData({...subscriberFormData, type: value})}
                         >
                           <SelectTrigger className="rounded-none" data-testid="select-subscriber-type">
                             <SelectValue />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="newsletter">Newsletter</SelectItem>
                             <SelectItem value="lead">Lead</SelectItem>
                             <SelectItem value="customer">Cliente</SelectItem>
                           </SelectContent>
                         </Select>
                       </div>
                     </div>
                     <DialogFooter>
                       <Button onClick={handleAddSubscriber} className="rounded-none w-full bg-black text-white hover:bg-primary uppercase tracking-widest font-mono text-xs" data-testid="button-save-subscriber">Adicionar</Button>
                     </DialogFooter>
                   </DialogContent>
                 </Dialog>

                 <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                   <DialogTrigger asChild>
                     <Button variant="outline" className="rounded-none border-black text-black hover:bg-black hover:text-white uppercase tracking-widest font-mono text-xs px-6 h-10 flex gap-2" data-testid="button-import-subscribers">
                       <UserPlus className="h-4 w-4" /> Importar
                     </Button>
                   </DialogTrigger>
                   <DialogContent className="sm:max-w-[500px] bg-background border border-border">
                     <DialogHeader>
                       <DialogTitle className="font-display text-2xl">Importar Lista</DialogTitle>
                       <DialogDescription className="sr-only">Formulário para importar lista de assinantes</DialogDescription>
                     </DialogHeader>
                     <div className="grid gap-4 py-4">
                       <div className="grid gap-2">
                         <Label>Cole a lista de emails</Label>
                         <Textarea 
                           value={importText} 
                           onChange={(e) => setImportText(e.target.value)} 
                           className="rounded-none h-48"
                           placeholder={"Nome, email@exemplo.com\nOutro Nome, outro@email.com\n\nOu apenas:\nemail@exemplo.com\noutro@email.com"}
                           data-testid="textarea-import-list"
                         />
                         <p className="text-[10px] text-muted-foreground">Formato: Nome, Email (um por linha) ou apenas Email</p>
                       </div>
                     </div>
                     <DialogFooter>
                       <Button 
                         onClick={handleImportSubscribers} 
                         disabled={isImporting}
                         className="rounded-none w-full bg-black text-white hover:bg-primary uppercase tracking-widest font-mono text-xs"
                         data-testid="button-confirm-import"
                       >
                         {isImporting ? 'Importando...' : 'Importar Lista'}
                       </Button>
                     </DialogFooter>
                   </DialogContent>
                 </Dialog>

                 <Button onClick={handleDownloadSubscribers} variant="outline" className="rounded-none border-black text-black hover:bg-black hover:text-white uppercase tracking-widest font-mono text-xs px-6 h-10 flex gap-2" data-testid="button-export-subscribers">
                   <Download className="h-4 w-4" /> Exportar
                 </Button>
               </div>
             </div>
             <div className="border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12">Nome</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12">Email</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12">Tipo</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12">Data</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12">Status</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscribers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        {subscriberFilter === 'all' 
                          ? 'Nenhum assinante ainda. Adicione ou importe contatos.'
                          : `Nenhum assinante do tipo "${subscriberFilter === 'newsletter' ? 'Newsletter' : subscriberFilter === 'lead' ? 'Lead' : 'Cliente'}".`
                        }
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSubscribers.map((sub) => (
                      <TableRow key={sub.id} className="hover:bg-secondary/30 border-b border-border transition-colors" data-testid={`row-subscriber-${sub.id}`}>
                        <TableCell className="font-display text-base">{sub.name || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{sub.email}</TableCell>
                        <TableCell className="font-mono text-xs uppercase">
                          {getTypeBadge(sub.type || 'newsletter')}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{sub.date}</TableCell>
                        <TableCell className="font-mono text-xs uppercase">
                          <span className={`px-2 py-1 text-[10px] ${sub.status === 'active' ? 'bg-black text-white' : 'bg-gray-300 text-gray-700'}`}>
                            {sub.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteSubscriber(sub.id, sub.email)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
                            data-testid={`button-delete-subscriber-${sub.id}`}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
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

          {/* ADMINS TAB - Only visible to primary admin */}
          {isPrimaryAdmin && (
            <TabsContent value="admins" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="font-display text-2xl">Gerenciar Administradores</h2>
                  <p className="font-mono text-xs text-muted-foreground mt-1">
                    Adicione ou remova administradores do sistema.
                  </p>
                </div>
                <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
                  <DialogTrigger asChild>
                    <Button className="rounded-none bg-black text-white hover:bg-primary uppercase tracking-widest font-mono text-xs px-6 h-10 flex gap-2">
                      <UserPlus className="h-4 w-4" /> Novo Admin
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] bg-background border border-border">
                    <DialogHeader>
                      <DialogTitle className="font-display text-2xl">Adicionar Administrador</DialogTitle>
                      <DialogDescription className="sr-only">Formulário para adicionar um novo administrador</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label>Email</Label>
                        <Input 
                          type="email"
                          value={adminFormData.email} 
                          onChange={(e) => setAdminFormData({...adminFormData, email: e.target.value})} 
                          className="rounded-none"
                          placeholder="novo.admin@email.com"
                          data-testid="input-admin-email"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Senha</Label>
                        <Input 
                          type="password"
                          value={adminFormData.password} 
                          onChange={(e) => setAdminFormData({...adminFormData, password: e.target.value})} 
                          className="rounded-none"
                          placeholder="Mínimo 6 caracteres"
                          data-testid="input-admin-password"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Confirmar Senha</Label>
                        <Input 
                          type="password"
                          value={adminFormData.confirmPassword} 
                          onChange={(e) => setAdminFormData({...adminFormData, confirmPassword: e.target.value})} 
                          className="rounded-none"
                          placeholder="Repita a senha"
                          data-testid="input-admin-confirm-password"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        onClick={handleAddAdmin} 
                        className="rounded-none w-full bg-black text-white hover:bg-primary uppercase tracking-widest font-mono text-xs"
                        data-testid="button-add-admin"
                      >
                        Adicionar Administrador
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border">
                      <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12">Email</TableHead>
                      <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12">Status</TableHead>
                      <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12">Adicionado em</TableHead>
                      <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground h-12 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingAdmins ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : adminUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Nenhum administrador encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      adminUsers.map((admin) => (
                        <TableRow key={admin.id} className="hover:bg-secondary/30 border-b border-border transition-colors">
                          <TableCell className="py-4 font-mono text-sm">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-muted-foreground" />
                              {admin.username}
                              {admin.username === PRIMARY_ADMIN_EMAIL && (
                                <span className="bg-black text-white px-2 py-0.5 text-[10px] font-mono uppercase">Principal</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs uppercase tracking-widest text-green-600">
                            Ativo
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString('pt-BR') : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {admin.username !== PRIMARY_ADMIN_EMAIL && (
                              <Button 
                                onClick={() => handleDeleteAdmin(admin.id, admin.username)} 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 hover:text-destructive hover:bg-transparent"
                                data-testid={`button-delete-admin-${admin.id}`}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
