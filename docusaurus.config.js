// @ts-check

import {themes as prismThemes} from 'prism-react-renderer';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

/** @type {import('@docusaurus/types').Config} */
const config = {
  // 网站基本信息
  title: 'olD_mOwOn',
  tagline: 'A common websiteW',
  favicon: 'img/favicon.ico',

  // 网站语言设置
  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
    localeConfigs: {
      'zh-Hans': {
        label: '简体中文',
      },
    },
  },

  // Docusaurus v4 相关配置
  future: {
    v4: true,
  },

  // 网站正式部署地址
  // 如果目前只在本地运行，可以暂时保留下面的地址
  // 发布到 GitHub Pages 时，需要改成你的真实网址
  url: 'https://your-docusaurus-site.example.com',
  baseUrl: '/',

  // GitHub Pages 配置
  // 如果以后部署到 GitHub，请改成你自己的用户名和仓库名
  organizationName: 'hu3141592',
  projectName: 'test',

  // 遇到链接错误时直接报错，便于及时发现问题
  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          // 数学公式支持
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],

          sidebarPath: './sidebars.js',

          // 显示最后更新时间
          showLastUpdateTime: true,
          showLastUpdateAuthor: false,

          // 暂时没有设置 GitHub 编辑地址，因此先隐藏“编辑此页”链接
          // 以后有自己的 GitHub 仓库后，可以取消下面的注释并修改地址
          // editUrl: 'https://github.com/你的用户名/你的仓库名/tree/main/',
        },

        blog: {
          // 博客页面中文标题和描述
          blogTitle: 'Blog',
          blogDescription: '记录学习、思考与实践。',

          // 数学公式支持
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],

          showReadingTime: true,
          showLastUpdateTime: true,

          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },

          // 暂时隐藏“编辑此页”链接
          // 以后有自己的 GitHub 仓库后再启用
          // editUrl: 'https://github.com/你的用户名/你的仓库名/tree/main/',

          // 没有摘要分隔符时给出提醒
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },

        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // 网站分享卡片
      image: 'img/docusaurus-social-card.jpg',

      // 浏览器标签页和搜索引擎描述
      metadata: [
        {
          name: 'keywords',
          content: 'hu3141592, olD_mOwOn, cxsx, 博客, 文档, 文章',
        },
        {
          name: 'description',
          content: 'olD_mOwOn的个人网站',
        },
      ],

      // 主题颜色设置
      colorMode: {
        defaultMode: 'light',
        respectPrefersColorScheme: true,
        disableSwitch: false,
      },

      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: true,
        },
      },

      // 顶部导航栏
      navbar: {
        title: 'olD_mOwOn',
        logo: {
          alt: '我的网站 Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'docs',
          },
          {
            to: '/blog',
            label: 'blog',
            position: 'left',
          },
          {
            href: 'https://github.com/hu3141592/test',
            label: 'Github',
            position: 'right',
          },
        ],
      },

      // 底部页脚
      footer: {
        style: 'dark',
        links: [
          {
            title: 'To',
            items: [
              {
                label: '首页',
                to: '/',
              },
            ],
          },
          {
            title: '学习资源',
            items: [
              {
                label: 'blog',
                to: '/blog',
              },
              {
                label: 'docs',
                to: '/docs/intro',
              },
            ],
          },
          {
            title: '相关链接',
            items: [
              {
                label: 'GitHub 项目',
                href: 'https://github.com/hu3141592/test',
              },
              {
                label: 'B站主页',
                href: 'https://space.bilibili.com/88941445',
              },
            ],
          },
        ],
        copyright: `版权所有 © ${new Date().getFullYear()} 我的网站。使用 Docusaurus 构建。`,
      },

      // 代码高亮主题
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['bash', 'java', 'python', 'json', 'yaml'],
      },
    }),

  // 数学公式所需的 KaTeX 样式
  stylesheets: [
    {
      href: 'https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css',
      type: 'text/css',
    },
  ],
};

export default config;