/**
 * Session State Indicator Component
 * Компонент для отображения состояния сессии Claude Code
 */

import React from 'react';
import './SessionStateIndicator.css';

export interface SessionStateIndicatorProps {
    state: 'ready' | 'working';
    stateDescription: string;
    stateEmoji: string;
    isReadyForNewRequest: boolean;
    sessionName?: string;
    compact?: boolean;
    showSpinner?: boolean;
}

export const SessionStateIndicator: React.FC<SessionStateIndicatorProps> = ({
    state,
    stateDescription,
    stateEmoji,
    isReadyForNewRequest,
    sessionName,
    compact = false,
    showSpinner = true
}) => {
    const getStateClass = (): string => {
        switch (state) {
            case 'ready':
                return 'state-ready';
            case 'working':
                return 'state-working';
            default:
                return 'state-unknown';
        }
    };

    const shouldShowSpinner = (): boolean => {
        return showSpinner && state === 'working';
    };

    const getSpinnerClass = (): string => {
        return 'spinner-working';
    };

    if (compact) {
        return (
            <div className={`session-state-indicator compact ${getStateClass()}`}>
                <span className="state-emoji">{stateEmoji}</span>
                {shouldShowSpinner() && (
                    <div className={`spinner ${getSpinnerClass()}`}></div>
                )}
            </div>
        );
    }

    return (
        <div className={`session-state-indicator ${getStateClass()}`}>
            <div className="state-header">
                <span className="state-emoji">{stateEmoji}</span>
                {sessionName && (
                    <span className="session-name">{sessionName}</span>
                )}
                {shouldShowSpinner() && (
                    <div className={`spinner ${getSpinnerClass()}`}></div>
                )}
            </div>
            <div className="state-description">
                {stateDescription}
            </div>
            {!isReadyForNewRequest && (
                <div className="state-warning">
                    Отправка нового сообщения заблокирована
                </div>
            )}
        </div>
    );
};