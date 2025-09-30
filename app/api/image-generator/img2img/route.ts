import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseServerClient } from '@/utils/supabase/server';
import { createServiceRoleClient } from '@/utils/supabase/service-role';

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

    // 新增：记录生成任务到数据库（未登录也记录）
    let recordId: string | null = null;
    let supabaseServer: Awaited<ReturnType<typeof createSupabaseServerClient>> | null = null;
    let supabaseService: ReturnType<typeof createServiceRoleClient> | null = null;
    let dbClient: any = null;
    let user: { id: string } | null = null;
    try {
      supabaseServer = await createSupabaseServerClient();
      const { data: userData } = await supabaseServer.auth.getUser();
      user = userData?.user ?? null;
      if (user) {
        const { data: inserted, error: insertError } = await supabaseServer
          .from('generation_records')
          .insert({
            user_id: user.id,
            type: 'img2img',
            prompt,
            input_images: inputUrls,
            status: 'queued',
          })
          .select('id')
          .single();
        if (!insertError && inserted?.id) {
          recordId = inserted.id as string;
          dbClient = supabaseServer;
          console.log('[img2img] 已创建生成记录:', recordId);
        } else if (insertError) {
          console.warn('[img2img] 创建生成记录失败:', insertError.message);
        }
      } else {
        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
          supabaseService = createServiceRoleClient();
          const { data: insertedAnon, error: insertAnonError } = await supabaseService
            .from('generation_records')
            .insert({
              user_id: null,
              type: 'img2img',
              prompt,
              input_images: inputUrls,
              status: 'queued',
            })
            .select('id')
            .single();
          if (!insertAnonError && insertedAnon?.id) {
            recordId = insertedAnon.id as string;
            dbClient = supabaseService;
            console.log('[img2img] 已创建匿名生成记录:', recordId);
          } else if (insertAnonError) {
            console.warn('[img2img] 创建匿名生成记录失败:', insertAnonError.message);
          }
        } else {
          console.warn('[img2img] 缺少 SUPABASE_SERVICE_ROLE_KEY，未登录用户无法记录生成任务');
        }
      }
    } catch (dbInitErr) {
      console.warn('[img2img] 初始化 Supabase 失败或未登录，可能跳过记录:', dbInitErr);
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
      // 失败状态（未登录也更新）
      if (dbClient && recordId) {
        try {
          let q = dbClient
            .from('generation_records')
            .update({ status: 'failed', error: 'Response body is null' })
            .eq('id', recordId);
          if (user) q = q.eq('user_id', user.id);
          await q;
        } catch (updateErr) {
          console.warn('[img2img] 更新记录为 failed 失败:', updateErr);
        }
      }
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
            // 新增：更新记录为 processing 并写入 provider_job_id（未登录也更新）
            if (dbClient && recordId && taskId) {
              try {
                let q = dbClient
                  .from('generation_records')
                  .update({ provider_job_id: taskId, status: 'processing' })
                  .eq('id', recordId);
                if (user) q = q.eq('user_id', user.id);
                await q;
                console.log('[img2img] 已更新记录为 processing');
              } catch (updateErr) {
                console.warn('[img2img] 更新记录为 processing 失败:', updateErr);
              }
            }
            break;
          }
        } catch (err) {
          console.error('[DEBUG] JSON parse error:', err, match[1]);
        }
      }
    }

    if (!taskId) {
      if (dbClient && recordId) {
        try {
          let q = dbClient
            .from('generation_records')
            .update({ status: 'failed', error: '未获取到任务ID' })
            .eq('id', recordId);
          if (user) q = q.eq('user_id', user.id);
          await q;
        } catch (updateErr) {
          console.warn('[img2img] 更新记录为 failed 失败:', updateErr);
        }
      }
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
        if (dbClient && recordId) {
          try {
            let q = dbClient
              .from('generation_records')
              .update({ status: 'failed', error: 'Invalid JSON from result' })
              .eq('id', recordId);
            if (user) q = q.eq('user_id', user.id);
            await q;
          } catch (updateErr) {
            console.warn('[img2img] 更新记录为 failed 失败:', updateErr);
          }
        }
        return NextResponse.json({ error: 'Invalid JSON from result', detail: resText }, { status: 500 });
      }

      lastStatus = resData?.data?.status;
      const results = resData?.data?.results;
      if (lastStatus === 'succeeded' && Array.isArray(results) && results[0]?.url) {
        imageUrl = results[0].url as string;
        break;
      }
      if (lastStatus === 'failed') {
        if (dbClient && recordId) {
          try {
            let q = dbClient
              .from('generation_records')
              .update({ status: 'failed', error: JSON.stringify(resData) })
              .eq('id', recordId);
            if (user) q = q.eq('user_id', user.id);
            await q;
          } catch (updateErr) {
            console.warn('[img2img] 更新记录为 failed 失败:', updateErr);
          }
        }
        return NextResponse.json({ error: 'Image generation failed', detail: resData }, { status: 500 });
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }

    if (!imageUrl) {
      if (dbClient && recordId) {
        try {
          let q = dbClient
            .from('generation_records')
            .update({ status: 'failed', error: JSON.stringify({ status: lastStatus }) })
            .eq('id', recordId);
          if (user) q = q.eq('user_id', user.id);
          await q;
        } catch (updateErr) {
          console.warn('[img2img] 更新记录为 failed 失败:', updateErr);
        }
      }
      return NextResponse.json({ error: 'Image URL not found', detail: { status: lastStatus } }, { status: 500 });
    }

    // 成功写入（未登录也更新）
    if (dbClient && recordId && imageUrl) {
      try {
        let q = dbClient
          .from('generation_records')
          .update({ status: 'succeeded', output_image_url: imageUrl })
          .eq('id', recordId);
        if (user) q = q.eq('user_id', user.id);
        await q;
        console.log('[img2img] 已更新记录为 succeeded');
      } catch (updateErr) {
        console.warn('[img2img] 更新记录为 succeeded 失败:', updateErr);
      }
    }

    return NextResponse.json({ success: true, image: imageUrl });
  } catch (error) {
    console.error('[img2img] Error:', error);
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
  }
}