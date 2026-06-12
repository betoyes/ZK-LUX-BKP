import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

if (!process.env.CLOUDFLARE_R2_ACCOUNT_ID) throw new Error("CLOUDFLARE_R2_ACCOUNT_ID não definido");
if (!process.env.CLOUDFLARE_R2_ACCESS_KEY_ID) throw new Error("CLOUDFLARE_R2_ACCESS_KEY_ID não definido");
if (!process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY) throw new Error("CLOUDFLARE_R2_SECRET_ACCESS_KEY não definido");
if (!process.env.CLOUDFLARE_R2_BUCKET_NAME) throw new Error("CLOUDFLARE_R2_BUCKET_NAME não definido");
if (!process.env.CLOUDFLARE_R2_PUBLIC_URL) throw new Error("CLOUDFLARE_R2_PUBLIC_URL não definido");

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

export const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
export const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL!;

export async function uploadToR2(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const sanitized = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const key = `products/${Date.now()}-${sanitized}`;

  const upload = new Upload({
    client: r2Client,
    params: {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    },
  });

  await upload.done();
  return `${PUBLIC_URL}/${key}`;
}

export async function deleteFromR2(publicUrl: string): Promise<void> {
  const key = publicUrl.replace(`${PUBLIC_URL}/`, "");
  await r2Client.send(
    new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key })
  );
}
