import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'remoteSupplier',
      filename: 'remoteEntry.js',
      exposes: {
        './SupplierApp': './src/SupplierApp.tsx',
      },
      shared: [
        'react',
        'react-dom',
        'react-router-dom',
      ],
    }),
  ],
  server: {
    port: 6002,
    strictPort: true,
    https: {
      key: fs.existsSync('../host-app/localhost-key.pem') ? fs.readFileSync('../host-app/localhost-key.pem') : undefined,
      cert: fs.existsSync('../host-app/localhost.pem') ? fs.readFileSync('../host-app/localhost.pem') : undefined,
    },
  },
  preview: {
    port: 6002,
    strictPort: true,
    https: {
      key: fs.existsSync('../host-app/localhost-key.pem') ? fs.readFileSync('../host-app/localhost-key.pem') : undefined,
      cert: fs.existsSync('../host-app/localhost.pem') ? fs.readFileSync('../host-app/localhost.pem') : undefined,
    },
  },
  build: {
    target: 'esnext',
    cssCodeSplit: false,
  },
});
