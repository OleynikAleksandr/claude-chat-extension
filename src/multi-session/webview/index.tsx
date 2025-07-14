/**
 * React Application Entry Point
 * Claude Chat Extension - Multi-Session UI
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App';

// Get the root element
const container = document.getElementById('root');
if (!container) {
  throw new Error('Failed to find the root element');
}

// Create React root and render the app
const root = createRoot(container);
root.render(<App />);