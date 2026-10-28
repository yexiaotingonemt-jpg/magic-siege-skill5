import {defineConfig} from '@playwright/test';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {mkdirSync} from 'node:fs';
process.env.MAGIC_QA_DIR??=path.join(tmpdir(),'magic-siege-desktop-qa');
mkdirSync(process.env.MAGIC_QA_DIR,{recursive:true});
export default defineConfig({testDir:'./tests',testMatch:'desktop.electron.spec.js',workers:1,timeout:60000,outputDir:path.join(process.env.MAGIC_QA_DIR,'test-results'),reporter:[['list'],['json',{outputFile:path.join(process.env.MAGIC_QA_DIR,'desktop-results.json')}]]});
