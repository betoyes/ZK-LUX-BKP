import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Lock, ShieldAlert } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Mock login
    if (values.email === "admin@aurum.com" && values.password === "admin") {
      toast({
        title: "Acesso concedido",
        description: "Redirecionando para o painel...",
      });
      setTimeout(() => setLocation('/admin/dashboard'), 1000);
    } else {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Credenciais inválidas.",
      });
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md border border-white/20 p-8 md:p-12 bg-zinc-950">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/10 mb-6">
            <Lock className="h-5 w-5 text-white" />
          </div>
          <h1 className="font-display text-3xl mb-2 tracking-tight">Aurum Admin</h1>
          <p className="font-mono text-xs text-white/50 uppercase tracking-widest">
            Acesso Restrito
          </p>
        </div>

        {/* Demo Credentials */}
        <div className="mb-8 p-4 border border-white/10 bg-white/5 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-white/70 shrink-0 mt-0.5" />
          <div className="space-y-1">
             <p className="font-mono text-[10px] uppercase tracking-widest text-white/70 font-bold">Credenciais Demo</p>
             <p className="font-mono text-xs text-white/50">User: <span className="text-white select-all">admin@aurum.com</span></p>
             <p className="font-mono text-xs text-white/50">Pass: <span className="text-white select-all">admin</span></p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase tracking-widest text-white/70">Email</FormLabel>
                  <FormControl>
                    <Input placeholder="admin@aurum.com" {...field} className="rounded-none border-white/20 h-12 bg-transparent text-white placeholder:text-white/20 focus:border-white" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase tracking-widest text-white/70">Senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••" {...field} className="rounded-none border-white/20 h-12 bg-transparent text-white placeholder:text-white/20 focus:border-white" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full rounded-none h-12 bg-white text-black hover:bg-white/90 uppercase tracking-widest font-mono text-xs mt-4">
              Entrar no Painel
            </Button>
          </form>
        </Form>
        
        <div className="mt-8 text-center">
           <p className="font-mono text-[10px] text-white/30 uppercase">
             Sistema Seguro v2.4
           </p>
        </div>
      </div>
    </div>
  );
}
