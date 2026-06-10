import { forwardRef, useRef, useImperativeHandle, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor, IRange } from 'monaco-editor';
import { LATEX_COMPLETIONS } from '../../utils/latexCompletions';
import { COMMAND_COMPLETIONS } from '../../utils/commandCompletions';
import { executeCommand, isBlockCommand } from '../../utils/pyodideEngine';

export interface MonacoEditorHandle {
  insertText: (text: string) => void;
  getSelectedText: () => string;
  replaceAll: (find: string, replaceText: string) => boolean;
  runCurrentLine: () => Promise<void>;
}

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
}

let configDone = false;

function getCurrentLine(inst: editor.IStandaloneCodeEditor): {
  text: string;
  lineNumber: number;
  range: IRange;
} | null {
  const pos = inst.getPosition();
  if (!pos) return null;
  const model = inst.getModel();
  if (!model) return null;
  const lineNumber = pos.lineNumber;
  const text = model.getLineContent(lineNumber).trim();
  const range: IRange = {
    startLineNumber: lineNumber,
    startColumn: 1,
    endLineNumber: lineNumber,
    endColumn: model.getLineMaxColumn(lineNumber),
  };
  return { text, lineNumber, range };
}

function parseCommand(text: string): { cmd: string; args: string } | null {
  const m = text.match(/^\/(\w+)\s+(.*)$/);
  if (!m) return null;
  return { cmd: m[1], args: m[2] };
}

export const MonacoEditor = forwardRef<MonacoEditorHandle, MonacoEditorProps>(
  function MonacoEditor({ value, onChange }, ref) {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    const handleMount: OnMount = useCallback((inst, monaco) => {
      editorRef.current = inst;
      inst.focus();

      if (!configDone) {
        configDone = true;

        // ---- LaTeX 补全 ( \ ) ----
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

        // ---- 命令补全 ( / ) ----
        monaco.languages.registerCompletionItemProvider('markdown', {
          triggerCharacters: ['/'],
          provideCompletionItems: (model, position) => {
            const textUntilPosition = model.getValueInRange({
              startLineNumber: position.lineNumber,
              startColumn: 1,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            });

            const lineStart =
              textUntilPosition.lastIndexOf('\n') + 1;
            const lineContent = textUntilPosition.slice(lineStart);
            const m = lineContent.match(/^\/\w*$/);
            if (!m) return { suggestions: [] };

            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: lineStart + 1,
              endColumn: position.column,
            };

            return {
              suggestions: COMMAND_COMPLETIONS.map((cmd) => ({
                label: cmd.label,
                kind: monaco.languages.CompletionItemKind.Method,
                insertText: cmd.insertText,
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                detail: cmd.detail,
                range,
              })),
            };
          },
        });

        // ---- Ctrl+Enter 运行命令 ----
        inst.addAction({
          id: 'run-calc-command',
          label: '运行计算命令',
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
          run: (ed: editor.IStandaloneCodeEditor) => {
            const line = getCurrentLine(ed);
            if (!line) return;
            const parsed = parseCommand(line.text);
            if (!parsed) return;

            const { cmd, args } = parsed;

            // 替换为“计算中...”
            ed.executeEdits('run-command', [
              {
                range: line.range,
                text: '计算中...',
              },
            ]);

            executeCommand(cmd, args)
              .then((latex) => {
                const wrap = isBlockCommand(cmd)
                  ? `\\[\n${latex}\n\\]`
                  : `\\( ${latex} \\)`;

                const pos = ed.getPosition();
                if (!pos) return;
                const model = ed.getModel();
                if (!model) return;
                // 检查当前行是否仍是“计算中...”
                const curLine = model.getLineContent(pos.lineNumber);
                if (curLine.trim() === '计算中...') {
                  ed.executeEdits('run-command', [
                    {
                      range: {
                        startLineNumber: pos.lineNumber,
                        startColumn: 1,
                        endLineNumber: pos.lineNumber,
                        endColumn: model.getLineMaxColumn(pos.lineNumber),
                      },
                      text: wrap,
                    },
                  ]);
                } else {
                  // 当前行已被修改，直接替换整行
                  const newRange = {
                    startLineNumber: pos.lineNumber,
                    startColumn: 1,
                    endLineNumber: pos.lineNumber,
                    endColumn: model.getLineMaxColumn(pos.lineNumber),
                  };
                  ed.executeEdits('run-command', [
                    { range: newRange, text: wrap },
                  ]);
                }
              })
              .catch((err: Error) => {
                const errMsg = `\\( \\text{错误: } ${err.message.replace(/[\\{}]/g, '')} \\)`;
                ed.executeEdits('run-command', [
                  { range: line.range, text: errMsg },
                ]);
              });
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
      runCurrentLine: async () => {
        const ed = editorRef.current;
        if (!ed) return;
        const line = getCurrentLine(ed);
        if (!line) return;
        const parsed = parseCommand(line.text);
        if (!parsed) return;

        ed.executeEdits('run-command', [
          { range: line.range, text: '计算中...' },
        ]);
        try {
          const latex = await executeCommand(parsed.cmd, parsed.args);
          const wrap = isBlockCommand(parsed.cmd)
            ? `\\[\n${latex}\n\\]`
            : `\\( ${latex} \\)`;
          const pos = ed.getPosition();
          if (!pos) return;
          const model = ed.getModel();
          if (!model) return;
          const curLine = model.getLineContent(pos.lineNumber);
          const replaceTarget =
            curLine.trim() === '计算中...'
              ? {
                  startLineNumber: pos.lineNumber,
                  startColumn: 1,
                  endLineNumber: pos.lineNumber,
                  endColumn: model.getLineMaxColumn(pos.lineNumber),
                }
              : line.range;
          ed.executeEdits('run-command', [
            { range: replaceTarget, text: wrap },
          ]);
        } catch (err: any) {
          const errMsg = `\\( \\text{错误: } ${(err?.message ?? String(err)).replace(/[\\{}]/g, '')} \\)`;
          ed.executeEdits('run-command', [
            { range: line.range, text: errMsg },
          ]);
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
