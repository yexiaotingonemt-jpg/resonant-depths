import type {Vec} from './sim';

export type ActorPose='stance'|'run'|'swing'|'cast'|'hit'|'die';
export interface AnimationClip {frames:number;duration:number;}
// FLARE stores complete views in this order: W, NW, N, NE, E, SE, S, SW.
export function facing8(vector:Vec,fallback=6){
 if(Math.hypot(vector.x,vector.y)<.01)return fallback;
 return (Math.round(Math.atan2(vector.y,vector.x)/(Math.PI/4))+12)%8;
}
export function animationCell(pose:ActorPose,direction:number,elapsed:number,clip:AnimationClip){
 const raw=Math.floor(Math.max(0,elapsed)*clip.frames/clip.duration);
 const frame=pose==='die'||pose==='hit'||pose==='swing'||pose==='cast'?Math.min(clip.frames-1,raw):raw%clip.frames;
 return `${pose}-${direction}-${frame}`;
}
