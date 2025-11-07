# 静态博客生成器

## [Seal's Blog](https://sealye09.github.io)

一个简洁、高效的静态博客生成器，专为 GitHub Pages 设计。

## ✨ 特性

- 🚀 **快速构建**：使用 TypeScript 编写，构建速度快
- 📝 **Markdown 支持**：使用 Markdown 编写文章，支持 Front Matter 元数据
- 🎨 **现代设计**：响应式布局，完美适配各种设备
- 🌓 **主题切换**：支持浅色/深色模式
- 💡 **代码高亮**：基于 Highlight.js 的代码语法高亮
- 📂 **归档页面**：按年份自动组织文章
- 🔗 **SEO 友好**：生成的页面结构清晰，利于搜索引擎收录

## 📦 技术栈

- **构建工具**：TypeScript + tsx
- **Markdown 解析**：markdown-it
- **代码高亮**：highlight.js
- **日期处理**：dayjs
- **包管理**：pnpm

## 🚀 快速开始

### 环境要求

- Node.js >= 22.0.0
- pnpm >= 8.0.0

### 安装

```bash
# 克隆项目
git clone https://github.com/sealye09/blog.git
cd blog

# 安装依赖
pnpm install
```

### 配置

编辑 `scripts/config.ts` 文件，配置你的博客信息：

```typescript
export const config: BlogConfig = {
  FROM_DIR: "__blogs", // Markdown 文件目录
  POSTS_DIR: "posts", // 生成的文章目录
  ASSETS_FROM: "assets", // 静态资源目录
  USERNAME: "Your Name", // 显示名称
  GITHUB_USERNAME: "username", // GitHub 用户名
};
```

### 写作

在 `__blogs` 目录下创建 Markdown 文件，使用 Front Matter 设置文章元数据：

```markdown
---
title: 文章标题
date created: 2025-01-01T00:00:00+08:00
date modified: 2025-01-01T00:00:00+08:00
tags: [标签1, 标签2]
summary: 文章摘要
---

# 文章内容

这里是正文...
```

### 构建

```bash
# 构建博客
pnpm build
```

构建完成后，生成的网站将位于 `{GITHUB_USERNAME}.github.io/` 目录下。

### 部署到 GitHub Pages

1. 在 GitHub 创建名为 `{username}.github.io` 的仓库
2. 将生成的文件推送到该仓库：

```bash
cd {GITHUB_USERNAME}.github.io
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/{username}/{username}.github.io.git
git push -u origin main
```

3. 在仓库设置中启用 GitHub Pages（选择 main 分支）
4. 访问 `https://{username}.github.io` 查看你的博客

## 📁 项目结构

```
blog/
├── __blogs/              # Markdown 文章源文件
├── assets/               # 样式文件
│   ├── common.css       # 通用样式
│   ├── index.css        # 首页样式
│   ├── post.css         # 文章页样式
│   ├── archive.css      # 归档页样式
│   └── 404.css          # 404 页样式
├── templates/            # HTML 模板
│   ├── base.html        # 基础模板
│   ├── index.html       # 首页模板
│   ├── post.html        # 文章模板
│   ├── archive.html     # 归档模板
│   └── 404.html         # 404 模板
├── scripts/              # 构建脚本
│   ├── blog.ts          # 主构建脚本
│   └── config.ts        # 配置文件
├── {username}.github.io/ # 生成的网站
└── package.json
```

## 🎨 自定义样式

所有样式文件位于 `assets/` 目录下，你可以根据需要修改：

- `common.css` - 全局样式、导航栏、页脚等
- `index.css` - 首页文章列表样式
- `post.css` - 文章内容页样式
- `archive.css` - 归档页面样式
- `404.css` - 404 页面样式

样式使用 CSS 变量，支持主题定制。

## 📝 脚本命令

```bash
# 构建博客
pnpm build

# 格式化代码
pnpm format
```

## 🔧 开发

本项目使用 [Lefthook](https://github.com/evilmartians/lefthook) 管理 Git Hooks，在提交前自动格式化代码。

## 📄 许可

MIT License

## 🙏 致谢

- [markdown-it](https://github.com/markdown-it/markdown-it) - Markdown 解析器
- [highlight.js](https://highlightjs.org/) - 代码高亮
- [dayjs](https://day.js.org/) - 日期处理库

---

**Happy Blogging! 🎉**
