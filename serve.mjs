import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const port=Number(process.env.RESONANT_PORT||5188);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
 try {
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  if(!(await stat(file)).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
  res.end(req.method==='HEAD'?undefined:await readFile(file));
 }catch{res.writeHead(404);res.end('Not found');}
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Port ${port} is already in use. A game server may already be running.`:e.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`RESONANT is ready: http://127.0.0.1:${port}\nKeep this window open while playing. Ctrl+C to stop.`));
