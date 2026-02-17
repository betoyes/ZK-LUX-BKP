import { useState } from "react";
import { Link } from "wouter";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Erro",
        description: "Por favor, informe seu email.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      setIsSubmitted(true);
    } catch (err) {
      toast({
        title: "Erro",
        description: "Erro ao processar solicitação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-8 border border-gray-200">
        {!isSubmitted ? (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-light tracking-wide mb-2">Esqueceu sua senha?</h1>
              <p className="text-gray-500 text-sm">
                Informe seu email e enviaremos um link para redefinir sua senha.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="pl-10"
                    placeholder="seu@email.com"
                    data-testid="input-email"
                  />
                </div>
              </div>

              <Button 
                type="submit"
                className="w-full bg-black text-white hover:bg-gray-800"
                disabled={isLoading}
                data-testid="button-submit"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Link de Recuperação"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login">
                <Button 
                  variant="ghost" 
                  className="text-sm text-gray-500 hover:text-black"
                  data-testid="link-back-to-login"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar para o login
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h1 className="text-2xl font-light tracking-wide mb-2">Email Enviado!</h1>
            <p className="text-gray-500 mb-6">
              Se o email informado estiver cadastrado, você receberá um link para redefinir sua senha.
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Verifique também sua pasta de spam.
            </p>
            <Link href="/login">
              <Button 
                className="w-full bg-black text-white hover:bg-gray-800"
                data-testid="button-back-to-login"
              >
                Voltar para o Login
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
