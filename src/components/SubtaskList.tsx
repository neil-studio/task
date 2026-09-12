import React, { useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { TaskTreeNode } from '../types/task';
import { extractTags, getTagStyle, stripTagsFromTitle } from '../utils/tagParser';

interface SubtaskListProps {
  subtasks: TaskTreeNode[];
  onToggleStatus: (taskId: string, currentStatus: 'needsAction' | 'completed') => void;
  onAddSubtask: (title: string) => Promise<void>;
  onDeleteSubtask: (taskId: string) => void;
}

export const SubtaskList: React.FC<SubtaskListProps> = ({
  subtasks,
  onToggleStatus,
  onAddSubtask,
  onDeleteSubtask,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setIsSubmitting(true);
      await onAddSubtask(newTitle.trim());
      setNewTitle('');
      setIsAdding(false);
    } catch (err) {
      console.error('Failed to add subtask', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-col gap-1.5 pl-1.5">
      {/* List of subtasks */}
      {subtasks.map((subtask) => {
        const isCompleted = subtask.status === 'completed';
        const subtaskTags = extractTags(subtask.title);
        const cleanTitle = stripTagsFromTitle(subtask.title) || subtask.title;

        return (
          <div
            key={subtask.id}
            className="group/sub flex items-start gap-2 py-1 px-1.5 rounded-md hover:bg-slate-50/80 transition-colors text-xs"
          >
            {/* Custom Checkbox */}
            <button
              type="button"
              onClick={() => onToggleStatus(subtask.id, subtask.status)}
              className={`mt-0.5 w-3.5 h-3.5 rounded-xs flex items-center justify-center border transition-all cursor-pointer ${
                isCompleted
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-slate-300 hover:border-blue-500 bg-white'
              }`}
            >
              {isCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </button>

            {/* Subtask Title & Tags */}
            <div className="flex-1 leading-snug">
              <span
                className={`transition-all ${
                  isCompleted
                    ? 'line-through text-slate-400'
                    : 'text-slate-700 font-medium'
                }`}
              >
                {cleanTitle}
              </span>

              {/* Subtask Tags */}
              {subtaskTags.length > 0 && (
                <div className="inline-flex gap-1 ml-1.5 align-middle">
                  {subtaskTags.map((tag) => {
                    const style = getTagStyle(tag);
                    return (
                      <span
                        key={tag}
                        className={`text-[10px] px-1.5 py-0.2 rounded-full border ${style.bg} ${style.text} ${style.border}`}
                      >
                        #{tag}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Delete subtask button */}
            <button
              type="button"
              onClick={() => onDeleteSubtask(subtask.id)}
              className="opacity-0 group-hover/sub:opacity-100 text-slate-400 hover:text-red-500 p-0.5 rounded transition-opacity"
              title="删除子任务"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        );
      })}

      {/* Inline Add Subtask form or trigger */}
      {isAdding ? (
        <form onSubmit={handleCreate} className="mt-1 flex items-center gap-1.5">
          <input
            type="text"
            autoFocus
            placeholder="输入子任务标题... (Enter 保存)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={isSubmitting}
            className="flex-1 text-xs bg-slate-50 border border-slate-300 rounded-md px-2 py-1 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsAdding(false);
                setNewTitle('');
              }
            }}
          />
          <button
            type="submit"
            disabled={isSubmitting || !newTitle.trim()}
            className="p-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            title="保存"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdding(false);
              setNewTitle('');
            }}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
            title="取消"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-blue-600 font-medium py-0.5 px-1 rounded-sm hover:bg-blue-50/60 transition-colors w-fit"
        >
          <Plus className="w-3 h-3" />
          <span>添加子任务</span>
        </button>
      )}
    </div>
  );
};
