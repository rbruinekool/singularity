import { createServer } from 'http';
import { createMergeableStore } from 'tinybase/mergeable-store';
import { createWsServer } from 'tinybase/synchronizers/synchronizer-ws-server';
import { WebSocketServer } from 'ws';
import { createFilePersister } from 'tinybase/persisters/persister-file';


const store = createMergeableStore();
const wsServer = createWsServer(
  new WebSocketServer({ port: 8043 }),
  // Store state as json
  (pathId) => createFilePersister(
    store,
    'data/store.json',
  ),
);

//store.delTable('rundown-1'); //HACK to reset the rundown table

//TODO Add intiial fetch of data on server start

//Detect Changes of animation status of singular compositions and then play them in or out
store.addCellListener(
  'rundown-1', //TODO add support for more rundowns
  null,
  'status',
  (store, tableId, rowId, cellId, newValue, oldValue, getCellChange) => {
    const subCompId = store.getCell(tableId, rowId, 'subcompId');
    const appToken = store.getCell(tableId, rowId, 'appToken');

    // Send PATCH request to Singular Live API
    if (appToken && subCompId) {
      fetch(`https://app.singular.live/apiv2/controlapps/${appToken}/control`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          {
            "subCompositionId": subCompId,
            "state": newValue
          }
        ])
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        //console.log('Successfully sent control command to Singular Live:', data);
      })
      .catch(error => {
        console.error('Error sending control command to Singular Live:', error);
      });
    }

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
