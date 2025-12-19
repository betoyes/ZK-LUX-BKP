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
  type: 'newsletter' | 'lead' | 'customer' | 'order',
  data: { name?: string; email?: string; total?: number; orderId?: string; items?: number }
) {
  const adminEmail = 'betoyes@gmail.com';
  
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
              .badge { display: inline-block; padding: 8px 16px; background: ${type === 'order' ? '#22c55e' : type === 'customer' ? '#3b82f6' : '#f59e0b'}; color: #fff; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; }
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
                  <span class="badge">${type === 'order' ? 'VENDA' : type === 'customer' ? 'CLIENTE' : type === 'lead' ? 'LEAD' : 'NEWSLETTER'}</span>
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
                Este link expira em 1 hora. Se você não solicitou a redefinição de senha, ignore este email.
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
