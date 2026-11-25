import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build` gera a build normal em dist/ (dados no browser).
// `npm run build:single` gera um único index.html autónomo em dist-single/ (abre com duplo clique).
// `npm run build:online` gera dist-online/ com os dados partilhados no Supabase, para publicar.
export default defineConfig(({ mode }) => ({
  plugins: mode === 'single' ? [react(), viteSingleFile()] : [react()],
  define: { __SYNC__: JSON.stringify(mode === 'online') },
  build:
    mode === 'single' ? { outDir: 'dist-single', assetsInlineLimit: 100000000 }
    : mode === 'online' ? { outDir: 'dist-online' }
    : { outDir: 'dist' },
}));
