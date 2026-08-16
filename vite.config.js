import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    // tasks.json is ~250KB; keep the warning threshold above it so a normal
    // build doesn't look like it's gone wrong.
    chunkSizeWarningLimit: 700,
  },
  server: {
    port: 5173,
    open: true,
  },
});
