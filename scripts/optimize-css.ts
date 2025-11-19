import * as fs from "node:fs/promises";

import { bundleAsync, transform } from "lightningcss";
import { basename, join } from "pathe";

import { log } from "../utils/logger.js";

export interface CssOptimizeOptions {
  minify?: boolean;
  target?: "browsers" | "node" | "custom";
  customTargets?: Record<string, number>;
  analyze?: boolean;
}

export interface CssAnalysisResult {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
}

const DEFAULT_CSS_OPTIONS: CssOptimizeOptions = {
  minify: true,
  target: "browsers",
  analyze: false,
};

const BROWSER_TARGETS = {
  chrome: 58,
  firefox: 54,
  safari: 11,
  edge: 79,
};

/**
 * 优化单个 CSS 文件
 */
export async function optimizeCss(
  cssPath: string,
  options: CssOptimizeOptions = {},
): Promise<{ content: string; analysis?: CssAnalysisResult }> {
  const opts = { ...DEFAULT_CSS_OPTIONS, ...options };
  const originalContent = await fs.readFile(cssPath, "utf8");
  const originalSize = Buffer.byteLength(originalContent, "utf8");

  try {
    // 使用 LightningCSS 进行优化
    const bundleResult = await bundleAsync({
      filename: cssPath,
      minify: opts.minify,
      targets: opts.customTargets || (opts.target === "browsers" ? BROWSER_TARGETS : undefined),
      drafts: {
        customMedia: true,
        nesting: true,
        colorFunction: true,
        colorMix: true,
      },
      features: {
        "@nesting-rules": true,
        "css-pseudo": true,
        "logical-properties": true,
      },
    } as any);

    const optimizedContent = bundleResult.code.toString();
    const optimizedSize = Buffer.byteLength(optimizedContent, "utf8");

    // 生成分析报告
    let analysis: CssAnalysisResult | undefined;
    if (opts.analyze) {
      analysis = {
        originalSize,
        optimizedSize,
        compressionRatio: ((originalSize - optimizedSize) / originalSize) * 100,
      };

      log.info(`CSS 分析结果 (${basename(cssPath)}):`);
      log.info(`   原始大小: ${(analysis.originalSize / 1024).toFixed(2)} KB`);
      log.info(`   优化后大小: ${(analysis.optimizedSize / 1024).toFixed(2)} KB`);
      log.info(`   压缩率: ${analysis.compressionRatio.toFixed(2)}%`);
    }

    return { content: optimizedContent, analysis };
  } catch (error) {
    log.error(`CSS 优化失败 (${basename(cssPath)}):`, error);

    // 降级到 transform
    try {
      const transformResult = transform({
        code: Buffer.from(originalContent),
        filename: cssPath,
        minify: opts.minify,
        targets: opts.customTargets || (opts.target === "browsers" ? BROWSER_TARGETS : undefined),
      });

      const optimizedContent = transformResult.code.toString();
      const optimizedSize = Buffer.byteLength(optimizedContent, "utf8");

      let analysis: CssAnalysisResult | undefined;
      if (opts.analyze) {
        analysis = {
          originalSize,
          optimizedSize,
          compressionRatio: ((originalSize - optimizedSize) / originalSize) * 100,
        };
      }

      return { content: optimizedContent, analysis };
    } catch (fallbackError) {
      log.error(`CSS 降级优化也失败 (${basename(cssPath)}):`, fallbackError);
      return { content: originalContent };
    }
  }
}

/**
 * 批量优化 CSS 文件
 */
export async function optimizeAllCssFiles(
  assetsDir: string,
  options: CssOptimizeOptions = {},
): Promise<number> {
  try {
    const entries = await fs.readdir(assetsDir, { withFileTypes: true });
    let cssFileCount = 0;

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".css")) {
        const cssPath = join(assetsDir, entry.name);
        try {
          log.info(`优化 CSS 文件: ${entry.name}`);
          const result = await optimizeCss(cssPath, options);
          await fs.writeFile(cssPath, result.content, "utf8");
          cssFileCount++;
        } catch (fileError) {
          log.error(`文件 ${entry.name} 优化失败:`, fileError);
        }
      }
    }

    log.info(`CSS 批量优化完成: 成功 ${cssFileCount} 个文件`);
    return cssFileCount;
  } catch (error) {
    log.error("CSS 文件批量优化失败:", error);
    throw error;
  }
}
