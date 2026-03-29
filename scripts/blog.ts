import process from "node:process";

import dayjs from "dayjs";
import { glob } from "glob";
import matter from "gray-matter";
import hljs from "highlight.js";
import MarkdownIt from "markdown-it";
import mdAnchor from "markdown-it-anchor";
import * as fs from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from "pathe";

import { log } from "../utils/logger.js";
import { config, GITHUB_REPO_URL, OUT_DIR } from "./config.js";

interface PostMeta {
  title: string;
  date: string | null;
  tags: string[];
  summary: string;
}

interface ListEntry {
  slug: string;
  title: string;
  date: string;
  url: string;
  summary: string;
  dateValue: number;
}

function sanitizeSlug(s: string): string {
  const normalized = String(s).trim();
  if (!normalized) {
    return "";
  }

  return normalized
    .toLowerCase()
    .replace(/[\s/\\]+/g, "-")
    .replace(/[^\p{Letter}\p{Number}\-_.]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function readMdFiles(fromDir: string): Promise<string[]> {
  const pattern = join(fromDir, "**/*.md").replaceAll("\\", "/");
  const files = await glob(pattern, {
    nodir: true,
    ignore: ["**/.obsidian/**"],
  });
  return files.sort();
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function copyAssets(fromDir: string, outDir: string): Promise<void> {
  const absFrom = isAbsolute(fromDir) ? fromDir : join(process.cwd(), fromDir);
  const dest = join(outDir, "assets");
  await ensureDir(dest);
  try {
    await fs.cp(absFrom, dest, {
      recursive: true,
      force: true,
      filter: (src: string) => {
        // 忽略 .obsidian 文件夹
        return !src.includes(".obsidian");
      },
    });
  } catch (err: any) {
    if (err?.code === "ENOENT") {
      log.warn(`未找到资源目录：${absFrom}`);
      return;
    }
    throw err;
  }
}

function createMdRenderer(): MarkdownIt {
  const md: MarkdownIt = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight(code: string, lang: string) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return `<pre class="hljs"><code>${
            hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
          }</code></pre>`;
        } catch {
          /* noop */
        }
      }
      return `<pre class=\"hljs\"><code>${md.utils.escapeHtml(code)}</code></pre>`;
    },
  }).use(mdAnchor as any, {
    permalink: (mdAnchor as any).permalink.ariaHidden({}),
  });
  return md;
}

function normalizeMeta(
  meta: any,
  filePath: string,
): PostMeta & { dateCreated?: string; dateModified?: string } {
  const title: string = meta.title || basename(filePath, extname(filePath));
  // Support multiple date field names
  const date: string | null = meta.date || meta["date created"] || meta["date modified"] || null;
  const dateCreated: string | undefined = meta["date created"] || meta.date;
  const dateModified: string | undefined = meta["date modified"];
  const tags: string[] = Array.isArray(meta.tags)
    ? meta.tags
    : meta.tags
      ? String(meta.tags)
          .split(/[\,\s]+/)
          .filter(Boolean)
      : [];
  const summary: string = meta.summary || meta.description || "";
  return { title, date, tags, summary, dateCreated, dateModified };
}

function renderTemplate(tpl: string, vars: Record<string, unknown>): string {
  return tpl.replace(/{{\s*([\w.]+)\s*}}/g, (_: string, key: string) => {
    const val = key.split(".").reduce<any>((o, k) => (o ? o[k] : ""), vars as any);
    return val == null ? "" : String(val);
  });
}

function buildCssLinks(basePath: string, pageType: string): string {
  const commonCss = `<link rel="stylesheet" href="${basePath}/assets/common.css" />`;
  const pageCss = `<link rel="stylesheet" href="${basePath}/assets/${pageType}.css" />`;
  return `${commonCss}\n    ${pageCss}`;
}

function buildBasePath(directoryDepth: number): string {
  const totalLevels = Math.max(directoryDepth + 1, 1);
  return Array(totalLevels).fill("..").join("/");
}

function buildArchiveGroups(entries: ListEntry[]): string {
  const byYear = new Map<string, ListEntry[]>();

  for (const entry of entries) {
    if (!entry.date) continue;
    const d = new Date(entry.date);
    if (Number.isNaN(d.getTime())) continue;

    const year = String(d.getFullYear());

    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(entry);
  }

  const years = Array.from(byYear.keys()).sort((a, b) => Number(b) - Number(a));
  let html = "";

  for (const year of years) {
    const posts = byYear.get(year)!;
    // Sort posts by date (newest first)
    posts.sort((a, b) => b.dateValue - a.dateValue);

    html += `<div class="archive-year">\n`;
    html += `  <h2 class="archive-year__title">${year} <span class="archive-year__count">(${posts.length})</span></h2>\n`;
    html += `  <div class="archive-list">\n`;

    for (const post of posts) {
      // Format date using dayjs
      const formattedDate = dayjs(post.date).format("YYYY-MM-DD");

      html += `    <a href="${post.url}" class="archive-item">\n`;
      html += `      <span class="archive-item__date">${formattedDate}</span>\n`;
      html += `      <div class="archive-item__title">${post.title}</div>\n`;
      html += `    </a>\n`;
    }

    html += `  </div>\n`;
    html += `</div>\n`;
  }

  return html;
}

function buildReadmeContent(entries: ListEntry[]): string {
  const siteUrl = `https://${config.GITHUB_USERNAME}.github.io`;

  let readme = `# ${config.USERNAME}'s Blog\n\n`;
  readme += `🌐 **站点地址**: [${siteUrl}](${siteUrl})\n\n`;
  readme += `## 📝 文章列表\n\n`;

  if (entries.length === 0) {
    readme += `暂无文章\n\n`;
  } else {
    // Group by year
    const byYear = new Map<string, ListEntry[]>();
    for (const entry of entries) {
      if (!entry.date) continue;
      const d = new Date(entry.date);
      if (Number.isNaN(d.getTime())) continue;
      const year = String(d.getFullYear());
      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year)!.push(entry);
    }

    const years = Array.from(byYear.keys()).sort((a, b) => Number(b) - Number(a));

    for (const year of years) {
      const posts = byYear.get(year)!;
      posts.sort((a, b) => b.dateValue - a.dateValue);

      readme += `### ${year}\n\n`;
      for (const post of posts) {
        const formattedDate = dayjs(post.date).format("YYYY-MM-DD");
        const postUrl = `${siteUrl}/${post.url.replace("./", "")}`;
        readme += `- [${post.title}](${postUrl}) - ${formattedDate}\n`;
      }
      readme += `\n`;
    }
  }

  readme += `---\n\n`;
  readme += `📦 本站由 [静态博客生成器](${GITHUB_REPO_URL}) 构建\n`;

  return readme;
}

/**
 * markdown-it 插件：将 .md 内部链接重写为构建后的 .html 路径
 */
function createLinkRewritePlugin(
  slugMap: Map<string, string>,
  sourceFile: string,
  currentOutDir: string,
): (md: MarkdownIt) => void {
  return (md) => {
    md.renderer.rules.link_open = (tokens, idx, options, _env, self) => {
      const href = tokens[idx].attrGet("href");
      if (href) {
        const hrefStr = String(href);
        if (hrefStr.endsWith(".md") || hrefStr.includes(".md#")) {
          try {
            const decoded = decodeURIComponent(hrefStr);
            const hashIdx = decoded.indexOf(".md#");
            const hash = hashIdx >= 0 ? decoded.slice(hashIdx + 3) : "";
            const mdPath = hashIdx >= 0 ? decoded.slice(0, hashIdx + 3) : decoded;
            const sourceDir = dirname(sourceFile);
            const resolved = resolve(sourceDir, mdPath);
            const targetOut = slugMap.get(resolved);
            if (targetOut) {
              let relPath = relative(currentOutDir, targetOut);
              if (!relPath.startsWith(".")) {
                relPath = "./" + relPath;
              }
              tokens[idx].attrSet("href", relPath + hash);
            }
          } catch {
            /* 解析失败则保留原链接 */
          }
        }
      }
      return self.renderToken(tokens, idx, options);
    };
  };
}

interface FileBuildInfo {
  file: string;
  raw: string;
  content: string;
  meta: PostMeta & { dateCreated?: string; dateModified?: string };
  baseSlug: string;
  relativeSlugPath: string;
  postDir: string;
  outFile: string;
  basePath: string;
  dateValue: number;
  year: string;
  month: string;
}

async function main(): Promise<void> {
  const outDir = OUT_DIR;

  const fromDir = config.FROM_DIR;
  const postsDir = config.POSTS_DIR;
  const assetsFrom = config.ASSETS_FROM;

  const files = await readMdFiles(fromDir);

  // Load templates
  const tplDir = join(process.cwd(), "templates");
  const baseTpl = await fs.readFile(join(tplDir, "base.html"), "utf8");
  const postTpl = await fs.readFile(join(tplDir, "post.html"), "utf8");
  const indexTpl = await fs.readFile(join(tplDir, "index.html"), "utf8");

  const postsOutDir = join(outDir, postsDir);
  await ensureDir(postsOutDir);
  await copyAssets(assetsFrom, outDir);

  const slugMap = new Map<string, string>(); // 源文件绝对路径 → 输出 HTML 绝对路径

  // ---- 第一趟：收集元数据，构建 slug 映射 ----
  const buildInfos: FileBuildInfo[] = [];

  for (const file of files) {
    const raw = await fs.readFile(file, "utf8");
    const { data, content } = matter(raw);
    const meta = normalizeMeta(data, file);
    const slugSource = (data as any).slug || meta.title || basename(file, extname(file));
    const fallbackSlug = sanitizeSlug(basename(file, extname(file))) || "post";
    const baseSlug = sanitizeSlug(slugSource) || fallbackSlug;

    let dateValue = 0;
    let year = "";
    let month = "";

    if (meta.date) {
      const parsedDate = new Date(meta.date);
      if (!Number.isNaN(parsedDate.getTime())) {
        dateValue = parsedDate.getTime();
        year = String(parsedDate.getFullYear());
        month = String(parsedDate.getMonth() + 1).padStart(2, "0");
      }
    }

    if (!dateValue) {
      const stat = await fs.stat(file);
      dateValue = stat.mtimeMs;
      const fallbackDate = new Date(stat.mtimeMs);
      year = String(fallbackDate.getFullYear());
      month = String(fallbackDate.getMonth() + 1).padStart(2, "0");
    }

    const slugSegments = [year, month, baseSlug].filter(Boolean);
    const directoriesDepth = Math.max(slugSegments.length - 1, 0);
    const relativeSlugPath = slugSegments.join("/");

    const postDir =
      slugSegments.length > 1 ? join(postsOutDir, ...slugSegments.slice(0, -1)) : postsOutDir;
    await ensureDir(postDir);

    const outFile = join(postDir, `${baseSlug}.html`);
    const basePath = buildBasePath(directoriesDepth);

    const resolvedSource = resolve(process.cwd(), file);
    slugMap.set(resolvedSource, outFile);

    buildInfos.push({
      file,
      raw,
      content,
      meta,
      baseSlug,
      relativeSlugPath,
      postDir,
      outFile,
      basePath,
      dateValue,
      year,
      month,
    });
  }

  // ---- 第二趟：渲染内容（含链接重写）并写入文件 ----
  const entries: ListEntry[] = [];

  for (const info of buildInfos) {
    const md = createMdRenderer();
    md.use(createLinkRewritePlugin(slugMap, resolve(process.cwd(), info.file), info.postDir));
    const html = md.render(info.content);

    const { meta, basePath, relativeSlugPath, outFile, year, month } = info;

    let dateHtml = "";
    if (
      meta.title ||
      (meta as any).dateCreated ||
      (meta as any).dateModified ||
      meta.tags.length > 0 ||
      meta.summary
    ) {
      dateHtml = '<div class="post-meta">';
      if (meta.title) {
        dateHtml += `<h1 class=\"post-title\">${meta.title}</h1>`;
      }
      if (meta.tags.length > 0) {
        const tagsHtml = meta.tags.map((tag) => `<span class="post-tag">${tag}</span>`).join("");
        dateHtml += `<div class=\"post-meta__item post-meta__tags\"><span class=\"post-meta__label\">标签：</span><div class=\"post-tags\">${tagsHtml}</div></div>`;
      }
      if (meta.summary) {
        dateHtml += `<div class=\"post-meta__item post-meta__summary\"><span class=\"post-meta__label\">摘要：</span><span class=\"post-summary-text\">${meta.summary}</span></div>`;
      }
      if ((meta as any).dateCreated) {
        dateHtml += `<div class=\"post-meta__item\"><span class=\"post-meta__label\">创建日期：</span><time>${dayjs((meta as any).dateCreated).format("YYYY-MM-DD")}</time></div>`;
      }
      if ((meta as any).dateModified) {
        dateHtml += `<div class=\"post-meta__item\"><span class=\"post-meta__label\">修改日期：</span><time>${dayjs((meta as any).dateModified).format("YYYY-MM-DD")}</time></div>`;
      }
      dateHtml += "</div>";
    }

    const postHtml = renderTemplate(postTpl, {
      title: meta.title,
      dateHtml,
      content: html,
      metadata: JSON.stringify({ ...meta, slug: relativeSlugPath, year, month }, null, 2),
    });

    const fullHtml = renderTemplate(baseTpl, {
      pageTitle: meta.title,
      pageDescription: meta.summary || `${meta.title} - ${config.USERNAME}'s Blog`,
      pageKeywords: meta.tags?.join(", ") || "技术,博客,编程",
      siteAuthor: config.USERNAME,
      baiduVerification: process.env.BAIDU_VERIFICATION || "",
      ogType: "article",
      pageUrl: `https://${config.GITHUB_USERNAME}.github.io/${postsDir}/${relativeSlugPath}.html`,
      twitterCreator: `@${config.GITHUB_USERNAME}`,
      siteDescription: `${config.USERNAME}'s Blog - 分享技术见解和编程经验`,
      siteUrl: `https://${config.GITHUB_USERNAME}.github.io`,
      basePath,
      content: postHtml,
      siteTitle: `${config.USERNAME}'s Blog`,
      githubUsername: config.GITHUB_USERNAME,
      cssLinks: buildCssLinks(basePath, "post"),
    });
    await fs.writeFile(outFile, fullHtml, "utf8");

    entries.push({
      slug: relativeSlugPath,
      title: meta.title,
      date: meta.date || "",
      url: `./${postsDir}/${relativeSlugPath}.html`,
      summary: meta.summary || "",
      dateValue: info.dateValue,
    });
  }

  entries.sort((a, b) => b.dateValue - a.dateValue);

  const itemsHtml = entries
    .map(
      (e) => `
    <a href="${e.url}" class="post-item">
      <h2 class="post-title">${e.title}</h2>
      ${e.date ? `<time class="post-date">${dayjs(e.date).format("YYYY-MM-DD")}</time>` : ""}
      ${e.summary ? `<p class="post-summary">${e.summary}</p>` : ""}
      <span class="post-readmore">阅读全文 →</span>
    </a>
  `,
    )
    .join("\n");

  const indexHtml = renderTemplate(indexTpl, { items: itemsHtml });
  const fullIndexHtml = renderTemplate(baseTpl, {
    pageTitle: `${config.USERNAME} - 博客首页`,
    pageDescription: `${config.USERNAME}的个人技术博客，分享编程经验和见解`,
    pageKeywords: "技术,博客,编程,前端,后端",
    siteAuthor: config.USERNAME,
    baiduVerification: process.env.BAIDU_VERIFICATION || "",
    ogType: "website",
    pageUrl: `https://${config.GITHUB_USERNAME}.github.io`,
    twitterCreator: `@${config.GITHUB_USERNAME}`,
    siteDescription: `${config.USERNAME}'s Blog - 分享技术见解和编程经验`,
    siteUrl: `https://${config.GITHUB_USERNAME}.github.io`,
    basePath: ".",
    content: indexHtml,
    siteTitle: `${config.USERNAME}'s Blog`,
    githubUsername: config.GITHUB_USERNAME,
    cssLinks: buildCssLinks(".", "index"),
  });

  await fs.writeFile(join(outDir, "index.html"), fullIndexHtml, "utf8");

  // Generate archive page
  const archiveTpl = await fs.readFile(join(tplDir, "archive.html"), "utf8");
  const archiveGroups = buildArchiveGroups(entries);
  const archiveHtml = renderTemplate(archiveTpl, { groups: archiveGroups });
  const fullArchiveHtml = renderTemplate(baseTpl, {
    pageTitle: `归档 - ${config.USERNAME}`,
    pageDescription: `${config.USERNAME}的博客归档页面，按时间顺序查看所有文章`,
    pageKeywords: "归档,博客,文章列表",
    siteAuthor: config.USERNAME,
    baiduVerification: process.env.BAIDU_VERIFICATION || "",
    ogType: "website",
    pageUrl: `https://${config.GITHUB_USERNAME}.github.io/archive.html`,
    twitterCreator: `@${config.GITHUB_USERNAME}`,
    siteDescription: `${config.USERNAME}'s Blog - 分享技术见解和编程经验`,
    siteUrl: `https://${config.GITHUB_USERNAME}.github.io`,
    basePath: ".",
    content: archiveHtml,
    siteTitle: `${config.USERNAME}'s Blog`,
    githubUsername: config.GITHUB_USERNAME,
    cssLinks: buildCssLinks(".", "archive"),
  });
  await fs.writeFile(join(outDir, "archive.html"), fullArchiveHtml, "utf8");

  // Generate 404 page
  const error404Tpl = await fs.readFile(join(tplDir, "404.html"), "utf8");
  const error404Html = renderTemplate(error404Tpl, { basePath: "." });
  const fullError404Html = renderTemplate(baseTpl, {
    pageTitle: `404 - 页面未找到`,
    pageDescription: "抱歉，您访问的页面不存在",
    pageKeywords: "404,页面未找到,错误页面",
    siteAuthor: config.USERNAME,
    baiduVerification: process.env.BAIDU_VERIFICATION || "",
    ogType: "website",
    pageUrl: `https://${config.GITHUB_USERNAME}.github.io/404.html`,
    twitterCreator: `@${config.GITHUB_USERNAME}`,
    siteDescription: `${config.USERNAME}'s Blog - 分享技术见解和编程经验`,
    siteUrl: `https://${config.GITHUB_USERNAME}.github.io`,
    basePath: ".",
    content: error404Html,
    siteTitle: `${config.USERNAME}'s Blog`,
    githubUsername: config.GITHUB_USERNAME,
    cssLinks: buildCssLinks(".", "404"),
  });
  await fs.writeFile(join(outDir, "404.html"), fullError404Html, "utf8");

  // Generate README.md for GitHub Pages
  const readmeContent = buildReadmeContent(entries);
  await fs.writeFile(join(outDir, "README.md"), readmeContent, "utf8");

  log.info("页面构建完成。");

  // 优化构建产物
  log.info("开始优化构建产物...");
  try {
    const { runOptimization } = await import("./optimize-build.js");
    await runOptimization(false); // 不使用详细输出，避免干扰构建过程
    log.info("构建产物优化完成。");
  } catch (error) {
    log.warn("构建产物优化失败，但构建已完成", error);
  }

  // formatAll();
  // console.log("代码格式化完成。");
}

main().catch((err) => {
  log.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
