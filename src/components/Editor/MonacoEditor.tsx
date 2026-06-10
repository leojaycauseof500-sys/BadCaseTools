import { forwardRef, useRef, useImperativeHandle, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { LATEX_COMPLETIONS } from '../../utils/latexCompletions';

export interface MonacoEditorHandle {
  insertText: (text: string) => void;
  getSelectedText: () => string;
  replaceAll: (find: string, replaceText: string) => boolean;
}

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
}

let configDone = false;

export const MonacoEditor = forwardRef<MonacoEditorHandle, MonacoEditorProps>(
  function MonacoEditor({ value, onChange }, ref) {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    const handleMount: OnMount = useCallback((editor, monaco) => {
      editorRef.current = editor;
      editor.focus();

      if (!configDone) {
        configDone = true;

        // -- LaTeX 补全 --
        monaco.languages.registerCompletionItemProvider('markdown', {
          triggerCharacters: ['\\'],
          provideCompletionItems: (model, position) => {
            const textUntilPosition = model.getValueInRange({
              startLineNumber: position.lineNumber,
              startColumn: 1,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            });

            const lastBackslash = textUntilPosition.lastIndexOf('\\');
            if (lastBackslash === -1) return { suggestions: [] };

            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: lastBackslash + 1,
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
        ed.executeEdits('toolbox', [{ range: selection, text }]);
        ed.focus();
      },
      getSelectedText: () => {
        const ed = editorRef.current;
        if (!ed) return '';
        const selection = ed.getSelection();
        if (!selection) return '';
        return ed.getModel()?.getValueInRange(selection) ?? '';
      },
      replaceAll: (find: string, replaceText: string) => {
        const ed = editorRef.current;
        if (!ed) return false;
        const model = ed.getModel();
        if (!model) return false;
        try {
          const regex = new RegExp(find, 'gm');
          const content = model.getValue();
          const newContent = content.replace(regex, replaceText);
          ed.executeEdits('replace-all', [
            { range: model.getFullModelRange(), text: newContent },
          ]);
          return true;
        } catch {
          return false;
        }
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
            fontFamily:
              '"Google Sans Mono", "Fira Code", Menlo, Monaco, monospace',
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
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
          }}
        />
      </div>
    );
  }
);
