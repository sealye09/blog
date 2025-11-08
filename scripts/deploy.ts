import { execSync } from "node:child_process";
import * as fs from "node:fs";
import { join } from "pathe";
import { config, deployConfig, OUT_DIR } from "./config.js";
import { build, exec, gitAddAll } from "./utils.js";

function checkGitInstalled(): void {
  try {
    execSync("git --version", { stdio: "pipe" });
  } catch {
    throw new Error("Git 未安装或未添加到 PATH 环境变量中");
  }
}

function checkAndClearOutputDir(outDir: string): void {
  if (!fs.existsSync(outDir)) {
    throw new Error(`输出目录不存在: ${outDir}\n请先运行 pnpm build 构建博客`);
  } else {
    fs.readdirSync(outDir).forEach((file) => {
      if (file !== ".git") {
        const filePath = join(outDir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
      }
    });
  }
}

function isGitRepository(dir: string): boolean {
  return fs.existsSync(join(dir, ".git"));
}

function deploy(): void {
  console.log("🚀 开始部署博客...\n");

  // 检查 Git 是否安装
  checkGitInstalled();

  const outDir = join(process.cwd(), OUT_DIR);
  checkAndClearOutputDir(outDir);

  // 检查是否为 Git 仓库，如果不是则初始化
  const isGitInitialized = isGitRepository(outDir);
  if (!isGitInitialized) {
    console.log("📦 初始化 Git 仓库...");
    exec("git init", outDir);
    exec(`git remote add origin ${deployConfig.targetRepo}`, outDir);
  } else {
    console.log("✅ Git 仓库已存在");
    // 检查并更新 origin
    try {
      const currentOrigin = execSync("git remote get-url origin", {
        cwd: outDir,
        encoding: "utf8",
      }).trim();

      if (currentOrigin !== deployConfig.targetRepo) {
        console.log(`🔄 更新远程仓库地址...`);
        exec(`git remote set-url origin ${deployConfig.targetRepo}`, outDir);
      }
    } catch {
      console.log("📌 添加远程仓库...");
      exec(`git remote add origin ${deployConfig.targetRepo}`, outDir);
    }
  }

  // 切换到目标分支
  try {
    exec(`git checkout -B ${deployConfig.branch}`, outDir);
  } catch {
    exec(`git checkout -b ${deployConfig.branch}`, outDir);
  }

  // 执行构建和格式化
  build();

  // 添加所有文件
  console.log("\n📝 添加文件到暂存区...");
  gitAddAll(outDir);

  // 检查是否有改动
  let hasChanges = false;
  try {
    const status = execSync("git status --porcelain", {
      cwd: outDir,
      encoding: "utf8",
    });

    hasChanges = status.trim() !== "";

    if (!hasChanges) {
      console.log("\n✨ 没有文件改动");
      // 检查是否有未推送的提交
      try {
        const unpushedCommits = execSync(`git log origin/${deployConfig.branch}..HEAD --oneline`, {
          cwd: outDir,
          encoding: "utf8",
        }).trim();

        if (!unpushedCommits) {
          console.log("✨ 也没有未推送的提交，跳过部署");
          return;
        }

        console.log(`📦 检测到 ${unpushedCommits.split("\n").length} 个未推送的提交`);
      } catch {
        // 如果远程分支不存在，继续执行推送
        console.log("📦 远程分支不存在，将创建新分支");
      }
    }
  } catch (error: any) {
    console.error(`\n❌ 检查文件改动失败: ${error.message}`);
    process.exit(1);
  }

  // 如果有改动，则提交
  if (hasChanges) {
    console.log("\n💾 提交更改...");
    exec(`git commit -m "${deployConfig.commitMessage}"`, outDir);
  }

  if (deployConfig.forcesPush) {
    // 强制推送
    console.log("\n🚢 强制推送到远程仓库...");
    console.log(`目标仓库: ${deployConfig.targetRepo}`);
    console.log(`分支: ${deployConfig.branch}`);
    console.log(`⚠️  即将执行强制推送（会覆盖远程仓库）...`);

    exec(`git push -f origin ${deployConfig.branch}`, outDir);
  } else {
    // 普通推送
    console.log("\n🚢 推送到远程仓库...");
    console.log(`目标仓库: ${deployConfig.targetRepo}`);
    console.log(`分支: ${deployConfig.branch}`);
    console.log(`⚠️  即将执行普通推送（会保留远程仓库历史）...`);

    exec(`git push origin ${deployConfig.branch}`, outDir);
  }
  console.log("\n✅ 部署完成！");
  console.log(`🌐 访问地址: https://${config.GITHUB_USERNAME}.github.io`);
}

// 主函数
try {
  deploy();
} catch (error: any) {
  console.error(`\n❌ 部署失败: ${error.message}`);
  process.exit(1);
}
