import {DurableObject} from 'cloudflare:workers';
import {MAX_FRAME, MAX_RATE, allowedOrigin, roomPath, allowedData} from './policy.mjs';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') return Response.json({service:'resonant-rooms',version:2});
    if (!allowedOrigin(request.headers.get('Origin'))) return new Response('Origin denied', {status:403});
    const code = roomPath(url.pathname);
    if (!code) return new Response('Room not found', {status:404});
    if (request.method !== 'GET' || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('WebSocket required', {status:426});
    return env.ROOMS.getByName(code).fetch(request);
  }
};

// Only ephemeral socket attachments are retained. No accounts, chat or saved game data.
export class Room extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.sessions = new Map(ctx.getWebSockets().map(ws => [ws,ws.deserializeAttachment()])); }
  send(ws, data) { try { ws.send(JSON.stringify(data)); } catch { this.remove(ws); } }
  fetch(request) {
    const role = new URL(request.url).searchParams.get('role');
    const [client, server] = Object.values(new WebSocketPair());
    const host = [...this.sessions].find(([,s])=>s.role==='host');
    const guest = [...this.sessions].find(([,s])=>s.role==='guest');
    let error;
    if (!['host','guest'].includes(role)) error={code:'invalid',reason:'房间请求无效。'};
    else if (role==='host' && host) error={code:'unavailable-id',reason:'房间码已被使用，请重新创建。'};
    else if (role==='guest' && !host) error={code:'peer-unavailable',reason:'未找到房间，请确认房间码及房主是否在线。'};
    else if (role==='guest' && guest) error={code:'full',reason:'房间已满，两人已经就位。'};
    if (error) { server.accept(); this.send(server,{relay:'error',...error}); server.close(1008,error.code); }
    else {
      const session={role,window:Date.now(),count:0};
      this.ctx.acceptWebSocket(server);server.serializeAttachment(session);this.sessions.set(server,session);
      this.send(server,{relay:'ready'});
      if(role==='guest') this.send(host[0],{relay:'joined'});
    }
    return new Response(null,{status:101,webSocket:client});
  }
  webSocketMessage(ws, message) {
    const session=this.sessions.get(ws);if(!session)return;
    if(typeof message!=='string'||message.length>MAX_FRAME){ws.close(1009,'Frame too large');this.remove(ws);return;}
    const now=Date.now();if(now-session.window>1000){session.window=now;session.count=0;}
    if(++session.count>MAX_RATE){ws.close(1008,'Rate exceeded');this.remove(ws);return;}
    ws.serializeAttachment(session);
    let packet;try{packet=JSON.parse(message);}catch{ws.close(1007,'Invalid JSON');this.remove(ws);return;}
    const other=[...this.sessions].find(([,s])=>s.role!==session.role)?.[0];
    if(packet?.relay==='kick'&&session.role==='host'){if(other){other.close(1008,'Seat rejected');this.remove(other);}return;}
    if(packet?.relay==='data'&&allowedData(session.role,packet.data)&&other)this.send(other,packet);
  }
  remove(ws) {
    const session=this.sessions.get(ws);if(!session)return;this.sessions.delete(ws);
    for(const [other,s] of this.sessions) {
      if(session.role==='host'){this.send(other,{relay:'error',code:'closed',reason:'房主已关闭房间，请返回营地重新创建或加入。'});other.close(1000,'Host left');this.sessions.delete(other);}
      else if(s.role==='host')this.send(other,{relay:'left'});
    }
  }
  webSocketClose(ws) { this.remove(ws); }
  webSocketError(ws) { this.remove(ws); }
}
