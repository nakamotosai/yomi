'use client';

/**
 * 用户状态管理 Store
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
    id: string;
    email: string;
    username: string | null;
    avatar_url: string | null;
}

interface UserState {
    user: User | null;
    isLoading: boolean;
    isInitialized: boolean;

    // Actions
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (email: string, password: string, username?: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    fetchUser: () => Promise<void>;
}

export const useUserStore = create<UserState>()(
    persist(
        (set, get) => ({
            user: null,
            isLoading: false,
            isInitialized: false,

            setUser: (user) => set({ user }),
            setLoading: (loading) => set({ isLoading: loading }),

            login: async (email, password) => {
                set({ isLoading: true });
                try {
                    const response = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password }),
                        credentials: 'include'
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        set({ isLoading: false });
                        return { success: false, error: data.error || '登录失败' };
                    }

                    set({ user: data.user, isLoading: false });
                    return { success: true };
                } catch (error) {
                    console.error('Login error:', error);
                    set({ isLoading: false });
                    return { success: false, error: '网络错误，请稍后重试' };
                }
            },

            register: async (email, password, username) => {
                set({ isLoading: true });
                try {
                    const response = await fetch('/api/auth/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password, username }),
                        credentials: 'include'
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        set({ isLoading: false });
                        return { success: false, error: data.error || '注册失败' };
                    }

                    set({ user: data.user, isLoading: false });
                    return { success: true };
                } catch (error) {
                    console.error('Register error:', error);
                    set({ isLoading: false });
                    return { success: false, error: '网络错误，请稍后重试' };
                }
            },

            logout: async () => {
                set({ isLoading: true });
                try {
                    await fetch('/api/auth/logout', {
                        method: 'POST',
                        credentials: 'include'
                    });
                } catch (error) {
                    console.error('Logout error:', error);
                }
                set({ user: null, isLoading: false });
            },

            fetchUser: async () => {
                // 避免重复请求
                if (get().isLoading) return;

                set({ isLoading: true });
                try {
                    const response = await fetch('/api/auth/me', {
                        credentials: 'include'
                    });

                    if (response.ok) {
                        const data = await response.json();
                        set({ user: data.user, isLoading: false, isInitialized: true });
                    } else {
                        set({ user: null, isLoading: false, isInitialized: true });
                    }
                } catch (error) {
                    console.error('Fetch user error:', error);
                    set({ user: null, isLoading: false, isInitialized: true });
                }
            }
        }),
        {
            name: 'yomi-user-store',
            partialize: (state) => ({
                // 只持久化用户信息，不持久化加载状态
                user: state.user
            })
        }
    )
);
