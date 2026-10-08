import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth';
import App from './app';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import './styles.css';
import './styles/exercises.css';
const cache = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1, refetchOnWindowFocus: true } },
});
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={cache}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
