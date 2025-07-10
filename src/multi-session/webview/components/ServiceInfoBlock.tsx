/**
 * 🎨 ServiceInfoBlock - Живой компонент для отображения служебной информации
 * Показывает токены, инструменты, thinking процесс в реальном времени
 */

import React, { useEffect, useState, useRef } from 'react';
import { ServiceMessage, ToolUseItem } from '../../types/Session';
import './ServiceInfoBlock.css';

export interface ServiceInfoBlockProps {
  serviceInfo: ServiceMessage;
  onUpdate?: (updated: ServiceMessage) => void;
  isCompact?: boolean;
}

export const ServiceInfoBlock: React.FC<ServiceInfoBlockProps> = ({ 
  serviceInfo, 
  onUpdate,
  isCompact = false 
}) => {
  const [animatedTokens, setAnimatedTokens] = useState(serviceInfo.usage.output_tokens);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isExpanded, setIsExpanded] = useState(!isCompact);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);

  // 🎨 Плавная анимация обновления токенов
  useEffect(() => {
    if (serviceInfo.usage.output_tokens !== animatedTokens) {
      const startTokens = animatedTokens;
      const endTokens = serviceInfo.usage.output_tokens;
      const duration = 800; // 0.8 секунды для плавности
      
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing функция для более естественной анимации
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        
        const currentTokens = Math.floor(
          startTokens + (endTokens - startTokens) * easeOutQuart
        );
        
        setAnimatedTokens(currentTokens);
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [serviceInfo.usage.output_tokens, animatedTokens]);

  // 🎨 Таймер времени выполнения
  useEffect(() => {
    if (serviceInfo.status === 'processing' || serviceInfo.status === 'initializing') {
      intervalRef.current = setInterval(() => {
        setElapsedTime(
          (Date.now() - serviceInfo.timestamp.getTime()) / 1000
        );
      }, 100); // Обновляем каждые 100ms для плавности
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, [serviceInfo.status, serviceInfo.timestamp]);

  // 🎨 Cleanup при unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // 🎨 Получение иконки для статуса
  const getStatusIcon = () => {
    switch (serviceInfo.status) {
      case 'initializing':
        return '⚡';
      case 'processing':
        return '⚡';
      case 'completed':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '⚡';
    }
  };

  // 🎨 Получение класса для статуса
  const getStatusClass = () => {
    switch (serviceInfo.status) {
      case 'initializing':
        return 'status-initializing';
      case 'processing':
        return 'status-processing';
      case 'completed':
        return 'status-completed';
      case 'error':
        return 'status-error';
      default:
        return 'status-processing';
    }
  };

  // 🎨 Получение текста статуса
  const getStatusText = () => {
    switch (serviceInfo.status) {
      case 'initializing':
        return 'INITIALIZING';
      case 'processing':
        return 'PROCESSING';
      case 'completed':
        return 'COMPLETED';
      case 'error':
        return 'ERROR';
      default:
        return 'PROCESSING';
    }
  };

  // 🎨 Форматирование времени
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
    }
  };

  // 🎨 Получение активных инструментов
  const getActiveTools = (): ToolUseItem[] => {
    return serviceInfo.toolUse.filter(tool => 
      tool.status === 'running' || tool.status === 'pending'
    );
  };

  // 🎨 Получение завершённых инструментов
  const getCompletedTools = (): ToolUseItem[] => {
    return serviceInfo.toolUse.filter(tool => 
      tool.status === 'completed'
    );
  };

  // 🎨 Compact режим
  if (isCompact && !isExpanded) {
    return (
      <div 
        className={`service-info-block compact ${getStatusClass()}`}
        onClick={() => setIsExpanded(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsExpanded(true);
          }
        }}
        aria-label="Expand service information"
      >
        <div className="compact-content">
          <span className="status-icon">{getStatusIcon()}</span>
          <span className="tokens-compact">{animatedTokens}</span>
          <span className="time-compact">{formatTime(elapsedTime)}</span>
          {getActiveTools().length > 0 && (
            <span className="tools-compact">
              {getActiveTools().map(tool => tool.name).join(', ')}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`service-info-block ${getStatusClass()}`}>
      <div className="service-header">
        <div className="service-title">
          <span className="service-icon">🔧</span>
          <span className="service-text">Processing Status</span>
        </div>
        <div className="service-controls">
          <div className={`status-indicator ${getStatusClass()}`}>
            <span className="status-icon">{getStatusIcon()}</span>
            <span className="status-text">{getStatusText()}</span>
          </div>
          {isCompact && (
            <button 
              className="collapse-btn"
              onClick={() => setIsExpanded(false)}
              aria-label="Collapse service information"
            >
              ▼
            </button>
          )}
        </div>
      </div>
      
      <div className="service-content">
        {/* 🎨 Токены с анимацией */}
        <div className="service-line tokens-line">
          <span className="line-icon">📊</span>
          <span className="line-label">Tokens:</span>
          <span className="line-value token-value">
            {animatedTokens.toLocaleString()}
            {serviceInfo.usage.input_tokens > 0 && (
              <span className="token-breakdown">
                {' '}(in: {serviceInfo.usage.input_tokens.toLocaleString()})
              </span>
            )}
          </span>
          {(serviceInfo.status === 'processing' || serviceInfo.status === 'initializing') && (
            <span className="updating-indicator">●</span>
          )}
        </div>

        {/* 🎨 Время выполнения */}
        <div className="service-line time-line">
          <span className="line-icon">⏱️</span>
          <span className="line-label">Time:</span>
          <span className="line-value">
            {formatTime(elapsedTime)}
            {serviceInfo.status === 'completed' && serviceInfo.duration && (
              <span className="final-duration"> (final: {formatTime(serviceInfo.duration / 1000)})</span>
            )}
          </span>
        </div>

        {/* 🎨 Активные инструменты */}
        {getActiveTools().length > 0 && (
          <div className="service-line tools-line">
            <span className="line-icon">🛠️</span>
            <span className="line-label">Active Tools:</span>
            <span className="line-value">
              {getActiveTools().map((tool, index) => (
                <span key={tool.id} className="tool-item active">
                  {tool.name}
                  {tool.status === 'running' && <span className="tool-status running">●</span>}
                  {tool.status === 'pending' && <span className="tool-status pending">⏳</span>}
                  {index < getActiveTools().length - 1 && ' → '}
                </span>
              ))}
            </span>
          </div>
        )}

        {/* 🎨 Завершённые инструменты */}
        {getCompletedTools().length > 0 && (
          <div className="service-line tools-line">
            <span className="line-icon">✅</span>
            <span className="line-label">Completed:</span>
            <span className="line-value">
              {getCompletedTools().map((tool, index) => (
                <span key={tool.id} className="tool-item completed">
                  {tool.name}
                  {tool.duration && <span className="tool-duration">({formatTime(tool.duration / 1000)})</span>}
                  {index < getCompletedTools().length - 1 && ', '}
                </span>
              ))}
            </span>
          </div>
        )}

        {/* 🎨 Thinking процесс */}
        {serviceInfo.thinking && (
          <div className="service-line thinking-line">
            <span className="line-icon">🧠</span>
            <span className="line-label">Thinking:</span>
            <span className="line-value thinking-value">
              "{serviceInfo.thinking.length > 80 
                ? serviceInfo.thinking.substring(0, 80) + '...' 
                : serviceInfo.thinking}"
            </span>
          </div>
        )}

        {/* 🎨 Кэш информация */}
        {serviceInfo.usage.cache_read_input_tokens && serviceInfo.usage.cache_read_input_tokens > 0 && (
          <div className="service-line cache-line">
            <span className="line-icon">💾</span>
            <span className="line-label">Cache:</span>
            <span className="line-value">
              {serviceInfo.usage.cache_read_input_tokens.toLocaleString()} tokens read
              {serviceInfo.usage.cache_creation_input_tokens && (
                <span className="cache-creation">
                  {' '}({serviceInfo.usage.cache_creation_input_tokens.toLocaleString()} created)
                </span>
              )}
            </span>
          </div>
        )}

        {/* 🎨 Стоимость (если доступна) */}
        {serviceInfo.usage.cost_estimate && serviceInfo.usage.cost_estimate > 0 && (
          <div className="service-line cost-line">
            <span className="line-icon">💰</span>
            <span className="line-label">Cost:</span>
            <span className="line-value">
              ${serviceInfo.usage.cost_estimate.toFixed(4)}
              {serviceInfo.usage.service_tier && (
                <span className="service-tier"> ({serviceInfo.usage.service_tier})</span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};