import { useState } from 'react';
import { Link } from 'wouter';
import { Package, Heart, LogOut, User, MapPin, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';

export default function Account() {
  const [activeTab, setActiveTab] = useState("orders");

  return (
    <div className="min-h-screen bg-background pt-32 pb-24">
      <div className="container mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 border-b border-border pb-8">
          <div>
            <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tighter mb-2">Minha Conta</h1>
            <p className="font-mono text-sm text-muted-foreground uppercase tracking-widest">
              Bem-vindo de volta, Cliente VIP.
            </p>
          </div>
          <Link href="/login">
            <Button variant="outline" className="rounded-none border-black hover:bg-black hover:text-white font-mono text-xs uppercase tracking-widest mt-4 md:mt-0 flex items-center gap-2">
              <LogOut className="h-3 w-3" /> Sair
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
             <div className="flex flex-col space-y-2 sticky top-32">
               <button 
                 onClick={() => setActiveTab("orders")}
                 className={`text-left px-4 py-3 font-mono text-xs uppercase tracking-widest border-l-2 transition-all ${activeTab === "orders" ? "border-black bg-secondary/50" : "border-transparent hover:bg-secondary/30"}`}
               >
                 Meus Pedidos
               </button>
               <button 
                 onClick={() => setActiveTab("profile")}
                 className={`text-left px-4 py-3 font-mono text-xs uppercase tracking-widest border-l-2 transition-all ${activeTab === "profile" ? "border-black bg-secondary/50" : "border-transparent hover:bg-secondary/30"}`}
               >
                 Perfil
               </button>
               <button 
                 onClick={() => setActiveTab("wishlist")}
                 className={`text-left px-4 py-3 font-mono text-xs uppercase tracking-widest border-l-2 transition-all ${activeTab === "wishlist" ? "border-black bg-secondary/50" : "border-transparent hover:bg-secondary/30"}`}
               >
                 Lista de Desejos
               </button>
             </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3 min-h-[50vh]">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === "orders" && (
                <div className="space-y-8">
                  <h2 className="font-display text-3xl mb-6">Histórico de Pedidos</h2>
                  {/* Mock Order */}
                  <div className="border border-border p-6 hover:border-black transition-colors group">
                    <div className="flex flex-col md:flex-row justify-between mb-6 pb-6 border-b border-border">
                      <div className="space-y-1">
                        <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest block">Pedido #AUR-8921</span>
                        <span className="font-mono text-xs block">28 Nov, 2025</span>
                      </div>
                      <div className="mt-4 md:mt-0">
                        <span className="bg-black text-white px-3 py-1 font-mono text-[10px] uppercase tracking-widest">Em Processamento</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                       <div className="h-20 w-20 bg-secondary overflow-hidden">
                         {/* Placeholder for product image */}
                         <div className="w-full h-full bg-gray-200" />
                       </div>
                       <div>
                         <h3 className="font-display text-lg">Anel Solitário Royal</h3>
                         <p className="font-mono text-sm text-muted-foreground">R$ 12.500,00</p>
                       </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                      <Button variant="link" className="font-mono text-xs uppercase tracking-widest underline-offset-4">Ver Detalhes</Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "profile" && (
                <div className="space-y-12">
                  <div>
                    <h2 className="font-display text-3xl mb-8">Dados Pessoais</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Nome Completo</label>
                        <div className="border-b border-border py-2 font-display text-xl">Cliente VIP</div>
                      </div>
                      <div className="space-y-2">
                        <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Email</label>
                        <div className="border-b border-border py-2 font-display text-xl">cliente@aurum.com</div>
                      </div>
                      <div className="space-y-2">
                        <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Telefone</label>
                        <div className="border-b border-border py-2 font-display text-xl">+55 11 99999-9999</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "wishlist" && (
                <div className="space-y-8">
                  <h2 className="font-display text-3xl mb-6">Lista de Desejos</h2>
                  <p className="font-mono text-sm text-muted-foreground">Sua lista de desejos está vazia.</p>
                  <Link href="/shop">
                    <Button className="rounded-none bg-black text-white hover:bg-primary uppercase tracking-widest font-mono text-xs px-8">
                      Explorar Coleção
                    </Button>
                  </Link>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
