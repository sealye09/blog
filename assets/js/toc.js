/**
 * 目录（TOC）功能
 * 自动生成文章目录，支持锚点跳转和高亮
 */
(function (global) {
  "use strict";

  /**
   * 目录管理器
   */
  class TOCManager {
    constructor() {
      this.content = null;
      this.toc = null;
      this.container = null;
      this.title = null;
      this.headings = [];
      this.tocItems = [];
      this.activeItem = null;
      this.observers = [];

      this.init();
    }

    /**
     * 初始化目录
     */
    init() {
      try {
        console.info("TOCManager 初始化开始");

        // 获取 DOM 元素
        this.content = document.querySelector(".post-content");
        this.toc = document.querySelector(".post-toc");

        if (!this.content || !this.toc) {
          console.debug("目录元素未找到，跳过目录生成", {
            content: !!this.content,
            toc: !!this.toc,
          });
          return;
        }

        this.container = this.toc.querySelector(".post-toc__body");
        this.title = this.toc.querySelector(".post-toc__title");

        if (!this.container) {
          console.debug("目录容器未找到");
          return;
        }

        // 根据屏幕尺寸设置初始状态
        this.setupResponsiveState();

        // 生成目录
        this.generateTOC();

        // 绑定事件
        this.bindEvents();

        console.info("TOCManager 初始化完成", { headingsCount: this.headings.length });
      } catch (error) {
        console.warn("TOCManager 初始化失败", error);
      }
    }

    /**
     * 生成目录
     */
    generateTOC() {
      // 获取标题
      this.headings = Array.from(this.content.querySelectorAll("h1, h2, h3, h4, h5"));

      if (this.headings.length === 0) {
        console.debug("未找到标题，隐藏目录");
        this.toc.style.display = "none";
        return;
      }

      // 生成目录 HTML
      const tocHTML = this.generateTOCHTML();
      this.container.innerHTML = tocHTML;

      // 生成目录项引用
      this.tocItems = Array.from(this.container.querySelectorAll("a"));

      // 高亮当前目录项
      this.highlightCurrentItem();

      console.debug("目录已生成", { itemsCount: this.tocItems.length });
    }

    /**
     * 生成目录 HTML
     */
    generateTOCHTML() {
      let html = "";

      this.headings.forEach((heading, index) => {
        const level = parseInt(heading.tagName.substring(1));
        const text = this.getHeadingText(heading);
        const id = this.generateHeadingId(heading, index);
        const isActive = index === 0 ? "active" : "";

        html += `
          <a href="#${id}" class="post-toc__item post-toc__item--level-${level} ${isActive}"
             data-level="${level}" data-index="${index}">
            <span class="post-toc__text">${text}</span>
          </a>
        `;
      });

      return html;
    }

    /**
     * 获取标题文本
     */
    getHeadingText(heading) {
      const text = heading.textContent || heading.innerText || "";
      return text.trim();
    }

    /**
     * 生成标题 ID
     */
    generateHeadingId(heading, index) {
      // 如果已有 ID，直接使用
      if (heading.id) {
        return heading.id;
      }

      // 生成新 ID
      const text = this.getHeadingText(heading);
      const baseId = text
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5\s-]/g, "")
        .replace(/\s+/g, "-")
        .trim();

      let id = baseId || `heading-${index}`;
      let counter = 1;

      // 确保 ID 唯一
      while (document.getElementById(id)) {
        id = `${baseId}-${counter}`;
        counter++;
      }

      heading.id = id;
      return id;
    }

    /**
     * 绑定事件
     */
    bindEvents() {
      // 目录项点击事件
      this.container.addEventListener("click", this.handleItemClick.bind(this));

      // 目录标题点击事件（折叠展开）
      if (this.title) {
        this.title.addEventListener("click", this.handleTitleClick.bind(this));
        this.title.style.cursor = "pointer";
      }

      // 滚动事件（用于高亮当前目录项）
      window.addEventListener("scroll", this.handleScroll.bind(this), { passive: true });

      // 窗口大小变化事件
      window.addEventListener("resize", this.handleResize.bind(this));

      console.debug("目录事件已绑定");
    }

    /**
     * 处理目录标题点击（折叠展开）
     */
    handleTitleClick(event) {
      // 大屏下不处理标题点击事件
      if (window.innerWidth > 1024) {
        return;
      }

      event.preventDefault();
      const isCollapsed = this.toc.hasAttribute("data-collapsed");

      if (isCollapsed) {
        this.toc.removeAttribute("data-collapsed");
      } else {
        this.toc.setAttribute("data-collapsed", "true");
      }

      console.debug("TOC 折叠状态切换", { isCollapsed: !isCollapsed });
    }

    /**
     * 处理目录项点击
     */
    handleItemClick(event) {
      const link = event.target.closest(".post-toc__item");
      if (!link) return;

      event.preventDefault();

      const targetId = link.getAttribute("href").substring(1);
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        // 滚动到目标位置
        this.scrollToHeading(targetElement);

        // 更新 URL hash
        this.updateHash(targetId);

        // 高亮当前项
        this.setActiveItem(link);

        console.debug("目录项被点击", { targetId });
      }
    }

    /**
     * 滚动到标题
     */
    scrollToHeading(heading) {
      const headerHeight = document.querySelector(".site-header")?.offsetHeight || 0;
      const targetPosition = heading.offsetTop - headerHeight - 20; // 20px 额外间距

      window.scrollTo({
        top: targetPosition,
        behavior: "smooth",
      });
    }

    /**
     * 更新 URL hash
     */
    updateHash(hash) {
      if (history.pushState) {
        history.pushState(null, null, `#${hash}`);
      } else {
        location.hash = hash;
      }
    }

    /**
     * 设置活动目录项
     */
    setActiveItem(item) {
      // 移除所有活动状态
      this.tocItems.forEach((i) => i.classList.remove("active"));

      // 添加活动状态
      item.classList.add("active");
      this.activeItem = item;

      // 确保目录项可见
      this.scrollIntoView(item);
    }

    /**
     * 确保目录项在视口内
     */
    scrollIntoView(item) {
      const containerRect = this.container.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();

      if (itemRect.bottom > containerRect.bottom) {
        this.container.scrollTop += itemRect.bottom - containerRect.bottom;
      } else if (itemRect.top < containerRect.top) {
        this.container.scrollTop += itemRect.top - containerRect.top;
      }
    }

    /**
     * 处理滚动事件
     */
    handleScroll() {
      this.highlightCurrentItem();
    }

    /**
     * 高亮当前目录项
     */
    highlightCurrentItem() {
      if (this.headings.length === 0) return;

      const headerHeight = document.querySelector(".site-header")?.offsetHeight || 0;
      const scrollPosition = window.pageYOffset + headerHeight + 50; // 50px 阈值

      let activeIndex = -1;

      for (let i = this.headings.length - 1; i >= 0; i--) {
        const heading = this.headings[i];
        const position = heading.offsetTop;

        if (position <= scrollPosition) {
          activeIndex = i;
          break;
        }
      }

      if (activeIndex >= 0 && this.tocItems[activeIndex]) {
        this.setActiveItem(this.tocItems[activeIndex]);
      }
    }

    /**
     * 设置响应式状态
     */
    setupResponsiveState() {
      const isMobile = window.innerWidth <= 1024;

      // 小屏下默认展开状态，但允许折叠
      if (isMobile) {
        this.toc.removeAttribute("data-collapsed");
      } else {
        // 大屏下强制展开
        this.toc.removeAttribute("data-collapsed");
      }

      console.debug("TOC 响应式状态设置", {
        isMobile,
        collapsed: this.toc.hasAttribute("data-collapsed"),
      });
    }

    /**
     * 处理窗口大小变化
     */
    handleResize() {
      // 更新响应式状态
      this.setupResponsiveState();

      // 高亮当前项
      this.highlightCurrentItem();
    }

    /**
     * 添加观察者
     */
    addObserver(callback) {
      if (typeof callback === "function") {
        this.observers.push(callback);
        console.debug("目录观察者已添加");
      }
    }

    /**
     * 移除观察者
     */
    removeObserver(callback) {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
        console.debug("目录观察者已移除");
      }
    }

    /**
     * 通知观察者
     */
    notifyObservers(event, data) {
      this.observers.forEach((callback) => {
        try {
          callback(event, data);
        } catch (error) {
          console.warn("目录观察者回调执行失败", error);
        }
      });
    }

    /**
     * 获取目录数据
     */
    getTOCData() {
      return {
        headings: this.headings.map((heading, index) => ({
          index,
          level: parseInt(heading.tagName.substring(1)),
          text: this.getHeadingText(heading),
          id: heading.id,
        })),
        activeIndex: this.tocItems.indexOf(this.activeItem),
      };
    }

    /**
     * 刷新目录
     */
    refresh() {
      this.generateTOC();
      this.bindEvents();
      console.info("目录已刷新");
    }

    /**
     * 销毁目录管理器
     */
    destroy() {
      if (this.container) {
        this.container.removeEventListener("click", this.handleItemClick);
      }
      window.removeEventListener("scroll", this.handleScroll);
      window.removeEventListener("resize", this.handleResize);

      this.headings = [];
      this.tocItems = [];
      this.observers = [];

      console.info("TOCManager 已销毁");
    }
  }

  // 当 DOM 加载完成后初始化
  function initTOC() {
    const tocManager = new TOCManager();

    global.BlogTOC = {
      TOCManager,
      manager: tocManager,
      create: () => new TOCManager(),
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTOC);
  } else {
    initTOC();
  }

  console.info("TOC.js 模块加载完成");
})(typeof window !== "undefined" ? window : global);
