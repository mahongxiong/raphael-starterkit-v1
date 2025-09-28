import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function POST(request: NextRequest) {
  try {
    // Expect JSON: { fileName: string, contentType: string, data: string (base64) }
    const { fileName, contentType, data } = (await request.json()) as {
      fileName: string;
      contentType: string;
      data: string; // base64 encoded file content
    };

    if (!fileName || !contentType || !data) {
      return NextResponse.json(
        { error: 'fileName, contentType and base64 data are required' },
        { status: 400 }
      );
    }

    const accountId = process.env.CF_R2_ACCOUNT_ID as string;
    const accessKeyId = process.env.CF_R2_ACCESS_KEY_ID as string;
    const secretAccessKey = process.env.CF_R2_SECRET_ACCESS_KEY as string;
    const bucket = process.env.CF_R2_BUCKET_NAME || 'banana';

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      return NextResponse.json({ error: 'Missing Cloudflare R2 configuration' }, { status: 500 });
    }

    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const key = fileName;

    const buffer = Buffer.from(data, 'base64');

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    // 返回公共访问 URL（需将 R2 Bucket 配置为 Public Read 或开启公共开发 URL）
    const publicHost = process.env.CF_R2_PUBLIC_HOST as string;
    if (!publicHost) {
      return NextResponse.json({ error: 'Missing CF_R2_PUBLIC_HOST for public URL' }, { status: 500 });
    }
    const publicUrl = `https://${publicHost}/${encodeURIComponent(key)}`;
    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error) {
    console.error('[upload] Error:', error);
    return NextResponse.json({ error: 'Failed to upload' }, { status: 500 });
  }
}