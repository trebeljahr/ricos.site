// GLSL for the GPU boid swarm. Four passes per step:
//   grid      every boid writes itself into a slot of its grid cell
//   velocity  steering: own destination, flock, predators, obstacles
//   position  move, drift with the flow, push out of solids
//   pose      a lagging heading the mesh bends toward
// The fish vertex code at the end animates and places each instance.

import {
  MAX_DYNAMIC_OBSTACLES,
  MAX_PREDATORS,
  MAX_SPECIES,
  SLOT_COLUMNS,
  SLOT_ROWS,
  SLOTS_PER_CELL,
} from "./swarmConfig";

export const PASS_VERTEX = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const COPY_FRAGMENT = /* glsl */ `
uniform sampler2D tSource;
void main() {
  gl_FragColor = texelFetch(tSource, ivec2(gl_FragCoord.xy), 0);
}
`;

const GRID_COMMON = /* glsl */ `
uniform vec3 uGridMin;
uniform float uCell;
uniform vec3 uGridDim;
uniform vec2 uGridTiles;

ivec2 cellBase(ivec3 c) {
  int tilesX = int(uGridTiles.x);
  return ivec2(
    (c.z % tilesX) * int(uGridDim.x) + c.x,
    (c.z / tilesX) * int(uGridDim.y) + c.y
  ) * ivec2(${SLOT_COLUMNS}, ${SLOT_ROWS});
}
ivec2 slotOffset(int slot) {
  return ivec2(slot % ${SLOT_COLUMNS}, slot / ${SLOT_COLUMNS});
}
`;

const HASH = /* glsl */ `
uint pcg(uint v) {
  uint s = v * 747796405u + 2891336453u;
  uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
vec3 hash3(uint n) {
  uint a = pcg(n);
  uint b = pcg(a);
  uint c = pcg(b);
  return vec3(a, b, c) * (1.0 / 4294967295.0);
}
`;

const FIELD = /* glsl */ `
precision highp sampler3D;
uniform sampler3D tField;
uniform vec3 uFieldMin;
uniform vec3 uFieldSize;
uniform vec3 uFieldDim;
uniform vec4 uDynSpheres[${MAX_DYNAMIC_OBSTACLES}];
uniform int uDynCount;

// xyz: direction away from the nearest surface, w: signed distance to it.
vec4 fieldAt(vec3 p) {
  vec3 uvw = clamp((p - uFieldMin) / uFieldSize, 0.0, 1.0);
  uvw = (uvw * (uFieldDim - 1.0) + 0.5) / uFieldDim;
  vec4 f = texture(tField, uvw);
  f.xyz = normalize(f.xyz + vec3(0.0, 1e-5, 0.0));
  for (int i = 0; i < ${MAX_DYNAMIC_OBSTACLES}; i++) {
    if (i >= uDynCount) break;
    vec3 d = p - uDynSpheres[i].xyz;
    float l = length(d);
    float sd = l - uDynSpheres[i].w;
    if (sd < f.w) f = vec4(d / max(l, 1e-4), sd);
  }
  return f;
}
`;

const SPECIES = /* glsl */ `
// A: size, cruise speed, max speed, turn rate
// B: separation, alignment, cohesion, school radius
uniform vec4 uSpeciesA[${MAX_SPECIES}];
uniform vec4 uSpeciesB[${MAX_SPECIES}];
`;

export const GRID_VERTEX = /* glsl */ `
uniform sampler2D tPos;
uniform sampler2D tMeta;
uniform vec2 uSimSize;
uniform vec2 uGridTexSize;
uniform float uFrame;
${SPECIES}
${GRID_COMMON}
varying vec4 vCell;

void main() {
  int id = gl_VertexID;
  ivec2 ref = ivec2(id % int(uSimSize.x), id / int(uSimSize.x));
  vec4 P = texelFetch(tPos, ref, 0);
  vec4 M = texelFetch(tMeta, ref, 0);
  ivec3 c = ivec3(floor((P.xyz - uGridMin) / uCell));
  gl_PointSize = 1.0;
  if (M.x < 0.0 || any(lessThan(c, ivec3(0))) || any(greaterThanEqual(c, ivec3(uGridDim)))) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vCell = vec4(0.0);
    return;
  }
  // The slot moves on a few times a second, so a crowded cell registers
  // different boids over time without the neighbours flickering every frame.
  int slot = (id + int(uFrame) / 8) % ${SLOTS_PER_CELL};
  vec2 texel = vec2(cellBase(c) + slotOffset(slot)) + 0.5;
  gl_Position = vec4(texel / uGridTexSize * 2.0 - 1.0, 0.0, 1.0);
  int sp = int(M.x + 0.5);
  vCell = vec4(vec2(ref), float(sp + 1), uSpeciesA[sp].x * M.y);
}
`;

export const GRID_FRAGMENT = /* glsl */ `
varying vec4 vCell;
void main() {
  gl_FragColor = vCell;
}
`;

export const VELOCITY_FRAGMENT = /* glsl */ `
uniform sampler2D tPos;
uniform sampler2D tVel;
uniform sampler2D tMeta;
uniform sampler2D tGrid;
uniform vec2 uSimSize;
uniform float uDt;
uniform float uTime;
uniform vec4 uSpeciesGoal[${MAX_SPECIES}]; // xyz, swirl
uniform vec4 uPredators[${MAX_PREDATORS}]; // xyz, fear radius
uniform vec4 uPredatorVel[${MAX_PREDATORS}];
uniform int uPredatorCount;
uniform vec4 uAttractor; // xyz, strength
uniform float uAttractorRadius;
uniform vec3 uBoundsMin;
uniform vec3 uBoundsMax;
uniform float uBoundsMargin;
uniform float uSeparationDistance;
uniform float uFovCos;
uniform float uMaxPitch;
uniform float uGoalWeight;
uniform float uObstacleWeight;
uniform float uObstacleRange;
uniform float uPredatorWeight;
uniform float uSpeedMatch;
${SPECIES}
${GRID_COMMON}
${HASH}
${FIELD}

// Unit vector along d with its climb held within the limit.
vec3 limitPitch(vec3 d, vec3 heading) {
  d.xz += heading.xz * 1e-3;
  d.y = clamp(d.y, -uMaxPitch, uMaxPitch);
  d.xz *= sqrt(1.0 - d.y * d.y) / max(length(d.xz), 1e-5);
  return d;
}

void main() {
  ivec2 ic = ivec2(gl_FragCoord.xy);
  vec4 P = texelFetch(tPos, ic, 0);
  vec4 V = texelFetch(tVel, ic, 0);
  vec4 M = texelFetch(tMeta, ic, 0);
  if (M.x < 0.0) {
    gl_FragColor = V;
    return;
  }
  int sp = int(M.x + 0.5);
  vec4 sA = uSpeciesA[sp];
  vec4 sB = uSpeciesB[sp];
  vec4 goal = uSpeciesGoal[sp];
  float size = sA.x * M.y;
  uint id = uint(ic.y) * uint(uSimSize.x) + uint(ic.x);
  vec3 pos = P.xyz;
  float speed = length(V.xyz);
  vec3 heading = speed > 1e-5 ? V.xyz / speed : vec3(0.0, 0.0, 1.0);
  float dt = max(uDt, 1e-4);

  // ── Own movement: a destination that wanders around the school's ──
  float period = mix(7.0, 16.0, M.z);
  float wt = uTime / period + M.w * 10.0;
  uint wk = uint(floor(wt));
  float wf = smoothstep(0.0, 1.0, fract(wt));
  vec3 wander = mix(hash3(id * 7919u + wk), hash3(id * 7919u + wk + 1u), wf) * 2.0 - 1.0;
  wander.y *= 0.45;
  vec3 toDest = goal.xyz + wander * sB.w - pos;
  float dDest = length(toDest);
  // The current heading counts for more than any single urge: steady fish.
  vec3 dir = heading * 1.6;
  float pull = smoothstep(0.0, sB.w, dDest) * (1.0 + 2.0 * smoothstep(sB.w, sB.w * 4.0, dDest));
  dir += toDest / max(dDest, 1e-4) * uGoalWeight * pull;

  // Swirl: circle the goal on a shell instead of crowding its centre.
  if (goal.w > 0.0) {
    vec3 r = pos - goal.xyz;
    float rl = length(r);
    float shell = sB.w * 0.55;
    dir += normalize(vec3(-r.z, 0.0, r.x) + vec3(1e-5, 0.0, 0.0)) * goal.w * 1.6;
    dir += r / max(rl, 1e-4) * goal.w * 1.6 * (1.0 - smoothstep(shell * 0.6, shell, rl));
  }

  // Speed drifts over time, with a short burst now and then.
  float curve = 0.5 * sin(uTime * 0.21 + M.z * 40.0) + 0.5 * sin(uTime * 0.13 + M.w * 17.0);
  float burst = step(fract(uTime / mix(5.0, 13.0, M.w) + M.z), 0.07);
  float wantSpeed = sA.y * (1.0 + 0.2 * curve) * (1.0 + 0.6 * burst);

  // ── Flock: look at the boids registered in the 27 cells around ──
  ivec3 cell = ivec3(floor((pos - uGridMin) / uCell));
  ivec3 gridDim = ivec3(uGridDim);
  float perception2 = uCell * uCell;
  vec3 sep = vec3(0.0);
  vec3 ali = vec3(0.0);
  vec3 coh = vec3(0.0);
  float speedSum = 0.0;
  float mates = 0.0;
  float crowd = 0.0;
  for (int dz = -1; dz <= 1; dz++) {
    for (int dy = -1; dy <= 1; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        ivec3 c = cell + ivec3(dx, dy, dz);
        if (any(lessThan(c, ivec3(0))) || any(greaterThanEqual(c, gridDim))) continue;
        ivec2 base = cellBase(c);
        for (int s = 0; s < ${SLOTS_PER_CELL}; s++) {
          vec4 g = texelFetch(tGrid, base + slotOffset(s), 0);
          if (g.z < 0.5) continue;
          ivec2 nref = ivec2(g.xy);
          if (nref == ic) continue;
          vec3 np = texelFetch(tPos, nref, 0).xyz;
          vec3 d = np - pos;
          float d2 = dot(d, d);
          if (d2 > perception2 || d2 < 1e-10) continue;
          float dist = sqrt(d2);
          vec3 dn = d / dist;
          // Keep clear of your own kind and of anything bigger.
          float space = (size + g.w) * 0.5 * uSeparationDistance;
          if (dist < space && g.w >= size * 0.8) {
            sep -= dn * min(space / dist - 1.0, 4.0);
            crowd += 1.0;
          }
          // Only your own kind, and only those ahead, lead you.
          if (int(g.z + 0.5) - 1 == sp && dot(dn, heading) > uFovCos) {
            vec3 nv = texelFetch(tVel, nref, 0).xyz;
            ali += nv;
            speedSum += length(nv);
            coh += np;
            mates += 1.0;
          }
        }
      }
    }
  }
  vec3 flock = sep * sB.x;
  if (mates > 0.0) {
    flock += normalize(ali + heading * 1e-4) * sB.y;
    vec3 toCentre = coh / mates - pos;
    // Room first: a fish that is already hemmed in does not press closer.
    flock += toCentre / max(length(toCentre), uCell * 0.5) * sB.z * (1.0 - min(1.0, crowd / 3.0));
  }

  // ── Predators: flee, and sidestep out of their path ──
  float panic = 0.0;
  vec3 flee = vec3(0.0);
  for (int i = 0; i < ${MAX_PREDATORS}; i++) {
    if (i >= uPredatorCount) break;
    vec3 d = pos - uPredators[i].xyz;
    float l = length(d);
    float fear = uPredators[i].w + size;
    if (l < fear) {
      float w = 1.0 - l / fear;
      vec3 away = d / max(l, 1e-4);
      vec3 pv = uPredatorVel[i].xyz;
      float pl = length(pv);
      if (pl > 1e-3) {
        pv /= pl;
        vec3 lateral = away - pv * dot(away, pv);
        float ll = length(lateral);
        if (ll > 1e-3) away = normalize(away + lateral / ll * 0.9);
      }
      flee += away * w;
      panic = max(panic, w);
    }
  }

  // ── Obstacles: feel the distance field here and ahead ──
  float body = size * 0.5;
  float range = size * uObstacleRange + speed * 0.35;
  float avoid = 0.0;
  vec3 away = vec3(0.0);
  for (int k = 0; k < 3; k++) {
    float t = float(k) * 0.5;
    vec4 f = fieldAt(pos + heading * range * t);
    float reach = k == 0 ? range * 0.6 : range * 0.5;
    float a = (1.0 - smoothstep(body, body + reach, f.w)) * (k == 0 ? 0.7 : 1.0);
    away += f.xyz * a;
    avoid = max(avoid, a);
  }

  // Soft walls just inside the bounds.
  vec3 lo = (pos - uBoundsMin) / uBoundsMargin;
  vec3 hi = (uBoundsMax - pos) / uBoundsMargin;
  // 0 inside, +1 at the low wall, -1 at the high wall.
  vec3 wall = smoothstep(0.0, 1.0, hi) - smoothstep(0.0, 1.0, lo);

  // The flock is a finishing touch: a fish that must dodge does so alone.
  float alone = clamp(max(avoid, panic), 0.0, 1.0);
  float flockWeight = 1.0 - 0.75 * alone;
  dir += flock * flockWeight;
  dir += flee * uPredatorWeight;
  if (uAttractor.w > 0.0) {
    vec3 d = uAttractor.xyz - pos;
    float l = length(d);
    dir += d / max(l, 1e-4) * uAttractor.w * (1.0 - smoothstep(0.0, uAttractorRadius, l));
  }
  dir += wall * 2.5;
  dir = normalize(dir + heading * 1e-4);

  if (avoid > 0.0) {
    vec3 n = normalize(away + vec3(0.0, 1e-5, 0.0));
    // Drop the part of the intent that points into the surface, then lean away.
    float into = dot(dir, n);
    if (into < 0.0) dir -= n * into * min(1.0, avoid * 1.5);
    // A fish that meets a wall head-on picks a side.
    vec3 side = cross(n, vec3(0.0, 1.0, 0.0));
    dir += side * (M.z > 0.5 ? 0.3 : -0.3) * avoid;
    dir += n * avoid * uObstacleWeight * 0.5;
    dir = normalize(dir + heading * 1e-4);
  }

  // Fish do not swim straight up or down.
  dir = limitPitch(dir, heading);

  // ── Apply: turn and accelerate within the body's limits ──
  float turnRate = sA.w * (1.0 + 1.5 * avoid + 2.5 * panic + 0.5 * burst);
  float angle = acos(clamp(dot(heading, dir), -1.0, 1.0));
  float turn = min(angle * min(1.0, dt * 4.0), turnRate * dt);
  // A half turn mixes through the vertical, so the limit is applied again.
  vec3 newHeading = angle > 1e-4
    ? limitPitch(normalize(mix(heading, dir, turn / angle) + cross(heading, vec3(0.0, 1.0, 0.0)) * 1e-3), heading)
    : dir;

  float target = mix(wantSpeed, sA.z, panic);
  if (mates > 0.0) {
    target = mix(target, speedSum / mates, uSpeedMatch * flockWeight * (1.0 - burst) * (1.0 - panic));
  }
  // Turning takes tail work, and tail work pushes forward.
  float turning = clamp(turn / dt / sA.w, 0.0, 1.5);
  target *= 1.0 + 0.2 * turning;
  float accel = sA.y * mix(1.2, 5.0, max(panic, burst));
  float newSpeed = speed + clamp(target - speed, -sA.y * 0.9 * dt, accel * dt);
  newSpeed = clamp(newSpeed, sA.y * 0.25, sA.z * 1.1);

  // The swim animation follows acceleration, not speed.
  float push = max(0.0, newSpeed - speed) / dt / (sA.y * 1.2);
  float effort = clamp(max(push, turning * 0.5) + 0.15 * newSpeed / sA.y, 0.0, 1.0);
  float intensity = mix(V.w, effort, 1.0 - exp(-dt * 3.5));

  gl_FragColor = vec4(newHeading * newSpeed, intensity);
}
`;

export const POSITION_FRAGMENT = /* glsl */ `
uniform sampler2D tPos;
uniform sampler2D tVel;
uniform sampler2D tMeta;
uniform float uDt;
uniform float uTime;
uniform float uFlow;
uniform vec3 uBoundsMin;
uniform vec3 uBoundsMax;
uniform float uBoundsMargin;
${SPECIES}
${FIELD}

vec3 flowAt(vec3 p, float t) {
  vec3 q = p * 0.07;
  return vec3(
    sin(q.z * 1.7 + t * 0.31) + sin(q.y * 2.3 - t * 0.17),
    0.35 * sin(q.x * 1.9 + t * 0.23),
    sin(q.x * 1.3 - t * 0.27) + sin(q.y * 2.1 + t * 0.19)
  ) * 0.5;
}

void main() {
  ivec2 ic = ivec2(gl_FragCoord.xy);
  vec4 P = texelFetch(tPos, ic, 0);
  vec4 V = texelFetch(tVel, ic, 0);
  vec4 M = texelFetch(tMeta, ic, 0);
  if (M.x < 0.0) {
    gl_FragColor = P;
    return;
  }
  vec4 sA = uSpeciesA[int(M.x + 0.5)];
  float size = sA.x * M.y;
  float body = size * 0.5;
  vec3 pos = P.xyz + V.xyz * uDt;

  // The flow moves the fish without turning it: it reads as swimming against a current.
  vec4 f = fieldAt(pos);
  vec3 lo = (pos - uBoundsMin) / uBoundsMargin;
  vec3 hi = (uBoundsMax - pos) / uBoundsMargin;
  float edge = min(min(min(lo.x, hi.x), min(lo.y, hi.y)), min(lo.z, hi.z));
  vec3 flow = flowAt(pos, uTime) * uFlow;
  flow -= f.xyz * min(0.0, dot(flow, f.xyz)) * (1.0 - smoothstep(body, body + 3.0, f.w));
  pos += flow * smoothstep(0.0, 1.0, edge) * uDt;

  // Last line of defence: nothing ends a step inside a solid.
  f = fieldAt(pos);
  if (f.w < body) pos += f.xyz * (body - f.w);
  pos = clamp(pos, uBoundsMin, uBoundsMax);

  // Tail beats: faster when working harder, slower for bigger bodies.
  float speed = length(V.xyz);
  float beat = (1.1 + 1.6 * speed / sA.y + 3.5 * V.w) / sqrt(max(size, 0.05) / 0.4);
  float phase = mod(P.w + uDt * beat * 2.2, 6.28318530718);

  gl_FragColor = vec4(pos, phase);
}
`;

export const POSE_FRAGMENT = /* glsl */ `
uniform sampler2D tVel;
uniform sampler2D tPose;
uniform sampler2D tMeta;
uniform float uDt;
${SPECIES}

void main() {
  ivec2 ic = ivec2(gl_FragCoord.xy);
  vec4 V = texelFetch(tVel, ic, 0);
  vec4 L = texelFetch(tPose, ic, 0);
  vec4 M = texelFetch(tMeta, ic, 0);
  if (M.x < 0.0) {
    gl_FragColor = L;
    return;
  }
  float size = uSpeciesA[int(M.x + 0.5)].x * M.y;
  float speed = length(V.xyz);
  vec3 heading = speed > 1e-5 ? V.xyz / speed : vec3(0.0, 0.0, 1.0);
  // The tail is where the head was one body length ago, so the lag grows with
  // the body and shrinks with speed. Long fish curl visibly into a turn.
  float tau = clamp(0.6 * size / max(speed, 0.05), 0.08, 2.5);
  vec3 lag = normalize(mix(L.xyz, heading, 1.0 - exp(-uDt / tau)) + heading * 1e-4);
  gl_FragColor = vec4(lag, 1.0);
}
`;

/** Declarations for the fish material's vertex shader. */
export const FISH_VERTEX_PARS = /* glsl */ `
uniform sampler2D tSwarmPos;
uniform sampler2D tSwarmVel;
uniform sampler2D tSwarmPose;
uniform sampler2D tSwarmMeta;
uniform vec4 uFish; // size, swim amplitude, bend, style (0 fish, 1 cetacean, 2 ray)
attribute vec2 aRef;

void swarmYaw(inout vec3 v, float a) {
  float c = cos(a);
  float s = sin(a);
  v.xz = vec2(v.x * c + v.z * s, -v.x * s + v.z * c);
}

// Bend the body behind a pivot along a circular arc, like Blender's bend
// modifier: lengths along the spine stay the same, so nothing stretches.
void swarmBend(inout vec3 p, inout vec3 n, float angle) {
  const float pivot = 0.2;
  float s = max(0.0, pivot - p.z);
  float k = angle / 0.7;
  if (abs(k) < 1e-3 || s <= 0.0) return;
  float phi = k * s;
  float c = cos(phi);
  float sn = sin(phi);
  float x = p.x;
  p.x = -(1.0 - c) / k + x * c;
  p.z = pivot - sn / k - x * sn;
  swarmYaw(n, phi);
}

void swarmFish(inout vec3 p, inout vec3 n) {
  ivec2 ref = ivec2(aRef);
  vec4 P = texelFetch(tSwarmPos, ref, 0);
  vec4 V = texelFetch(tSwarmVel, ref, 0);
  vec4 L = texelFetch(tSwarmPose, ref, 0);
  vec4 M = texelFetch(tSwarmMeta, ref, 0);
  float size = M.x < 0.0 ? 0.0 : uFish.x * M.y;
  float speed = length(V.xyz);
  vec3 fwd = speed > 1e-5 ? V.xyz / speed : vec3(0.0, 0.0, 1.0);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd) + vec3(1e-5, 0.0, 0.0));
  vec3 up = cross(fwd, right);

  // Where the tail still points, seen from the fish.
  float lz = max(dot(L.xyz, fwd), 0.15);
  float yaw = clamp(atan(dot(L.xyz, right), lz), -1.3, 1.3) * uFish.z;
  float pitch = clamp(atan(dot(L.xyz, up), lz), -0.8, 0.8) * uFish.z * 0.6;

  float phase = P.w + M.z * 6.2831853;
  float amp = uFish.y * (0.3 + 0.7 * V.w);
  float along = clamp(0.5 - p.z, 0.0, 1.0); // 0 at the nose, 1 at the tail
  float tail = along * along;

  if (uFish.w > 1.5) {
    // Ray: the wings flap, the wave runs from the body to the tips.
    float wing = abs(p.x);
    p.y += sin(phase - wing * 5.0) * 0.5 * amp * wing * wing * 4.0;
    p.y += sin(phase + 1.0) * 0.02 * amp;
  } else {
    // Whales and dolphins beat up and down: run the fish wave on its side.
    bool vertical = uFish.w > 0.5;
    if (vertical) {
      p.xy = vec2(p.y, -p.x);
      n.xy = vec2(n.y, -n.x);
    }
    // Four simple motions stacked, after the Abzû talk.
    p.x += sin(phase) * 0.025 * amp;
    float sway = sin(phase + 0.5) * 0.07 * amp;
    swarmYaw(p, sway);
    swarmYaw(n, sway);
    float roll = sin(phase + 1.0 - along * 2.2) * 0.1 * amp;
    float rc = cos(roll);
    float rs = sin(roll);
    p.xy = vec2(p.x * rc - p.y * rs, p.x * rs + p.y * rc);
    n.xy = vec2(n.x * rc - n.y * rs, n.x * rs + n.y * rc);
    p.x += sin(phase - along * 3.4) * 0.16 * amp * tail;
    if (vertical) {
      p.xy = vec2(-p.y, p.x);
      n.xy = vec2(-n.y, n.x);
    }
  }

  // Curl into the turn, sideways and a little up and down.
  swarmBend(p, n, yaw);
  p.xy = vec2(p.y, -p.x);
  n.xy = vec2(n.y, -n.x);
  swarmBend(p, n, pitch);
  p.xy = vec2(-p.y, p.x);
  n.xy = vec2(-n.y, n.x);

  // Bank into the turn.
  float bank = clamp(yaw * 0.5, -0.5, 0.5);
  vec3 bankedRight = right * cos(bank) + up * sin(bank);
  vec3 bankedUp = up * cos(bank) - right * sin(bank);

  p = P.xyz + (bankedRight * p.x + bankedUp * p.y + fwd * p.z) * size;
  n = normalize(bankedRight * n.x + bankedUp * n.y + fwd * n.z);
}
`;
