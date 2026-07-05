import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      federation({
        remotes: command === 'serve' ? {} : {
          remoteBuyer: env.VITE_REMOTE_BUYER_URL || 'https://localhost:6001/assets/remoteEntry.js',
          remoteSupplier: env.VITE_REMOTE_SUPPLIER_URL || 'https://localhost:6002/assets/remoteEntry.js',
        },
        shared: [
          'react',
          'react-dom',
          'react-router-dom',
        ],
      }),
    ],
    resolve: {
      alias: command === 'serve' ? {
        'remoteBuyer/BuyerApp': path.resolve(__dirname, '../remote-buyer/src/BuyerApp.tsx'),
        'remoteSupplier/SupplierApp': path.resolve(__dirname, '../remote-supplier/src/SupplierApp.tsx'),
      } : undefined,
    },
    server: {
      port: 6005,
      strictPort: true,
      https: {
        key: fs.existsSync('./localhost-key.pem') ? fs.readFileSync('./localhost-key.pem') : undefined,
        cert: fs.existsSync('./localhost.pem') ? fs.readFileSync('./localhost.pem') : undefined,
      },
      proxy: {
        '/vosox-api': {
          target: 'https://vosox-api.chervicaon.com',
          changeOrigin: true,
          secure: true,
          rewrite: (p: string) => p.replace(/^\/vosox-api/, ''),
        },
      }, // This is done for running the application locally. When our application is deployed to production we can remove this.
    },
    build: {
      target: 'esnext',
      minify: false,
      cssCodeSplit: false,
    },
  };
});
