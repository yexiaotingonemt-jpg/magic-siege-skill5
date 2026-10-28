import {createGameServer} from '../server/index.mjs';
import {createLocalClient} from '../client/launcher.mjs';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
const {server}=createGameServer({dataDir:mkdtempSync(path.join(tmpdir(),'kc5-browser-'))});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const client=createLocalClient({serverUrl:`http://127.0.0.1:${server.address().port}`});
client.server.listen(Number(process.env.MAGIC_BROWSER_PORT||5194),'127.0.0.1');
