// Source-checkout convenience launcher; player releases use the desktop EXE.
import electron from 'electron';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const child=spawn(electron,[fileURLToPath(new URL('./client/desktop/main.mjs',import.meta.url))],{detached:true,windowsHide:true,stdio:'ignore'});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});child.unref();
