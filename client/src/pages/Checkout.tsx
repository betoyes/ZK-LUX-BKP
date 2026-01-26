import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, CreditCard, Truck, Loader2, MessageCircle, QrCode, Copy, Check, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { maskCep, isValidCep, calculateShipping, formatCurrency, type ShippingResult } from '@/lib/cep';
import { WhatsAppLink } from '@/components/WhatsAppButton';
import { useProducts } from '@/context/ProductContext';

const customerSchema = z.object({
  email: z.string().email("Email inválido"),
  firstName: z.string().min(2, "Nome é obrigatório"),
  lastName: z.string().min(2, "Sobrenome é obrigatório"),
  cpfCnpj: z.string().min(11, "CPF inválido").max(18, "CPF/CNPJ inválido"),
  phone: z.string().min(10, "Telefone inválido"),
  address: z.string().min(5, "Endereço inválido"),
  addressNumber: z.string().min(1, "Número é obrigatório"),
  addressComplement: z.string().optional(),
  city: z.string().min(2, "Cidade obrigatória"),
  zip: z.string().refine((val) => isValidCep(val), {
    message: "CEP inválido (formato: 00000-000)",
  }),
});

const creditCardSchema = z.object({
  cardNumber: z.string().min(13, "Número do cartão inválido").max(19, "Número do cartão inválido"),
  holderName: z.string().min(2, "Nome no cartão é obrigatório"),
  expiry: z.string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Data inválida (formato: MM/AA)")
    .refine((val) => {
      const [month, year] = val.split('/');
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear() % 100;
      const currentMonth = currentDate.getMonth() + 1;
      const expiryYear = parseInt(year, 10);
      const expiryMonth = parseInt(month, 10);
      if (expiryYear < currentYear) return false;
      if (expiryYear === currentYear && expiryMonth < currentMonth) return false;
      return true;
    }, "Cartão expirado"),
  cvc: z.string().min(3, "CVC inválido").max(4, "CVC inválido").regex(/^\d{3,4}$/, "CVC inválido"),
});

type CustomerData = z.infer<typeof customerSchema>;
type CreditCardData = z.infer<typeof creditCardSchema>;

type PaymentMethod = 'pix' | 'credit_card';
type CheckoutStep = 'info' | 'payment' | 'pix_waiting' | 'success';

interface PixPaymentData {
  paymentId: number;
  qrCodeImage: string;
  qrCodePayload: string;
  expirationDate: string;
}

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

function maskCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.replace(/(\d{4})/g, '$1 ').trim();
}

function maskExpiry(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length >= 2) {
    return digits.slice(0, 2) + '/' + digits.slice(2, 4);
  }
  return digits;
}

export default function Checkout() {
  const [step, setStep] = useState<CheckoutStep>('info');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [shipping, setShipping] = useState<ShippingResult | null>(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixData, setPixData] = useState<PixPaymentData | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<{ configured: boolean; sandbox: boolean } | null>(null);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const { toast } = useToast();
  const { cart, products, clearCart } = useProducts();

  const cartItems = useMemo(() => {
    return cart.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return null;
      return {
        ...item,
        product,
        price: product.price,
        name: product.name,
      };
    }).filter(Boolean) as Array<{
      productId: number;
      quantity: number;
      stoneType?: string;
      product: typeof products[0];
      price: number;
      name: string;
    }>;
  }, [cart, products]);

  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cartItems]);
  
  const customerForm = useForm<CustomerData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      cpfCnpj: "",
      phone: "",
      address: "",
      addressNumber: "",
      addressComplement: "",
      city: "",
      zip: "",
    },
  });

  const cardForm = useForm<CreditCardData>({
    resolver: zodResolver(creditCardSchema),
    defaultValues: {
      cardNumber: "",
      holderName: "",
      expiry: "",
      cvc: "",
    },
  });

  const zipValue = customerForm.watch('zip');

  useEffect(() => {
    fetch('/api/payments/config')
      .then(res => res.json())
      .then(data => setPaymentConfig(data))
      .catch(() => setPaymentConfig({ configured: false, sandbox: true }));
  }, []);

  useEffect(() => {
    if (isValidCep(zipValue)) {
      setIsCalculatingShipping(true);
      const timer = setTimeout(() => {
        const result = calculateShipping(zipValue);
        setShipping(result);
        setIsCalculatingShipping(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShipping(null);
    }
  }, [zipValue]);

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: string) => void) => {
    const masked = maskCep(e.target.value);
    onChange(masked);
  };

  const handleCpfCnpjChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: string) => void) => {
    const masked = maskCpfCnpj(e.target.value);
    onChange(masked);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: string) => void) => {
    const masked = maskPhone(e.target.value);
    onChange(masked);
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: string) => void) => {
    const masked = maskCardNumber(e.target.value);
    onChange(masked);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: string) => void) => {
    const masked = maskExpiry(e.target.value);
    onChange(masked);
  };

  async function onCustomerSubmit(values: CustomerData) {
    if (!shipping) {
      toast({
        title: "CEP inválido",
        description: "Por favor, informe um CEP válido para calcular o frete.",
        variant: "destructive",
      });
      return;
    }

    setCustomerData(values);
    setStep('payment');
  }

  async function processPixPayment() {
    if (!customerData) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/payments/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: customerData.email,
          name: `${customerData.firstName} ${customerData.lastName}`,
          cpfCnpj: customerData.cpfCnpj.replace(/\D/g, ''),
          phone: customerData.phone.replace(/\D/g, ''),
          value: subtotal + (shipping?.price || 0),
          description: 'Compra na joalheria',
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar pagamento PIX');
      }

      setPixData({
        paymentId: data.paymentId,
        qrCodeImage: data.qrCodeImage,
        qrCodePayload: data.qrCodePayload,
        expirationDate: data.expirationDate,
      });
      setStep('pix_waiting');
    } catch (error: any) {
      toast({
        title: "Erro no pagamento",
        description: error.message || "Não foi possível gerar o pagamento PIX",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  async function processCreditCardPayment(cardData: CreditCardData) {
    if (!customerData || !shipping) return;

    setIsProcessing(true);
    try {
      const [expiryMonth, expiryYear] = cardData.expiry.split('/');
      const fullYear = expiryYear.length === 2 ? `20${expiryYear}` : expiryYear;

      const response = await fetch('/api/payments/credit-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: customerData.email,
          name: `${customerData.firstName} ${customerData.lastName}`,
          cpfCnpj: customerData.cpfCnpj.replace(/\D/g, ''),
          phone: customerData.phone.replace(/\D/g, ''),
          value: subtotal + shipping.price,
          description: 'Compra na joalheria',
          postalCode: customerData.zip.replace(/\D/g, ''),
          addressNumber: customerData.addressNumber,
          addressComplement: customerData.addressComplement,
          creditCard: {
            holderName: cardData.holderName,
            number: cardData.cardNumber.replace(/\s/g, ''),
            expiryMonth,
            expiryYear: fullYear,
            ccv: cardData.cvc,
          },
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao processar pagamento');
      }

      if (data.status === 'CONFIRMED' || data.status === 'RECEIVED') {
        clearCart();
        setStep('success');
        toast({
          title: "Pagamento confirmado!",
          description: "Seu pedido foi processado com sucesso.",
        });
      } else {
        toast({
          title: "Pagamento em análise",
          description: "Seu pagamento está sendo processado. Você receberá uma confirmação em breve.",
        });
        clearCart();
        setStep('success');
      }
    } catch (error: any) {
      toast({
        title: "Erro no pagamento",
        description: error.message || "Não foi possível processar o pagamento",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  async function copyPixPayload() {
    if (pixData?.qrCodePayload) {
      await navigator.clipboard.writeText(pixData.qrCodePayload);
      setCopiedPayload(true);
      toast({
        title: "Código copiado!",
        description: "Cole o código no seu app de pagamento",
      });
      setTimeout(() => setCopiedPayload(false), 3000);
    }
  }

  async function checkPixPaymentStatus() {
    if (!pixData) return;

    try {
      const response = await fetch(`/api/payments/${pixData.paymentId}/status`);
      const data = await response.json();

      if (data.status === 'RECEIVED' || data.status === 'CONFIRMED') {
        clearCart();
        setStep('success');
        toast({
          title: "Pagamento confirmado!",
          description: "Seu pedido foi processado com sucesso.",
        });
      } else {
        toast({
          title: "Aguardando pagamento",
          description: "O pagamento ainda não foi identificado. Tente novamente em alguns instantes.",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível verificar o status do pagamento",
        variant: "destructive",
      });
    }
  }

  async function simulateSandboxPayment() {
    if (!pixData || !paymentConfig?.sandbox) return;

    try {
      const response = await fetch(`/api/payments/${pixData.paymentId}/simulate-payment`, {
        method: 'POST',
      });
      const data = await response.json();

      if (response.ok) {
        clearCart();
        setStep('success');
        toast({
          title: "Pagamento simulado!",
          description: "O pagamento foi confirmado (ambiente de testes)",
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível simular o pagamento",
        variant: "destructive",
      });
    }
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-4 pt-20">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-8 text-primary"
        >
          <CheckCircle2 className="h-24 w-24" />
        </motion.div>
        <h1 className="font-serif text-4xl mb-4">Obrigado pela sua compra!</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          Seu pedido foi confirmado. Você receberá um email com os detalhes de rastreamento assim que o envio for processado.
        </p>
        <Link href="/">
          <Button className="rounded-none uppercase tracking-widest px-8" data-testid="button-back-home">
            Voltar para Home
          </Button>
        </Link>
      </div>
    );
  }

  if (step === 'pix_waiting' && pixData) {
    return (
      <div className="min-h-screen bg-background pt-32 pb-24">
        <div className="container mx-auto px-4 max-w-lg">
          <h1 className="font-serif text-3xl mb-8 text-center">Pagamento via PIX</h1>
          
          <div className="bg-white border border-border p-8 text-center">
            <div className="mb-6">
              <QrCode className="h-12 w-12 mx-auto text-primary mb-4" />
              <h2 className="font-serif text-xl mb-2">Escaneie o QR Code</h2>
              <p className="text-sm text-muted-foreground">
                Use o app do seu banco para escanear o código abaixo
              </p>
            </div>

            <div className="bg-gray-50 p-4 mb-6 rounded-lg">
              <img 
                src={`data:image/png;base64,${pixData.qrCodeImage}`}
                alt="QR Code PIX"
                className="mx-auto max-w-[250px]"
                data-testid="img-pix-qrcode"
              />
            </div>

            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-2">Ou copie o código PIX:</p>
              <div className="flex gap-2">
                <Input 
                  value={pixData.qrCodePayload}
                  readOnly
                  className="text-xs font-mono"
                  data-testid="input-pix-payload"
                />
                <Button 
                  onClick={copyPixPayload}
                  variant="outline"
                  className="shrink-0"
                  data-testid="button-copy-pix"
                >
                  {copiedPayload ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={checkPixPaymentStatus}
                className="w-full rounded-none"
                data-testid="button-check-payment"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Já paguei - Verificar
              </Button>

              {paymentConfig?.sandbox && (
                <Button 
                  onClick={simulateSandboxPayment}
                  variant="outline"
                  className="w-full rounded-none text-green-600 border-green-600 hover:bg-green-50"
                  data-testid="button-simulate-payment"
                >
                  Simular Pagamento (Sandbox)
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-6">
              O QR Code expira em 24 horas. Após o pagamento, a confirmação pode levar alguns segundos.
            </p>
          </div>

          <Button 
            variant="ghost"
            onClick={() => setStep('payment')}
            className="w-full mt-4"
            data-testid="button-back-payment"
          >
            Voltar e escolher outro método
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'payment') {
    return (
      <div className="min-h-screen bg-background pt-32 pb-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="font-serif text-3xl mb-12 text-center">Escolha a forma de pagamento</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="md:col-span-2">
              <div className="space-y-4 mb-8">
                <h3 className="font-serif text-xl">Método de Pagamento</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`p-4 border-2 rounded-lg text-center transition-all ${
                      paymentMethod === 'pix' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    data-testid="button-select-pix"
                  >
                    <QrCode className="h-8 w-8 mx-auto mb-2" />
                    <span className="font-medium">PIX</span>
                    <p className="text-xs text-muted-foreground mt-1">Pagamento instantâneo</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credit_card')}
                    className={`p-4 border-2 rounded-lg text-center transition-all ${
                      paymentMethod === 'credit_card' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    data-testid="button-select-credit-card"
                  >
                    <CreditCard className="h-8 w-8 mx-auto mb-2" />
                    <span className="font-medium">Cartão de Crédito</span>
                    <p className="text-xs text-muted-foreground mt-1">Até 12x sem juros</p>
                  </button>
                </div>
              </div>

              {paymentMethod === 'pix' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <h4 className="font-medium text-blue-800 mb-2">Pagamento via PIX</h4>
                  <p className="text-sm text-blue-700">
                    Ao confirmar, você receberá um QR Code para realizar o pagamento pelo app do seu banco.
                    A confirmação é instantânea!
                  </p>
                </div>
              )}

              {paymentMethod === 'credit_card' && (
                <Form {...cardForm}>
                  <form onSubmit={cardForm.handleSubmit(processCreditCardPayment)} className="space-y-4">
                    <FormField
                      control={cardForm.control}
                      name="cardNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número do Cartão</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="0000 0000 0000 0000"
                              value={field.value}
                              onChange={(e) => handleCardNumberChange(e, field.onChange)}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                              maxLength={19}
                              className="bg-white" 
                              data-testid="input-cardnumber"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={cardForm.control}
                      name="holderName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome no Cartão</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="NOME COMO ESTÁ NO CARTÃO"
                              {...field}
                              className="bg-white uppercase" 
                              data-testid="input-holdername"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={cardForm.control}
                        name="expiry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Validade</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="MM/AA"
                                value={field.value}
                                onChange={(e) => handleExpiryChange(e, field.onChange)}
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                                maxLength={5}
                                className="bg-white" 
                                data-testid="input-expiry"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={cardForm.control}
                        name="cvc"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CVC</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="123"
                                {...field}
                                maxLength={4}
                                className="bg-white" 
                                data-testid="input-cvc"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full rounded-none h-12 bg-black text-white hover:bg-primary uppercase tracking-widest mt-8"
                      disabled={isProcessing}
                      data-testid="button-pay-credit-card"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        `Pagar ${formatCurrency(subtotal + (shipping?.price || 0))}`
                      )}
                    </Button>
                  </form>
                </Form>
              )}

              {paymentMethod === 'pix' && (
                <Button 
                  onClick={processPixPayment}
                  className="w-full rounded-none h-12 bg-black text-white hover:bg-primary uppercase tracking-widest"
                  disabled={isProcessing}
                  data-testid="button-generate-pix"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando PIX...
                    </>
                  ) : (
                    'Gerar QR Code PIX'
                  )}
                </Button>
              )}

              <Button 
                variant="ghost"
                onClick={() => setStep('info')}
                className="w-full mt-4"
                data-testid="button-back-info"
              >
                Voltar para dados de envio
              </Button>
            </div>

            <div>
              <div className="bg-secondary/20 p-8 sticky top-32">
                <h3 className="font-serif text-lg mb-6">Resumo</h3>
                <div className="space-y-4 text-sm border-b border-border pb-6 mb-6">
                  {cartItems.length > 0 ? (
                    cartItems.map((item, index) => (
                      <div key={`${item.productId}-${item.stoneType || ''}-${index}`} className="flex justify-between" data-testid={`cart-item-${item.productId}`}>
                        <span>{item.name}{item.quantity > 1 ? ` (x${item.quantity})` : ''}</span>
                        <span>{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center">Carrinho vazio</p>
                  )}
                </div>
                
                <div className="space-y-3 text-sm border-b border-border pb-6 mb-6">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span data-testid="text-subtotal">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Frete</span>
                    <span data-testid="text-summary-shipping">
                      {shipping ? formatCurrency(shipping.price) : 'Calculando...'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between font-medium text-lg">
                  <span>Total</span>
                  <span data-testid="text-total">{formatCurrency(subtotal + (shipping?.price || 0))}</span>
                </div>

                {shipping && (
                  <p className="text-xs text-muted-foreground mt-4" data-testid="text-delivery-estimate">
                    Entrega estimada: {shipping.daysMin}-{shipping.daysMax} dias úteis
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const total = subtotal + (shipping?.price || 0);

  return (
    <div className="min-h-screen bg-background pt-32 pb-24">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="font-serif text-3xl mb-12 text-center">Checkout Seguro</h1>

        {paymentConfig?.sandbox && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8 text-center">
            <p className="text-sm text-yellow-800">
              <strong>Ambiente de Testes (Sandbox)</strong> - Os pagamentos não são reais
            </p>
          </div>
        )}

        {!paymentConfig?.configured && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 text-center">
            <p className="text-sm text-red-800">
              <strong>Sistema de pagamento não configurado</strong> - Configure a chave API do Asaas
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="md:col-span-2">
            <Form {...customerForm}>
              <form onSubmit={customerForm.handleSubmit(onCustomerSubmit)} className="space-y-8">
                
                <div className="space-y-4">
                  <h3 className="font-serif text-xl mb-4">1. Informações Pessoais</h3>
                  <FormField
                    control={customerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="seu@email.com" 
                            {...field} 
                            className="bg-white" 
                            data-testid="input-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={customerForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Maria" 
                              {...field} 
                              className="bg-white" 
                              data-testid="input-firstname"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={customerForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sobrenome</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Silva" 
                              {...field} 
                              className="bg-white" 
                              data-testid="input-lastname"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={customerForm.control}
                      name="cpfCnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF/CNPJ</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="000.000.000-00"
                              value={field.value}
                              onChange={(e) => handleCpfCnpjChange(e, field.onChange)}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                              className="bg-white" 
                              data-testid="input-cpf"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={customerForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="(11) 99999-9999"
                              value={field.value}
                              onChange={(e) => handlePhoneChange(e, field.onChange)}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                              className="bg-white" 
                              data-testid="input-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-8 border-t border-border">
                  <h3 className="font-serif text-xl mb-4 flex items-center gap-2">
                    2. Endereço de Envio <Truck className="h-5 w-5 text-muted-foreground" />
                  </h3>
                  <FormField
                    control={customerForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Rua das Flores" 
                            {...field} 
                            className="bg-white" 
                            data-testid="input-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={customerForm.control}
                      name="addressNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="123" 
                              {...field} 
                              className="bg-white" 
                              data-testid="input-addressnumber"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={customerForm.control}
                      name="addressComplement"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Complemento</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Apto 101" 
                              {...field} 
                              className="bg-white" 
                              data-testid="input-complement"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={customerForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="São Paulo" 
                              {...field} 
                              className="bg-white" 
                              data-testid="input-city"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={customerForm.control}
                      name="zip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="00000-000" 
                              value={field.value}
                              onChange={(e) => handleCepChange(e, field.onChange)}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                              className="bg-white" 
                              data-testid="input-cep"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {isCalculatingShipping && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Calculando frete...</span>
                    </div>
                  )}
                  
                  {shipping && !isCalculatingShipping && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-green-50 border border-green-200 rounded-md p-4 flex items-start gap-3"
                      data-testid="shipping-result"
                    >
                      <Truck className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-800" data-testid="text-shipping-price">
                          Frete: {formatCurrency(shipping.price)}
                        </p>
                        <p className="text-sm text-green-700" data-testid="text-shipping-days">
                          Entrega em {shipping.daysMin}-{shipping.daysMax} dias úteis ({shipping.region})
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full rounded-none h-12 bg-black text-white hover:bg-primary uppercase tracking-widest mt-8"
                  disabled={!paymentConfig?.configured}
                  data-testid="button-continue-payment"
                >
                  Continuar para Pagamento
                </Button>
              </form>
            </Form>
          </div>

          <div>
             <div className="bg-secondary/20 p-8 sticky top-32">
              <h3 className="font-serif text-lg mb-6">Resumo</h3>
              <div className="space-y-4 text-sm border-b border-border pb-6 mb-6">
                {cartItems.length > 0 ? (
                  cartItems.map((item, index) => (
                    <div key={`${item.productId}-${item.stoneType || ''}-${index}`} className="flex justify-between" data-testid={`cart-item-${item.productId}`}>
                      <span>{item.name}{item.quantity > 1 ? ` (x${item.quantity})` : ''}</span>
                      <span>{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center">Carrinho vazio</p>
                )}
              </div>
              
              <div className="space-y-3 text-sm border-b border-border pb-6 mb-6">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span data-testid="text-subtotal">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Frete</span>
                  {isCalculatingShipping ? (
                    <span className="text-muted-foreground">Calculando...</span>
                  ) : shipping ? (
                    <span data-testid="text-summary-shipping">{formatCurrency(shipping.price)}</span>
                  ) : (
                    <span className="text-muted-foreground" data-testid="text-shipping-pending">Informe o CEP</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between font-medium text-lg">
                <span>Total</span>
                <span data-testid="text-total">{formatCurrency(total)}</span>
              </div>

              {shipping && (
                <p className="text-xs text-muted-foreground mt-4" data-testid="text-delivery-estimate">
                  Entrega estimada: {shipping.daysMin}-{shipping.daysMax} dias úteis
                </p>
              )}

              <div className="mt-6 pt-6 border-t border-border">
                <WhatsAppLink 
                  message="Olá! Estou no checkout e tenho dúvidas sobre meu pedido."
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current text-green-600">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span data-testid="link-whatsapp-checkout">Fale com o Atelier</span>
                </WhatsAppLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
