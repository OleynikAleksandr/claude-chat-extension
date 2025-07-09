/**
 * Claude State Detection Module
 * Центральный экспорт для модуля детекции состояний
 */

export { ClaudeStateDetectionFacade } from './ClaudeStateDetectionFacade';
export { ClaudeStateManager } from './managers/ClaudeStateManager';
export { JsonlPatternDetector } from './detectors/JsonlPatternDetector';
export { DualSessionStateAdapter } from './adapters/DualSessionStateAdapter';

export {
    ClaudeCodeState,
    StateDetectionEvent,
    StateTransition,
    StateDetectionConfig,
    ActivityPattern,
    StateChangeCallback,
    StateTransitionCallback
} from './types/ClaudeState';