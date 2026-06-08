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

function padRight(s: string, len: number): string {
  return s + ' '.repeat(Math.max(0, len - s.length));
}

function maxLen(...nums: string[]): number {
  return Math.max(...nums.map((n) => n.length));
}

function generateLaTeX(a: string, op: Op, b: string): string {
  switch (op) {
    case '+':
      return generateAddition(a, b);
    case '-':
      return generateSubtraction(a, b);
    case '*':
      return generateMultiplication(a, b);
    case '/':
      return generateDivision(a, b);
  }
}

function generateAddition(a: string, b: string): string {
  const result = (BigInt(a) + BigInt(b)).toString();
  const max_cols = Math.max(a.length, b.length, result.length) + 1;
  const latex = `\\begin{array}{r*{${max_cols}}}} \n`;
  const width = maxLen(a, b, result) + 1; // +1 for operator
  const opLine = padRight(`+ ${b}`, width);
  const line = '\\hline';
  const resLine = padRight(result, width);

  return latex + generateLaTexArrayRow(formatNumberArray(a, max_cols).split(''), max_cols) 
              + generateLaTexArrayRow(formatNumberArray(b, max_cols).split(''), max_cols)   
              +line
              + generateLaTexArrayRow(formatNumberArray(result, max_cols).split(''), max_cols)
              + '\\end{array}';
}

function generateLaTexArrayRow(nums: string[], width: number): string {
  return '  ' + nums.join('&') + '\\\\\n';
}

function formatNumberArray(num: number | string, width: number): string {
  let temp: number = Number(num);
  
  const resultArray: string[] = new Array(width).fill('0');

  if (temp === 0 && width > 0) {
    return resultArray.join('');
  }

  while (temp > 0 && width > 0) {
    const digit = temp % 10;
    temp = Math.floor(temp / 10);
    resultArray[--width] = digit.toString();
  }
  
  return resultArray.join('');
}


function generateSubtraction(a: string, b: string): string {
  const result = (BigInt(a) - BigInt(b)).toString();
  const width = maxLen(a, b, result) + 1;
  const opLine = padRight(`- ${b}`, width);
  const line = '\\hline';
  const resLine = padRight(result, width);

  return `\\begin{array}{r}\n  ${padRight(a, width)} \\\\\n  ${opLine} \\\\\n  ${line} \n  ${resLine}\n\\end{array}`;
}

function generateMultiplication(a: string, b: string): string {
  const result = (BigInt(a) * BigInt(b)).toString();
  const width = maxLen(a, b, result) + 1;
  const opLine = padRight(`\\times ${b}`, width);

  // Generate partial products (each digit of b times a)
  const partials: string[] = [];
  const bDigits = b.split('').reverse();
  for (let i = 0; i < bDigits.length; i++) {
    const part = (BigInt(a) * BigInt(bDigits[i])).toString();
    partials.push(part + '\\phantom{0}'.repeat(i));
  }

  const maxPartialWidth = Math.max(
    width,
    ...partials.map((p) => p.replace(/\\phantom\{0\}/g, '').length + (p.match(/\\phantom\{0\}/g)?.length ?? 0))
  );

  const lines: string[] = [];
  lines.push(`  ${padRight(a, maxPartialWidth)} \\\\`);
  lines.push(`  ${padRight(opLine, maxPartialWidth)} \\\\`);
  lines.push(`  \\hline`);

  if (partials.length > 1) {
    for (const p of partials) {
      lines.push(`  ${padRight(p, maxPartialWidth)} \\\\`);
    }
    lines.push(`  \\hline`);
  }

  lines.push(`  ${padRight(result, maxPartialWidth)}`);

  return `\\begin{array}{r}\n${lines.join('\n')}\n\\end{array}`;
}

function generateDivision(a: string, b: string): string {
  // Long division format: quotient on top, divisor ) dividend
  const quotient = (BigInt(a) / BigInt(b)).toString();
  const remainder = (BigInt(a) % BigInt(b)).toString();
  const width = a.length + 1;

  const lines: string[] = [];
  lines.push(`  ${padRight(quotient, width)} \\\\`);
  lines.push(`  ${b}\\overline{){a}} \\\\`);

  // Calculate step by step
  const dividend = a;
  const divisor = BigInt(b);
  let current = '';
  let qIndex = 0;

  for (let i = 0; i < dividend.length; i++) {
    current += dividend[i];
    const curNum = BigInt(current);
    if (curNum >= divisor || qIndex > 0) {
      const qDigit = (curNum / divisor).toString();
      const product = (BigInt(qDigit) * divisor).toString();
      const subResult = (curNum - BigInt(product)).toString();
      const indent = i + 1 - product.length;
      lines.push(`  ${' '.repeat(indent)}${product} \\\\`);
      lines.push(`  \\hline`);
      current = subResult === '0' ? '' : subResult;
      qIndex++;
    }
  }

  if (remainder !== '0') {
    lines.push(`  \\text{Remainder: }${remainder}`);
  }

  return `\\begin{array}{r}\n${lines.join('\n')}\n\\end{array}`;
}

export function VerticalCalc({ onInsert }: VerticalCalcProps) {
  const [expr, setExpr] = useState('');
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = () => {
    const parsed = parse(expr);
    if (!parsed) {
      setError('Invalid expression. Use format: 123 + 456');
      setPreview('');
      return;
    }
    setError('');
    const latex = generateLaTeX(parsed.a, parsed.op, parsed.b);
    setPreview(latex);
  };

  const handleInsert = () => {
    if (preview) {
      onInsert(`\n$$\n${preview}\n$$\n`);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Vertical Calculation
      </h3>

      <div className="flex gap-2">
        <input
          type="text"
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate(); }}
          placeholder="e.g. 123 + 456"
          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleGenerate}
          className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Generate
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
            Insert at Cursor
          </button>
        </>
      )}
    </div>
  );
}
