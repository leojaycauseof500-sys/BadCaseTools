import type { PyodideInterface } from 'pyodide';

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v314.0.0/full/';

let pyodide: PyodideInterface | null = null;
let initPromise: Promise<PyodideInterface> | null = null;

export async function getPyodide(): Promise<PyodideInterface> {
  if (pyodide) return pyodide;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { loadPyodide } = await import('pyodide');
    pyodide = await loadPyodide({
      indexURL: PYODIDE_CDN,
    });
    await pyodide.loadPackage(['sympy']);

    const pythonCode = `
from sympy import *
from sympy.parsing.sympy_parser import (
    parse_expr,
    standard_transformations,
    implicit_multiplication_application,
    convert_xor,
)
from sympy.logic import simplify_logic
from sympy import latex as sympy_latex
import sympy as sp
import json

_trans = standard_transformations + (
    implicit_multiplication_application,
    convert_xor,
)

def _to_expr(s):
    return parse_expr(s.replace('^', '**'), transformations=_trans)

def _auto_var(expr):
    free = list(expr.free_symbols)
    if len(free) == 1:
        return free[0]
    return sp.Symbol('x')

def _to_latex(obj):
    return sympy_latex(obj)

def cmd_diff(args_str):
    parts = args_str.rsplit(None, 1)
    var = sp.Symbol('x')
    if len(parts) == 2 and parts[1].isalpha():
        args_str = parts[0]
        var = sp.Symbol(parts[1])
    expr = _to_expr(args_str)
    result = diff(expr, var)
    return _to_latex(result)

def cmd_int(args_str):
    parts = args_str.rsplit(' ', 1)
    if ',' in parts[-1] and parts[0].count(',') == 0:
        limits = parts[-1]
        expr_str = parts[0]
    else:
        limits = ''
        expr_str = args_str

    expr = _to_expr(expr_str)
    var = _auto_var(expr)

    if limits:
        low, _, high = limits.partition(',')
        low_val = parse_expr(low.strip().replace('pi', 'sp.pi').replace('e', 'sp.E'),
                             transformations=_trans)
        high_val = parse_expr(high.strip().replace('pi', 'sp.pi').replace('e', 'sp.E'),
                              transformations=_trans)
        result = integrate(expr, (var, low_val, high_val))
    else:
        result = integrate(expr, var)
    return _to_latex(result)

def cmd_solve(args_str):
    eqs_strs = [s.strip() for s in args_str.split(',')]
    eqs = []
    for s in eqs_strs:
        s = s.replace('^', '**')
        if '=' in s:
            left, _, right = s.partition('=')
            left_expr = parse_expr(left.strip(), transformations=_trans)
            right_expr = parse_expr(right.strip(), transformations=_trans)
            eqs.append(sp.Eq(left_expr, right_expr))
        else:
            eqs.append(sp.Eq(parse_expr(s, transformations=_trans), 0))
    if len(eqs) == 1:
        sol = solve(eqs[0])
    else:
        vars_used = set()
        for e in eqs:
            vars_used.update(e.free_symbols)
        sol = solve(eqs, list(vars_used))
    if isinstance(sol, list):
        return r' \\quad '.join(_to_latex(s) for s in sol)
    return _to_latex(sol)

def cmd_sim(args_str):
    expr = _to_expr(args_str)
    if '/' in args_str.replace('^', ''):
        result = simplify(expr)
    else:
        result = factor(expr)
    return _to_latex(result)

def cmd_mat(args_str):
    bracket_end = args_str.rfind(']]')
    mat_str = args_str[:bracket_end + 2].strip()
    op = args_str[bracket_end + 2:].strip()

    M = eval(mat_str)
    M = sp.Matrix(M)

    if op == 'inv':
        result = M.inv()
    elif op == 'det':
        result = M.det()
    elif op == 'vals':
        result = M.eigenvals()
    else:
        result = M

    return _to_latex(result)

def cmd_logic(args_str):
    result = simplify_logic(args_str)
    return _to_latex(result)

def cmd_frac(args_str):
    expr = sp.sympify(args_str.replace('^', '**'))
    result = sp.simplify(expr)
    return _to_latex(result)
`;

    try {
      pyodide.runPython(pythonCode);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[Pyodide] Python 环境初始化失败:', msg);
      throw e;
    }

    return pyodide;
  })();

  return initPromise;
}

// ---------------------------------------------------------------------------
// 命令分发
// ---------------------------------------------------------------------------

const COMMAND_MAP: Record<string, string> = {
  diff: 'cmd_diff',
  int: 'cmd_int',
  solve: 'cmd_solve',
  sim: 'cmd_sim',
  mat: 'cmd_mat',
  logic: 'cmd_logic',
  frac: 'cmd_frac',
};

export interface CommandResult {
  latex: string;
  isBlock: boolean; // true → \[...\], false → \(...\)
}

export async function executeCommand(
  cmd: string,
  args: string,
): Promise<string> {
  const py = await getPyodide();
  const fnName = COMMAND_MAP[cmd];
  if (!fnName) throw new Error(`未知命令: /${cmd}`);

  const fn = py.globals.get(fnName);
  if (!fn) throw new Error(`Pyodide 环境中未找到函数: ${fnName}`);

  const raw = fn(args);
  return String(raw);
}

export function isBlockCommand(cmd: string): boolean {
  return cmd === 'mat';
}
