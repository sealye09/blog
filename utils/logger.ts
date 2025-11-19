/**
 * 构建工具日志系统
 * 为构建脚本提供统一的日志输出和格式化
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  context?: any;
}

export interface LoggerConfig {
  level: LogLevel;
  enableColors: boolean;
  enableTimestamp: boolean;
  enableFileLog: boolean;
  logFile?: string;
  prefix?: string;
}

const DEFAULT_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  enableColors: true,
  enableTimestamp: true,
  enableFileLog: false,
  prefix: "Blog",
};

const LEVEL_CONFIG = {
  [LogLevel.DEBUG]: {
    name: "DEBUG",
    color: "\x1b[90m", // Gray
    icon: "🔍",
    consoleMethod: "log" as const,
  },
  [LogLevel.INFO]: {
    name: "INFO",
    color: "\x1b[36m", // Cyan
    icon: "ℹ️",
    consoleMethod: "log" as const,
  },
  [LogLevel.WARN]: {
    name: "WARN",
    color: "\x1b[33m", // Yellow
    icon: "⚠️",
    consoleMethod: "warn" as const,
  },
  [LogLevel.ERROR]: {
    name: "ERROR",
    color: "\x1b[31m", // Red
    icon: "❌",
    consoleMethod: "error" as const,
  },
  [LogLevel.FATAL]: {
    name: "FATAL",
    color: "\x1b[91m", // Bright Red
    icon: "💀",
    consoleMethod: "error" as const,
  },
};

const RESET_COLOR = "\x1b[0m";

/**
 * 日志管理器类
 */
export class Logger {
  private config: LoggerConfig;
  private history: LogEntry[] = [];
  private maxHistory: number = 1000;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // 根据 NODE_ENV 设置默认日志级别
    if (process.env.NODE_ENV === "production") {
      this.config.level = LogLevel.WARN;
    } else if (process.env.NODE_ENV === "development") {
      this.config.level = LogLevel.DEBUG;
    }

    // 根据 CI 环境设置
    if (process.env.CI) {
      this.config.enableColors = false;
      this.config.enableTimestamp = true;
    }
  }

  /**
   * 检查是否应该输出日志
   */
  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  /**
   * 格式化时间戳
   */
  private formatTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const milliseconds = String(now.getMilliseconds()).padStart(3, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  /**
   * 格式化消息
   */
  private formatMessage(level: LogLevel, message: string, context?: any): string {
    const levelConfig = LEVEL_CONFIG[level];
    const parts: string[] = [];

    // 前缀
    if (this.config.prefix) {
      parts.push(`[${this.config.prefix}]`);
    }

    // 时间戳
    if (this.config.enableTimestamp) {
      parts.push(`[${this.formatTimestamp()}]`);
    }

    // 级别和图标
    if (this.config.enableColors) {
      parts.push(`${levelConfig.color}${levelConfig.icon} ${levelConfig.name}${RESET_COLOR}`);
    } else {
      parts.push(`${levelConfig.icon} ${levelConfig.name}`);
    }

    // 消息
    parts.push(message);

    return parts.join(" ");
  }

  /**
   * 记录日志到历史
   */
  private recordLog(level: LogLevel, message: string, context?: any): void {
    const levelConfig = LEVEL_CONFIG[level];
    const entry: LogEntry = {
      level: levelConfig.name,
      message,
      timestamp: this.formatTimestamp(),
      context,
    };

    this.history.push(entry);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  /**
   * 输出日志到控制台
   */
  private outputLog(level: LogLevel, message: string, context?: any): void {
    if (!this.shouldLog(level)) return;

    const levelConfig = LEVEL_CONFIG[level];
    const formattedMessage = this.formatMessage(level, message, context);

    // 记录到历史
    this.recordLog(level, message, context);

    // 输出到控制台
    if (context) {
      console[levelConfig.consoleMethod](formattedMessage, context);
    } else {
      console[levelConfig.consoleMethod](formattedMessage);
    }
  }

  /**
   * 调试日志
   */
  debug(message: string, context?: any): void {
    this.outputLog(LogLevel.DEBUG, message, context);
  }

  /**
   * 信息日志
   */
  info(message: string, context?: any): void {
    this.outputLog(LogLevel.INFO, message, context);
  }

  /**
   * 警告日志
   */
  warn(message: string, context?: any): void {
    this.outputLog(LogLevel.WARN, message, context);
  }

  /**
   * 错误日志
   */
  error(message: string, context?: any): void {
    this.outputLog(LogLevel.ERROR, message, context);
  }

  /**
   * 致命错误日志
   */
  fatal(message: string, context?: any): void {
    this.outputLog(LogLevel.FATAL, message, context);
  }

  /**
   * 分组日志开始
   */
  group(label: string, collapsed = false): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const method = collapsed ? "groupCollapsed" : "group";
    const formattedLabel = this.formatMessage(LogLevel.INFO, label);

    console[method](formattedLabel);
  }

  /**
   * 分组日志结束
   */
  groupEnd(): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    console.groupEnd();
  }

  /**
   * 表格输出
   */
  table(data: any, columns?: string[]): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    console.table(data, columns);
  }

  /**
   * 性能测量开始
   */
  time(label: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    console.time(`${this.config.prefix} ${label}`);
  }

  /**
   * 性能测量结束
   */
  timeEnd(label: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    console.timeEnd(`${this.config.prefix} ${label}`);
  }

  /**
   * 计数器
   */
  count(label: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    console.count(`${this.config.prefix} ${label}`);
  }

  /**
   * 清空控制台
   */
  clear(): void {
    console.clear();
  }

  /**
   * 创建子日志器
   */
  child(prefix: string, configOverrides: Partial<LoggerConfig> = {}): Logger {
    const childConfig = {
      ...this.config,
      ...configOverrides,
      prefix: `${this.config.prefix}:${prefix}`,
    };
    return new Logger(childConfig);
  }

  /**
   * 获取日志历史
   */
  getHistory(): LogEntry[] {
    return [...this.history];
  }

  /**
   * 清空日志历史
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * 导出日志
   */
  export(): string {
    const exportData = {
      config: this.config,
      history: this.history,
      exportTime: new Date().toISOString(),
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * 获取当前配置
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// 创建默认日志实例
export const logger = new Logger();

// 创建专用日志实例
export const buildLogger = logger.child("BUILD");
export const optimizeLogger = logger.child("OPTIMIZE");
export const deployLogger = logger.child("DEPLOY");
export const aiLogger = logger.child("AI");

// 导出便捷方法
export const log = {
  debug: (message: string, context?: any) => logger.debug(message, context),
  info: (message: string, context?: any) => logger.info(message, context),
  warn: (message: string, context?: any) => logger.warn(message, context),
  error: (message: string, context?: any) => logger.error(message, context),
  fatal: (message: string, context?: any) => logger.fatal(message, context),
  group: (label: string, collapsed?: boolean) => logger.group(label, collapsed),
  groupEnd: () => logger.groupEnd(),
  table: (data: any, columns?: string[]) => logger.table(data, columns),
  time: (label: string) => logger.time(label),
  timeEnd: (label: string) => logger.timeEnd(label),
  count: (label: string) => logger.count(label),
  clear: () => logger.clear(),
};

// 默认导出
export default logger;
