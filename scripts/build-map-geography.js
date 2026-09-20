// Prepares the coastlines the map of settings is drawn on.
//
// Run by hand, not by rebuild-library.js: the output in assets/astor/geo/ is
// committed, and coastlines do not change between builds. The source is
// Natural Earth (public domain) as packaged by world-atlas, which is not a
// dependency of this site. To regenerate:
//
//   mkdir /tmp/geo && cd /tmp/geo && npm init -y && npm install world-atlas@2 topojson-client@3
//   node scripts/build-map-geography.js /tmp/geo/node_modules
//
// Each view gets its own file at a level of detail that suits it, holding SVG
// path data in plain degrees of longitude and latitude. The page scales the
// paths into place with a transform, so nothing is projected point by point
// in the browser and no tile or third party is ever contacted.

const fs = require('fs');
const path = require('path');

const modules = path.resolve(process.argv[2] || 'node_modules');
const topojson = require(path.join(modules, 'topojson-client'));
const atlas = name => JSON.parse(fs.readFileSync(path.join(modules, 'world-atlas', name), 'utf8'));
const outDir = path.join(__dirname, '..', 'assets', 'astor', 'geo');

// The box each file covers is wider than the view it serves, so land runs off
// the edge of the drawing rather than stopping short of it.
const FILES = [
  { name: 'world', source: '110m', box: [-180, -90, 180, 90], tolerance: 0, minimumArea: 0, digits: 1 },
  { name: 'americas', source: '50m', box: [-175, -60, -20, 84], tolerance: 0.06, minimumArea: 0.05, digits: 2 },
  { name: 'europe', source: '50m', box: [-40, 25, 60, 75], tolerance: 0.02, minimumArea: 0.004, digits: 2 },
  { name: 'london', source: '10m', box: [-2.6, 50.2, 2.8, 52.7], tolerance: 0.0012, minimumArea: 0.00002, digits: 4 },
  { name: 'britain', source: '10m', box: [-18, 47, 9, 62.5], tolerance: 0.008, minimumArea: 0.001, digits: 3 }
];

function perpendicular(point, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = dx * dx + dy * dy;
  if (!length) return Math.hypot(point[0] - a[0], point[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / length));
  return Math.hypot(point[0] - (a[0] + t * dx), point[1] - (a[1] + t * dy));
}

// Douglas–Peucker, iteratively, so a long coast does not overflow the stack.
function simplify(points, tolerance) {
  if (!tolerance || points.length < 5) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let worst = 0;
    let index = -1;
    for (let i = first + 1; i < last; i += 1) {
      const distance = perpendicular(points[i], points[first], points[last]);
      if (distance > worst) { worst = distance; index = i; }
    }
    if (worst > tolerance) { keep[index] = 1; stack.push([first, index], [index, last]); }
  }
  return points.filter((_, i) => keep[i]);
}

// A coast keeps its detail inside the box and loses almost all of it outside,
// where it is only there to close the shape. The whole of Eurasia is one ring,
// and the view of Britain needs a few hundred miles of it.
function simplifyWithin(points, box, tolerance) {
  if (!tolerance) return points;
  const inside = ([x, y]) => x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3];
  const out = [];
  let run = [points[0]];
  let state = inside(points[0]);
  const flush = () => {
    const simple = simplify(run, state ? tolerance : Math.max(1, tolerance * 60));
    out.push(...(out.length ? simple.slice(1) : simple));
  };
  for (let i = 1; i < points.length; i += 1) {
    run.push(points[i]);
    if (inside(points[i]) !== state) { flush(); run = [points[i]]; state = !state; }
  }
  flush();
  return out;
}

// A shape that crosses the date line jumps from one edge of the map to the
// other and draws a band across the world. It is unrolled into one piece that
// runs past the edge, and drawn twice, a turn of the globe apart, so both of
// its ends appear.
function unroll(points) {
  let crosses = false;
  const out = [points[0].slice()];
  let shift = 0;
  for (let i = 1; i < points.length; i += 1) {
    const jump = points[i][0] - points[i - 1][0];
    if (jump > 180) { shift -= 360; crosses = true; } else if (jump < -180) { shift += 360; crosses = true; }
    out.push([points[i][0] + shift, points[i][1]]);
  }
  if (!crosses) return [points];
  return [out, out.map(([x, y]) => [x - 360, y]), out.map(([x, y]) => [x + 360, y])];
}

function area(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i += 1) sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return Math.abs(sum / 2);
}

function touches(points, box) {
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  for (const [x, y] of points) {
    if (x < west) west = x; if (x > east) east = x;
    if (y < south) south = y; if (y > north) north = y;
  }
  return east >= box[0] && west <= box[2] && north >= box[1] && south <= box[3];
}

function pathData(lines, digits, closed) {
  const factor = 10 ** digits;
  const round = value => Math.round(value * factor) / factor;
  let out = '';
  for (const line of lines) {
    let [px, py] = [round(line[0][0]), round(line[0][1])];
    out += 'M' + px + ' ' + py;
    const last = closed ? line.length - 1 : line.length;
    for (let i = 1; i < last; i += 1) {
      const x = round(line[i][0]);
      const y = round(line[i][1]);
      if (x === px && y === py) continue;
      // Relative moves are shorter to write than absolute ones.
      const dx = round(x - px);
      const dy = round(y - py);
      out += 'l' + dx + (dy < 0 ? '' : ' ') + dy;
      px = x; py = y;
    }
    if (closed) out += 'z';
  }
  return out;
}

fs.mkdirSync(outDir, { recursive: true });
for (const file of FILES) {
  const land = atlas('land-' + file.source + '.json');
  const countries = atlas('countries-' + file.source + '.json');

  const rings = [];
  for (const polygon of topojson.feature(land, land.objects.land).features.flatMap(feature =>
    feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates)) {
    for (const ring of polygon.flatMap(unroll)) {
      if (!touches(ring, file.box) || area(ring) < file.minimumArea) continue;
      const simple = simplifyWithin(ring, file.box, file.tolerance);
      if (simple.length >= 4) rings.push(simple);
    }
  }

  // Borders between countries only: the coast is already drawn by the land.
  const mesh = topojson.mesh(countries, countries.objects.countries, (a, b) => a !== b);
  const borders = mesh.coordinates
    .flatMap(unroll)
    .filter(line => touches(line, file.box))
    .map(line => simplifyWithin(line, file.box, file.tolerance))
    .filter(line => line.length >= 2);

  const result = {
    source: 'Natural Earth ' + file.source + ', public domain',
    box: file.box,
    land: pathData(rings, file.digits, true),
    borders: pathData(borders, file.digits, false)
  };
  const target = path.join(outDir, file.name + '.json');
  fs.writeFileSync(target, JSON.stringify(result));
  console.log(file.name + ': ' + rings.length + ' coasts, ' + borders.length + ' borders, ' + Math.round(fs.statSync(target).size / 1024) + ' KB');
}
