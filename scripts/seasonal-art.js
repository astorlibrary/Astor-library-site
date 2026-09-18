'use strict';

// Decorative, code-native illustrations. No SVG IDs are used, so any motif can
// appear several times in the same document without sharing a paint server.
const svg = (className, box, body, extra = '') => `<svg class="${className}" viewBox="${box}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" ${extra}>${body}</svg>`;
const group = (x, y, scale, body, angle = 0) => `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})">${body}</g>`;
const star = (x, y, r, colour, points = 5, rotation = -90) => {
  const coordinates = Array.from({ length: points * 2 }, (_, i) => {
    const a = (rotation + i * 180 / points) * Math.PI / 180;
    const radius = i % 2 ? r * .44 : r;
    return `${(x + Math.cos(a) * radius).toFixed(1)},${(y + Math.sin(a) * radius).toFixed(1)}`;
  }).join(' ');
  return `<polygon points="${coordinates}" fill="${colour}"/>`;
};
const spark = (x, y, r, colour = '#efd28b') => `<path d="M${x-r} ${y}q${r} 0 ${r}-${r}q0 ${r} ${r} ${r}q-${r} 0-${r} ${r}q0-${r}-${r}-${r}Z" fill="${colour}"/>`;
const flecks = (colour = '#fff8df') => [[54,217,2],[101,301,2],[524,265,3],[458,72,2],[363,60,2],[249,95,3],[189,491,2],[415,514,3],[551,379,2],[69,383,3],[380,116,2],[158,80,2],[521,105,2]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${colour}" opacity=".8"/>`).join('');
const leaf = (x,y,scale,colour,angle=0) => group(x,y,scale,`<path d="M0 0C-32-16-35-51 0-78C35-51 32-16 0 0Z" fill="${colour}"/><path d="M0 3V-64M0-20-15-37M0-37 14-52" fill="none" stroke="#694022" stroke-width="2" opacity=".52"/>`,angle);
const maple = (x,y,scale,colour,angle=0) => group(x,y,scale,`<path d="m0-69 12 22 14-9-2 25 23-8-7 19 16 6-37 28 3 18-22-6-22 6 3-18-37-28 16-6-7-19 23 8-2-25 14 9Z" fill="${colour}"/><path d="M0 41V-50M0 15-30-8M0 15 30-8" fill="none" stroke="#703426" stroke-width="2" opacity=".6"/>`,angle);
const acorn = (x,y,scale,angle=0) => group(x,y,scale,'<path d="M-18 0C-22 26-7 40 0 43C7 40 22 26 18 0Z" fill="#ddab65"/><path d="M-24 1Q-25-23 0-23Q25-23 24 1Z" fill="#71492b"/><path d="m0-23 4-13" stroke="#99643b" stroke-width="6"/><path d="m-16-9 8 7 8-7 8 7 8-7" fill="none" stroke="#a67b4e" stroke-width="3"/>',angle);
const holly = (x,y,scale=1,angle=0) => group(x,y,scale,'<path d="M0 0Q-28 3-48-25Q-29-23-31-43Q-18-30-5-47Q-5-25 10-26Q2-10 0 0Z" fill="#338365"/><path d="M0 0Q23-31 53-28Q36-18 46-2Q24-6 26 14Q12 0 0 0Z" fill="#4f9b6f"/><path d="m0 0-30-29M0 0 35-17" stroke="#aec797" stroke-width="1.8"/><circle cx="-7" cy="2" r="8" fill="#c8343e"/><circle cx="8" cy="4" r="8" fill="#e54b50"/><circle cx="1" cy="-9" r="8" fill="#b52537"/><circle cx="-9" cy="0" r="2" fill="#ffe1bb"/>',angle);
const evergreen = (x,y,scale,angle=0) => group(x,y,scale,`<path d="M0 0H170" stroke="#99784b" stroke-width="3"/>${Array.from({length:12},(_,i)=>{const n=i*13;return `<path d="M${n} 0l27-28m-27 28 29 23m-17-23 23-20m-23 20 23 18" stroke="${i%2?'#3f8262':'#256a52'}" stroke-width="4" stroke-linecap="round" fill="none"/>`;}).join('')}`,angle);
const fir = (x,y,scale,colour='#257052',snow=false) => group(x,y,scale,`<path d="M-7 0h14v-32H-7Z" fill="#785332"/><path d="m0-200-43 68h22l-43 67h24l-43 49H83L40-65h24l-43-67h22Z" fill="${colour}"/>${snow?'<path d="m0-200-43 68h22l21-12 21 12h22Zm0 68-41 64 21-8 20-12 20 12 21 8Zm0 62-61 53 34-9 27-16 27 16 34 9Z" fill="#d6e9e9"/>':''}`);
const snowflake = (x,y,scale,colour='#e1f2ed',angle=0) => group(x,y,scale,Array.from({length:6},(_,i)=>`<path d="M0 0V-30M0-15l-8-8m8 8 8-8" transform="rotate(${i*60})" stroke="${colour}" stroke-width="3" stroke-linecap="round" fill="none"/>`).join(''),angle);
const heart = (x,y,scale,colour='#e999a3',angle=0) => group(x,y,scale,`<path d="M0 30C-66-10-33-54 0-25C33-54 66-10 0 30Z" fill="${colour}"/>`,angle);
const rose = (x,y,scale,colour='#c8425a',angle=0) => group(x,y,scale,`<path d="M-10 20Q-56 34-63-6Q-18-20-10 20ZM13 16Q32-29 68-12Q60 29 13 16Z" fill="#477761"/><path d="M0-36C19-49 36-27 30-19C57-9 42 22 28 24C22 49-8 43-15 31C-46 35-51 9-35-5C-43-30-15-45 0-36Z" fill="${colour}"/><path d="M-8-25C26-32 36 11 9 25C-10 38-36 3-17-12C-2-26 20-5 7 8C-2 18-16 4-7-3" fill="none" stroke="#f4b2a9" stroke-width="4" stroke-linecap="round"/>`,angle);
const bat = (x,y,scale,angle=0) => group(x,y,scale,'<path d="M0-7 5-17 10-7Q26-28 58-26Q43-8 40 9Q24-4 17 13Q6 6 0 20Q-6 6-17 13Q-24-4-40 9Q-43-8-58-26Q-26-28-10-7L-5-17Z" fill="#181426"/>',angle);
const pumpkin = (x,y,scale,jack=false,angle=0) => group(x,y,scale,`<path d="M0-45q-5-20 10-28" fill="none" stroke="#78954d" stroke-width="9"/><ellipse cx="-20" cy="0" rx="37" ry="47" fill="#dd641f"/><ellipse cx="20" cy="0" rx="37" ry="47" fill="#ef8c2a"/><ellipse cy="0" rx="28" ry="49" fill="#f5a741"/><path d="M-13-43q-17 47 0 86M13-43q17 47 0 86" stroke="#d77629" stroke-width="2" fill="none"/>${jack?'<path d="m-32-9 13-17 10 17Zm41 0 10-17 13 17Zm-35 25 13 8 13-4 13 4 13-8Q18 44 0 40Q-18 44-26 16Z" fill="#623121"/>':''}`,angle);
const firework = (x,y,r,colour) => `<g stroke="${colour}" fill="${colour}" stroke-linecap="round">${Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;const x1=x+Math.cos(a)*r*.4,y1=y+Math.sin(a)*r*.4,x2=x+Math.cos(a)*r,y2=y+Math.sin(a)*r;return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke-width="2.5"/><circle cx="${(x+Math.cos(a)*r*1.16).toFixed(1)}" cy="${(y+Math.sin(a)*r*1.16).toFixed(1)}" r="2" stroke="none"/>`;}).join('')}</g>`;
const gift = (x,y,scale,colour='#b82f40',angle=0) => group(x,y,scale,`<path d="M-34-42h68V9h-68Z" fill="${colour}"/><path d="M-39-48h78v15h-78Z" fill="${colour}"/><path d="M-6-48H6V9H-6Z" fill="#efd59a"/><path d="M0-49C-60-77-26-96 0-49C26-96 60-77 0-49Z" fill="none" stroke="#efd59a" stroke-width="5"/>`,angle);
const bauble = (x,y,r,colour) => `<path d="M${x} 0V${y-r-7}" stroke="#e5c98d" stroke-width="1.5"/><path d="M${x-r*.2} ${y-r-8}h${r*.4}v10h-${r*.4}Z" fill="#dfc48d"/><circle cx="${x}" cy="${y}" r="${r}" fill="${colour}"/><path d="M${x-r*.85} ${y}q${r*.85} ${r*.5} ${r*1.7} 0" fill="none" stroke="#f3d894" stroke-width="3"/><ellipse cx="${x-r*.35}" cy="${y-r*.35}" rx="${r*.18}" ry="${r*.28}" fill="#fff0d1" opacity=".55"/>`;
const pennants = (width,y,colourList,dip=65) => {
  const count = Math.round(width/60);
  const step = width/count;
  let s=`<path d="M0 ${y}Q${width/2} ${y+dip*2} ${width} ${y}" fill="none" stroke="#f4dcb5" stroke-width="2"/>`;
  for(let i=0;i<count;i++) {const x=(i+.5)*step,t=x/width;const top=y+4*dip*t*(1-t);s+=`<path d="m${x-step*.43} ${top-4} ${step*.86} 0-${step*.43} 48Z" fill="${colourList[i%colourList.length]}" transform="rotate(${(1-2*t)*16} ${x} ${top})"/>`;}
  return s;
};
const moon = (x,y,r,colour='#f4d89a') => `<circle cx="${x}" cy="${y}" r="${r+15}" fill="${colour}" opacity=".05"/><circle cx="${x}" cy="${y}" r="${r+7}" fill="${colour}" opacity=".08"/><circle cx="${x}" cy="${y}" r="${r}" fill="${colour}"/><circle cx="${x-r*.35}" cy="${y-r*.13}" r="${r*.19}" fill="#caa876" opacity=".28"/><circle cx="${x+r*.2}" cy="${y+r*.43}" r="${r*.24}" fill="#caa876" opacity=".25"/>`;
const wave = (y,colour) => `<path d="M8 ${y}q42-28 84 0t84 0t84 0t84 0t84 0t84 0t84 0v75H8Z" fill="${colour}"/>`;
const themes = new Set(['autumn','halloween','bonfire-night','christmas','winter','summer','valentines-day','fourth-of-july']);
const normalise = theme => themes.has(theme) ? theme : 'autumn';

function scene(theme) {
  let body='';
  switch(normalise(theme)) {
    case 'christmas':
      body = `<circle cx="303" cy="288" r="222" fill="#7dae86" opacity=".055"/><path d="M20 32Q300 160 580 32" fill="none" stroke="#c9b784" stroke-width="2"/>${evergreen(12,29,1.6,18)}${evergreen(589,29,1.6,162)}${bauble(90,132,28,'#b32d3a')}${bauble(465,83,19,'#d5a555')}${bauble(549,154,33,'#c73b42')}${holly(299,80,.85)}${flecks()}${snowflake(52,278,.58)}${snowflake(526,352,.54)}${fir(493,511,1.47,'#267359')}${fir(76,507,.75,'#418265')}${star(493,212,20,'#f3d081')}${[[483,298],[515,348],[466,375],[526,414],[489,454],[454,445]].map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="7" fill="${i%2?'#e4b755':'#d74345'}"/>`).join('')}<path d="M474 337q21 18 41 0m-65 76q42 29 84 0m-96 57q57 28 112 0" fill="none" stroke="#e1c37a" stroke-width="3"/>${gift(105,515,.92,'#bb3442',-7)}${gift(162,535,.62,'#dbb166',4)}${gift(455,543,.84,'#a8313b',-3)}${gift(528,551,.67,'#e4b457',7)}${holly(299,529,1.2)}<path d="M32 558q280 22 536 0" stroke="#d9bd7b" stroke-width="1" fill="none"/>`;
      break;
    case 'halloween':
      body = `${moon(425,122,88)}${bat(400,91,.65,-12)}${bat(518,156,.42,15)}${bat(136,97,.48,-11)}${bat(78,205,.52,18)}${flecks('#e5b77d')}<path d="M28 539V272l18 75 18-43-9 77 38 21-45-9 11 74 33 52Zm549 0V288l-22 72-26-31 22 58-30 37 39-16-15 79-36 52Z" fill="#110f1c"/><path d="M55 545q170-42 270-10t245-3v25H55Z" fill="#110f1c"/><path d="M416 497V409h22v-64l28-33 29 33v43h31v109Z" fill="#110f1c"/><path d="m426 348 40-56 42 56m-18 41 36-26 30 30h-66Z" fill="#110f1c"/><path d="M458 362h15v26h-15Zm-29 68h13v21h-13Zm58-16h14v25h-14Zm17 48h14v23h-14Zm-53-10q11-15 22 0v45h-22Z" fill="#e7a34d"/>${pumpkin(83,500,.8,true,-8)}${pumpkin(162,533,.54,false,8)}${pumpkin(380,540,.36,false,-4)}${spark(81,99,9,'#e9b562')}${spark(528,270,10,'#e9b562')}`;
      break;
    case 'bonfire-night':
      body = `${firework(126,115,68,'#e7b36d')}${firework(446,127,91,'#e18578')}${firework(523,344,50,'#afc7cd')}${firework(73,310,35,'#cdbbde')}${flecks('#f0c582')}<g transform="translate(-70 255) scale(.55)"><path d="M117 544q187-35 366 0" stroke="#bd785b" stroke-width="2" fill="none"/><ellipse cx="300" cy="526" rx="168" ry="33" fill="#f89a38" opacity=".07"/><path d="m201 544 191-45 11 20-190 43Z" fill="#896044"/><path d="m208 500 190 41-9 21-190-41Z" fill="#b97c46"/><path d="m221 509 150 36m-145 4 151-35" stroke="#e1a465" stroke-width="2"/><path d="M301 529C192 503 211 448 234 420C236 451 259 449 254 422C241 372 286 347 294 309C318 358 363 384 344 435C365 432 371 409 369 393C419 468 377 520 301 529Z" fill="#e66c36"/><path d="M301 526C235 505 256 460 274 438C272 462 291 473 291 447C291 420 307 403 311 384C330 428 335 449 322 473C341 468 347 451 348 439C377 491 343 523 301 526Z" fill="#f4b244"/><path d="M302 525C277 503 289 485 302 467C314 491 334 508 302 525Z" fill="#ffe2a0"/>${[[276,293,8],[360,350,5],[229,368,6],[390,423,4],[331,288,3],[175,445,4]].map(([x,y,r])=>spark(x,y,r,'#fac56d')).join('')}</g>`;
      break;
    case 'winter':
      body = `${moon(432,111,57,'#e6f0e7')}${snowflake(106,107,1,'#d0e5e8',15)}${snowflake(518,283,.73)}${snowflake(80,353,.64)}${snowflake(295,63,.48)}${flecks('#f4faf2')}${fir(494,505,1.33,'#3b7282',true)}${fir(545,526,.87,'#5b8a95',true)}${fir(83,521,1.09,'#447f8a',true)}${fir(36,526,.58,'#789fa6',true)}<path d="M12 525Q138 494 293 529T588 522V552H12Z" fill="#accbd0"/><path d="M12 549Q154 524 318 547T588 537V567H12Z" fill="#e5efeb"/>${snowflake(393,536,.4,'#588897')}${snowflake(166,548,.3,'#588897')}${spark(510,177,8,'#f3f6e8')}`;
      break;
    case 'summer':
      body = `<circle cx="448" cy="108" r="64" fill="#edc968"/>${Array.from({length:12},(_,i)=>`<path d="M448 17v-16" stroke="#edc968" stroke-width="4" transform="rotate(${i*30} 448 108)"/>`).join('')}${group(20,15,.94,pennants(590,0,['#edc968','#e88972','#e8eed8','#71b7b1'],53))}<path d="M45 294q25-28 47 0q24-28 48 0m346-53q17-20 35 0q18-20 35 0" stroke="#f9edca" stroke-width="3" fill="none"/>${wave(480,'#468f94')}${wave(509,'#73b6b3')}${wave(541,'#a8d6c7')}<path d="M452 498V361" stroke="#f1ddb4" stroke-width="4"/><path d="m443 375-69 104h69Z" fill="#f5e7c8"/><path d="m461 395 49 84h-49Z" fill="#e9ac74"/><path d="m370 487 153 0-20 25H394Z" fill="#e9d6af"/><path d="M65 564q196-15 431 5" stroke="#eadcb2" stroke-width="2" fill="none"/>${star(93,542,26,'#eed79b')}`;
      break;
    case 'valentines-day':
      body = `<path d="M91 478C2 277 112 76 303 84C503 76 590 279 505 482" fill="none" stroke="#bf876c" stroke-width="2"/>${heart(300,83,1.03,'#d46c7e')}${heart(520,193,.5,'#e9b4b0',18)}${heart(74,297,.37,'#d46c7e',-18)}${rose(118,130,.77,'#c44360',-19)}${rose(483,411,.88,'#cf6571',20)}${rose(78,451,.75,'#bc3854',-15)}${rose(504,116,.51,'#d68288',22)}${leaf(64,212,.53,'#618e76',-21)}${leaf(516,334,.56,'#527e6c',27)}${flecks('#e8b798')}<path d="m174 501 126 23 128-23-15 28 15 25-129-18-125 18 15-25Z" fill="#cc737c"/><path d="m299 524-48-35q-36-24-50 6q-6 24 45 35Zm0 0 49-35q36-24 50 6q6 24-45 35Z" fill="#e8a9a4"/><path d="M285 515h28v23h-28Z" fill="#efbeb3"/>${rose(300,515,.6,'#ab304d')}`;
      break;
    case 'fourth-of-july':
      body = `${firework(134,121,67,'#e77478')}${firework(441,132,91,'#f0e5cb')}${firework(518,358,47,'#72aac7')}${star(76,311,22,'#f4ead1')}${star(514,246,14,'#e57474')}${star(287,66,15,'#f4ead1')}${flecks('#dbe6e5')}<path d="M47 455Q300 537 553 455L550 503Q300 587 50 503Z" fill="#d65059"/><path d="M50 472Q300 554 550 472V488Q300 570 50 488Z" fill="#f6edda"/><path d="M67 477q96 50 192 17q-6 80-88 64q-82-16-104-81Zm274 17q96 33 192-17q-22 65-104 81q-82 16-88-64Z" fill="#e9e4d5"/><path d="M67 477q96 50 192 17q-9 48-91 32q-55-11-101-49Zm274 17q96 33 192-17q-46 38-101 49q-82 16-91-32Z" fill="#c84652"/><path d="M67 477q96 50 192 17q-24 27-96 5q-62-18-96-22Zm274 17q96 33 192-17q-34 4-96 22q-72 22-96-5Z" fill="#32567b"/>${star(151,504,8,'#fff7e6')}${star(449,504,8,'#fff7e6')}${star(300,546,22,'#eee7d4')}`;
      break;
    default:
      body = `<circle cx="302" cy="289" r="215" fill="#cf813f" opacity=".065"/><path d="M94 494C14 314 76 143 196 90M505 497C582 319 536 169 427 93" fill="none" stroke="#9d7044" stroke-width="3"/>${maple(122,131,.82,'#c86c37',-34)}${leaf(84,247,1.05,'#d5a14b',-28)}${maple(53,383,.72,'#b95b3d',-8)}${leaf(156,528,.9,'#bd893e',-60)}${maple(470,128,.78,'#dfad55',39)}${leaf(543,267,.85,'#c3663d',28)}${maple(528,427,.79,'#d98d42',25)}${leaf(459,530,.9,'#b17646',68)}${acorn(78,447,.76,-24)}${acorn(493,342,.58,21)}${acorn(338,521,.64,25)}${pumpkin(232,537,.55,false,-7)}${pumpkin(303,547,.39,false,7)}${flecks('#d8b87e')}${spark(300,85,16,'#e3c284')}<path d="M115 559q185 15 370 0" fill="none" stroke="#ac8353" stroke-width="1"/>`;
  }
  return svg('season-scene','0 0 600 600',body);
}

function emblem(theme) {
  let body;
  switch(normalise(theme)) {
    case 'christmas':body=holly(50,33,.85);break;
    case 'halloween':body=pumpkin(50,37,.46,true);break;
    case 'bonfire-night':body='<path d="M50 60C15 46 32 21 39 15C37 35 48 23 50 1C60 13 70 24 63 37C71 31 75 30 75 22C93 48 65 63 50 60Z" fill="#d05e30"/><path d="M50 59C32 49 47 34 51 27C51 41 70 49 50 59Z" fill="#f1bc5a"/>';break;
    case 'winter':body=snowflake(50,32,.89,'#4b8495');break;
    case 'summer':body='<circle cx="50" cy="29" r="17" fill="#dca944"/>'+Array.from({length:10},(_,i)=>'<path d="M50 4V-1" stroke="#dca944" stroke-width="2" transform="rotate('+(i*36)+' 50 29)"/>').join('')+'<path d="M9 52q10-8 20 0t20 0t20 0t20 0" stroke="#338991" stroke-width="3" fill="none"/>';break;
    case 'valentines-day':body=rose(50,33,.66,'#bd405b');break;
    case 'fourth-of-july':body=star(50,30,27,'#345e82')+star(19,37,10,'#c74b57')+star(81,37,10,'#c74b57');break;
    default:body=maple(43,39,.47,'#bf6b34',-17)+acorn(73,35,.37,22);
  }
  return svg('season-emblem','0 0 100 64',body);
}

function garland(theme) {
  let body='';
  switch(normalise(theme)) {
    case 'christmas':
      body=`<path d="M0 4Q180 111 360 4Q540 111 720 4Q900 111 1080 4Q1260 111 1440 4" stroke="#d8b16c" stroke-width="2" fill="none"/>`;
      for(let i=0;i<8;i++) body+=evergreen(i*180,3,1.13,i%2?-9:9);
      for(let i=0;i<12;i++){const x=60+i*120;body+=bauble(x,61+(i%3)*17,i%2?9:13,i%2?'#e0b766':'#c7474d');}
      for(let i=0;i<16;i++){const x=45+i*90,t=(x%360)/360,y=4+214*t*(1-t);body+=`<circle cx="${x}" cy="${y.toFixed(1)}" r="9" fill="#f5d885" opacity=".12"/><circle cx="${x}" cy="${y.toFixed(1)}" r="3" fill="#ffe3a1"/>`;}
      body+=holly(360,37,.69)+holly(1080,37,.69);break;
    case 'halloween':
      body=`<path d="M0 0H1440V8L1350 8 1308 22 1240 8 1190 21 1120 8 1060 12 1000 8H400L300 14 230 8 190 24 140 8 69 21 0 8Z" fill="#100e19"/>${bat(82,63,.64,-10)}${bat(275,32,.33,9)}${bat(1358,69,.58,13)}${bat(1170,32,.36,-8)}${bat(581,43,.45,-12)}${bat(839,26,.34,16)}${spark(718,24,6,'#daa85f')}${spark(947,47,4,'#daa85f')}${moon(1391,13,60)}${bat(1390,35,.52,17)}${spark(353,30,5,'#daa85f')}${spark(1095,38,5,'#daa85f')}`;break;
    case 'bonfire-night':
      body=firework(94,13,83,'#d79767')+firework(1351,22,101,'#e6907e')+firework(321,-8,49,'#b9c5d1')+firework(1094,-1,55,'#f0c47c')+firework(606,5,53,'#e8b275')+firework(839,-4,44,'#b3c7d7');break;
    case 'winter':
      body=`<path d="M0 0H1440V9Q1320 38 1200 9T960 9T720 9T480 9T240 9T0 9Z" fill="#d9e9e7"/>`;
      for(let i=0;i<13;i++)body+=snowflake(20+i*117,23+(i%3)*14,.35+(i%2)*.2,'#c5e0e2',i*13);break;
    case 'summer':
      body=pennants(1440,-29,['#e6c05e','#f1e6cb','#dd9174','#7fbbb1'],48);break;
    case 'valentines-day':
      body='<path d="M0 9Q180 87 360 9T720 9T1080 9T1440 9" stroke="#bf816b" stroke-width="2" fill="none"/>';
      for(let i=0;i<9;i++)body+=i%2?heart(90+i*155,38,.35,'#d5969c',i%3?12:-12):rose(90+i*155,17,.53,'#c96c7f',i*7);break;
    case 'fourth-of-july':
      body=pennants(1440,-29,['#c74b57','#f4ead8','#41668b'],44);
      for(let i=0;i<8;i++) body+=star(90+i*180,65,6,'#f5ecd7');break;
    default:
      body='<path d="M0 1Q180 53 360 1T720 1T1080 1T1440 1" fill="none" stroke="#9f713f" stroke-width="2"/>';
      for(let i=0;i<13;i++)body+=(i%2?leaf(10+i*119,70,.67,['#bd663c','#dca752','#9d763b'][i%3],70+i*9):maple(16+i*119,35,.56,['#c87738','#bd603d','#d9a64d'][i%3],i*19));
  }
  return svg('season-garland','0 0 1440 150',body,'preserveAspectRatio="xMidYMin slice"');
}

module.exports = { scene, emblem, garland };
