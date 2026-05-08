import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
    plugins: [react()],
    base: '/lawyer/',
    server: {
        port: 8081,
        proxy: {
            '/lawyer/api': {
                target: 'http://localhost:5025',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/lawyer\/api/, '/api')
            }
        }
    },
    css: {
        postcss: {
            plugins: [
                tailwindcss(),
                autoprefixer(),
            ],
        },
    },
});
