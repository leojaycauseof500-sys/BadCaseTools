import { forwardRef, useRef, useImperativeHandle, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { LATEX_COMPLETIONS } from '../../utils/latexCompletions';

export interface MonacoEditorHandle {
  insertText: (text: string) => void;
  getSelectedText: () => string;
}

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
}

let completionRegistered = false;

export const MonacoEditor = forwardRef<MonacoEditorHandle, MonacoEditorProps>(
  function MonacoEditor({ value, onChange }, ref) {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    const handleMount: OnMount = useCallback((editor, monaco) => {
      editorRef.current = editor;
      editor.focus();

      if (!completionRegistered) {
        completionRegistered = true;
        monaco.languages.registerCompletionItemProvider('markdown', {
          triggerCharacters: ['\\'],
          provideCompletionItems: (model, position) => {
            const textUntilPosition = model.getValueInRange({
              startLineNumber: position.lineNumber,
              startColumn: 1,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            });

            const match = textUntilPosition.match(/\\([a-zA-Z]*)$/);
            if (!match) return { suggestions: [] };

            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column - match[0].length,
              endColumn: position.column,
            };

            const suggestions = LATEX_COMPLETIONS.map((cmd) => ({
              label: cmd.label,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: cmd.insertText,
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              detail: cmd.detail,
              range,
            }));

            return { suggestions };
          },
        });
      }
    }, []);

    useImperativeHandle(ref, () => ({
      insertText: (text: string) => {
        const ed = editorRef.current;
        if (!ed) return;
        const selection = ed.getSelection();
        if (!selection) return;
        ed.executeEdits('toolbox', [
          {
            range: selection,
            text,
          },
        ]);
        ed.focus();
      },
      getSelectedText: () => {
        const ed = editorRef.current;
        if (!ed) return '';
        const selection = ed.getSelection();
        if (!selection) return '';
        return ed.getModel()?.getValueInRange(selection) ?? '';
      },
    }), []);

    return (
      <div className="h-full w-full">
        <Editor
          height="100%"
          language="markdown"
          theme="vs"
          value={value}
          onChange={(v) => onChange(v ?? '')}
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            lineNumbers: 'on',
            wordWrap: 'on',
            fontSize: 14,
            fontFamily: '"Google Sans Mono", "Fira Code", Menlo, Monaco, monospace',
            lineHeight: 22,
            padding: { top: 16, bottom: 16 },
            scrollBeyondLastLine: false,
            renderLineHighlight: 'line',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            bracketPairColorization: { enabled: true },
            automaticLayout: true,
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            guides: { indentation: false },
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
          }}
        />
      </div>
    );
  }
);
