import {createGameServer} from '../server.mjs';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
const {server}=createGameServer({dataDir:mkdtempSync(path.join(tmpdir(),'kc5-browser-'))});
server.listen(5194,'127.0.0.1');
