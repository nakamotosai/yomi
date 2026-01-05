'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);

        // Send error to server
        fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: error.message,
                stack: error.stack + '\nComponent Stack:\n' + errorInfo.componentStack,
                type: 'CLIENT_CRASH'
            })
        }).catch(err => console.error("Failed to send log", err));
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 max-w-2xl mx-auto mt-20 bg-red-50 border border-red-200 rounded-xl">
                    <h2 className="text-2xl font-bold text-red-700 mb-4">应用遇到严重错误</h2>
                    <p className="text-red-600 mb-4">错误信息已自动记录到后台日志。</p>
                    <div className="bg-white p-4 rounded border border-red-100 font-mono text-sm overflow-auto mb-6 text-red-800">
                        {this.state.error?.message}
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        刷新页面
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
