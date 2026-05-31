import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { Product, products as initialProducts, Category, categories as initialCategories, Collection, collections as initialCollections, Branding, initialBranding, JournalPost, initialPosts } from '@/lib/mockData';
import ringImage from '@assets/generated_images/diamond_ring_product_shot.webp';
import { getCsrfToken } from '@/lib/csrf';
import { useAuth } from '@/context/AuthContext';

export interface CartItem {
  productId: number;
  quantity: number;
  stoneType?: string;
}

interface ProductContextType {
  products: Product[];
  categories: Category[];
  collections: Collection[];
  orders: any[];
  customers: any[];
  posts: JournalPost[];
  wishlist: number[];
  branding: Branding;
  cart: CartItem[];
  isLoading: boolean;
  
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: number, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  reorderProducts: (orderedIds: number[]) => Promise<void>;
  
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
  
  addCollection: (collection: Omit<Collection, 'id'>) => Promise<void>;
  updateCollection: (id: number, collection: Partial<Collection>) => Promise<void>;
  deleteCollection: (id: number) => Promise<void>;
  
  addPost: (post: Omit<JournalPost, 'id' | 'date'>) => Promise<void>;
  deletePost: (id: number) => Promise<void>;
  updatePost: (id: number, post: Partial<JournalPost>) => Promise<void>;
  
  updateOrder: (id: string, status: string) => void;
  toggleWishlist: (productId: number) => void;
  updateBranding: (newBranding: Partial<Branding>) => Promise<void>;
  
  addToCart: (productId: number, quantity?: number, stoneType?: string) => void;
  removeFromCart: (productId: number, stoneType?: string) => void;
  updateCartQuantity: (productId: number, quantity: number, stoneType?: string) => void;
  clearCart: () => void;
  getCartCount: () => number;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

function readLocalCart(): CartItem[] {
  try {
    const savedCart = localStorage.getItem('zkrezk_cart');
    if (savedCart) return JSON.parse(savedCart);
  } catch {}
  return [];
}

function writeLocalCart(cart: CartItem[]) {
  try {
    localStorage.setItem('zkrezk_cart', JSON.stringify(cart));
  } catch {}
}

function clearLocalCart() {
  try {
    localStorage.removeItem('zkrezk_cart');
  } catch {}
}

function mergeCartItems(local: CartItem[], remote: CartItem[]): CartItem[] {
  const merged = [...remote];
  for (const localItem of local) {
    const existing = merged.find(
      r => r.productId === localItem.productId && r.stoneType === localItem.stoneType
    );
    if (existing) {
      existing.quantity = Math.max(existing.quantity, localItem.quantity);
    } else {
      merged.push(localItem);
    }
  }
  return merged;
}

async function pushCartToServer(items: CartItem[]): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const csrfToken = getCsrfToken();
  if (csrfToken) headers['x-csrf-token'] = csrfToken;
  const res = await fetch('/api/cart', {
    method: 'PUT',
    headers,
    credentials: 'include',
    body: JSON.stringify(items),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Cart sync failed (${res.status}): ${text}`);
  }
}

export function ProductProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [collections, setCollections] = useState<Collection[]>(initialCollections);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers] = useState<any[]>([]);
  const [posts, setPosts] = useState<JournalPost[]>(initialPosts);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [branding, setBranding] = useState<Branding>(initialBranding);
  const [cart, setCart] = useState<CartItem[]>(readLocalCart);
  const [isLoading, setIsLoading] = useState(true);

  // Epoch counter: incremented on every login transition.
  // A pending sync timeout captures the epoch at scheduling time and checks it before firing.
  // If the epoch advanced (a new login/hydration started), the stale sync is cancelled.
  const syncEpochRef = useRef(0);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUserIdRef = useRef<number | null>(null);

  // Debounced cart→server sync. Only fires if the captured epoch still matches current epoch.
  const scheduleSyncToServer = useCallback((items: CartItem[]) => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    const capturedEpoch = syncEpochRef.current;
    syncTimeoutRef.current = setTimeout(async () => {
      if (syncEpochRef.current !== capturedEpoch) {
        // Hydration happened between schedule and fire — abort to avoid overwriting merged cart.
        return;
      }
      try {
        await pushCartToServer(items);
      } catch (err) {
        console.error('Failed to sync cart to server:', err);
      }
    }, 500);
  }, []);

  // Persist cart to localStorage on every change.
  // For authenticated users, also schedule a debounced sync to server — but only when
  // the epoch is stable (i.e., not mid-hydration). The epoch check inside the timeout
  // guards against pre-hydration stale data reaching the server.
  useEffect(() => {
    writeLocalCart(cart);
    if (user) {
      scheduleSyncToServer(cart);
    }
  }, [cart, user, scheduleSyncToServer]);

  // Handle login / logout transitions.
  useEffect(() => {
    if (authLoading) return;

    const currentUserId = user?.id ?? null;

    if (currentUserId !== null && currentUserId !== prevUserIdRef.current) {
      // --- LOGIN TRANSITION ---
      // Increment epoch immediately so any sync timeout that was just scheduled
      // (by the cart-persist effect above) will see a stale epoch and abort.
      syncEpochRef.current += 1;

      (async () => {
        try {
          const res = await fetch('/api/cart', { credentials: 'include' });
          if (!res.ok) {
            console.error('Failed to load server cart:', res.status);
            return;
          }
          const serverItems: CartItem[] = await res.json();
          // Read current local cart at merge time (may differ from stale closure value)
          const localItems = readLocalCart();
          const merged = mergeCartItems(localItems, serverItems);
          writeLocalCart(merged);
          setCart(merged);
          // Push the merged cart to server. getCsrfToken() is called here, well after
          // AuthContext.login() has completed fetchCsrfToken(), so the token is fresh.
          await pushCartToServer(merged);
        } catch (err) {
          console.error('Failed to hydrate cart on login:', err);
        }
        // Epoch is NOT re-incremented here. The setCart(merged) above triggers the
        // cart-persist effect which schedules a sync with the current epoch. That
        // sync will also carry the merged cart (same data), so it is harmless.
      })();

    } else if (currentUserId === null && prevUserIdRef.current !== null) {
      // --- LOGOUT TRANSITION ---
      syncEpochRef.current += 1; // cancel any pending sync
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      clearLocalCart();
      setCart([]);
    }

    prevUserIdRef.current = currentUserId;
  }, [user, authLoading]);

  // Load catalogue data from server on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsRes, categoriesRes, collectionsRes, postsRes, brandingRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/categories'),
          fetch('/api/collections'),
          fetch('/api/journal'),
          fetch('/api/branding'),
        ]);
        
        const productsData = await productsRes.json().catch(() => []);
        const categoriesData = await categoriesRes.json().catch(() => []);
        const collectionsData = await collectionsRes.json().catch(() => []);
        const postsData = await postsRes.json().catch(() => []);
        const brandingData = await brandingRes.json().catch(() => initialBranding);
        
        setProducts(productsData || []);
        setCategories(categoriesData || []);
        setCollections(collectionsData || []);
        setPosts(postsData || []);
        setBranding(brandingData || initialBranding);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Branding
  const updateBranding = async (newBranding: Partial<Branding>) => {
    try {
      const response = await fetch('/api/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBranding)
      });
      if (response.ok) {
        const data = await response.json();
        setBranding(data);
      }
    } catch (err) {
      console.error('Failed to update branding:', err);
      setBranding(prev => ({ ...prev, ...newBranding }));
    }
  };

  // Products
  const addProduct = async (newProduct: Omit<Product, 'id'>) => {
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newProduct)
      });
      if (response.ok) {
        const product = await response.json();
        setProducts(prev => [...prev, product]);
      } else {
        console.error('Failed to add product:', await response.text());
      }
    } catch (err) {
      console.error('Failed to add product:', err);
    }
  };

  const updateProduct = async (id: number, updatedFields: Partial<Product>) => {
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatedFields)
      });
      if (response.ok) {
        const updated = await response.json();
        setProducts(prev => {
          const exists = prev.some(p => p.id === id);
          if (exists) {
            return prev.map(p => (p.id === id ? updated : p));
          } else {
            return [...prev, updated];
          }
        });
      } else {
        console.error('Failed to update product:', await response.text());
      }
    } catch (err) {
      console.error('Failed to update product:', err);
    }
  };

  const deleteProduct = async (id: number) => {
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        setProducts(prev => prev.filter(p => p.id !== id));
      } else {
        console.error('Failed to delete product:', await response.text());
      }
    } catch (err) {
      console.error('Failed to delete product:', err);
    }
  };

  const reorderProducts = async (orderedIds: number[]) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const csrfToken = getCsrfToken();
      if (csrfToken) headers['x-csrf-token'] = csrfToken;
      const response = await fetch('/api/products/reorder', {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({ orderedIds })
      });
      if (response.ok) {
        setProducts(prev => {
          const ordered = orderedIds.map((id, idx) => {
            const p = prev.find(pr => pr.id === id);
            if (p) return { ...p, displayOrder: idx + 1 };
            return p;
          }).filter(Boolean) as Product[];
          const remaining = prev.filter(p => !orderedIds.includes(p.id));
          return [...ordered, ...remaining];
        });
      }
    } catch (err) {
      console.error('Failed to reorder products:', err);
    }
  };

  // Categories
  const addCategory = async (newCategory: Omit<Category, 'id'>) => {
    try {
      const slug = newCategory.name.toLowerCase().replace(/\s+/g, '-');
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...newCategory, slug })
      });
      if (response.ok) {
        const category = await response.json();
        setCategories(prev => [...prev, category]);
      } else {
        console.error('Failed to add category:', await response.text());
      }
    } catch (err) {
      console.error('Failed to add category:', err);
    }
  };

  const deleteCategory = async (id: number) => {
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        setCategories(prev => prev.filter(c => c.id !== id));
      } else {
        console.error('Failed to delete category:', await response.text());
      }
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  };

  // Collections
  const addCollection = async (newCollection: Omit<Collection, 'id'>) => {
    try {
      const slug = newCollection.name.toLowerCase().replace(/\s+/g, '-');
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          ...newCollection, 
          slug,
          image: newCollection.image || ringImage 
        })
      });
      if (response.ok) {
        const collection = await response.json();
        setCollections(prev => [...prev, collection]);
      } else {
        console.error('Failed to add collection:', await response.text());
      }
    } catch (err) {
      console.error('Failed to add collection:', err);
    }
  };

  const updateCollection = async (id: number, updatedCollection: Partial<Collection>) => {
    try {
      const response = await fetch(`/api/collections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatedCollection)
      });
      if (response.ok) {
        const collection = await response.json();
        setCollections(prev => prev.map(c => c.id === id ? collection : c));
      } else {
        console.error('Failed to update collection:', await response.text());
      }
    } catch (err) {
      console.error('Failed to update collection:', err);
    }
  };

  const deleteCollection = async (id: number) => {
    try {
      const response = await fetch(`/api/collections/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        setCollections(prev => prev.filter(c => c.id !== id));
      } else {
        console.error('Failed to delete collection:', await response.text());
      }
    } catch (err) {
      console.error('Failed to delete collection:', err);
    }
  };
  
  // Posts
  const addPost = async (newPost: Omit<JournalPost, 'id' | 'date'>) => {
    try {
      const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
      const response = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...newPost, date })
      });
      if (response.ok) {
        const post = await response.json();
        setPosts(prev => [...prev, post]);
      } else {
        console.error('Failed to add post:', await response.text());
      }
    } catch (err) {
      console.error('Failed to add post:', err);
    }
  };

  const deletePost = async (id: number) => {
    try {
      const response = await fetch(`/api/journal/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        setPosts(prev => prev.filter(p => p.id !== id));
      } else {
        console.error('Failed to delete post:', await response.text());
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  const updatePost = async (id: number, updatedFields: Partial<JournalPost>) => {
    try {
      const response = await fetch(`/api/journal/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatedFields)
      });
      if (response.ok) {
        const updated = await response.json();
        setPosts(prev => prev.map(p => (p.id === id ? updated : p)));
      } else {
        console.error('Failed to update post:', await response.text());
      }
    } catch (err) {
      console.error('Failed to update post:', err);
    }
  };

  // Orders
  const updateOrder = (id: string, status: string) => {
    setOrders(orders.map(o => (o.id === id ? { ...o, status } : o)));
  };

  // Wishlist
  const toggleWishlist = (productId: number) => {
    setWishlist(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Cart
  const addToCart = (productId: number, quantity: number = 1, stoneType?: string) => {
    setCart(prev => {
      const existingItem = prev.find(item => 
        item.productId === productId && item.stoneType === stoneType
      );
      if (existingItem) {
        return prev.map(item => 
          item.productId === productId && item.stoneType === stoneType
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { productId, quantity, stoneType }];
    });
  };

  const removeFromCart = (productId: number, stoneType?: string) => {
    setCart(prev => prev.filter(item => 
      !(item.productId === productId && item.stoneType === stoneType)
    ));
  };

  const updateCartQuantity = (productId: number, quantity: number, stoneType?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, stoneType);
      return;
    }
    setCart(prev => prev.map(item => 
      item.productId === productId && item.stoneType === stoneType
        ? { ...item, quantity }
        : item
    ));
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  return (
    <ProductContext.Provider value={{ 
      products, categories, collections, orders, customers, posts, wishlist, cart, isLoading,
      addProduct, updateProduct, deleteProduct, reorderProducts,
      addCategory, deleteCategory,
      addCollection, updateCollection, deleteCollection,
      addPost, deletePost, updatePost,
      updateOrder, toggleWishlist,
      branding, updateBranding,
      addToCart, removeFromCart, updateCartQuantity, clearCart, getCartCount
    }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
}
