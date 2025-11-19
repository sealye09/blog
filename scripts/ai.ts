import process from "node:process";

import { createDeepSeek } from "@ai-sdk/deepseek";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

export interface AIConfig {
  apiKey: string;
  apiBase?: string;
  model: string;
}

/**
 * 获取 AI 配置
 */
export function getAIConfig(): AIConfig {
  const apiKey = process.env.OPENAI_API_KEY;
  const apiBase = process.env.OPENAI_API_BASE;
  const model = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

  if (!apiKey) {
    throw new Error("未找到 OPENAI_API_KEY 环境变量。请在 .env 文件中配置或设置环境变量。");
  }

  return {
    apiKey,
    apiBase,
    model,
  };
}

function getClient(config: AIConfig) {
  if (config.apiBase?.includes("openai")) {
    return createOpenAI({
      apiKey: config.apiKey,
      baseURL: config.apiBase,
    });
  }
  if (config.apiBase?.includes("deepseek")) {
    return createDeepSeek({
      apiKey: config.apiKey,
      baseURL: config.apiBase,
    });
  }
  throw new Error("不支持的 API 端点");
}

/**
 * 调用 AI API 生成文本（支持 OpenAI、DeepSeek 等兼容 OpenAI API 的服务）
 */
export async function generateAIText(
  systemPrompt: string,
  userPrompt: string,
  config?: Partial<AIConfig>,
): Promise<string> {
  const defaultConfig = getAIConfig();
  const finalConfig = { ...defaultConfig, ...config };
  const client = getClient(finalConfig);

  try {
    const { text } = await generateText({
      model: client.languageModel(finalConfig.model),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 1.1,
    });

    const result = text.trim();

    if (!result) {
      throw new Error("AI 返回的内容为空");
    }

    return result;
  } catch (error: any) {
    // 提供更详细的错误信息
    let errorMsg = `AI 生成失败: ${JSON.stringify(error)}`;
    throw new Error(errorMsg);
  }
}

/**
 * 为博客文章生成摘要
 */
export async function generateSummary(
  content: string,
  title: string,
  maxLength: number = 150,
): Promise<string> {
  const systemPrompt = "你是一个专业的技术博客编辑，擅长为技术文章撰写简洁、准确、吸引人的摘要。";

  const userPrompt = `请为以下博客文章生成一个简洁的摘要，限制在 ${maxLength} 个字符以内。摘要应该准确概括文章的核心内容，吸引读者阅读。

文章标题: ${title}

文章内容:
${content.slice(0, 3000)} ${content.length > 3000 ? "..." : ""}

请只返回摘要内容，不要包含其他说明文字。`;

  return generateAIText(systemPrompt, userPrompt);
}
