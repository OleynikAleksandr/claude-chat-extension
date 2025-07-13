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
  currentTool?: { name: string; params: string };
}

// 🎨 Функция сокращения путей с сохранением имени файла
const truncatePath = (path: string, maxLength: number = 40): string => {
  if (path.length <= maxLength) return path;
  
  // Проверяем, является ли это путем к файлу
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash === -1) return path; // Не путь, возвращаем как есть
  
  const fileName = path.substring(lastSlash + 1);
  const directory = path.substring(0, lastSlash);
  
  // Если имя файла слишком длинное, сокращаем его
  if (fileName.length > maxLength - 10) {
    return `.../${fileName.substring(0, maxLength - 13)}...`;
  }
  
  // Рассчитываем доступное место для директории
  const availableSpace = maxLength - fileName.length - 4; // 4 для ".../"
  
  if (directory.length <= availableSpace) {
    return path; // Путь помещается полностью
  }
  
  // Сокращаем начало пути
  const truncatedDir = directory.substring(directory.length - availableSpace);
  const firstSlash = truncatedDir.indexOf('/');
  
  if (firstSlash > 0) {
    return `.../${truncatedDir.substring(firstSlash + 1)}/${fileName}`;
  }
  
  return `.../${fileName}`;
};

export const ServiceInfoBlock: React.FC<ServiceInfoBlockProps> = ({ 
  serviceInfo, 
  onUpdate,
  currentTool
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


  // 🎨 Получение текущего активного инструмента с параметрами
  const getCurrentToolDisplay = (): string => {
    // ПРИОРИТЕТ: Если есть currentTool - показываем его независимо от статуса
    if (currentTool) {
      console.log('🎨 ServiceInfoBlock displaying currentTool:', currentTool);
      return currentTool.params ? 
        `${currentTool.name}: ${truncatePath(currentTool.params, 35)}` : 
        currentTool.name;
    }
    
    // Если статус processing - показываем из serviceInfo
    if (serviceInfo.status === 'processing') {
      // Берем самый последний инструмент из всего списка
      if (serviceInfo.toolUse.length > 0) {
        return serviceInfo.toolUse[serviceInfo.toolUse.length - 1].name;
      }
      return 'Processing';
    }
    
    // Во всех остальных случаях показываем Assistant
    return 'Assistant';
  };

  // 🎨 Получение статуса для отображения
  const getDisplayStatus = (): string => {
    // Если есть активный currentTool - всегда Processing
    if (currentTool) {
      console.log('🎨 ServiceInfoBlock status: Processing (currentTool active)');
      return 'Processing';
    }
    
    // Если статус completed и нет активных инструментов - готов к следующей задаче
    if (serviceInfo.status === 'completed') {
      console.log('🎨 ServiceInfoBlock status: Ready for next task (no active tools)');
      return 'Ready for next task';
    }
    
    if (serviceInfo.status === 'processing') {
      return 'Processing';
    }
    return serviceInfo.status;
  };

  // 🎨 Получение CSS класса для статуса
  const getStatusDisplayClass = (): string => {
    if (serviceInfo.status === 'completed') {
      return 'status-ready';
    }
    return getStatusClass();
  };

  // 🎨 Компактный статический режим для нижнего колонтитула
  return (
    <div className={`service-info-compact ${getStatusClass()}`}>
      <div className="compact-status-bar">
        {/* Точка состояния (минималистичная) */}
        <div className={`status-dot ${serviceInfo.status === 'processing' ? 'active' : 'idle'}`}></div>
        
        {/* Название текущего инструмента с параметрами */}
        <span className="tool-name">
          {getCurrentToolDisplay()}
        </span>
        
        {/* Статус текст */}
        <span className={`status-text ${getStatusDisplayClass()}`}>
          {getDisplayStatus()}
        </span>
      </div>
    </div>
  );
};