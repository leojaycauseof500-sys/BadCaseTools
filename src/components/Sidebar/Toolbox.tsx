import { useState } from 'react';
import { VerticalCalc } from './VerticalCalc';
import { MatrixGen } from './MatrixGen';
import { SavedReplace } from './SavedReplace';

interface ToolboxProps {
  onInsert: (latex: string) => void;
  onReplaceAll: (find: string, replaceText: string) => boolean;
}

export function Toolbox({ onInsert, onReplaceAll }: ToolboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-full shrink-0">
      <div
        className={`overflow-hidden transition-all duration-200 border-r border-border bg-white ${
          open ? 'w-72' : 'w-0'
        }`}
      >
        <div className="w-72 h-full overflow-y-auto p-3 space-y-6">
          <div className="space-y-4">
            <VerticalCalc onInsert={onInsert} />
            <hr className="border-gray-200" />
            <MatrixGen onInsert={onInsert} />
            <hr className="border-gray-200" />
            <SavedReplace onReplace={onReplaceAll} />
          </div>
        </div>
      </div>

      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-6 h-full bg-white border-r border-border hover:bg-gray-50 transition-colors shrink-0 select-none"
        title={open ? '收起工具箱' : '展开工具箱'}
      >
        <span className="text-xs text-gray-400">
          {open ? '\u25C0' : '\u25B6'}
        </span>
      </button>
    </div>
  );
}
