import { useState, useCallback } from 'react';

interface MatrixGenProps {
  onInsert: (latex: string) => void;
}

const MATRIX_STYLES = [
  { label: 'pmatrix ( )', value: 'pmatrix', left: '(', right: ')' },
  { label: 'bmatrix [ ]', value: 'bmatrix', left: '[', right: ']' },
  { label: 'Bmatrix { }', value: 'Bmatrix', left: '{', right: '}' },
  { label: 'vmatrix | |', value: 'vmatrix', left: '|', right: '|' },
  { label: 'Vmatrix || ||', value: 'Vmatrix', left: '||', right: '||' },
];

function generateMatrix(
  rows: number,
  cols: number,
  values: string[][],
  style: string,
): string {
  const lines: string[] = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push(values[r]?.[c] ?? '0');
    }
    lines.push(`  ${row.join(' & ')} \\\\`);
  }
  return `\\begin{${style}}\n${lines.join('\n')}\n\\end{${style}}`;
}

export function MatrixGen({ onInsert }: MatrixGenProps) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [values, setValues] = useState<string[][]>(
    Array.from({ length: 3 }, () => Array(3).fill('0')),
  );
  const [style, setStyle] = useState('pmatrix');
  const [preview, setPreview] = useState('');

  const resizeMatrix = useCallback(
    (newRows: number, newCols: number) => {
      const next = Array.from({ length: newRows }, (_, r) =>
        Array.from({ length: newCols }, (_, c) => values[r]?.[c] ?? '0'),
      );
      setValues(next);
      setRows(newRows);
      setCols(newCols);
    },
    [values],
  );

  const updateCell = useCallback(
    (r: number, c: number, val: string) => {
      const next = values.map((row) => [...row]);
      next[r][c] = val;
      setValues(next);
    },
    [values],
  );

  const handleGenerate = useCallback(() => {
    const latex = generateMatrix(rows, cols, values, style);
    setPreview(latex);
  }, [rows, cols, values, style]);

  const handleInsert = useCallback(() => {
    if (preview) {
      onInsert(`\n\\[\n${preview}\n\\]\n`);
    }
  }, [preview, onInsert]);

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        矩阵生成器
      </h3>

      {/* Dimensions */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1 text-xs text-gray-600">
          行
          <input
            type="number"
            min={1}
            max={10}
            value={rows}
            onChange={(e) => {
              const n = Math.max(1, Math.min(10, Number(e.target.value)));
              resizeMatrix(n, cols);
            }}
            className="w-12 px-1 py-0.5 text-xs border border-gray-300 rounded"
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-gray-600">
          列
          <input
            type="number"
            min={1}
            max={10}
            value={cols}
            onChange={(e) => {
              const n = Math.max(1, Math.min(10, Number(e.target.value)));
              resizeMatrix(rows, n);
            }}
            className="w-12 px-1 py-0.5 text-xs border border-gray-300 rounded"
          />
        </label>
        <select
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          className="text-xs border border-gray-300 rounded px-1 py-0.5"
        >
          {MATRIX_STYLES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Cell grid */}
      <div
        className="inline-grid gap-1"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: rows * cols }, (_, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          return (
            <input
              key={`${r}-${c}`}
              type="text"
              value={values[r]?.[c] ?? ''}
              onChange={(e) => updateCell(r, c, e.target.value)}
              className="w-14 px-1 py-1 text-xs text-center border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          );
        })}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleGenerate}
          className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          生成
        </button>
      </div>

      {preview && (
        <>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto whitespace-pre-wrap max-h-40 border border-gray-200">
            {preview}
          </pre>
          <button
            onClick={handleInsert}
            className="w-full px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            插入到光标处
          </button>
        </>
      )}
    </div>
  );
}
