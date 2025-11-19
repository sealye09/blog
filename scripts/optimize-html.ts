import * as fs from "node:fs/promises";

import { minify } from "html-minifier-terser";
import { basename, join } from "pathe";

import { log } from "../utils/logger.js";

export interface HtmlOptimizeOptions {
  minify?: boolean;
  analyze?: boolean;
}

export interface HtmlAnalysisResult {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
}

const DEFAULT_HTML_OPTIONS: HtmlOptimizeOptions = {
  minify: true,
  analyze: false,
};

/**
 * 优化单个 HTML 文件
 */
export async function optimizeHtml(
  htmlPath: string,
  options: HtmlOptimizeOptions = {},
): Promise<{ content: string; analysis?: HtmlAnalysisResult }> {
  const opts = { ...DEFAULT_HTML_OPTIONS, ...options };
  const originalContent = await fs.readFile(htmlPath, "utf8");
  const originalSize = Buffer.byteLength(originalContent, "utf8");

  try {
    if (!opts.minify) {
      return { content: originalContent };
    }

    // 使用 html-minifier-terser 进行优化
    const result = await minify(originalContent, {
      collapseWhitespace: true,
      removeComments: true,
      removeAttributeQuotes: true,
      removeEmptyAttributes: true,
      removeOptionalTags: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true,
      minifyCSS: true,
      minifyJS: true,
      sortAttributes: true,
      sortClassName: true,
    });

    const optimizedContent = result;
    const optimizedSize = Buffer.byteLength(optimizedContent, "utf8");

    // 生成分析报告
    let analysis: HtmlAnalysisResult | undefined;
    if (opts.analyze) {
      analysis = {
        originalSize,
        optimizedSize,
        compressionRatio: ((originalSize - optimizedSize) / originalSize) * 100,
      };

      log.info(`HTML 分析结果 (${basename(htmlPath)}):`);
      log.info(`   原始大小: ${(analysis.originalSize / 1024).toFixed(2)} KB`);
      log.info(`   优化后大小: ${(analysis.optimizedSize / 1024).toFixed(2)} KB`);
      log.info(`   压缩率: ${analysis.compressionRatio.toFixed(2)}%`);
    }

    return { content: optimizedContent, analysis };
  } catch (error) {
    log.error(`HTML 优化失败 (${basename(htmlPath)}):`, error);
    return { content: originalContent };
  }
}

/**
 * 批量优化 HTML 文件
 */
export async function optimizeAllHtmlFiles(
  outDir: string,
  options: HtmlOptimizeOptions = {},
): Promise<number> {
  try {
    let htmlFileCount = 0;

    // 递归查找所有 HTML 文件
    async function findHtmlFiles(dir: string): Promise<string[]> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files: string[] = [];

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...(await findHtmlFiles(fullPath)));
        } else if (entry.isFile() && entry.name.endsWith(".html")) {
          files.push(fullPath);
        }
      }

      return files;
    }

    const htmlFiles = await findHtmlFiles(outDir);

    for (const htmlPath of htmlFiles) {
      try {
        log.info(`优化 HTML 文件: ${basename(htmlPath)}`);
        const result = await optimizeHtml(htmlPath, options);
        await fs.writeFile(htmlPath, result.content, "utf8");
        htmlFileCount++;
      } catch (fileError) {
        log.error(`文件 ${basename(htmlPath)} 优化失败:`, fileError);
      }
    }

    log.info(`HTML 批量优化完成: 成功 ${htmlFileCount} 个文件`);
    return htmlFileCount;
  } catch (error) {
    log.error("HTML 文件批量优化失败:", error);
    throw error;
  }
}
