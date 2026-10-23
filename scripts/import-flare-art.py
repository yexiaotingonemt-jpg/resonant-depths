"""Repack licensed FLARE actor art with shared scale and a stable ground anchor.

No generative image processing: original published animation cells are composited
according to their supplied frame offsets and direction-dependent layer order.
Requires Pillow. Download cache is outside the game checkout.
"""
from pathlib import Path
from urllib.request import urlopen
from concurrent.futures import ThreadPoolExecutor
import json, re, time, hashlib
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT.parent/'scratch'/'resonant-flare-source'
OUT=ROOT/'public'/'assets'/'flare'
REV='af6eee6d339ac98011864bfe89da837fe7769c28'
BASE=f'https://raw.githubusercontent.com/flareteam/flare-game/{REV}/'
CELL=160; ANCHOR=(80,140)
FANTASY='mods/fantasycore'; CAMPAIGN='mods/empyrean_campaign'
POSES=['stance','run','swing','cast','hit','die']
# FLARE directions: W, NW, N, NE, E, SE, S, SW.
ORDER=[['main','feet','legs','hands','chest','head']]*2+[['feet','legs','hands','chest','head','main']]*3+[['feet','legs','hands','main','chest','head']]+[['main','feet','legs','hands','chest','head']]*2
AVATAR={
 'ember':{'main':['longsword'],'feet':['plate_boots'],'legs':['plate_greaves'],'hands':['plate_gauntlets'],'chest':['plate_cuirass'],'head':['head_short','plate_helm']},
 'tide':{'main':['greatstaff'],'feet':['mage_boots_alt1'],'legs':['mage_skirt_alt1'],'hands':['mage_sleeves_alt1'],'chest':['mage_vest_alt1'],'head':['head_short','mage_hood_alt1']}
}
ENEMIES={'undead':(FANTASY,'zombie'),'cultist':(FANTASY,'skeleton_mage'),'brute':(FANTASY,'minotaur'),'stalker':(FANTASY,'antlion'),'warden':(CAMPAIGN,'skeleton_knight_boss'),'oracle':(CAMPAIGN,'skeleton_mage_high_boss')}
sources=set()
def fetch(p):
 sources.add(p);target=CACHE/p
 if not target.exists():
  target.parent.mkdir(parents=True,exist_ok=True)
  for attempt in range(3):
   try:target.write_bytes(urlopen(BASE+p,timeout=40).read());break
   except Exception:
    if attempt==2:raise
    time.sleep(1)
 return target
def parse(p,mod):
 text=fetch(p).read_text(encoding='utf-8-sig');images={};clips={};current=None
 for line in text.splitlines():
  if line.startswith('image='):
   value=line[6:].split(',');images[value[1] if len(value)>1 else 'default']=str(fetch(mod+'/'+value[0]))
  elif re.fullmatch(r'\[\w+\]',line):current=line[1:-1];clips[current]={'frames':0,'duration':.5,'cells':{}}
  elif current and line.startswith('frames='):clips[current]['frames']=int(line[7:])
  elif current and line.startswith('duration='):clips[current]['duration']=int(line[9:].replace('ms',''))/1000
  elif current and line.startswith('frame='):
   values=line[6:].split(',');f,d,x,y,w,h,ox,oy=map(int,values[:8]);clips[current]['cells'][(d,f)]=(x,y,w,h,ox,oy,values[8] if len(values)>8 else 'default')
 return {'images':{key:Image.open(value).convert('RGBA') for key,value in images.items()},'clips':clips}
def entry(sprite,pose,direction,frame):
 clip=sprite['clips'].get(pose) or sprite['clips']['stance'];return clip['cells'][(direction,min(frame,clip['frames']-1))]
def make_actor(name,layers,order):
 sample=next(iter(layers.values()))[0];clips={};start=0
 for pose in POSES:
  source=sample['clips'].get(pose)
  if not source:continue
  clips[pose]={'start':start,'frames':source['frames'],'duration':source['duration']};start+=8*source['frames']
 # Keep a single scale for the complete actor, then trim only transparent pixels.
 # Atlas trim metadata restores the shared virtual canvas and ground anchor.
 body_top=0
 for group,parts in layers.items():
  if group=='main':continue
  for part in parts:
   for d in range(8):
    _,_,_,_,_,oy,_=entry(part,'stance',d,0);body_top=min(body_top,-oy)
 scale=76/max(1,-body_top)
 virtual=round(1024*scale);root=(round(512*scale),round(768*scale));cells=[];preview=Image.new('RGBA',(8*CELL,CELL))
 for pose,clip in clips.items():
  for d in range(8):
   for f in range(clip['frames']):
    tile=Image.new('RGBA',(virtual,virtual))
    for group in order[d]:
     for part in layers.get(group,[]):
      x,y,w,h,ox,oy,image=entry(part,pose,d,f);cut=part['images'][image].crop((x,y,x+w,y+h));cut=cut.resize((max(1,round(w*scale)),max(1,round(h*scale))),Image.Resampling.LANCZOS)
      tile.alpha_composite(cut,(root[0]-round(ox*scale),root[1]-round(oy*scale)))
    box=tile.getbbox() or (root[0],root[1],root[0]+1,root[1]+1);cut=tile.crop(box)
    cells.append((f'{pose}-{d}-{f}',cut,box))
    if pose=='stance' and f==0:preview.alpha_composite(cut,(d*CELL+80+box[0]-root[0],135+box[1]-root[1]))
 # Deterministic shelf packing; no resizing or re-anchoring per pose.
 placements=[];x=y=row_height=0;width=2048
 for key,cut,box in cells:
  w,h=cut.size
  if x+w+2>width:x=0;y+=row_height+2;row_height=0
  placements.append((key,cut,box,x,y));x+=w+2;row_height=max(row_height,h)
 sheet=Image.new('RGBA',(width,y+row_height));frames={}
 for key,cut,box,x,y in placements:
  sheet.alpha_composite(cut,(x,y));w,h=cut.size
  frames[key]={'frame':{'x':x,'y':y,'w':w,'h':h},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':box[0],'y':box[1],'w':w,'h':h},'sourceSize':{'w':virtual,'h':virtual}}
 filename=name+'.webp';sheet.save(OUT/filename,format='WEBP',lossless=True,method=6,exact=True)
 (OUT/(name+'.json')).write_text(json.dumps({'frames':frames,'meta':{'image':filename,'scale':'1','size':{'w':sheet.width,'h':sheet.height}}},separators=(',',':')),encoding='utf-8')
 print(name, 'frames',start,'scale',round(scale,3),'atlas',sheet.size,flush=True)
 for parts in layers.values():
  for part in parts:
   for image in part['images'].values():image.close()
 return {'file':filename,'cell':CELL,'atlas':name+'.json','anchor':[.5,.75],'clips':clips,'frames':start},preview

def main():
 OUT.mkdir(parents=True,exist_ok=True);actors={};previews=[]
 fetch('CREDITS.txt');fetch('LICENSE.txt');fetch('README')
 for name,parts in AVATAR.items():
  layers={kind:[parse(f'{FANTASY}/animations/avatar/male/{part}.txt',FANTASY) for part in items] for kind,items in parts.items()};actors[name],preview=make_actor(name,layers,ORDER);previews.append(preview)
 for name,(mod,source) in ENEMIES.items():
  sprite=parse(f'{mod}/animations/enemies/{source}.txt',mod);actors[name],preview=make_actor(name,{'body':[sprite]},[['body']]*8);previews.append(preview)
 manifest={'source':'FLARE: Empyrean Campaign','revision':REV,'license':'CC-BY-SA-3.0','actors':actors,'source_files':[{'path':s,'url':BASE+s,'sha256':hashlib.sha256((CACHE/s).read_bytes()).hexdigest()} for s in sorted(sources)]}
 (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
 (ROOT/'src'/'art-manifest.ts').write_text('// Generated by scripts/import-flare-art.py. Published art: CC-BY-SA-3.0.\nexport const actorManifest = '+json.dumps(actors,ensure_ascii=False,indent=2)+' as const;\n',encoding='utf-8')
 licenses=ROOT/'public'/'licenses'/'flare';licenses.mkdir(parents=True,exist_ok=True)
 for filename in ['CREDITS.txt','LICENSE.txt','README']:(licenses/filename).write_bytes((CACHE/filename).read_bytes())
 contact=Image.new('RGB',(CELL*8,CELL*len(previews)),(20,34,34))
 for i,p in enumerate(previews):contact.paste(p,(0,i*CELL),p)
 contact.save(CACHE/'directions-preview.png')
if __name__=='__main__':main()
