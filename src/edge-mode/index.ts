/**
 * Edge Mode Module
 * Air-gap / disconnected operation for forward-deployed AIOBS nodes
 */

export { EdgeBuffer } from './edge-buffer';
export { ResyncManager } from './resync-manager';
export {
  isEdgeModeEnabled,
  getDefaultEdgeModeConfig,
  getDefaultBufferConfig,
  getDefaultResyncConfig,
  validateEdgeModeConfig,
} from './edge-mode-config';
