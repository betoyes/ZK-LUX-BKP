import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Shield, 
  Download, 
  Eye, 
  Trash2, 
  Loader2, 
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getCsrfToken } from '@/lib/csrf';

interface ConsentData {
  consentMarketing: boolean;
  consentTerms: boolean;
  consentPrivacy: boolean;
}

interface DataExportRequest {
  id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  downloadUrl?: string;
}

interface UserData {
  user: {
    id: number;
    username: string;
    role: string;
    emailVerified: boolean;
    createdAt: string;
  };
  consents: ConsentData;
  orders: any[];
  dataExportRequests: DataExportRequest[];
}

export default function PrivacyDashboard() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState('consent');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteMode, setDeleteMode] = useState<'anonymize' | 'delete'>('anonymize');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const { data: userData, isLoading: dataLoading } = useQuery<UserData>({
    queryKey: ['lgpd-data'],
    queryFn: async () => {
      const res = await fetch('/api/lgpd/data', { credentials: 'include' });
      if (!res.ok) throw new Error('Falha ao carregar dados');
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: consentHistory } = useQuery({
    queryKey: ['consent-history'],
    queryFn: async () => {
      const res = await fetch('/api/lgpd/consent-history', { credentials: 'include' });
      if (!res.ok) throw new Error('Falha ao carregar histórico');
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const updateConsentMutation = useMutation({
    mutationFn: async (consents: Partial<ConsentData>) => {
      const csrfToken = getCsrfToken();
      const res = await fetch('/api/lgpd/consent', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(consents),
      });
      if (!res.ok) throw new Error('Falha ao atualizar consentimento');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lgpd-data'] });
      queryClient.invalidateQueries({ queryKey: ['consent-history'] });
      toast({
        title: 'Preferências atualizadas',
        description: 'Suas preferências de privacidade foram salvas.',
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar suas preferências.',
      });
    },
  });

  const requestExportMutation = useMutation({
    mutationFn: async () => {
      const csrfToken = getCsrfToken();
      const res = await fetch('/api/lgpd/data-export', {
        method: 'POST',
        headers: {
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Falha ao solicitar exportação');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lgpd-data'] });
      toast({
        title: 'Solicitação enviada',
        description: 'Sua solicitação de exportação de dados foi registrada. Você receberá um email quando estiver pronta.',
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível solicitar a exportação de dados.',
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async ({ password, mode }: { password: string; mode: 'anonymize' | 'delete' }) => {
      const csrfToken = getCsrfToken();
      const res = await fetch('/api/lgpd/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ password, mode }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Falha ao excluir conta');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: deleteMode === 'anonymize' ? 'Conta anonimizada' : 'Conta excluída',
        description: 'Sua solicitação foi processada com sucesso.',
      });
      setLocation('/');
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message,
      });
    },
  });

  const handleConsentChange = (key: keyof ConsentData, value: boolean) => {
    updateConsentMutation.mutate({ [key]: value });
  };

  const handleDeleteAccount = () => {
    if (!deletePassword) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Por favor, digite sua senha para confirmar.',
      });
      return;
    }
    deleteAccountMutation.mutate({ password: deletePassword, mode: deleteMode });
    setShowDeleteDialog(false);
    setDeletePassword('');
  };

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const sections = [
    { id: 'consent', label: 'Consentimentos', icon: Shield },
    { id: 'export', label: 'Exportar Dados', icon: Download },
    { id: 'view', label: 'Meus Dados', icon: Eye },
    { id: 'delete', label: 'Excluir Conta', icon: Trash2 },
  ];

  return (
    <div className="min-h-screen bg-background pt-32 pb-24">
      <div className="container mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 border-b border-border pb-8">
          <div>
            <Link href="/account">
              <Button 
                variant="ghost" 
                className="mb-4 font-mono text-xs uppercase tracking-widest"
                data-testid="link-back-to-account"
              >
                <ArrowLeft className="h-3 w-3 mr-2" /> Voltar para Conta
              </Button>
            </Link>
            <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tighter mb-2">
              Privacidade e Dados
            </h1>
            <p className="font-mono text-sm text-muted-foreground uppercase tracking-widest">
              Gerencie seus dados pessoais e preferências de privacidade (LGPD)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          <div className="lg:col-span-1">
            <div className="flex flex-col space-y-2 sticky top-32">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`text-left px-4 py-3 font-mono text-xs uppercase tracking-widest border-l-2 transition-all flex items-center gap-3 ${
                    activeSection === section.id
                      ? 'border-black bg-secondary/50'
                      : 'border-transparent hover:bg-secondary/30'
                  }`}
                  data-testid={`tab-${section.id}`}
                >
                  <section.icon className="h-4 w-4" />
                  {section.label}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3 min-h-[50vh]">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeSection === 'consent' && (
                <div className="space-y-8">
                  <h2 className="font-display text-3xl mb-6">Gerenciar Consentimentos</h2>
                  <p className="text-muted-foreground mb-8">
                    Controle como usamos seus dados. Você pode alterar suas preferências a qualquer momento.
                  </p>

                  <div className="space-y-6">
                    <Card className="border-border">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="font-display text-lg">Comunicações de Marketing</CardTitle>
                            <CardDescription>
                              Receba novidades, promoções e lançamentos exclusivos por email.
                            </CardDescription>
                          </div>
                          <Switch
                            checked={userData?.consents?.consentMarketing ?? false}
                            onCheckedChange={(checked) => handleConsentChange('consentMarketing', checked)}
                            disabled={updateConsentMutation.isPending}
                            data-testid="switch-marketing"
                          />
                        </div>
                      </CardHeader>
                    </Card>

                    <Card className="border-border">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="font-display text-lg">Termos de Uso</CardTitle>
                            <CardDescription>
                              Concordo com os termos de uso da plataforma.
                            </CardDescription>
                          </div>
                          <Switch
                            checked={userData?.consents?.consentTerms ?? false}
                            onCheckedChange={(checked) => handleConsentChange('consentTerms', checked)}
                            disabled={updateConsentMutation.isPending}
                            data-testid="switch-terms"
                          />
                        </div>
                      </CardHeader>
                    </Card>

                    <Card className="border-border">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="font-display text-lg">Política de Privacidade</CardTitle>
                            <CardDescription>
                              Concordo com a política de privacidade e processamento de dados.
                            </CardDescription>
                          </div>
                          <Switch
                            checked={userData?.consents?.consentPrivacy ?? false}
                            onCheckedChange={(checked) => handleConsentChange('consentPrivacy', checked)}
                            disabled={updateConsentMutation.isPending}
                            data-testid="switch-privacy"
                          />
                        </div>
                      </CardHeader>
                    </Card>
                  </div>

                  {consentHistory && consentHistory.length > 0 && (
                    <div className="mt-12">
                      <h3 className="font-display text-xl mb-4">Histórico de Alterações</h3>
                      <div className="space-y-3">
                        {consentHistory.slice(0, 5).map((entry: any, index: number) => (
                          <div 
                            key={index} 
                            className="text-sm text-muted-foreground font-mono border-l-2 border-border pl-4 py-2"
                            data-testid={`consent-history-${index}`}
                          >
                            <span className="block">{new Date(entry.changedAt).toLocaleString('pt-BR')}</span>
                            <span className="text-foreground">{entry.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'export' && (
                <div className="space-y-8">
                  <h2 className="font-display text-3xl mb-6">Exportar Meus Dados</h2>
                  <p className="text-muted-foreground mb-8">
                    Solicite uma cópia de todos os dados que armazenamos sobre você. O arquivo será preparado e enviado para seu email.
                  </p>

                  <Card className="border-border">
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-display text-lg mb-2">Solicitar Exportação</h3>
                          <p className="text-sm text-muted-foreground">
                            Gere um arquivo com todos os seus dados pessoais, pedidos e preferências.
                          </p>
                        </div>
                        <Button
                          onClick={() => requestExportMutation.mutate()}
                          disabled={requestExportMutation.isPending}
                          className="rounded-none bg-black text-white hover:bg-black/80 font-mono text-xs uppercase tracking-widest"
                          data-testid="button-request-export"
                        >
                          {requestExportMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Solicitando...
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-2" />
                              Solicitar Exportação
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {userData?.dataExportRequests && userData.dataExportRequests.length > 0 && (
                    <div className="mt-8">
                      <h3 className="font-display text-xl mb-4">Solicitações Anteriores</h3>
                      <div className="space-y-4">
                        {userData.dataExportRequests.map((request) => (
                          <Card key={request.id} className="border-border">
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {request.status === 'completed' && (
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                  )}
                                  {request.status === 'pending' && (
                                    <Clock className="h-5 w-5 text-yellow-500" />
                                  )}
                                  {request.status === 'processing' && (
                                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                                  )}
                                  {request.status === 'failed' && (
                                    <AlertTriangle className="h-5 w-5 text-red-500" />
                                  )}
                                  <div>
                                    <p className="font-mono text-sm">
                                      Solicitação #{request.id}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(request.createdAt).toLocaleString('pt-BR')}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`font-mono text-xs uppercase px-2 py-1 ${
                                    request.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                    request.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                    'bg-red-100 text-red-700'
                                  }`} data-testid={`export-status-${request.id}`}>
                                    {request.status === 'completed' ? 'Concluída' :
                                     request.status === 'pending' ? 'Pendente' :
                                     request.status === 'processing' ? 'Processando' :
                                     'Falhou'}
                                  </span>
                                  {request.status === 'completed' && request.downloadUrl && (
                                    <a href={request.downloadUrl} download>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="rounded-none font-mono text-xs"
                                        data-testid={`button-download-${request.id}`}
                                      >
                                        Baixar
                                      </Button>
                                    </a>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'view' && (
                <div className="space-y-8">
                  <h2 className="font-display text-3xl mb-6">Meus Dados Pessoais</h2>
                  <p className="text-muted-foreground mb-8">
                    Veja todos os dados que armazenamos sobre você.
                  </p>

                  <Card className="border-border">
                    <CardHeader>
                      <CardTitle className="font-display text-lg">Informações da Conta</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                            Email
                          </Label>
                          <p className="text-lg" data-testid="text-user-email">{userData?.user?.username || user?.username}</p>
                        </div>
                        <div>
                          <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                            ID do Usuário
                          </Label>
                          <p className="text-lg" data-testid="text-user-id">{userData?.user?.id || user?.id}</p>
                        </div>
                        <div>
                          <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                            Email Verificado
                          </Label>
                          <p className="text-lg" data-testid="text-email-verified">
                            {userData?.user?.emailVerified ? 'Sim' : 'Não'}
                          </p>
                        </div>
                        <div>
                          <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                            Data de Criação
                          </Label>
                          <p className="text-lg" data-testid="text-created-at">
                            {userData?.user?.createdAt 
                              ? new Date(userData.user.createdAt).toLocaleDateString('pt-BR')
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border">
                    <CardHeader>
                      <CardTitle className="font-display text-lg">Preferências de Consentimento</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span>Marketing</span>
                        <span className={userData?.consents?.consentMarketing ? 'text-green-600' : 'text-red-600'}>
                          {userData?.consents?.consentMarketing ? 'Aceito' : 'Recusado'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span>Termos de Uso</span>
                        <span className={userData?.consents?.consentTerms ? 'text-green-600' : 'text-red-600'}>
                          {userData?.consents?.consentTerms ? 'Aceito' : 'Recusado'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span>Política de Privacidade</span>
                        <span className={userData?.consents?.consentPrivacy ? 'text-green-600' : 'text-red-600'}>
                          {userData?.consents?.consentPrivacy ? 'Aceito' : 'Recusado'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {userData?.orders && userData.orders.length > 0 && (
                    <Card className="border-border">
                      <CardHeader>
                        <CardTitle className="font-display text-lg">Histórico de Pedidos</CardTitle>
                        <CardDescription>
                          Você tem {userData.orders.length} pedido(s) registrado(s).
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Link href="/account">
                          <Button 
                            variant="outline" 
                            className="rounded-none font-mono text-xs uppercase"
                            data-testid="link-view-orders"
                          >
                            Ver Pedidos Completos
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {activeSection === 'delete' && (
                <div className="space-y-8">
                  <h2 className="font-display text-3xl mb-6">Excluir Minha Conta</h2>
                  
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Atenção</AlertTitle>
                    <AlertDescription>
                      Esta ação é irreversível. Ao excluir sua conta, você perderá acesso a todos os seus dados, 
                      histórico de pedidos e preferências.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-6">
                    <Card className="border-border">
                      <CardHeader>
                        <CardTitle className="font-display text-lg">Anonimizar Conta</CardTitle>
                        <CardDescription>
                          Seus dados pessoais serão removidos, mas o histórico de transações será mantido 
                          de forma anônima para fins fiscais e legais.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <AlertDialog open={showDeleteDialog && deleteMode === 'anonymize'} onOpenChange={(open) => {
                          if (!open) {
                            setShowDeleteDialog(false);
                            setDeletePassword('');
                          }
                        }}>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline"
                              className="rounded-none font-mono text-xs uppercase tracking-widest border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                              onClick={() => {
                                setDeleteMode('anonymize');
                                setShowDeleteDialog(true);
                              }}
                              data-testid="button-anonymize-account"
                            >
                              Anonimizar Conta
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Anonimização</AlertDialogTitle>
                              <AlertDialogDescription>
                                Seus dados pessoais serão permanentemente removidos. Digite sua senha para confirmar.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="py-4">
                              <Label htmlFor="delete-password">Senha</Label>
                              <Input
                                id="delete-password"
                                type="password"
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                placeholder="Digite sua senha"
                                data-testid="input-delete-password"
                              />
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDeleteAccount}
                                className="bg-yellow-600 hover:bg-yellow-700"
                                disabled={deleteAccountMutation.isPending}
                                data-testid="button-confirm-anonymize"
                              >
                                {deleteAccountMutation.isPending ? 'Processando...' : 'Confirmar Anonimização'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </CardContent>
                    </Card>

                    <Card className="border-red-200">
                      <CardHeader>
                        <CardTitle className="font-display text-lg text-red-700">Excluir Conta Permanentemente</CardTitle>
                        <CardDescription>
                          Todos os seus dados serão completamente removidos de nossos sistemas. 
                          Esta ação não pode ser desfeita.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <AlertDialog open={showDeleteDialog && deleteMode === 'delete'} onOpenChange={(open) => {
                          if (!open) {
                            setShowDeleteDialog(false);
                            setDeletePassword('');
                          }
                        }}>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="destructive"
                              className="rounded-none font-mono text-xs uppercase tracking-widest"
                              onClick={() => {
                                setDeleteMode('delete');
                                setShowDeleteDialog(true);
                              }}
                              data-testid="button-delete-account"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir Conta
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-red-700">Excluir Conta Permanentemente</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação é irreversível. Todos os seus dados, incluindo histórico de pedidos, 
                                serão permanentemente excluídos. Digite sua senha para confirmar.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="py-4">
                              <Label htmlFor="delete-password-permanent">Senha</Label>
                              <Input
                                id="delete-password-permanent"
                                type="password"
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                placeholder="Digite sua senha"
                                data-testid="input-delete-password-permanent"
                              />
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel data-testid="button-cancel-permanent-delete">Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDeleteAccount}
                                className="bg-red-600 hover:bg-red-700"
                                disabled={deleteAccountMutation.isPending}
                                data-testid="button-confirm-delete"
                              >
                                {deleteAccountMutation.isPending ? 'Excluindo...' : 'Excluir Permanentemente'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
