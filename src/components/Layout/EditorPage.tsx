import { useCallback, useRef } from 'react';
import { MonacoEditor, MonacoEditorHandle } from '../Editor/MonacoEditor';
import { MarkdownPreview } from '../Preview/MarkdownPreview';
import { Toolbox } from '../Sidebar/Toolbox';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useDebouncedCallback } from '../../hooks/useDebounce';

const STORAGE_KEY = 'badcase-md-content';

const DEFAULT_CONTENT = `# Hello, BadCase Tools!

欢迎使用 **Markdown + LaTeX 编辑器**。

---

## 基础 Markdown

- **粗体** / *斜体* / ~~删除线~~
- [链接](https://github.com)
- \`行内代码\`

### 代码块

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

---

## LaTeX 数学公式

行内公式：$E = mc^2$

独立公式块：

$$
\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

$$
\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$

---

> 提示：所有内容会自动实时保存到浏览器本地存储中。
`;

export function EditorPage() {
  const [content, setContent] = useLocalStorage(STORAGE_KEY, DEFAULT_CONTENT);
  const editorRef = useRef<MonacoEditorHandle>(null);

  const handleChange = useCallback(
    (value: string) => {
      setContent(value);
    },
    [setContent]
  );

  const debouncedSource = useDebouncedCallback(handleChange, 150);

  const handleInsert = useCallback((latex: string) => {
    editorRef.current?.insertText(latex);
  }, []);

  return (
    <div className="h-full flex flex-col bg-surface-secondary">
      {/* 顶部工具栏 */}
      <header className="flex items-center h-12 px-4 bg-white border-b border-border shrink-0 select-none">
        <h1 className="text-sm font-medium text-gray-600 tracking-wide">
          BadCase Tools
        </h1>
        <span className="ml-2 text-xs text-gray-400">Markdown &amp; LaTeX Editor</span>
      </header>

      {/* 主编辑区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 工具箱侧边栏 */}
        <Toolbox onInsert={handleInsert} />

        {/* 左侧编辑器 */}
        <div className="flex-1 border-r border-border min-w-0">
          <MonacoEditor ref={editorRef} value={content} onChange={debouncedSource} />
        </div>

        {/* 右侧预览 */}
        <div className="flex-1 min-w-0">
          <MarkdownPreview source={content} />
        </div>
      </div>
    </div>
  );
}
