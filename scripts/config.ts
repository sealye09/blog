import { ECMA } from "terser";

export interface BlogConfig {
  FROM_DIR: string;
  POSTS_DIR: string;
  ASSETS_FROM: string;
  USERNAME: string;
  GITHUB_USERNAME: string;
  GITHUB_REPO_NAME: string;
}

export const config: BlogConfig = {
  FROM_DIR: "__blogs",
  POSTS_DIR: "posts",
  ASSETS_FROM: "assets",
  USERNAME: "Seal",
  GITHUB_USERNAME: "sealye09", // 请将此处替换为您的 GitHub 用户名，留空则不显示 GitHub 图标
  GITHUB_REPO_NAME: "blog",
};
export const OUT_DIR = `${config.GITHUB_USERNAME}.github.io`;
export const GITHUB_REPO_URL = `https://github.com/${config.GITHUB_USERNAME}/${config.GITHUB_REPO_NAME}`;

// 产物优化配置
export interface OptimizeConfig {
  css: {
    enabled: boolean;
    minify: boolean;
    removeUnused: boolean;
    target: "browsers" | "node" | "custom";
    analyze: boolean;
  };
  js: {
    enabled: boolean;
    compress: boolean;
    mangle: boolean;
    removeConsole: boolean;
    removeDebugger: boolean;
    ecma: ECMA;
    analyze: boolean;
  };
  html: {
    enabled: boolean;
    minify: boolean;
    removeComments: boolean;
    collapseWhitespace: boolean;
    removeAttributeQuotes: boolean;
    removeEmptyAttributes: boolean;
    removeOptionalTags: boolean;
    analyze: boolean;
  };
  general: {
    generateReport: boolean;
    reportPath: string;
    verboseOutput: boolean;
  };
}

export const optimizeConfig: OptimizeConfig = {
  css: {
    enabled: true,
    minify: true,
    removeUnused: true,
    target: "browsers",
    analyze: false,
  },
  js: {
    enabled: true,
    compress: true,
    mangle: true,
    removeConsole: true,
    removeDebugger: true,
    ecma: 2015,
    analyze: false,
  },
  html: {
    enabled: true,
    minify: true,
    removeComments: true,
    collapseWhitespace: true,
    removeAttributeQuotes: true,
    removeEmptyAttributes: true,
    removeOptionalTags: true,
    analyze: false,
  },
  general: {
    generateReport: false,
    reportPath: "./optimization-report.json",
    verboseOutput: false,
  },
};

/**
 * 部署配置示例
 *
 * 如果你需要自定义部署配置，可以：
 * 1. 复制此文件为 deploy.config.ts
 * 2. 修改配置项
 * 3. 在 deploy.ts 中导入并使用
 */

export interface DeployConfig {
  // 目标仓库地址
  // 支持 HTTPS 和 SSH 格式
  // HTTPS: https://github.com/username/repo.git
  // SSH: git@github.com:username/repo.git
  targetRepo: string;

  // 推送到的分支名称
  branch: "main" | "master";

  // 提交信息模板
  // 可以使用变量：{date}, {time}, {datetime}
  commitMessage: string;

  // 是否启用强制推送
  // true: 使用 git push -f（覆盖远程）
  // false: 使用 git push（保留远程历史）
  forcesPush: boolean;
}

// 示例配置 1：部署到 GitHub Pages（username.github.io）
// export const githubPagesConfig: DeployConfig = {
//   targetRepo: "https://github.com/username/username.github.io.git",
//   branch: "main",
//   commitMessage: "Deploy: {datetime}",
//   forcesPush: true,
// };

// 示例配置 2：部署到自定义仓库
// export const customRepoConfig: DeployConfig = {
//   targetRepo: "https://github.com/username/my-blog.git",
//   branch: "gh-pages",
//   commitMessage: "🚀 Auto deploy at {datetime}",
//   forcesPush: true,
// };

// 示例配置 3：使用 SSH 方式部署
// export const sshConfig: DeployConfig = {
//   targetRepo: "git@github.com:username/username.github.io.git",
//   branch: "main",
//   commitMessage: "Deploy: {datetime}",
//   forcesPush: true,
// };

export const deployConfig: DeployConfig = {
  targetRepo: `git@github.com:${config.GITHUB_USERNAME}/${config.GITHUB_USERNAME}.github.io.git`,
  branch: "master",
  commitMessage: `Deploy: ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
  forcesPush: true,
};
