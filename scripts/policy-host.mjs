// Real browser regression fixture: a response policy denies gamepads to the child.
import http from 'node:http';
http.createServer((req,res)=>{
 const target=Number(new URL(req.url,'http://localhost').searchParams.get('port')||5178);
 if(![5178,5188].includes(target)){res.writeHead(400);res.end();return;}
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Permissions-Policy':'gamepad=()'});
 res.end(`<!doctype html><html><head><title>RESONANT · gamepad policy regression</title><style>body{margin:0;background:#071516}iframe{width:100vw;height:100vh;border:0}</style></head><body><iframe title="Restricted gamepad test" src="http://127.0.0.1:${target}/"></iframe></body></html>`);
}).listen(58932,'127.0.0.1',()=>console.log('Restricted iframe fixture: http://127.0.0.1:58932/'));
