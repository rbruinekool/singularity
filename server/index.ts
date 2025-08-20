import { createMergeableStore, type MergeableStore } from 'tinybase/mergeable-store';
import { createWsServer } from 'tinybase/synchronizers/synchronizer-ws-server';
import { WebSocketServer } from 'ws';
import { createFilePersister } from 'tinybase/persisters/persister-file';
import { PatchSingular } from './singular/patch-singular.ts';
import { createLogger } from './utils/logger.ts';
import { createHttpServer } from './http-server.ts';


const logger = createLogger('server');

// Add connection tracking for memory monitoring
const connectionTracker = new Map();
let connectionCount = 0;

const store = createMergeableStore();
const wsServer = createWsServer(
  new WebSocketServer({
    port: 8043,
  }),
  // Store state as json
  (pathId) => (createFilePersister(
    store,
    'data/store.json',
  ))
);

//Animation change listener for Singular compositions
store.addCellListener(
  'rundown-1', 
  null,
  'state',
  async (store, tableId, rowId, cellId, newValue, oldValue, getCellChange) => {
    const animationStates = ['In', 'Out1', 'Out2'];
    if (typeof newValue !== 'string') return;
    if (typeof oldValue !== 'string') return;
    if (!animationStates.includes(newValue)) return;
    if (!animationStates.includes(oldValue)) return;

    logger.debug({
      rowId,
      oldValue,
      newValue
    }, 'Animation status changed');

    // Use the consolidated PatchSingular function with animation state
    await PatchSingular(store, tableId, rowId, newValue as 'In' | 'Out1' | 'Out2');
  }
)

// Asset update listener for Singular compositions
store.addCellListener(
  'rundown-1', //TODO add support for more rundowns
  null,
  'update',
  async (store, tableId, rowId, cellId, newValue, oldValue, getCellChange) => {
        if (typeof newValue !== 'number') return;
    if (typeof oldValue !== 'number') return;
    logger.debug({
      rowId,
      cellId,
      newValue,
      oldValue
    }, 'Component data updated');

    // Use the consolidated PatchSingular function without animation state (payload update only)
    await PatchSingular(store, tableId, rowId);
  }
)

// Create HTTP server
const { server: httpServer, updatePeakStats } = createHttpServer(wsServer, store);
httpServer.listen(8044);

// -- Optional metrics handling hereon
wsServer.addClientIdsListener(null, () => updatePeakStats());

// Memory monitoring and graceful shutdown
let lastMemoryUsage = 0;
const monitorMemory = () => {
  const used = process.memoryUsage();
  const memoryUsageMB = Math.round(used.rss / 1024 / 1024 * 100) / 100;
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024 * 100) / 100;
  const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024 * 100) / 100;

  // Detect sudden spikes (more than 100MB increase)
  const memoryIncrease = memoryUsageMB - lastMemoryUsage;
  if (memoryIncrease > 100) {
    console.warn(`🚨 Memory spike detected! Increased by ${memoryIncrease}MB`);
    console.warn(`Heap: ${heapUsedMB}/${heapTotalMB}MB, RSS: ${memoryUsageMB}MB`);
    console.warn(`Active connections: ${connectionTracker.size}`);
    console.warn(`WebSocket stats:`, wsServer.getStats());
  }

  // Log every 2 minutes instead of 5 for better tracking
  console.log(`Memory: ${memoryUsageMB}MB (heap: ${heapUsedMB}MB), Connections: ${connectionTracker.size}`);

  lastMemoryUsage = memoryUsageMB;

  // Lower thresholds for development
  if (memoryUsageMB > 512) { // 512MB threshold
    console.warn('High memory usage detected, triggering garbage collection');
    if (global.gc) {
      global.gc();
    }
  }

  if (memoryUsageMB > 1024) { // 1GB critical threshold
    console.error('🚨 Critical memory usage detected!');
    console.error('Consider restarting both server and client');
  }
};

// Monitor memory every second for development
setInterval(monitorMemory, 1000);

// Graceful shutdown handlers
const gracefulShutdown = (signal: string) => {
  console.log(`Received ${signal}, starting graceful shutdown...`);

  // Close WebSocket server
  wsServer.destroy();

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Exit after cleanup
  setTimeout(() => {
    console.log('Graceful shutdown completed');
    process.exit(0);
  }, 1000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('Server started successfully on ports 8043 (WebSocket) and 8044 (HTTP)');
