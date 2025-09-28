import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, url, urls, webHook, shutProgress } = body || {};

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }
    const inputUrls: string[] = Array.isArray(urls)
      ? urls
      : url
      ? [url]
      : [];
    if (!inputUrls.length) {
      return NextResponse.json({ error: 'Image URL is required for image-to-image' }, { status: 400 });
    }

    const apiBase = process.env.NANO_BANANA_API_BASE;
    const apiKey = process.env.NANO_BANANA_API_KEY;
    if (!apiBase || !apiKey) {
      return NextResponse.json({ error: 'Missing NANO_BANANA configuration on server' }, { status: 500 });
    }

    // Submit image-to-image task
    const submitUrl = `${apiBase}/v1/draw/nano-banana`;
    const submitRes = await fetch(submitUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'nano-banana-fast',
        prompt,
        urls: inputUrls,
        ...(webHook ? { webHook } : {}),
        ...(typeof shutProgress === 'boolean' ? { shutProgress } : {}),
      }),
    });

    if (!submitRes.body) {
      throw new Error('Response body is null');
    }
    const reader = submitRes.body.getReader();
    const decoder = new TextDecoder();
    let taskId: string | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      console.log('[DEBUG] 接收到流式数据:', chunk);

      const match = chunk.match(/data:\s*(\{.*\})/);
      if (match) {
        try {
          const obj = JSON.parse(match[1]);
          if (obj.id && !taskId) {
            taskId = obj.id;
            console.log('[DEBUG] 成功获取任务ID:', taskId);
            break;
          }
        } catch (err) {
          console.error('[DEBUG] JSON parse error:', err, match[1]);
        }
      }
    }

    if (!taskId) {
      return NextResponse.json(
        { error: '未获取到任务ID' },
        { status: 500 }
      );
    }

    // Poll for result
    const resultUrl = `${apiBase}/v1/draw/result`;
    const maxTries = 2000;
    const delayMs = 1500;
    let imageUrl: string | null = null;
    let lastStatus: any = null;
    for (let i = 0; i < maxTries; i++) {
      const res = await fetch(resultUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ id: taskId }),
      });
      const resText = await res.text();
      let resData: any;
      try {
        resData = JSON.parse(resText);
      } catch (e) {
        return NextResponse.json({ error: 'Invalid JSON from result', detail: resText }, { status: 500 });
      }

      lastStatus = resData?.data?.status;
      const results = resData?.data?.results;
      if (lastStatus === 'succeeded' && Array.isArray(results) && results[0]?.url) {
        imageUrl = results[0].url as string;
        break;
      }
      if (lastStatus === 'failed') {
        return NextResponse.json({ error: 'Image generation failed', detail: resData }, { status: 500 });
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL not found', detail: { status: lastStatus } }, { status: 500 });
    }

    return NextResponse.json({ success: true, image: imageUrl });
  } catch (error) {
    console.error('[img2img] Error:', error);
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
  }
}