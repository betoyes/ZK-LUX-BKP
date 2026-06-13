const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const r2 = new S3Client({
  region: 'auto',
  endpoint: 'https://' + process.env.CLOUDFLARE_R2_ACCOUNT_ID + '.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  }
});

async function backup() {
  console.log('Iniciando backup...');
  const tables = ['products','orders','users','categories','collections','branding','journal_posts','cart_items','subscribers','asaas_customers','asaas_payments','audit_logs','customers','data_export_requests','email_verification_tokens','password_reset_tokens','session'];
  const dump = {};
  for (const table of tables) {
    try {
      const result = await pool.query('SELECT * FROM ' + table);
      dump[table] = result.rows;
      console.log('[OK] ' + table + ': ' + result.rows.length + ' registros');
    } catch (err) {
      console.log('[SKIP] ' + table + ': ' + err.message);
    }
  }
  const date = new Date().toISOString().split('T')[0];
  const key = 'backups/zkrezk-backup-' + date + '.json';
  const content = JSON.stringify(dump, null, 2);
  await r2.send(new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
    Body: content,
    ContentType: 'application/json'
  }));
  console.log('Backup salvo: ' + key);
  console.log('Tamanho: ' + (content.length / 1024).toFixed(1) + ' KB');
  await pool.end();
}

backup().catch(function(err) {
  console.error('Erro:', err);
  pool.end();
  process.exit(1);
});
