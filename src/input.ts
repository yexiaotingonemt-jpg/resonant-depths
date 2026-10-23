import {idle,type Action} from './sim';
export class Input {
 keys=new Set<string>(); pressed=new Set<string>(); private gamepadDenied=false;
 constructor(public pause:()=>void){window.addEventListener('keydown',e=>{if((e.target as HTMLElement).matches('input,select'))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();if(!this.keys.has(e.code))this.pressed.add(e.code);this.keys.add(e.code);if(!e.repeat&&(e.code==='Escape'||e.code==='KeyP'))this.pause();});window.addEventListener('keyup',e=>this.keys.delete(e.code));window.addEventListener('blur',()=>this.clear());}
 clear(){this.keys.clear();this.pressed.clear();}
 private gamepads():readonly (Gamepad|null)[]{
  if(this.gamepadDenied||typeof navigator==='undefined'||typeof navigator.getGamepads!=='function')return [];
  try{return navigator.getGamepads();}catch(error){
   // Permissions Policy can deny gamepads even in a secure, keyboard-capable iframe.
   // The policy is fixed for this document; avoid throwing again every animation frame.
   if(error instanceof Error&&error.name==='SecurityError')this.gamepadDenied=true;
   return [];
  }
 }
 read():Action[]{const k=(s:string)=>this.keys.has(s)?1:0,t=(s:string)=>this.pressed.has(s);const a:Action[]=[{x:k('KeyD')-k('KeyA'),y:k('KeyS')-k('KeyW'),dash:t('Space'),skill:t('KeyE'),ult:t('KeyQ')},{x:k('ArrowRight')-k('ArrowLeft'),y:k('ArrowDown')-k('ArrowUp'),dash:t('ShiftRight')||t('ShiftLeft'),skill:t('Enter'),ult:t('Slash')||t('Numpad0')}];
  const pads=Array.from(this.gamepads()).filter(Boolean);pads.slice(0,2).forEach((pad,i)=>{if(!pad)return;const dead=(n:number)=>Math.abs(n)>.18?n:0;if(Math.abs(pad.axes[0])+Math.abs(pad.axes[1])>.25){a[i].x=dead(pad.axes[0]);a[i].y=dead(pad.axes[1]);}a[i].dash ||= !!pad.buttons[0]?.pressed;a[i].skill ||= !!pad.buttons[2]?.pressed;a[i].ult ||= !!pad.buttons[3]?.pressed;});this.pressed.clear();return a;
 }
}
