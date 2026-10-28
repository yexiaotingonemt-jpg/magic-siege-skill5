// Browser QA uses the same separate local client and API server as players.
import {createGameServer} from '../server/index.mjs';
import {createLocalClient} from '../client/launcher.mjs';
export async function createBrowserGame(options){
 const game=createGameServer(options);
 await new Promise(resolve=>game.server.listen(0,'127.0.0.1',resolve));
 const local=createLocalClient({serverUrl:`http://127.0.0.1:${game.server.address().port}`});
 local.server.on('close',()=>{for(const client of game.room.clients)client.res.end();game.server.closeAllConnections();game.server.close();});
 return {...game,battleServer:game.server,server:local.server};
}
