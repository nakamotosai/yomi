'use client';

/**
 * 认证守卫组件
 * 用于保护需要登录的页面/功能
 */

import { useEffect } from 'react';
import { useUserStore } from '@/store/useUserStore';

interface AuthGuardProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    requireAuth?: boolean;
}

export function AuthGuard({ children, fallback, requireAuth = true }: AuthGuardProps) {
    const { user, isLoading, isInitialized, fetchUser } = useUserStore();

    useEffect(() => {
        if (!isInitialized) {
            fetchUser();
        }
    }, [isInitialized, fetchUser]);

    // 正在加载
    if (!isInitialized || isLoading) {
        return fallback || null;
    }

    // 需要登录但未登录
    if (requireAuth && !user) {
        return fallback || null;
    }

    return <>{children}</>;
}

/**
 * 用户头像/登录按钮组件
 */
interface UserAvatarProps {
    onLoginClick?: () => void;
    size?: number;
}

export function UserAvatar({ onLoginClick, size = 32 }: UserAvatarProps) {
    const { user, isLoading, isInitialized, fetchUser, logout } = useUserStore();

    useEffect(() => {
        if (!isInitialized) {
            fetchUser();
        }
    }, [isInitialized, fetchUser]);

    if (!isInitialized || isLoading) {
        return (
            <div
                className="rounded-full animate-pulse"
                style={{
                    width: size,
                    height: size,
                    background: 'var(--bg-muted)'
                }}
            />
        );
    }

    if (!user) {
        return (
            <button
                onClick={onLoginClick}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                    background: 'var(--accent-primary)',
                    color: '#fff'
                }}
            >
                登录
            </button>
        );
    }

    return (
        <div className="relative group">
            <button
                className="flex items-center gap-2 p-1 rounded-full transition-all"
                style={{
                    background: 'var(--bg-muted)',
                    border: '1px solid var(--border-default)'
                }}
            >
                {user.avatar_url ? (
                    <img
                        src={user.avatar_url}
                        alt={user.username || user.email}
                        className="rounded-full"
                        style={{ width: size, height: size }}
                    />
                ) : (
                    <div
                        className="rounded-full flex items-center justify-center font-medium"
                        style={{
                            width: size,
                            height: size,
                            background: 'var(--accent-primary)',
                            color: '#fff'
                        }}
                    >
                        {(user.username || user.email)[0].toUpperCase()}
                    </div>
                )}
            </button>

            {/* 下拉菜单 */}
            <div
                className="absolute right-0 top-full mt-2 w-48 py-2 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all"
                style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    boxShadow: 'var(--shadow-lg)'
                }}
            >
                <div
                    className="px-4 py-2 border-b"
                    style={{ borderColor: 'var(--border-default)' }}
                >
                    <p
                        className="font-medium truncate"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        {user.username || '用户'}
                    </p>
                    <p
                        className="text-sm truncate"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        {user.email}
                    </p>
                </div>
                <button
                    onClick={logout}
                    className="w-full px-4 py-2 text-left text-sm transition-colors hover:bg-[var(--hover-bg)]"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    退出登录
                </button>
            </div>
        </div>
    );
}
