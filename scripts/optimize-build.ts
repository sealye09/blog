import * as fs from "node:fs/promises";

import { join } from "pathe";

import { log } from "../utils/logger";
import { OUT_DIR, optimizeConfig } from "./config.js";
import { optimizeAllCssFiles } from "./optimize-css.js";
import { optimizeAllHtmlFiles } from "./optimize-html.js";
import { optimizeAllJsFiles } from "./optimize-js.js";

export interface OptimizationReport {
  timestamp: string;
  config: typeof optimizeConfig;
  results: {
    css?: {
      optimized: boolean;
      fileCount: number;
      errors: string[];
    };
    js?: {
      optimized: boolean;
      fileCount: number;
      errors: string[];
    };
    html?: {
      optimized: boolean;
      fileCount: number;
      errors: string[];
    };
  };
  summary: {
    totalFiles: number;
    successCount: number;
    errorCount: number;
    warnings: string[];
  };
}

export async function runOptimization(verbose = false): Promise<OptimizationReport> {
  const report: OptimizationReport = {
    timestamp: new Date().toISOString(),
    config: { ...optimizeConfig },
    results: {},
    summary: {
      totalFiles: 0,
      successCount: 0,
      errorCount: 0,
      warnings: [],
    },
  };

  log.info("开始优化构建产物...");

  if (optimizeConfig.css.enabled) {
    log.info("优化 CSS 文件...");
    try {
      const assetsDir = join(OUT_DIR, "assets");
      await fs.access(assetsDir);

      const cssFileCount = await optimizeAllCssFiles(assetsDir, {
        minify: optimizeConfig.css.minify,
        target: optimizeConfig.css.target,
        analyze: verbose || optimizeConfig.css.analyze,
      });

      report.results.css = {
        optimized: true,
        fileCount: cssFileCount,
        errors: [],
      };
      report.summary.successCount++;
      log.info("CSS 优化完成");
    } catch (error) {
      const errorMsg = `CSS 优化失败: ${error instanceof Error ? error.message : String(error)}`;
      log.error(`${errorMsg}`);

      report.results.css = {
        optimized: false,
        fileCount: 0,
        errors: [errorMsg],
      };
      report.summary.errorCount++;
    }
  } else {
    log.info("跳过 CSS 优化");
  }

  if (optimizeConfig.js.enabled) {
    log.info("优化 JavaScript 文件...");
    try {
      const jsFileCount = await optimizeAllJsFiles(OUT_DIR, {
        compress: optimizeConfig.js.compress,
        mangle: optimizeConfig.js.mangle,
        ecma: optimizeConfig.js.ecma,
        analyze: verbose || optimizeConfig.js.analyze,
      });

      report.results.js = {
        optimized: true,
        fileCount: jsFileCount,
        errors: [],
      };
      report.summary.successCount++;
      log.info("JavaScript 优化完成");
    } catch (error) {
      const errorMsg = `JavaScript 优化失败: ${error instanceof Error ? error.message : String(error)}`;
      log.error(`${errorMsg}`);

      report.results.js = {
        optimized: false,
        fileCount: 0,
        errors: [errorMsg],
      };
      report.summary.errorCount++;
    }
  } else {
    log.info("跳过 JavaScript 优化");
  }

  if (optimizeConfig.html.enabled) {
    log.info("优化 HTML 文件...");
    try {
      const htmlFileCount = await optimizeAllHtmlFiles(OUT_DIR, {
        minify: optimizeConfig.html.minify,
        analyze: verbose || optimizeConfig.html.analyze,
      });

      report.results.html = {
        optimized: true,
        fileCount: htmlFileCount,
        errors: [],
      };
      report.summary.successCount++;
      log.info("HTML 优化完成");
    } catch (error) {
      const errorMsg = `HTML 优化失败: ${error instanceof Error ? error.message : String(error)}`;
      log.error(`${errorMsg}`);

      report.results.html = {
        optimized: false,
        fileCount: 0,
        errors: [errorMsg],
      };
      report.summary.errorCount++;
    }
  } else {
    log.info("跳过 HTML 优化");
  }

  if (optimizeConfig.general.generateReport) {
    log.info("生成优化报告...");
    try {
      await fs.writeFile(
        optimizeConfig.general.reportPath,
        JSON.stringify(report, null, 2),
        "utf8",
      );
      log.info(`报告已生成到: ${optimizeConfig.general.reportPath}`);
    } catch (error) {
      const errorMsg = `报告生成失败: ${error instanceof Error ? error.message : String(error)}`;
      log.error(`${errorMsg}`);
      report.summary.warnings.push(errorMsg);
    }
  }

  const totalOptimizations = Object.values(report.results).filter((r) => r?.optimized).length;
  log.info(`优化完成！成功: ${totalOptimizations}/${Object.keys(report.results).length}`);

  if (verbose) {
    log.info("\n详细结果:");
    Object.entries(report.results).forEach(([type, result]) => {
      log.info(`   ${type}: ${result?.optimized ? "成功" : "失败"}`);
      if (result?.errors.length > 0) {
        result.errors.forEach((error) => log.info(`      - ${error}`));
      }
    });
  }

  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const verbose = process.argv.includes("--verbose") || process.argv.includes("-v");
  runOptimization(verbose).catch(log.error);
}
