import { useState } from 'react';

interface VerticalCalcProps {
  onInsert: (latex: string) => void;
}

type Op = '+' | '-' | '*' | '/';

function parse(expr: string): { a: string; op: Op; b: string } | null {
  const cleaned = expr.replace(/\s/g, '');
  const m = cleaned.match(/^(\d+)([+\-*/])(\d+)$/);
  if (!m) return null;
  return { a: m[1], op: m[2] as Op, b: m[3] };
}

// =========================================================================
// Core layout helpers — one character per cell, right-aligned
// =========================================================================

/** Place digits of `num` right-aligned in an array of length `dataWidth` */
function placeDigits(num: string, dataWidth: number): string[] {
  const pad = dataWidth - num.length;
  const cells: string[] = [];
  for (let i = 0; i < pad; i++) cells.push('');
  for (const ch of num) cells.push(ch);
  return cells;
}

/**
 * Build one row in the array.
 *
 *          totalCols = dataWidth + 1    ← column 0 = operator column
 *          data columns span 1 … dataWidth
 *
 * @param num     The number to place.
 * @param op      Operator to put in column 0 (empty string for none).
 * @param dataWidth  How many data columns exist.
 * @param shift   0 = rightmost digit at last data column.
 *               1 = rightmost digit shifted one column left, etc.
 */
function makeRow(
  num: string,
  op: string,
  dataWidth: number,
  shift = 0,
): string[] {
  const cols = dataWidth + 1;
  const row = new Array(cols).fill('');
  if (op) row[0] = op;
  // rightmost digit of `num` goes at column (dataWidth - shift)
  const startCol = dataWidth - num.length - shift + 1;
  for (let i = 0; i < num.length; i++) {
    row[startCol + i] = num[i];
  }
  return row;
}

/** Emit a single array row as LaTeX: "  x & y & z \\\\" */
function renderRow(cells: string[]): string {
  return '  ' + cells.join(' & ') + ' \\\\';
}

function arrayPreamble(cols: number): string {
  return `\\begin{array}{${'r'.repeat(cols)}}`;
}

// =========================================================================
// Generators
// =========================================================================

// ---- 加法 / 减法 -----------------------------------------------------------
//
//   Expected output example (123 + 456):
//
//   \begin{array}{rrrr}
//      & 1 & 2 & 3 \\
//     +& 4 & 5 & 6 \\
//     \hline
//      & 5 & 7 & 9 \\
//   \end{array}

function generateAddSub(a: string, op: '+' | '-', b: string): string {
  const result =
    op === '+' ? (BigInt(a) + BigInt(b)).toString() : (BigInt(a) - BigInt(b)).toString();
  const dataW = Math.max(a.length, b.length, result.length);

  return (
    `${arrayPreamble(dataW + 1)}\n` +
    `${renderRow(makeRow(a, '', dataW))}\n` +
    `${renderRow(makeRow(b, op, dataW))}\n` +
    `  \\hline\n` +
    `${renderRow(makeRow(result, '', dataW))}\n` +
    `\\end{array}`
  );
}

// ---- 乘法 -----------------------------------------------------------
//
//   Expected output example (123 * 45):
//
//   \begin{array}{rrrrr}
//      &   & 1 & 2 & 3 \\
//      \times &   & 4 & 5 \\
//     \hline
//      &   & 6 & 1 & 5 \\
//      & 4 & 9 & 2 &   \\
//     \hline
//      & 5 & 5 & 3 & 5 \\
//   \end{array}

function generateMultiplication(a: string, b: string): string {
  const result = (BigInt(a) * BigInt(b)).toString();

  // Each digit of b produces a partial product, with increasing left shift
  const bDigits = b.split('').reverse();
  const partials: { value: string; shift: number }[] = [];
  for (let i = 0; i < bDigits.length; i++) {
    partials.push({
      value: (BigInt(a) * BigInt(bDigits[i])).toString(),
      shift: i,
    });
  }

  // Determine required data-column count
  let dataW = Math.max(a.length, b.length, result.length);
  for (const p of partials) {
    dataW = Math.max(dataW, p.value.length + p.shift);
  }

  const lines: string[] = [];
  lines.push(renderRow(makeRow(a, '', dataW)));
  lines.push(renderRow(makeRow(b, '\\times', dataW)));
  lines.push(`  \\hline`);

  if (partials.length > 1) {
    for (const p of partials) {
      lines.push(renderRow(makeRow(p.value, '', dataW, p.shift)));
    }
    lines.push(`  \\hline`);
  }

  lines.push(renderRow(makeRow(result, '', dataW)));

  return `${arrayPreamble(dataW + 1)}\n${lines.join('\n')}\n\\end{array}`;
}

// ---- 除法（长除法） -----------------------------------------------------------
//
//   Expected output example (1234 / 5):
//
//   \begin{array}{rrrrrr}
//      &   &   & 2 & 4 & 6 \\
//     \hline
//    5 & ) & 1 & 2 & 3 & 4 \\
//      &   & 1 & 0 &   &   \\
//     \hline
//      &   &   & 2 & 3 &   \\
//      &   &   & 2 & 0 &   \\
//     \hline
//      &   &   &   & 3 & 4 \\
//      &   &   &   & 3 & 0 \\
//     \hline
//      &   &   &   &   & 4 \\
//   \end{array}

interface Step {
  qDigit: string;
  qPos: number;
  curStr: string;
  curEnd: number;
  product: string;
  hasProduct: boolean;
}

function generateDivision(a: string, b: string): string {
  const quotient = (BigInt(a) / BigInt(b)).toString();
  const remainder = (BigInt(a) % BigInt(b)).toString();

  const dividend = a;
  const divisor = BigInt(b);
  const divLen = dividend.length;
  const totalCols = divLen + 2; // col0=divisor, col1=), cols 2.. = dividend

  // ---- Compute long-division steps ----
  const steps: Step[] = [];
  let build = '';
  let hasQuotient = false;

  for (let i = 0; i < divLen; i++) {
    build += dividend[i];
    const cur = BigInt(build);

    if (hasQuotient || cur >= divisor) {
      hasQuotient = true;

      if (cur >= divisor) {
        const q = (cur / divisor).toString();
        const prod = (BigInt(q) * divisor).toString();
        steps.push({
          qDigit: q,
          qPos: i,
          curStr: build,
          curEnd: i,
          product: prod,
          hasProduct: true,
        });
        build = (cur - BigInt(prod)).toString();
        if (build === '0') build = '';
      } else {
        steps.push({
          qDigit: '0',
          qPos: i,
          curStr: build,
          curEnd: i,
          product: '',
          hasProduct: false,
        });
      }
    }
  }

  // ---- Build LaTeX rows ----
  const lines: string[] = [];

  // Row 1: quotient
  const quotRow = new Array(totalCols).fill('');
  for (const s of steps) quotRow[s.qPos + 2] = s.qDigit;
  lines.push(renderRow(quotRow));
  lines.push('  \\hline');

  // Row 2: divisor + ) + dividend
  const divRow = new Array(totalCols).fill('');
  divRow[0] = b;
  divRow[1] = ')';
  for (let i = 0; i < divLen; i++) divRow[i + 2] = dividend[i];
  lines.push(renderRow(divRow));

  // ---- Steps: product → hline → bring-down / remainder ----
  for (let si = 0; si < steps.length; si++) {
    const s = steps[si];

    if (s.hasProduct) {
      const prodRow = new Array(totalCols).fill('');
      const prodEnd = s.curEnd + 2;
      const prodStart = prodEnd - s.product.length + 1;
      for (let pi = 0; pi < s.product.length; pi++) {
        prodRow[prodStart + pi] = s.product[pi];
      }
      lines.push(renderRow(prodRow));
      lines.push('  \\hline');
    }

    // Bring-down row: show curStr of the next step
    if (si < steps.length - 1) {
      const ns = steps[si + 1];
      const bringRow = new Array(totalCols).fill('');
      const bringEnd = ns.curEnd + 2;
      const bringStart = bringEnd - ns.curStr.length + 1;
      for (let bi = 0; bi < ns.curStr.length; bi++) {
        bringRow[bringStart + bi] = ns.curStr[bi];
      }
      lines.push(renderRow(bringRow));
    } else if (remainder !== '0') {
      // Final remainder
      const remRow = new Array(totalCols).fill('');
      const remEnd = totalCols - 1;
      const remStart = remEnd - remainder.length + 1;
      for (let ri = 0; ri < remainder.length; ri++) {
        remRow[remStart + ri] = remainder[ri];
      }
      lines.push(renderRow(remRow));
    }
  }

  return `${arrayPreamble(totalCols)}\n${lines.join('\n')}\n\\end{array}`;
}

// =========================================================================
// Facade
// =========================================================================

function generateLaTeX(a: string, op: Op, b: string): string {
  switch (op) {
    case '+':
    case '-':
      return generateAddSub(a, op, b);
    case '*':
      return generateMultiplication(a, b);
    case '/':
      return generateDivision(a, b);
  }
}

// =========================================================================
// Component
// =========================================================================

export function VerticalCalc({ onInsert }: VerticalCalcProps) {
  const [expr, setExpr] = useState('');
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = () => {
    const parsed = parse(expr);
    if (!parsed) {
      setError('无效的表达式，请使用格式：123 + 456');
      setPreview('');
      return;
    }
    setError('');
    const latex = generateLaTeX(parsed.a, parsed.op, parsed.b);
    setPreview(latex);
  };

  const handleInsert = () => {
    if (preview) {
      onInsert(`\n\\[\n${preview}\n\\]\n`);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        竖式计算
      </h3>

      <div className="flex gap-2">
        <input
          type="text"
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate(); }}
          placeholder="例如：123 + 456"
          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleGenerate}
          className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          生成
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

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
