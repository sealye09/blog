/**
 * 移动端菜单功能
 * 处理移动端菜单的显示、隐藏和交互
 */
(function (global) {
  "use strict";

  /**
   * 移动端菜单管理器
   */
  class MobileMenu {
    constructor() {
      this.isOpen = false;
      this.menuButton = null;
      this.menu = null;
      this.header = null;
      this.body = null;
      this.transitionDuration = 300;
      this.observers = [];

      this.init();
    }

    /**
     * 初始化移动端菜单
     */
    init() {
      try {
        console.info("MobileMenu 初始化开始");

        // 获取 DOM 元素
        this.menuButton = document.querySelector(".mobile-menu-toggle");
        this.menu = document.querySelector(".mobile-menu");
        this.header = document.querySelector(".site-header");
        this.body = document.body;

        if (!this.menuButton || !this.menu) {
          console.info("移动端菜单元素未找到", {
            menuButton: !!this.menuButton,
            menu: !!this.menu,
          });
          return;
        }

        // 初始化事件监听
        this.bindEvents();

        // 初始化菜单状态
        this.initMenuState();

        // 检测屏幕尺寸
        this.handleResize();

        console.info("MobileMenu 初始化完成");
      } catch (error) {
        console.info("MobileMenu 初始化失败", error);
      }
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
      // 菜单按钮点击事件
      this.menuButton.addEventListener("click", this.handleMenuToggle.bind(this));

      // 菜单项点击事件
      const menuLinks = this.menu.querySelectorAll("a");
      menuLinks.forEach((link) => {
        link.addEventListener("click", this.handleMenuLinkClick.bind(this));
      });

      // 点击外部关闭菜单
      document.addEventListener("click", this.handleOutsideClick.bind(this));

      // ESC 键关闭菜单
      document.addEventListener("keydown", this.handleKeydown.bind(this));

      // 屏幕尺寸变化
      window.addEventListener("resize", this.handleResize.bind(this));

      console.debug("移动端菜单事件已绑定");
    }

    /**
     * 初始化菜单状态
     */
    initMenuState() {
      this.isOpen = this.menu.classList.contains("mobile-menu--open");
      this.updateMenuState();
      this.updateButtonState();
    }

    /**
     * 处理菜单切换
     */
    handleMenuToggle(event) {
      event.preventDefault();
      event.stopPropagation();

      this.toggle();
    }

    /**
     * 处理菜单链接点击
     */
    handleMenuLinkClick(event) {
      // 关闭菜单
      if (this.isOpen) {
        this.close();
      }
    }

    /**
     * 处理外部点击
     */
    handleOutsideClick(event) {
      if (!this.isOpen) return;

      const isClickInsideMenu = this.menu.contains(event.target);
      const isClickOnButton = this.menuButton.contains(event.target);

      if (!isClickInsideMenu && !isClickOnButton) {
        this.close();
      }
    }

    /**
     * 处理键盘事件
     */
    handleKeydown(event) {
      if (!this.isOpen) return;

      if (event.key === "Escape") {
        this.close();
        this.menuButton.focus();
      }
    }

    /**
     * 处理屏幕尺寸变化
     */
    handleResize() {
      const isMobile = window.innerWidth <= 1024; // lg 断点

      if (!isMobile && this.isOpen) {
        // 在大屏幕上自动关闭移动端菜单
        this.close();
      }
    }

    /**
     * 切换菜单状态
     */
    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    /**
     * 打开菜单
     */
    open() {
      if (this.isOpen) return;

      try {
        this.isOpen = true;
        this.updateMenuState();
        this.updateButtonState();
        this.bindFocusTrap();

        console.debug("移动端菜单已打开");

        // 通知观察者
        this.notifyObservers("open");
      } catch (error) {
        console.info("打开移动端菜单失败", error);
      }
    }

    /**
     * 关闭菜单
     */
    close() {
      if (!this.isOpen) return;

      try {
        this.isOpen = false;
        this.updateMenuState();
        this.updateButtonState();
        this.unbindFocusTrap();

        console.debug("移动端菜单已关闭");

        // 通知观察者
        this.notifyObservers("close");
      } catch (error) {
        console.info("关闭移动端菜单失败", error);
      }
    }

    /**
     * 更新菜单状态
     */
    updateMenuState() {
      // 更新菜单类
      if (this.isOpen) {
        this.menu.classList.add("mobile-menu--open");
        this.body.classList.add("mobile-menu-open");
      } else {
        this.menu.classList.remove("mobile-menu--open");
        this.body.classList.remove("mobile-menu-open");
      }

      // 更新 ARIA 属性
      this.menuButton.setAttribute("aria-expanded", this.isOpen);
      this.menu.setAttribute("aria-hidden", !this.isOpen);
    }

    /**
     * 更新按钮状态
     */
    updateButtonState() {
      const openIcon = this.menuButton.querySelector(".menu-icon-open");
      const closeIcon = this.menuButton.querySelector(".menu-icon-close");

      if (openIcon && closeIcon) {
        if (this.isOpen) {
          openIcon.style.display = "none";
          closeIcon.style.display = "block";
        } else {
          openIcon.style.display = "block";
          closeIcon.style.display = "none";
        }
      }
    }

    /**
     * 绑定焦点陷阱
     */
    bindFocusTrap() {
      if (!this.isOpen) return;

      const focusableElements = this.menu.querySelectorAll(
        'a, button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])',
      );

      this.firstFocusableElement = focusableElements[0];
      this.lastFocusableElement = focusableElements[focusableElements.length - 1];

      // 初始焦点
      if (this.firstFocusableElement) {
        this.firstFocusableElement.focus();
      }
    }

    /**
     * 解绑焦点陷阱
     */
    unbindFocusTrap() {
      this.firstFocusableElement = null;
      this.lastFocusableElement = null;
    }

    /**
     * 添加状态观察者
     */
    addObserver(callback) {
      if (typeof callback === "function") {
        this.observers.push(callback);
        console.debug("移动端菜单观察者已添加");
      }
    }

    /**
     * 移除状态观察者
     */
    removeObserver(callback) {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
        console.debug("移动端菜单观察者已移除");
      }
    }

    /**
     * 通知观察者
     */
    notifyObservers(action) {
      this.observers.forEach((callback) => {
        try {
          callback(action, this.isOpen);
        } catch (error) {
          console.info("移动端菜单观察者回调执行失败", error);
        }
      });
    }

    /**
     * 获取菜单状态
     */
    getState() {
      return {
        isOpen: this.isOpen,
        isMobile: window.innerWidth <= 1024,
      };
    }

    /**
     * 销毁移动端菜单
     */
    destroy() {
      if (this.menuButton) {
        this.menuButton.removeEventListener("click", this.handleMenuToggle);
      }

      document.removeEventListener("click", this.handleOutsideClick);
      document.removeEventListener("keydown", this.handleKeydown);
      window.removeEventListener("resize", this.handleResize);

      this.close();
      this.observers = [];

      console.info("MobileMenu 已销毁");
    }
  }

  // 创建全局实例
  const mobileMenu = new MobileMenu();

  // 导出
  global.BlogMobileMenu = {
    MobileMenu,
    menu: mobileMenu,
    create: () => new MobileMenu(),
  };

  console.info("Mobile-menu.js 模块加载完成");
})(typeof window !== "undefined" ? window : global);
