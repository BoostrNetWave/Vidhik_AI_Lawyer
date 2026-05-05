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
            '/api': {
                target: 'http://localhost:5025',
                changeOrigin: true,
                secure: false,
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
