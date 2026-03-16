import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

export async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  
  // Use Resend's test email if the configured domain is not verified (gmail, hotmail, etc.)
  const unverifiedDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com'];
  const emailDomain = fromEmail?.split('@')[1]?.toLowerCase();
  const safeFromEmail = emailDomain && unverifiedDomains.includes(emailDomain)
    ? 'ZK REZK <onboarding@resend.dev>'
    : fromEmail || 'ZK REZK <onboarding@resend.dev>';
  
  return {
    client: new Resend(apiKey),
    fromEmail: safeFromEmail
  };
}

export async function sendVerificationEmail(to: string, token: string, baseUrl: string) {
  console.log(`[Email] Attempting to send verification email to ${to}`);
  try {
    const { client, fromEmail } = await getResendClient();
    console.log(`[Email] Got Resend client, fromEmail: ${fromEmail}`);
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;
    
    const result = await client.emails.send({
    from: fromEmail || 'ZK REZK <noreply@zkrezk.com>',
    to: [to],
    subject: 'Verifique seu email - ZK REZK',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 40px 20px; }
            .container { max-width: 500px; margin: 0 auto; background: #fff; border: 1px solid #e0e0e0; }
            .header { background: #000; color: #fff; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; letter-spacing: 4px; font-weight: 400; }
            .content { padding: 40px 30px; text-align: center; }
            .content h2 { font-size: 20px; font-weight: 400; margin-bottom: 20px; }
            .content p { color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 30px; }
            .button { display: inline-block; background: #000; color: #fff; padding: 15px 40px; text-decoration: none; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; }
            .footer { padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0; }
            .footer p { color: #999; font-size: 11px; margin: 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>ZK REZK</h1>
            </div>
            <div class="content">
              <h2>Confirme seu email</h2>
              <p>Obrigado por se registrar na ZK REZK. Por favor, confirme seu endereço de email clicando no botão abaixo.</p>
              <a href="${verifyUrl}" class="button">Confirmar Email</a>
              <p style="margin-top: 30px; font-size: 12px;">Se você não criou esta conta, ignore este email.</p>
            </div>
            <div class="footer">
              <p>© 2026 ZK REZK. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `
    });
    console.log(`[Email] Verification email sent successfully to ${to}`, result);
    return result;
  } catch (error) {
    console.error(`[Email] Failed to send verification email to ${to}:`, error);
    throw error;
  }
}

// Notification email for admin when new leads/customers register
export async function sendAdminNotification(
  type: 'newsletter' | 'lead' | 'customer' | 'order' | 'email_failure',
  data: { name?: string; email?: string; total?: number; orderId?: string; items?: number; reason?: string; error?: string }
) {
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || 
    (process.env.NODE_ENV === "production" 
      ? (() => { throw new Error("ADMIN_NOTIFY_EMAIL must be set in production"); })() 
      : "admin@localhost");
  
  try {
    const { client, fromEmail } = await getResendClient();
    
    let subject = '';
    let heading = '';
    let details = '';
    
    switch (type) {
      case 'newsletter':
        subject = '🆕 Novo inscrito na Newsletter - ZK REZK';
        heading = 'Nova inscrição na Newsletter';
        details = `
          <p><strong>Email:</strong> ${data.email}</p>
          ${data.name ? `<p><strong>Nome:</strong> ${data.name}</p>` : ''}
        `;
        break;
      case 'lead':
        subject = '🎯 Novo Lead Registrado - ZK REZK';
        heading = 'Novo cadastro no site';
        details = `
          <p><strong>Email:</strong> ${data.email}</p>
          ${data.name ? `<p><strong>Nome:</strong> ${data.name}</p>` : ''}
          <p><strong>Tipo:</strong> Lead (registrou-se mas ainda não comprou)</p>
        `;
        break;
      case 'customer':
        subject = '🛍️ Novo Cliente Cadastrado - ZK REZK';
        heading = 'Novo cliente no sistema';
        details = `
          <p><strong>Nome:</strong> ${data.name || 'Não informado'}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Tipo:</strong> Cliente</p>
        `;
        break;
      case 'email_failure':
        subject = '⚠️ Falha no Envio de Email - ZK REZK';
        heading = 'Falha no envio de email';
        details = `
          <p><strong>Email destinatário:</strong> ${data.email || 'N/A'}</p>
          <p><strong>Motivo:</strong> ${data.reason || 'Não especificado'}</p>
          <p><strong>Erro:</strong> ${data.error || 'Não disponível'}</p>
        `;
        break;
      case 'order':
        subject = '💰 Nova Venda Realizada - ZK REZK';
        heading = 'Nova venda no site!';
        const totalFormatted = data.total ? (data.total / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'N/A';
        details = `
          <p><strong>Pedido:</strong> ${data.orderId || 'N/A'}</p>
          <p><strong>Cliente:</strong> ${data.name || 'Não informado'}</p>
          <p><strong>Email:</strong> ${data.email || 'N/A'}</p>
          <p><strong>Total:</strong> ${totalFormatted}</p>
          <p><strong>Itens:</strong> ${data.items || 0}</p>
        `;
        break;
    }
    
    const result = await client.emails.send({
      from: fromEmail || 'ZK REZK <onboarding@resend.dev>',
      to: [adminEmail],
      subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 40px 20px; }
              .container { max-width: 500px; margin: 0 auto; background: #fff; border: 1px solid #e0e0e0; }
              .header { background: #000; color: #fff; padding: 30px; text-align: center; }
              .header h1 { margin: 0; font-size: 24px; letter-spacing: 4px; font-weight: 400; }
              .content { padding: 40px 30px; }
              .content h2 { font-size: 20px; font-weight: 400; margin-bottom: 20px; text-align: center; }
              .content p { color: #333; font-size: 14px; line-height: 1.8; margin-bottom: 10px; }
              .content strong { color: #000; }
              .badge { display: inline-block; padding: 8px 16px; background: ${type === 'order' ? '#22c55e' : type === 'customer' ? '#3b82f6' : type === 'email_failure' ? '#ef4444' : '#f59e0b'}; color: #fff; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; }
              .footer { padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0; }
              .footer p { color: #999; font-size: 11px; margin: 0; }
              .timestamp { text-align: center; color: #999; font-size: 11px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>ZK REZK</h1>
              </div>
              <div class="content">
                <div style="text-align: center;">
                  <span class="badge">${type === 'order' ? 'VENDA' : type === 'customer' ? 'CLIENTE' : type === 'lead' ? 'LEAD' : type === 'email_failure' ? 'ALERTA' : 'NEWSLETTER'}</span>
                </div>
                <h2>${heading}</h2>
                ${details}
                <p class="timestamp">Data: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
              </div>
              <div class="footer">
                <p>Notificação automática do sistema ZK REZK</p>
              </div>
            </div>
          </body>
        </html>
      `
    });
    
    console.log(`[Email] Admin notification sent for ${type}:`, result);
    return result;
  } catch (error) {
    console.error(`[Email] Failed to send admin notification for ${type}:`, error);
    // Don't throw - notifications should fail silently
  }
}

export async function sendOrderConfirmationEmail(params: {
  customerEmail: string;
  customerName: string;
  orderId: string;
  items: any;
  total: number;
  billingType: string;
  paymentDate: string;
}) {
  const { customerEmail, customerName, orderId, items, total, billingType, paymentDate } = params;

  try {
    const { client, fromEmail } = await getResendClient();

    const totalFormatted = (total / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const paymentMethod = billingType === 'PIX' ? 'PIX' : 'Cartão de Crédito';
    const formattedDate = paymentDate || new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    const itemsHtml = Array.isArray(items) && items.length > 0
      ? items.map((item: any) => `
          <tr>
            <td style="padding: 14px 0; border-bottom: 1px solid #e8e0d5; font-size: 14px; color: #2c2416; letter-spacing: 0.3px;">
              ${item.name || item.productName || 'Produto'}
            </td>
            <td style="padding: 14px 0; border-bottom: 1px solid #e8e0d5; font-size: 14px; color: #2c2416; text-align: center;">
              ${item.quantity || 1}
            </td>
            <td style="padding: 14px 0; border-bottom: 1px solid #e8e0d5; font-size: 14px; color: #8b6f3e; text-align: right; font-weight: 500;">
              ${item.price ? (item.price / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
            </td>
          </tr>
        `).join('')
      : `<tr><td colspan="3" style="padding: 14px 0; font-size: 14px; color: #888; text-align: center;">Detalhes do pedido disponíveis na sua conta.</td></tr>`;

    const result = await client.emails.send({
      from: fromEmail || 'ZK REZK <noreply@zkrezk.com>',
      to: [customerEmail],
      subject: `Pedido confirmado — ZK REZK #${orderId}`,
      html: `<!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pedido Confirmado — ZK REZK</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f7f3ee; font-family: Georgia, 'Times New Roman', serif;">

    <!-- Wrapper -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f3ee; padding: 48px 20px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">

            <!-- Header: Logo + Linha dourada -->
            <tr>
              <td align="center" style="padding-bottom: 36px;">
                <div style="width: 48px; height: 1px; background: #c9a96e; display: inline-block; vertical-align: middle; margin-right: 16px;"></div>
                <span style="font-size: 22px; letter-spacing: 6px; color: #1a1208; font-weight: 400; text-transform: uppercase; vertical-align: middle;">ZK REZK</span>
                <div style="width: 48px; height: 1px; background: #c9a96e; display: inline-block; vertical-align: middle; margin-left: 16px;"></div>
              </td>
            </tr>

            <!-- Card principal -->
            <tr>
              <td style="background-color: #ffffff; border: 1px solid #e8e0d5;">

                <!-- Faixa dourada topo -->
                <div style="height: 3px; background: linear-gradient(90deg, #c9a96e 0%, #e8d5a3 50%, #c9a96e 100%);"></div>

                <!-- Conteúdo -->
                <table width="100%" cellpadding="0" cellspacing="0">

                  <!-- Ícone de confirmação -->
                  <tr>
                    <td align="center" style="padding: 44px 40px 8px;">
                      <div style="width: 56px; height: 56px; border: 1.5px solid #c9a96e; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px;">
                        <span style="font-size: 22px; line-height: 56px; display: block; text-align: center;">✓</span>
                      </div>
                      <p style="margin: 0 0 6px; font-size: 11px; letter-spacing: 4px; color: #c9a96e; text-transform: uppercase; font-family: 'Helvetica Neue', Arial, sans-serif;">Pedido Confirmado</p>
                      <h1 style="margin: 0 0 20px; font-size: 26px; font-weight: 400; color: #1a1208; letter-spacing: 1px;">Obrigada, ${customerName}.</h1>
                      <p style="margin: 0; font-size: 15px; color: #6b5a3e; line-height: 1.7; max-width: 380px; font-family: Georgia, serif;">
                        Seu pedido foi recebido e está sendo preparado com todo o cuidado do nosso atelier.
                      </p>
                    </td>
                  </tr>

                  <!-- Número do pedido -->
                  <tr>
                    <td style="padding: 32px 40px 0;">
                      <div style="border: 1px solid #e8e0d5; background: #fdf9f4; padding: 16px 20px; text-align: center;">
                        <p style="margin: 0 0 4px; font-size: 10px; letter-spacing: 3px; color: #b09060; text-transform: uppercase; font-family: 'Helvetica Neue', Arial, sans-serif;">Número do Pedido</p>
                        <p style="margin: 0; font-size: 18px; letter-spacing: 3px; color: #1a1208; font-family: 'Helvetica Neue', Arial, sans-serif; font-weight: 500;">#${orderId}</p>
                      </div>
                    </td>
                  </tr>

                  <!-- Divisor -->
                  <tr>
                    <td style="padding: 32px 40px 0;">
                      <p style="margin: 0 0 16px; font-size: 10px; letter-spacing: 3px; color: #c9a96e; text-transform: uppercase; font-family: 'Helvetica Neue', Arial, sans-serif;">Resumo do Pedido</p>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <th style="font-size: 10px; letter-spacing: 2px; color: #b09060; text-transform: uppercase; font-family: 'Helvetica Neue', Arial, sans-serif; font-weight: 400; text-align: left; padding-bottom: 12px; border-bottom: 1px solid #e8e0d5;">Produto</th>
                          <th style="font-size: 10px; letter-spacing: 2px; color: #b09060; text-transform: uppercase; font-family: 'Helvetica Neue', Arial, sans-serif; font-weight: 400; text-align: center; padding-bottom: 12px; border-bottom: 1px solid #e8e0d5;">Qtd</th>
                          <th style="font-size: 10px; letter-spacing: 2px; color: #b09060; text-transform: uppercase; font-family: 'Helvetica Neue', Arial, sans-serif; font-weight: 400; text-align: right; padding-bottom: 12px; border-bottom: 1px solid #e8e0d5;">Valor</th>
                        </tr>
                        ${itemsHtml}
                      </table>
                    </td>
                  </tr>

                  <!-- Total -->
                  <tr>
                    <td style="padding: 0 40px 32px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding-top: 16px; font-size: 13px; color: #6b5a3e; font-family: 'Helvetica Neue', Arial, sans-serif; letter-spacing: 0.5px;">Total</td>
                          <td style="padding-top: 16px; font-size: 20px; color: #1a1208; text-align: right; font-family: 'Helvetica Neue', Arial, sans-serif; font-weight: 500; letter-spacing: 1px;">${totalFormatted}</td>
                        </tr>
                        <tr>
                          <td style="padding-top: 8px; font-size: 12px; color: #b09060; font-family: 'Helvetica Neue', Arial, sans-serif;">Pagamento</td>
                          <td style="padding-top: 8px; font-size: 12px; color: #b09060; text-align: right; font-family: 'Helvetica Neue', Arial, sans-serif;">${paymentMethod} · ${formattedDate}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Mensagem artesanal -->
                  <tr>
                    <td style="padding: 0 40px 40px;">
                      <div style="border-left: 2px solid #c9a96e; padding: 16px 20px; background: #fdf9f4;">
                        <p style="margin: 0; font-size: 14px; color: #6b5a3e; line-height: 1.8; font-style: italic;">
                          "Cada peça ZK REZK é criada à mão com materiais selecionados. Seu pedido receberá atenção individual antes de chegar até você."
                        </p>
                      </div>
                    </td>
                  </tr>

                </table>

                <!-- Faixa dourada base -->
                <div style="height: 1px; background: #e8e0d5; margin: 0 40px;"></div>

                <!-- Contato -->
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="padding: 28px 40px;">
                      <p style="margin: 0 0 8px; font-size: 12px; color: #b09060; letter-spacing: 0.5px; font-family: 'Helvetica Neue', Arial, sans-serif;">
                        Dúvidas sobre seu pedido?
                      </p>
                      <a href="mailto:contato@zkrezk.com" style="font-size: 13px; color: #8b6f3e; text-decoration: none; letter-spacing: 1px; font-family: 'Helvetica Neue', Arial, sans-serif; border-bottom: 1px solid #c9a96e; padding-bottom: 2px;">
                        contato@zkrezk.com
                      </a>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="padding: 32px 0 0;">
                <p style="margin: 0 0 6px; font-size: 10px; letter-spacing: 3px; color: #b09060; text-transform: uppercase; font-family: 'Helvetica Neue', Arial, sans-serif;">ZK REZK</p>
                <p style="margin: 0; font-size: 11px; color: #c4b49a; font-family: 'Helvetica Neue', Arial, sans-serif;">© 2026 ZK REZK. Todos os direitos reservados.</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>

  </body>
  </html>`,
    });

    console.log(`[Email] Order confirmation sent to ${customerEmail} for order ${orderId}`, result);
    return result;
  } catch (error) {
    console.error(`[Email] Failed to send order confirmation to ${customerEmail}:`, error);
  }
}

export async function sendPasswordResetEmail(to: string, token: string, baseUrl: string) {
  const { client, fromEmail } = await getResendClient();
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  
  await client.emails.send({
    from: fromEmail || 'ZK REZK <noreply@zkrezk.com>',
    to: [to],
    subject: 'Recuperação de senha - ZK REZK',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 40px 20px; }
            .container { max-width: 500px; margin: 0 auto; background: #fff; border: 1px solid #e0e0e0; }
            .header { background: #000; color: #fff; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; letter-spacing: 4px; font-weight: 400; }
            .content { padding: 40px 30px; text-align: center; }
            .content h2 { font-size: 20px; font-weight: 400; margin-bottom: 20px; }
            .content p { color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 30px; }
            .button { display: inline-block; background: #000; color: #fff; padding: 15px 40px; text-decoration: none; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; }
            .footer { padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0; }
            .footer p { color: #999; font-size: 11px; margin: 0; }
            .warning { background: #fff3cd; padding: 15px; margin-top: 20px; font-size: 12px; color: #856404; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>ZK REZK</h1>
            </div>
            <div class="content">
              <h2>Redefinir sua senha</h2>
              <p>Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.</p>
              <a href="${resetUrl}" class="button">Redefinir Senha</a>
              <div class="warning">
                Este link expira em 3 horas. Se você não solicitou a redefinição de senha, ignore este email.
              </div>
            </div>
            <div class="footer">
              <p>© 2026 ZK REZK. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `
  });
}
