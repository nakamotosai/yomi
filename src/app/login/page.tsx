'use client';

/**
 * 登录/注册页面
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';
import { useAppStore } from '@/store/useAppStore';
import { Mail, Lock, User, ArrowLeft, Loader2 } from 'lucide-react';

type AuthMode = 'login' | 'register';

export default function LoginPage() {
    const router = useRouter();
    const { login, register, isLoading } = useUserStore();
    const { settings } = useAppStore();
    const isDark = settings.theme === 'dark';

    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        let result;
        if (mode === 'login') {
            result = await login(email, password);
        } else {
            result = await register(email, password, username || undefined);
        }

        if (result.success) {
            router.push('/');
        } else {
            setError(result.error || '操作失败');
        }
    };

    const toggleMode = () => {
        setMode(mode === 'login' ? 'register' : 'login');
        setError('');
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            data-theme={isDark ? 'dark' : 'light'}
            style={{ background: 'var(--bg-base)' }}
        >
            <div className="w-full max-w-md">
                {/* 返回按钮 */}
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-2 mb-8 transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                >
                    <ArrowLeft size={20} />
                    <span>返回首页</span>
                </button>

                {/* 卡片 */}
                <div
                    className="glass-card p-8"
                    style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        boxShadow: 'var(--shadow-lg)'
                    }}
                >
                    {/* Logo 和标题 */}
                    <div className="text-center mb-8">
                        <h1
                            className="text-3xl font-bold mb-2"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            読み
                        </h1>
                        <p style={{ color: 'var(--text-muted)' }}>
                            {mode === 'login' ? '欢迎回来' : '创建新账号'}
                        </p>
                    </div>

                    {/* 表单 */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* 用户名（仅注册） */}
                        {mode === 'register' && (
                            <div className="relative">
                                <User
                                    className="absolute left-3 top-1/2 -translate-y-1/2"
                                    size={20}
                                    style={{ color: 'var(--text-muted)' }}
                                />
                                <input
                                    type="text"
                                    placeholder="用户名（可选）"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl transition-all"
                                    style={{
                                        background: 'var(--bg-muted)',
                                        border: '1px solid var(--border-default)',
                                        color: 'var(--text-primary)',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        )}

                        {/* 邮箱 */}
                        <div className="relative">
                            <Mail
                                className="absolute left-3 top-1/2 -translate-y-1/2"
                                size={20}
                                style={{ color: 'var(--text-muted)' }}
                            />
                            <input
                                type="email"
                                placeholder="邮箱"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full pl-10 pr-4 py-3 rounded-xl transition-all"
                                style={{
                                    background: 'var(--bg-muted)',
                                    border: '1px solid var(--border-default)',
                                    color: 'var(--text-primary)',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        {/* 密码 */}
                        <div className="relative">
                            <Lock
                                className="absolute left-3 top-1/2 -translate-y-1/2"
                                size={20}
                                style={{ color: 'var(--text-muted)' }}
                            />
                            <input
                                type="password"
                                placeholder="密码"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full pl-10 pr-4 py-3 rounded-xl transition-all"
                                style={{
                                    background: 'var(--bg-muted)',
                                    border: '1px solid var(--border-default)',
                                    color: 'var(--text-primary)',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        {/* 错误提示 */}
                        {error && (
                            <div
                                className="p-3 rounded-lg text-sm"
                                style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    color: '#ef4444',
                                    border: '1px solid rgba(239, 68, 68, 0.2)'
                                }}
                            >
                                {error}
                            </div>
                        )}

                        {/* 提交按钮 */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                            style={{
                                background: 'var(--accent-primary)',
                                color: isDark ? '#fff' : '#fff',
                                opacity: isLoading ? 0.7 : 1
                            }}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    处理中...
                                </>
                            ) : (
                                mode === 'login' ? '登录' : '注册'
                            )}
                        </button>

                        {/* 首次加载提示 */}
                        {isLoading && (
                            <div className="mt-3 text-center text-xs animate-pulse" style={{ color: 'var(--text-muted)' }}>
                                <p>首次登录可能需要几十秒唤醒数据库，请耐心等待...</p>
                            </div>
                        )}
                    </form>

                    {/* 切换模式 */}
                    <div className="mt-6 text-center">
                        <button
                            onClick={toggleMode}
                            className="text-sm transition-colors hover:underline"
                            style={{ color: 'var(--accent-primary)' }}
                        >
                            {mode === 'login'
                                ? '还没有账号？立即注册'
                                : '已有账号？立即登录'
                            }
                        </button>
                    </div>

                    {/* 分割线 */}
                    <div className="mt-6 flex items-center gap-4">
                        <div className="flex-1 h-px" style={{ background: 'var(--border-default)' }} />
                        <span className="text-sm" style={{ color: 'var(--text-faint)' }}>
                            或者
                        </span>
                        <div className="flex-1 h-px" style={{ background: 'var(--border-default)' }} />
                    </div>

                    {/* 第三方登录（预留 Google） */}
                    <button
                        type="button"
                        disabled
                        className="mt-4 w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-3 opacity-50 cursor-not-allowed"
                        style={{
                            background: 'var(--bg-muted)',
                            border: '1px solid var(--border-default)',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="currentColor"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        使用 Google 登录（即将推出）
                    </button>
                </div>

                {/* 底部提示 */}
                <p
                    className="mt-6 text-center text-sm"
                    style={{ color: 'var(--text-faint)' }}
                >
                    登录即表示您同意我们的服务条款和隐私政策
                </p>
            </div>
        </div>
    );
}
