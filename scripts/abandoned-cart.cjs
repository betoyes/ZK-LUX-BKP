const { Pool } = require('pg');
const { Resend } = require('resend');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'ZK REZK <noreply@zkrezk.com>';
  if (!apiKey) throw new Error('RESEND_API_KEY não encontrada');
  return { client: new Resend(apiKey), fromEmail };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

async function sendAbandonedCartEmail({ customerEmail, customerName, emailNumber, items, cartUrl }) {
  const { client, fromEmail } = await getResendClient();

  const subjects = {
    1: `${customerName}, você esqueceu algo especial`,
    2: `Suas joias ainda estão te esperando — ZK REZK`,
    3: `Última chance: seu carrinho ZK REZK expira em breve`,
  };
  const headings = {
    1: 'Você deixou algo para trás',
    2: 'Suas peças ainda estão reservadas',
    3: 'Não deixe escapar',
  };
  const messages = {
    1: 'Notamos que você adicionou peças ao carrinho mas não finalizou sua compra. Elas ainda estão disponíveis para você.',
    2: 'Suas joias selecionadas continuam reservadas. Peças como essas têm alta procura — não espere muito.',
    3: 'Este é um lembrete final. Seu carrinho será liberado em breve. Finalize agora e garanta suas peças.',
  };

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid #e8e0d5;font-size:14px;color:#2c2416;">${escapeHtml(item.name)}</td>
      <td style="padding:14px 0;border-bottom:1px solid #e8e0d5;font-size:14px;color:#2c2416;text-align:center;">${item.quantity}</td>
      <td style="padding:14px 0;border-bottom:1px solid #e8e0d5;font-size:14px;color:#8b6f3e;text-align:right;font-weight:500;">${(item.price / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
    </tr>
  `).join('');

  return client.emails.send({
    from: fromEmail,
    to: [customerEmail],
    subject: subjects[emailNumber],
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f7f3ee;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f3ee;padding:48px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td align="center" style="padding-bottom:36px;">
  <div style="width:48px;height:1px;background:#c9a96e;display:inline-block;vertical-align:middle;margin-right:16px;"></div>
  <span style="font-size:22px;letter-spacing:6px;color:#1a1208;font-weight:400;text-transform:uppercase;vertical-align:middle;">ZK REZK</span>
  <div style="width:48px;height:1px;background:#c9a96e;display:inline-block;vertical-align:middle;margin-left:16px;"></div>
</td></tr>
<tr><td style="background-color:#ffffff;border:1px solid #e8e0d5;">
  <div style="height:3px;background:linear-gradient(90deg,#c9a96e 0%,#e8d5a3 50%,#c9a96e 100%);"></div>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:44px 40px 8px;">
      <p style="margin:0 0 6px;font-size:11px;letter-spacing:4px;color:#c9a96e;text-transform:uppercase;font-family:'Helvetica Neue',Arial,sans-serif;">Carrinho Abandonado</p>
      <h1 style="margin:0 0 20px;font-size:26px;font-weight:400;color:#1a1208;">${headings[emailNumber]}</h1>
      <p style="margin:0;font-size:15px;color:#6b5a3e;line-height:1.7;max-width:380px;">${messages[emailNumber]}</p>
    </td></tr>
    <tr><td style="padding:32px 40px 0;">
      <p style="margin:0 0 16px;font-size:10px;letter-spacing:3px;color:#c9a96e;text-transform:uppercase;font-family:'Helvetica Neue',Arial,sans-serif;">Itens no seu carrinho</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <th style="font-size:10px;letter-spacing:2px;color:#b09060;text-transform:uppercase;font-family:'Helvetica Neue',Arial,sans-serif;font-weight:400;text-align:left;padding-bottom:12px;border-bottom:1px solid #e8e0d5;">Produto</th>
          <th style="font-size:10px;letter-spacing:2px;color:#b09060;text-transform:uppercase;font-family:'Helvetica Neue',Arial,sans-serif;font-weight:400;text-align:center;padding-bottom:12px;border-bottom:1px solid #e8e0d5;">Qtd</th>
          <th style="font-size:10px;letter-spacing:2px;color:#b09060;text-transform:uppercase;font-family:'Helvetica Neue',Arial,sans-serif;font-weight:400;text-align:right;padding-bottom:12px;border-bottom:1px solid #e8e0d5;">Valor</th>
        </tr>
        ${itemsHtml}
      </table>
    </td></tr>
    <tr><td align="center" style="padding:32px 40px 40px;">
      <a href="${cartUrl}" style="display:inline-block;background:#1a1208;color:#c9a96e;padding:16px 48px;text-decoration:none;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-family:'Helvetica Neue',Arial,sans-serif;">Finalizar Compra</a>
    </td></tr>
  </table>
  <div style="height:1px;background:#e8e0d5;margin:0 40px;"></div>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:28px 40px;">
      <p style="margin:0 0 8px;font-size:12px;color:#b09060;font-family:'Helvetica Neue',Arial,sans-serif;">Duvidas? Entre em contato</p>
      <a href="mailto:contato@zkrezk.com" style="font-size:13px;color:#8b6f3e;text-decoration:none;font-family:'Helvetica Neue',Arial,sans-serif;border-bottom:1px solid #c9a96e;padding-bottom:2px;">contato@zkrezk.com</a>
    </td></tr>
  </table>
</td></tr>
<tr><td align="center" style="padding:32px 0 0;">
  <p style="margin:0;font-size:11px;color:#c4b49a;font-family:'Helvetica Neue',Arial,sans-serif;">© 2026 ZK REZK. Todos os direitos reservados.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  });
}

async function main() {
  console.log('[AbandonedCart] Iniciando verificacao:', new Date().toISOString());
  const appUrl = process.env.APP_URL || 'https://zkrezk.com';
  const now = new Date();

  // Busca usuarios com carrinho + email
  const { rows: users } = await pool.query(`
    SELECT DISTINCT
      u.id as user_id,
      u.username as email,
      u.username as name,
      MIN(ci.updated_at) as oldest_item_at,
      MAX(ci.abandoned_email_1_sent) as email1_sent,
      MAX(ci.abandoned_email_2_sent) as email2_sent,
      MAX(ci.abandoned_email_3_sent) as email3_sent
    FROM cart_items ci
    JOIN users u ON u.id = ci.user_id
    WHERE u.username LIKE '%@%'
    GROUP BY u.id, u.username
  `);

  console.log(`[AbandonedCart] ${users.length} usuario(s) com carrinho encontrado(s)`);

  for (const user of users) {
    const oldestItem = new Date(user.oldest_item_at);
    const hoursElapsed = (now - oldestItem) / (1000 * 60 * 60);

    // Busca itens do carrinho com nome e preco do produto
    const { rows: cartItems } = await pool.query(`
      SELECT ci.quantity, p.name, p.price
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.user_id = $1
    `, [user.user_id]);

    const items = cartItems.map(i => ({
      name: i.name,
      price: Number(i.price),
      quantity: i.quantity,
    }));

    const cartUrl = `${appUrl}/cart`;

    // Email 1 — apos 1 hora
    if (hoursElapsed >= 1 && !user.email1_sent) {
      console.log(`[AbandonedCart] Enviando email #1 para ${user.email} (${hoursElapsed.toFixed(1)}h)`);
      try {
        await sendAbandonedCartEmail({ customerEmail: user.email, customerName: user.name.split('@')[0], emailNumber: 1, items, cartUrl });
        await pool.query(`UPDATE cart_items SET abandoned_email_1_sent = $1 WHERE user_id = $2`, [now.toISOString(), user.user_id]);
        console.log(`[AbandonedCart] Email #1 enviado para ${user.email}`);
      } catch (e) {
        console.error(`[AbandonedCart] Erro email #1:`, e.message);
      }
    }

    // Email 2 — apos 24 horas
    else if (hoursElapsed >= 24 && user.email1_sent && !user.email2_sent) {
      console.log(`[AbandonedCart] Enviando email #2 para ${user.email} (${hoursElapsed.toFixed(1)}h)`);
      try {
        await sendAbandonedCartEmail({ customerEmail: user.email, customerName: user.name.split('@')[0], emailNumber: 2, items, cartUrl });
        await pool.query(`UPDATE cart_items SET abandoned_email_2_sent = $1 WHERE user_id = $2`, [now.toISOString(), user.user_id]);
        console.log(`[AbandonedCart] Email #2 enviado para ${user.email}`);
      } catch (e) {
        console.error(`[AbandonedCart] Erro email #2:`, e.message);
      }
    }

    // Email 3 — apos 72 horas
    else if (hoursElapsed >= 72 && user.email2_sent && !user.email3_sent) {
      console.log(`[AbandonedCart] Enviando email #3 para ${user.email} (${hoursElapsed.toFixed(1)}h)`);
      try {
        await sendAbandonedCartEmail({ customerEmail: user.email, customerName: user.name.split('@')[0], emailNumber: 3, items, cartUrl });
        await pool.query(`UPDATE cart_items SET abandoned_email_3_sent = $1 WHERE user_id = $2`, [now.toISOString(), user.user_id]);
        console.log(`[AbandonedCart] Email #3 enviado para ${user.email}`);
      } catch (e) {
        console.error(`[AbandonedCart] Erro email #3:`, e.message);
      }
    } else {
      console.log(`[AbandonedCart] ${user.email}: ${hoursElapsed.toFixed(1)}h — nenhuma acao necessaria`);
    }
  }

  await pool.end();
  console.log('[AbandonedCart] Concluido:', new Date().toISOString());
}

main().catch(async (err) => {
  console.error('[AbandonedCart] Erro fatal:', err);
  await pool.end();
  process.exit(1);
});
