const storage = new Map<string, string>();

Object.defineProperty(globalThis, 'localStorage', {
    value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
    },
    configurable: true,
});

const encoder = new TextEncoder();
const thinkingSecret = 'SECRET_THINKING_SHOULD_DISAPPEAR';
const finalAnswer = 'a. **夯实基础 **：最终正文只保留答案。';

function eventBlock(event: string, data: Record<string, unknown>) {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function waitFor(check: () => boolean, label: string, timeoutMs = 3000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        if (check()) return;
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(`Timed out waiting for ${label}`);
}

async function main() {
    const { useGeminiStore, useChatTypewriterStore } = await import('../src/store/useGeminiStore');

    let requestBody: Record<string, unknown> | null = null;
    let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;

    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
        requestBody = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                streamController = controller;
            },
        });
        return new Response(stream, {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
        });
    }) as typeof fetch;

    useChatTypewriterStore.getState().resetChatStream();
    useGeminiStore.setState({
        isChatGenerating: false,
        streamedResults: new Map(),
        history: [],
        isChatOpen: false,
        abortController: null,
        chatThinkingText: {},
        chatThinkingActive: {},
        bookmarks: [],
    });

    const sendPromise = useGeminiStore.getState().sendMessage('ながら怎么用');

    await waitFor(() => !!streamController && !!requestBody, 'chat request start');
    const sentRequestBody = requestBody as unknown as Record<string, unknown>;

    if (sentRequestBody.streamMode !== 'events') {
        throw new Error(`Expected main chat streamMode="events", got ${JSON.stringify(sentRequestBody.streamMode)}`);
    }

    streamController!.enqueue(encoder.encode(eventBlock('thinking_start', { model: 'qwen/qwen3.5-122b-a10b' })));
    streamController!.enqueue(encoder.encode(eventBlock('thinking_delta', { text: thinkingSecret, raw: true })));

    await waitFor(() => {
        const modelMessage = useGeminiStore.getState().history.find((message) => message.role === 'model');
        return !!modelMessage && !!useGeminiStore.getState().chatThinkingActive[String(modelMessage.timestamp)];
    }, 'transient thinking state');

    const modelMessageWhileThinking = useGeminiStore.getState().history.find((message) => message.role === 'model');
    if (!modelMessageWhileThinking) {
        throw new Error('Expected assistant placeholder while thinking');
    }

    const thinkingText = useGeminiStore.getState().chatThinkingText[String(modelMessageWhileThinking.timestamp)] || '';
    if (!thinkingText.includes(thinkingSecret)) {
        throw new Error(`Expected transient thinking text to include secret marker. Got: ${thinkingText}`);
    }

    streamController!.enqueue(encoder.encode(eventBlock('answer_start', {})));

    await waitFor(() => {
        const state = useGeminiStore.getState();
        return !state.chatThinkingActive[String(modelMessageWhileThinking.timestamp)] &&
            !state.chatThinkingText[String(modelMessageWhileThinking.timestamp)];
    }, 'thinking state clear after answer_start');

    streamController!.enqueue(encoder.encode(eventBlock('answer_delta', { text: finalAnswer })));
    streamController!.enqueue(encoder.encode(eventBlock('done', { model: 'qwen/qwen3.5-122b-a10b', totalTokens: 32 })));
    streamController!.close();

    await sendPromise;

    const finalState = useGeminiStore.getState();
    const assistantMessages = finalState.history.filter((message) => message.role === 'model');
    if (assistantMessages.length !== 1) {
        throw new Error(`Expected one assistant message, got ${assistantMessages.length}`);
    }

    const persistedAnswer = assistantMessages[0].content;
    if (persistedAnswer !== finalAnswer) {
        throw new Error(`Expected final answer ${JSON.stringify(finalAnswer)}, got ${JSON.stringify(persistedAnswer)}`);
    }

    const persistedSnapshot = JSON.stringify({
        history: finalState.history,
        bookmarks: finalState.bookmarks,
        storage: Object.fromEntries(storage),
    });

    if (persistedSnapshot.includes(thinkingSecret)) {
        throw new Error('Thinking text leaked into persisted chat state');
    }

    if (Object.keys(finalState.chatThinkingText).length || Object.keys(finalState.chatThinkingActive).length) {
        throw new Error('Thinking state was not cleared after completion');
    }

    if (useChatTypewriterStore.getState().activeMessageTimestamp !== null) {
        throw new Error('Chat typewriter stream was not cleared after completion');
    }

    console.log(JSON.stringify({
        status: 'PASS',
        requestStreamMode: sentRequestBody.streamMode,
        transientThinkingObserved: true,
        finalAnswer,
    }, null, 2));
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

export {};
