import React from 'react';
import {
    Languages,
    PlayCircle,
    PauseCircle,
    StopCircle,
    RefreshCw,
    PenLine
} from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '@/store/useAppStore';

interface ReaderHeaderProps {
    isTranslationVisible: boolean;
    onToggleTranslation: () => void;
    isLoadingTranslation: boolean;
    isSpeaking: boolean;
    isPaused: boolean;
    onPlay: () => void;
    onStop: () => void;
    onOpenInputModal: () => void;
}

const ReaderHeader: React.FC<ReaderHeaderProps> = ({
    isTranslationVisible,
    onToggleTranslation,
    isLoadingTranslation,
    isSpeaking,
    isPaused,
    onPlay,
    onStop,
    onOpenInputModal,
}) => {
    const { settings } = useAppStore();

    return (
        <div className="flex items-center gap-3 w-full h-12 px-0 shrink-0 select-none justify-center">
            {/* Left Column: Fixed Left Pair */}
            <div className="flex items-center justify-center gap-3 min-w-0 max-w-full">
                {/* Input Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenInputModal();
                    }}
                    className={clsx(
                        "flex-1 flex items-center justify-center gap-2 px-2 rounded-2xl transition-all duration-300 h-10 whitespace-nowrap min-w-0 border border-transparent dark:border-white/10",
                        "bg-transparent shadow-sm hover:shadow-md hover:scale-[1.02]"
                    )}
                    style={{ color: 'var(--text-muted)' }}
                    title="入力 / 貼り付け"
                >
                    <PenLine className="w-5 h-5" />
                    <span className="text-[14px] font-medium tracking-wide truncate">输入文本</span>
                </button>

                {/* Translate Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleTranslation();
                    }}
                    className={clsx(
                        "flex-1 flex items-center justify-center gap-2 px-2 rounded-2xl transition-all duration-300 h-10 whitespace-nowrap min-w-0 border border-transparent dark:border-white/10",
                        // Active State
                        isTranslationVisible
                            ? "bg-transparent border-transparent shadow-[0_0_15px_rgba(0,0,0,0.3)] dark:shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                            : "bg-transparent shadow-sm hover:shadow-md hover:scale-[1.02]"
                    )}
                    style={{ color: 'var(--text-muted)' }}
                    title={isTranslationVisible ? "翻訳を闭じる" : "翻訳を表示"}
                >
                    {isLoadingTranslation ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                        <Languages className="w-5 h-5" />
                    )}
                    <span className="text-[14px] font-medium tracking-wide truncate">全文翻訳</span>
                </button>

                {/* Play/Pause Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); onPlay(); }}
                    className={clsx(
                        "flex-1 flex items-center justify-center gap-2 px-2 rounded-2xl transition-all duration-300 h-10 whitespace-nowrap min-w-0 border border-transparent dark:border-white/10",
                        // Active State
                        (isSpeaking && !isPaused)
                            ? "bg-transparent border-transparent shadow-[0_0_15px_rgba(0,0,0,0.3)] dark:shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                            : "bg-transparent shadow-sm hover:shadow-md hover:scale-[1.02]"
                    )}
                    style={{ color: 'var(--text-muted)' }}
                >
                    {isSpeaking && !isPaused ? (
                        <>
                            <PauseCircle className="w-5 h-5" />
                            <span className="text-[14px] font-medium tracking-wide truncate">一时停止</span>
                        </>
                    ) : (
                        <>
                            <PlayCircle className="w-5 h-5" />
                            <span className="text-[14px] font-medium tracking-wide truncate">
                                {isPaused ? "再開" : "全文朗读"}
                            </span>
                        </>
                    )}
                </button>
            </div>

            {/* Right Column: Stop Button (Conditional) */}
            <div className="flex items-center justify-start h-full">
                {(isSpeaking || isPaused) && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onStop(); }}
                        className={clsx(
                            "flex items-center justify-center gap-2 px-4 rounded-2xl transition-all duration-300 w-24 h-10 whitespace-nowrap min-w-0 border border-transparent dark:border-white/10 animate-in fade-in slide-in-from-left-2",
                            "bg-transparent shadow-sm hover:shadow-md hover:scale-[1.02]"
                        )}
                        style={{ color: 'var(--text-muted)' }}
                        title="停止"
                    >
                        <StopCircle className="w-5 h-5" />
                        <span className="text-[14px] font-medium tracking-wide">終了</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default ReaderHeader;

