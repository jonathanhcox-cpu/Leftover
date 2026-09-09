const assert = require('node:assert/strict');
const E = require('../public/engine.js');

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed++; console.log('PASS', name); }
  catch (err) { failures.push({name, err}); console.error('FAIL', name, '-', err.message); }
}
function eq(actual, expected, label='value') { assert.equal(actual, expected, `${label}: expected ${expected}, got ${actual}`); }
function near(actual, expected, eps=1e-9, label='value') { assert.ok(Math.abs(actual-expected)<=eps, `${label}: expected ${expected}, got ${actual}`); }
function throws(fn, pattern) { assert.throws(fn, pattern); }

// Rectangular material calculators: tile, flooring, plywood, decking.
test('tile exact 10x10 room with 12x12 tile needs exactly 100', () => {
  const p = E.rect({pw:10,ph:10,uw:12,uh:12,full:100,waste:0}, [], {rotate:true,kerf:0});
  eq(p.need,100,'need'); eq(p.buy,0,'buy'); eq(p.physicalBuy,0,'physicalBuy');
});

test('tile exact area with one tile missing buys one', () => {
  const p = E.rect({pw:10,ph:10,uw:12,uh:12,full:99,waste:0}, [], {rotate:true,kerf:0});
  eq(p.buy,1,'buy'); eq(p.physicalBuy,1,'physicalBuy');
});

test('tile 10% reserve on 100-tile install requires 10 spare whole tiles', () => {
  const p = E.rect({pw:10,ph:10,uw:12,uh:12,full:100,waste:10}, [], {rotate:true,kerf:0});
  eq(p.reservePieces,10,'reservePieces'); eq(p.reserveBuy,10,'reserveBuy'); eq(p.buy,10,'buy');
});

test('rect measured offcut can fully replace a new piece', () => {
  const p = E.rect({pw:1,ph:1,uw:12,uh:12,full:0,waste:0}, [{w:12,h:12}], {rotate:true,kerf:0});
  eq(p.buy,0,'buy'); eq(p.scrapsUsed,1,'scrapsUsed');
});

test('plywood one 4x8 sheet exactly covers a 4x8 project', () => {
  const p = E.rect({pw:4,ph:8,uw:48,uh:96,full:1,waste:0}, [], {rotate:true,kerf:0});
  eq(p.need,1,'need'); eq(p.buy,0,'buy');
});

test('plywood two 4x8 sheets cover an 8x8 project', () => {
  const p = E.rect({pw:8,ph:8,uw:48,uh:96,full:2,waste:0}, [], {rotate:true,kerf:0});
  eq(p.buy,0,'buy');
});

test('kerf makes two 24x96 panels not fit one 48x96 sheet', () => {
  const noKerf = E.rect({pw:4,ph:8,uw:24,uh:96,full:2,waste:0}, [], {rotate:false,kerf:0});
  eq(noKerf.buy,0,'noKerf buy');
  const withKerf = E.rect({pw:4,ph:8,uw:24,uh:96,full:0,waste:0}, [], {rotate:false,kerf:0.125});
  eq(withKerf.physicalBuy,2,'withKerf physicalBuy');
});

test('zero full rectangular stock buys required pieces', () => {
  const p = E.rect({pw:2,ph:2,uw:12,uh:12,full:0,waste:0}, [], {rotate:true,kerf:0});
  eq(p.need,4,'need'); eq(p.buy,4,'buy');
});

test('rect rejects zero project dimension', () => {
  throws(() => E.rect({pw:0,ph:2,uw:12,uh:12,full:0,waste:0}, [], {rotate:true,kerf:0}), /Project width/);
});

test('rect rejects fractional full-piece count', () => {
  throws(() => E.rect({pw:2,ph:2,uw:12,uh:12,full:1.5,waste:0}, [], {rotate:true,kerf:0}), /whole number/);
});

test('rect rejects reserve above 100 percent', () => {
  throws(() => E.rect({pw:2,ph:2,uw:12,uh:12,full:1,waste:101}, [], {rotate:true,kerf:0}), /Reserve/);
});

// Linear calculators: lumber and trim.
test('linear footage estimate: 16 ft from two 8-ft boards buys zero', () => {
  const p = E.linear({length:16,piece:8,full:2,waste:0,kerf:0}, [], []);
  eq(p.need,2,'need'); eq(p.buy,0,'buy');
});

test('linear footage estimate: 16 ft from one 8-ft board buys one', () => {
  const p = E.linear({length:16,piece:8,full:1,waste:0,kerf:0}, [], []);
  eq(p.buy,1,'buy');
});

test('two 4-ft cuts fit one 8-ft board with zero kerf', () => {
  const p = E.linear({piece:8,full:1,waste:0,kerf:0}, [], [{len:4,qty:2}]);
  eq(p.physicalBuy,0,'physicalBuy'); eq(p.buy,0,'buy');
});

test('two 4-ft cuts require two boards with 1/8-inch kerf', () => {
  const p = E.linear({piece:8,full:1,waste:0,kerf:0.125}, [], [{len:4,qty:2}]);
  eq(p.physicalBuy,1,'physicalBuy'); eq(p.buy,1,'buy');
});

test('single exact 8-ft cut does not charge kerf past board end', () => {
  const p = E.linear({piece:8,full:1,waste:0,kerf:0.125}, [], [{len:8,qty:1}]);
  eq(p.buy,0,'buy');
});

test('linear offcut can satisfy a cut without buying a board', () => {
  const p = E.linear({piece:8,full:0,waste:0,kerf:0.125}, [{len:4}], [{len:4,qty:1}]);
  eq(p.buy,0,'buy');
});

test('linear 5% reserve rounds to one whole spare board', () => {
  const p = E.linear({piece:8,full:1,waste:5,kerf:0}, [], [{len:8,qty:1}]);
  eq(p.reservePieces,1,'reservePieces'); eq(p.reserveBuy,1,'reserveBuy'); eq(p.buy,1,'buy');
});

test('linear rejects cut longer than purchasable stock', () => {
  throws(() => E.linear({piece:8,full:0,waste:0,kerf:0.125}, [], [{len:9,qty:1}]), /cannot fit/);
});

test('linear rejects zero cut quantity', () => {
  throws(() => E.linear({piece:8,full:0,waste:0,kerf:0}, [], [{len:4,qty:0}]), /at least 1/);
});

// Wallpaper.
test('wallpaper simple drop math: 10-ft wall, 20-in roll, 50 sq ft coverage', () => {
  const p = E.wallpaper({pw:10,ph:8,rollw:20,coverage:50,full:2,waste:0,repeat:0,trim:0}, []);
  eq(p.installDrops,6,'installDrops'); eq(p.perRoll,3,'perRoll'); eq(p.need,2,'need'); eq(p.buy,0,'buy');
});

test('wallpaper pattern repeat rounds drop length upward', () => {
  const p = E.wallpaper({pw:10,ph:8,rollw:20,coverage:50,full:0,waste:0,repeat:25,trim:0}, []);
  eq(p.drop,100,'drop');
});

test('wallpaper trim allowance increases drop length', () => {
  const p = E.wallpaper({pw:10,ph:8,rollw:20,coverage:50,full:0,waste:0,repeat:0,trim:4}, []);
  eq(p.drop,100,'drop');
});

test('wallpaper measured remnant can supply full-width drop', () => {
  const p = E.wallpaper({pw:20/12,ph:8,rollw:20,coverage:50,full:0,waste:0,repeat:0,trim:0}, [{w:20,h:96}]);
  eq(p.installDrops,1,'installDrops'); eq(p.offcutDrops,1,'offcutDrops'); eq(p.buy,0,'buy');
});

test('wallpaper rejects roll too short for one drop', () => {
  throws(() => E.wallpaper({pw:10,ph:20,rollw:20,coverage:5,full:0,waste:0,repeat:0,trim:0}, []), /too short/);
});

// Purchase optimizer utility.
test('package optimizer chooses cheapest sufficient combination', () => {
  const p = E.packagePlan(10,[{units:6,price:5,label:'six'},{units:10,price:12,label:'ten'}]);
  near(p.cost,10,1e-9,'cost'); eq(p.purchasedUnits,12,'purchasedUnits'); eq(p.overbuy,2,'overbuy');
});

test('package optimizer returns zero purchase for zero required units', () => {
  const p = E.packagePlan(0,[{units:6,price:5,label:'six'}]);
  eq(p.cost,0,'cost'); eq(p.purchasedUnits,0,'purchasedUnits');
});

console.log(`\n${passed} passed; ${failures.length} failed`);
if (failures.length) {
  console.error('\nFailures:');
  for (const f of failures) console.error(`- ${f.name}: ${f.err.stack || f.err.message}`);
  process.exit(1);
}
