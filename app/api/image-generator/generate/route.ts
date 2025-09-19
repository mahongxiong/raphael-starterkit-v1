import { NextRequest, NextResponse } from 'next/server';

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

    // 提交任务接口
    const submitUrl = `${apiBase}/v1/draw/nano-banana`;
    console.log('[DEBUG] 请求 submitUrl:', submitUrl);
    const response = await fetch(submitUrl, {
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

    const responseText = await response.text();
    console.log('[DEBUG] 生成接口原始返回:', responseText);
    debugger;

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}: ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('[DEBUG] 解析后的 data:', data);
      debugger;
    } catch (parseError) {
      console.error('Failed to parse JSON:', responseText);
      throw new Error(`Invalid JSON response: ${responseText}`);
    }

    // 检查接口返回的任务ID
    if (!data || data.code !== 0 || !data.data || !data.data.id) {
      console.log('[DEBUG] 任务ID检查失败:', { data });
      return NextResponse.json({ error: 'API请求失败或未返回任务ID', detail: data }, { status: 500 });
    }

    // 查询结果接口
    let imageUrl = null;
    let status = '';
    let results = null;
    let maxTries = 20;
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
        body: JSON.stringify({ id: data.data.id }),
      });
      const resultText = await resultRes.text();
      console.log('[DEBUG] 结果接口原始返回:', resultText);

      let resultData;
      try {
        resultData = JSON.parse(resultText);
        console.log('[DEBUG] 结果接口解析后:', resultData);
        debugger;
      } catch (err) {
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
        return NextResponse.json({ error: '图片生成失败', detail: resultData }, { status: 500 });
      }
      await new Promise(resolve => setTimeout(resolve, 1500));
      tries++;
    }
    if (!imageUrl) {
      console.log('[DEBUG] 最终未获取到图片 URL:', { status, results });
      return NextResponse.json({ error: '未获取到图片URL', detail: { status, results } }, { status: 500 });
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
