'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

export default function FontManager() {
    const { settings } = useAppStore();

    useEffect(() => {
        const fontFamily = settings?.fontFamily || 'sans';
        document.body.setAttribute('data-font', fontFamily);
    }, [settings?.fontFamily]);

    return null;
}
