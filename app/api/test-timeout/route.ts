import { NextRequest, NextResponse } from 'next/server';

// Vercel Pro 计划允许 Serverless Functions 最大运行 300 秒
// 为这个测试路由明确设置最大执行时间
export const dynamic = 'force-dynamic'; // 确保路由始终是动态的
export const maxDuration = 300; // 设置最大执行时间为 300 秒

/**
 * 用于测试 Vercel 函数超时的 API 路由
 * 它会等待指定的延迟时间后再发送响应
 * @param {NextRequest} request - 传入的请求对象
 * @returns {NextResponse} - 响应对象
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 解析请求体
    const body = await request.json();
    const delay = parseInt(body.delay, 10) || 0;

    // 验证延迟时间不超过安全限制（留5秒缓冲时间，与 clientFetch 的 295s 超时对齐）
    if (delay > 295000) {
      return NextResponse.json(
        {
          error: `Delay cannot exceed 295000 ms (Vercel Pro limit).`,
          maxAllowed: 295000,
          requested: delay
        },
        { status: 400 }
      );
    }

    if (delay < 0) {
      return NextResponse.json(
        { error: `Delay cannot be negative.` },
        { status: 400 }
      );
    }

    // eslint-disable-next-line no-console
    console.log(`[test-timeout] Request received, waiting ${delay}ms`);

    // 模拟长时间运行的进程
    await new Promise((resolve) => setTimeout(resolve, delay));

    const endTime = Date.now();
    const actualDuration = endTime - startTime;

    // eslint-disable-next-line no-console
    console.log(
      `[test-timeout] Waited ${delay}ms, actual duration ${actualDuration}ms, sending response now`
    );

    return NextResponse.json({
      success: true,
      message: `Success. Function waited ${delay}ms without timing out.`,
      requestedDelay: delay,
      actualDuration: actualDuration,
      timestamp: new Date().toISOString(),
      maxDuration: 300000,
      remainingTime: 300000 - actualDuration
    });
  } catch (error) {
    const endTime = Date.now();
    const actualDuration = endTime - startTime;

    let errorMessage = 'Internal server error.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    // eslint-disable-next-line no-console
    console.error('[test-timeout] Error occurred:', error);
    // eslint-disable-next-line no-console
    console.error(`[test-timeout] Error time: ${actualDuration}ms`);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        actualDuration,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET 方法用于获取测试信息
 */
export async function GET() {
  return NextResponse.json({
    info: 'Vercel timeout test API',
    usage: {
      method: 'POST',
      body: { delay: 'number (0-295000)' },
      description:
        'Send a delay in milliseconds to test how long a Vercel function can run.'
    },
    limits: {
      maxDuration: 300000,
      recommendedTestDelay: 280000,
      safeMaxDelay: 295000
    },
    examples: [
      {
        description: 'Test 10 seconds',
        body: { delay: 10000 }
      },
      {
        description: 'Test 280 seconds (recommended)',
        body: { delay: 280000 }
      }
    ]
  });
}
