import React, { useState, useEffect } from 'react';
import {
  Check,
  ExternalLink,
  HelpCircle,
  Key,
  LogIn,
  LogOut,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { AuthState } from '../types/auth';
import {
  getStoredClientId,
  loginWithGoogle,
  logoutGoogle,
  setDemoMode,
  setStoredClientId,
} from '../services/googleAuth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  authState: AuthState;
  onAuthStateChange: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  authState,
  onAuthStateChange,
}) => {
  const [clientId, setClientId] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setClientId(getStoredClientId());
      setIsSaved(false);
      setAuthError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    setStoredClientId(clientId);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
    onAuthStateChange();
  };

  const handleLogin = async () => {
    setAuthError(null);
    setIsLoggingIn(true);
    try {
      if (!clientId.trim()) {
        throw new Error('请先输入并保存 Google Client ID');
      }
      setStoredClientId(clientId);
      await loginWithGoogle();
      onAuthStateChange();
    } catch (err: any) {
      setAuthError(err?.message || '登录失败，请检查网络或配置');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    logoutGoogle();
    onAuthStateChange();
  };

  const handleToggleDemo = (checked: boolean) => {
    setDemoMode(checked);
    onAuthStateChange();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">
              设置与 Google 账号授权
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs text-slate-700 max-h-[80vh] overflow-y-auto">
          {/* Demo Mode Toggle Banner */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-slate-800 text-xs">
                  离线演示模式 (Demo Mode)
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  开启后可直接体验全部看板拖拽、子母任务折叠与标签过滤，无需连接真实 Google 账号。
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={authState.isDemoMode}
                onChange={(e) => handleToggleDemo(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* Google Client ID Form */}
          <form onSubmit={handleSaveClientId} className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                  <span>Google OAuth 2.0 Client ID</span>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-medium">
                    仅保存在本地
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowHelp(!showHelp)}
                  className="text-blue-600 hover:text-blue-700 text-[11px] flex items-center gap-1 font-medium"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>如何获取 Client ID？</span>
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="例如: 123456789-abcdef.apps.googleusercontent.com"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 font-mono"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-colors shrink-0 flex items-center gap-1"
                >
                  {isSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>已保存</span>
                    </>
                  ) : (
                    <span>保存</span>
                  )}
                </button>
              </div>
            </div>

            {/* Help / Setup Guide Accordion */}
            {showHelp && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-[11px] space-y-2 text-slate-600 leading-relaxed">
                <p className="font-semibold text-slate-800">
                  Google Cloud Console 配置步骤：
                </p>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>
                    进入{' '}
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
                    >
                      Google Cloud 凭据页面
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </li>
                  <li>
                    创建「OAuth 客户端 ID」，应用类型选择「
                    <strong>Web 应用程序</strong>」
                  </li>
                  <li>
                    在「已获授权的 JavaScript 来源」中添加你的部署域，例如：
                    <code className="block my-1 bg-white p-1 rounded border border-slate-200 select-all font-mono text-[10px] text-slate-800">
                      http://localhost:5173{'\n'}
                      https://&lt;你的GitHub用户名&gt;.github.io
                    </code>
                  </li>
                  <li>启用「Google Tasks API」服务</li>
                  <li>复制生成的 Client ID 粘贴到上方输入框并保存即可。</li>
                </ol>
              </div>
            )}
          </form>

          {/* Account Auth Actions */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <h4 className="font-semibold text-slate-800 text-xs">
              Google 账号授权状态
            </h4>

            {authError && (
              <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-xs leading-relaxed">
                {authError}
              </div>
            )}

            {authState.isAuthenticated ? (
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-emerald-800">
                    已连接 Google Tasks API
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 hover:text-red-700 bg-white rounded-lg border border-red-200 hover:bg-red-50 transition-colors font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>退出连接</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isLoggingIn ? '正在授权...' : '使用 Google 账号登录同步'}</span>
                </button>
                <p className="text-[11px] text-slate-500 text-center">
                  将调用官方 Google Identity Services 授权访问任务清单
                </p>
              </div>
            )}
          </div>

          {/* Security Guarantee Note */}
          <div className="bg-slate-50 rounded-xl p-3 flex items-start gap-2.5 text-slate-500 text-[11px] leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              本项目为纯静态单页 Web 应用，零后端服务器。所有数据及 Client ID 均仅存储于你的本地浏览器中，绝不收集或上传任何个人隐私与任务数据。
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
