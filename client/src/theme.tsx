import { ThemeOptions } from "@mui/material/styles";


declare module '@mui/material/styles' {
  interface Theme {
    custom: {
      autocompleteBackground: string;
      live: string;
      liveHover: string;
    };
  }
  interface ThemeOptions {
    custom?: {
      autocompleteBackground?: string;
      live?: string;
      liveHover?: string;
    };
  }
}


export const themeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: '#ff4e00',
      light: '#ff881d',
      dark: '#222222',
    },
    secondary: {
      main: '#00e05a',
      light: '#ceff00',
    },
    error: {
      main: '#fb1200',
    },
    background: {
      default: '#1e2c52ff',
      paper: '#16213e',
    },
  },
  typography: {
    subtitle1: {
      fontFamily: 'PT Sans',
    },
    body1: {
      fontFamily: 'Lato',
      fontSize: '0.6rem',
    },
    body2: {
      fontFamily: 'Lato',
      fontSize: '0.8rem',
    },
    h1: {
      fontFamily: 'Lato',
    },
    h2: {
      fontFamily: 'Khand',
    },
    h3: {
      fontFamily: 'Khand',
    },
    h4: {
      fontFamily: 'Khand',
    },
    h5: {
      fontFamily: 'Khand',
    },
    h6: {
      fontFamily: 'Khand',
    },
  },
  spacing: 8,
  custom: {
    autocompleteBackground: '#333333', // Custom property for autocomplete background
    live: '#732222', // Custom property for live row background
    liveHover: '#8B3333', // Custom property for live row hover background (lighter)
  },
};