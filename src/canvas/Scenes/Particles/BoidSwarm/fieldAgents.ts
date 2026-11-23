// A handful of agents steered on the CPU with the same rules as the swarm:
// pick a destination in open water, swim to it, feel the obstacle field ahead.
// School leaders (the point a species gathers around) and predators are
// agents. The swarm itself never leaves the GPU, so anything the CPU must know
// a position of lives here.

import type { FieldSample, ObstacleField } from "./obstacleField";
import type { SwarmBounds } from "./swarmConfig";

export interface AgentConfig {
  /** Body length, or for a leader the room its school needs. */
  size: number;
  cruiseSpeed: number;
  turnRate: number;
  /** Keep destinations this far from any surface. */
  clearance: number;
  maxPitch?: number;
}

export interface FieldAgent {
  config: AgentConfig;
  position: [number, number, number];
  heading: [number, number, number];
  /** Heading that trails behind, for the bend of the body. */
  lag: [number, number, number];
  speed: number;
  phase: number;
  intensity: number;
  destination: [number, number, number];
  /** Seconds until the agent picks a new destination anyway. */
  patience: number;
}

const scratch: FieldSample = { distance: 0, nx: 0, ny: 0, nz: 0 };

export function createAgent(
  config: AgentConfig,
  field: ObstacleField,
  bounds: SwarmBounds,
  rng: () => number,
): FieldAgent {
  const agent: FieldAgent = {
    config,
    position: [0, 0, 0],
    heading: [1, 0, 0],
    lag: [1, 0, 0],
    speed: config.cruiseSpeed,
    phase: rng() * Math.PI * 2,
    intensity: 0.3,
    destination: [0, 0, 0],
    patience: 0,
  };
  pickOpenWater(agent.position, config.clearance, field, bounds, rng);
  const angle = rng() * Math.PI * 2;
  agent.heading = [Math.cos(angle), 0, Math.sin(angle)];
  agent.lag = [...agent.heading];
  retarget(agent, field, bounds, rng);
  return agent;
}

/** Writes a random point with `clearance` of open water around it. */
export function pickOpenWater(
  out: [number, number, number],
  clearance: number,
  field: ObstacleField,
  bounds: SwarmBounds,
  rng: () => number,
): void {
  const { min, max } = bounds;
  let best = Number.NEGATIVE_INFINITY;
  for (let attempt = 0; attempt < 24; attempt++) {
    const x = min[0] + (0.12 + 0.76 * rng()) * (max[0] - min[0]);
    const y = min[1] + (0.25 + 0.55 * rng()) * (max[1] - min[1]);
    const z = min[2] + (0.12 + 0.76 * rng()) * (max[2] - min[2]);
    const d = field.sample(x, y, z, scratch).distance;
    if (d > best) {
      best = d;
      out[0] = x;
      out[1] = y;
      out[2] = z;
    }
    if (d >= clearance) return;
  }
}

export function retarget(
  agent: FieldAgent,
  field: ObstacleField,
  bounds: SwarmBounds,
  rng: () => number,
  towards?: readonly [number, number, number],
): void {
  if (towards) {
    agent.destination = [towards[0], towards[1], towards[2]];
  } else {
    pickOpenWater(agent.destination, agent.config.clearance, field, bounds, rng);
  }
  agent.patience = 10 + 14 * rng();
}

/** Advances one agent. Returns true when it wants a new destination. */
export function stepAgent(
  agent: FieldAgent,
  field: ObstacleField,
  bounds: SwarmBounds,
  dt: number,
): boolean {
  const { config, position: p, heading: h, destination } = agent;
  const maxPitch = config.maxPitch ?? 0.4;

  let dx = destination[0] - p[0];
  let dy = destination[1] - p[1];
  let dz = destination[2] - p[2];
  const toDestination = Math.hypot(dx, dy, dz);
  const inv = 1 / Math.max(toDestination, 1e-4);
  dx = h[0] + dx * inv * 1.2;
  dy = h[1] + dy * inv * 1.2;
  dz = h[2] + dz * inv * 1.2;

  // Feel the field at the nose and ahead.
  const body = config.size * 0.5;
  const range = config.size * 2 + agent.speed * 0.6;
  let avoid = 0;
  let ax = 0;
  let ay = 0;
  let az = 0;
  for (let k = 0; k < 3; k++) {
    const t = k * 0.5 * range;
    field.sample(p[0] + h[0] * t, p[1] + h[1] * t, p[2] + h[2] * t, scratch);
    const reach = k === 0 ? range * 0.6 : range * 0.5;
    const a = (1 - smoothstep(body, body + reach, scratch.distance)) * (k === 0 ? 0.7 : 1);
    ax += scratch.nx * a;
    ay += scratch.ny * a;
    az += scratch.nz * a;
    if (a > avoid) avoid = a;
  }

  // Soft walls inside the bounds.
  const margin = Math.max(3, config.size * 1.5);
  for (let a = 0; a < 3; a++) {
    const lo = smoothstep(0, 1, (p[a] - bounds.min[a]) / margin);
    const hi = smoothstep(0, 1, (bounds.max[a] - p[a]) / margin);
    const push = (hi - lo) * 2.5;
    if (a === 0) dx += push;
    else if (a === 1) dy += push;
    else dz += push;
  }

  let len = Math.hypot(dx, dy, dz) || 1;
  dx /= len;
  dy /= len;
  dz /= len;
  if (avoid > 0) {
    const al = Math.hypot(ax, ay, az) || 1;
    ax /= al;
    ay /= al;
    az /= al;
    const into = dx * ax + dy * ay + dz * az;
    if (into < 0) {
      const k = into * Math.min(1, avoid * 1.5);
      dx -= ax * k;
      dy -= ay * k;
      dz -= az * k;
    }
    // Pick a side when meeting a wall head-on: cross(n, up).
    dx += -az * 0.3 * avoid + ax * avoid * 1.2;
    dy += ay * avoid * 1.2;
    dz += ax * 0.3 * avoid + az * avoid * 1.2;
  }
  dx += h[0] * 1e-3;
  dz += h[2] * 1e-3;
  len = Math.hypot(dx, dy, dz) || 1;
  dy = Math.max(-maxPitch, Math.min(maxPitch, dy / len));
  const flat = Math.hypot(dx, dz) || 1;
  const keep = Math.sqrt(1 - dy * dy) / flat;
  dx *= keep;
  dz *= keep;

  // Turn within the body's limit.
  const dot = Math.max(-1, Math.min(1, h[0] * dx + h[1] * dy + h[2] * dz));
  const angle = Math.acos(dot);
  const turn = Math.min(angle * Math.min(1, dt * 5), config.turnRate * (1 + 1.5 * avoid) * dt);
  if (angle > 1e-4) {
    const t = turn / angle;
    const nx = h[0] + (dx - h[0]) * t - h[2] * 1e-4;
    const ny = h[1] + (dy - h[1]) * t;
    const nz = h[2] + (dz - h[2]) * t + h[0] * 1e-4;
    const nl = Math.hypot(nx, ny, nz) || 1;
    h[0] = nx / nl;
    h[1] = ny / nl;
    h[2] = nz / nl;
  }

  const turning = Math.min(1.5, turn / Math.max(dt, 1e-4) / config.turnRate);
  const target = config.cruiseSpeed * (1 + 0.2 * turning);
  const before = agent.speed;
  agent.speed += Math.max(
    -config.cruiseSpeed * dt,
    Math.min(config.cruiseSpeed * dt, target - before),
  );
  const push = Math.max(0, agent.speed - before) / Math.max(dt, 1e-4) / (config.cruiseSpeed * 1.2);
  const effort = Math.min(1, Math.max(push, turning * 0.8) + 0.25);
  agent.intensity += (effort - agent.intensity) * (1 - Math.exp(-dt * 3.5));

  p[0] += h[0] * agent.speed * dt;
  p[1] += h[1] * agent.speed * dt;
  p[2] += h[2] * agent.speed * dt;
  field.sample(p[0], p[1], p[2], scratch);
  if (scratch.distance < body) {
    const out = body - scratch.distance;
    p[0] += scratch.nx * out;
    p[1] += scratch.ny * out;
    p[2] += scratch.nz * out;
  }
  for (let a = 0; a < 3; a++) {
    p[a] = Math.max(bounds.min[a], Math.min(bounds.max[a], p[a]));
  }

  const tau = Math.max(0.08, Math.min(2.5, (0.6 * config.size) / Math.max(agent.speed, 0.05)));
  const follow = 1 - Math.exp(-dt / tau);
  const lag = agent.lag;
  lag[0] += (h[0] - lag[0]) * follow;
  lag[1] += (h[1] - lag[1]) * follow;
  lag[2] += (h[2] - lag[2]) * follow;
  const ll = Math.hypot(lag[0], lag[1], lag[2]) || 1;
  lag[0] /= ll;
  lag[1] /= ll;
  lag[2] /= ll;

  const beat =
    (1.1 + (1.6 * agent.speed) / config.cruiseSpeed + 3.5 * agent.intensity) /
    Math.sqrt(Math.max(config.size, 0.05) / 0.4);
  agent.phase = (agent.phase + dt * beat * 2.2) % (Math.PI * 2);

  agent.patience -= dt;
  return agent.patience <= 0 || toDestination < Math.max(config.size, config.clearance * 0.6);
}

function smoothstep(lo: number, hi: number, v: number): number {
  const t = Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
}

/**
 * Packs agents into the four float arrays the fish material reads, in the
 * same layout as the swarm's state textures: one RGBA texel per agent.
 */
export function writeAgentState(
  agents: readonly FieldAgent[],
  pos: Float32Array,
  vel: Float32Array,
  pose: Float32Array,
): void {
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    const o = i * 4;
    pos[o] = a.position[0];
    pos[o + 1] = a.position[1];
    pos[o + 2] = a.position[2];
    pos[o + 3] = a.phase;
    vel[o] = a.heading[0] * a.speed;
    vel[o + 1] = a.heading[1] * a.speed;
    vel[o + 2] = a.heading[2] * a.speed;
    vel[o + 3] = a.intensity;
    pose[o] = a.lag[0];
    pose[o + 1] = a.lag[1];
    pose[o + 2] = a.lag[2];
    pose[o + 3] = 1;
  }
}
