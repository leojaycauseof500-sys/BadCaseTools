import { useMemo } from 'react';
import { renderMarkdown } from '../../utils/markdownRenderer';

interface MarkdownPreviewProps {
  source: string;
}

export function MarkdownPreview({ source }: MarkdownPreviewProps) {
  const html = useMemo(() => renderMarkdown(source), [source]);

  return (
    <div className="h-full w-full overflow-auto bg-white">
      <div
        className="prose prose-slate max-w-none px-8 py-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
