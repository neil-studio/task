import React from 'react';
import {
  CheckSquare,
  Columns,
  ListFilter,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
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
}) => {
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
            <div className="relative">
              <select
                value={selectedListId}
                onChange={(e) => onSelectListId(e.target.value)}
                className="appearance-none bg-slate-100/90 hover:bg-slate-200/80 transition-colors text-slate-800 text-xs font-semibold rounded-lg pl-3 pr-8 py-1.5 border border-slate-200/80 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
              >
                {taskLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    📋 {list.title}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
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
            title="刷新数据"
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
    </header>
  );
};
