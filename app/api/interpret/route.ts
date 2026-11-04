
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "未配置 DEEPSEEK_API_KEY" },
        { status: 500 }
      );
    }

    const { chart, messages } = await request.json();

    if (!chart || !Array.isArray(messages)) {
      return Response.json(
        { error: "请求数据不完整" },
        { status: 400 }
      );
    }

    const systemPrompt = `
你是一名熟悉紫微斗数传统理论的AI研究助手。
请结合用户提供的命盘，进行结构清晰的分析。

要求：
1. 使用中文回答。
2. 结合命宫、十二宫、主星、四化等具体信息。
3. 对事业、财运、感情等问题提供解释。
4. 保持上下文，支持连续追问。
5. 不得编造命盘中不存在的数据。
6. 明确说明命理分析属于传统文化研究，
   不属于科学预测，也不能替代专业决策。

命盘数据：
${JSON.stringify(chart)}
`;

    const safeMessages = messages
      .filter(
        (m: any) =>
          m &&
          ["user", "assistant"].includes(m.role) &&
          typeof m.content === "string"
      )
      .slice(-20)
      .map((m: any) => ({
        role: m.role,
        content: m.content.slice(0, 8000),
      }));

    const response = await fetch(
      "https://api.deepseek.com/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            ...safeMessages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok || !response.body) {
      return Response.json(
        { error: "AI服务请求失败" },
        { status: 502 }
      );
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json(
      { error: "服务器处理失败" },
      { status: 500 }
    );
  }
}
