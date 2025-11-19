import { execSync } from "node:child_process";

import { log } from "../utils/logger";

export function exec(command: string, cwd?: string): void {
  log.info(`\n执行命令: ${command}`);

  const _cwd = cwd || process.cwd();
  try {
    execSync(command, { cwd: _cwd, stdio: "inherit", encoding: "utf8" });
  } catch (error: any) {
    log.error(`命令执行失败: ${error.message}`);
    throw error;
  }
}

export function build(): void {
  exec("pnpm build", process.cwd());
}

export function formatAll(): void {
  exec("pnpm format", process.cwd());
}

export function gitAddAll(dir: string): void {
  exec("git add -A", dir);
}
