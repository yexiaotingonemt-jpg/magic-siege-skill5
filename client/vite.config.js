import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import {GAME_VERSION,PROTOCOL_VERSION} from '../shared/protocol.js';
export default defineConfig({
 root:fileURLToPath(new URL('.',import.meta.url)),
 plugins:[{name:'client-version-manifest',generateBundle(){this.emitFile({type:'asset',fileName:'client-version.json',source:JSON.stringify({gameVersion:GAME_VERSION,protocolVersion:PROTOCOL_VERSION})});}}],
 server:{host:'127.0.0.1',port:5173,strictPort:true,fs:{allow:[fileURLToPath(new URL('..',import.meta.url))]},proxy:{'/api':{target:process.env.MAGIC_SERVER_URL||'http://127.0.0.1:5183',changeOrigin:true,configure(proxy){proxy.on('proxyReq',req=>{if(req.hasHeader('origin'))req.setHeader('origin',process.env.MAGIC_SERVER_URL||'http://127.0.0.1:5183');});}}}},
 build:{outDir:'dist',rollupOptions:{output:{manualChunks:{phaser:['phaser']}}}},
});
