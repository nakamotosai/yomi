import {
    Languages,
    PlayCircle,
    PauseCircle,
    StopCircle,
    RefreshCw
} from 'lucide-react';
import clsx from 'clsx';

interface ReaderHeaderProps {
    isTranslationVisible: boolean;
    onToggleTranslation: () => void;
    isLoadingTranslation: boolean;
    isSpeaking: boolean;
    isPaused: boolean;
    onPlay: () => void;
    onStop: () => void;
}

const ReaderHeader: React.FC<ReaderHeaderProps> = ({
    isTranslationVisible,
    onToggleTranslation,
    isLoadingTranslation,
    isSpeaking,
    isPaused,
    onPlay,
    onStop,
}) => {
    const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';

    return (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 w-full h-16 px-4 shrink-0 select-none">
            {/* Left Placeholder (to balance the grid) */}
            <div className="h-full" />

            {/* Middle Column: Fixed Center Pair */}
            <div className="flex items-center justify-center gap-3">
                {/* Translate Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleTranslation();
                    }}
                    className={clsx(
                        "flex items-center justify-center gap-2 p-2 rounded-2xl transition-all duration-300 w-44 h-10 shadow-sm active:scale-95 active:shadow-none whitespace-nowrap border",
                        // Active State
                        isTranslationVisible && (isDark ? "rainbow-highlight" : "ring-2 ring-[var(--scheme-primary)]/20 bg-[var(--scheme-primary)]/5"),
                        // Theme Styles
                        isDark ? "bg-[var(--bg-muted)] border-white/10 text-[var(--text-muted)]" : "bg-white border-[var(--border-default)] text-[var(--text-secondary)]"
                    )}
                    title={isTranslationVisible ? "翻訳を闭じる" : "翻訳を表示"}
                >
                    {isLoadingTranslation ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                        <Languages className="w-5 h-5" style={{ color: 'var(--scheme-primary)' }} />
                    )}
                    <span className="text-[14px] font-medium tracking-wide">全文翻訳</span>
                </button>

                {/* Play/Pause Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); onPlay(); }}
                    className={clsx(
                        "flex items-center justify-center gap-2 p-2 rounded-2xl transition-all duration-300 w-44 h-10 shadow-sm active:scale-95 active:shadow-none whitespace-nowrap border",
                        // Active State
                        (isSpeaking && !isPaused) && (isDark ? "rainbow-highlight" : "ring-2 ring-[var(--scheme-primary)]/20 bg-[var(--scheme-primary)]/5"),
                        // Theme Styles
                        isDark ? "bg-[var(--bg-muted)] border-white/10 text-[var(--text-muted)]" : "bg-white border-[var(--border-default)] text-[var(--text-secondary)]"
                    )}
                >
                    {isSpeaking && !isPaused ? (
                        <>
                            <PauseCircle className="w-5 h-5" />
                            <span className="text-[14px] font-medium tracking-wide">一时停止</span>
                        </>
                    ) : (
                        <>
                            <PlayCircle className="w-5 h-5" style={{ color: 'var(--scheme-primary)' }} />
                            <span className="text-[14px] font-medium tracking-wide">
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
                            "flex items-center justify-center gap-2 p-2 rounded-2xl transition-all duration-300 w-24 h-10 shadow-sm active:scale-95 active:shadow-none whitespace-nowrap border animate-in fade-in slide-in-from-left-2",
                            isDark ? "bg-[var(--bg-muted)] border-white/10 text-[var(--text-muted)]" : "bg-white border-[var(--border-default)] text-[var(--text-secondary)]"
                        )}
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

