'use client';

import React, { useEffect, ReactNode } from 'react';
import { useAppStore } from '@/store/useAppStore';

interface ThemeProviderProps {
    children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    const settings = useAppStore(state => state.settings);
    const theme = settings?.theme || 'light';

    useEffect(() => {
        // Apply theme to document root
        document.documentElement.setAttribute('data-theme', theme);

        // Also update body background for immediate visual feedback
        if (theme === 'dark') {
            document.body.style.backgroundColor = '#0d1117';
            document.body.style.color = '#f0f6fc';
        } else {
            document.body.style.backgroundColor = '#f8fafc';
            document.body.style.color = '#1e293b';
        }
    }, [theme]);

    return <>{children}</>;
}
