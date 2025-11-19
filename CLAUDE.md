# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript-based static blog generator that converts Markdown files to a static website for GitHub Pages deployment. It features AI-powered summary generation and modern responsive design.

## Essential Commands

```bash
# Install dependencies (requires pnpm 10.20.0 and Node.js >=22.0.0)
pnpm install

# Build the static site (generates site in {username}.github.io/)
pnpm build

# Deploy to GitHub Pages (force pushes to master branch)
pnpm deploy

# Generate AI summaries for articles
pnpm gen <file1.md> <file2.md>  # Specific files
pnpm gen --staged               # Git staged files
pnpm gen:staged                 # Shortcut for staged files

# Format code with Prettier
pnpm format
```

## Architecture & Key Components

### Core Build Process (`scripts/blog.ts`)
1. **Markdown Processing**: Reads `.md` files from `__blogs/`, parses front matter with gray-matter
2. **Content Generation**: Converts Markdown to HTML using markdown-it with syntax highlighting via highlight.js
3. **Template Rendering**: Uses HTML templates from `templates/` directory
4. **Output Generation**: Creates static site in `{username}.github.io/` directory

### Key Configuration (`scripts/config.ts`)
- `FROM_DIR`: Source Markdown directory (`__blogs/`)
- `POSTS_DIR`: Generated posts directory (`posts/`)
- `USERNAME`: Display name for the blog
- `GITHUB_USERNAME`: Your GitHub username
- `OUT_DIR`: Generated site directory (`{username}.github.io/`)

### Deployment System (`scripts/deploy.ts`)
- Automatically initializes Git repository in output directory
- Configures remote origin for GitHub Pages
- Force pushes to master branch (destructive operation)
- Uses SSH deployment by default

### AI Integration (`scripts/ai.ts`, `scripts/gen.ts`)
- Supports OpenAI and DeepSeek APIs via Vercel AI SDK
- Generates article summaries from content
- Configurable via `.env` file with API keys and model settings

## Development Workflow

1. **Writing Posts**: Create `.md` files in `__blogs/` with required front matter:
   ```yaml
   ---
   title: Article Title
   date created: 2025-01-01T00:00:00+08:00
   date modified: 2025-01-01T00:00:00+08:00
   tags: [tag1, tag2]
   summary: Article summary (optional - can be AI-generated)
   ---
   ```

2. **Building**: Run `pnpm build` to generate the static site
3. **Testing**: Preview generated site in `{username}.github.io/` directory
4. **Deploying**: Run `pnpm deploy` to push to GitHub Pages

## Important Technical Details

- **TypeScript Module System**: Uses ES modules (`"type": "module"` in package.json)
- **Path Handling**: Uses `pathe` library for cross-platform path operations
- **Date Processing**: Uses `dayjs` for date formatting and parsing
- **Git Hooks**: Lefthook automatically formats code on commit via Prettier
- **Obsidian Integration**: Ignores `.obsidian/` directories when processing Markdown files

## Common Modifications

- **Styling**: Edit CSS files in `assets/` directory
- **Templates**: Modify HTML templates in `templates/` directory
- **Configuration**: Update `scripts/config.ts` for blog settings
- **AI Models**: Configure in `.env` file (see `.env.example` for template)

## Critical Files to Understand

1. `scripts/blog.ts` - Main build logic and Markdown processing
2. `scripts/config.ts` - All configuration options
3. `scripts/deploy.ts` - GitHub Pages deployment logic
4. `scripts/ai.ts` - AI API integration functions
5. `templates/base.html` - Base template structure

## Environment Setup

Create `.env` file for AI features:
```bash
OPENAI_API_KEY=your-api-key
OPENAI_API_BASE=https://api.deepseek.com  # Optional, for DeepSeek
OPENAI_MODEL=deepseek-chat                 # Optional, model selection
AI_SUMMARY_MAX_LENGTH=150                  # Optional, summary length
```

## Response with Chinese
plsase respond in Chinese in any case.