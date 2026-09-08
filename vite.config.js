import {defineConfig} from 'vite';
export default defineConfig({build:{rollupOptions:{input:{main:'index.html',compositions:'compositions.html',legacy:'legacy.html'},output:{manualChunks(id){if(id.includes('node_modules/three'))return 'three';if(id.includes('node_modules/@codemirror')||id.includes('node_modules/@lezer')||id.includes('node_modules/style-mod'))return 'editor';}}}}});
