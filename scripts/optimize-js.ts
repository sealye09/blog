import * as fs from "node:fs/promises";

import { basename, join } from "pathe";
import type { ECMA } from "terser";
import { minify } from "terser";

import { log } from "../utils/logger";

export interface JsOptimizeOptions {
  compress?: boolean;
  mangle?: boolean;
  ecma?: ECMA;
  analyze?: boolean;
}

export interface JsAnalysisResult {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
}

const DEFAULT_JS_OPTIONS: JsOptimizeOptions = {
  compress: true,
  mangle: true,
  ecma: 2015,
  analyze: false,
};

/**
 * 优化单个 JS 文件
 */
export async function optimizeJs(
  jsPath: string,
  options: JsOptimizeOptions = {},
): Promise<{ content: string; analysis?: JsAnalysisResult }> {
  const opts = { ...DEFAULT_JS_OPTIONS, ...options };
  const originalContent = await fs.readFile(jsPath, "utf8");
  const originalSize = Buffer.byteLength(originalContent, "utf8");

  try {
    if (!opts.compress && !opts.mangle) {
      return { content: originalContent };
    }

    // 使用 terser 进行优化
    const result = await minify(originalContent, {
      compress: opts.compress
        ? {
            dead_code: true,
            drop_console: true,
            drop_debugger: true,
            passes: 2,
          }
        : false,
      mangle: opts.mangle,
      ecma: opts.ecma,
      format: {
        comments: false,
      },
    });

    const optimizedContent = result.code || originalContent;
    const optimizedSize = Buffer.byteLength(optimizedContent, "utf8");

    // 生成分析报告
    let analysis: JsAnalysisResult | undefined;
    if (opts.analyze) {
      analysis = {
        originalSize,
        optimizedSize,
        compressionRatio: ((originalSize - optimizedSize) / originalSize) * 100,
      };

      log.info(`JavaScript 分析结果 (${basename(jsPath)}):`);
      log.info(`原始大小: ${(analysis.originalSize / 1024).toFixed(2)} KB`);
      log.info(`优化后大小: ${(analysis.optimizedSize / 1024).toFixed(2)} KB`);
      log.info(`压缩率: ${analysis.compressionRatio.toFixed(2)}%`);
    }

    return { content: optimizedContent, analysis };
  } catch (error) {
    log.error(`JavaScript 优化失败 (${basename(jsPath)}):`, error);
    return { content: originalContent };
  }
}

/**
 * 批量优化 JS 文件
 */
export async function optimizeAllJsFiles(
  outDir: string,
  options: JsOptimizeOptions = {},
): Promise<number> {
  try {
    let jsFileCount = 0;

    // 递归查找所有 JS 文件
    async function findJsFiles(dir: string): Promise<string[]> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files: string[] = [];

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== "node_modules") {
          files.push(...(await findJsFiles(fullPath)));
        } else if (entry.isFile() && (entry.name.endsWith(".js") || entry.name.endsWith(".mjs"))) {
          files.push(fullPath);
        }
      }

      return files;
    }

    const jsFiles = await findJsFiles(outDir);

    for (const jsPath of jsFiles) {
      try {
        log.info(`优化 JavaScript 文件: ${basename(jsPath)}`);
        const result = await optimizeJs(jsPath, options);
        await fs.writeFile(jsPath, result.content, "utf8");
        jsFileCount++;
      } catch (fileError) {
        log.error(`文件 ${basename(jsPath)} 优化失败:`, fileError);
      }
    }

    log.info(`JavaScript 批量优化完成: 成功 ${jsFileCount} 个文件`);
    return jsFileCount;
  } catch (error) {
    log.error("JavaScript 文件批量优化失败:", error);
    throw error;
  }
}
