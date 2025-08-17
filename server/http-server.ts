import { createServer } from 'http';
import { createLogger } from './utils/logger.ts';
import type { MergeableStore } from 'tinybase/mergeable-store';
import { getRundown, processPatchRequest } from './datastore/index.ts';

const logger = createLogger('http-server');

/**
 * Creates and configures the HTTP server with metrics and test endpoints
 * @param wsServer - WebSocket server instance for getting stats
 * @param store - TinyBase MergeableStore instance
 * @returns HTTP server instance
 */
export const createHttpServer = (wsServer: any, store: MergeableStore) => {
    const stats = { paths: 0, clients: 0 };

    const updatePeakStats = (reset = 0) => {
        if (reset) {
            stats.paths = 0;
            stats.clients = 0;
        }
        const newStats = wsServer.getStats();
        stats.paths = Math.max(stats.paths, newStats.paths ?? 0);
        stats.clients = Math.max(stats.clients, newStats.clients ?? 0);
    };

    const server = createServer((request, response) => {
        logger.debug({ url: request.url, method: request.method }, 'HTTP request received');

        switch (request.url) {
            case '/singular/control':
                switch (request.method) {
                    case 'PATCH':
                        // Read the JSON body from the request
                        let body = '';
                        request.on('data', chunk => {
                            body += chunk.toString();
                        });
                        
                        request.on('end', () => {
                            try {
                                const jsonData = JSON.parse(body);
                                logger.info({ body: jsonData }, 'PATCH request received');
                                
                                // Process the PATCH request using the new function
                                const result = processPatchRequest(store, jsonData);
                                
                                if (result.success) {
                                    response.writeHead(200, { 'Content-Type': 'application/json' });
                                    response.write(JSON.stringify({ 
                                        success: true, 
                                        message: result.message
                                    }));
                                } else {
                                    response.writeHead(400, { 'Content-Type': 'application/json' });
                                    response.write(JSON.stringify({ 
                                        success: false, 
                                        error: result.message,
                                        details: result.errors || []
                                    }));
                                }
                                response.end();
                                
                            } catch (error) {
                                logger.error({ error: error.message, body }, 'Failed to parse JSON body');
                                response.writeHead(400, { 'Content-Type': 'application/json' });
                                response.write(JSON.stringify({ 
                                    success: false, 
                                    error: 'Invalid JSON in request body' 
                                }));
                                response.end();
                            }
                        });
                        
                        request.on('error', (error) => {
                            logger.error({ error: error.message }, 'Error reading request body');
                            response.writeHead(500, { 'Content-Type': 'application/json' });
                            response.write(JSON.stringify({ 
                                success: false, 
                                error: 'Error reading request body' 
                            }));
                            response.end();
                        });
                        return; // Prevent falling through to the bottom response.end()
                    case 'GET':
                        response.writeHead(200, { 'Content-Type': 'application/json' });
                        response.write(JSON.stringify(getRundown(store)));
                        response.end();
                        return;
                    default:
                        response.writeHead(405, { 'Content-Type': 'text/plain' });
                        response.write('Method Not Allowed');
                        response.end();
                        logger.debug({ method: request.method }, 'HTTP 405 - Method Not Allowed');
                        return;
                }
                return; // Prevent falling through to the bottom response.end()

            case '/health':
                response.writeHead(200, { 'Content-Type': 'application/json' });
                response.write(JSON.stringify({
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    memory: process.memoryUsage()
                }));
                logger.debug('Health check endpoint accessed');
                response.end();
                return;

                        case '/metrics':
                response.writeHead(200, { 'Content-Type': 'text/plain' });
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
                logger.debug({ paths: stats.paths, clients: stats.clients }, 'Metrics endpoint accessed');
                response.end();
                return;

            default:
                response.writeHead(404, { 'Content-Type': 'text/plain' });
                response.write('Not Found');
                response.end();
                logger.debug({ url: request.url }, 'HTTP 404 - Route not found');
        }
    });


    // Return both the server and the updatePeakStats function for external use
    return {
        server,
        updatePeakStats
    };
};