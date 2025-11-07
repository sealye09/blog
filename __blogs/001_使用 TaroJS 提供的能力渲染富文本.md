---
title: 使用 TaroJS 提供的能力渲染富文本
date created: 2025-11-08T00:13:23+08:00
date modified: 2025-11-08T00:49:22+08:00
---

## 使用 TaroJS 提供的能力渲染富文本

### 1. 准备 HTML 字符串

```tsx
import { View } from "@tarojs/components";

const content = "<p>你好 <span>世界</span></p>";

export default function ArticleContent() {
  // 容器上需要添加类名 `taro_html`
  return (
    <View className="article-content taro_html" dangerouslySetInnerHTML={{ __html: content }} />
  );
}
```

如果 `content` 是动态变化的，建议用 `useMemo` 缓存，可以减少不必要的重渲染。

你可能会发现未转义字符（如 `&lt;`、`&amp;` 等，[参考：MDN「转义字符」](https://developer.mozilla.org/zh-CN/docs/Glossary/Escape_character)）会直接出现在页面上（[taro 不做转义](https://docs.taro.zone/docs/html#html-%E8%BD%AC%E4%B9%89)），导致展示异常，你应该在后台的编辑器中做实体转义。

### 2. 添加样式

首先引入 Taro 提供的基础 HTML 样式

```tsx
if (isWeapp) {
  require("@tarojs/taro/html.css");
}
```

如果你需要自定义样式，可以添加自定义样式。我这里使用的是 Tailwind CSS。

```scss
.article-content.rich-text .a {
  color: #3b82f6;      
  text-decoration-line: underline;
  text-underline-offset: 4px;  
}

.article-content.rich-text .span {
  display: inline;            
}

.article-content.rich-text .img {
  max-width: 100%;          
  height: auto;              
}

.article-content.rich-text .table {
  width: 100%;              
  border-collapse: collapse;  
}

.article-content.rich-text .th,
.article-content.rich-text .td {
  border-width: 1px;        
  border-style: solid;
  border-color: #d1d5db;      
  padding-left: 1rem;        
  padding-right: 1rem;        
  padding-top: 0.5rem;      
  padding-bottom: 0.5rem;    
}

.article-content.rich-text .th {
  background-color: #e5e7eb;  
  font-weight: 500;            
  text-align: left;            
}

.article-content.rich-text .tr:nth-child(even) {
  background-color: #f3f4f6;  
}
```

### 3. 修复微信小程序 `span` 不渲染

如果你在后台给文本添加了样式，你可能会发现 `span` 节点在小程序端不渲染，这是 taro 把它渲染成了 [span](https://developers.weixin.qq.com/miniprogram/dev/component/span.html)（预期是 text）
相关讨论见：[\[Bug\]: dangerouslySetInnerHTML 无法渲染 span 标签 · Issue #17747 · NervJS/taro](https://github.com/NervJS/taro/issues/17747)

解决：在 transform 阶段将 `span` 转为小程序可识别的 `text`。

```ts
Taro.options.html.transformElement = (taroEle: TaroElement) => {
  const nodeName = taroEle?.nodeName?.toLowerCase();
  if (nodeName === "span") {
    taroEle.tagName = "TEXT";
    taroEle.nodeName = "text";
  }
  return taroEle;
};
```

同时，你也可以通过 `Taro.options.html.transformElement` 来给对应的标签添加属性。

```ts
Taro.options.html.transformElement = (taroEle: TaroElement) => {
  const nodeName = taroEle?.nodeName?.toLowerCase();
  if (nodeName === "img") {
    // 统一设置图片模式为 widthFix，避免图片溢出
    taroEle.setAttribute("mode", "widthFix");
  }
  return taroEle;
};
```

### 4. 添加事件

给富文本添加事件有两种办法：

1. 参考文档：[渲染 HTML | Taro 文档](https://docs.taro.zone/docs/html#%E7%BB%91%E5%AE%9A%E4%BA%8B%E4%BB%B6)
2. 事件委托到容器 3. 在后台给每一个标签添加 data-\[\*\] 属性
   1. data-tag-name: 标签名，区分事件触发的标签
   2. data-href: 跳转链接
   3. data-a-href: 跳转链接
   4. data-src: 图片 src
   5. data-has-parent-a: 是否有父级 a 标签，用于处理 a 标签内的 span 标签点击事件，例如 `<a><span>跳转</span></a>` 点击事件会触发在 span 标签上，导致无法跳转。

taro 代码：

```tsx
// 从 HTML 字符串中收集 <img> 的 src，用于 Taro.previewImage
function getAllImageUrls(content: string) {
  // 处理空值情况
  if (!content || typeof content !== "string") return [];

  const imgReg = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
  const urls: string[] = [];
  let match: RegExpExecArray | null;

  try {
    while ((match = imgReg.exec(content)) !== null) {
      const src = match[1];
      // 过滤掉空字符串和无效的URL
      if (src && src.trim()) {
        urls.push(src);
      }
    }
  } catch (error) {
    console.error("解析图片URL时出错:", error);
    return [];
  }

  return urls;
}

type DataSet = {
  tagName?: string;
  href?: string;
  src?: string;
  aHref?: string;
  hasParentA?: boolean | string;
};

// 容器绑定的事件
const handleClick: ViewProps["onClick"] = (e) => {
  const { target } = e;
  const { dataset } = target ?? {};
  const {
    tagName = "",
    href = "",
    src = "",
    aHref = "",
    hasParentA = "false",
  } = (dataset as DataSet) ?? ({} as DataSet);
  const lowerTagName = tagName?.toLowerCase();

  if (lowerTagName === "a") {
    // 跳转链接
  }

  // 处理 <a><span/></a> 的点击，事件会触发在 span 上
  if (lowerTagName === "span" && hasParentA.toString() === "true" && aHref) {
    // 跳转链接
  }

  if (lowerTagName === "img") {
    // images 为所有图片的 src 列表
    // 获取到富文本内容后通过 getAllImageUrls 获取所有的图片
    // 然后通过 Taro.previewImage 预览图片
    const current = images.find((item) => item === src);
    if (src) {
      Taro.previewImage({ urls: images, current });
    }
  }
};
```

富文本编辑器提交到后端前需要添加 dataset：

```ts
import { isString } from "lodash-es";

/**
 * 转换html文本
 * 1. 给HTML字符串中的所有标签添加同名的className
 * 2. 添加特定 tag 的 data-set 属性（a 的 href，img 的 src）
 * @param html HTML字符串
 * @returns 处理后的HTML字符串
 */
export const transformHtml = (html: string): string => {
  if (!html || !isString(html)) return "";

  try {
    // 创建一个临时的div元素来解析HTML
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    // 递归处理所有子元素
    const processElement = (element: Element) => {
      // 跳过注释节点和文本节点
      if (element.nodeType === Node.COMMENT_NODE || element.nodeType === Node.TEXT_NODE) {
        return;
      }

      // 获取当前元素的标签名
      const tagName = element.tagName.toLowerCase();

      // 跳过script和style标签
      if (tagName === "script" || tagName === "style") {
        return;
      }

      // 处理自闭合标签
      const isSelfClosing = ["img", "br", "hr", "input", "meta", "link"].includes(tagName);

      element.setAttribute("data-tag-name", tagName);

      // 添加className
      if (element.classList.length > 0) {
        // 如果已经有class，检查是否已经包含标签名
        if (!element.classList.contains(tagName)) {
          element.classList.add(tagName);
        }
      } else {
        element.className = tagName;
      }

      if (tagName === "a") {
        // add href to data-set
        element.setAttribute("data-href", element.getAttribute("href") ?? "");

        // 如果 a 标签有子元素，给所有子元素添加特定属性
        if (element?.children?.length > 0) {
          const processChildElements = (childElement: Element) => {
            // 给子元素添加标识，表示它有父级 a 标签
            childElement.setAttribute("data-has-parent-a", "true");

            // 复制 a 标签的 data-set 属性给子元素
            const dataHref = element.getAttribute("data-href");
            if (dataHref) {
              childElement.setAttribute("data-a-href", dataHref);
            }

            // 递归处理子元素的子元素
            Array.from(childElement.children).forEach(processChildElements);
          };

          Array.from(element.children).forEach(processChildElements);
        }
      }
      if (tagName === "img") {
        // add src to data-set
        element.setAttribute("data-src", element.getAttribute("src") ?? "");
      }

      // 如果不是自闭合标签，递归处理所有子元素
      if (!isSelfClosing) {
        Array.from(element.children).forEach(processElement);
      }
    };

    // 处理所有子元素
    Array.from(tempDiv.children).forEach(processElement);

    // 获取处理后的HTML
    let result = tempDiv.innerHTML;

    // 处理自闭合标签的class属性
    result = result.replace(
      /<(img|br|hr|input|meta|link)([^>]*?)(\/?)>/gi,
      (match, tagName, attributes, selfClosing) => {
        if (attributes.includes("class=")) {
          // 如果已经有class属性，确保包含标签名
          return match.replace(/class=["']([^"']*)["']/, (classMatch, existingClass) => {
            if (!existingClass.includes(tagName)) {
              return `class="${existingClass} ${tagName}"`;
            }
            return classMatch;
          });
        } else {
          // 如果没有class属性，添加一个
          return `<${tagName} class="${tagName}"${attributes}${selfClosing}>`;
        }
      },
    );

    return result;
  } catch (error) {
    console.error("Error processing HTML:", error);
    return html; // 发生错误时返回原始HTML
  }
};
```

### 参考链接

- [渲染 HTML | Taro 文档](https://docs.taro.zone/docs/html)
- [\[Bug\]: dangerouslySetInnerHTML 无法渲染 span 标签 · Issue #17747 · NervJS/taro](https://github.com/NervJS/taro/issues/17747)
- [转义字符 - MDN Web 文档术语表：Web 相关术语的定义 | MDN](https://developer.mozilla.org/zh-CN/docs/Glossary/Escape_character)
