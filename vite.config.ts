import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const ACTIVE_CONFIG_FILE = path.resolve(__dirname, '.supabase_active_config.json');

function supabaseActiveConfigPlugin(): Plugin {
  return {
    name: 'supabase-active-config-plugin',
    configureServer(server) {
      server.middlewares.use('/api/active-config', (req, res) => {
        if (req.method === 'GET') {
          let config = { url: 'https://fkzuqvwdngijgacereru.supabase.co', anonKey: '' };
          try {
            if (fs.existsSync(ACTIVE_CONFIG_FILE)) {
              const content = fs.readFileSync(ACTIVE_CONFIG_FILE, 'utf-8');
              const parsed = JSON.parse(content);
              if (parsed && parsed.url) {
                config = {
                  url: parsed.url,
                  anonKey: parsed.anonKey || '',
                };
              }
            }
          } catch (e) {
            console.error('Error reading active config:', e);
          }
          res.setHeader('Content-Type', 'application/json');
          if (config.anonKey) {
            res.setHeader('Set-Cookie', [
              `gold_shop_sb_url=${encodeURIComponent(config.url)}; Path=/; Max-Age=31536000; SameSite=Lax`,
              `gold_shop_sb_key=${encodeURIComponent(config.anonKey)}; Path=/; Max-Age=31536000; SameSite=Lax`,
            ]);
          }
          res.end(JSON.stringify(config));
        } else if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              if (data && data.url) {
                const cleanData = {
                  url: String(data.url).trim(),
                  anonKey: String(data.anonKey || '').trim(),
                  updatedAt: new Date().toISOString(),
                };
                fs.writeFileSync(ACTIVE_CONFIG_FILE, JSON.stringify(cleanData, null, 2), 'utf-8');
                res.setHeader('Content-Type', 'application/json');
                if (cleanData.anonKey) {
                  res.setHeader('Set-Cookie', [
                    `gold_shop_sb_url=${encodeURIComponent(cleanData.url)}; Path=/; Max-Age=31536000; SameSite=Lax`,
                    `gold_shop_sb_key=${encodeURIComponent(cleanData.anonKey)}; Path=/; Max-Age=31536000; SameSite=Lax`,
                  ]);
                }
                res.end(JSON.stringify({ success: true, ...cleanData }));
                return;
              }
            } catch (e) {
              console.error('Error saving active config:', e);
            }
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid config payload' }));
          });
        } else {
          res.statusCode = 405;
          res.end('Method Not Allowed');
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      supabaseActiveConfigPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['apple-touch-icon.png', 'icon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          id: '/',
          name: 'ရွှေရတနာ ရွှေဆိုင် POS စနစ်',
          short_name: 'ရွှေဆိုင် POS',
          description: 'မြန်မာ့ရွှေဆိုင်သုံး POS အရောင်းနှင့် ပစ္စည်းလက်ကျန် စီမံခန့်ခွဲမှုစနစ် (Offline-First POS)',
          theme_color: '#1c1917',
          background_color: '#1c1917',
          display: 'standalone',
          start_url: '.',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // Allow up to 15MB for unminified bundles
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'lucide-react'],
    },
    server: {
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
