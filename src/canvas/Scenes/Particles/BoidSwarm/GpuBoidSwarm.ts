// Boid swarm simulated on the GPU. State lives in float textures, one texel
// per boid, and never comes back to the CPU: the fish meshes read the same
// textures in their vertex shader. Neighbours come from a uniform grid that is
// rebuilt every step by drawing one point per boid, so the cost grows with
// the number of boids, not its square.

import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Data3DTexture,
  DataTexture,
  DataUtils,
  FloatType,
  HalfFloatType,
  type IUniform,
  LinearFilter,
  Mesh,
  NearestFilter,
  NoBlending,
  OrthographicCamera,
  PlaneGeometry,
  Points,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  type Texture,
  type WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import type { ObstacleField } from "./obstacleField";
import {
  computeGridLayout,
  computeSimLayout,
  createRng,
  DEFAULT_BEHAVIOR,
  type GridLayout,
  MAX_DYNAMIC_OBSTACLES,
  MAX_PREDATORS,
  MAX_SPECIES,
  type SimLayout,
  type SwarmBehavior,
  type SwarmBounds,
  type SwarmSpecies,
  type Vec3,
} from "./swarmConfig";
import {
  COPY_FRAGMENT,
  GRID_FRAGMENT,
  GRID_VERTEX,
  PASS_VERTEX,
  POSE_FRAGMENT,
  POSITION_FRAGMENT,
  VELOCITY_FRAGMENT,
} from "./swarmShaders";

export interface SwarmPredator {
  position: Vec3;
  velocity?: Vec3;
  /** Fish closer than this flee. */
  fearRadius: number;
}

export interface SwarmSphere {
  position: Vec3;
  radius: number;
}

export interface GpuBoidSwarmOptions {
  species: readonly SwarmSpecies[];
  bounds: SwarmBounds;
  field: ObstacleField;
  behavior?: Partial<SwarmBehavior>;
  seed?: number;
}

/** What a fish material reads. The GPU swarm and CPU fish share the shape. */
export interface FishTextureUniforms {
  tSwarmPos: IUniform<Texture | null>;
  tSwarmVel: IUniform<Texture | null>;
  tSwarmPose: IUniform<Texture | null>;
  tSwarmMeta: IUniform<Texture | null>;
}

type Uniforms = Record<string, IUniform>;

export class GpuBoidSwarm {
  readonly species: readonly SwarmSpecies[];
  readonly bounds: SwarmBounds;
  readonly field: ObstacleField;
  readonly layout: SimLayout;
  readonly grid: GridLayout;
  readonly behavior: SwarmBehavior;
  /** Hand these to the fish materials; `step` keeps them pointing at the newest state. */
  readonly renderUniforms: FishTextureUniforms;

  private readonly meta: DataTexture;
  private readonly initial: [DataTexture, DataTexture, DataTexture];
  private readonly pos: [WebGLRenderTarget, WebGLRenderTarget];
  private readonly vel: [WebGLRenderTarget, WebGLRenderTarget];
  private readonly pose: [WebGLRenderTarget, WebGLRenderTarget];
  private readonly gridTarget: WebGLRenderTarget;
  private readonly fieldTexture: Data3DTexture;
  private fieldVersion = -1;

  private readonly speciesA = new Float32Array(MAX_SPECIES * 4);
  private readonly speciesB = new Float32Array(MAX_SPECIES * 4);
  private readonly goals = new Float32Array(MAX_SPECIES * 4);
  private readonly predators = new Float32Array(MAX_PREDATORS * 4);
  private readonly predatorVel = new Float32Array(MAX_PREDATORS * 4);
  private readonly dynSpheres = new Float32Array(MAX_DYNAMIC_OBSTACLES * 4);
  private readonly shared: Uniforms;

  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly passScene = new Scene();
  private readonly quad: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly pointsScene = new Scene();
  private readonly points: Points<BufferGeometry, ShaderMaterial>;
  private readonly copyMaterial: ShaderMaterial;
  private readonly velocityMaterial: ShaderMaterial;
  private readonly positionMaterial: ShaderMaterial;
  private readonly poseMaterial: ShaderMaterial;
  private readonly clearColor = new Color();

  private current = 0;
  private frame = 0;
  private time = 0;
  private seeded = false;

  constructor(options: GpuBoidSwarmOptions) {
    this.species = options.species;
    this.bounds = options.bounds;
    this.field = options.field;
    this.behavior = { ...DEFAULT_BEHAVIOR, ...options.behavior };
    this.layout = computeSimLayout(options.species);
    this.grid = computeGridLayout(options.bounds, this.behavior.perception);

    const { width, height } = this.layout;
    const state = this.createInitialState(options.seed ?? 1);
    this.meta = floatTexture(state.meta, width, height);
    this.initial = [
      floatTexture(state.pos, width, height),
      floatTexture(state.vel, width, height),
      floatTexture(state.pose, width, height),
    ];
    this.pos = [stateTarget(width, height), stateTarget(width, height)];
    this.vel = [stateTarget(width, height), stateTarget(width, height)];
    this.pose = [stateTarget(width, height), stateTarget(width, height)];
    this.gridTarget = stateTarget(this.grid.texWidth, this.grid.texHeight);

    const fieldDim = this.field.dim;
    this.fieldTexture = new Data3DTexture(
      new Uint16Array(this.field.data.length),
      fieldDim[0],
      fieldDim[1],
      fieldDim[2],
    );
    this.fieldTexture.format = RGBAFormat;
    this.fieldTexture.type = HalfFloatType;
    this.fieldTexture.minFilter = LinearFilter;
    this.fieldTexture.magFilter = LinearFilter;
    this.fieldTexture.unpackAlignment = 1;

    for (let i = 0; i < this.species.length; i++) this.writeSpecies(i);

    const b = this.behavior;
    this.shared = {
      tMeta: { value: this.meta },
      tField: { value: this.fieldTexture },
      uSimSize: { value: [width, height] },
      uFieldMin: { value: [...this.field.min] },
      uFieldSize: { value: [...this.field.size] },
      uFieldDim: { value: [...fieldDim] },
      uDynSpheres: { value: this.dynSpheres },
      uDynCount: { value: 0 },
      uGridMin: { value: [...this.bounds.min] },
      uCell: { value: this.grid.cell },
      uGridDim: { value: [...this.grid.dim] },
      uGridTiles: { value: [...this.grid.tiles] },
      uGridTexSize: { value: [this.grid.texWidth, this.grid.texHeight] },
      uSpeciesA: { value: this.speciesA },
      uSpeciesB: { value: this.speciesB },
      uSpeciesGoal: { value: this.goals },
      uPredators: { value: this.predators },
      uPredatorVel: { value: this.predatorVel },
      uPredatorCount: { value: 0 },
      uAttractor: { value: [0, 0, 0, 0] },
      uAttractorRadius: { value: 1 },
      uBoundsMin: { value: [...this.bounds.min] },
      uBoundsMax: { value: [...this.bounds.max] },
      uBoundsMargin: { value: b.boundsMargin },
      uSeparationDistance: { value: b.separationDistance },
      uFovCos: { value: b.fovCos },
      uMaxPitch: { value: b.maxPitch },
      uGoalWeight: { value: b.goalWeight },
      uObstacleWeight: { value: b.obstacleWeight },
      uObstacleRange: { value: b.obstacleRange },
      uPredatorWeight: { value: b.predatorWeight },
      uSpeedMatch: { value: b.speedMatch },
      uFlow: { value: b.flow },
      uDt: { value: 0 },
      uTime: { value: 0 },
      uFrame: { value: 0 },
      tPos: { value: null },
      tVel: { value: null },
      tPose: { value: null },
      tGrid: { value: this.gridTarget.texture },
      tSource: { value: null },
    };

    // Every pass shares the uniform objects, so one write reaches all of them.
    const pass = (fragmentShader: string) =>
      new ShaderMaterial({
        uniforms: this.shared,
        vertexShader: PASS_VERTEX,
        fragmentShader,
        depthTest: false,
        depthWrite: false,
        blending: NoBlending,
      });
    this.copyMaterial = pass(COPY_FRAGMENT);
    this.velocityMaterial = pass(VELOCITY_FRAGMENT);
    this.positionMaterial = pass(POSITION_FRAGMENT);
    this.poseMaterial = pass(POSE_FRAGMENT);

    this.quad = new Mesh(new PlaneGeometry(2, 2), this.copyMaterial);
    this.quad.frustumCulled = false;
    this.passScene.add(this.quad);

    const pointGeometry = new BufferGeometry();
    pointGeometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(this.layout.total * 3), 3),
    );
    this.points = new Points(
      pointGeometry,
      new ShaderMaterial({
        uniforms: this.shared,
        vertexShader: GRID_VERTEX,
        fragmentShader: GRID_FRAGMENT,
        depthTest: false,
        depthWrite: false,
        blending: NoBlending,
      }),
    );
    this.points.frustumCulled = false;
    this.pointsScene.add(this.points);

    this.renderUniforms = {
      tSwarmPos: { value: this.initial[0] },
      tSwarmVel: { value: this.initial[1] },
      tSwarmPose: { value: this.initial[2] },
      tSwarmMeta: { value: this.meta },
    };
  }

  get count(): number {
    return this.layout.total;
  }

  /** Where a species' school is heading. `swirl` > 0 makes it circle the point. */
  setGoal(species: number, x: number, y: number, z: number, swirl = 0): void {
    this.goals.set([x, y, z, swirl], species * 4);
  }

  setPredators(predators: readonly SwarmPredator[]): void {
    const n = Math.min(predators.length, MAX_PREDATORS);
    for (let i = 0; i < n; i++) {
      const p = predators[i];
      this.predators.set([p.position[0], p.position[1], p.position[2], p.fearRadius], i * 4);
      const v = p.velocity ?? [0, 0, 0];
      this.predatorVel.set([v[0], v[1], v[2], 0], i * 4);
    }
    this.shared.uPredatorCount.value = n;
  }

  /** A point the fish are drawn to, or `null` for none. */
  setAttractor(point: { position: Vec3; strength: number; radius: number } | null): void {
    const value = this.shared.uAttractor.value as number[];
    if (!point) {
      value[3] = 0;
      return;
    }
    value[0] = point.position[0];
    value[1] = point.position[1];
    value[2] = point.position[2];
    value[3] = point.strength;
    this.shared.uAttractorRadius.value = point.radius;
  }

  /** Moving solids. Unlike the baked field these cost nothing to change. */
  setDynamicObstacles(spheres: readonly SwarmSphere[]): void {
    const n = Math.min(spheres.length, MAX_DYNAMIC_OBSTACLES);
    for (let i = 0; i < n; i++) {
      const s = spheres[i];
      this.dynSpheres.set([s.position[0], s.position[1], s.position[2], s.radius], i * 4);
    }
    this.shared.uDynCount.value = n;
  }

  /** Perception sets the grid and cannot change after construction. */
  setBehavior(partial: Partial<Omit<SwarmBehavior, "perception">>): void {
    Object.assign(this.behavior, partial);
    const b = this.behavior;
    const u = this.shared;
    u.uBoundsMargin.value = b.boundsMargin;
    u.uSeparationDistance.value = b.separationDistance;
    u.uFovCos.value = b.fovCos;
    u.uMaxPitch.value = b.maxPitch;
    u.uGoalWeight.value = b.goalWeight;
    u.uObstacleWeight.value = b.obstacleWeight;
    u.uObstacleRange.value = b.obstacleRange;
    u.uPredatorWeight.value = b.predatorWeight;
    u.uSpeedMatch.value = b.speedMatch;
    u.uFlow.value = b.flow;
  }

  /** Scale the flock weights of every species, for live tuning. */
  setFlockScale(separation: number, alignment: number, cohesion: number): void {
    for (let i = 0; i < this.species.length; i++) {
      const s = this.species[i];
      this.speciesB[i * 4] = s.separation * separation;
      this.speciesB[i * 4 + 1] = s.alignment * alignment;
      this.speciesB[i * 4 + 2] = s.cohesion * cohesion;
    }
  }

  step(renderer: WebGLRenderer, dt: number): void {
    const u = this.shared;
    const target = renderer.getRenderTarget();
    const autoClear = renderer.autoClear;
    const xr = renderer.xr.enabled;
    const clearAlpha = renderer.getClearAlpha();
    renderer.getClearColor(this.clearColor);
    renderer.xr.enabled = false;
    renderer.autoClear = false;

    if (!this.seeded) {
      this.seeded = true;
      const targets = [this.pos, this.vel, this.pose];
      for (let i = 0; i < 3; i++) {
        u.tSource.value = this.initial[i];
        this.runPass(renderer, this.copyMaterial, targets[i][0]);
        this.runPass(renderer, this.copyMaterial, targets[i][1]);
      }
      u.tSource.value = null;
    }
    this.uploadField();

    const step = Math.min(Math.max(dt, 0), 1 / 20);
    this.time += step;
    this.frame++;
    u.uDt.value = step;
    u.uTime.value = this.time;
    u.uFrame.value = this.frame;

    const from = this.current;
    const to = 1 - from;
    u.tPos.value = this.pos[from].texture;
    u.tVel.value = this.vel[from].texture;
    u.tPose.value = this.pose[from].texture;

    renderer.setRenderTarget(this.gridTarget);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, false, false);
    renderer.render(this.pointsScene, this.camera);

    this.runPass(renderer, this.velocityMaterial, this.vel[to]);
    u.tVel.value = this.vel[to].texture;
    this.runPass(renderer, this.positionMaterial, this.pos[to]);
    this.runPass(renderer, this.poseMaterial, this.pose[to]);
    this.current = to;

    this.renderUniforms.tSwarmPos.value = this.pos[to].texture;
    this.renderUniforms.tSwarmVel.value = this.vel[to].texture;
    this.renderUniforms.tSwarmPose.value = this.pose[to].texture;

    renderer.setRenderTarget(target);
    renderer.setClearColor(this.clearColor, clearAlpha);
    renderer.autoClear = autoClear;
    renderer.xr.enabled = xr;
  }

  /**
   * Reads every boid back, four floats each: position and swim phase,
   * velocity and swim effort, or the lagging heading. Slow, and the simulation
   * never needs it. For tests and diagnostics.
   */
  readState(
    renderer: WebGLRenderer,
    what: "position" | "velocity" | "pose" = "position",
  ): Float32Array {
    const { width, height } = this.layout;
    const out = new Float32Array(width * height * 4);
    const which = what === "position" ? 0 : what === "velocity" ? 1 : 2;
    if (this.seeded) {
      const target = [this.pos, this.vel, this.pose][which][this.current];
      renderer.readRenderTargetPixels(target, 0, 0, width, height, out);
    } else {
      out.set(this.initial[which].image.data as Float32Array);
    }
    return out;
  }

  dispose(): void {
    for (const pair of [this.pos, this.vel, this.pose]) {
      pair[0].dispose();
      pair[1].dispose();
    }
    this.gridTarget.dispose();
    this.fieldTexture.dispose();
    this.meta.dispose();
    for (const t of this.initial) t.dispose();
    for (const m of [
      this.copyMaterial,
      this.velocityMaterial,
      this.positionMaterial,
      this.poseMaterial,
      this.points.material,
    ]) {
      m.dispose();
    }
    this.quad.geometry.dispose();
    this.points.geometry.dispose();
  }

  private runPass(
    renderer: WebGLRenderer,
    material: ShaderMaterial,
    target: WebGLRenderTarget,
  ): void {
    this.quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(this.passScene, this.camera);
  }

  private uploadField(): void {
    if (this.fieldVersion === this.field.version) return;
    this.fieldVersion = this.field.version;
    const source = this.field.data;
    const half = this.fieldTexture.image.data as Uint16Array;
    for (let i = 0; i < source.length; i++) {
      half[i] = DataUtils.toHalfFloat(Math.max(-60000, Math.min(60000, source[i])));
    }
    this.fieldTexture.needsUpdate = true;
  }

  private writeSpecies(i: number): void {
    const s = this.species[i];
    this.speciesA.set([s.size, s.cruiseSpeed, s.maxSpeed, s.turnRate], i * 4);
    this.speciesB.set([s.separation, s.alignment, s.cohesion, s.schoolRadius], i * 4);
  }

  /** Each school starts gathered around its own spot, already under way. */
  private createInitialState(seed: number) {
    const { width, height, starts } = this.layout;
    const texels = width * height;
    const pos = new Float32Array(texels * 4);
    const vel = new Float32Array(texels * 4);
    const pose = new Float32Array(texels * 4);
    const meta = new Float32Array(texels * 4);
    for (let i = 0; i < texels; i++) meta[i * 4] = -1;

    const rng = createRng(seed);
    const { min, max } = this.bounds;
    const sample = { distance: 0, nx: 0, ny: 0, nz: 0 };
    for (let sp = 0; sp < this.species.length; sp++) {
      const s = this.species[sp];
      // A school centre in open water.
      let cx = 0;
      let cy = 0;
      let cz = 0;
      for (let attempt = 0; attempt < 40; attempt++) {
        cx = min[0] + (0.2 + 0.6 * rng()) * (max[0] - min[0]);
        cy = min[1] + (0.35 + 0.4 * rng()) * (max[1] - min[1]);
        cz = min[2] + (0.2 + 0.6 * rng()) * (max[2] - min[2]);
        if (this.field.sample(cx, cy, cz, sample).distance > s.schoolRadius * 0.5) break;
      }
      this.goals.set([cx, cy, cz, 0], sp * 4);
      const swim = rng() * Math.PI * 2;
      for (let i = starts[sp]; i < starts[sp + 1]; i++) {
        let x = cx;
        let y = cy;
        let z = cz;
        for (let attempt = 0; attempt < 12; attempt++) {
          const r = s.schoolRadius * Math.cbrt(rng());
          const theta = rng() * Math.PI * 2;
          const cosPhi = rng() * 2 - 1;
          const sinPhi = Math.sqrt(1 - cosPhi * cosPhi);
          x = clampTo(cx + r * sinPhi * Math.cos(theta), min[0] + 0.5, max[0] - 0.5);
          y = clampTo(cy + r * cosPhi * 0.5, min[1] + 0.5, max[1] - 0.5);
          z = clampTo(cz + r * sinPhi * Math.sin(theta), min[2] + 0.5, max[2] - 0.5);
          if (this.field.sample(x, y, z, sample).distance > s.size) break;
        }
        const angle = swim + (rng() - 0.5) * 0.8;
        const hx = Math.cos(angle);
        const hz = Math.sin(angle);
        const o = i * 4;
        pos.set([x, y, z, rng() * Math.PI * 2], o);
        vel.set([hx * s.cruiseSpeed, 0, hz * s.cruiseSpeed, 0.3], o);
        pose.set([hx, 0, hz, 1], o);
        meta.set([sp, 0.8 + 0.4 * rng(), rng(), rng()], o);
      }
    }
    return { pos, vel, pose, meta };
  }
}

function clampTo(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function floatTexture(data: Float32Array, width: number, height: number): DataTexture {
  const texture = new DataTexture(data, width, height, RGBAFormat, FloatType);
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

function stateTarget(width: number, height: number): WebGLRenderTarget {
  return new WebGLRenderTarget(width, height, {
    format: RGBAFormat,
    type: FloatType,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    depthBuffer: false,
    stencilBuffer: false,
  });
}
