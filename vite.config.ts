import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base:
    process.env.VITE_BASE ??
    (mode === 'production' ? '/BadCaseTools/' : '/'),
  optimizeDeps: {
    exclude: ['pyodide'],
  },
}));
