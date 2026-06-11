export interface PastedImage {
  id: string;
  dataUrl: string;
}

interface ImagePanelProps {
  images: PastedImage[];
  visible: boolean;
  previewId: string | null;
  onPreviewChange: (id: string | null) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export function ImagePanel({
  images,
  visible,
  previewId,
  onPreviewChange,
  onRemove,
  onClear,
  onClose,
}: ImagePanelProps) {
  const previewImage = images.find((img) => img.id === previewId);

  return (
    <>
      {visible && (
        <div className="shrink-0 border-t border-border bg-white">
          {/* 标题栏 */}
          <div className="flex items-center h-8 px-3 gap-2 border-b border-gray-100">
            <span className="text-xs font-medium text-gray-500">
              截图面板 ({images.length})
            </span>
            <div className="flex-1" />
            <button
              onClick={onClear}
              className="px-2 py-0.5 text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              清空
            </button>
            <button
              onClick={onClose}
              className="px-1 py-0.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              title="关闭面板"
            >
              ✕
            </button>
          </div>

          {/* 图片缩略图横向滚动 */}
          {images.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-xs text-gray-400">
              使用截图工具截图后，在此页面按 Ctrl+V 粘贴
            </div>
          ) : (
            <div className="flex gap-2 p-2 overflow-x-auto h-24 items-center">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  className="group relative shrink-0 h-full aspect-auto rounded border border-gray-200 overflow-hidden cursor-pointer hover:border-blue-400 transition-colors"
                  onClick={() => onPreviewChange(img.id)}
                >
                  <img
                    src={img.dataUrl}
                    alt="pasted"
                    className="h-full w-auto object-contain"
                  />
                  <span className="absolute bottom-0.5 left-0.5 w-4 h-4 rounded bg-black/60 text-white text-[10px] flex items-center justify-center select-none">
                    {idx + 1}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(img.id);
                      if (previewId === img.id) onPreviewChange(null);
                    }}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/50 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    title="删除"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 全屏预览浮层 */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-pointer"
          onClick={() => onPreviewChange(null)}
        >
          <img
            src={previewImage.dataUrl}
            alt="preview"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded shadow-2xl"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreviewChange(null);
            }}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/40 transition-colors text-lg"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
