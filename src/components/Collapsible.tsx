
import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

export type AnimationVariant = 'default' | 'blur' | 'spring' | 'fade';

interface CollapsibleProps {
    isOpen: boolean;
    children: React.ReactNode;
    variant?: AnimationVariant;
    className?: string;
}

const variants: Record<AnimationVariant, Variants> = {
    default: {
        initial: { height: 0, opacity: 0, overflow: 'hidden' },
        animate: {
            height: 'auto',
            opacity: 1,
            transition: {
                height: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }, // Smooth easing
                opacity: { duration: 0.3, ease: 'linear', delay: 0.1 } // Fade in slightly after height starts
            }
        },
        exit: {
            height: 0,
            opacity: 0,
            transition: {
                height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                opacity: { duration: 0.2, ease: 'linear' } // Fade out quickly before height finishes
            }
        }
    },
    blur: {
        initial: { height: 0, opacity: 0, filter: 'blur(10px)', scale: 0.95 },
        animate: {
            height: 'auto',
            opacity: 1,
            filter: 'blur(0px)',
            scale: 1,
            transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } // Cubic bezier for smoothness
        },
        exit: {
            height: 0,
            opacity: 0,
            filter: 'blur(10px)',
            scale: 0.95,
            transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] }
        }
    },
    spring: {
        initial: { height: 0, opacity: 0 },
        animate: {
            height: 'auto',
            opacity: 1,
            transition: { type: 'spring', damping: 20, stiffness: 100 }
        },
        exit: {
            height: 0,
            opacity: 0,
            transition: { duration: 0.2 }
        }
    },
    fade: {
        initial: { opacity: 0, display: 'none' },
        animate: {
            opacity: 1,
            display: 'block',
            transition: { duration: 0.2 }
        },
        exit: {
            opacity: 0,
            transitionEnd: { display: 'none' },
            transition: { duration: 0.2 }
        }
    }
};

export function Collapsible({ isOpen, children, variant = 'default', className = '' }: CollapsibleProps) {
    const selectedVariant = variants[variant];

    return (
        <AnimatePresence initial={false}>
            {isOpen && (
                <motion.div
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={selectedVariant}
                    className={`overflow-hidden ${className}`}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
