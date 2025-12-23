# Plano de Implementação: Remover Placeholders do Catálogo

## Arquitetura do Projeto

### Frontend (client/)
- **Framework**: React 18 + TypeScript + Vite
- **Roteamento**: Wouter (client/src/App.tsx)
- **Estado Global**: ProductContext + AuthContext
- **UI**: shadcn/ui + Tailwind CSS + Framer Motion
- **Páginas principais**:
  - `/shop` → client/src/pages/Shop.tsx (catálogo)
  - `/product/:id` → client/src/pages/Product.tsx (detalhes do produto)

### Backend (server/)
- **Framework**: Express.js + TypeScript
- **Autenticação**: Passport.js + express-session
- **Rotas**: server/routes.ts
- **Storage**: server/storage.ts (abstração do banco)

### Banco de Dados
- PostgreSQL (Neon Serverless)
- ORM: Drizzle
- Schema: shared/schema.ts

### Estrutura de Mídia do Produto
```typescript
// Campos de mídia em Product:
- image: string          // Imagem principal
- imageColor: string     // Variação de cor
- gallery: string[]      // Galeria de imagens
- version1/2/3: string   // Versões alternativas
- video: string          // URL do vídeo 1
- video2: string         // URL do vídeo 2
```

---

## Tarefas

### Tarefa 1: Remover placeholders "Sem vídeo" na página de produto
**Objetivo**: Não renderizar slots de vídeo quando não existir vídeo

**Arquivo**: `client/src/pages/Product.tsx`

**Mudanças**:
- Linhas 293-330: Remover o bloco `else` que renderiza "Sem vídeo" para video1
- Linhas 332-369: Remover o bloco `else` que renderiza "Sem vídeo" para video2
- Linhas 263-264: Ajustar o grid para usar `grid-cols-{n}` dinâmico baseado na quantidade de mídia disponível

**Critérios de aceite**:
- [ ] Nenhum texto "Sem vídeo" aparece na página
- [ ] Se não há vídeos, a linha mostra apenas "Principal"
- [ ] Se há 1 vídeo, mostra "Principal" + "Vídeo 1"
- [ ] Se há 2 vídeos, mostra "Principal" + "Vídeo 1" + "Vídeo 2"
- [ ] Layout fica alinhado sem buracos (grid responsivo)

**Teste manual**:
1. Acessar produto SEM vídeos → não deve aparecer "Sem vídeo"
2. Acessar produto COM 1 vídeo → deve aparecer só Vídeo 1
3. Acessar produto COM 2 vídeos → deve aparecer Vídeo 1 e Vídeo 2
4. Verificar que o layout não ficou com espaços vazios

---

### Tarefa 2: Ajustar grid de versões quando não há mídia extra
**Objetivo**: A seção "Escolha sua versão" só deve aparecer se houver versões ou vídeos

**Arquivo**: `client/src/pages/Product.tsx`

**Mudanças**:
- Linhas 224-371: Envolver a seção inteira com condição `hasVersionsOrMedia`
- Atualmente a variável `hasVersionsOrMedia` já existe (linha 48-51), mas precisa ser usada para esconder toda a seção se não houver mídia extra

**Critérios de aceite**:
- [ ] Se produto não tem version1/2/3 nem video/video2, seção "Escolha sua versão" não aparece
- [ ] Se produto tem qualquer mídia extra, seção aparece normalmente

**Teste manual**:
1. Acessar produto sem mídia extra → seção não aparece
2. Acessar produto com versões → seção aparece
3. Acessar produto com vídeos → seção aparece

---

### Tarefa 3: (Opcional) Verificar catálogo/Shop.tsx por placeholders
**Objetivo**: Garantir que o catálogo não tem cards vazios

**Arquivo**: `client/src/pages/Shop.tsx`

**Mudanças**: Verificar se há renderização de items vazios ou placeholders

**Critérios de aceite**:
- [ ] Nenhum card vazio aparece no catálogo
- [ ] Grid ajusta automaticamente quando há menos produtos

**Teste manual**:
1. Acessar /shop
2. Verificar que todos os cards têm imagem e informações
3. Filtrar por categoria → grid ajusta sem buracos

---

## Ordem de Execução Sugerida

1. **Tarefa 1** (alta prioridade) - Remove os placeholders "Sem vídeo"
2. **Tarefa 2** (média prioridade) - Esconde seção vazia
3. **Tarefa 3** (baixa prioridade) - Verificação do catálogo

---

## Arquivos a Alterar

| Tarefa | Arquivo | Tipo |
|--------|---------|------|
| 1 | client/src/pages/Product.tsx | Editar |
| 2 | client/src/pages/Product.tsx | Editar |
| 3 | client/src/pages/Shop.tsx | Verificar |

---

## Riscos e Considerações

- **Layout responsivo**: Ao remover elementos do grid, garantir que o CSS `grid-cols-{n}` se ajuste dinamicamente
- **Produtos existentes**: Testar com produtos que têm e não têm mídia
- **Mobile**: Verificar que o layout mobile não quebra
