/**
 * ServiceInfoBlock - Компонент для отображения служебной информации в нижнем колонтитуле
 * Показывает информацию из JSON ответов Claude
 */

import React, { useMemo } from 'react';
import { ServiceMessage } from '../../types/Session';
import './ServiceInfoBlock.css';

export interface ServiceInfoBlockProps {
  serviceInfo: ServiceMessage;
  onUpdate?: (updated: ServiceMessage) => void;
}

// Функция сокращения путей с сохранением имени файла
const truncatePath = (path: string, maxLength: number = 40): string => {
  if (!path || path.length <= maxLength) return path;
  
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash === -1) return path;
  
  const fileName = path.substring(lastSlash + 1);
  const directory = path.substring(0, lastSlash);
  
  // Если имя файла слишком длинное, сокращаем его
  if (fileName.length > maxLength - 10) {
    return `.../${fileName.substring(0, maxLength - 13)}...`;
  }
  
  // Рассчитываем доступное место для директории
  const availableSpace = maxLength - fileName.length - 4; // 4 для ".../"
  
  if (directory.length <= availableSpace) {
    return path;
  }
  
  // Сокращаем начало пути
  return `.../${fileName}`;
};

export const ServiceInfoBlock: React.FC<ServiceInfoBlockProps> = ({ 
  serviceInfo, 
  onUpdate
}) => {
  // Парсинг raw JSON для определения статуса
  const statusText = useMemo(() => {
    const rawJson = serviceInfo.rawJson;
    
    if (!rawJson) {
      return 'Assistant Processing';
    }

    // 1. Проверяем type: result -> Assistant Ready For Next Task
    if (rawJson.type === 'result') {
      console.log('✅ Found type: result, showing Ready status');
      return 'Assistant Ready For Next Task';
    }

    // 2. Проверяем type: assistant с tool_use
    if (rawJson.type === 'assistant' && rawJson.message?.content) {
      const content = rawJson.message.content;
      
      // Ищем tool_use в content array
      for (const item of content) {
        if (item.type === 'tool_use' && item.name && item.name !== 'TodoWrite') {
          // Получаем имя инструмента
          const toolName = item.name;
          
          // Пытаемся найти file_path в input
          let filePath = '';
          if (item.input && item.input.file_path) {
            filePath = truncatePath(item.input.file_path, 35);
          } else if (item.input && item.input.path) {
            filePath = truncatePath(item.input.path, 35);
          }
          
          // Возвращаем отформатированную строку
          return filePath ? `${toolName}: ${filePath}` : toolName;
        }
      }
    }

    // 3. По умолчанию для всех остальных типов
    console.log('🔍 Default case, returning Processing');
    return 'Assistant Processing';
  }, [serviceInfo.rawJson]);
  
  console.log('🎯 Final statusText:', statusText);

  return (
    <div className="service-info-compact">
      <div className="compact-status-bar">
        <span className="status-text">
          {statusText}
        </span>
      </div>
    </div>
  );
};