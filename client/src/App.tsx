import { StrictMode } from 'react';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { createMergeableStore, MergeableStore } from 'tinybase';
import { createSessionPersister } from 'tinybase/persisters/persister-browser';
import { createWsSynchronizer } from 'tinybase/synchronizers/synchronizer-ws-client';
import {
  Provider,
  useCreateMergeableStore,
  useCreatePersister,
  useCreateSynchronizer,
} from 'tinybase/ui-react';
import { Inspector } from 'tinybase/ui-react-inspector';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { themeOptions } from './theme';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import { RouterProvider, Outlet, Navigate, createRouter, createRootRoute, createRoute } from '@tanstack/react-router';
import NavTabs from './components/navtabs';
import Connections from './pages/connections';
import Main from './pages/main';
import Variables from './pages/variables';
import Tables from './pages/tables';

const SERVER_SCHEME = 'ws://';
const SERVER_HOST = import.meta.env.VITE_SERVER_HOST || 'localhost';
const SERVER_PORT = import.meta.env.VITE_SERVER_PORT || '8043';
const SERVER = `${SERVER_HOST}:${SERVER_PORT}`;

const queryClient = new QueryClient();
const theme = createTheme(themeOptions);

// TanStack Router setup (move outside App to avoid duplicate registration)
const RootRoute = createRootRoute({
  component: () => {
    // These hooks must be called inside the component
    //const serverPathId = location.pathname;
    const store = useCreateMergeableStore(() => createMergeableStore());

    useCreatePersister(
      store,
      (store) => {
        console.log('persister created');
        return createSessionPersister(store, 'local://' + SERVER);
      },
      [],
      async (persister) => {
        await persister.startAutoLoad();
        await persister.startAutoSave();
      }
    );

    useCreateSynchronizer(store, async (store: MergeableStore) => {
      const synchronizer = await createWsSynchronizer(
        store,
        new ReconnectingWebSocket(SERVER_SCHEME + SERVER),
        1
      );
      await synchronizer.startSync();

      // If the websocket reconnects in the future, do another explicit sync.
      synchronizer.getWebSocket().addEventListener('open', () => {
        console.log('websocket reconnected, forcing sync')
        synchronizer.load().then(() => synchronizer.save());
      });

      return synchronizer;
    });

    //store.delTable('$Players$');
    // store.delTable('DataTables');
    return (
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <QueryClientProvider client={queryClient}>
            <AppBar position="static" color="primary" elevation={0} sx={{ borderBottom: '1px solid #eee' }}>
              <Toolbar disableGutters sx={{ px: 2, minWidth: 0 }}>
                <NavTabs />
              </Toolbar>
            </AppBar>
            <StrictMode>
              <Outlet />
              <Inspector />
            </StrictMode>
          </QueryClientProvider>
        </ThemeProvider>
      </Provider>
    );
  },
});
const IndexRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/',
  component: () => <Navigate to="/main" />,
});
const MainRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: 'main',
  component: Main,
});
const ConnectionsRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: 'connections',
  component: Connections,
});
const VariablesRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: 'variables',
  component: Variables,
});
const TablesRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: 'tables',
  component: Tables,
});
const routeTree = RootRoute.addChildren([IndexRoute, MainRoute, ConnectionsRoute, VariablesRoute, TablesRoute]);
const router = createRouter({ routeTree });

export const App = () => {
  return <RouterProvider router={router} />;
};
