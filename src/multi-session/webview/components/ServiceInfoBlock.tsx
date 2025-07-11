/**
 * 🎨 ServiceInfoBlock - Живой компонент для отображения служебной информации
 * Показывает токены, инструменты, thinking процесс в реальном времени
 */

import React, { useEffect } from 'react';
import { ServiceMessage, ToolUseItem } from '../../types/Session';
import './ServiceInfoBlock.css';

export interface ServiceInfoBlockProps {
  serviceInfo: ServiceMessage;
  onUpdate?: (updated: ServiceMessage) => void;
}

export const ServiceInfoBlock: React.FC<ServiceInfoBlockProps> = ({ 
  serviceInfo, 
  onUpdate
}) => {
  // 🎨 Отладочные логи для отслеживания изменений
  useEffect(() => {
    console.log('🎨 ServiceInfoBlock received new data:', {
      status: serviceInfo.status,
      toolsCount: serviceInfo.toolUse.length,
      timestamp: serviceInfo.timestamp,
      activeTools: serviceInfo.toolUse.filter(tool => tool.status === 'running' || tool.status === 'pending').length,
      completedTools: serviceInfo.toolUse.filter(tool => tool.status === 'completed').length
    });
  }, [serviceInfo]);





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


  // 🎨 Получение текущего активного инструмента
  const getCurrentTool = (): string => {
    const activeTools = getActiveTools();
    const completedTools = getCompletedTools();
    
    if (activeTools.length > 0) {
      return activeTools[activeTools.length - 1].name;
    } else if (completedTools.length > 0) {
      return completedTools[completedTools.length - 1].name;
    }
    return 'Processing';
  };

  // 🎨 Компактный статический режим для нижнего колонтитула
  return (
    <div className={`service-info-compact ${getStatusClass()}`}>
      <div className="compact-status-bar">
        {/* Название текущего инструмента */}
        <span className="tool-name">
          {getCurrentTool()}
        </span>
        
        {/* Статус текст */}
        <span className={`status-text ${getStatusClass()}`}>
          {serviceInfo.status}
        </span>
      </div>
    </div>
  );
};