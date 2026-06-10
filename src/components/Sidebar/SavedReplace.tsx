import { useState, useCallback } from 'react';

interface ReplaceRule {
  id: string;
  name: string;
  find: string;
  replaceText: string;
}

const STORAGE_KEY = 'badcase-replace-rules';

function loadRules(): ReplaceRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ReplaceRule[]) : [];
  } catch {
    return [];
  }
}

function saveRules(rules: ReplaceRule[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

interface SavedReplaceProps {
  onReplace: (find: string, replaceText: string) => boolean;
}

export function SavedReplace({ onReplace }: SavedReplaceProps) {
  const [rules, setRules] = useState<ReplaceRule[]>(loadRules);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const persist = useCallback((next: ReplaceRule[]) => {
    setRules(next);
    saveRules(next);
  }, []);

  const updateRule = useCallback(
    (id: string, field: keyof ReplaceRule, value: string) => {
      const next = rules.map((r) => (r.id === id ? { ...r, [field]: value } : r));
      persist(next);
    },
    [rules, persist],
  );

  const addRule = useCallback(() => {
    persist([...rules, { id: newId(), name: '', find: '', replaceText: '' }]);
  }, [rules, persist]);

  const deleteRule = useCallback(
    (id: string) => {
      persist(rules.filter((r) => r.id !== id));
      setFeedback((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [rules, persist],
  );

  const handleApply = useCallback(
    (rule: ReplaceRule) => {
      if (!rule.find) {
        setFeedback((prev) => ({ ...prev, [rule.id]: '查找内容不能为空' }));
        return;
      }
      const ok = onReplace(rule.find, rule.replaceText);
      setFeedback((prev) => ({
        ...prev,
        [rule.id]: ok ? '已替换' : '正则表达式无效',
      }));
      if (ok) {
        setTimeout(() => {
          setFeedback((prev) => {
            const next = { ...prev };
            delete next[rule.id];
            return next;
          });
        }, 1500);
      }
    },
    [onReplace],
  );

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        正则替换
      </h3>

      {rules.map((rule) => (
        <div
          key={rule.id}
          className="border border-gray-200 rounded p-2 space-y-1.5"
        >
          <div className="flex gap-1">
            <input
              type="text"
              value={rule.name}
              onChange={(e) => updateRule(rule.id, 'name', e.target.value)}
              placeholder="名称"
              className="flex-1 px-1 py-0.5 text-xs border border-gray-300 rounded"
            />
            <button
              onClick={() => deleteRule(rule.id)}
              className="px-2 py-0.5 text-xs text-red-500 hover:text-red-700 shrink-0"
              title="删除此规则"
            >
              删除
            </button>
          </div>

          <div className="flex gap-1">
            <input
              type="text"
              value={rule.find}
              onChange={(e) => updateRule(rule.id, 'find', e.target.value)}
              placeholder="正则查找"
              className="flex-1 px-1 py-0.5 text-xs border border-gray-300 rounded font-mono"
            />
            <input
              type="text"
              value={rule.replaceText}
              onChange={(e) => updateRule(rule.id, 'replaceText', e.target.value)}
              placeholder="替换为"
              className="flex-1 px-1 py-0.5 text-xs border border-gray-300 rounded font-mono"
            />
          </div>

          <div className="flex items-center justify-between">
            {feedback[rule.id] ? (
              <span
                className={`text-xs ${
                  feedback[rule.id] === '已替换'
                    ? 'text-green-500'
                    : 'text-red-500'
                }`}
              >
                {feedback[rule.id]}
              </span>
            ) : (
              <span />
            )}
            <button
              onClick={() => handleApply(rule)}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              一键替换
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={addRule}
        className="w-full px-3 py-1 text-xs border border-dashed border-gray-300 text-gray-500 rounded hover:border-gray-400 hover:text-gray-600 transition-colors"
      >
        + 新增规则
      </button>
    </div>
  );
}
