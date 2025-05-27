import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
    plugins: [
        dts({
            outDir: ['./pkg/dist'],
            rollupTypes: true,
        }),
    ],
    build: {
        target: 'es2020',
        outDir: './pkg/dist',
        lib: {
            entry: './src/reall3d/pkg.ts',
            name: 'reall3dviewer',
            fileName: 'pkg',
        },
        rollupOptions: {
            external: ['three', '@gotoeasy/three-tile'],
            output: {
                globals: {
                    three: 'THREE',
                    '@gotoeasy/three-tile': 'tt',
                },
                assetFileNames: asset => (asset.name?.endsWith('.css') ? 'style.css' : '[name].[extname]'),
            },
        },
    },
});
