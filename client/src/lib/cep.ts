export interface ShippingResult {
  price: number;
  daysMin: number;
  daysMax: number;
  region: string;
}

export function maskCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) {
    return digits;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function isValidCep(cep: string): boolean {
  const digits = cep.replace(/\D/g, '');
  return digits.length === 8;
}

export function getUfFromCep(cep: string): string | null {
  const digits = cep.replace(/\D/g, '');
  if (digits.length < 5) return null;
  
  const prefix = parseInt(digits.slice(0, 5));
  
  if (prefix >= 1000 && prefix <= 19999) return 'SP';
  if (prefix >= 20000 && prefix <= 28999) return 'RJ';
  if (prefix >= 29000 && prefix <= 29999) return 'ES';
  if (prefix >= 30000 && prefix <= 39999) return 'MG';
  if (prefix >= 40000 && prefix <= 48999) return 'BA';
  if (prefix >= 49000 && prefix <= 49999) return 'SE';
  if (prefix >= 50000 && prefix <= 56999) return 'PE';
  if (prefix >= 57000 && prefix <= 57999) return 'AL';
  if (prefix >= 58000 && prefix <= 58999) return 'PB';
  if (prefix >= 59000 && prefix <= 59999) return 'RN';
  if (prefix >= 60000 && prefix <= 63999) return 'CE';
  if (prefix >= 64000 && prefix <= 64999) return 'PI';
  if (prefix >= 65000 && prefix <= 65999) return 'MA';
  if (prefix >= 66000 && prefix <= 68899) return 'PA';
  if (prefix >= 68900 && prefix <= 68999) return 'AP';
  if (prefix >= 69000 && prefix <= 69299) return 'AM';
  if (prefix >= 69300 && prefix <= 69399) return 'RR';
  if (prefix >= 69400 && prefix <= 69899) return 'AM';
  if (prefix >= 69900 && prefix <= 69999) return 'AC';
  if (prefix >= 70000 && prefix <= 73699) return 'DF';
  if (prefix >= 73700 && prefix <= 76799) return 'GO';
  if (prefix >= 76800 && prefix <= 76999) return 'RO';
  if (prefix >= 77000 && prefix <= 77999) return 'TO';
  if (prefix >= 78000 && prefix <= 78899) return 'MT';
  if (prefix >= 78900 && prefix <= 78999) return 'RO';
  if (prefix >= 79000 && prefix <= 79999) return 'MS';
  if (prefix >= 80000 && prefix <= 87999) return 'PR';
  if (prefix >= 88000 && prefix <= 89999) return 'SC';
  if (prefix >= 90000 && prefix <= 99999) return 'RS';
  
  return null;
}

export function getRegionFromUf(uf: string): string {
  const sudeste = ['SP', 'RJ', 'ES', 'MG'];
  const sul = ['PR', 'SC', 'RS'];
  const centroOeste = ['DF', 'GO', 'MT', 'MS'];
  const nordeste = ['BA', 'SE', 'PE', 'AL', 'PB', 'RN', 'CE', 'PI', 'MA'];
  const norte = ['PA', 'AP', 'AM', 'RR', 'AC', 'RO', 'TO'];
  
  if (sudeste.includes(uf)) return 'Sudeste';
  if (sul.includes(uf)) return 'Sul';
  if (centroOeste.includes(uf)) return 'Centro-Oeste';
  if (nordeste.includes(uf)) return 'Nordeste';
  if (norte.includes(uf)) return 'Norte';
  return 'Brasil';
}

export function calculateShipping(cep: string): ShippingResult | null {
  if (!isValidCep(cep)) return null;
  
  const uf = getUfFromCep(cep);
  if (!uf) return null;
  
  const region = getRegionFromUf(uf);
  
  switch (region) {
    case 'Sudeste':
      return { price: 1500, daysMin: 3, daysMax: 5, region };
    case 'Sul':
      return { price: 1800, daysMin: 4, daysMax: 7, region };
    case 'Centro-Oeste':
      return { price: 2200, daysMin: 5, daysMax: 8, region };
    case 'Nordeste':
      return { price: 2800, daysMin: 7, daysMax: 12, region };
    case 'Norte':
      return { price: 3500, daysMin: 10, daysMax: 15, region };
    default:
      return { price: 2500, daysMin: 7, daysMax: 10, region: 'Brasil' };
  }
}

export function formatCurrency(valueInCents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valueInCents / 100);
}
