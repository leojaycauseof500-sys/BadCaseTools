import MarkdownIt from 'markdown-it';
import markdownItKatex from 'markdown-it-katex';
import katex from 'katex';

// ---------------------------------------------------------------------------
// Minimal state interfaces (markdown-it does not export these types)
// ---------------------------------------------------------------------------

interface Token {
  type: string;
  tag: string;
  nesting: number;
  level: number;
  block: boolean;
  content: string;
  markup: string;
  map: [number, number] | null;
}

interface StateInline {
  src: string;
  pos: number;
  posMax: number;
  pending: string;
  push(type: string, tag: string, nesting: number): Token;
}

interface StateBlock {
  src: string;
  line: number;
  lineMax: number;
  bMarks: number[];   // line begin offsets
  eMarks: number[];   // line end offsets
  tShift: number[];   // first non-space offsets
  blkIndent: number;
  push(type: string, tag: string, nesting: number): Token;
  getLines(begin: number, end: number, indent: number, keepLastLF: boolean): string;
}

// ---------------------------------------------------------------------------
// Configure markdown-it + KaTeX (existing setup)
// ---------------------------------------------------------------------------

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
});

md.use(markdownItKatex, {
  throwOnError: false,
  errorColor: '#d93025',
});

md.renderer.rules.math_inline = (tokens, idx) => {
  return katex.renderToString(tokens[idx].content, {
    throwOnError: false,
    errorColor: '#d93025',
    displayMode: false,
  });
};

md.renderer.rules.math_block = (tokens, idx) => {
  return katex.renderToString(tokens[idx].content, {
    throwOnError: false,
    errorColor: '#d93025',
    displayMode: true,
  });
};

// ---------------------------------------------------------------------------
// Custom inline rule: \( ... \)  →  math_inline token (reuse existing renderer)
// ---------------------------------------------------------------------------

function mathInlineParen(state: StateInline, silent: boolean): boolean {
  // Must start with backslash
  if (state.src.charCodeAt(state.pos) !== 0x5c) return false;
  // Next char must be (
  if (state.src.charCodeAt(state.pos + 1) !== 0x28) return false;

  // Count preceding backslashes — odd count means \( is escaped (e.g. \\\()
  let escPos = state.pos - 1;
  let escCount = 0;
  while (escPos >= 0 && state.src.charCodeAt(escPos) === 0x5c) {
    escCount++;
    escPos--;
  }
  if (escCount % 2 === 1) return false;

  const start = state.pos + 2; // first char after \(

  // Search for matching \) with escape-aware scanning
  let match = start;
  let found = false;
  while ((match = state.src.indexOf('\\)', match)) !== -1) {
    let esc = match - 1;
    let c = 0;
    while (esc >= start && state.src.charCodeAt(esc) === 0x5c) {
      c++;
      esc--;
    }
    if (c % 2 === 1) {
      // Odd backslashes → \) is escaped; keep searching
      match += 2;
      continue;
    }
    found = true;
    break;
  }

  if (!found) return false;

  // Empty content — \(\) — treat as literal
  if (match === start) return false;

  if (!silent) {
    const token = state.push('math_inline', 'math', 0);
    token.markup = '\\(';
    token.content = state.src.slice(start, match);
  }

  state.pos = match + 2; // skip past \)
  return true;
}

// ---------------------------------------------------------------------------
// Custom block rule: \[ ... \]  →  math_block token (reuse existing renderer)
// ---------------------------------------------------------------------------

function mathBlockBracket(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
): boolean {
  let pos = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];

  if (pos + 2 > max) return false;
  if (state.src.slice(pos, pos + 2) !== '\\[') return false;

  pos += 2;
  let firstLine = state.src.slice(pos, max);

  if (silent) return true;

  let found = false;
  let lastLine = '';

  // Single-line: \] at the end of this line
  if (firstLine.trim().slice(-2) === '\\]') {
    firstLine = firstLine.trim().slice(0, -2);
    found = true;
  }

  let next: number;
  for (next = startLine; !found; ) {
    next++;
    if (next >= endLine) break;

    pos = state.bMarks[next] + state.tShift[next];
    const lineMax = state.eMarks[next];

    if (pos < lineMax && state.tShift[next] < state.blkIndent) {
      break;
    }

    if (state.src.slice(pos, lineMax).trim().slice(-2) === '\\]') {
      const lastPos = state.src.slice(0, lineMax).lastIndexOf('\\]');
      lastLine = state.src.slice(pos, lastPos);
      found = true;
    }
  }

  state.line = next + 1;

  const token = state.push('math_block', 'math', 0);
  token.block = true;
  token.content =
    (firstLine && firstLine.trim() ? firstLine + '\n' : '') +
    state.getLines(startLine + 1, next, state.tShift[startLine], true) +
    (lastLine && lastLine.trim() ? lastLine : '');
  token.map = [startLine, state.line];
  token.markup = '\\[';
  return true;
}

// ---------------------------------------------------------------------------
// Register the new rules BEFORE 'escape' in inline, AFTER 'math_block' in block
// ---------------------------------------------------------------------------

md.inline.ruler.before('escape', 'math_inline_paren', mathInlineParen);
md.block.ruler.after('math_block', 'math_block_bracket', mathBlockBracket, {
  alt: ['paragraph', 'reference', 'blockquote', 'list'],
});

// ---------------------------------------------------------------------------

export function renderMarkdown(source: string): string {
  return md.render(source);
}
