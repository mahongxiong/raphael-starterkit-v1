import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseServerClient } from '@/utils/supabase/server';
import { createServiceRoleClient } from '@/utils/supabase/service-role';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;
    console.log('[DEBUG] 收到 prompt:', prompt);
    debugger;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const apiBase = process.env.NANO_BANANA_API_BASE;
    const apiKey = process.env.NANO_BANANA_API_KEY;
    if (!apiBase || !apiKey) {
      return NextResponse.json(
        { error: '服务器缺少 NANO_BANANA 配置' },
        { status: 500 }
      );
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
            type: 'txt2img',
            prompt,
            input_images: [],
            status: 'queued',
          })
          .select('id')
          .single();
        if (!insertError && inserted?.id) {
          recordId = inserted.id as string;
          dbClient = supabaseServer;
          console.log('[DEBUG] 已创建生成记录:', recordId);
        } else if (insertError) {
          console.warn('[DEBUG] 创建生成记录失败:', insertError.message);
        }
      } else {
        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
          supabaseService = createServiceRoleClient();
          const { data: insertedAnon, error: insertAnonError } = await supabaseService
            .from('generation_records')
            .insert({
              user_id: null,
              type: 'txt2img',
              prompt,
              input_images: [],
              status: 'queued',
            })
            .select('id')
            .single();
          if (!insertAnonError && insertedAnon?.id) {
            recordId = insertedAnon.id as string;
            dbClient = supabaseService;
            console.log('[DEBUG] 已创建匿名生成记录:', recordId);
          } else if (insertAnonError) {
            console.warn('[DEBUG] 创建匿名生成记录失败:', insertAnonError.message);
          }
        } else {
          console.warn('[DEBUG] 缺少 SUPABASE_SERVICE_ROLE_KEY，未登录用户无法记录生成任务');
        }
      }
    } catch (dbInitErr) {
      console.warn('[DEBUG] 初始化 Supabase 失败或未登录，可能跳过记录:', dbInitErr);
    }

    // 提交任务接口
    const submitUrl = `${apiBase}/v1/draw/nano-banana`;
    console.log('[DEBUG] 请求 submitUrl:', submitUrl);
    const submitRes = await fetch(submitUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'nano-banana-fast',
        prompt: prompt
      }),
    });

    if (!submitRes.body) {
      throw new Error('生成接口未返回 body');
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
                console.log('[DEBUG] 已更新记录为 processing');
              } catch (updateErr) {
                console.warn('[DEBUG] 更新记录为 processing 失败:', updateErr);
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
      // 新增：失败状态写入数据库（未登录也更新）
      if (dbClient && recordId) {
        try {
          let q = dbClient
            .from('generation_records')
            .update({ status: 'failed', error: '未获取到任务ID' })
            .eq('id', recordId);
          if (user) q = q.eq('user_id', user.id);
          await q;
        } catch (updateErr) {
          console.warn('[DEBUG] 更新记录为 failed 失败:', updateErr);
        }
      }
      return NextResponse.json(
        { error: '未获取到任务ID' },
        { status: 500 }
      );
    }

    // 查询结果接口
    let imageUrl = null;
    let status = '';
    let results = null;
    let maxTries = 2000;
    let tries = 0;
    while (tries < maxTries) {
      console.log(`[DEBUG] 第 ${tries + 1} 次轮询任务结果`);
      debugger;

      const resultUrl = `${apiBase}/v1/draw/result`;
      const resultRes = await fetch(resultUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ id: taskId  }),
      });
      const resultText = await resultRes.text();
      console.log('[DEBUG] 结果接口原始返回:', resultText);

      let resultData;
      try {
        resultData = JSON.parse(resultText);
        console.log('[DEBUG] 结果接口解析后:', resultData);
        debugger;
      } catch (err) {
        // 新增：失败状态写入数据库（未登录也更新）
        if (dbClient && recordId) {
          try {
            let q = dbClient
              .from('generation_records')
              .update({ status: 'failed', error: '结果接口返回格式错误' })
              .eq('id', recordId);
            if (user) q = q.eq('user_id', user.id);
            await q;
          } catch (updateErr) {
            console.warn('[DEBUG] 更新记录为 failed 失败:', updateErr);
          }
        }
        return NextResponse.json({ error: '结果接口返回格式错误', detail: resultText }, { status: 500 });
      }
      status = resultData?.data?.status;
      results = resultData?.data?.results;
      console.log('[DEBUG] 当前 status & results:', { status, results });

      if (status === 'succeeded' && results && results[0] && results[0].url) {
        imageUrl = results[0].url;
        console.log('[DEBUG] 成功提取图片 URL:', imageUrl);
        break;
      }
      if (status === 'failed') {
        // 新增：失败状态写入数据库（未登录也更新）
        if (dbClient && recordId) {
          try {
            let q = dbClient
              .from('generation_records')
              .update({ status: 'failed', error: JSON.stringify(resultData) })
              .eq('id', recordId);
            if (user) q = q.eq('user_id', user.id);
            await q;
          } catch (updateErr) {
            console.warn('[DEBUG] 更新记录为 failed 失败:', updateErr);
          }
        }
        return NextResponse.json({ error: '图片生成失败', detail: resultData }, { status: 500 });
      }
      await new Promise(resolve => setTimeout(resolve, 1500));
      tries++;
    }
    if (!imageUrl) {
      console.log('[DEBUG] 最终未获取到图片 URL:', { status, results });
      // 新增：失败状态写入数据库（未登录也更新）
      if (dbClient && recordId) {
        try {
          let q = dbClient
            .from('generation_records')
            .update({ status: 'failed', error: JSON.stringify({ status, results }) })
            .eq('id', recordId);
          if (user) q = q.eq('user_id', user.id);
          await q;
        } catch (updateErr) {
          console.warn('[DEBUG] 更新记录为 failed 失败:', updateErr);
        }
      }
      return NextResponse.json({ error: '未获取到图片URL', detail: { status, results } }, { status: 500 });
    }

    // 新增：成功状态写入数据库（未登录也更新）
    if (dbClient && recordId && imageUrl) {
      try {
        let q = dbClient
          .from('generation_records')
          .update({ status: 'succeeded', output_image_url: imageUrl })
          .eq('id', recordId);
        if (user) q = q.eq('user_id', user.id);
        await q;
        console.log('[DEBUG] 已更新记录为 succeeded');
      } catch (updateErr) {
        console.warn('[DEBUG] 更新记录为 succeeded 失败:', updateErr);
      }
    }

    console.log('[DEBUG] 返回前端:', { success: true, image: imageUrl });
    return NextResponse.json({ success: true, image: imageUrl });

  } catch (error) {
    console.error('[DEBUG] 捕获到异常:', error);
    debugger;
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}
