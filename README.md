# BadCase Tools

一个纯静态的 Markdown 与 LaTeX 编辑器，支持双栏实时预览，专为 GitHub Pages 部署设计。

## 功能特性

- 左写右览的分栏布局：左侧 Markdown 源码编辑，右侧实时渲染预览
- LaTeX 数学公式渲染（基于 KaTeX，支持 `$...$`、`$$...$$`、`\(...\)` 和 `\[...\]` 分隔符）
- LaTeX 命令自动补全（输入 `\` 触发，含 180+ 条常用命令）
- Monaco 编辑器提供语法高亮
- 浏览器 localStorage 自动保存，刷新不丢失
- 渲染防抖（150ms），编辑体验流畅
- 左侧工具箱：竖式计算生成器 / 矩阵可视化生成器
- 纯客户端运行，无需后端

## 技术栈

| 层次 | 技术选型 |
|------|---------|
| 构建 | Vite |
| UI 框架 | React 18 (TypeScript) |
| 样式 | Tailwind CSS + @tailwindcss/typography |
| 编辑器 | Monaco Editor (@monaco-editor/react) |
| Markdown 解析 | markdown-it |
| LaTeX 渲染 | KaTeX + markdown-it-katex |

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 本地预览生产构建
npm run preview
```

开发服务器默认运行在 `http://localhost:5173`。

## 部署

本项目通过 GitHub Actions 自动部署到 GitHub Pages。每次推送到 `main` 分支时，工作流会自动执行：

1. 检出代码
2. 安装依赖
3. 执行 `npm run build`
4. 将 `dist/` 目录部署到 `gh-pages` 分支

请确保在仓库 Settings > Pages 中启用 GitHub Pages，并将部署源设置为 `gh-pages` 分支。
