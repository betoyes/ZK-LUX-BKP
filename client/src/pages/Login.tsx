import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
});

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
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
    // Mock login/register
    toast({
      title: isLogin ? "Bem-vindo de volta" : "Conta criada",
      description: "Você está logado no modo de demonstração.",
    });
    setTimeout(() => setLocation('/'), 1000);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row pt-20">
      {/* Editorial Side */}
      <div className="hidden md:flex w-1/2 bg-black text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="z-10">
          <Link href="/" className="font-display text-3xl font-bold tracking-tighter">AURUM®</Link>
        </div>
        
        <div className="z-10 max-w-md space-y-6">
          <h2 className="font-display text-6xl leading-none tracking-tighter">
            Acesso<br/>Exclusivo
          </h2>
          <p className="font-mono text-sm text-white/60 uppercase tracking-widest">
            Gerencie seus pedidos, lista de desejos e tenha acesso antecipado aos lançamentos.
          </p>
        </div>

        {/* Abstract Background Element */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle,rgba(255,255,255,0.1)_0%,rgba(0,0,0,0)_60%)]" />
      </div>

      {/* Form Side */}
      <div className="w-full md:w-1/2 p-8 md:p-24 flex flex-col justify-center bg-background">
        <div className="max-w-sm mx-auto w-full space-y-12">
          <div>
            <h1 className="font-display text-4xl mb-2">{isLogin ? 'Entrar' : 'Criar Conta'}</h1>
            <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
              {isLogin ? 'Bem-vindo de volta ao círculo interno.' : 'Junte-se ao Aurum Archive.'}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase tracking-widest">Email</FormLabel>
                    <FormControl>
                      <Input placeholder="seu@email.com" {...field} className="rounded-none border-black h-12 bg-transparent" />
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
                    <FormLabel className="font-mono text-xs uppercase tracking-widest">Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••" {...field} className="rounded-none border-black h-12 bg-transparent" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full rounded-none h-12 bg-black text-white hover:bg-black/80 uppercase tracking-widest font-mono text-xs flex justify-between items-center px-6">
                <span>{isLogin ? 'Acessar Conta' : 'Registrar'}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </Form>

          <div className="text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="font-mono text-xs uppercase tracking-widest border-b border-black pb-1 hover:opacity-50 transition-opacity"
            >
              {isLogin ? 'Não tem uma conta? Registre-se' : 'Já tem conta? Entre'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
