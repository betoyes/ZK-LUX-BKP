const MONTHLY_INTEREST_RATE = 0.0299;

export function calculateShippingFromCep(cep: string): number {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return 0;

  const prefix = parseInt(digits.slice(0, 5));

  let uf: string | null = null;
  if (prefix >= 1000 && prefix <= 19999) uf = 'SP';
  else if (prefix >= 20000 && prefix <= 28999) uf = 'RJ';
  else if (prefix >= 29000 && prefix <= 29999) uf = 'ES';
  else if (prefix >= 30000 && prefix <= 39999) uf = 'MG';
  else if (prefix >= 40000 && prefix <= 48999) uf = 'BA';
  else if (prefix >= 49000 && prefix <= 49999) uf = 'SE';
  else if (prefix >= 50000 && prefix <= 56999) uf = 'PE';
  else if (prefix >= 57000 && prefix <= 57999) uf = 'AL';
  else if (prefix >= 58000 && prefix <= 58999) uf = 'PB';
  else if (prefix >= 59000 && prefix <= 59999) uf = 'RN';
  else if (prefix >= 60000 && prefix <= 63999) uf = 'CE';
  else if (prefix >= 64000 && prefix <= 64999) uf = 'PI';
  else if (prefix >= 65000 && prefix <= 65999) uf = 'MA';
  else if (prefix >= 66000 && prefix <= 68899) uf = 'PA';
  else if (prefix >= 68900 && prefix <= 68999) uf = 'AP';
  else if (prefix >= 69000 && prefix <= 69299) uf = 'AM';
  else if (prefix >= 69300 && prefix <= 69399) uf = 'RR';
  else if (prefix >= 69400 && prefix <= 69899) uf = 'AM';
  else if (prefix >= 69900 && prefix <= 69999) uf = 'AC';
  else if (prefix >= 70000 && prefix <= 73699) uf = 'DF';
  else if (prefix >= 73700 && prefix <= 76799) uf = 'GO';
  else if (prefix >= 76800 && prefix <= 76999) uf = 'RO';
  else if (prefix >= 77000 && prefix <= 77999) uf = 'TO';
  else if (prefix >= 78000 && prefix <= 78899) uf = 'MT';
  else if (prefix >= 78900 && prefix <= 78999) uf = 'RO';
  else if (prefix >= 79000 && prefix <= 79999) uf = 'MS';
  else if (prefix >= 80000 && prefix <= 87999) uf = 'PR';
  else if (prefix >= 88000 && prefix <= 89999) uf = 'SC';
  else if (prefix >= 90000 && prefix <= 99999) uf = 'RS';

  if (!uf) return 2500;

  const sudeste = ['SP', 'RJ', 'ES', 'MG'];
  const sul = ['PR', 'SC', 'RS'];
  const centroOeste = ['DF', 'GO', 'MT', 'MS'];
  const nordeste = ['BA', 'SE', 'PE', 'AL', 'PB', 'RN', 'CE', 'PI', 'MA'];
  const norte = ['PA', 'AP', 'AM', 'RR', 'AC', 'RO', 'TO'];

  if (sudeste.includes(uf)) return 1500;
  if (sul.includes(uf)) return 1800;
  if (centroOeste.includes(uf)) return 2200;
  if (nordeste.includes(uf)) return 2800;
  if (norte.includes(uf)) return 3500;
  return 2500;
}

export function calculateInstallmentWithInterest(
  principalInCents: number,
  installments: number,
): { installmentValue: number; totalWithInterest: number } {
  if (installments <= 1) {
    return { installmentValue: principalInCents, totalWithInterest: principalInCents };
  }
  const r = MONTHLY_INTEREST_RATE;
  const n = installments;
  const factor = Math.pow(1 + r, n);
  const installmentValue = (principalInCents * (r * factor)) / (factor - 1);
  const totalWithInterest = installmentValue * n;
  return {
    installmentValue: Math.round(installmentValue),
    totalWithInterest: Math.round(totalWithInterest),
  };
}
