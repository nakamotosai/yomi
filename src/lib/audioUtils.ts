/**
 * Wakes up the audio hardware (especially Bluetooth speakers)
 * by playing a short, nearly silent buffer.
 * This helps overcome the "sleep mode" latency of external speakers.
 */
export const wakeUpAudio = async () => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();

        // Resume context if suspended (common in browsers)
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        // Use a low frequency that's practically inaudible but valid signal
        osc.frequency.value = 50;

        // Very low volume - enough to trigger the hardware "active" state
        // but quiet enough not to bother the user
        gain.gain.value = 0.001;

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5); // 0.5 seconds wake-up burst

        // Clean up context after a short delay
        setTimeout(() => {
            if (ctx.state !== 'closed') {
                ctx.close();
            }
        }, 1000);

        console.log('[AudioUtils] Wake-up signal sent');
    } catch (err) {
        console.warn('[AudioUtils] Wake-up failed', err);
    }
};
