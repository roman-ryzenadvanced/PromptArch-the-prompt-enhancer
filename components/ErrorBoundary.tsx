"use client";

import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    resetError = () => {
        this.setState({ hasError: false, error: undefined });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-2xl h-full text-center">
                    <div className="bg-rose-100 p-3 rounded-full mb-4">
                        <AlertTriangle className="h-6 w-6 text-rose-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Something went wrong</h3>
                    <p className="text-sm text-slate-500 max-w-xs mb-6">
                        {this.state.error?.message || "An unexpected error occurred while rendering this component."}
                    </p>
                    <Button onClick={this.resetError} variant="outline">
                        <RotateCcw className="h-4 w-4 mr-2" /> Try Again
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
