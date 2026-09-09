const assert = require('node:assert/strict');
const E = require('../public/engine.js');

let seed = 20260909;
function rand(){ seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2**32; }
function int(a,b){ return Math.floor(rand()*(b-a+1))+a; }
function num(a,b){ return a+rand()*(b-a); }
function ok(x,msg){ assert.ok(x,msg); }
let checks=0;

// Rectangular material invariants.
for(let i=0;i<120;i++){
  const v={pw:int(1,12),ph:int(1,12),uw:[6,12,18,24,48][int(0,4)],uh:[6,12,24,48,96][int(0,4)],full:int(0,12),waste:int(0,20)};
  const opts={rotate:rand()>.3,kerf:[0,.0625,.125][int(0,2)]};
  try{
    const p=E.rect(v,[],opts);
    ok(Number.isFinite(p.buy)&&p.buy>=0,'rect buy must be nonnegative finite');
    ok(p.physicalBuy>=0&&p.reserveBuy>=0,'rect purchase components nonnegative');
    ok(p.buy===p.physicalBuy+p.reserveBuy,'rect buy must equal physical + reserve');
    const more=E.rect({...v,full:v.full+1},[],opts);
    ok(more.buy<=p.buy,'one more owned rectangular piece must not increase buy');
    const moreReserve=E.rect({...v,waste:Math.min(100,v.waste+5)},[],opts);
    ok(moreReserve.buy>=p.buy,'higher rectangular reserve must not reduce buy');
    const moreKerf=E.rect(v,[],{...opts,kerf:Math.min(1,opts.kerf+.0625)});
    ok(moreKerf.buy>=p.buy,'higher rectangular kerf must not reduce buy');
    checks+=6;
  }catch(e){
    // Some random geometries legitimately cannot fit a required cut in the selected stock orientation.
    ok(/fit|placements|smaller sections|orientation/i.test(e.message),'unexpected rect error: '+e.message); checks++;
  }
}

// Linear cut-list invariants.
for(let i=0;i<160;i++){
  const piece=[6,8,10,12,16][int(0,4)], full=int(0,10), waste=int(0,20), kerf=[0,.0625,.125,.25][int(0,3)];
  const cuts=[]; const types=int(1,4);
  for(let j=0;j<types;j++) cuts.push({len:Number(num(.5,piece*.9).toFixed(3)),qty:int(1,4)});
  const v={piece,full,waste,kerf};
  const p=E.linear(v,[],cuts);
  ok(p.buy>=0&&p.physicalBuy>=0&&p.reserveBuy>=0,'linear buys nonnegative');
  ok(p.buy===p.physicalBuy+p.reserveBuy,'linear buy must equal physical + reserve');
  ok(p.reusedLength<=p.plannedLength+1e-7,'reused length cannot exceed planned length');
  const more=E.linear({...v,full:full+1},[],cuts);
  ok(more.buy<=p.buy,'one more owned board must not increase buy');
  const moreReserve=E.linear({...v,waste:Math.min(100,waste+5)},[],cuts);
  ok(moreReserve.buy>=p.buy,'higher linear reserve must not reduce buy');
  const moreKerf=E.linear({...v,kerf:Math.min(12,kerf+.125)},[],cuts);
  ok(moreKerf.buy>=p.buy,'higher linear kerf must not reduce buy');
  checks+=6;
}

// Linear footage-estimate monotonicity.
for(let i=0;i<80;i++){
  const piece=[8,10,12,16][int(0,3)], length=num(1,100), full=int(0,12), waste=int(0,25);
  const p=E.linear({piece,length,full,waste,kerf:0},[],[]);
  const more=E.linear({piece,length,full:full+1,waste,kerf:0},[],[]);
  const reserve=E.linear({piece,length,full,waste:Math.min(100,waste+5),kerf:0},[],[]);
  ok(more.buy<=p.buy,'more owned footage stock must not increase buy');
  ok(reserve.buy>=p.buy,'more footage reserve must not reduce buy');
  checks+=2;
}

// Wallpaper invariants.
for(let i=0;i<100;i++){
  const pw=num(2,40), ph=num(6,12), rollw=num(18,27), coverage=num(30,70), full=int(0,8), waste=int(0,20), repeat=[0,12,18,24,25][int(0,4)], trim=[0,2,4,6][int(0,3)];
  try{
    const p=E.wallpaper({pw,ph,rollw,coverage,full,waste,repeat,trim},[]);
    ok(p.buy>=0&&p.need>=0&&p.installDrops>=1,'wallpaper outputs nonnegative');
    ok(p.drop+1e-7>=ph*12+trim,'wallpaper drop must include wall height and trim');
    const more=E.wallpaper({pw,ph,rollw,coverage,full:full+1,waste,repeat,trim},[]);
    ok(more.buy<=p.buy,'one more wallpaper roll must not increase buy');
    const reserve=E.wallpaper({pw,ph,rollw,coverage,full,waste:Math.min(100,waste+5),repeat,trim},[]);
    ok(reserve.buy>=p.buy,'higher wallpaper reserve must not reduce buy');
    checks+=4;
  }catch(e){ ok(/too short|sections/i.test(e.message),'unexpected wallpaper error: '+e.message); checks++; }
}

// Package optimizer compared against brute force for small two-option cases.
for(let i=0;i<120;i++){
  const required=int(1,40), a={units:int(1,12),price:int(1,20),label:'A'}, b={units:int(1,12),price:int(1,20),label:'B'};
  const p=E.packagePlan(required,[a,b]);
  let best=Infinity,bestUnits=Infinity;
  for(let x=0;x<=50;x++)for(let y=0;y<=50;y++){
    const units=x*a.units+y*b.units;if(units<required)continue;
    const cost=x*a.price+y*b.price;
    if(cost<best || cost===best&&units<bestUnits){best=cost;bestUnits=units;}
  }
  ok(Math.abs(p.cost-best)<1e-7,'package optimizer cost differs from brute force');
  ok(p.purchasedUnits===bestUnits,'package optimizer tie-break differs from brute force');
  checks+=2;
}

console.log(`${checks} randomized/property checks passed`);
