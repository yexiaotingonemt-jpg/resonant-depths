import Phaser from 'phaser';
import {actorManifest} from './art-manifest';
import {animationCell,type ActorPose,type AnimationClip} from './animation';

export type ActorKind=keyof typeof actorManifest;
interface View {image:Phaser.GameObjects.Image;kind:ActorKind;pose:ActorPose;direction:number;since:number;hp:number;hurtUntil:number;seen:boolean;deadAt:number|null;}
export class Actors {
 private views=new Map<string,View>();private stage='';private clock=0;private time=0;
 constructor(private scene:Phaser.Scene){}
 preload(){for(const[key,actor]of Object.entries(actorManifest))this.scene.load.atlas('actor-'+key,import.meta.env.BASE_URL+'assets/flare/'+actor.file,import.meta.env.BASE_URL+'assets/flare/'+actor.atlas);}
 begin(stage:string,clock:number,time:number){
  if(stage!==this.stage||time<this.time-.2){for(const v of this.views.values())v.image.destroy();this.views.clear();this.stage=stage;}
  this.clock=clock;this.time=time;for(const v of this.views.values()){v.seen=false;v.image.setVisible(false);}
 }
 draw(key:string,kind:ActorKind,x:number,y:number,direction:number,pose:ActorPose,scale=1,hp=100,alpha=1){
  let view=this.views.get(key);
  if(!view){const image=this.scene.add.image(x,y,'actor-'+kind,'stance-'+direction+'-0').setOrigin(.5,.75);view={image,kind,pose,direction,since:this.time,hp,hurtUntil:0,seen:true,deadAt:null};this.views.set(key,view);}
  if(hp<view.hp-.1)view.hurtUntil=this.time+.13;view.hp=hp;
  if(pose!=='die'&&this.time<view.hurtUntil)pose='hit';
  if(view.pose!==pose){view.since=pose==='die'?this.clock:this.time;view.pose=pose;}
  view.direction=direction;view.seen=true;view.deadAt=null;
  const clips=actorManifest[kind].clips as Partial<Record<ActorPose,AnimationClip>>;
  if(!clips[pose])pose='stance';const clip=clips[pose]!;
  const elapsed=pose==='die'?this.clock-view.since:pose==='stance'||pose==='run'?this.time:this.time-view.since;
  const image=view.image;image.setTexture('actor-'+kind,animationCell(pose,direction,elapsed,clip)).setOrigin(.5,.75).setScale(scale).setPosition(x,y).setAlpha(alpha).setDepth(y+10).setVisible(true);
  if(this.time<view.hurtUntil-.06)image.setTintFill(0xffe9c0);else image.clearTint();
 }
 finish(){
  for(const[key,v]of this.views){
   if(v.seen)continue;
   if(!key.startsWith('e')){v.image.destroy();this.views.delete(key);continue;}
   v.deadAt??=this.clock;const elapsed=this.clock-v.deadAt,clip=actorManifest[v.kind].clips.die;
   if(elapsed>1.1){v.image.destroy();this.views.delete(key);continue;}
   v.image.setTexture('actor-'+v.kind,animationCell('die',v.direction,elapsed,clip)).setOrigin(.5,.75).setAlpha(Math.min(1,(1.1-elapsed)/.4)).setVisible(true).clearTint();
  }
 }
}
