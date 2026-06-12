# ZK REZK - Plataforma E-commerce de Joias

E-commerce de joias de luxo com autenticacao, pagamentos, gestao de pedidos e conformidade LGPD.

## Stack

- Frontend: React 19 + TypeScript + Vite + Tailwind CSS
- Backend: Node.js + Express + TypeScript
- Banco de dados: PostgreSQL + Drizzle ORM
- Pagamentos: ASAAS (webhook integrado)
- Email transacional: Resend
- Autenticacao: Passport.js + bcrypt + express-session

## Estrutura

client/     -> Frontend React
server/     -> API Express
shared/     -> Tipos e schemas compartilhados
script/     -> Scripts de build

## Variaveis de ambiente necessarias

DATABASE_URL=
SESSION_SECRET=
RESEND_API_KEY=
ASAAS_API_KEY=
ASAAS_WEBHOOK_TOKEN=
NODE_ENV=production
PORT=5000

## Comandos

npm install        instalar dependencias
npm run dev        desenvolvimento
npm run build      build de producao
npm run start      iniciar em producao
npm run db:push    aplicar schema no banco

## Seguranca

- Helmet.js para headers HTTP
- Rate limiting por IP
- bcrypt para senhas
- Sessoes seguras com PostgreSQL store
- Conformidade LGPD
