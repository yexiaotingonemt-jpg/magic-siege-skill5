import {randomBytes,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {mkdirSync,existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import path from 'node:path';
const scrypt=promisify(scryptCallback);
export class Accounts{
 constructor(directory){mkdirSync(directory,{recursive:true});this.file=path.join(directory,'accounts.json');this.rows=existsSync(this.file)?JSON.parse(readFileSync(this.file,'utf8')):[];this.sessions=new Map();}
 save(){const temp=this.file+'.tmp';writeFileSync(temp,JSON.stringify(this.rows,null,2),{mode:0o600});renameSync(temp,this.file);}
 async register({name,password,side}){
  name=String(name||'').normalize('NFKC').trim();if(!/^[\p{L}\p{N}_-]{2,20}$/u.test(name))throw Error('账号需为2～20位中文、字母、数字、下划线或短横线');
  if(typeof password!=='string'||password.length<6||password.length>128)throw Error('密码需为6～128位');if(side!==0&&side!==1)throw Error('请选择进攻或防守阵营');
  const key=name.toLocaleLowerCase();if(this.rows.some(a=>a.key===key))throw Error('账号已存在，请登录');
  const salt=randomBytes(16).toString('hex'),hash=Buffer.from(await scrypt(password,salt,64)).toString('hex');
  if(this.rows.some(a=>a.key===key))throw Error('账号已存在，请登录');
  const account={id:randomBytes(12).toString('hex'),key,name,side,salt,hash,isHost:this.rows.length===0,createdAt:Date.now()};this.rows.push(account);this.save();return account;
 }
 async login({name,password}){
  if(typeof password!=='string'||password.length>128)throw Error('账号或密码错误');const account=this.rows.find(a=>a.key===String(name||'').normalize('NFKC').trim().toLocaleLowerCase());
  const hash=Buffer.from(await scrypt(password,account?.salt||'unregistered-account',64));if(!account||!timingSafeEqual(hash,Buffer.from(account.hash,'hex')))throw Error('账号或密码错误');return account;
 }
 issue(account){const token=randomBytes(32).toString('base64url');this.sessions.set(token,{id:account.id,until:Date.now()+7*86400000});return token;}
 token(req){return (req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('kc_session='))?.slice(11);}
 get(req){const token=this.token(req),session=this.sessions.get(token);if(!session||session.until<Date.now()){this.sessions.delete(token);return null;}const a=this.rows.find(a=>a.id===session.id);return a?{...a,isSuperAdmin:this.isSuperAdmin(a)}:null;}
 logout(req){this.sessions.delete(this.token(req));}
 isSuperAdmin(a){const file=path.join(path.dirname(this.file),'super-accounts.json');return existsSync(file)&&JSON.parse(readFileSync(file,'utf8')).includes(a.id);}
 public(a){return {id:a.id,name:a.name,side:a.side,isHost:a.isHost,isSuperAdmin:this.isSuperAdmin(a)};}
}
