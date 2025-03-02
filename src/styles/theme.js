import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#2E7D32' }, // Green color for POS
    secondary: { main: '#FFA000' }, // Accent color
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
  },
});

export default theme;
