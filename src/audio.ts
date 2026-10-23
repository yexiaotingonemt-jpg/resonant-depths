export class Sound {
 ctx:AudioContext|null=null; enabled=true; music=true; lastShot=0; beat=0;
 start(){
  if(typeof AudioContext!=='function')return;
  try{if(!this.ctx||this.ctx.state==='closed')this.ctx=new AudioContext();void this.ctx.resume().catch(()=>{});}
  catch{this.ctx=null;} // Audio is optional: a device or policy failure must not block a run.
 }
 tone(freq:number,duration:number,type:OscillatorType='sine',gain=.035,slide=0){if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;try{const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,freq+slide),t+duration);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.ctx.destination);o.start(t);o.stop(t+duration);}catch{this.ctx=null;}}
 play(event:string){switch(event){case'shot':if(performance.now()-this.lastShot<90)return;this.lastShot=performance.now();this.tone(620,.07,'sine',.012,-250);break;case'kill':this.tone(130,.12,'triangle',.026,-70);break;case'hurt':this.tone(95,.16,'sawtooth',.035,-55);break;case'dash':this.tone(320,.13,'triangle',.025,450);break;case'skill':this.tone(220,.4,'triangle',.045,400);this.tone(440,.6,'sine',.025,200);break;case'ult':[110,165,220,330,440].forEach(n=>this.tone(n,1.2,'triangle',.022,n));break;case'clear':case'revive':case'select':[330,440,660].forEach((n,i)=>setTimeout(()=>this.tone(n,.5,'sine',.025),i*90));break;case'boss':this.tone(55,1.8,'triangle',.06,-20);break;case'bosskill':this.tone(880,1.3,'sine',.04,-440);break;}}
 update(t:number,active:boolean){if(!active||!this.music||t<this.beat)return;this.beat=t+1.7;const notes=[110,164.81,146.83,130.81,110,196,164.81,130.81],n=notes[Math.floor(t/1.7)%notes.length];this.tone(n,2.4,'sine',.015);this.tone(n*2,1.8,'sine',.006);}
}
