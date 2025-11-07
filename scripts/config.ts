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
