import { createServer } from 'http';
import { createMergeableStore } from 'tinybase/mergeable-store';
import { createWsServer } from 'tinybase/synchronizers/synchronizer-ws-server';
import { WebSocketServer } from 'ws';
import { createFilePersister } from 'tinybase/persisters/persister-file';
import { PatchSingular } from './singular/patch-singular.ts';
import { createLogger } from './utils/logger.ts';


const store = createMergeableStore();
const logger = createLogger('server');

// Add connection tracking for memory monitoring
const connectionTracker = new Map();
let connectionCount = 0;

const wsServer = createWsServer(
  new WebSocketServer({
    port: 8043,
    // Add connection limits for development
    maxPayload: 16 * 1024 * 1024, // 16MB max payload
    perMessageDeflate: false, // Disable compression to reduce memory usage
  }),
  // Store state as json
  (pathId) => (createFilePersister(
    store,
    'data/store.json',
  ))
);

//Animation change listener for Singular compositions
store.addCellListener(
  'rundown-1', //TODO add support for more rundowns
  null,
  'status',
  async (store, tableId, rowId, cellId, newValue, oldValue, getCellChange) => {
    const animationStates = ['In', 'Out1', 'Out2'];
    if (typeof newValue !== 'string') return;
    if (!animationStates.includes(newValue)) return;

    logger.info({
      tableId,
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
    logger.info({
      tableId,
      rowId,
      cellId,
      newValue,
      oldValue
    }, 'Component data updated');

    // Use the consolidated PatchSingular function without animation state (payload update only)
    await PatchSingular(store, tableId, rowId);
  }
)

// -- Optional metrics handling hereon
wsServer.addClientIdsListener(null, () => updatePeakStats());
const stats = { paths: 0, clients: 0 };

createServer((request, response) => {
  switch (request.url) {
    case '/metrics':
      response.writeHead(200);
      response.write(`# HELP sub_domains The total number of sub-domains.\n`);
      response.write(`# TYPE sub_domains gauge\n`);
      response.write(`sub_domains 1\n`);

      response.write(
        `# HELP peak_paths The highest number of paths recently managed.\n`,
      );
      response.write(`# TYPE peak_paths gauge\n`);
      response.write(`peak_paths ${stats.paths}\n`);

      response.write(
        `# HELP peak_clients The highest number of clients recently managed.\n`,
      );
      response.write(`# TYPE peak_clients gauge\n`);
      response.write(`peak_clients ${stats.clients}\n`);

      updatePeakStats(1);
      break;

    case '/test':
      response.writeHead(200);
      //store.setCell('rundown-1', '0', 'name', 'Test value');
      response.write('Test endpoint is working!');
      break;
    default:
      response.writeHead(404);
      break;
  }
  response.end();
}).listen(8044);

const updatePeakStats = (reset = 0) => {
  if (reset) {
    stats.paths = 0;
    stats.clients = 0;
  }
  const newStats = wsServer.getStats();
  stats.paths = Math.max(stats.paths, newStats.paths ?? 0);
  stats.clients = Math.max(stats.clients, newStats.clients ?? 0);
};

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
    console.error('This might be caused by development mode rebuilds');
    console.error('Consider restarting both server and client');
  }
};

// Monitor memory every 5 minutes
setInterval(monitorMemory, 2 * 60 * 1000);

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
