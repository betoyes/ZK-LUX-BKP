import heroImage from '@assets/generated_images/luxury_jewelry_hero_image_with_model.png';
import ringImage from '@assets/generated_images/diamond_ring_product_shot.png';
import necklaceImage from '@assets/generated_images/gold_necklace_product_shot.png';
import earringsImage from '@assets/generated_images/pearl_earrings_product_shot.png';

export interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  image: string;
  imageColor?: string;
  gallery?: string[];
  category: string;
  collection: string;
  specs?: string[];
  bestsellerOrder?: number;
  isNew?: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  image: string;
}

export interface Branding {
  companyName: string;
  heroTitle: string;
  heroSubtitle: string;
  heroMediaType: 'image' | 'video';
  heroMediaUrl: string;
  manifestoTitle: string;
  manifestoText: string;
  journalHeroImage: string;
  journalHeroTitle: string;
  journalHeroSubtitle: string;
  impactPhrase: string;
}

export const initialBranding: Branding = {
  companyName: 'ZK REZK',
  heroTitle: 'Herança\nFutura',
  heroSubtitle: 'Coleção 01',
  heroMediaType: 'image',
  heroMediaUrl: heroImage,
  manifestoTitle: 'Redefinindo o Luxo',
  manifestoText: 'Acreditamos em joias que falam a linguagem da arquitetura moderna. Linhas limpas, formas ousadas e uma presença inegável.',
  journalHeroImage: heroImage,
  journalHeroTitle: 'O Novo Luxo é Sustentável',
  journalHeroSubtitle: 'Editorial',
  impactPhrase: 'A perfeição não é um detalhe. É a única opção.'
};

export const testimonials = [
  {
    id: 1,
    name: "Isabella Ferrari",
    role: "Arquiteta",
    text: "Peças que transcendem a moda. É como usar uma escultura moderna.",
    location: "São Paulo"
  },
  {
    id: 2,
    name: "Clarice Lispector N.",
    role: "Editora de Arte",
    text: "A ZK REZK redefiniu o que eu entendo por elegância. Minimalismo com alma.",
    location: "Rio de Janeiro"
  },
  {
    id: 3,
    name: "Sofia Copollina",
    role: "Diretora Criativa",
    text: "O atendimento é tão impecável quanto o design. Uma experiência de luxo completa.",
    location: "Milão"
  }
];

export interface JournalPost {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  category: string;
  image: string;
}

export const initialPosts: JournalPost[] = [
  {
    id: 1,
    title: "O Guia Definitivo de Diamantes",
    excerpt: "Entenda os 4 Cs e como escolher a pedra perfeita para sua joia eterna.",
    content: "Diamantes são eternos, mas escolher o perfeito requer conhecimento. Os 4 Cs - Cut (Lapidação), Color (Cor), Clarity (Pureza) e Carat (Quilates) - são o padrão global para avaliar a qualidade dos diamantes. Neste guia, exploramos cada um desses aspectos em profundidade...",
    date: "28 Nov 2026",
    category: "Educação",
    image: ringImage
  },
  {
    id: 2,
    title: "Tendências de Outono 2026",
    excerpt: "O retorno do ouro amarelo e design maximalista.",
    content: "O outono de 2026 traz consigo uma nostalgia vibrante. O ouro amarelo, por muito tempo deixado de lado em favor do ouro branco e da platina, retorna com força total. Designs maximalistas, peças statement e sobreposições ousadas dominam as passarelas e as vitrines...",
    date: "25 Nov 2026",
    category: "Tendências",
    image: necklaceImage
  },
  {
    id: 3,
    title: "Cuidados com Suas Joias",
    excerpt: "Como manter o brilho e a integridade de suas peças por gerações.",
    content: "Suas joias são investimentos emocionais e financeiros. Para garantir que elas durem gerações, é crucial adotar uma rotina de cuidados. Evite contato com produtos químicos, limpe regularmente com flanela macia e guarde cada peça individualmente para evitar riscos...",
    date: "20 Nov 2026",
    category: "Care",
    image: earringsImage
  }
];

export const categories: Category[] = [
  { id: 'aneis', name: 'Anéis', description: 'Símbolos de eternidade e compromisso.' },
  { id: 'colares', name: 'Colares', description: 'Elegância que envolve.' },
  { id: 'brincos', name: 'Brincos', description: 'Detalhes que iluminam.' },
  { id: 'pulseiras', name: 'Pulseiras', description: 'Toque de sofisticação.' },
];

export const collections: Collection[] = [
  { id: 'eternal', name: 'Eternal Collection', description: 'Diamantes clássicos para momentos eternos.', image: ringImage },
  { id: 'aurora', name: 'Aurora Gold', description: 'O brilho quente do ouro 18k.', image: necklaceImage },
  { id: 'ocean', name: 'Ocean Pearls', description: 'Pérolas naturais de elegância atemporal.', image: earringsImage },
];

export const products: Product[] = [
  {
    id: 1,
    name: 'Anel Solitário Royal',
    price: 12500,
    description: 'Um diamante de 1 quilate cravado em ouro branco 18k. A essência do luxo clássico.',
    image: ringImage,
    category: 'aneis',
    collection: 'eternal',
    isNew: true,
  },
  {
    id: 2,
    name: 'Colar Minimalist Gold',
    price: 4200,
    description: 'Corrente delicada em ouro amarelo 18k com pendente geométrico.',
    image: necklaceImage,
    category: 'colares',
    collection: 'aurora',
  },
  {
    id: 3,
    name: 'Brincos Pérola Barroca',
    price: 3800,
    description: 'Pérolas barrocas naturais com acabamento em ouro rosé.',
    image: earringsImage,
    category: 'brincos',
    collection: 'ocean',
    isNew: true,
  },
  {
    id: 4,
    name: 'Anel Infinity Diamond',
    price: 8900,
    description: 'Anel cravejado com diamantes em toda a volta. Ouro amarelo 18k.',
    image: ringImage,
    category: 'aneis',
    collection: 'eternal',
  },
  {
    id: 5,
    name: 'Gargantilha Riviera',
    price: 25000,
    description: 'Diamantes negros e brancos intercalados em ouro branco.',
    image: necklaceImage,
    category: 'colares',
    collection: 'eternal',
  },
  {
    id: 6,
    name: 'Brincos Cascata de Ouro',
    price: 5600,
    description: 'Design fluido que imita o movimento da água. Ouro 18k.',
    image: earringsImage,
    category: 'brincos',
    collection: 'aurora',
  },
  {
    id: 7,
    name: 'Pulseira Tennis Classic',
    price: 15000,
    description: 'A clássica pulseira tennis com diamantes de alta pureza.',
    image: ringImage, // Placeholder
    category: 'pulseiras',
    collection: 'eternal',
  },
  {
    id: 8,
    name: 'Colar Medalhão Vintage',
    price: 6700,
    description: 'Inspiração vitoriana com um toque moderno.',
    image: necklaceImage,
    category: 'colares',
    collection: 'aurora',
    isNew: true,
  },
  {
    id: 9,
    name: 'Anel Safira Real',
    price: 18000,
    description: 'Safira azul profunda cercada por diamantes.',
    image: ringImage,
    category: 'aneis',
    collection: 'eternal',
  },
  {
    id: 10,
    name: 'Brincos Argola Diamond',
    price: 9200,
    description: 'Argolas clássicas cravejadas interna e externamente.',
    image: earringsImage,
    category: 'brincos',
    collection: 'eternal',
  },
];
