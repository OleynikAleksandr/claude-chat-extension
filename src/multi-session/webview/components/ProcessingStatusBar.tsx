/**
 * ProcessingStatusBar Component
 * B>1@0605B AB0BCA >1@01>B:8 A B>:5=0<8, 2@5<5=5< 8 2>7<>6=>ABLN ?@5@K20=8O
 */

import React, { useState, useEffect } from 'react';
import { TokenUsage } from './TokenUsageTracker';
import './ProcessingStatusBar.css';

// Re-export TokenUsage for compatibility
export type { TokenUsage };

export interface ProcessingStatusBarProps {
    isVisible: boolean;
    state: 'working' | 'ready' | 'interrupted';
    startTime: Date;
    tokenUsage: TokenUsage;
    toolCallsCount: number;
    model?: string;
    onInterrupt?: () => void;
    onHide?: () => void;
}

export const ProcessingStatusBar: React.FC<ProcessingStatusBarProps> = ({
    isVisible,
    state,
    startTime,
    tokenUsage,
    toolCallsCount,
    model = 'claude-sonnet-4',
    onInterrupt,
    onHide
}) => {
    const [duration, setDuration] = useState(0);
    const [showReadyTimer, setShowReadyTimer] = useState<NodeJS.Timeout | null>(null);

    // 1=>2;5=85 2@5<5=8 :064CN A5:C=4C
    useEffect(() => {
        if (!isVisible || state !== 'working') return;

        const timer = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - startTime.getTime()) / 1000);
            setDuration(elapsed);
        }, 1000);

        return () => clearInterval(timer);
    }, [isVisible, state, startTime]);

    // 2B><0B8G5A:>5 A:@KB85 2 A>AB>O=88 READY
    useEffect(() => {
        if (state === 'ready') {
            const timer = setTimeout(() => {
                onHide?.();
            }, 2000); // !:@K205< G5@57 2 A5:C=4K
            setShowReadyTimer(timer);
        } else if (showReadyTimer) {
            clearTimeout(showReadyTimer);
            setShowReadyTimer(null);
        }

        return () => {
            if (showReadyTimer) {
                clearTimeout(showReadyTimer);
            }
        };
    }, [state, onHide]);

    // 1@01>B:0 :;028H8 ESC
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && state === 'working' && onInterrupt) {
                event.preventDefault();
                onInterrupt();
            }
        };

        if (isVisible && state === 'working') {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isVisible, state, onInterrupt]);

    // $>@<0B8@>20=85 2@5<5=8
    const formatDuration = (seconds: number): string => {
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    // >4AG5B >1I8E B>:5=>2
    const totalInputTokens = tokenUsage.inputTokens + (tokenUsage.cacheReadTokens || 0);
    const totalOutputTokens = tokenUsage.outputTokens;

    //  5=45@ A>45@68<>3> 2 7028A8<>AB8 >B A>AB>O=8O
    const renderContent = () => {
        switch (state) {
            case 'working':
                return (
                    <div className="processing-status-content">
                        <div className="status-icon working">
                            <div className="spinner"></div>
                        </div>
                        <div className="status-text">
                            <span className="status-label">Processing...</span>
                            <span className="status-details">
                                ({formatDuration(duration)} " � {totalInputTokens.toLocaleString()} " � {totalOutputTokens.toLocaleString()} tokens
                                {toolCallsCount > 0 && (
                                    <> " {toolCallsCount} tool{toolCallsCount > 1 ? 's' : ''}</>
                                )}
                                {onInterrupt && (
                                    <> " <kbd>ESC</kbd> to interrupt</>
                                )}
                                )
                            </span>
                        </div>
                    </div>
                );

            case 'ready':
                return (
                    <div className="processing-status-content">
                        <div className="status-icon ready">=�</div>
                        <div className="status-text">
                            <span className="status-label">Ready</span>
                            <span className="status-details">
                                (completed in {formatDuration(duration)} " total: � {totalInputTokens.toLocaleString()} � {totalOutputTokens.toLocaleString()} tokens
                                {tokenUsage.totalCost && (
                                    <> " ${tokenUsage.totalCost.toFixed(4)}</>
                                )}
                                )
                            </span>
                        </div>
                    </div>
                );

            case 'interrupted':
                return (
                    <div className="processing-status-content">
                        <div className="status-icon interrupted">�</div>
                        <div className="status-text">
                            <span className="status-label">Interrupted</span>
                            <span className="status-details">
                                (stopped at {formatDuration(duration)} " partial: � {totalInputTokens.toLocaleString()} � {totalOutputTokens.toLocaleString()} tokens)
                            </span>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    if (!isVisible) return null;

    return (
        <div className={`processing-status-bar ${state}`}>
            {renderContent()}
        </div>
    );
};