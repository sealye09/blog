import process from "node:process";
import { execSync } from "node:child_process";
import * as fs from "node:fs/promises";
import matter from "gray-matter";
import { basename, extname } from "pathe";
import { generateSummary } from "./ai.js";
import "dotenv/config";

interface GenerateSummaryOptions {
  maxLength?: number;
  files?: string[]; // 指定要处理的文件列表
  staged?: boolean; // 是否处理 git 暂存区的文件
}

interface BlogFile {
  path: string;
  title: string;
  content: string;
  currentSummary: string;
}

/**
 * 获取 git 暂存区的 Markdown 文件
 */
function getStagedMarkdownFiles(): string[] {
  try {
    const output = execSync("git diff --cached --name-only --diff-filter=ACM", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    const files = output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.endsWith(".md") && line.length > 0);

    return files;
  } catch (error: any) {
    console.error("❌ 获取 git 暂存文件失败:", error.message);
    return [];
  }
}

/**
 * 分析文件，提取需要生成摘要的文件
 */
async function analyzeFiles(
  files: string[],
): Promise<{ needsGeneration: BlogFile[]; skipped: number }> {
  const needsGeneration: BlogFile[] = [];
  let skipped = 0;

  for (const file of files) {
    try {
      const raw = await fs.readFile(file, "utf8");
      const { data, content } = matter(raw);

      const title = data.title || basename(file, extname(file));
      const currentSummary = data.summary || "";

      // 总是重新生成（因为指定了文件或使用 staged 模式）
      needsGeneration.push({
        path: file,
        title,
        content,
        currentSummary,
      });
    } catch (error: any) {
      console.warn(`⚠️  无法读取文件 ${file}: ${error.message}`);
      skipped++;
    }
  }

  return { needsGeneration, skipped };
}

/**
 * 更新 Markdown 文件的 front matter
 */
async function updateFileSummary(filePath: string, summary: string): Promise<void> {
  const raw = await fs.readFile(filePath, "utf8");
  const { data, content } = matter(raw);

  // 更新 summary 字段
  data.summary = summary;

  // 重新生成文件内容
  const newContent = matter.stringify(content, data);
  await fs.writeFile(filePath, newContent, "utf8");
}

/**
 * 主函数：为博客文章生成摘要
 */
async function generateSummaries(options: GenerateSummaryOptions = {}): Promise<void> {
  const { maxLength = 150, files: specificFiles, staged = false } = options;

  let files: string[];

  if (staged) {
    // 处理 git 暂存区的文件
    console.log("🔍 检查 git 暂存区的 Markdown 文件...\n");

    files = getStagedMarkdownFiles();

    if (files.length === 0) {
      console.log("ℹ️  暂存区没有 Markdown 文件");
      return;
    }

    console.log(`📝 找到 ${files.length} 个暂存的 Markdown 文件:`);
    files.forEach((file) => console.log(`   - ${file}`));
    console.log();
  } else {
    // 处理指定的文件
    if (!specificFiles || specificFiles.length === 0) {
      console.error("❌ 错误：必须指定要处理的 Markdown 文件或使用 --staged 参数\n");
      console.log("使用方法:");
      console.log("  pnpm gen file1.md file2.md         # 为指定文件生成摘要");
      console.log("  pnpm gen --staged                  # 为 git 暂存区的文件生成摘要");
      console.log("  pnpm gen --help                    # 查看完整帮助\n");
      process.exit(1);
    }

    // 过滤并处理指定的文件
    files = specificFiles.filter((f) => f.endsWith(".md")).sort();

    if (files.length === 0) {
      console.log("❌ 指定的文件中没有 Markdown 文件");
      return;
    }

    console.log(`📁 指定处理 ${files.length} 个 Markdown 文件`);
  }

  console.log("🚀 开始分析博客文件...");
  console.log("ℹ️  将强制重新生成摘要\n");

  // 分析文件
  const { needsGeneration, skipped } = await analyzeFiles(files);

  if (skipped > 0) {
    console.log(`⚠️  跳过 ${skipped} 个无法读取的文件\n`);
  }

  if (needsGeneration.length === 0) {
    console.log("❌ 没有可处理的文件");
    return;
  }

  console.log(`🤖 需要生成摘要的文件: ${needsGeneration.length} 个\n`);

  // 生成摘要
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < needsGeneration.length; i++) {
    const file = needsGeneration[i];
    const progress = `[${i + 1}/${needsGeneration.length}]`;

    try {
      console.log(`${progress} 正在处理: ${file.title}`);

      const summary = await generateSummary(file.content, file.title, maxLength);

      await updateFileSummary(file.path, summary);

      console.log(`✅ ${progress} 生成成功`);
      console.log(`   摘要: ${summary}\n`);

      successCount++;

      // 添加延迟避免 API 限流
      if (i < needsGeneration.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error: any) {
      console.error(`❌ ${progress} 生成失败: ${file.title}`);
      console.error(`   错误: ${error.message}\n`);
      failCount++;
    }
  }

  // 输出统计信息
  console.log("\n" + "=".repeat(60));
  console.log("📊 生成统计:");
  console.log(`   ✅ 成功: ${successCount} 个`);
  console.log(`   ❌ 失败: ${failCount} 个`);
  console.log(`   ⏭️  跳过: ${skipped} 个`);
  console.log(`   📝 总计: ${files.length} 个`);
  console.log("=".repeat(60) + "\n");

  if (failCount > 0) {
    console.log("⚠️  有部分文件生成失败，请检查错误信息并重试。");
    process.exit(1);
  } else {
    console.log("🎉 所有摘要生成完成！");
  }
}

/**
 * 命令行参数解析
 */
function parseArgs(): GenerateSummaryOptions {
  const args = process.argv.slice(2);
  const options: GenerateSummaryOptions = {};
  const files: string[] = [];

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      console.log(`
使用方法: pnpm gen [选项] [文件...]

参数:
  [文件...]      要处理的 Markdown 文件路径（可选，支持多个文件）
                 注意：默认会强制重新生成摘要（覆盖已有的）

选项:
  --staged, -s   处理 git 暂存区的 Markdown 文件
  --help, -h     显示帮助信息

环境变量配置 (.env 文件):
  OPENAI_API_KEY              API 密钥 (必需)
  OPENAI_API_BASE             API 端点 (可选)
                              - OpenAI: 不设置或 https://api.openai.com/v1
                              - DeepSeek: https://api.deepseek.com
  OPENAI_MODEL                使用的模型 (可选)
                              - OpenAI: gpt-3.5-turbo (默认), gpt-4, gpt-4o 等
                              - DeepSeek: deepseek-chat, deepseek-reasoner 等
  AI_SUMMARY_MAX_LENGTH       摘要最大长度 (可选，默认: 150)

配置示例:
  # 使用 OpenAI
  OPENAI_API_KEY=sk-xxx
  OPENAI_MODEL=gpt-4o

  # 使用 DeepSeek
  OPENAI_API_KEY=sk-xxx
  OPENAI_API_BASE=https://api.deepseek.com
  OPENAI_MODEL=deepseek-chat

使用示例:
  pnpm gen file1.md file2.md                  # 为指定文件生成摘要
  pnpm gen __blogs/001_*.md                   # 使用通配符指定多个文件
  pnpm gen --staged                           # 为 git 暂存区的文件生成摘要
  pnpm gen -s                                 # --staged 的简写
      `);
      process.exit(0);
    } else if (arg === "--staged" || arg === "-s") {
      options.staged = true;
    } else if (!arg.startsWith("-")) {
      // 不以 - 开头的参数视为文件路径
      files.push(arg);
    }
  }

  if (files.length > 0) {
    options.files = files;
  }

  // 从环境变量读取最大长度
  if (process.env.AI_SUMMARY_MAX_LENGTH) {
    options.maxLength = parseInt(process.env.AI_SUMMARY_MAX_LENGTH, 10);
  }

  return options;
}

// 主程序入口
const options = parseArgs();

generateSummaries(options).catch((err) => {
  console.error("\n❌ 发生错误:");
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
