const assetRoot=import.meta.env.BASE_URL+'assets/';
export const assets={arena:assetRoot+'arena.png',characters:assetRoot+'sprites.png'};
// Rectangles follow the isolated silhouettes in the generated production atlas.
// Art is not assumed to be aligned to perfect cells.
export const frames=[
 {x:0,y:45,w:370,h:415}, {x:390,y:35,w:375,h:420},
 {x:785,y:45,w:355,h:400}, {x:1150,y:15,w:385,h:445},
 {x:0,y:470,w:460,h:535}, {x:470,y:490,w:260,h:510},
 {x:725,y:450,w:450,h:550}, {x:1180,y:500,w:350,h:500}
];
