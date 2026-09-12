import React, { useState, useEffect } from 'react';
import { Calendar, Hash, List, Sparkles, Trash2, X } from 'lucide-react';
import { GoogleTaskList, TaskStatus, TaskTreeNode } from '../types/task';
import { hasInProgressTag } from '../utils/tagParser';

interface TaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskLists: GoogleTaskList[];
  initialTaskListId: string;
  taskToEdit?: TaskTreeNode | null;
  parentTaskId?: string | null;
  rootTasksInList?: TaskTreeNode[];
  onSaveTask: (params: {
    id?: string;
    taskListId: string;
    title: string;
    notes?: string;
    due?: string;
    parent?: string;
    status?: TaskStatus;
  }) => Promise<void>;
  onDeleteTask?: (taskListId: string, taskId: string) => void;
}

const COMMON_TAGS = ['doing', 'urgent', 'feature', 'dev', 'review', 'life'];

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
  isOpen,
  onClose,
  taskLists,
  initialTaskListId,
  taskToEdit,
  parentTaskId,
  rootTasksInList = [],
  onSaveTask,
  onDeleteTask,
}) => {
  const [taskListId, setTaskListId] = useState(initialTaskListId);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [due, setDue] = useState('');
  const [parent, setParent] = useState<string | undefined>(undefined);
  const [statusMode, setStatusMode] = useState<'todo' | 'in_progress' | 'completed'>('todo');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        setTitle(taskToEdit.title || '');
        setNotes(taskToEdit.notes || '');
        setDue(taskToEdit.due ? taskToEdit.due.split('T')[0] : '');
        setParent(taskToEdit.parent || undefined);
        setTaskListId(initialTaskListId);

        if (taskToEdit.status === 'completed') {
          setStatusMode('completed');
        } else if (hasInProgressTag(taskToEdit.tags)) {
          setStatusMode('in_progress');
        } else {
          setStatusMode('todo');
        }
      } else {
        setTitle('');
        setNotes('');
        setDue('');
        setParent(parentTaskId || undefined);
        setTaskListId(initialTaskListId);
        setStatusMode('todo');
      }
    }
  }, [isOpen, taskToEdit, parentTaskId, initialTaskListId]);

  if (!isOpen) return null;

  const handleAppendTag = (tagName: string) => {
    const tagFormatted = `#${tagName}`;
    if (!title.includes(tagFormatted)) {
      setTitle((prev) => `${prev.trim()} ${tagFormatted}`.trim());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsSaving(true);
      let finalTitle = title.trim();
      let finalStatus: TaskStatus = 'needsAction';

      if (statusMode === 'completed') {
        finalStatus = 'completed';
      } else if (statusMode === 'in_progress') {
        finalStatus = 'needsAction';
        // Ensure #doing is in title if not already present
        if (!/#(doing|wip|in-progress|进行中)/i.test(finalTitle)) {
          finalTitle = `${finalTitle} #doing`;
        }
      } else {
        finalStatus = 'needsAction';
        // Strip in-progress tags if set to todo
        finalTitle = finalTitle
          .replace(/(?:^|\s)#(doing|wip|in-progress|进行中)/gi, '')
          .trim();
      }

      await onSaveTask({
        id: taskToEdit?.id,
        taskListId,
        title: finalTitle,
        notes: notes.trim(),
        due: due ? new Date(due).toISOString() : undefined,
        parent: parent || undefined,
        status: finalStatus,
      });

      onClose();
    } catch (err) {
      console.error('Failed to save task', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">
            {taskToEdit ? '编辑任务' : '新建任务'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {/* Task Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              任务标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="任务内容，如：完成看板核心功能 #feature #doing"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
            />

            {/* Quick Tag Recommendations */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs text-slate-500">
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Hash className="w-3 h-3" /> 快捷标签:
              </span>
              {COMMON_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleAppendTag(t)}
                  className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  #{t}
                </button>
              ))}
            </div>
          </div>

          {/* Notes / Details */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              详细备注
            </label>
            <textarea
              rows={3}
              placeholder="任务说明或补充信息..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all resize-none"
            />
          </div>

          {/* Grid: List, Due Date, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Target Task List */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <List className="w-3.5 h-3.5 text-slate-400" /> 所属任务清单
              </label>
              <select
                value={taskListId}
                onChange={(e) => setTaskListId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 font-medium"
              >
                {taskLists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> 截止日期
              </label>
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {/* Status Selector */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                状态分栏
              </label>
              <select
                value={statusMode}
                onChange={(e) =>
                  setStatusMode(
                    e.target.value as 'todo' | 'in_progress' | 'completed'
                  )
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 font-medium"
              >
                <option value="todo">⚪ 待办 (To Do)</option>
                <option value="in_progress">🟡 进行中 (In Progress)</option>
                <option value="completed">🟢 已完成 (Done)</option>
              </select>
            </div>

            {/* Parent Task Selector (Optional) */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                所属母任务 (可选)
              </label>
              <select
                value={parent || ''}
                onChange={(e) => setParent(e.target.value || undefined)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">无 (顶级主任务)</option>
                {rootTasksInList
                  .filter((rt) => rt.id !== taskToEdit?.id)
                  .map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      ↳ {rt.cleanTitle || rt.title}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100">
            {taskToEdit && onDeleteTask ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('确定要删除此任务吗？')) {
                    onDeleteTask(taskListId, taskToEdit.id);
                    onClose();
                  }
                }}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
              >
                <Trash2 className="w-4 h-4" />
                <span>删除任务</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSaving || !title.trim()}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                {isSaving ? '保存中...' : '保存任务'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
