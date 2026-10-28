import {defineConfig} from '@playwright/test';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {mkdirSync} from 'node:fs';
process.env.MAGIC_QA_DIR??=path.join(tmpdir(),'magic-siege-browser-qa');
mkdirSync(process.env.MAGIC_QA_DIR,{recursive:true});
const baseURL=`http://127.0.0.1:${Number(process.env.MAGIC_BROWSER_PORT||5194)}`;
export default defineConfig({testDir:'./tests',testMatch:'*.spec.js',testIgnore:'**/*.electron.spec.js',workers:1,outputDir:path.join(process.env.MAGIC_QA_DIR,'test-results'),reporter:[['list'],['json',{outputFile:path.join(process.env.MAGIC_QA_DIR,'browser-results.json')}]],webServer:{command:'node scripts/playtest-server.mjs',url:baseURL+'/api/health',reuseExistingServer:false},use:{baseURL,headless:true,...(process.env.CHROME_PATH||process.platform==='win32'?{launchOptions:{executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'}}:{}),viewport:{width:1440,height:1100}},timeout:45000});
