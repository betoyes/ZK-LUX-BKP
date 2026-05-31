import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Package, Heart, LogOut, User, Shield, Loader2, Save, CheckCircle2, MailWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCsrfToken } from '@/lib/csrf';

function maskCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

function maskCep(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.replace(/(\d{5})(\d)/, '$1-$2');
}

export default function Account() {
  const [activeTab, setActiveTab] = useState("orders");
  const { user, logout, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [resendingVerification, setResendingVerification] = useState(false);

  const handleResendVerification = async () => {
    if (!user?.username || resendingVerification) return;
    setResendingVerification(true);
    try {
      await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.username }),
        credentials: 'include',
      });
      toast({ title: "Email enviado", description: "Verifique sua caixa de entrada para confirmar seu email." });
    } catch {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível reenviar o email." });
    } finally {
      setResendingVerification(false);
    }
  };

  const [profileForm, setProfileForm] = useState({
    fullName: '',
    cpfCnpj: '',
    phone: '',
    addressStreet: '',
    addressNumber: '',
    addressComplement: '',
    addressNeighborhood: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => fetch('/api/users/profile', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        fullName: profile.fullName || '',
        cpfCnpj: profile.cpfCnpj || '',
        phone: profile.phone || '',
        addressStreet: profile.addressStreet || '',
        addressNumber: profile.addressNumber || '',
        addressComplement: profile.addressComplement || '',
        addressNeighborhood: profile.addressNeighborhood || '',
        addressCity: profile.addressCity || '',
        addressState: profile.addressState || '',
        addressZip: profile.addressZip || '',
      });
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(getCsrfToken() ? { 'x-csrf-token': getCsrfToken()! } : {}),
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Erro ao salvar');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast({ title: "Dados salvos", description: "Suas informações foram atualizadas com sucesso." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    },
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-32 pb-24 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Até logo!",
        description: "Você foi desconectado com sucesso.",
      });
      setLocation('/login');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível desconectar.",
      });
    }
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileForm);
  };

  const handleFieldChange = (field: string, value: string) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background pt-32 pb-24">
      <div className="container mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 border-b border-border pb-8">
          <div>
            <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tighter mb-2">Minha Conta</h1>
            <p className="font-mono text-sm text-muted-foreground uppercase tracking-widest">
              Bem-vindo de volta{user?.username ? `, ${user.username}` : ''}.
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="rounded-none border-black hover:bg-black hover:text-white font-mono text-xs uppercase tracking-widest mt-4 md:mt-0 flex items-center gap-2"
            data-testid="button-logout"
          >
            <LogOut className="h-3 w-3" /> Sair
          </Button>
        </div>

        {user && !user.emailVerified && (
          <div className="mb-8 border border-amber-300 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3" data-testid="email-verification-banner">
            <MailWarning className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="font-mono text-xs uppercase tracking-widest text-amber-800 mb-1">Email não confirmado</p>
              <p className="text-sm text-amber-700">Verifique sua caixa de entrada e clique no link de confirmação para ativar sua conta.</p>
            </div>
            <button
              onClick={handleResendVerification}
              disabled={resendingVerification}
              className="font-mono text-xs uppercase tracking-widest text-amber-800 border border-amber-400 px-3 py-2 hover:bg-amber-100 transition-colors whitespace-nowrap disabled:opacity-50"
              data-testid="button-resend-verification"
            >
              {resendingVerification ? 'Enviando...' : 'Reenviar email'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          <div className="lg:col-span-1">
             <div className="flex flex-col space-y-2 sticky top-32">
               <button 
                 onClick={() => setActiveTab("orders")}
                 className={`text-left px-4 py-3 font-mono text-xs uppercase tracking-widest border-l-2 transition-all ${activeTab === "orders" ? "border-black bg-secondary/50" : "border-transparent hover:bg-secondary/30"}`}
                 data-testid="tab-orders"
               >
                 Meus Pedidos
               </button>
               <button 
                 onClick={() => setActiveTab("profile")}
                 className={`text-left px-4 py-3 font-mono text-xs uppercase tracking-widest border-l-2 transition-all ${activeTab === "profile" ? "border-black bg-secondary/50" : "border-transparent hover:bg-secondary/30"}`}
                 data-testid="tab-profile"
               >
                 Meus Dados
               </button>
               <button 
                 onClick={() => setActiveTab("wishlist")}
                 className={`text-left px-4 py-3 font-mono text-xs uppercase tracking-widest border-l-2 transition-all ${activeTab === "wishlist" ? "border-black bg-secondary/50" : "border-transparent hover:bg-secondary/30"}`}
                 data-testid="tab-wishlist"
               >
                 Lista de Desejos
               </button>
               <Link href="/privacy">
                 <button 
                   className="text-left px-4 py-3 font-mono text-xs uppercase tracking-widest border-l-2 transition-all border-transparent hover:bg-secondary/30 flex items-center gap-2 w-full"
                   data-testid="link-privacy"
                 >
                   <Shield className="h-3 w-3" />
                   Privacidade e Dados
                 </button>
               </Link>
             </div>
          </div>

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
                  <div className="border border-border p-8 text-center">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="font-mono text-sm text-muted-foreground mb-4">Nenhum pedido encontrado.</p>
                    <Link href="/shop">
                      <Button className="rounded-none bg-black text-white hover:bg-primary uppercase tracking-widest font-mono text-xs px-8" data-testid="button-browse-shop">
                        Explorar Coleção
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {activeTab === "profile" && (
                <div className="space-y-12">
                  <div>
                    <h2 className="font-display text-3xl mb-2">Meus Dados</h2>
                    <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
                      Informações pessoais e endereço de entrega
                    </p>

                    {profileLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <form onSubmit={handleProfileSave} className="space-y-10">
                        <div>
                          <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-6 pb-2 border-b border-border">
                            Informações Pessoais
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Email</label>
                              <div className="border-b border-border py-2 font-display text-lg text-muted-foreground" data-testid="text-user-email">
                                {user?.username || 'Não informado'}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Nome Completo</label>
                              <Input
                                value={profileForm.fullName}
                                onChange={(e) => handleFieldChange('fullName', e.target.value)}
                                placeholder="Seu nome completo"
                                className="rounded-none border-0 border-b border-border bg-transparent px-0 focus-visible:ring-0 focus-visible:border-black font-display text-lg"
                                data-testid="input-full-name"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">CPF/CNPJ</label>
                              <Input
                                value={profileForm.cpfCnpj}
                                onChange={(e) => handleFieldChange('cpfCnpj', maskCpfCnpj(e.target.value))}
                                placeholder="000.000.000-00"
                                maxLength={18}
                                className="rounded-none border-0 border-b border-border bg-transparent px-0 focus-visible:ring-0 focus-visible:border-black font-display text-lg"
                                data-testid="input-cpf-cnpj"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Telefone</label>
                              <Input
                                value={profileForm.phone}
                                onChange={(e) => handleFieldChange('phone', maskPhone(e.target.value))}
                                placeholder="(00) 00000-0000"
                                maxLength={15}
                                className="rounded-none border-0 border-b border-border bg-transparent px-0 focus-visible:ring-0 focus-visible:border-black font-display text-lg"
                                data-testid="input-phone"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-6 pb-2 border-b border-border">
                            Endereço de Entrega
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2 space-y-2">
                              <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Rua</label>
                              <Input
                                value={profileForm.addressStreet}
                                onChange={(e) => handleFieldChange('addressStreet', e.target.value)}
                                placeholder="Rua, Avenida, etc."
                                className="rounded-none border-0 border-b border-border bg-transparent px-0 focus-visible:ring-0 focus-visible:border-black font-display text-lg"
                                data-testid="input-address-street"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Número</label>
                              <Input
                                value={profileForm.addressNumber}
                                onChange={(e) => handleFieldChange('addressNumber', e.target.value)}
                                placeholder="123"
                                className="rounded-none border-0 border-b border-border bg-transparent px-0 focus-visible:ring-0 focus-visible:border-black font-display text-lg"
                                data-testid="input-address-number"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Complemento</label>
                              <Input
                                value={profileForm.addressComplement}
                                onChange={(e) => handleFieldChange('addressComplement', e.target.value)}
                                placeholder="Apto, Bloco, etc."
                                className="rounded-none border-0 border-b border-border bg-transparent px-0 focus-visible:ring-0 focus-visible:border-black font-display text-lg"
                                data-testid="input-address-complement"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Bairro</label>
                              <Input
                                value={profileForm.addressNeighborhood}
                                onChange={(e) => handleFieldChange('addressNeighborhood', e.target.value)}
                                placeholder="Bairro"
                                className="rounded-none border-0 border-b border-border bg-transparent px-0 focus-visible:ring-0 focus-visible:border-black font-display text-lg"
                                data-testid="input-address-neighborhood"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Cidade</label>
                              <Input
                                value={profileForm.addressCity}
                                onChange={(e) => handleFieldChange('addressCity', e.target.value)}
                                placeholder="São Paulo"
                                className="rounded-none border-0 border-b border-border bg-transparent px-0 focus-visible:ring-0 focus-visible:border-black font-display text-lg"
                                data-testid="input-address-city"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Estado</label>
                              <Input
                                value={profileForm.addressState}
                                onChange={(e) => handleFieldChange('addressState', e.target.value.toUpperCase().slice(0, 2))}
                                placeholder="SP"
                                maxLength={2}
                                className="rounded-none border-0 border-b border-border bg-transparent px-0 focus-visible:ring-0 focus-visible:border-black font-display text-lg"
                                data-testid="input-address-state"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">CEP</label>
                              <Input
                                value={profileForm.addressZip}
                                onChange={(e) => handleFieldChange('addressZip', maskCep(e.target.value))}
                                placeholder="00000-000"
                                maxLength={9}
                                className="rounded-none border-0 border-b border-border bg-transparent px-0 focus-visible:ring-0 focus-visible:border-black font-display text-lg"
                                data-testid="input-address-zip"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end pt-4">
                          <Button
                            type="submit"
                            disabled={updateProfileMutation.isPending}
                            className="rounded-none bg-black text-white hover:bg-primary uppercase tracking-widest font-mono text-xs px-12 h-12 flex items-center gap-2"
                            data-testid="button-save-profile"
                          >
                            {updateProfileMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            Salvar Dados
                          </Button>
                        </div>
                      </form>
                    )}
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
