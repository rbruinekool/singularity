// Navigation tabs component
import {useRouterState, Link } from '@tanstack/react-router';
import { useTheme } from '@mui/material/styles';

const NavTabs = () => {
  const theme = useTheme();
  // Subscribe to location changes so NavTabs rerenders on navigation
  const currentPath = useRouterState({ select: state => state.location.pathname });
  const tabs = [
    { label: 'Rundown', to: '/main' },
    { label: 'Connections', to: '/connections' }
  ];
  return (
    <div style={{ display: 'flex', gap: 32 }}>
      {tabs.map(tab => {
        // Highlight if currentPath matches tab.to or starts with tab.to (for subroutes)
        const isActive = currentPath === tab.to || currentPath.startsWith(tab.to + '/');
        return (
          <Link
            key={tab.to}
            to={tab.to}
            style={{
              textDecoration: 'none',
              color: isActive ? '#1976d2' : '#444',
              fontWeight: 600,
              fontSize: 16,
              padding: '8px 0',
              borderBottom: isActive ? '3px solid #1976d2' : '3px solid transparent',
              transition: 'border-bottom 0.2s',
              ...theme.typography.h5
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
};

export default NavTabs;