/**
 * 主题切换功能
 * 支持明暗主题切换，自动保存用户偏好
 */
(function (global) {
  "use strict";

  /**
   * 主题管理器
   */
  class ThemeManager {
    constructor() {
      this.storageKey = "blog-theme";
      this.darkClass = "dark";
      this.lightClass = "light";
      this.currentTheme = "light";
      this.observers = [];

      this.init();
    }

    /**
     * 初始化主题
     */
    init() {
      try {
        console.info("ThemeManager 初始化开始");

        // 获取存储的主题或使用系统偏好
        const storedTheme = this.getStoredTheme();
        const systemTheme = this.getSystemTheme();
        this.currentTheme = storedTheme || systemTheme;

        // 应用主题
        this.applyTheme(this.currentTheme);

        // 监听系统主题变化
        this.watchSystemTheme();

        // 绑定主题切换按钮
        this.bindThemeToggleButtons();

        console.info("ThemeManager 初始化完成", { currentTheme: this.currentTheme });
      } catch (error) {
        console.warn("ThemeManager 初始化失败", error);
      }
    }

    /**
     * 获取存储的主题
     */
    getStoredTheme() {
      try {
        return localStorage.getItem(this.storageKey);
      } catch (error) {
        console.warn("无法读取主题设置", error);
        return null;
      }
    }

    /**
     * 获取系统主题偏好
     */
    getSystemTheme() {
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
      return "light";
    }

    /**
     * 应用主题
     */
    applyTheme(theme) {
      try {
        const htmlElement = document.documentElement;
        const oldTheme = this.currentTheme;

        // 移除旧主题类
        htmlElement.classList.remove(oldTheme);

        // 添加新主题类
        htmlElement.setAttribute("data-theme", theme);

        // 更新当前主题
        this.currentTheme = theme;

        // 保存到本地存储
        this.saveTheme(theme);

        // 更新按钮状态
        this.updateToggleButtonState(theme);

        // 通知观察者
        this.notifyObservers(theme, oldTheme);

        console.info("主题已应用", { theme, oldTheme });
      } catch (error) {
        console.warn("应用主题失败", error);
      }
    }

    /**
     * 保存主题到本地存储
     */
    saveTheme(theme) {
      try {
        localStorage.setItem(this.storageKey, theme);
        console.info("主题已保存", { theme });
      } catch (error) {
        console.warn("无法保存主题设置", error);
      }
    }

    /**
     * 切换主题
     */
    toggleTheme() {
      const newTheme = this.currentTheme === "dark" ? "light" : "dark";
      this.applyTheme(newTheme);
      console.info("主题已切换", { oldTheme: this.currentTheme, newTheme });

      return newTheme;
    }

    /**
     * 设置主题
     */
    setTheme(theme) {
      if (theme !== "dark" && theme !== "light") {
        console.warn("无效的主题值", { theme });
        return false;
      }

      this.applyTheme(theme);
      return true;
    }

    /**
     * 监听系统主题变化
     */
    watchSystemTheme() {
      if (!window.matchMedia) return;

      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

      const handleThemeChange = (e) => {
        // 只有在用户没有手动设置主题时才跟随系统主题
        if (!this.getStoredTheme()) {
          const systemTheme = e.matches ? "dark" : "light";
          this.applyTheme(systemTheme);
          console.info("系统主题变化，已自动切换", { systemTheme });
        }
      };

      // 监听主题变化
      if (mediaQuery.addListener) {
        mediaQuery.addListener(handleThemeChange);
      } else if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", handleThemeChange);
      }
    }

    /**
     * 绑定主题切换按钮
     */
    bindThemeToggleButtons() {
      const buttons = [
        document.getElementById("theme-toggle"),
        document.getElementById("mobile-theme-toggle"),
      ];

      buttons.forEach((button) => {
        if (!button) {
          console.info("主题切换按钮未找到");
          return;
        }

        // 移除现有的事件监听器
        button.removeEventListener("click", this.handleThemeToggle);

        // 添加新的事件监听器
        button.addEventListener("click", this.handleThemeToggle.bind(this));

        // 初始化按钮状态
        this.updateToggleButtonState(this.currentTheme, button);

        console.info("主题切换按钮已绑定", { buttonId: button.id });
      });
    }

    /**
     * 处理主题切换点击事件
     */
    handleThemeToggle(event) {
      event.preventDefault();
      this.toggleTheme();
    }

    /**
     * 更新切换按钮状态
     */
    updateToggleButtonState(theme, button = null) {
      const buttons = button
        ? [button]
        : [document.getElementById("theme-toggle"), document.getElementById("mobile-theme-toggle")];

      buttons.forEach((btn) => {
        if (!btn) return;

        const sunIcon = btn.querySelector(".icon-sun");
        const moonIcon = btn.querySelector(".icon-moon");

        if (sunIcon && moonIcon) {
          if (theme === "dark") {
            sunIcon.style.display = "none";
            moonIcon.style.display = "block";
          } else {
            sunIcon.style.display = "block";
            moonIcon.style.display = "none";
          }
        }

        // 更新 aria-label
        btn.setAttribute("aria-label", theme === "dark" ? "切换到亮色主题" : "切换到暗色主题");
      });
    }

    /**
     * 添加主题变化观察者
     */
    addObserver(callback) {
      if (typeof callback === "function") {
        this.observers.push(callback);
        console.info("主题观察者已添加");
      }
    }

    /**
     * 移除主题变化观察者
     */
    removeObserver(callback) {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
        console.info("主题观察者已移除");
      }
    }

    /**
     * 通知所有观察者
     */
    notifyObservers(newTheme, oldTheme) {
      this.observers.forEach((callback) => {
        try {
          callback(newTheme, oldTheme);
        } catch (error) {
          console.warn("主题观察者回调执行失败", error);
        }
      });
    }

    /**
     * 获取当前主题
     */
    getCurrentTheme() {
      return this.currentTheme;
    }

    /**
     * 重置主题（跟随系统）
     */
    resetTheme() {
      try {
        localStorage.removeItem(this.storageKey);
        const systemTheme = this.getSystemTheme();
        this.applyTheme(systemTheme);
        console.info("主题已重置，将跟随系统设置");
      } catch (error) {
        console.warn("重置主题失败", error);
      }
    }

    /**
     * 检查是否为暗色主题
     */
    isDarkMode() {
      return this.currentTheme === "dark";
    }

    /**
     * 检查是否为亮色主题
     */
    isLightMode() {
      return this.currentTheme === "light";
    }
  }

  // 创建全局实例
  const themeManager = new ThemeManager();

  // 导出
  global.BlogTheme = {
    ThemeManager,
    manager: themeManager,
    create: () => new ThemeManager(),
  };

  // 兼容旧版本的全局函数
  global.setTheme = (theme) => themeManager.setTheme(theme);
  global.toggleTheme = () => themeManager.toggleTheme();
  global.getCurrentTheme = () => themeManager.getCurrentTheme();

  console.info("Theme.js 模块加载完成");
})(typeof window !== "undefined" ? window : global);
