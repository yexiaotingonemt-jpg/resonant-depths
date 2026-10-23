// Browser transport: all game packets use WSS, including players on different NATs.
// The room service handles admission and forwarding; the host owns simulation.
type Listener=(value?:any)=>void;
class Events {
 private listeners=new Map<string,Listener[]>();
 on(name:string,fn:Listener){this.listeners.set(name,[...(this.listeners.get(name)||[]),fn]);return this;}
 emit(name:string,value?:unknown){for(const fn of this.listeners.get(name)||[])fn(value);}
}
export class RelayConnection extends Events {
 open=true;
 constructor(private peer:RelayPeer){super();}
 send(data:unknown){this.peer.send({relay:'data',data});}
 close(){if(!this.open)return;this.open=false;this.peer.closeConnection();this.emit('close');}
 ended(){if(!this.open)return;this.open=false;this.emit('close');}
}
export class RelayPeer extends Events {
 destroyed=false;disconnected=false;private socket:WebSocket;private current:RelayConnection|null=null;
 constructor(private role:'host'|'guest',code:string){
  super();
  const endpoint=import.meta.env.VITE_RELAY_URL||'wss://resonant-rooms.yexiaoting-onemt.workers.dev';
  const url=new URL('/rooms/'+code,endpoint);url.searchParams.set('role',role);
  this.socket=new WebSocket(url);
  this.socket.addEventListener('message',event=>{
   let packet;try{packet=JSON.parse(event.data);}catch{return;}
   switch(packet.relay){
    case'ready':this.emit('open');break;
    case'joined':if(this.role==='host'){this.current=new RelayConnection(this);this.emit('connection',this.current);queueMicrotask(()=>this.current?.emit('open'));}break;
    case'left':{const old=this.current;this.current=null;old?.ended();break;}
    case'data':this.current?.emit('data',packet.data);break;
    case'error':this.disconnected=true;this.emit('error',{type:packet.code,message:packet.reason});break;
   }
  });
  this.socket.addEventListener('close',()=>{const reported=this.disconnected;this.disconnected=true;this.current?.ended();this.current=null;if(!this.destroyed&&!reported)this.emit('error',{type:'network'});});
  this.socket.addEventListener('error',()=>{if(!this.destroyed)this.emit('error',{type:'network'});});
 }
 connect(){this.current=new RelayConnection(this);const connection=this.current;queueMicrotask(()=>connection.emit('open'));return connection;}
 send(packet:unknown){if(this.socket.readyState===WebSocket.OPEN&&this.socket.bufferedAmount<512*1024)this.socket.send(JSON.stringify(packet));}
 closeConnection(){if(this.role==='host')this.send({relay:'kick'});else this.socket.close();this.current=null;}
 destroy(){this.destroyed=true;this.current=null;this.socket.close();}
}
