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
  categoryId?: number;
  collectionId?: number;
  specs?: string[];
  bestsellerOrder?: number;
  isNew?: boolean;
  priceDiamondSynthetic?: number;
  priceZirconia?: number;
  descriptionDiamondSynthetic?: string;
  descriptionZirconia?: string;
  specsDiamondSynthetic?: string[];
  specsZirconia?: string[];
  video?: string;
  video2?: string;
  version1?: string;
  version2?: string;
  version3?: string;
  mainStoneName?: string;
  stoneVariations?: string;
  zoomLevel?: number;
}

export interface Category {
  id: number;
  slug?: string;
  name: string;
  description: string;
}

export interface Collection {
  id: number;
  slug?: string;
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
  lookbookMediaType?: 'image' | 'video';
  lookbookMediaUrl?: string;
  noivasMediaType?: 'image' | 'video';
  noivasMediaUrl?: string;
  atelierMediaType?: 'image' | 'video';
  atelierMediaUrl?: string;
  campaignVideoUrl?: string;
}

export interface Subscriber {
  id: number;
  name: string;
  email: string;
  date: string;
  status: 'active' | 'unsubscribed';
}

export const initialSubscribers: Subscriber[] = [
  { id: 1, name: 'Cliente VIP', email: 'cliente.vip@exemplo.com', date: '28 Nov 2026', status: 'active' },
  { id: 2, name: 'Newsletter', email: 'newsletter@teste.com', date: '25 Nov 2026', status: 'active' },
];

export const initialBranding: Branding = {
  companyName: 'ZK REZK',
  heroTitle: 'Luxo\nSilencioso',
  heroSubtitle: 'Elegância que não grita, mas impõe',
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

// Empty arrays - data now loaded from server
export const initialPosts: JournalPost[] = [];

export const categories: Category[] = [];

export const collections: Collection[] = [];

export const products: Product[] = [];
