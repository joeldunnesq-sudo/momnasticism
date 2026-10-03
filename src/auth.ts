import {createRemoteJWKSet,jwtVerify} from 'jose';
export interface AuthEnv {ACCESS_TEAM_DOMAIN:string;ACCESS_AUD:string;ADMIN_EMAILS?:string;ADMIN_ALLOWLIST?:string;LOCAL_DEV_AUTH?:string}
const keys=new Map<string,ReturnType<typeof createRemoteJWKSet>>();
export async function authorized(req:Request,env:AuthEnv):Promise<boolean>{
 const url=new URL(req.url);
 if(env.LOCAL_DEV_AUTH==='true'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)&&url.protocol==='http:')return true;
 const allowedEmails=env.ADMIN_ALLOWLIST||env.ADMIN_EMAILS;
 if(!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD||!allowedEmails)return false;
 const token=req.headers.get('Cf-Access-Jwt-Assertion')||req.headers.get('Cookie')?.match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1];if(!token)return false;
 try{const issuer=`https://${env.ACCESS_TEAM_DOMAIN}`;if(!keys.has(issuer))keys.set(issuer,createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)));const {payload}=await jwtVerify(token,keys.get(issuer)!,{issuer,audience:env.ACCESS_AUD,algorithms:['RS256']});return typeof payload.email==='string'&&allowedEmails.split(',').map(s=>s.trim().toLowerCase()).includes(payload.email.toLowerCase());}catch{return false;}
}
export function sameOrigin(req:Request):boolean{return req.headers.get('Origin')===new URL(req.url).origin&&req.headers.get('X-Momnasticism-Request')==='1';}
