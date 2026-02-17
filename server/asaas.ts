import type { CreatePixPayment, CreateCreditCardPayment } from "@shared/schema";

const ASAAS_API_URL = process.env.ASAAS_SANDBOX === 'false' 
  ? 'https://api.asaas.com/v3'
  : 'https://api-sandbox.asaas.com/v3';

// Check if phone number is just repeating the same digit (invalid for Asaas)
function isRepeatingDigits(str: string): boolean {
  if (!str || str.length === 0) return true;
  return str.split('').every(char => char === str[0]);
}

function getApiKey(): string {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) {
    throw new Error('ASAAS_API_KEY environment variable is not set');
  }
  return apiKey;
}

async function asaasRequest(endpoint: string, options: RequestInit = {}) {
  const apiKey = getApiKey();
  
  const response = await fetch(`${ASAAS_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'access_token': apiKey,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data.errors?.[0]?.description || 'Erro na API Asaas';
    throw new Error(errorMessage);
  }

  return data;
}

export interface AsaasCustomerResponse {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
  mobilePhone?: string;
}

export interface AsaasPaymentResponse {
  id: string;
  dateCreated: string;
  customer: string;
  value: number;
  netValue: number;
  billingType: string;
  status: string;
  dueDate: string;
  paymentDate?: string;
  invoiceUrl?: string;
  creditCard?: {
    creditCardNumber: string;
    creditCardBrand: string;
    creditCardToken?: string;
  };
}

export interface AsaasPixQrCodeResponse {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

export async function createOrGetAsaasCustomer(data: {
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
}): Promise<AsaasCustomerResponse> {
  const existingCustomers = await asaasRequest(`/customers?email=${encodeURIComponent(data.email)}`);
  
  if (existingCustomers.data && existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Format phone for Asaas: only send if it's a valid Brazilian mobile (10-11 digits)
  const cleanPhone = data.phone?.replace(/\D/g, '');
  const isValidPhone = cleanPhone && cleanPhone.length >= 10 && cleanPhone.length <= 11;
  
  const customer = await asaasRequest('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      email: data.email,
      cpfCnpj: data.cpfCnpj.replace(/\D/g, ''),
      ...(isValidPhone && !isRepeatingDigits(cleanPhone) && { mobilePhone: cleanPhone }),
    }),
  });

  return customer;
}

export async function createPixPayment(
  customerId: string,
  data: CreatePixPayment
): Promise<AsaasPaymentResponse> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dueDate = tomorrow.toISOString().split('T')[0];

  const payment = await asaasRequest('/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer: customerId,
      billingType: 'PIX',
      value: data.value / 100,
      dueDate,
      description: data.description || 'Pagamento via PIX',
    }),
  });

  return payment;
}

export async function getPixQrCode(paymentId: string): Promise<AsaasPixQrCodeResponse> {
  const qrCode = await asaasRequest(`/payments/${paymentId}/pixQrCode`);
  return qrCode;
}

export async function createCreditCardPayment(
  customerId: string,
  data: CreateCreditCardPayment,
  remoteIp: string
): Promise<AsaasPaymentResponse> {
  const today = new Date();
  const dueDate = today.toISOString().split('T')[0];

  const paymentData: any = {
    customer: customerId,
    billingType: 'CREDIT_CARD',
    value: data.value / 100,
    dueDate,
    description: data.description || 'Pagamento via Cartão de Crédito',
    creditCard: {
      holderName: data.creditCard.holderName,
      number: data.creditCard.number.replace(/\s/g, ''),
      expiryMonth: data.creditCard.expiryMonth,
      expiryYear: data.creditCard.expiryYear,
      ccv: data.creditCard.ccv,
    },
    creditCardHolderInfo: {
      name: data.name,
      email: data.email,
      cpfCnpj: data.cpfCnpj.replace(/\D/g, ''),
      postalCode: data.postalCode.replace(/\D/g, ''),
      addressNumber: data.addressNumber,
      addressComplement: data.addressComplement || null,
      phone: data.phone?.replace(/\D/g, '') || null,
      mobilePhone: data.phone?.replace(/\D/g, '') || null,
    },
    remoteIp,
  };

  if (data.installmentCount && data.installmentCount > 1) {
    paymentData.installmentCount = data.installmentCount;
    // Se installmentValue foi passado (com juros), use-o; senão, divide sem juros
    paymentData.installmentValue = data.installmentValue 
      ? data.installmentValue / 100  // Frontend envia em centavos
      : (data.value / 100) / data.installmentCount;
  }

  const payment = await asaasRequest('/payments', {
    method: 'POST',
    body: JSON.stringify(paymentData),
  });

  return payment;
}

export async function getPaymentStatus(paymentId: string): Promise<AsaasPaymentResponse> {
  const payment = await asaasRequest(`/payments/${paymentId}`);
  return payment;
}

export async function confirmSandboxPayment(paymentId: string, paymentValue?: number): Promise<AsaasPaymentResponse> {
  if (process.env.ASAAS_SANDBOX !== 'false') {
    // In sandbox mode, simulate payment confirmation
    // The receiveInCash endpoint requires a minimum value of R$1.00
    // So we return a mock confirmed payment status for sandbox testing
    const payment = await getPaymentStatus(paymentId);
    
    // Return a simulated confirmed payment
    return {
      ...payment,
      status: 'RECEIVED',
      paymentDate: new Date().toISOString().split('T')[0],
    };
  }
  throw new Error('Esta função só está disponível em ambiente Sandbox');
}

export function isAsaasConfigured(): boolean {
  return !!process.env.ASAAS_API_KEY;
}

export function isSandboxMode(): boolean {
  return process.env.ASAAS_SANDBOX !== 'false';
}
