import { storage } from "./storage";
import bcrypt from "bcrypt";

// Helper function to convert image imports to base64 would go here
// For now, we'll use placeholder text for images since we can't import client assets

async function seed() {
  console.log("🌱 Starting database seeding...");

  try {
    // 1. Create admin user
    const existingAdmin = await storage.getUserByUsername("admin");
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await storage.createUser({
        username: "admin",
        password: hashedPassword,
      });
      console.log("✅ Admin user created (username: admin, password: admin123)");
    } else {
      console.log("ℹ️  Admin user already exists");
    }

    // 2. Create categories
    const categoriesData = [
      { slug: 'aneis', name: 'Anéis', description: 'Símbolos de eternidade e compromisso.' },
      { slug: 'colares', name: 'Colares', description: 'Elegância que envolve.' },
      { slug: 'brincos', name: 'Brincos', description: 'Detalhes que iluminam.' },
      { slug: 'pulseiras', name: 'Pulseiras', description: 'Toque de sofisticação.' },
    ];

    for (const cat of categoriesData) {
      const existing = await storage.getCategoryBySlug(cat.slug);
      if (!existing) {
        await storage.createCategory(cat);
      }
    }
    console.log("✅ Categories seeded");

    // 3. Create collections
    const collectionsData = [
      { 
        slug: 'eternal', 
        name: 'Eternal Collection', 
        description: 'Diamantes clássicos para momentos eternos.',
        image: null
      },
      { 
        slug: 'aurora', 
        name: 'Aurora Gold', 
        description: 'O brilho quente do ouro 18k.',
        image: null
      },
      { 
        slug: 'ocean', 
        name: 'Ocean Pearls', 
        description: 'Pérolas naturais de elegância atemporal.',
        image: null
      },
    ];

    for (const col of collectionsData) {
      const existing = await storage.getCollectionBySlug(col.slug);
      if (!existing) {
        await storage.createCollection(col);
      }
    }
    console.log("✅ Collections seeded");

    // Get category and collection IDs for products
    const aneis = await storage.getCategoryBySlug('aneis');
    const colares = await storage.getCategoryBySlug('colares');
    const brincos = await storage.getCategoryBySlug('brincos');
    const pulseiras = await storage.getCategoryBySlug('pulseiras');
    
    const eternal = await storage.getCollectionBySlug('eternal');
    const aurora = await storage.getCollectionBySlug('aurora');
    const ocean = await storage.getCollectionBySlug('ocean');

    // 4. Create products
    const productsData = [
      {
        name: 'Anel Solitário Royal',
        price: 12500,
        description: 'Um diamante de 1 quilate cravado em ouro branco 18k. A essência do luxo clássico.',
        image: null,
        imageColor: null,
        gallery: null,
        categoryId: aneis?.id,
        collectionId: eternal?.id,
        specs: ['Ouro branco 18k', 'Diamante 1ct', 'Pureza VS1'],
        bestsellerOrder: 1,
        isNew: true,
      },
      {
        name: 'Colar Minimalist Gold',
        price: 4200,
        description: 'Corrente delicada em ouro amarelo 18k com pendente geométrico.',
        image: null,
        categoryId: colares?.id,
        collectionId: aurora?.id,
        specs: ['Ouro amarelo 18k', 'Comprimento 45cm'],
        bestsellerOrder: 2,
        isNew: false,
      },
      {
        name: 'Brincos Pérola Barroca',
        price: 3800,
        description: 'Pérolas barrocas naturais com acabamento em ouro rosé.',
        image: null,
        categoryId: brincos?.id,
        collectionId: ocean?.id,
        specs: ['Pérolas naturais', 'Ouro rosé 18k'],
        bestsellerOrder: 3,
        isNew: true,
      },
      {
        name: 'Anel Infinity Diamond',
        price: 8900,
        description: 'Anel cravejado com diamantes em toda a volta. Ouro amarelo 18k.',
        image: null,
        categoryId: aneis?.id,
        collectionId: eternal?.id,
        specs: ['Ouro amarelo 18k', 'Diamantes totalizando 2ct'],
        bestsellerOrder: null,
        isNew: false,
      },
      {
        name: 'Gargantilha Riviera',
        price: 25000,
        description: 'Diamantes negros e brancos intercalados em ouro branco.',
        image: null,
        categoryId: colares?.id,
        collectionId: eternal?.id,
        specs: ['Ouro branco 18k', 'Diamantes negros e brancos'],
        bestsellerOrder: null,
        isNew: false,
      },
      {
        name: 'Brincos Cascata de Ouro',
        price: 5600,
        description: 'Design fluido que imita o movimento da água. Ouro 18k.',
        image: null,
        categoryId: brincos?.id,
        collectionId: aurora?.id,
        specs: ['Ouro amarelo 18k', 'Design exclusivo'],
        bestsellerOrder: null,
        isNew: false,
      },
      {
        name: 'Pulseira Tennis Classic',
        price: 15000,
        description: 'A clássica pulseira tennis com diamantes de alta pureza.',
        image: null,
        categoryId: pulseiras?.id,
        collectionId: eternal?.id,
        specs: ['Ouro branco 18k', 'Diamantes VS1', '40 diamantes'],
        bestsellerOrder: null,
        isNew: false,
      },
      {
        name: 'Colar Medalhão Vintage',
        price: 6700,
        description: 'Inspiração vitoriana com um toque moderno.',
        image: null,
        categoryId: colares?.id,
        collectionId: aurora?.id,
        specs: ['Ouro amarelo 18k', 'Gravação personalizada disponível'],
        bestsellerOrder: null,
        isNew: true,
      },
    ];

    const existingProducts = await storage.getProducts();
    if (existingProducts.length === 0) {
      for (const prod of productsData) {
        await storage.createProduct(prod);
      }
      console.log("✅ Products seeded");
    } else {
      console.log("ℹ️  Products already exist");
    }

    // 5. Create journal posts
    const journalData = [
      {
        title: "O Guia Definitivo de Diamantes",
        excerpt: "Entenda os 4 Cs e como escolher a pedra perfeita para sua joia eterna.",
        content: "Diamantes são eternos, mas escolher o perfeito requer conhecimento. Os 4 Cs - Cut (Lapidação), Color (Cor), Clarity (Pureza) e Carat (Quilates) - são o padrão global para avaliar a qualidade dos diamantes. Neste guia, exploramos cada um desses aspectos em profundidade...",
        date: "28 Nov 2026",
        category: "Educação",
        image: null,
      },
      {
        title: "Tendências de Outono 2026",
        excerpt: "O retorno do ouro amarelo e design maximalista.",
        content: "O outono de 2026 traz consigo uma nostalgia vibrante. O ouro amarelo, por muito tempo deixado de lado em favor do ouro branco e da platina, retorna com força total. Designs maximalistas, peças statement e sobreposições ousadas dominam as passarelas e as vitrines...",
        date: "25 Nov 2026",
        category: "Tendências",
        image: null,
      },
      {
        title: "Cuidados com Suas Joias",
        excerpt: "Como manter o brilho e a integridade de suas peças por gerações.",
        content: "Suas joias são investimentos emocionais e financeiros. Para garantir que elas durem gerações, é crucial adotar uma rotina de cuidados. Evite contato com produtos químicos, limpe regularmente com flanela macia e guarde cada peça individualmente para evitar riscos...",
        date: "20 Nov 2026",
        category: "Care",
        image: null,
      }
    ];

    const existingPosts = await storage.getJournalPosts();
    if (existingPosts.length === 0) {
      for (const post of journalData) {
        await storage.createJournalPost(post);
      }
      console.log("✅ Journal posts seeded");
    } else {
      console.log("ℹ️  Journal posts already exist");
    }

    // 6. Create sample subscribers
    const subscribersData = [
      { email: 'cliente.vip@exemplo.com', date: '28 Nov 2026', status: 'active' },
      { email: 'newsletter@teste.com', date: '25 Nov 2026', status: 'active' },
    ];

    for (const sub of subscribersData) {
      const existing = await storage.getSubscriberByEmail(sub.email);
      if (!existing) {
        await storage.createSubscriber(sub);
      }
    }
    console.log("✅ Subscribers seeded");

    // 7. Create sample customers
    const customersData = [
      { customerId: 'CUST-001', name: 'Maria Silva', email: 'maria@email.com', orders: 5, totalSpent: 45000, lastOrder: '2026-11-28' },
      { customerId: 'CUST-002', name: 'João Santos', email: 'joao@email.com', orders: 2, totalSpent: 8400, lastOrder: '2026-11-27' },
      { customerId: 'CUST-003', name: 'Ana Oliveira', email: 'ana@email.com', orders: 3, totalSpent: 15600, lastOrder: '2026-11-26' },
      { customerId: 'CUST-004', name: 'Carlos Lima', email: 'carlos@email.com', orders: 1, totalSpent: 3800, lastOrder: '2026-11-25' },
      { customerId: 'CUST-005', name: 'Beatriz Costa', email: 'bia@email.com', orders: 8, totalSpent: 82000, lastOrder: '2026-11-24' },
    ];

    for (const cust of customersData) {
      const existing = await storage.getCustomerByEmail(cust.email);
      if (!existing) {
        await storage.createCustomer(cust);
      }
    }
    console.log("✅ Customers seeded");

    // 8. Create sample orders
    const customer1 = await storage.getCustomerByEmail('maria@email.com');
    const customer2 = await storage.getCustomerByEmail('joao@email.com');
    const customer3 = await storage.getCustomerByEmail('ana@email.com');
    const customer4 = await storage.getCustomerByEmail('carlos@email.com');
    const customer5 = await storage.getCustomerByEmail('bia@email.com');

    const ordersData = [
      { orderId: 'ORD-001', customerId: customer1?.id, customer: 'Maria Silva', date: '2026-11-28', status: 'Entregue', total: 12500, items: 1 },
      { orderId: 'ORD-002', customerId: customer2?.id, customer: 'João Santos', date: '2026-11-27', status: 'Processando', total: 4200, items: 1 },
      { orderId: 'ORD-003', customerId: customer3?.id, customer: 'Ana Oliveira', date: '2026-11-26', status: 'Enviado', total: 8900, items: 2 },
      { orderId: 'ORD-004', customerId: customer4?.id, customer: 'Carlos Lima', date: '2026-11-25', status: 'Cancelado', total: 3800, items: 1 },
      { orderId: 'ORD-005', customerId: customer5?.id, customer: 'Beatriz Costa', date: '2026-11-24', status: 'Entregue', total: 25000, items: 3 },
    ];

    const existingOrders = await storage.getOrders();
    if (existingOrders.length === 0) {
      for (const ord of ordersData) {
        if (ord.customerId) {
          await storage.createOrder(ord);
        }
      }
      console.log("✅ Orders seeded");
    } else {
      console.log("ℹ️  Orders already exist");
    }

    // 9. Create branding
    const existingBranding = await storage.getBranding();
    if (!existingBranding) {
      await storage.createOrUpdateBranding({
        companyName: 'ZK REZK',
        heroTitle: 'Herança\nFutura',
        heroSubtitle: 'Coleção 01',
        heroMediaType: 'image',
        heroMediaUrl: null,
        manifestoTitle: 'Redefinindo o Luxo',
        manifestoText: 'Acreditamos em joias que falam a linguagem da arquitetura moderna. Linhas limpas, formas ousadas e uma presença inegável.',
        journalHeroImage: null,
        journalHeroTitle: 'O Novo Luxo é Sustentável',
        journalHeroSubtitle: 'Editorial',
        impactPhrase: 'A perfeição não é um detalhe. É a única opção.',
      });
      console.log("✅ Branding seeded");
    } else {
      console.log("ℹ️  Branding already exists");
    }

    console.log("🎉 Database seeding completed!");
    console.log("\n📝 Admin credentials:");
    console.log("   Username: admin");
    console.log("   Password: admin123");
    console.log("\n⚠️  Please change the admin password after first login!");

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}

// Run seeding
seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
