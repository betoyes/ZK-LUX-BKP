# ZK REZK — Pendências e Melhorias Futuras
**Atualizado em:** 13 de junho de 2026

---

## ✅ Concluído

- [x] Migração Replit → Railway
- [x] Banco de dados PostgreSQL com 17 tabelas
- [x] Domínio zkrezk.com apontando para Railway
- [x] SSL ativo em zkrezk.com e www.zkrezk.com
- [x] ASAAS produção configurado (API Key real)
- [x] Webhook ASAAS ativo
- [x] 4 vulnerabilidades de segurança corrigidas
- [x] Plugins exclusivos do Replit removidos
- [x] Driver de banco substituído (Neon → PostgreSQL padrão)
- [x] CSP de fontes corrigido
- [x] README criado no repositório
- [x] Backup completo no GitHub (betoyes/ZK-LUX-BKP)
- [x] Testes automatizados básicos (16/19)
- [x] Cloudflare R2 — bucket zkrezk-assets criado
- [x] server/r2.ts — módulo de integração R2
- [x] Rota POST /api/admin/upload protegida
- [x] Dashboard admin usando R2 para uploads
- [x] 27 imagens migradas de base64 para R2
- [x] Backups automáticos PostgreSQL (cron stunning-contentment, diário 00h, R2)
- [x] Abandoned Cart Recovery — 3 emails automáticos (1h, 24h, 72h) via Resend
- [x] Cron ideal-harmony rodando a cada hora

---

## 🔴 Alta Prioridade — Fiscal

### 1. Configurar emissão de Notas Fiscais (NF-e / NFS-e) no ASAAS
**Status:** Aguardando informações do contador (CNPJ, IE, IM, regime tributário).

---

## 🟠 Média-Alta Prioridade — Marketing

### 2. Google Analytics 4 (GA4)
### 3. Google Tag Manager (GTM)
### 4. Meta Pixel (Instagram/Facebook Ads)
### 5. TikTok Pixel
### 6. MailerLite — email marketing (gratuito até 500 contatos)

---

## 🟡 Média Prioridade — Operacional

### 7. Melhor Envio — frete automático no checkout
### 8. Rastreamento de pedidos automático
### 9. Avaliações de produtos
### 10. Programa de fidelidade / pontos
### 11. Monitoramento — UptimeRobot + Sentry
### 12. Desativar o Replit
### 13. Subdomínio assets.zkrezk.com (CNAME para R2 na Hostinger)

---

## 🟢 Baixa Prioridade

### 14. Testes end-to-end com TestSprite
### 15. Documentação técnica completa
### 16. SEO (og:image, sitemap, schema markup, PageSpeed)
### 17. 2FA para admin
### 18. Performance e CDN
