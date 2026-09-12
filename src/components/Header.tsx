import React, { useState } from 'react';
import {
  CheckSquare,
  Columns,
  FolderPlus,
  ListFilter,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { GoogleTaskList, KanbanViewMode } from '../types/task';
import { AuthState } from '../types/auth';

interface HeaderProps {
  taskLists: GoogleTaskList[];
  selectedListId: string;
  onSelectListId: (id: string) => void;
  viewMode: KanbanViewMode;
  onChangeViewMode: (mode: KanbanViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
  onOpenNewTask: () => void;
  onOpenSettings: () => void;
  authState: AuthState;
  onCreateList: (title: string) => Promise<void>;
  onRenameList: (id: string, newTitle: string) => Promise<void>;
  onDeleteList: (id: string) => Promise<void>;
}

export const Header: React.FC<HeaderProps> = ({
  taskLists,
  selectedListId,
  onSelectListId,
  viewMode,
  onChangeViewMode,
  searchQuery,
  onSearchChange,
  isLoading,
  onRefresh,
  onOpenNewTask,
  onOpenSettings,
  authState,
  onCreateList,
  onRenameList,
  onDeleteList,
}) => {
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  const handleCreateListSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    try {
      await onCreateList(newListName.trim());
      setNewListName('');
      setIsCreatingList(false);
    } catch (err) {
      alert('创建清单失败，请检查网络或授权');
    }
  };

  const handleRenameCurrent = async () => {
    const current = taskLists.find((l) => l.id === selectedListId);
    if (!current) return;
    const next = prompt('请输入新的清单名称：', current.title);
    if (next && next.trim() && next.trim() !== current.title) {
      await onRenameList(current.id, next.trim());
    }
  };

  const handleDeleteCurrent = async () => {
    const current = taskLists.find((l) => l.id === selectedListId);
    if (!current) return;
    if (
      confirm(
        `确定要删除清单「${current.title}」吗？\n此操作将同步在 Google Tasks 中删除该清单及其所有任务。`
      )
    ) {
      await onDeleteList(current.id);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 lg:px-8 py-3 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Brand & List Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                  Google Tasks
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                  看板增强版
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                子母任务 · 树状折叠 · #标签体系
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1" />

          {/* List Selector (active in status mode) */}
          {viewMode === 'status' && (
            <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
              <div className="relative">
                <select
                  value={selectedListId}
                  onChange={(e) => onSelectListId(e.target.value)}
                  className="appearance-none bg-transparent hover:bg-slate-200/60 transition-colors text-slate-800 text-xs font-semibold rounded-lg pl-2.5 pr-7 py-1 focus:outline-hidden cursor-pointer"
                >
                  {taskLists.map((list) => (
                    <option key={list.id} value={list.id}>
                      📋 {list.title}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-500">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>

              {/* Rename List */}
              <button
                type="button"
                onClick={handleRenameCurrent}
                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-white rounded-md transition-colors"
                title="重命名当前清单"
              >
                <Pencil className="w-3 h-3" />
              </button>

              {/* Delete List */}
              {taskLists.length > 1 && (
                <button
                  type="button"
                  onClick={handleDeleteCurrent}
                  className="p-1 text-slate-500 hover:text-red-600 hover:bg-white rounded-md transition-colors"
                  title="删除当前清单"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}

              {/* Add New List */}
              <button
                type="button"
                onClick={() => setIsCreatingList(true)}
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-white px-2 py-1 rounded-md transition-colors border-l border-slate-200"
                title="新建 Google 任务清单"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">新建清单</span>
              </button>
            </div>
          )}

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-xs font-medium">
            <button
              onClick={() => onChangeViewMode('status')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                viewMode === 'status'
                  ? 'bg-white text-blue-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="待办 / 进行中 / 已完成"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>状态分栏</span>
            </button>
            <button
              onClick={() => onChangeViewMode('list')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-blue-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="按 Google 任务清单并排分栏"
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>清单并排</span>
            </button>
          </div>
        </div>

        {/* Right: Search, Actions, Settings */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Bar */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索任务或 #标签..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full sm:w-48 md:w-56 text-xs bg-slate-100/90 hover:bg-slate-100 focus:bg-white text-slate-800 rounded-lg pl-8 pr-3 py-1.5 border border-slate-200 transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
            title="刷新同步最新任务"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`}
            />
          </button>

          {/* New Task button */}
          <button
            onClick={onOpenNewTask}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm shadow-blue-500/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新建任务</span>
          </button>

          {/* Settings button with auth status badge */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors text-xs font-medium"
            title="应用设置与 Google 账号"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            {authState.isDemoMode ? (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                <Sparkles className="w-3 h-3" />
                Demo 模式
              </span>
            ) : authState.isAuthenticated ? (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                <UserCheck className="w-3 h-3" />
                已连接
              </span>
            ) : (
              <span className="hidden sm:inline-flex text-[11px] font-medium text-slate-500">
                未登录
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Inline Modal to Create New List */}
      {isCreatingList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-blue-600" />
              <span>新建 Google 任务清单</span>
            </h3>
            <form onSubmit={handleCreateListSubmit} className="space-y-4">
              <input
                type="text"
                autoFocus
                required
                placeholder="清单名称（如：读书清单、家庭采购...）"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 font-medium"
              />
              <div className="flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsCreatingList(false)}
                  className="px-3 py-1.5 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!newListName.trim()}
                  className="px-4 py-1.5 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-500/20 disabled:opacity-50"
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
