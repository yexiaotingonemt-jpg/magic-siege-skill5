import {cp,mkdir,readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {packager} from '@electron/packager';
// Client releases and combat compatibility are versioned independently.
import {SERVER_VERSION,CLIENT_VERSION,GAME_VERSION,PROTOCOL_VERSION} from '../shared/protocol.js';
import {parseServerUrl} from '../client/launcher.mjs';

if(SERVER_VERSION!==CLIENT_VERSION)throw Error('客户端与服务器发布版本必须一致');
if(process.platform!=='win32')throw Error('当前桌面发布脚本在Windows构建Windows客户端');
const root=fileURLToPath(new URL('..',import.meta.url));
const require=createRequire(import.meta.url),electronVersion=require('electron/package.json').version;
const built=JSON.parse(await readFile(path.join(root,'client/dist/client-version.json'),'utf8'));
if(built.clientVersion!==CLIENT_VERSION||built.gameVersion!==GAME_VERSION||built.protocolVersion!==PROTOCOL_VERSION)throw Error('客户端构建版本已过期，请先执行 npm run build');
const defaults=JSON.parse(await readFile(path.join(root,'client/client-config.json'),'utf8'));
const arg=process.argv.indexOf('--server');
const settings={serverUrl:parseServerUrl(process.env.MAGIC_SERVER_URL||(arg>=0?process.argv[arg+1]:defaults.serverUrl)).origin};
const stamp=new Date().toISOString().replace(/[-:.TZ]/g,'');
const name=`magic-siege-desktop-v${CLIENT_VERSION}-win-${process.arch}-${stamp}`;
const output=path.join(process.env.MAGIC_RELEASE_DIR?path.resolve(process.env.MAGIC_RELEASE_DIR):path.join(root,'release'),name),staging=await mkdtemp(path.join(tmpdir(),'magic-desktop-package-'));
try{
 const source=path.join(staging,'app');await mkdir(source);
 const copy=(from,to=from)=>cp(path.join(root,from),path.join(source,to),{recursive:true});
 for(const file of ['client/dist','client/desktop','client/launcher.mjs','shared/protocol.js','shared/update-protocol.js'])await copy(file);
 await mkdir(path.join(source,'client'),{recursive:true});
 await writeFile(path.join(source,'client/client-config.json'),JSON.stringify(settings,null,2)+'\n');
 await writeFile(path.join(source,'package.json'),JSON.stringify({name:'magic-siege-desktop',productName:'魔法王座',version:CLIENT_VERSION,type:'module',main:'client/desktop/main.mjs'},null,2));
 for(const [from,to]of [['node_modules/phaser/LICENSE.md','PHASER-LICENSE.md'],['node_modules/eventemitter3/LICENSE','EVENTEMITTER3-LICENSE.txt']])await copy(from,to);
 const [bundle]=await packager({dir:source,out:path.join(staging,'packaged'),name:'MagicSiege',executableName:'魔法王座',platform:'win32',arch:process.arch,electronVersion,download:{checksums:require('electron/checksums.json')},appVersion:CLIENT_VERSION,buildVersion:CLIENT_VERSION+'.0',asar:true,prune:false,win32metadata:{CompanyName:'Magic Siege',ProductName:'魔法王座',FileDescription:'魔法王座桌面客户端'}});
 await mkdir(path.dirname(output),{recursive:true});await cp(bundle,output,{recursive:true});
 await writeFile(path.join(output,'VERSION.json'),JSON.stringify({serverVersion:SERVER_VERSION,clientVersion:CLIENT_VERSION,gameVersion:GAME_VERSION,protocolVersion:PROTOCOL_VERSION,electronVersion,platform:'win32',arch:process.arch},null,2)+'\n');
 await writeFile(path.join(output,'使用说明.txt'),`魔法王座桌面客户端 v${CLIENT_VERSION}\n\n完整解压后，双击“魔法王座.exe”，直接打开独立游戏窗口。无需安装Node.js、浏览器或运行CMD。\n请保留同目录中的全部文件，不能只拷贝EXE。\n\n服务器地址：${settings.serverUrl}\n客户端自动连接此服务器，玩家无需填写或选择地址。登录会话保存在本机用户目录，更新游戏文件时保留。\n关闭游戏窗口即退出本地客户端，不会关闭远端战斗服务器。\n当前客户端版本为${CLIENT_VERSION}，战斗兼容版本为${GAME_VERSION}。发现客户端新版本会自动下载、校验、安装并重新启动；玩家不必手动下载和替换。更新失败保留或恢复旧版本，窗口可重试。战斗规则不兼容时由服务器拒绝进入战局，更新完成后恢复。请将完整游戏文件夹放在当前用户可写的普通目录。\n\n服务器地址随客户端内置；旧版个人服务器设置不会覆盖此地址。\n`);
 const zip=output+'.zip';
 execFileSync('powershell.exe',['-NoProfile','-Command','Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory($env:MAGIC_PACKAGE_PATH, $env:MAGIC_PACKAGE_ZIP, [System.IO.Compression.CompressionLevel]::Optimal, $true)'],{env:{...process.env,MAGIC_PACKAGE_PATH:output,MAGIC_PACKAGE_ZIP:zip},windowsHide:true,stdio:'pipe'});
 const sha256=createHash('sha256').update(await readFile(zip)).digest('hex');
 await writeFile(zip+'.sha256',`${sha256}  ${path.basename(zip)}\n`);
 console.log(JSON.stringify({directory:output,executable:path.join(output,'魔法王座.exe'),zip,sha256,clientVersion:CLIENT_VERSION,gameVersion:GAME_VERSION},null,2));
}finally{
 if(path.dirname(path.resolve(staging))!==path.resolve(tmpdir())||!path.basename(staging).startsWith('magic-desktop-package-'))throw Error('临时目录检查失败');
 await rm(staging,{recursive:true,force:true});
}
