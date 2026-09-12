import React from 'react';
import { Hash, X } from 'lucide-react';
import { getTagStyle } from '../utils/tagParser';

interface TagFilterBarProps {
  availableTags: { name: string; count: number }[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
}

export const TagFilterBar: React.FC<TagFilterBarProps> = ({
  availableTags,
  selectedTags,
  onToggleTag,
  onClearTags,
}) => {
  if (availableTags.length === 0) {
    return null;
  }

  const isAnySelected = selectedTags.length > 0;

  return (
    <div className="bg-white/80 border-b border-slate-200/80 px-4 lg:px-8 py-2 flex items-center gap-2 overflow-x-auto text-xs">
      <div className="flex items-center gap-1 text-slate-400 font-medium shrink-0 pr-1">
        <Hash className="w-3.5 h-3.5" />
        <span>标签筛选:</span>
      </div>

      <button
        onClick={onClearTags}
        className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
          !isAnySelected
            ? 'bg-slate-900 text-white shadow-xs'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
      >
        全部
      </button>

      {availableTags.map(({ name, count }) => {
        const isSelected = selectedTags.includes(name);
        const style = getTagStyle(name);

        return (
          <button
            key={name}
            onClick={() => onToggleTag(name)}
            className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
              isSelected
                ? `${style.bg} ${style.text} ${style.border} ring-2 ring-blue-500/40 font-bold shadow-xs scale-105`
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <span>#{name}</span>
            <span
              className={`text-[10px] px-1 py-0.2 rounded-full ${
                isSelected ? 'bg-white/70 text-slate-900' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}

      {isAnySelected && (
        <button
          onClick={onClearTags}
          className="shrink-0 flex items-center gap-1 text-slate-500 hover:text-red-600 px-2 py-1 rounded-md hover:bg-red-50 transition-colors ml-auto font-medium"
        >
          <X className="w-3 h-3" />
          <span>清除已选 ({selectedTags.length})</span>
        </button>
      )}
    </div>
  );
};
