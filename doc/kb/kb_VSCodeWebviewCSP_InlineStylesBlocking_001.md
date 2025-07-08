# База знаний: Content Security Policy в VS Code Webview расширениях

**Версия:** 001  
**Дата создания:** 8 июля 2025  
**Проблема:** CSP блокирует inline стили в webview, что приводит к неработающему JavaScript  
**Решение:** Замена всех inline стилей на CSS классы  

---

## 📋 Описание проблемы

### Симптомы
- Webview загружается, но JavaScript не выполняется или выполняется частично
- В Developer Tools Console появляются ошибки CSP:
  ```
  The Content Security Policy (CSP) prevents cross-site scripting attacks by blocking inline execution of scripts and style sheets.
  style-src-attr blocked
  ```
- Функциональность, зависящая от динамических стилей, не работает
- Extension отправляет сообщения в webview, но webview не отвечает или не обрабатывает их

### Первопричина
VS Code применяет строгую Content Security Policy (CSP) к webview расширениям. Эта политика блокирует:
1. **Inline стили** (`element.style.property = value`)
2. **Inline скрипты** (без nonce)
3. **Eval** и другие небезопасные JavaScript конструкции

---

## 🔍 Диагностика

### Шаг 1: Обнаружить проблему

1. **Откройте Developer Tools** для webview:
   - `Ctrl+Shift+P` → "Developer: Toggle Developer Tools"
   - Или правый клик в webview → "Inspect"

2. **Проверьте Console** на наличие CSP ошибок:
   ```
   2 directives
   Directive    Element    Source location    Status
   style-src-attr        index.html?id=...    blocked
   ```

3. **Поиск inline стилей** в коде:
   ```bash
   grep -n "\.style\." media/main.js
   grep -n 'style="' src/extension.ts
   ```

### Типичные места где встречаются inline стили

1. **JavaScript динамические стили:**
   ```javascript
   element.style.display = 'none';
   element.style.color = 'red';
   element.style.height = '100px';
   ```

2. **HTML inline стили:**
   ```html
   <div style="display: none;">
   <span style="color: red;">
   ```

3. **Условные стили:**
   ```javascript
   if (condition) {
       element.style.background = 'green';
   } else {
       element.style.background = 'red';
   }
   ```

---

## ✅ Решение

### Шаг 1: Создайте CSS классы

**Добавьте в main.css:**
```css
/* CSP-safe dynamic styles */
.loading-visible { display: flex !important; }
.loading-hidden { display: none !important; }

.status-ready { background: var(--vscode-charts-green); }
.status-busy { background: var(--vscode-charts-yellow); }
.status-error { background: var(--vscode-charts-red); }
.status-warning { background: var(--vscode-charts-orange); }
.status-disconnected { background: var(--vscode-charts-blue); }

.char-count-normal { color: var(--vscode-descriptionForeground); }
.char-count-warning { color: var(--vscode-charts-yellow); }
.char-count-danger { color: var(--vscode-charts-red); }

.toast-slide-out { animation: toastSlideOut 0.3s ease-in forwards; }
```

### Шаг 2: Замените inline стили в JavaScript

**Было:**
```javascript
element.style.display = 'none';
element.style.background = 'var(--vscode-charts-red)';
charCount.style.color = 'var(--vscode-charts-red)';
```

**Стало:**
```javascript
element.className = 'loading-hidden';
element.classList.add('status-error');
charCount.className = 'char-count-danger';
```

### Шаг 3: Уберите inline стили из HTML

**Было:**
```html
<div class="loading-overlay" style="display: none;">
<div class="typing-indicator" style="display: none;">
```

**Стало:**
```html
<div class="loading-overlay loading-hidden">
<div class="typing-indicator loading-hidden">
```

### Шаг 4: Обновите CSP (если необходимо)

Для некоторых случаев (например, динамическая высота) может потребоваться:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'none'; 
               style-src ${webview.cspSource} 'unsafe-inline'; 
               script-src 'nonce-${nonce}'; 
               img-src ${webview.cspSource} https:;">
```

**⚠️ Важно:** используйте `'unsafe-inline'` только когда альтернативы нет!

---

## 🛠️ Практические советы

### Паттерны замены

1. **Показать/скрыть элементы:**
   ```javascript
   // Вместо: element.style.display = loading ? 'flex' : 'none';
   element.className = loading ? 'loading-visible' : 'loading-hidden';
   ```

2. **Условные стили:**
   ```javascript
   // Вместо множественных style.property
   element.className = 'base-class';
   if (status === 'error') element.classList.add('status-error');
   if (isHighlighted) element.classList.add('highlighted');
   ```

3. **Сброс и установка классов:**
   ```javascript
   // Сброс всех состояний
   element.className = 'base-class';
   // Добавление нового состояния
   element.classList.add('new-state');
   ```

### CSS переменные

Используйте CSS переменные VS Code для консистентности:
```css
.my-element {
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    border-color: var(--vscode-charts-red);
}
```

---

## 🚀 Профилактика

### При разработке webview расширения

1. **С самого начала** используйте CSS классы вместо inline стилей
2. **Настройте ESLint правило** для предотвращения использования `element.style`:
   ```json
   {
     "rules": {
       "no-restricted-syntax": [
         "error",
         {
           "selector": "MemberExpression[property.name='style']",
           "message": "Use CSS classes instead of inline styles for CSP compliance"
         }
       ]
     }
   }
   ```

3. **Создайте утилиты** для управления классами:
   ```javascript
   function toggleClass(element, className, condition) {
       if (condition) {
           element.classList.add(className);
       } else {
           element.classList.remove(className);
       }
   }
   ```

### Тестирование

1. **Всегда тестируйте** в реальном VS Code окружении
2. **Проверяйте Developer Tools** на CSP ошибки
3. **Тестируйте на разных темах** VS Code (dark/light/high contrast)

---

## 📝 Чек-лист для исправления CSP проблем

- [ ] Поиск всех `element.style.` в JavaScript коде
- [ ] Поиск всех `style="` в HTML
- [ ] Создание соответствующих CSS классов
- [ ] Замена inline стилей на классы
- [ ] Тестирование функциональности
- [ ] Проверка отсутствия CSP ошибок в консоли
- [ ] Тестирование на разных темах VS Code

---

## 🔗 Полезные ссылки

- [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [Content Security Policy MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [VS Code CSS Variables](https://code.visualstudio.com/api/references/theme-color)

---

**Версия документа:** 001  
**Последнее обновление:** 8 июля 2025  
**Автор:** Claude (AI Assistant)  
**Статус:** Проверено и протестировано