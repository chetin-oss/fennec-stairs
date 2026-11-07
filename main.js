(function(){
"use strict";
const $=s=>document.querySelector(s);
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- world constants ---------- */
const STEPS=28, RISE=0.28, DEPTH=0.8, WIDTH=3.2;
const TOP_Y=STEPS*RISE, TOP_Z=-STEPS*DEPTH;      // stairs climb toward -z
const PLAT_END=TOP_Z-12, TREE_Z=TOP_Z-6.5;

/* ---------- renderer ---------- */
const stage=$("#stage");
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputEncoding=THREE.sRGBEncoding;
stage.appendChild(renderer.domElement);
const scene=new THREE.Scene();
const FOG=new THREE.Color(0x0d1513);
scene.background=FOG; scene.fog=new THREE.FogExp2(0x101a18,0.075);
const camera=new THREE.PerspectiveCamera(55,1,0.1,120);
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
addEventListener("resize",resize); resize();

/* ---------- lights ---------- */
const hemi=new THREE.HemisphereLight(0x48615c,0x0a0d0c,0.55); scene.add(hemi);
const moon=new THREE.DirectionalLight(0x8fa6b8,0.35); moon.position.set(-8,20,-30); scene.add(moon);
const carry=new THREE.PointLight(0xc7d3cf,0.7,6,2); scene.add(carry);

/* ---------- materials ---------- */
const M=(c,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.9,metalness:0},o));
const stone=M(0x4c5450), stoneDark=M(0x2c322f), moss=M(0x1f2c25), bark=M(0x1b1614,{roughness:1});

/* ---------- ground & stairs ---------- */
const lanterns=[];
const ground=new THREE.Mesh(new THREE.PlaneGeometry(140,140),moss);
ground.rotation.x=-Math.PI/2; scene.add(ground);
const stepGeo=new THREE.BoxGeometry(WIDTH,1,DEPTH);
for(let k=1;k<=STEPS;k++){
  const h=k*RISE;
  const s=new THREE.Mesh(stepGeo,k%2?stone:M(0x464e4a));
  s.scale.y=h; s.position.set((Math.random()-.5)*.04,h/2,-(k-.5)*DEPTH);
  s.rotation.y=(Math.random()-.5)*.02; scene.add(s);
  // retaining walls
  for(const sx of [-1,1]){
    const w=new THREE.Mesh(new THREE.BoxGeometry(.5,h+.5,DEPTH),stoneDark);
    w.position.set(sx*(WIDTH/2+.25),(h+.5)/2,-(k-.5)*DEPTH); scene.add(w);
  }
  // step number scratched on every 7th riser
  if(k%7===0) addLantern(k);
}
// plateau
const plat=new THREE.Mesh(new THREE.BoxGeometry(22,TOP_Y,14),moss);
plat.position.set(0,TOP_Y/2,TOP_Z-7); scene.add(plat);
// hill mounds flanking the stairs
for(let i=0;i<10;i++){
  for(const sx of [-1,1]){
    const z=-i*2.4-1, hh=Math.max(.2,(-z/(-TOP_Z))*TOP_Y);
    const m=new THREE.Mesh(new THREE.BoxGeometry(9,hh,2.6),moss);
    m.position.set(sx*(WIDTH/2+5),hh/2,z); scene.add(m);
  }
}

/* ---------- lanterns ---------- */
function addLantern(k){
  const z=-(k-.5)*DEPTH, y=k*RISE;
  for(const sx of [-1,1]){
    const g=new THREE.Group();
    const post=new THREE.Mesh(new THREE.CylinderGeometry(.04,.05,1.1,6),bark); post.position.y=.55;
    const box=new THREE.Mesh(new THREE.BoxGeometry(.26,.32,.26),M(0x2a1410,{emissive:0xb03a22,emissiveIntensity:1.4}));
    box.position.y=1.22;
    const cap=new THREE.Mesh(new THREE.ConeGeometry(.24,.14,4),bark); cap.position.y=1.45; cap.rotation.y=Math.PI/4;
    g.add(post,box,cap); g.position.set(sx*(WIDTH/2+.25),y+.25,z); scene.add(g);
    lanterns.push({box,phase:Math.random()*10});
  }
  const L=new THREE.PointLight(0xd25a2c,1.1,7,2); L.position.set(0,y+1.3,z); scene.add(L);
  lanterns.push({light:L,phase:Math.random()*10,base:1.1});
}

/* ---------- dead forest ---------- */
function deadTree(x,z,y,s){
  const g=new THREE.Group();
  const h=3+Math.random()*3;
  const t=new THREE.Mesh(new THREE.CylinderGeometry(.06*s,.18*s,h,5),bark); t.position.y=h/2; g.add(t);
  for(let i=0;i<3;i++){
    const bl=1+Math.random()*1.4;
    const b=new THREE.Mesh(new THREE.CylinderGeometry(.02,.06,bl,4),bark);
    b.position.y=h*(.5+Math.random()*.4); b.rotation.z=(Math.random()-.5)*2.2; b.rotation.y=Math.random()*6;
    b.translateY(bl/2); g.add(b);
  }
  g.position.set(x,y,z); g.rotation.y=Math.random()*6; scene.add(g);
}
for(let i=0;i<46;i++){
  const sx=Math.random()<.5?-1:1, x=sx*(WIDTH/2+1.5+Math.random()*9);
  const z=4-Math.random()*40;
  const y=z>0?0:Math.min(TOP_Y,(-z/(-TOP_Z))*TOP_Y)*(z<TOP_Z?1:.9);
  deadTree(x,z,Math.max(0,y-.2),1);
}

/* ---------- wishing trees (slots for paper) ---------- */
// The old tree fills first; once its branches are full, papers spill onto the dead trees around it.
const slots=[], wishTrees=[];
function growTree(x,y,z,sc,seed0,main){
  const start=slots.length, own=[];
  const root=new THREE.Group(); root.position.set(x,y,z); root.rotation.y=seed0; scene.add(root);
  const trunkH=3.4*sc;
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.28*sc,.55*sc,trunkH,7),bark);
  trunk.position.y=trunkH/2; root.add(trunk);
  // rope (geumjul) around the trunk: the old tree always wears one, the others once they carry a wish
  const rope=new THREE.Mesh(new THREE.TorusGeometry(.5*sc,.035,6,24),M(0x8c8064));
  rope.rotation.x=Math.PI/2; rope.position.y=1.1*sc; root.add(rope); rope.visible=!!main;
  let seed=seed0*1000+7|0; const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  const v=new THREE.Vector3();
  function grow(parent,len,rad,depth,ang){
    const geo=new THREE.CylinderGeometry(rad*.55,rad,len,5); geo.translate(0,len/2,0);
    const br=new THREE.Mesh(geo,bark); parent.add(br);
    br.rotation.set(ang.x,ang.y,ang.z);
    br.updateMatrixWorld(true);
    if(depth>=1){
      for(let t=.35;t<=.95;t+=.2){ v.set(0,len*t,0); br.localToWorld(v); own.push(v.clone()); }
    }
    if(depth<3){
      const n=depth===0?(main?5:4):2+Math.round(rnd());
      for(let i=0;i<n;i++){
        const child=new THREE.Group(); child.position.y=len*(.55+rnd()*.4); br.add(child); child.updateMatrixWorld(true);
        grow(child,len*(.55+rnd()*.2),rad*.55,depth+1,{x:(rnd()-.5)*.6,y:i/n*Math.PI*2+rnd(),z:.6+rnd()*.6});
      }
    }
  }
  const crown=new THREE.Group(); crown.position.y=trunkH*.85; root.add(crown);
  root.updateMatrixWorld(true);
  grow(crown,1.6*sc,.22*sc,0,{x:0,y:0,z:0});
  for(let i=own.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[own[i],own[j]]=[own[j],own[i]];}
  slots.push(...own);
  wishTrees.push({start,end:slots.length,rope,main:!!main});
}
function moundY(z){ const i=Math.round((-z-1)/2.4); return Math.max(.2,((i*2.4+1)/(-TOP_Z))*TOP_Y)-.15; }
growTree(0,TOP_Y,TREE_Z,1,0,true);
[[4.4,TOP_Z-5.2,.8],[-4.2,TOP_Z-4.5,.75],[3.8,TOP_Z-9.8,.7],[-3.6,TOP_Z-9.5,.72]]
  .forEach(([x,z,sc],i)=>growTree(x,TOP_Y,z,sc,i+1.3,false));
[[ 1,-19.5,.62],[-1,-15.5,.6],[ 1,-11,.58],[-1,-6,.56]]
  .forEach(([side,z,sc],i)=>growTree(side*(WIDTH/2+2.3),moundY(z),z,sc,i+5.7,false));

/* ---------- fennec fox statues ---------- */
const foxEyes=[];
function fox(x,z,rotY){
  const g=new THREE.Group(), st=M(0x8a7a5e), inner=M(0x5c4a36), dark=M(0x2a2119);
  const ped=new THREE.Mesh(new THREE.BoxGeometry(.9,.6,.9),stoneDark); ped.position.y=.3; g.add(ped);
  // small sitting body
  const body=new THREE.Mesh(new THREE.SphereGeometry(.26,12,10),st); body.scale.set(1,1.35,1.1); body.position.y=.9; g.add(body);
  for(const s of [-1,1]){ // front legs
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(.045,.05,.36,8),st); leg.position.set(s*.1,.78,.17); g.add(leg);
  }
  const head=new THREE.Mesh(new THREE.SphereGeometry(.17,14,12),st); head.scale.set(1.05,.95,1); head.position.set(0,1.37,.08); g.add(head);
  const snout=new THREE.Mesh(new THREE.ConeGeometry(.06,.17,10),st); snout.rotation.x=Math.PI/2; snout.position.set(0,1.32,.28); g.add(snout);
  const nose=new THREE.Mesh(new THREE.SphereGeometry(.022,8,6),dark); nose.position.set(0,1.32,.365); g.add(nose);
  for(const s of [-1,1]){
    // oversized fennec ears
    const ear=new THREE.Group(); ear.position.set(s*.11,1.46,.04); ear.rotation.set(-.1,0,-s*.42); g.add(ear);
    const outer=new THREE.Mesh(new THREE.ConeGeometry(.12,.5,12),st); outer.scale.z=.45; outer.position.y=.25; ear.add(outer);
    const ins=new THREE.Mesh(new THREE.ConeGeometry(.085,.4,12),inner); ins.scale.z=.3; ins.position.set(0,.23,.03); ear.add(ins);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.036,8,8),new THREE.MeshBasicMaterial({color:0x5a3b10}));
    eye.position.set(s*.07,1.39,.22); g.add(eye); foxEyes.push(eye);
  }
  // bushy tail curled around the front paws, dark tip
  const tail=new THREE.Mesh(new THREE.TorusGeometry(.26,.075,8,16,Math.PI*1.15),st);
  tail.rotation.x=Math.PI/2; tail.rotation.z=Math.PI*.95; tail.position.set(0,.66,.02); g.add(tail);
  const tip=new THREE.Mesh(new THREE.SphereGeometry(.08,8,6),dark); tip.position.set(.2,.66,.18); g.add(tip);
  const bib=new THREE.Mesh(new THREE.CylinderGeometry(.16,.22,.16,10,1,true),M(0x6e1d12,{side:THREE.DoubleSide})); bib.position.set(0,1.17,.05); g.add(bib);
  g.position.set(x,TOP_Y,z); g.rotation.y=rotY; scene.add(g);
}
fox(-2.4,TOP_Z-1.6,.35); fox(2.4,TOP_Z-1.6,-.35);

/* ---------- the 29th step ---------- */
const ghostStep=new THREE.Mesh(new THREE.BoxGeometry(WIDTH*.8,.12,DEPTH),
  new THREE.MeshBasicMaterial({color:0xd7a443,transparent:true,opacity:0,fog:false}));
ghostStep.position.set(0,TOP_Y+RISE*.6,TOP_Z-DEPTH*1.6); scene.add(ghostStep);

/* ---------- drifting ash ---------- */
const ashN=500, ashPos=new Float32Array(ashN*3);
for(let i=0;i<ashN;i++){ashPos[i*3]=(Math.random()-.5)*24;ashPos[i*3+1]=Math.random()*14;ashPos[i*3+2]=6-Math.random()*44;}
const ashGeo=new THREE.BufferGeometry(); ashGeo.setAttribute("position",new THREE.BufferAttribute(ashPos,3));
const ash=new THREE.Points(ashGeo,new THREE.PointsMaterial({color:0xb7b4a6,size:.05,transparent:true,opacity:.55}));
scene.add(ash);

/* ---------- schoolgirl avatar ---------- */
function makeGirl(opts={}){
  const ghost=!!opts.ghost;
  const mats=[];
  const mk=(c,extra)=>{const m=M(c,Object.assign({transparent:ghost},extra||{}));mats.push(m);return m;};
  const skin=mk(ghost?0xbfc3bc:0xe8cdb6), navy=mk(0x1c2238), white=mk(0xe9e7df), hair=mk(0x0b0a0a,{roughness:.6}),
        red=mk(0x8e1f1a), sock=mk(0xdedcd4), shoe=mk(0x111111,{roughness:.4}), skirtM=mk(0x262b44);
  const g=new THREE.Group();
  const add=(geo,mat,x,y,z,p=g)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);p.add(m);return m;};
  const legs=[];
  for(const s of [-1,1]){
    const leg=new THREE.Group(); leg.position.set(s*.08,.62,0); g.add(leg);
    add(new THREE.CylinderGeometry(.05,.045,.27,8),skin,0,-.13,0,leg);
    add(new THREE.CylinderGeometry(.052,.048,.3,8),sock,0,-.42,0,leg);
    add(new THREE.BoxGeometry(.1,.07,.18),shoe,0,-.58,.03,leg);
    legs.push(leg);
  }
  add(new THREE.CylinderGeometry(.17,.3,.34,18,1),skirtM,0,.73,0).material.flatShading=true;
  add(new THREE.CylinderGeometry(.155,.18,.44,12),navy,0,1.08,0);           // blazer
  add(new THREE.BoxGeometry(.14,.12,.02),white,0,1.23,.15).rotation.z=Math.PI/4; // shirt collar
  add(new THREE.BoxGeometry(.06,.1,.03),red,0,1.15,.17);                    // ribbon tie
  add(new THREE.BoxGeometry(.06,.04,.01),white,-.09,1.12,.165);            // name tag
  const arms=[];
  for(const s of [-1,1]){
    const arm=new THREE.Group(); arm.position.set(s*.2,1.26,0); g.add(arm);
    add(new THREE.CylinderGeometry(.045,.05,.42,8),navy,0,-.21,0,arm);
    add(new THREE.SphereGeometry(.045,8,6),skin,0,-.45,0,arm);
    arm.rotation.z=s*.08; arms.push(arm);
  }
  add(new THREE.CylinderGeometry(.045,.05,.08,8),skin,0,1.32,0);
  const head=new THREE.Group(); head.position.y=1.5; g.add(head);
  add(new THREE.SphereGeometry(.15,16,12),skin,0,0,0,head);
  const cap=add(new THREE.SphereGeometry(.163,16,12,0,Math.PI*2,0,Math.PI*.55),hair,0,.01,-.01,head);
  add(new THREE.BoxGeometry(.31,.48,.08),hair,0,-.2,-.1,head);              // long straight hair
  for(const s of [-1,1]) add(new THREE.BoxGeometry(.05,.36,.16),hair,s*.14,-.14,0,head);
  if(opts.ribbon!=null){const rb=add(new THREE.BoxGeometry(.16,.06,.04),M(opts.ribbon),0,.04,-.16,head);rb.rotation.z=.2;}
  if(opts.veiled){ add(new THREE.BoxGeometry(.28,.4,.03),hair,0,-.1,.16,head); } // face hidden behind hair
  else{
    add(new THREE.BoxGeometry(.28,.06,.04),hair,0,.1,.13,head);              // bangs
    for(const s of [-1,1]) add(new THREE.SphereGeometry(.016,6,6),M(0x15100e),s*.05,.0,.135,head);
  }
  g.userData={legs,arms,head,mats,phase:0};
  return g;
}
function animateWalk(girl,speed,dt){
  const u=girl.userData; u.phase+=dt*speed*7;
  const a=Math.sin(u.phase)*.55*Math.min(1,speed*1.6);
  u.legs[0].rotation.x=a; u.legs[1].rotation.x=-a;
  u.arms[0].rotation.x=-a*.8; u.arms[1].rotation.x=a*.8;
}

const player=makeGirl(); player.position.set(0,0,5); player.rotation.y=Math.PI; scene.add(player);

/* ---------- gestures (shared by you and other players) ---------- */
// act: {type:"wave"|"neck"|"sit"|null, at:ms}
const ACT_LEN={wave:2.6,neck:2.4};
function poseAct(girl,act,clockMs,dt){
  const u=girl.userData;
  u.sitK=u.sitK||0;
  const sitting=act&&act.type==="sit";
  u.sitK+=((sitting?1:0)-u.sitK)*Math.min(1,(dt||.016)*9);
  if(u.sitK>.01){
    const k=u.sitK;
    u.legs.forEach(l=>l.rotation.x=l.rotation.x*(1-k)+(-1.45)*k);
    u.arms.forEach(a=>a.rotation.x=a.rotation.x*(1-k)+(-.7)*k);
    u.body=u.body||girl.children; // whole avatar lowers onto the step
    girl.userData.sitOffset=-.34*k;
  } else girl.userData.sitOffset=0;
  if(!act||!act.type||sitting) return;
  const el=(clockMs-act.at)/1000, len=ACT_LEN[act.type];
  if(el<0||el>len) return;
  const env=Math.min(1,el*4,(len-el)*4);
  if(act.type==="wave"){
    u.arms[1].rotation.z=.08+(2.55+Math.sin(el*11)*.28-.08)*env;
    u.arms[1].rotation.x=0;
  } else if(act.type==="neck"){
    const ph=el/len*Math.PI*2;
    u.head.rotation.z=Math.sin(ph)*.38*env;
    u.head.rotation.x=(Math.cos(ph)-1)*-.0+Math.cos(ph)*.32*env;
  }
}
let myAct={type:null,at:0};
const actsEl=$("#acts");
function setAct(type){
  if(grab&&grab.phase!=="free") return;
  if(type==="sit"){
    if(myAct.type==="sit"){ myAct={type:null,at:Date.now()}; }
    else{ myAct={type:"sit",at:Date.now()}; player.rotation.y=0; }  // sit facing down the stairs
  } else myAct={type,at:Date.now()};
  actsEl.querySelector('[data-act="sit"]').setAttribute("aria-pressed",String(myAct.type==="sit"));
  sendPresence(true);
}
actsEl.addEventListener("click",e=>{const b=e.target.closest("[data-act]"); if(b) setAct(b.dataset.act);});

/* ---------- other players (Supabase Realtime broadcast) ---------- */
const CFG=window.FOX_STAIRS_CONFIG||{};
const sb=(CFG.supabaseUrl&&CFG.supabaseAnonKey&&window.supabase&&window.supabase.createClient)
  ? window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey) : null;
const clientId=(()=>{try{let v=localStorage.getItem("fox-stairs-client");
  if(!v){v=(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));localStorage.setItem("fox-stairs-client",v);}
  return v;}catch(e){return "t"+Math.random().toString(36).slice(2);}})();
let room=null, roomReady=false; const others=new Map(); let lastSent=0, lastSentPos="", lastBeat=0;
const RIBBONS=[0x8e1f1a,0xd7a443,0x6a8f86,0xb7a4c9,0xc9c3b2,0x4f6f9a];
function ribbonFor(peer){let h=0;for(const c of peer)h=(h*31+c.charCodeAt(0))>>>0;return RIBBONS[h%RIBBONS.length];}
function sendPresence(force){
  if(!room||!roomReady) return;
  const p=player.position;
  const pos=[+p.x.toFixed(2),+p.y.toFixed(2),+p.z.toFixed(2)], r=+player.rotation.y.toFixed(2);
  const key=pos.join()+","+r+","+myAct.type+myAct.at;
  const now=performance.now();
  if(!force){
    if(key===lastSentPos&&now-lastBeat<1500) return;   // keepalive every 1.5 s while idle
    if(now-lastSent<150) return;                         // at most ~7 updates a second
  }
  lastSent=now; lastBeat=now; lastSentPos=key;
  room.send({type:"broadcast",event:"state",payload:{id:clientId,p:pos,r,act:myAct.type?{type:myAct.type,at:myAct.at}:null}});
}
function readPeer(pz){
  pz=pz||{};
  const p=Array.isArray(pz.p)&&pz.p.length===3&&pz.p.every(n=>typeof n==="number"&&isFinite(n)&&Math.abs(n)<200)?pz.p:null;
  const r=typeof pz.r==="number"&&isFinite(pz.r)?pz.r:0;
  const a=pz.act&&typeof pz.act==="object"&&["wave","neck","sit"].includes(pz.act.type)?{type:pz.act.type,at:+pz.act.at||0}:null;
  return {p,r,a};
}
function updateBadge(){ $("#peersBadge").hidden=!roomReady; $("#peersN").textContent=others.size+1; }
function removePeer(id){const o=others.get(id); if(o){scene.remove(o.g);others.delete(id);updateBadge();}}
function onState(payload){
  const id=payload&&typeof payload.id==="string"?payload.id.slice(0,64):null;
  if(!id||id===clientId) return;
  const d=readPeer(payload); if(!d.p) return;
  let o=others.get(id);
  if(!o){
    if(others.size>=40) return;
    const g=makeGirl({ribbon:ribbonFor(id)}); g.position.set(d.p[0],d.p[1],d.p[2]); g.rotation.y=d.r; scene.add(g);
    o={g,target:new THREE.Vector3(),rot:d.r,act:null,actLocalAt:0,seen:0};
    others.set(id,o); updateBadge();
    sendPresence(true);                       // let the newcomer see us straight away
  }
  o.seen=performance.now();
  o.target.set(d.p[0],d.p[1],d.p[2]); o.rot=d.r;
  // replay gestures on our own clock so differing device clocks don't matter
  if(d.a&&(!o.act||o.act.type!==d.a.type||o.act.at!==d.a.at)){ o.act=d.a; o.actLocalAt=Date.now(); }
  if(!d.a) o.act=null;
}
function joinRoom(){
  if(!sb) return;
  room=sb.channel("fox-stairs-room",{config:{broadcast:{self:false}}});
  room.on("broadcast",{event:"state"},({payload})=>onState(payload));
  room.on("broadcast",{event:"bye"},({payload})=>{ if(payload&&typeof payload.id==="string") removePeer(payload.id); });
  room.subscribe(status=>{
    if(status==="SUBSCRIBED"){roomReady=true;updateBadge();sendPresence(true);}
    else if(status==="CLOSED"||status==="CHANNEL_ERROR"||status==="TIMED_OUT"){roomReady=false;updateBadge();}
  });
  setInterval(()=>{
    sendPresence(false);
    const now=performance.now();
    for(const [id,o] of others) if(now-o.seen>6000) removePeer(id);   // left without saying goodbye
  },400);
  addEventListener("pagehide",()=>{ try{ if(roomReady) room.send({type:"broadcast",event:"bye",payload:{id:clientId}}); }catch(e){} });
}
setTimeout(joinRoom,0);
function tickOthers(dt){
  let near=false;
  for(const o of others.values()){
    const g=o.g, before=g.position.clone();
    g.position.lerp(o.target,Math.min(1,dt*8));
    let dr=o.rot-g.rotation.y; dr=Math.atan2(Math.sin(dr),Math.cos(dr)); g.rotation.y+=dr*Math.min(1,dt*8);
    const sp=before.distanceTo(g.position)/Math.max(dt,1e-3);
    animateWalk(g,Math.min(1,sp/2.6),dt);
    g.userData.head.rotation.set(0,0,0); g.userData.arms[1].rotation.z=.08;
    poseAct(g,o.act?{type:o.act.type,at:o.actLocalAt}:null,Date.now(),dt);
    g.children.forEach(c=>{if(c.userData.baseY==null)c.userData.baseY=c.position.y;c.position.y=c.userData.baseY+(g.userData.sitOffset||0);});
    if(g.position.distanceTo(player.position)<3.2) near=true;
  }
  actsEl.classList.toggle("near",near);
}

// other students lingering on the stairs
const npcs=[
  {step:9,x:-1.15,veiled:true},{step:18,x:1.1,veiled:false},{step:24,x:-.9,veiled:true},
].map(o=>{
  const g=makeGirl({ghost:true,veiled:o.veiled});
  const z=-(o.step-.5)*DEPTH; g.position.set(o.x,o.step*RISE,z); g.rotation.y=Math.PI*.1; scene.add(g);
  return {g,alpha:1};
});
const watcher=makeGirl({ghost:true,veiled:true}); watcher.position.set(1.6,TOP_Y,TREE_Z-1.8); scene.add(watcher);

/* ---------- height from position ---------- */
function groundY(x,z){
  if(z>0) return 0;
  if(z<=TOP_Z) return TOP_Y;
  return Math.ceil(-z/DEPTH)*RISE;
}
function stepAt(z){ if(z>0) return 0; if(z<=TOP_Z) return STEPS; return Math.min(STEPS,Math.ceil(-z/DEPTH)); }

/* ---------- hands from the steps ---------- */
const handMat=M(0x8f9a8c,{roughness:.75}), handDark=M(0x3e4640,{roughness:.9});
function makeHand(){
  const g=new THREE.Group();
  const arm=new THREE.Mesh(new THREE.CylinderGeometry(.045,.055,.6,8),handMat); arm.position.y=-.2; g.add(arm);
  const wrist=new THREE.Mesh(new THREE.CylinderGeometry(.04,.045,.08,8),handDark); wrist.position.y=.1; g.add(wrist);
  const palm=new THREE.Mesh(new THREE.BoxGeometry(.1,.12,.035),handMat); palm.position.y=.18; g.add(palm);
  const fingers=[];
  [-.036,-.012,.012,.036].forEach((x,i)=>{
    const f=new THREE.Group(); f.position.set(x,.24,0); g.add(f);
    const len=[.07,.085,.08,.06][i];
    const a=new THREE.Mesh(new THREE.CylinderGeometry(.011,.013,len,6),handMat); a.position.y=len/2; f.add(a);
    const j=new THREE.Group(); j.position.y=len; f.add(j);
    const b=new THREE.Mesh(new THREE.CylinderGeometry(.009,.011,len*.85,6),handMat); b.position.y=len*.42; j.add(b);
    const nail=new THREE.Mesh(new THREE.BoxGeometry(.016,.02,.006),handDark); nail.position.set(0,len*.8,.01); j.add(nail);
    fingers.push([f,j]);
  });
  const th=new THREE.Group(); th.position.set(-.055,.16,0); th.rotation.z=.9; g.add(th);
  const tm=new THREE.Mesh(new THREE.CylinderGeometry(.012,.014,.08,6),handMat); tm.position.y=.04; th.add(tm);
  const hole=new THREE.Mesh(new THREE.CircleGeometry(.2,20),new THREE.MeshBasicMaterial({color:0x020303,transparent:true,opacity:0}));
  hole.rotation.x=-Math.PI/2;
  g.userData={fingers,thumb:th,hole};
  return g;
}
const hands=[makeHand(),makeHand()];
hands.forEach(h=>h.scale.setScalar(1.45));
hands.forEach(h=>{h.visible=false;scene.add(h);scene.add(h.userData.hole);});

// three traps per climb, one in each third of the stairs; the last one sends two hands
const traps=[[5,10],[12,18],[20,26]].map(([a,b],i)=>({step:a+Math.floor(Math.random()*(b-a+1)),hands:i===2?2:1,done:false}));
let grab=null;
const grabEl=$("#grab");
function startGrab(trap){
  trap.done=true;
  const n=trap.hands, need=n===2?14:9;
  const gy=groundY(player.position.x,player.position.z);
  hands.forEach((h,i)=>{
    h.visible=i<n;
    if(i>=n) return;
    const side=n===1?(Math.random()<.5?-1:1):(i?1:-1);
    const x=player.position.x+side*.11, z=player.position.z+.04;
    h.position.set(x,gy-.6,z); h.rotation.set(0,0,-side*.25);
    h.userData.base=gy; h.userData.side=side;
    h.userData.hole.position.set(x,gy+.004,z); h.userData.hole.material.opacity=0;
  });
  grab={phase:"hold",t:0,need,taps:0,progress:0,limit:n===2?6:5,hands:n,startZ:player.position.z,dragTo:0};
  $("#grabTitle").textContent=n===2?"두 손이 발목을 움켜쥐었다":"무언가 발목을 잡았다";
  $("#grabSub").textContent="화면을 빠르게 눌러 발을 빼내세요 · 키보드는 스페이스";
  grabEl.hidden=false; grabEl.focus({preventScroll:true});
  joyV={x:0,y:0}; const k=$("#joy i"); if(k) k.style.transform="";
  bubbleText="…!"; bubbleUntil=performance.now()+900;
  grabSound();
}
function tapGrab(){
  if(!grab||grab.phase!=="hold") return;
  grab.progress=Math.min(1,grab.progress+1/grab.need); grab.taps++;
  grabEl.classList.add("hit"); setTimeout(()=>grabEl.classList.remove("hit"),80);
  knock();
  if(grab.progress>=1){
    grab.phase="free"; grab.t=0;
    $("#grabTitle").textContent="빠져나왔다"; $("#grabSub").textContent="계속 올라가세요. 아직 계단이 남았어요.";
    setTimeout(()=>{grabEl.hidden=true;},700);
  }
}
grabEl.addEventListener("pointerdown",e=>{e.preventDefault();tapGrab();});
function updateGrab(dt){
  if(!grab) return false;
  grab.t+=dt;
  const active=hands.slice(0,grab.hands);
  if(grab.phase==="hold"){
    const rise=Math.min(1,grab.t/.22);
    grab.progress=Math.max(0,grab.progress-dt*.12);
    active.forEach((h,i)=>{
      const u=h.userData;
      h.position.y=u.base-.6+.6*(1-Math.pow(1-rise,3))+Math.sin(grab.t*40+i)*.006;
      h.rotation.z=-u.side*.25+Math.sin(grab.t*23+i*2)*.05*(1-grab.progress*.5);
      const curl=Math.min(1.35,grab.t*5)*(1-grab.progress*.55);
      u.fingers.forEach(([f,j])=>{f.rotation.x=curl*.75;j.rotation.x=curl;});
      u.hole.material.opacity=Math.min(.9,grab.t*4);
    });
    player.rotation.z=Math.sin(grab.t*30)*.03*(.5+grab.progress);
    $("#grabBar i").style.width=(grab.progress*100)+"%";
    $("#grabTime i").style.width=Math.max(0,100-grab.t/grab.limit*100)+"%";
    $("#grabCount").textContent=Math.max(0,grab.limit-grab.t).toFixed(1)+"초";
    if(grab.t>=grab.limit){
      grab.phase="drag"; grab.t=0; grab.dragTo=Math.min(.5,player.position.z+3*DEPTH);
      $("#grabTitle").textContent="끌려 내려간다"; $("#grabSub").textContent="세 계단 아래로 끌려갔어요";
      const f=$("#flash"); f.style.opacity=".8"; setTimeout(()=>f.style.opacity="0",reduce?50:500);
      grabSound(true);
    }
    return true;
  }
  if(grab.phase==="drag"){
    const k=Math.min(1,grab.t/.9);
    player.position.z=grab.startZ+(grab.dragTo-grab.startZ)*(k*k);
    active.forEach(h=>{h.position.z=player.position.z+.04; h.position.y=groundY(0,player.position.z)-.05*k; h.userData.hole.position.z=h.position.z; h.userData.hole.position.y=groundY(0,player.position.z)+.004;});
    player.rotation.z=Math.sin(grab.t*20)*.05;
    if(k>=1){grab.phase="free";grab.t=0;setTimeout(()=>{grabEl.hidden=true;},300);}
    return true;
  }
  // free: hands sink back into the stone
  const k=Math.min(1,grab.t/.5);
  active.forEach(h=>{const u=h.userData;h.position.y-=dt*1.6;u.fingers.forEach(([f,j])=>{f.rotation.x*=.9;j.rotation.x*=.9;});u.hole.material.opacity=.9*(1-k);});
  player.rotation.z*=.8;
  if(k>=1){active.forEach(h=>h.visible=false);player.rotation.z=0;grab=null;}
  return grab&&grab.t<.25;
}

/* ---------- input ---------- */
const keys={}; let joyV={x:0,y:0};
addEventListener("keydown",e=>{
  if(e.target.tagName==="TEXTAREA") return;
  if(grab&&grab.phase==="hold"&&(e.key===" "||e.key==="Enter")){ if(!e.repeat) tapGrab(); e.preventDefault(); return; }
  keys[e.key.toLowerCase()]=true;
  if(e.key.toLowerCase()==="e" && atTop && sheet.hidden) openRitual();
  if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(e.key.toLowerCase())) e.preventDefault();
});
addEventListener("keyup",e=>{keys[e.key.toLowerCase()]=false;});
(function joystick(){
  const pad=$("#joy"), knob=pad.querySelector("i"); let id=null;
  const set=(e)=>{const r=pad.getBoundingClientRect();let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);
    const m=Math.hypot(dx,dy),R=r.width/2-10; if(m>R){dx*=R/m;dy*=R/m;}
    knob.style.transform=`translate(${dx}px,${dy}px)`; joyV={x:dx/R,y:dy/R};};
  pad.addEventListener("pointerdown",e=>{id=e.pointerId;pad.setPointerCapture(id);set(e);});
  pad.addEventListener("pointermove",e=>{if(e.pointerId===id)set(e);});
  const end=()=>{id=null;knob.style.transform="";joyV={x:0,y:0};};
  pad.addEventListener("pointerup",end); pad.addEventListener("pointercancel",end);
})();

/* ---------- wishes: storage ---------- */
let wishes=[];              // [{text,ts,key}]
const stripGroup=new THREE.Group(); scene.add(stripGroup);
let strips=[];              // meshes for raycast
let db=null,me=null,myDocItems=[],mode="loading";
const LOCAL_KEY="fox-stairs-wishes";

function paperTexture(text){
  const c=document.createElement("canvas"); c.width=64; c.height=256;   // small: the forest may hold over a thousand
  const x=c.getContext("2d"); x.scale(64/96,256/384);
  x.fillStyle="#e3dac2"; x.fillRect(0,0,96,384);
  // aged edges
  const gr=x.createLinearGradient(0,0,96,0); gr.addColorStop(0,"rgba(80,50,20,.25)");gr.addColorStop(.15,"rgba(0,0,0,0)");gr.addColorStop(.85,"rgba(0,0,0,0)");gr.addColorStop(1,"rgba(80,50,20,.25)");
  x.fillStyle=gr; x.fillRect(0,0,96,384);
  x.fillStyle="#8e1f1a"; x.fillRect(40,8,16,16);  // red seal
  x.fillStyle="#1a1410"; x.font="22px 'Song Myung', serif"; x.textAlign="center"; x.textBaseline="top";
  const chars=[...text.replace(/\s+/g," ")].slice(0,26);
  const perCol=13;
  chars.forEach((ch,i)=>{const col=Math.floor(i/perCol),row=i%perCol;
    const cx=chars.length>perCol?(col===0?62:34):48; x.fillText(ch,cx,34+row*26);});
  const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; t.anisotropy=4; return t;
}
const stripGeo=new THREE.PlaneGeometry(.16,.64); stripGeo.translate(0,-.36,0);
const threadMat=new THREE.LineBasicMaterial({color:0x9a8e70});
const LIFE_DAYS=49, LIFE_MS=LIFE_DAYS*86400000;     // a paper burns forty-nine days after it is hung
const alive=w=>Date.now()-w.ts<LIFE_MS;
const slotOf=new Map(), stripOf=new Map();
let hiddenCount=0;
function disposeStrip(g){ g.traverse(o=>{ if(o.material){ if(o.material.map) o.material.map.dispose(); if(o.material!==threadMat) o.material.dispose(); } }); stripGroup.remove(g); }
function rebuildStrips(){
  wishes=wishes.filter(w=>w.burning||alive(w));
  // the tree holds as many papers as it has slots; the newest stay, the rest wait in the list
  const byNew=wishes.slice().sort((a,b)=>b.ts-a.ts);
  const shown=byNew.slice(0,slots.length); hiddenCount=byNew.length-shown.length;
  const keys=new Set(shown.map(w=>w.key));
  for(const [k,g] of stripOf) if(!keys.has(k)){ disposeStrip(g); stripOf.delete(k); slotOf.delete(k); }
  const used=new Set(slotOf.values());
  let free=0;
  shown.slice().reverse().forEach(w=>{          // oldest first, so the old tree fills before the others
    if(stripOf.has(w.key)){ const g=stripOf.get(w.key); g.children[0].userData.wish=w; if(w.fresh){g.userData.fresh=1;w.fresh=false;} return; }
    while(used.has(free)) free++;
    const slot=free; used.add(slot); slotOf.set(w.key,slot);
    const g=new THREE.Group(); g.position.copy(slots[slot]);
    const mat=new THREE.MeshStandardMaterial({map:paperTexture(w.text),side:THREE.DoubleSide,roughness:1,emissive:0x3a3428,emissiveIntensity:.5});
    const m=new THREE.Mesh(stripGeo,mat); m.userData.wish=w;
    g.add(m); g.rotation.y=Math.random()*Math.PI*2;
    g.userData={phase:Math.random()*10,fresh:w.fresh?1:0,burn:0,key:w.key}; w.fresh=false;
    stripGroup.add(g); stripOf.set(w.key,g);
  });
  strips=[...stripOf.values()].map(g=>g.children[0]);
  // a tree puts on its rope once it carries its first paper
  wishTrees.forEach(t=>{ if(t.main) return; let has=false; for(const v of slotOf.values()) if(v>=t.start&&v<t.end){has=true;break;} t.rope.visible=has; });
  ageStrips();
  $("#wishN").textContent=wishes.filter(w=>!w.burning).length;
  renderList();
}
// papers in their last three days scorch at the edges; at forty-nine days they catch fire
const scorch=new THREE.Color(0xa8784a), whiteC=new THREE.Color(0xffffff);
function ageStrips(){
  const now=Date.now();
  for(const g of stripOf.values()){
    const m=g.children[0], w=m.userData.wish; if(!w||g.userData.burn>0) continue;
    const left=LIFE_MS-(now-w.ts);
    if(left<=0){ g.userData.burn=.0001; w.burning=true; burnSound(); $("#wishN").textContent=wishes.filter(x=>!x.burning).length; continue; }
    const k=Math.max(0,Math.min(1,1-left/(3*86400000)));
    m.material.color.copy(whiteC).lerp(scorch,k);
    m.material.emissive.setHex(k>0?0x5a2a10:0x3a3428);
  }
}
setInterval(ageStrips,15000);
// embers rising from burning paper
const EMB=240, embPos=new Float32Array(EMB*3), embVel=new Float32Array(EMB*3), embLife=new Float32Array(EMB);
for(let i=0;i<EMB;i++) embPos[i*3+1]=-99;
const embGeo=new THREE.BufferGeometry(); embGeo.setAttribute("position",new THREE.BufferAttribute(embPos,3));
const embers=new THREE.Points(embGeo,new THREE.PointsMaterial({color:0xff7a2a,size:.06,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));
scene.add(embers); let embNext=0;
function spawnEmber(p){ const i=embNext; embNext=(embNext+1)%EMB;
  embPos[i*3]=p.x+(Math.random()-.5)*.08; embPos[i*3+1]=p.y; embPos[i*3+2]=p.z+(Math.random()-.5)*.08;
  embVel[i*3]=(Math.random()-.5)*.3; embVel[i*3+1]=.5+Math.random()*.7; embVel[i*3+2]=(Math.random()-.5)*.3; embLife[i]=1.4+Math.random(); }
const emberAt=new THREE.Vector3();
function tickBurning(dt,t){
  let finished=false;
  for(const g of stripOf.values()){
    const u=g.userData; if(!(u.burn>0)) continue;
    u.burn=Math.min(1,u.burn+dt/2.8);
    const m=g.children[0];
    g.scale.y=Math.max(.001,1-u.burn);                       // burns from the bottom edge up to the knot
    m.material.emissive.setHex(0xff5a18); m.material.emissiveIntensity=1.6*(1-u.burn)+.2*Math.sin(t*30);
    m.material.color.setRGB(.35*(1-u.burn),.25*(1-u.burn),.2*(1-u.burn));
    emberAt.set(0,-.04-.68*(1-u.burn),0); m.localToWorld(emberAt);
    if(Math.random()<.7) spawnEmber(emberAt);
    if(u.burn>=1){ wishes=wishes.filter(w=>w.key!==u.key); finished=true; }
  }
  for(let i=0;i<EMB;i++){ if(embLife[i]<=0) continue; embLife[i]-=dt;
    embPos[i*3]+=embVel[i*3]*dt; embPos[i*3+1]+=embVel[i*3+1]*dt; embPos[i*3+2]+=embVel[i*3+2]*dt;
    if(embLife[i]<=0) embPos[i*3+1]=-99; }
  embGeo.attributes.position.needsUpdate=true;
  if(finished){ if(mode!=="shared") saveLocal(); rebuildStrips(); }
}
function ago(ts){
  const s=(Date.now()-ts)/1000;
  if(s<60) return "방금"; if(s<3600) return Math.floor(s/60)+"분 전";
  if(s<86400) return Math.floor(s/3600)+"시간 전"; return Math.floor(s/86400)+"일 전";
}
function renderList(){
  const ol=$("#wishList"); ol.textContent="";
  const sorted=wishes.filter(w=>!w.burning).sort((a,b)=>b.ts-a.ts);
  for(const w of sorted){const li=document.createElement("li");li.textContent=w.text;
    const sm=document.createElement("small");const left=Math.max(0,Math.ceil((LIFE_MS-(Date.now()-w.ts))/86400000));sm.textContent=ago(w.ts)+" · "+(left<=1?"오늘 밤 불씨가 돼요":left+"일 뒤 불씨")+(w.mine?" · 내 소원":"");li.appendChild(sm);ol.appendChild(li);}
  const md=$("#mode");
  const msgs={
    loading:"고목에 걸린 종이를 불러오는 중이에요.",
    shared:"이 계단에 들른 사람들이 남긴 소원이에요.",
    local:"온라인 저장소가 연결되지 않아 소원이 이 브라우저에만 남아요.",
    slow:"소원을 아직 불러오지 못했어요. 연결이 느릴 수 있어요.",
  };
  md.textContent=(wishes.length?"":"아직 아무도 소원을 걸지 않았어요. 계단 끝까지 올라 첫 번째 종이를 매달아 보세요. ")+(msgs[mode]||"")+" 종이는 걸린 지 "+LIFE_DAYS+"일이 지나면 불씨가 되어 사라져요."+(hiddenCount>0?" 나무가 모두 차서 오래된 "+hiddenCount+"개는 목록에만 있어요.":"");
}
function loadLocal(){
  try{const a=JSON.parse(localStorage.getItem(LOCAL_KEY)||"[]");wishes=a.map(w=>({...w,mine:true,key:w.key||"l"+w.ts})).filter(alive);}catch(e){wishes=[];}
  rebuildStrips();
}
function saveLocal(){
  try{localStorage.setItem(LOCAL_KEY,JSON.stringify(wishes.map(({text,ts})=>({text,ts}))));}catch(e){}
}

const MINE_KEY="fox-stairs-mine";
let mineIds=[]; try{mineIds=JSON.parse(localStorage.getItem(MINE_KEY)||"[]").filter(n=>typeof n==="number");}catch(e){}
function toWish(row){return {text:String(row.text||"").slice(0,60),ts:Date.parse(row.created_at)||Date.now(),key:"s"+row.id,id:row.id,mine:mineIds.includes(row.id)};}
async function connect(){
  if(!sb){mode="local";loadLocal();return;}
  const timer=setTimeout(()=>{if(mode==="loading"){mode="slow";renderList();}},10000);
  // only papers still hanging (younger than 49 days), newest first
  const since=new Date(Date.now()-LIFE_MS).toISOString();
  const {data,error}=await sb.from("wishes").select("id,text,created_at").gte("created_at",since)
    .order("created_at",{ascending:false}).limit(slots.length);
  clearTimeout(timer);
  if(error){mode="local";loadLocal();return;}
  mode="shared"; wishes=(data||[]).map(toWish); rebuildStrips();
  sb.channel("fox-stairs-wishes")
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"wishes"},({new:row})=>{
      if(!row||wishes.some(w=>w.id===row.id)) return;
      const w=toWish(row); w.fresh=true; wishes.push(w); rebuildStrips();
    })
    .on("postgres_changes",{event:"DELETE",schema:"public",table:"wishes"},({old})=>{
      if(!old) return; wishes=wishes.filter(w=>w.id!==old.id); rebuildStrips();
    })
    .subscribe();
}
setTimeout(connect,0);

async function hangWish(text){
  if(wishes.filter(w=>w.mine&&!w.burning&&alive(w)).length>=5) throw new Error("limit");
  if(mode!=="shared"){
    const ts=Date.now();
    wishes.push({text,ts,key:"l"+ts,mine:true,fresh:true}); saveLocal(); rebuildStrips(); return;
  }
  const {data,error}=await sb.from("wishes").insert({text,client_id:clientId}).select("id,text,created_at").single();
  if(error){ if(/limit/i.test(error.message||"")) throw new Error("limit"); throw error; }
  mineIds.push(data.id); try{localStorage.setItem(MINE_KEY,JSON.stringify(mineIds.slice(-50)));}catch(e){}
  const have=wishes.find(w=>w.id===data.id);
  if(have){ have.mine=true; renderList(); }
  else { const w=toWish(data); w.fresh=true; wishes.push(w); rebuildStrips(); }
}

/* ---------- ritual UI ---------- */
const sheet=$("#sheet"), callBtn=$("#callBtn"), bubble=$("#bubble");
let atTop=false, summoned=0, bubbleUntil=0, bubbleText="";
function openRitual(){
  sheet.hidden=false; $("#stepChant").hidden=false; $("#stepWish").hidden=true; callBtn.hidden=true;
  $("#chantBtn").focus();
}
function closeRitual(){ sheet.hidden=true; }
callBtn.addEventListener("click",openRitual);
sheet.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",closeRitual));
$("#chantBtn").addEventListener("click",()=>{
  bubbleText="사막여우야 사막여우야 내 소원을 들어줘"; bubbleUntil=performance.now()+5200;
  summoned=performance.now();
  whisper();
  const f=$("#flash"); f.style.opacity=".75"; setTimeout(()=>f.style.opacity="0",reduce?50:650);
  $("#stepChant").hidden=true;
  setTimeout(()=>{$("#stepWish").hidden=false;$("#wishText").focus();},reduce?0:1400);
});
const ta=$("#wishText");
ta.addEventListener("input",()=>{const n=ta.value.trim().length;$("#wishLen").textContent=ta.value.length+" / 60";$("#hangBtn").disabled=!n;});
$("#wishForm").addEventListener("submit",async e=>{
  e.preventDefault(); const text=ta.value.trim(); if(!text) return;
  const err=$("#wishErr"); err.hidden=true; $("#hangBtn").disabled=true;
  try{
    await hangWish(text);
    ta.value=""; $("#wishLen").textContent="0 / 60"; closeRitual();
    bubbleText="종이를 가지에 매달았어요"; bubbleUntil=performance.now()+2600;
  }catch(ex){
    if(ex&&ex.message==="limit") err.textContent="이미 소원을 다섯 개 걸었어요. 사막여우는 욕심 많은 사람을 싫어한대요.";
    else { // refused write: roll back the optimistic strip
      wishes=wishes.filter(w=>!(w.fresh&&w.text===text)); rebuildStrips();
      err.textContent="소원을 걸지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.";
    }
    err.hidden=false; $("#hangBtn").disabled=false;
  }
});
$("#listBtn").addEventListener("click",()=>{const d=$("#drawer");d.hidden=!d.hidden;});

/* ---------- reading a strip ---------- */
const ray=new THREE.Raycaster(), ptr=new THREE.Vector2(); const readEl=$("#read"); let readUntil=0,readTarget=null;
renderer.domElement.addEventListener("pointerdown",e=>{
  ptr.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);
  ray.setFromCamera(ptr,camera);
  const hit=ray.intersectObjects(strips,false)[0];
  if(hit){readTarget=hit.object;readEl.textContent=hit.object.userData.wish.text;readEl.hidden=false;readUntil=performance.now()+4500;}
  else readEl.hidden=true;
});

/* ---------- score: broken music box, dissonant drone, distant bell (built on demand) ---------- */
let ac=null,master=null,verb=null,droneGain=null,boxQuietUntil=0,nextNote=0,phraseIdx=0,noteIdx=0,nextBell=0;
const A4=440, hz=n=>A4*Math.pow(2,n/12);
// an original lullaby in A phrygian-harmonic: semitone offsets from A4, beats per note
const PHRASES=[
  [[7,1],[3,1],[2,1],[0,2],[-1,1],[0,1],[2,1],[-5,3]],
  [[8,1],[7,1],[3,1],[2,1],[1,2],[0,1],[-1,1],[0,4]],
  [[0,1],[3,1],[7,1],[8,2],[7,1],[3,1],[1,1],[-1,1],[0,4]],
];
function makeVerb(sec){
  const len=ac.sampleRate*sec, b=ac.createBuffer(2,len,ac.sampleRate);
  for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3);}
  const cv=ac.createConvolver(); cv.buffer=b; return cv;
}
function pluck(t,f,vel){ // worn music-box tine: inharmonic partials, fast decay, slightly flat
  const out=ac.createGain(); out.connect(master); out.connect(verb);
  const det=f*Math.pow(2,(-12+Math.random()*10)/1200);
  [[1,.5,2.2],[3.01,.18,.7],[5.4,.06,.35]].forEach(([m,a,dec])=>{
    const o=ac.createOscillator(); o.type="sine"; o.frequency.value=det*m;
    const g=ac.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(a*vel,t+.004);
    g.gain.exponentialRampToValueAtTime(.0001,t+dec); o.connect(g).connect(out); o.start(t); o.stop(t+dec+.05);
  });
}
function bell(t){ // far-off temple bell, low and beating
  const out=ac.createGain(); out.gain.value=.5; out.connect(verb); out.connect(master);
  const f=hz(-31)*(1+Math.random()*.004);
  [[1,.16,9],[2.02,.07,6],[2.76,.06,5],[5.4,.025,3]].forEach(([m,a,dec],i)=>{
    const o=ac.createOscillator(); o.frequency.value=f*m+(i?0:.7);
    const g=ac.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(a,t+.02);
    g.gain.exponentialRampToValueAtTime(.0001,t+dec); o.connect(g).connect(out); o.start(t); o.stop(t+dec);
  });
}
function schedule(){
  if(!ac) return;
  if(ac.state==="running"){
    const now=ac.currentTime;
    if(nextNote<now) nextNote=now+.1;
    while(nextNote<now+1.5){
      const ph=PHRASES[phraseIdx%PHRASES.length];
      const [n,beats]=ph[noteIdx];
      const beat=.62+Math.random()*.12+(noteIdx>=ph.length-2?.25:0);   // drags like an unwinding spring
      if(performance.now()>boxQuietUntil){
        pluck(nextNote,hz(n+12),.32);
        if(beats>=2&&Math.random()<.5) pluck(nextNote+.01,hz(n),.12);   // a hollow low octave now and then
      }
      nextNote+=beat*beats; noteIdx++;
      if(noteIdx>=ph.length){noteIdx=0;phraseIdx++;nextNote+=3+Math.random()*5;}  // silence between phrases
    }
    if(!nextBell) nextBell=now+6;
    if(nextBell<now+1.5){bell(nextBell);nextBell+=18+Math.random()*14;}
  }
  setTimeout(schedule,250);
}
function startScore(){
  master=ac.createGain(); master.gain.value=matchMedia("(pointer: coarse)").matches?.85:.55; master.connect(ac.destination);
  verb=makeVerb(4.5); const vg=ac.createGain(); vg.gain.value=.55; verb.connect(vg).connect(master);
  // wind: filtered noise with slow swell
  const buf=ac.createBuffer(1,ac.sampleRate*4,ac.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
  const n=ac.createBufferSource(); n.buffer=buf; n.loop=true;
  const bp=ac.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=380; bp.Q.value=.8;
  const wg=ac.createGain(); wg.gain.value=.07;
  const lfo=ac.createOscillator(); lfo.frequency.value=.06; const lg=ac.createGain(); lg.gain.value=220;
  lfo.connect(lg).connect(bp.frequency); n.connect(bp).connect(wg).connect(master); n.start(); lfo.start();
  // drone: A and B-flat a semitone apart, beating under a breathing lowpass; louder the higher you climb
  droneGain=ac.createGain(); droneGain.gain.value=.25;
  const lp=ac.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=260; lp.Q.value=4;
  const flfo=ac.createOscillator(); flfo.frequency.value=.045; const fg=ac.createGain(); fg.gain.value=140;
  flfo.connect(fg).connect(lp.frequency); flfo.start();
  [[hz(-36),"sawtooth",.05],[hz(-35)*1.002,"sawtooth",.035],[hz(-24),"triangle",.05]].forEach(([f,type,a])=>{
    const o=ac.createOscillator(); o.type=type; o.frequency.value=f; const g=ac.createGain(); g.gain.value=a;
    o.connect(g).connect(lp); o.start();
  });
  lp.connect(droneGain); droneGain.connect(master); droneGain.connect(verb);
  // the same dissonance an octave and two up, so small phone speakers (which drop deep bass) still carry it
  [[hz(-12),.022],[hz(-11)*1.003,.016],[hz(0),.008]].forEach(([f,a])=>{
    const o=ac.createOscillator(); o.type="triangle"; o.frequency.value=f; const g=ac.createGain(); g.gain.value=a;
    o.connect(g).connect(droneGain); o.start();
  });
  setTension(lastStep<0?0:lastStep);
  schedule();
}
function setTension(step){
  if(!droneGain) return;
  droneGain.gain.setTargetAtTime(.25+.9*(step/STEPS),ac.currentTime,1.5);
}
// Phones only let sound start inside a tap, and iPhones also follow the silent switch for web audio.
// A looping silent <audio> track moves the page into "media playback", which plays even on silent;
// every later tap re-wakes the audio after a call, an alarm or switching apps.
let soundOn=false, keepAlive=null;
function silentWav(){
  const n=8000, b=new Uint8Array(44+n), v=new DataView(b.buffer), w=(o,s)=>[...s].forEach((c,i)=>b[o+i]=c.charCodeAt(0));
  w(0,"RIFF"); v.setUint32(4,36+n,true); w(8,"WAVEfmt "); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true);
  v.setUint32(24,8000,true); v.setUint32(28,8000,true); v.setUint16(32,1,true); v.setUint16(34,8,true); w(36,"data"); v.setUint32(40,n,true);
  b.fill(128,44); let s=""; for(const x of b) s+=String.fromCharCode(x); return "data:audio/wav;base64,"+btoa(s);
}
function wakeAudio(){
  if(!ac) return;
  try{ if(navigator.audioSession) navigator.audioSession.type="playback"; }catch(e){}
  if(!keepAlive){ keepAlive=new Audio(silentWav()); keepAlive.loop=true; keepAlive.setAttribute("playsinline",""); }
  const p=keepAlive.play(); if(p&&p.catch) p.catch(()=>{});
  // a one-sample buffer played inside the tap unlocks older iOS WebKit
  try{ const b=ac.createBuffer(1,1,22050), s=ac.createBufferSource(); s.buffer=b; s.connect(ac.destination); s.start(0); }catch(e){}
  if(ac.state!=="running") ac.resume().catch(()=>{});
}
function setSoundLabel(){ $("#soundBtn").textContent=soundOn?"소리 끄기":"소리 켜기"; }
$("#soundBtn").addEventListener("click",()=>{
  if(!ac){
    try{ac=new (window.AudioContext||window.webkitAudioContext)();}catch(e){$("#soundBtn").textContent="소리 없음";return;}
    soundOn=true; wakeAudio(); startScore(); setSoundLabel(); return;
  }
  soundOn=!soundOn;
  if(soundOn) wakeAudio(); else { ac.suspend().catch(()=>{}); if(keepAlive) keepAlive.pause(); }
  setSoundLabel();
});
addEventListener("pointerdown",()=>{ if(soundOn&&ac&&ac.state!=="running") wakeAudio(); },true);
addEventListener("touchend",()=>{ if(soundOn&&ac&&ac.state!=="running") wakeAudio(); },true);
document.addEventListener("visibilitychange",()=>{
  if(!ac||!soundOn) return;
  if(document.hidden){ ac.suspend().catch(()=>{}); }
  else ac.resume().catch(()=>{});      // if the phone still refuses, the next tap wakes it
});
function grabSound(heavy){
  if(!ac||!soundOn||ac.state!=="running") return;
  const t=ac.currentTime;
  const o=ac.createOscillator(); o.type="sine"; o.frequency.setValueAtTime(heavy?70:110,t); o.frequency.exponentialRampToValueAtTime(35,t+.5);
  const g=ac.createGain(); g.gain.setValueAtTime(.6,t); g.gain.exponentialRampToValueAtTime(.0001,t+.6); o.connect(g).connect(master); o.start(t); o.stop(t+.65);
  const len=ac.sampleRate*(heavy?1.2:.7), b=ac.createBuffer(1,len,ac.sampleRate), d=b.getChannelData(0);
  for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len)*(.6+.4*Math.sin(i/180));
  const s=ac.createBufferSource(); s.buffer=b;
  const f=ac.createBiquadFilter(); f.type="bandpass"; f.frequency.value=heavy?500:900; f.Q.value=1.4;
  const sg=ac.createGain(); sg.gain.value=.35; s.connect(f).connect(sg).connect(master); sg.connect(verb); s.start(t);
}
function knock(){
  if(!ac||!soundOn||ac.state!=="running") return;
  const t=ac.currentTime, len=ac.sampleRate*.08, b=ac.createBuffer(1,len,ac.sampleRate), d=b.getChannelData(0);
  for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,4);
  const s=ac.createBufferSource(); s.buffer=b;
  const f=ac.createBiquadFilter(); f.type="lowpass"; f.frequency.value=700+Math.random()*300;
  const g=ac.createGain(); g.gain.value=.5; s.connect(f).connect(g).connect(master); s.start(t);
}
function burnSound(){
  if(!ac||!soundOn||ac.state!=="running") return;
  const t=ac.currentTime, len=ac.sampleRate*2.6, b=ac.createBuffer(1,len,ac.sampleRate), d=b.getChannelData(0);
  for(let i=0;i<len;i++) d[i]=(Math.random()<.004?(Math.random()*2-1):0)+(Math.random()*2-1)*.08*Math.sin(Math.PI*i/len);
  const s=ac.createBufferSource(); s.buffer=b; const f=ac.createBiquadFilter(); f.type="highpass"; f.frequency.value=900;
  const g=ac.createGain(); g.gain.value=.35; s.connect(f).connect(g).connect(master); s.start(t);
}
function whisper(){
  if(!ac||!soundOn||ac.state!=="running") return;
  const t=ac.currentTime;
  boxQuietUntil=performance.now()+7000;           // the music box stops dead when the fox is called
  const buf=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.sin(Math.PI*i/d.length);
  const s=ac.createBufferSource(); s.buffer=buf;
  const f=ac.createBiquadFilter(); f.type="bandpass"; f.frequency.setValueAtTime(1800,t); f.frequency.exponentialRampToValueAtTime(600,t+2); f.Q.value=3;
  const g=ac.createGain(); g.gain.value=.5; s.connect(f).connect(g).connect(master); g.connect(verb); s.start();
  const o=ac.createOscillator(); o.frequency.setValueAtTime(220,t); o.frequency.exponentialRampToValueAtTime(110,t+2.4);
  const og=ac.createGain(); og.gain.setValueAtTime(.0001,t); og.gain.exponentialRampToValueAtTime(.08,t+.3); og.gain.exponentialRampToValueAtTime(.0001,t+2.6);
  o.connect(og).connect(master); o.start(); o.stop(t+2.7);
  // after the silence, three slow descending notes, pitched down as if the spring gave out
  [0,1.6,3.6].forEach((dt,i)=>pluck(t+3+dt,hz([3,1,-1][i])*0.97,.28));
  bell(t+2.2);
}

/* ---------- loop ---------- */
const clock=new THREE.Clock(); const camTarget=new THREE.Vector3(); const tmp=new THREE.Vector3();
const countEl=$("#count"), hint=$("#hint");
let lastStep=-1, moved=false;
function tick(){
  const dt=Math.min(clock.getDelta(),.05), t=clock.elapsedTime, now=performance.now();
  // movement
  let mx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+joyV.x;
  let mz=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0)+joyV.y;
  const typing=!sheet.hidden;
  const held=updateGrab(dt);
  if(typing||held){mx=0;mz=0;}
  actsEl.querySelectorAll('.act').forEach(b=>b.disabled=!!held);
  const mag=Math.min(1,Math.hypot(mx,mz));
  if(mag>.05){
    moved=true;
    if(myAct.type==='sit'){myAct={type:null,at:Date.now()};actsEl.querySelector('[data-act="sit"]').setAttribute('aria-pressed','false');sendPresence(true);}
    const sp=2.6*mag; const nx=mx/Math.hypot(mx,mz), nz=mz/Math.hypot(mx,mz);
    let x=player.position.x+nx*sp*dt, z=player.position.z+nz*sp*dt;
    const onStairs=z<0.2&&z>TOP_Z;
    const half=onStairs?WIDTH/2-.25:(z<=TOP_Z?6:6);
    x=Math.max(-half,Math.min(half,x)); z=Math.max(PLAT_END,Math.min(9,z));
    // keep out of the tree trunk
    tmp.set(x,0,z-TREE_Z); if(z<TOP_Z && Math.hypot(x,z-TREE_Z)<.8){const a=Math.atan2(z-TREE_Z,x);x=Math.cos(a)*.8;z=TREE_Z+Math.sin(a)*.8;}
    player.position.x=x; player.position.z=z;
    const targetRot=Math.atan2(nx,nz);
    let dr=targetRot-player.rotation.y; dr=Math.atan2(Math.sin(dr),Math.cos(dr));
    player.rotation.y+=dr*Math.min(1,dt*10);
    animateWalk(player,mag,dt);
  }else animateWalk(player,0,dt);
  const gy=groundY(player.position.x,player.position.z);
  player.position.y+= (gy-player.position.y)*Math.min(1,dt*14);
  player.userData.head.rotation.set(Math.sin(t*.7)*.03,0,0); player.userData.arms[1].rotation.z=.08;
  poseAct(player,myAct,Date.now(),dt);
  player.children.forEach(c=>{if(c.userData.baseY==null)c.userData.baseY=c.position.y;c.position.y=c.userData.baseY+(player.userData.sitOffset||0);});
  sendPresence(false); tickOthers(dt);

  // step counter
  const st=stepAt(player.position.z);
  if(st!==lastStep){ if(!grab&&st>lastStep&&lastStep>=0){const tr=traps.find(q=>!q.done&&q.step===st); if(tr) startGrab(tr);} lastStep=st;countEl.innerHTML=`계단 <b>${st}</b> / 28`;setTension(st);countEl.classList.toggle("at-top",st===STEPS);}
  const wasTop=atTop; atTop=player.position.z<TOP_Z-.4;
  if(atTop!==wasTop){ callBtn.hidden=!atTop||!sheet.hidden; if(!atTop) closeRitual(); }
  if(atTop&&sheet.hidden&&callBtn.hidden) callBtn.hidden=false;
  hint.hidden=moved&&!atTop ? (st>3) : atTop;

  // camera follow
  camTarget.set(player.position.x*.6, player.position.y+2.2, player.position.z+4.4);
  if(atTop) camTarget.set(player.position.x*.4, player.position.y+2.0, player.position.z+3.6);
  camera.position.lerp(camTarget,Math.min(1,dt*3));
  if(grab&&grab.phase!=="free"&&!reduce){camera.position.x+=(Math.random()-.5)*.03;camera.position.y+=(Math.random()-.5)*.03;}
  tmp.set(player.position.x,player.position.y+1.1,player.position.z-(atTop?2.2:1.2));
  camera.lookAt(tmp);
  carry.position.set(player.position.x,player.position.y+1.8,player.position.z+.6);

  // lanterns flicker; dim right after the summoning
  const sinceSummon=summoned?(now-summoned)/1000:99;
  const dark=sinceSummon<2.4?Math.max(.05,Math.abs(sinceSummon-1.2)/1.2):1;
  for(const l of lanterns){
    const fl=reduce?1:(.75+.25*Math.sin(t*9+l.phase)*Math.sin(t*3.1+l.phase*2));
    if(l.light) l.light.intensity=l.base*fl*dark;
    if(l.box) l.box.material.emissiveIntensity=1.4*fl*dark;
  }
  // fox eyes wake
  const glow=summoned?Math.min(1,sinceSummon/1.2):0;
  foxEyes.forEach(e=>e.material.color.setRGB(.35+.6*glow,.23+.25*glow*(.6+.4*Math.sin(t*2)),.06));
  ghostStep.material.opacity=summoned?Math.min(.55,sinceSummon*.3)*(.8+.2*Math.sin(t*1.7)):0;

  // strips sway, fresh ones drop in
  tickBurning(dt,t);
  stripGroup.children.forEach(g=>{const u=g.userData;
    g.rotation.z=reduce?0:Math.sin(t*1.4+u.phase)*.12;
    if(u.fresh>0){u.fresh=Math.max(0,u.fresh-dt*.8);g.scale.setScalar(1+u.fresh*.6);}
  });

  // other students: watch the player, fade when approached
  npcs.forEach(n=>{
    const d=n.g.position.distanceTo(player.position);
    const target=d<1.4?0:(d<2.4?(d-1.4):1);
    n.alpha+=(target-n.alpha)*Math.min(1,dt*3);
    n.g.userData.mats.forEach(m=>m.opacity=n.alpha*.82);
    n.g.visible=n.alpha>.02;
    const a=Math.atan2(player.position.x-n.g.position.x,player.position.z-n.g.position.z);
    n.g.userData.head.rotation.y+= (Math.atan2(Math.sin(a-n.g.rotation.y),Math.cos(a-n.g.rotation.y))*.7-n.g.userData.head.rotation.y)*Math.min(1,dt*1.5);
  });
  const wv=summoned?Math.max(0,1-Math.abs(sinceSummon-1.6)/1.0):(.18+.12*Math.sin(t*.4));
  watcher.userData.mats.forEach(m=>m.opacity=wv);
  watcher.visible=wv>.02;

  // ash
  const p=ashGeo.attributes.position.array;
  if(!reduce) for(let i=0;i<ashN;i++){p[i*3+1]-=dt*.25;p[i*3]+=Math.sin(t+i)*dt*.1;if(p[i*3+1]<0)p[i*3+1]=14;}
  ashGeo.attributes.position.needsUpdate=true;

  // bubble above the avatar
  if(now<bubbleUntil){
    tmp.set(player.position.x,player.position.y+1.85,player.position.z).project(camera);
    bubble.hidden=false; bubble.textContent=bubbleText;
    bubble.style.left=((tmp.x+1)/2*innerWidth)+"px"; bubble.style.top=((1-tmp.y)/2*innerHeight)+"px";
  } else bubble.hidden=true;
  if(!readEl.hidden){
    if(now>readUntil) readEl.hidden=true;
    else{readTarget.getWorldPosition(tmp);tmp.project(camera);readEl.style.left=((tmp.x+1)/2*innerWidth)+"px";readEl.style.top=((1-tmp.y)/2*innerHeight)+"px";}
  }

  renderer.render(scene,camera);
  requestAnimationFrame(tick);
}
renderList();
camera.position.set(0,2.4,9.5);
tick();
})();
