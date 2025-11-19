/**
 * GitHub 链接功能
 * 处理 GitHub 图标的显示和隐藏
 */
(function (global) {
  "use strict";

  /**
   * GitHub 链接管理器
   */
  class GitHubManager {
    constructor() {
      this.githubLink = null;
      this.username = null;

      this.init();
    }

    /**
     * 初始化 GitHub 链接
     */
    init() {
      try {
        console.info("GitHubManager 初始化开始");

        this.githubLink = document.querySelector(".github-link");

        if (!this.githubLink) {
          console.debug("GitHub 链接元素未找到");
          return;
        }

        // 获取用户名
        this.username = this.githubLink.getAttribute("data-username");

        // 如果没有用户名，隐藏链接
        if (!this.username) {
          this.hideLink();
          console.info("未设置 GitHub 用户名，链接已隐藏");
        } else {
          console.info("GitHub 链接已显示", { username: this.username });
        }

        // 添加点击事件追踪
        this.bindEvents();

        console.info("GitHubManager 初始化完成");
      } catch (error) {
        console.warn("GitHubManager 初始化失败", error);
      }
    }

    /**
     * 隐藏 GitHub 链接
     */
    hideLink() {
      if (this.githubLink) {
        this.githubLink.style.display = "none";
        console.debug("GitHub 链接已隐藏");
      }
    }

    /**
     * 显示 GitHub 链接
     */
    showLink() {
      if (this.githubLink && this.username) {
        this.githubLink.style.display = "flex";
        console.debug("GitHub 链接已显示");
      }
    }

    /**
     * 绑定事件
     */
    bindEvents() {
      if (!this.githubLink) return;

      this.githubLink.addEventListener("click", this.handleClick.bind(this));
      console.debug("GitHub 链接事件已绑定");
    }

    /**
     * 处理点击事件
     */
    handleClick(event) {
      console.info("GitHub 链接被点击", { username: this.username });
    }

    /**
     * 设置用户名
     */
    setUsername(username) {
      this.username = username;
      if (this.githubLink) {
        this.githubLink.setAttribute("data-username", username);

        if (username) {
          this.githubLink.href = `https://github.com/${username}`;
          this.showLink();
        } else {
          this.hideLink();
        }
      }
    }

    /**
     * 获取当前用户名
     */
    getUsername() {
      return this.username;
    }

    /**
     * 销毁 GitHub 管理器
     */
    destroy() {
      if (this.githubLink) {
        this.githubLink.removeEventListener("click", this.handleClick);
      }
      console.info("GitHubManager 已销毁");
    }
  }

  // 创建全局实例
  const githubManager = new GitHubManager();

  // 导出
  global.BlogGitHub = {
    GitHubManager,
    manager: githubManager,
    create: () => new GitHubManager(),
  };

  console.info("GitHub.js 模块加载完成");
})(typeof window !== "undefined" ? window : global);
