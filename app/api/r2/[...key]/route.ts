import { NextRequest } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

export async function GET(request: NextRequest, { params }: { params: { key: string[] } }) {
  try {
    const accountId = process.env.CF_R2_ACCOUNT_ID as string;
    const accessKeyId = process.env.CF_R2_ACCESS_KEY_ID as string;
    const secretAccessKey = process.env.CF_R2_SECRET_ACCESS_KEY as string;
    const bucket = process.env.CF_R2_BUCKET_NAME || 'banana';

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      return new Response(JSON.stringify({ error: 'Missing Cloudflare R2 configuration' }), { status: 500 });
    }

    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    const key = params.key.join('/');

    const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const contentType = res.ContentType || 'application/octet-stream';

    // Convert stream to Buffer
    const stream = res.Body as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];
    for await (const chunk of stream as any) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[r2 proxy] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch object' }), { status: 500 });
  }
}