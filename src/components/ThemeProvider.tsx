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

        // Apply color scheme - CSS variables will handle the rest
        const scheme = settings?.colorScheme || 'morandi';
        document.documentElement.setAttribute('data-color-scheme', scheme);

        // Body background now uses CSS variables via globals.css
        // Just ensure color properties are reset to inherit from CSS
        document.body.style.backgroundColor = '';
        document.body.style.color = '';
    }, [theme, settings?.colorScheme]);

    return <>{children}</>;
}
