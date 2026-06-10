export interface CommandCompletion {
  label: string;
  insertText: string;
  detail: string;
}

export const COMMAND_COMPLETIONS: CommandCompletion[] = [
  {
    label: '/diff',
    insertText: '/diff ${1:expression}',
    detail: '求导',
  },
  {
    label: '/int',
    insertText: '/int ${1:expression}',
    detail: '积分',
  },
  {
    label: '/solve',
    insertText: '/solve ${1:equation}',
    detail: '求解方程',
  },
  {
    label: '/sim',
    insertText: '/sim ${1:expression}',
    detail: '化简 / 因式分解',
  },
  {
    label: '/mat',
    insertText: '/mat ${1:[[1,2],[3,4]]} ${2:inv|det|vals}',
    detail: '矩阵运算（inv / det / vals）',
  },
  {
    label: '/logic',
    insertText: '/logic ${1:expression}',
    detail: '命题逻辑化简',
  },
  {
    label: '/frac',
    insertText: '/frac ${1:expression}',
    detail: '分数精确计算',
  },
];
