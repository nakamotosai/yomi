'use client';

import { useEffect } from 'react';

export function ScrollManager() {
    useEffect(() => {
        // WeakMap to store timeouts for each element
        const timers = new WeakMap<EventTarget, NodeJS.Timeout>();

        const handleScroll = (e: Event) => {
            const target = e.target as HTMLElement;

            // Ensure target is an element and scrollable
            if (target && target.classList) {
                // Add active class
                target.classList.add('scroll-active');

                // Clear existing timer
                const existingTimer = timers.get(target);
                if (existingTimer) {
                    clearTimeout(existingTimer);
                }

                // Set new timer to remove class after 1s
                const timer = setTimeout(() => {
                    target.classList.remove('scroll-active');
                    timers.delete(target);
                }, 1000);

                timers.set(target, timer);
            }
        };

        // Capture scroll events globally
        window.addEventListener('scroll', handleScroll, { capture: true });

        return () => {
            window.removeEventListener('scroll', handleScroll, { capture: true });
        };
    }, []);

    return null;
}
