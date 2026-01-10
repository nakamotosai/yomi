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

    // Button styles using CSS variables (no more isWafu checks!)
    // Unified neutral style for both buttons in all states
    const unifiedButtonStyle = "bg-[var(--scheme-muted-bg)] text-[var(--text-secondary)] hover:bg-[var(--scheme-muted)]/20 dark:bg-white/5 hover:dark:bg-white/10 ring-0";

    // Stop button: uses muted color
    const stopStyle = "bg-[var(--scheme-muted)]/10 text-[var(--scheme-muted)] hover:bg-[var(--scheme-muted)]/20 active:scale-95 dark:text-[var(--text-muted)] dark:bg-white/5 dark:hover:bg-white/10 dark:backdrop-blur-md";

    return (
        <div className="flex items-center justify-center gap-3 w-full h-16 px-4 shrink-0 select-none">
            {/* Header Content - Now aligned left with only buttons */}

            {/* Translate Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleTranslation();
                }}
                className={clsx(
                    "flex items-center justify-center gap-2 px-4 h-10 rounded-xl transition-all duration-300 w-44 shadow-sm active:scale-95 active:shadow-none whitespace-nowrap",
                    // Base Dark Mode Style
                    "dark:bg-white/5 dark:text-[var(--text-muted)] dark:backdrop-blur-md",
                    // Active State (Light: No color change, just unified style. Dark: Rainbow Highlight)
                    isTranslationVisible && "dark:rainbow-highlight", // Only use rainbow highlight in dark mode to avoid color shift in light mode

                    unifiedButtonStyle
                )}
                title={isTranslationVisible ? "翻訳を閉じる" : "翻訳を表示"}
            >
                {isLoadingTranslation ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                    <Languages className="w-5 h-5" />
                )}
                <span className="text-[16px] font-medium tracking-wide">全文翻訳</span>
            </button>

            {/* Play/Pause Button (Main Action) - Reordered for better Left-Align flow */}
            <button
                onClick={(e) => { e.stopPropagation(); onPlay(); }}
                className={clsx(
                    "flex items-center justify-center gap-2 px-5 h-10 rounded-xl transition-all duration-300 shadow-sm active:scale-95 active:shadow-none w-44 whitespace-nowrap",
                    // Base Dark Mode Style
                    "dark:bg-white/5 dark:text-[var(--text-muted)] dark:backdrop-blur-md",
                    // Active State (Dark: Rainbow Highlight)
                    (isSpeaking && !isPaused) && "dark:rainbow-highlight",

                    unifiedButtonStyle
                )}
            >
                {isSpeaking && !isPaused ? (
                    <>
                        <PauseCircle className="w-5 h-5" />
                        <span className="text-[16px] font-medium tracking-wide">一時停止</span>
                    </>
                ) : (
                    <>
                        <PlayCircle className="w-5 h-5 ml-0.5" />
                        <span className="text-[16px] font-medium tracking-wide">
                            {isPaused ? "再開" : "全文朗読"}
                        </span>
                    </>
                )}
            </button>

            {/* Stop Button (Only visible when Playing or Paused) */}
            {(isSpeaking || isPaused) && (
                <button
                    onClick={(e) => { e.stopPropagation(); onStop(); }}
                    className={clsx(
                        "flex items-center justify-center gap-2 px-4 h-10 rounded-xl transition-all duration-300 animate-in fade-in slide-in-from-left-2 shadow-sm active:scale-95 active:shadow-none whitespace-nowrap",
                        // Base Dark Mode Style
                        "dark:bg-white/5 dark:text-[var(--text-muted)] dark:backdrop-blur-md",
                        unifiedButtonStyle
                    )}
                    title="停止"
                >
                    <StopCircle className="w-5 h-5" />
                    <span className="text-[16px] font-medium tracking-wide">終了</span>
                </button>
            )}

        </div >
    );
};

export default ReaderHeader;

