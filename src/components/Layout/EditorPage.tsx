import { useCallback, useEffect, useRef, useState } from 'react';
import { MonacoEditor, MonacoEditorHandle } from '../Editor/MonacoEditor';
import { MarkdownPreview } from '../Preview/MarkdownPreview';
import { Toolbox } from '../Sidebar/Toolbox';
import { ImagePanel, PastedImage } from '../ImagePanel/ImagePanel';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useDebouncedCallback } from '../../hooks/useDebounce';

const STORAGE_KEY = 'badcase-md-content';
const SPLIT_STORAGE_KEY = 'badcase-split-ratio';

const DEFAULT_CONTENT = `# 你好，BadCase Tools！

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

function newImageId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function EditorPage() {
  const [content, setContent] = useLocalStorage(STORAGE_KEY, DEFAULT_CONTENT);
  const editorRef = useRef<MonacoEditorHandle>(null);

  // ---- 图片剪贴板 ----
  const [images, setImages] = useState<PastedImage[]>([]);
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const imagesRef = useRef(images);
  imagesRef.current = images;
  const previewIdRef = useRef(previewId);
  previewIdRef.current = previewId;

  const removeImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const clearImages = useCallback(() => {
    setImages([]);
  }, []);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (!file) continue;

          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            if (!dataUrl) return;
            setImages((prev) => [
              ...prev,
              { id: newImageId(), dataUrl },
            ]);
            setShowImagePanel(true);
          };
          reader.readAsDataURL(file);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // ---- 键盘快捷键 ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + 数字键 → 预览对应图片
      if ((e.ctrlKey || e.metaKey) && /^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const imgs = imagesRef.current;
        if (idx < imgs.length) {
          e.preventDefault();
          setPreviewId(imgs[idx].id);
          setShowImagePanel(true);
        }
        return;
      }

      // Esc → 关闭全屏预览
      if (e.key === 'Escape' && previewIdRef.current) {
        setPreviewId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ---- 分割比例（持久化） ----
  const [splitRatio, setSplitRatio] = useState(() => {
    try {
      const saved = localStorage.getItem(SPLIT_STORAGE_KEY);
      const v = saved ? parseFloat(saved) : 50;
      return Math.max(20, Math.min(80, v));
    } catch {
      return 50;
    }
  });
  const [isDragging, setIsDragging] = useState(false);

  const splitContainerRef = useRef<HTMLDivElement>(null);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const container = splitContainerRef.current;
    if (!container) return;
    const editorEl = container.children[0] as HTMLElement;

    const startX = e.clientX;
    const startWidth = editorEl.getBoundingClientRect().width;
    const containerWidth = container.getBoundingClientRect().width;

    const handleMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const ratio = Math.max(
        20,
        Math.min(80, ((startWidth + dx) / containerWidth) * 100),
      );
      editorEl.style.width = `${ratio}%`;
    };

    const handleUp = () => {
      setIsDragging(false);
      const finalRatio = parseFloat(editorEl.style.width);
      if (!isNaN(finalRatio)) {
        const rounded = Math.round(finalRatio);
        setSplitRatio(rounded);
        try {
          localStorage.setItem(SPLIT_STORAGE_KEY, String(rounded));
        } catch {}
      }
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, []);

  // ---- 回调 ----
  const handleChange = useCallback(
    (value: string) => {
      setContent(value);
    },
    [setContent],
  );

  const debouncedSource = useDebouncedCallback(handleChange, 150);

  const handleInsert = useCallback((latex: string) => {
    editorRef.current?.insertText(latex);
  }, []);

  const handleReplaceAll = useCallback(
    (find: string, replaceText: string) =>
      editorRef.current?.replaceAll(find, replaceText) ?? false,
    [],
  );

  return (
    <div className="h-full flex flex-col bg-surface-secondary">
      {/* 顶部工具栏 */}
      <header className="flex items-center h-12 px-4 bg-white border-b border-border shrink-0 select-none">
        <h1 className="text-sm font-medium text-gray-600 tracking-wide">
          BadCase Tools
        </h1>
        <span className="ml-2 text-xs text-gray-400">Markdown 与 LaTeX 编辑器</span>

        <div className="flex-1" />

        {/* 截图面板开关 */}
        <button
          onClick={() => setShowImagePanel((v) => !v)}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
            showImagePanel
              ? 'bg-blue-100 text-blue-600'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          }`}
          title={showImagePanel ? '隐藏截图面板' : '显示截图面板'}
        >
          <span className="text-sm leading-none">&#x1F4F7;</span>
          {images.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-medium bg-blue-500 text-white rounded-full">
              {images.length}
            </span>
          )}
        </button>
      </header>

      {/* 主编辑区域 */}
      <div className="flex-1 flex overflow-hidden">
        <Toolbox onInsert={handleInsert} onReplaceAll={handleReplaceAll} />

        <div
          ref={splitContainerRef}
          className="flex-1 flex overflow-hidden min-w-0"
        >
          {/* 左侧编辑器 */}
          <div
            className="min-w-0 h-full"
            style={{ width: `${splitRatio}%` }}
          >
            <MonacoEditor
              ref={editorRef}
              value={content}
              onChange={debouncedSource}
            />
          </div>

          {/* 拖拽分隔条 */}
          <div
            onMouseDown={handleResizeStart}
            className={`shrink-0 w-1 cursor-col-resize transition-colors ${
              isDragging
                ? 'bg-blue-500'
                : 'bg-border hover:bg-blue-400'
            }`}
          />

          {/* 右侧预览 */}
          <div className="flex-1 min-w-0">
            <MarkdownPreview source={content} />
          </div>
        </div>
      </div>

      {/* 截图面板 */}
      <ImagePanel
        images={images}
        visible={showImagePanel}
        previewId={previewId}
        onPreviewChange={setPreviewId}
        onRemove={removeImage}
        onClear={clearImages}
        onClose={() => setShowImagePanel(false)}
      />
    </div>
  );
}
