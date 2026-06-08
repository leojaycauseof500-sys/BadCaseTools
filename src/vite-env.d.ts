/// <reference types="vite/client" />

declare module 'markdown-it-katex' {
  import type MarkdownIt from 'markdown-it';
  import type Katex from 'katex';

  interface MarkdownItKatexOptions {
    throwOnError?: boolean;
    errorColor?: string;
    macros?: Record<string, string>;
  }

  export default function markdownItKatex(
    md: MarkdownIt,
    options?: MarkdownItKatexOptions
  ): void;
}
