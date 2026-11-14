import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { HolidayAudioEngine } from './audio';
import { buildCityLevel } from './cities';
import {
  COSMETICS,
  calculateLevelSummary,
  canDeliverToHouse,
  createEmptyPowerUps,
  getFakeCookiePenalty,
  getGearBonuses,
  getPowerUpInfo,
  getTrapPadState,
  isPortalUnlocked,
  moveWithWallCollision,
} from './rules';
import {
  MaterialPaletteCache,
  createChimneyPadModel,
  createCityLandmarkModel,
  createCookieModel,
  createDeliveryHouseModel,
  createElfModel,
  createGoldenPresentModel,
  createHazardModel,
  createHidingSpotModel,
  createKeyModel,
  createLaserBarrierModel,
  createLauncherModel,
  createPortalModel,
  createPowerUpModel,
  createReindeerModel,
  createResourceTracker,
  createSantaModel,
  createSecurityCameraModel,
  createStealthEnemyModel,
  createSwitchModel,
  createTrapPadModel,
} from './threeModels';
import {
  calculateStepNoise,
  computeGridNextWaypoint,
  computeSuspicionDelta,
  computeTrapPursuitStep,
  distancePointToSegment,
  findNearestPatrolIndex,
  getSurfaceLabel,
  isLaserBarrierActive,
  isPointInVisionCone,
  isTargetTouchedByTrackingLight,
  shouldLoseTrack,
} from './stealth';
import {
  CameraViewMode,
  get3dRenderRangeConfig,
  isWithinRenderRange,
  wrapSnowflakeCoord,
} from './renderRange';
import { CONFETTI_COLORS } from './confetti';
import {
  ActivePowerUps,
  DecoySnowball,
  Difficulty,
  HudSnapshot,
  LevelInstance,
  LevelScoreSummary,
  MiniMapSnapshot,
  MissionEvent,
  PlayerProgress,
  SantaStance,
  SnowballProjectile,
  StealthAbilitiesState,
  StealthAbilityId,
} from './types';

export interface EngineCallbacks {
  onHudUpdate: (hud: HudSnapshot) => void;
  onLevelComplete: (summary: LevelScoreSummary) => void;
  onPauseRequested: () => void;
  onMissionEvent?: (event: MissionEvent) => void;
}

interface BurstParticle3D {
  active: boolean;
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

interface FloatingLabel3D {
  active: boolean;
  el: HTMLDivElement;
  wx: number;
  wy: number;
  wz: number;
  life: number;
  maxLife: number;
}

const BURST_POOL_SIZE = 72;
const LABEL_POOL_SIZE = 14;
const PROJECTILE_POOL_SIZE = 18;

export class SantaMazeEngine3D {
  private mountEl: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private pmremGenerator: THREE.PMREMGenerator;
  private envRenderTarget: THREE.WebGLRenderTarget;
  private isSoftwareGl: boolean;
  private isCompactViewport = false;

  private audio: HolidayAudioEngine;
  private callbacks: EngineCallbacks;
  private level: LevelInstance;
  private progress: PlayerProgress;

  private res: MaterialPaletteCache;
  private levelGroup: THREE.Group;
  private labelOverlayEl: HTMLDivElement;
  private sunLight: THREE.DirectionalLight | null = null;
  private landmarkGroup: THREE.Group | null = null;
  private chimneyMeshes: Array<{ x: number; z: number; mesh: THREE.Group }> = [];

  // Dynamic actor / prop refs
  private santaGroup!: THREE.Group;
  private reindeerGroup!: THREE.Group;
  private helperElfGroup!: THREE.Group;
  private mysteryElfGroup: THREE.Group | null = null;
  private portalGroup!: THREE.Group;
  private goldenPresentGroup: THREE.Group | null = null;
  private compassArrow!: THREE.Mesh;

  private cookieMeshes = new Map<string, THREE.Group>();
  private houseMeshes = new Map<string, THREE.Group>();
  private keyMeshes = new Map<string, THREE.Group>();
  private switchMeshes = new Map<string, THREE.Group>();
  private powerUpMeshes = new Map<string, THREE.Group>();
  private hazardMeshes = new Map<string, THREE.Group>();
  private trapPadMeshes = new Map<string, THREE.Group>();
  private launcherMeshes = new Map<string, THREE.Group>();
  private secretWallMeshes = new Map<string, THREE.Mesh>();
  private hidingSpotMeshes = new Map<string, THREE.Group>();
  private stealthEnemyMeshes = new Map<string, THREE.Group>();
  private securityCameraMeshes = new Map<string, THREE.Group>();
  private laserBarrierMeshes = new Map<string, THREE.Group>();
  private teleportPortalMeshes = new Map<string, THREE.Group>();
  private teleportCooldown = 0;
  private cameraMode: CameraViewMode = 'slightly_3d';
  private currentCamHeight = 11.2;
  private currentCamZOffset = 2.6;
  private currentCamLookAtY = 0.16;
  private currentCamLookAtZOffset = 0.35;

  private decoySnowball!: DecoySnowball & { mesh: THREE.Mesh };
  private projectiles: Array<SnowballProjectile & { mesh: THREE.Mesh }> = [];
  private burstParticles: BurstParticle3D[] = [];
  private burstCursor = 0;
  private labels: FloatingLabel3D[] = [];
  private labelCursor = 0;

  private snowTexture: THREE.CanvasTexture | null = null;
  private weatherPoints: THREE.Points | null = null;
  private weatherVelocities: Float32Array = new Float32Array(0);
  private weatherDriftPhases: Float32Array = new Float32Array(0);
  private snowCount = 180;
  private snowBoxHalfX = 12;
  private snowBoxHalfZ = 11;

  // Simulation loop state
  private running = false;
  private paused = false;
  private finished = false;
  private rafId: number | null = null;
  private syncTimerId: number | null = null;
  private lastTs = 0;
  private animTime = 0;

  // Santa actor state (tile coordinates: x -> world X, y -> world Z)
  private santaX = 2.5;
  private santaY = 2.5;
  private santaDirX = 0;
  private santaDirY = 1;
  private santaYaw = 0;
  private santaWalkDist = 0;
  private santaRadius = 0.31;
  private santaSquash = 1;
  private slowTimer = 0;
  private slowFactor = 1;
  private invulnTimer = 0;
  private dashTimer = 0;
  private dashCooldown = 0;
  private hitstopTimer = 0;
  private shakeTrauma = 0;

  private reindeerX = 2.0;
  private reindeerY = 2.5;
  private helperElfX = 2.5;
  private helperElfY = 2.5;

  // Camera state
  private camTargetX = 2.5;
  private camTargetZ = 2.5;

  // Input state
  private keys = new Set<string>();
  private joyX = 0;
  private joyY = 0;
  private actionQueued = false;
  private dashQueued = false;
  private hideQueued = false;
  private decoyQueued = false;

  // Stealth state
  private sneakToggled = false;
  private isHiding = false;
  private hideGraceTimer = 0;
  private activeHidingSpotId: string | null = null;
  private noiseLevel = 0;
  private suspicionLevel = 0;
  private wasChased = false;
  private stance: SantaStance = 'walk';
  private stealthAbilities: StealthAbilitiesState = {
    disguiseActive: 0,
    disguiseCooldown: 0,
    silentBootsActive: 0,
    silentBootsCooldown: 0,
    elfSmokeActive: 0,
    elfSmokeCooldown: 0,
    decoyCooldown: 0,
  };
  private cameraSuspicion = 0;
  private enemyHitCooldown = new Map<string, number>();

  // Gameplay counters
  private hearts = 3;
  private maxHearts = 3;
  private trailSpawnTimer = 0;
  private realCookiesCollected = 0;
  private deliveriesDone = 0;
  private heldKeys = new Set<string>();
  private heldGateKeys = new Set<string>();
  private missionClearedInLevel = false;
  private gateDoorOpenRatio = 0;
  private score = 0;
  private trapsTriggered = 0;
  private secretRoomsFound = 0;
  private secretRoomDiscovered = false;
  private goldenPresentFound = false;
  private elfHelped = false;
  private niceMeter = 85;
  private elapsedSeconds = 0;
  private countdownRemaining: number | null = null;
  private portalUnlocked = false;
  private activePowerUps: ActivePowerUps = createEmptyPowerUps();
  private statusBanner: string | null = null;
  private statusBannerTimer = 0;
  private elfClue: string | null = null;
  private elfClueTimer = 0;
  private hudSyncTimer = 0;

  private resizeObserver: ResizeObserver;
  private tempVec3 = new THREE.Vector3();

  constructor(
    mountEl: HTMLElement,
    progress: PlayerProgress,
    cityIndex: number,
    difficulty: Difficulty,
    audio: HolidayAudioEngine,
    callbacks: EngineCallbacks
  ) {
    this.mountEl = mountEl;
    this.progress = progress;
    this.audio = audio;
    this.callbacks = callbacks;

    this.isSoftwareGl = this.detectSoftwareWebGL();
    const width = Math.max(1, mountEl.clientWidth || window.innerWidth);
    const height = Math.max(1, mountEl.clientHeight || window.innerHeight);
    this.isCompactViewport = Math.min(width, height) < 768;
    const rangeCfg = get3dRenderRangeConfig(this.cameraMode, this.isCompactViewport);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && !this.isCompactViewport,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, rangeCfg.maxPixelRatio)
    );
    this.renderer.setSize(width, height);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.dataset.testid = 'game-canvas';
    this.renderer.domElement.className = 'block w-full h-full outline-none';
    this.mountEl.prepend(this.renderer.domElement);

    // Floating 3D-projected label overlay container
    this.labelOverlayEl = document.createElement('div');
    this.labelOverlayEl.className = 'absolute inset-0 pointer-events-none overflow-hidden z-10';
    this.mountEl.appendChild(this.labelOverlayEl);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, rangeCfg.farPlane);

    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envRenderTarget = this.pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRenderTarget.texture;

    this.snowTexture = this.createSnowflakeTexture();
    this.res = createResourceTracker();
    this.levelGroup = new THREE.Group();
    this.scene.add(this.levelGroup);

    this.initPools();

    this.level = buildCityLevel(cityIndex, difficulty);
    this.buildLevelScene();
    this.resetLevelState();

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.mountEl);
  }

  private createSnowflakeTexture(): THREE.CanvasTexture | null {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.35, 'rgba(224, 242, 254, 0.95)');
    grad.addColorStop(0.68, 'rgba(125, 211, 252, 0.58)');
    grad.addColorStop(1, 'rgba(125, 211, 252, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();

    // Subtle 6-arm crystalline glint inside snowflake sprite
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI) / 3;
      const dx = Math.cos(a) * 16;
      const dy = Math.sin(a) * 16;
      ctx.beginPath();
      ctx.moveTo(32 - dx, 32 - dy);
      ctx.lineTo(32 + dx, 32 + dy);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private applyRenderRangeSettings() {
    const cfg = get3dRenderRangeConfig(this.cameraMode, this.isCompactViewport);
    if (Math.abs(this.camera.far - cfg.farPlane) > 0.05) {
      this.camera.far = cfg.farPlane;
      this.camera.updateProjectionMatrix();
    }
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.near = cfg.fogNear;
      this.scene.fog.far = cfg.fogFar;
    }
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, cfg.maxPixelRatio)
    );
    this.snowBoxHalfX = cfg.snowBoxHalfX;
    this.snowBoxHalfZ = cfg.snowBoxHalfZ;
    if (this.sunLight && !this.isSoftwareGl) {
      const d = cfg.shadowFrustumHalfSize;
      const cam = this.sunLight.shadow.camera;
      if (Math.abs(cam.right - d) > 0.1) {
        cam.left = -d;
        cam.right = d;
        cam.top = d;
        cam.bottom = -d;
        cam.updateProjectionMatrix();
      }
    }
  }

  private detectSoftwareWebGL(): boolean {
    try {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2') || probe.getContext('webgl');
      if (!gl) return true;
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const rendererName = dbg
        ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL))
        : String(gl.getParameter(gl.RENDERER));
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererName);
    } catch {
      return false;
    }
  }

  private handleResize() {
    if (!this.mountEl) return;
    const width = Math.max(1, this.mountEl.clientWidth || window.innerWidth);
    const height = Math.max(1, this.mountEl.clientHeight || window.innerHeight);
    this.isCompactViewport = Math.min(width, height) < 768;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.applyRenderRangeSettings();
    this.renderer.setSize(width, height);
  }

  private initPools() {
    const burstGeo = new THREE.SphereGeometry(0.085, 5, 4);
    for (let i = 0; i < BURST_POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const mesh = new THREE.Mesh(burstGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.burstParticles.push({
        active: false,
        mesh,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
      });
    }

    const projGeo = new THREE.SphereGeometry(0.22, 6, 5);
    const projMat = new THREE.MeshStandardMaterial({
      color: '#e0f2fe',
      emissive: '#38bdf8',
      emissiveIntensity: 0.45,
      roughness: 0.35,
    });
    for (let i = 0; i < PROJECTILE_POOL_SIZE; i++) {
      const mesh = new THREE.Mesh(projGeo, projMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.projectiles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        mesh,
      });
    }

    const decoyMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 6, 5),
      new THREE.MeshStandardMaterial({
        color: '#fde047',
        emissive: '#fbbf24',
        emissiveIntensity: 0.75,
        roughness: 0.25,
      })
    );
    decoyMesh.visible = false;
    this.scene.add(decoyMesh);
    this.decoySnowball = {
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      z: 0,
      vz: 0,
      mesh: decoyMesh,
    };

    for (let i = 0; i < LABEL_POOL_SIZE; i++) {
      const el = document.createElement('div');
      el.className =
        'absolute font-extrabold text-xs sm:text-sm tracking-wide whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] select-none';
      el.style.display = 'none';
      el.style.transform = 'translate(-50%, -50%)';
      this.labelOverlayEl.appendChild(el);
      this.labels.push({
        active: false,
        el,
        wx: 0,
        wy: 0,
        wz: 0,
        life: 0,
        maxLife: 1,
      });
    }
  }

  private clearLevelScene() {
    this.scene.remove(this.levelGroup);
    this.levelGroup = new THREE.Group();
    this.scene.add(this.levelGroup);

    if (this.weatherPoints) {
      this.scene.remove(this.weatherPoints);
      this.weatherPoints.geometry.dispose();
      (this.weatherPoints.material as THREE.Material).dispose();
      this.weatherPoints = null;
    }

    this.res.disposeAll();
    this.res = createResourceTracker();

    this.cookieMeshes.clear();
    this.houseMeshes.clear();
    this.keyMeshes.clear();
    this.switchMeshes.clear();
    this.powerUpMeshes.clear();
    this.hazardMeshes.clear();
    this.trapPadMeshes.clear();
    this.launcherMeshes.clear();
    this.secretWallMeshes.clear();
    this.hidingSpotMeshes.clear();
    this.stealthEnemyMeshes.clear();
    this.securityCameraMeshes.clear();
    this.laserBarrierMeshes.clear();
    this.teleportPortalMeshes.clear();
    this.mysteryElfGroup = null;
    this.goldenPresentGroup = null;
    this.sunLight = null;
    this.landmarkGroup = null;
    this.chimneyMeshes = [];
  }

  private buildLevelScene() {
    this.clearLevelScene();

    const rangeCfg = get3dRenderRangeConfig(this.cameraMode, this.isCompactViewport);
    const pal = this.level.city.palette;
    const bgCol = new THREE.Color(pal.skyBottom);
    this.scene.background = bgCol;
    this.scene.fog = new THREE.Fog(bgCol.getHex(), rangeCfg.fogNear, rangeCfg.fogFar);

    // Three-point + Hemisphere Outdoor Lighting (warm storybook daylight)
    const hemi = new THREE.HemisphereLight('#c7dfff', pal.floorSecondary, 0.95);
    this.levelGroup.add(hemi);

    const sun = new THREE.DirectionalLight('#fff5dc', 1.75);
    const spawnCx = this.level.spawn.x + 0.5;
    const spawnCz = this.level.spawn.y + 0.5;
    sun.position.set(spawnCx + 8, 18, spawnCz + 10);
    sun.target.position.set(spawnCx, 0, spawnCz);
    if (!this.isSoftwareGl) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(rangeCfg.shadowMapSize, rangeCfg.shadowMapSize);
      sun.shadow.camera.near = 2;
      sun.shadow.camera.far = 38;
      const d = rangeCfg.shadowFrustumHalfSize;
      sun.shadow.camera.left = -d;
      sun.shadow.camera.right = d;
      sun.shadow.camera.top = d;
      sun.shadow.camera.bottom = -d;
      sun.shadow.bias = -0.0008;
    }
    this.sunLight = sun;
    this.levelGroup.add(sun, sun.target);

    const rim = new THREE.DirectionalLight('#60a5fa', 0.45);
    rim.position.set(-10, 10, -10);
    this.levelGroup.add(rim);

    // Compact outer terrain apron clipped within minimized 3D range
    const outerGround = new THREE.Mesh(
      this.res.trackGeometry(new THREE.PlaneGeometry(this.level.cols + 22, this.level.rows + 22)),
      this.res.getStandard(pal.skyTop, { roughness: 0.95, metalness: 0.0 })
    );
    outerGround.rotation.x = -Math.PI / 2;
    outerGround.position.set(this.level.cols * 0.5, -0.08, this.level.rows * 0.5);
    outerGround.receiveShadow = false;
    this.levelGroup.add(outerGround);

    // Instanced Floor Tiles
    const floorPositions: Array<{ x: number; z: number; color: string; rough: number }> = [];
    const wallPositions: Array<{ x: number; z: number }> = [];
    const bulbPositions: Array<{ x: number; z: number; color: string }> = [];

    const baseEvenCol = new THREE.Color(pal.floorPrimary);
    const baseOddCol = new THREE.Color(pal.floorSecondary);
    const blendFloorColor = (hex: string, amount: number, isEven: boolean) =>
      '#' + new THREE.Color(hex).lerp(isEven ? baseEvenCol : baseOddCol, amount).getHexString();

    for (let r = 0; r < this.level.rows; r++) {
      for (let c = 0; c < this.level.cols; c++) {
        const tile = this.level.grid[r][c];
        if (tile === 'wall') {
          wallPositions.push({ x: c + 0.5, z: r + 0.5 });
          if ((r + c) % 6 === 0) {
            bulbPositions.push({
              x: c + 0.5,
              z: r + 0.5,
              color: '#ebe2c9',
            });
          }
        } else if (tile === 'secret_wall') {
          const swMesh = new THREE.Mesh(
            this.res.trackGeometry(new THREE.BoxGeometry(0.98, 0.95, 0.98)),
            this.res.getStandard('#d97706', {
              roughness: 0.6,
              metalness: 0.2,
              emissive: '#fbbf24',
              emissiveIntensity: 0.25,
            })
          );
          swMesh.position.set(c + 0.5, 0.475, r + 0.5);
          swMesh.castShadow = true;
          this.levelGroup.add(swMesh);
          this.secretWallMeshes.set(`${c},${r}`, swMesh);
        } else {
          const isEven = (r + c) % 2 === 0;
          let color = isEven ? pal.floorPrimary : pal.floorSecondary;
          let rough = 0.85;
          if (tile === 'ice') {
            color = blendFloorColor('#7dd3fc', 0.45, isEven);
            rough = 0.18;
          } else if (tile === 'carpet') {
            color = blendFloorColor(isEven ? '#991b1b' : '#b91c1c', 0.45, isEven);
            rough = 0.92;
          } else if (tile === 'wood') {
            color = blendFloorColor(isEven ? '#92400e' : '#78350f', 0.45, isEven);
            rough = 0.72;
          } else if (tile === 'shadow') {
            color = isEven ? '#1e293b' : '#0f172a';
            rough = 0.95;
          } else if (tile === 'toy_floor') {
            color = blendFloorColor(isEven ? '#f472b6' : '#facc15', 0.45, isEven);
            rough = 0.65;
          } else if (tile === 'metal') {
            color = blendFloorColor(isEven ? '#94a3b8' : '#64748b', 0.35, isEven);
            rough = 0.38;
          } else if (tile === 'secret_floor') {
            color = blendFloorColor(isEven ? '#fef3c7' : '#fde68a', 0.4, isEven);
            rough = 0.55;
          }
          floorPositions.push({ x: c + 0.5, z: r + 0.5, color, rough });
        }
      }
    }

    const tileGeo = this.res.trackGeometry(new THREE.BoxGeometry(1.0, 0.12, 1.0));
    const floorMat = this.res.getStandard('#ffffff', { roughness: 0.72, metalness: 0.05 });
    const floorInst = new THREE.InstancedMesh(tileGeo, floorMat, floorPositions.length);
    floorInst.receiveShadow = true;
    const dummy = new THREE.Object3D();
    const tmpCol = new THREE.Color();
    floorPositions.forEach((fp, idx) => {
      dummy.position.set(fp.x, -0.06, fp.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      floorInst.setMatrixAt(idx, dummy.matrix);
      floorInst.setColorAt(idx, tmpCol.set(fp.color));
    });
    floorInst.instanceMatrix.needsUpdate = true;
    if (floorInst.instanceColor) floorInst.instanceColor.needsUpdate = true;
    this.levelGroup.add(floorInst);

    // Instanced Maze Walls (Toy Village Blocks + Festive Trim Band + Snowy Roof Cap)
    if (wallPositions.length > 0) {
      const wallGeo = this.res.trackGeometry(new THREE.BoxGeometry(0.96, 0.94, 0.96));
      const wallMat = this.res.getStandard(pal.wallFront, { roughness: 0.72, metalness: 0.06 });
      const wallInst = new THREE.InstancedMesh(wallGeo, wallMat, wallPositions.length);
      wallInst.castShadow = true;
      wallInst.receiveShadow = true;

      const trimGeo = this.res.trackGeometry(new THREE.BoxGeometry(1.01, 0.1, 1.01));
      const trimMat = this.res.getStandard(pal.wallTrim, { roughness: 0.55, metalness: 0.08 });
      const trimInst = new THREE.InstancedMesh(trimGeo, trimMat, wallPositions.length);

      const capGeo = this.res.trackGeometry(new THREE.BoxGeometry(1.05, 0.16, 1.05));
      const capMat = this.res.getStandard(pal.wallTop, { roughness: 0.65, metalness: 0.04 });
      const capInst = new THREE.InstancedMesh(capGeo, capMat, wallPositions.length);
      capInst.receiveShadow = true;

      wallPositions.forEach((wp, idx) => {
        const hScale = 0.94 + ((Math.round(wp.x * 7 + wp.z * 13) % 3) * 0.06);
        dummy.position.set(wp.x, 0.47 * hScale, wp.z);
        dummy.scale.set(1, hScale, 1);
        dummy.updateMatrix();
        wallInst.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(wp.x, 0.94 * hScale - 0.04, wp.z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        trimInst.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(wp.x, 0.94 * hScale + 0.06, wp.z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        capInst.setMatrixAt(idx, dummy.matrix);
      });
      wallInst.instanceMatrix.needsUpdate = true;
      trimInst.instanceMatrix.needsUpdate = true;
      capInst.instanceMatrix.needsUpdate = true;
      this.levelGroup.add(wallInst, trimInst, capInst);
    }

    // Instanced String-Light Bulbs along Wall Tops (subtle warm accents)
    if (bulbPositions.length > 0) {
      const bulbGeo = this.res.trackGeometry(new THREE.SphereGeometry(0.055, 5, 4));
      const bulbMat = this.res.getStandard('#fffbeb', {
        emissive: pal.lightGlow,
        emissiveIntensity: 0.9,
        roughness: 0.25,
      });
      const bulbInst = new THREE.InstancedMesh(bulbGeo, bulbMat, bulbPositions.length);
      bulbPositions.forEach((bp, idx) => {
        dummy.position.set(bp.x, 1.05, bp.z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        bulbInst.setMatrixAt(idx, dummy.matrix);
        bulbInst.setColorAt(idx, tmpCol.set(bp.color));
      });
      bulbInst.instanceMatrix.needsUpdate = true;
      if (bulbInst.instanceColor) bulbInst.instanceColor.needsUpdate = true;
      this.levelGroup.add(bulbInst);
    }

    // Instanced Decorative Toy Christmas Trees (2-tier pine + snow cap tip) on wall tops
    const trees = this.level.props.filter((p) => p.kind === 'tree');
    if (trees.length > 0) {
      const lowerConeGeo = this.res.trackGeometry(new THREE.ConeGeometry(0.36, 0.54, 7));
      const upperConeGeo = this.res.trackGeometry(new THREE.ConeGeometry(0.25, 0.44, 7));
      const snowTipGeo = this.res.trackGeometry(new THREE.ConeGeometry(0.14, 0.22, 7));
      const treeMat = this.res.getStandard('#15803d', { roughness: 0.72 });
      const snowTipMat = this.res.getStandard('#ffffff', { roughness: 0.65 });
      const lowerTreeInst = new THREE.InstancedMesh(lowerConeGeo, treeMat, trees.length);
      const upperTreeInst = new THREE.InstancedMesh(upperConeGeo, treeMat, trees.length);
      const snowTipInst = new THREE.InstancedMesh(snowTipGeo, snowTipMat, trees.length);
      trees.forEach((t, idx) => {
        dummy.position.set(t.x + 0.5, 1.28, t.y + 0.5);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        lowerTreeInst.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(t.x + 0.5, 1.56, t.y + 0.5);
        dummy.updateMatrix();
        upperTreeInst.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(t.x + 0.5, 1.72, t.y + 0.5);
        dummy.updateMatrix();
        snowTipInst.setMatrixAt(idx, dummy.matrix);
      });
      lowerTreeInst.instanceMatrix.needsUpdate = true;
      upperTreeInst.instanceMatrix.needsUpdate = true;
      snowTipInst.instanceMatrix.needsUpdate = true;
      this.levelGroup.add(lowerTreeInst, upperTreeInst, snowTipInst);
    }

    const lamps = this.level.props.filter((p) => p.kind === 'lamp');
    if (lamps.length > 0) {
      const postGeo = this.res.trackGeometry(new THREE.CylinderGeometry(0.04, 0.05, 0.62, 5));
      const postMat = this.res.getStandard('#334155', { roughness: 0.4, metalness: 0.6 });
      const lampPostInst = new THREE.InstancedMesh(postGeo, postMat, lamps.length);

      const globeGeo = this.res.trackGeometry(new THREE.SphereGeometry(0.1, 5, 4));
      const globeMat = this.res.getStandard(pal.lightGlow, {
        emissive: pal.lightGlow,
        emissiveIntensity: 1.0,
      });
      const lampGlobeInst = new THREE.InstancedMesh(globeGeo, globeMat, lamps.length);

      lamps.forEach((l, idx) => {
        dummy.position.set(l.x + 0.5, 1.32, l.y + 0.5);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        lampPostInst.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(l.x + 0.5, 1.68, l.y + 0.5);
        dummy.updateMatrix();
        lampGlobeInst.setMatrixAt(idx, dummy.matrix);
      });
      lampPostInst.instanceMatrix.needsUpdate = true;
      lampGlobeInst.instanceMatrix.needsUpdate = true;
      this.levelGroup.add(lampPostInst, lampGlobeInst);
    }

    // Outer Scenic Landmark & Instanced Perimeter Trees
    const landmark = createCityLandmarkModel(this.res, this.level.city.id, pal.accent);
    landmark.position.set(this.level.cols * 0.5, 0, -2.8);
    this.landmarkGroup = landmark;
    this.levelGroup.add(landmark);

    const outerTreeCoords: Array<{ x: number; z: number }> = [];
    for (let i = -2; i <= this.level.cols + 2; i += 4) {
      outerTreeCoords.push({ x: i, z: -3.2 - (Math.abs(i) % 3) });
      outerTreeCoords.push({ x: i, z: this.level.rows + 3.0 + (Math.abs(i) % 2) });
    }
    for (let j = 0; j <= this.level.rows; j += 4) {
      outerTreeCoords.push({ x: -3.0 - (j % 2), z: j });
      outerTreeCoords.push({ x: this.level.cols + 3.0 + (j % 2), z: j });
    }
    if (outerTreeCoords.length > 0) {
      const hillGeo = this.res.trackGeometry(new THREE.SphereGeometry(1.35, 8, 6));
      const hillMat = this.res.getStandard(pal.floorSecondary, { roughness: 0.9 });
      const hillInst = new THREE.InstancedMesh(hillGeo, hillMat, outerTreeCoords.length);

      const outerLowerGeo = this.res.trackGeometry(new THREE.ConeGeometry(0.78, 1.45, 7));
      const outerUpperGeo = this.res.trackGeometry(new THREE.ConeGeometry(0.54, 1.12, 7));
      const outerTipGeo = this.res.trackGeometry(new THREE.ConeGeometry(0.28, 0.5, 7));
      const outerTreeMat = this.res.getStandard('#0f5132', { roughness: 0.8 });
      const outerTipMat = this.res.getStandard('#f8fafc', { roughness: 0.7 });
      const outerLowerInst = new THREE.InstancedMesh(
        outerLowerGeo,
        outerTreeMat,
        outerTreeCoords.length
      );
      const outerUpperInst = new THREE.InstancedMesh(
        outerUpperGeo,
        outerTreeMat,
        outerTreeCoords.length
      );
      const outerTipInst = new THREE.InstancedMesh(
        outerTipGeo,
        outerTipMat,
        outerTreeCoords.length
      );
      outerTreeCoords.forEach((pt, idx) => {
        dummy.position.set(pt.x, -0.32, pt.z);
        dummy.scale.set(1.2, 0.35, 1.2);
        dummy.updateMatrix();
        hillInst.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(pt.x, 0.75, pt.z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        outerLowerInst.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(pt.x, 1.48, pt.z);
        dummy.updateMatrix();
        outerUpperInst.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(pt.x, 1.88, pt.z);
        dummy.updateMatrix();
        outerTipInst.setMatrixAt(idx, dummy.matrix);
      });
      hillInst.instanceMatrix.needsUpdate = true;
      outerLowerInst.instanceMatrix.needsUpdate = true;
      outerUpperInst.instanceMatrix.needsUpdate = true;
      outerTipInst.instanceMatrix.needsUpdate = true;
      this.levelGroup.add(hillInst, outerLowerInst, outerUpperInst, outerTipInst);
    }

    // Interactive Level Objects
    for (const ch of this.level.chimneys) {
      const m1 = createChimneyPadModel(this.res);
      m1.position.set(ch.entryX + 0.5, 0, ch.entryY + 0.5);
      const m2 = createChimneyPadModel(this.res);
      m2.position.set(ch.exitX + 0.5, 0, ch.exitY + 0.5);
      this.levelGroup.add(m1, m2);
      this.chimneyMeshes.push(
        { x: ch.entryX + 0.5, z: ch.entryY + 0.5, mesh: m1 },
        { x: ch.exitX + 0.5, z: ch.exitY + 0.5, mesh: m2 }
      );
    }

    for (const sw of this.level.switches) {
      const m = createSwitchModel(this.res);
      m.position.set(sw.x + 0.5, 0, sw.y + 0.5);
      this.levelGroup.add(m);
      this.switchMeshes.set(sw.id, m);
    }

    for (const k of this.level.keys) {
      const m = createKeyModel(this.res, k.kind);
      m.position.set(k.x + 0.5, 0, k.y + 0.5);
      this.levelGroup.add(m);
      this.keyMeshes.set(k.id, m);
    }

    for (const pu of this.level.powerUps) {
      const m = createPowerUpModel(this.res, pu.kind);
      m.position.set(pu.x + 0.5, 0, pu.y + 0.5);
      this.levelGroup.add(m);
      this.powerUpMeshes.set(pu.id, m);
    }

    if (this.level.goldenPresent) {
      const gp = createGoldenPresentModel(this.res);
      gp.position.set(this.level.goldenPresent.x + 0.5, 0, this.level.goldenPresent.y + 0.5);
      this.levelGroup.add(gp);
      this.goldenPresentGroup = gp;
    }

    for (const h of this.level.houses) {
      const m = createDeliveryHouseModel(this.res, h);
      m.position.set(h.x + 0.5, 0, h.y + 0.5);
      this.levelGroup.add(m);
      this.houseMeshes.set(h.id, m);
    }

    this.portalGroup = createPortalModel(this.res);
    this.portalGroup.position.set(this.level.portal.x + 0.5, 0, this.level.portal.y + 0.5);
    this.levelGroup.add(this.portalGroup);

    if (this.level.portals) {
      for (const p of this.level.portals) {
        const pm = createPortalModel(this.res);
        pm.position.set(p.x + 0.5, 0, p.y + 0.5);
        this.levelGroup.add(pm);
        this.teleportPortalMeshes.set(p.id, pm);
      }
    }

    for (const c of this.level.cookies) {
      const m = createCookieModel(this.res, c);
      m.position.set(c.x + 0.5, 0, c.y + 0.5);
      this.levelGroup.add(m);
      this.cookieMeshes.set(c.id, m);
    }

    if (this.level.mysteryElf) {
      this.mysteryElfGroup = createElfModel(this.res, false);
      this.mysteryElfGroup.position.set(
        this.level.mysteryElf.x + 0.5,
        0,
        this.level.mysteryElf.y + 0.5
      );
      this.levelGroup.add(this.mysteryElfGroup);
    }

    for (const haz of this.level.hazards) {
      const m = createHazardModel(this.res, haz.kind, haz.lightRange, haz.lightHalfAngle);
      m.position.set(haz.x, 0, haz.y);
      this.levelGroup.add(m);
      this.hazardMeshes.set(haz.id, m);
    }

    for (const tp of this.level.trapPads) {
      const m = createTrapPadModel(this.res, tp.lightRange, tp.lightHalfAngle);
      m.position.set(tp.curX, 0, tp.curY);
      this.levelGroup.add(m);
      this.trapPadMeshes.set(tp.id, m);
    }

    for (const ln of this.level.launchers) {
      const m = createLauncherModel(this.res, ln.dirX, ln.dirY);
      m.position.set(ln.x + 0.5, 0, ln.y + 0.5);
      this.levelGroup.add(m);
      this.launcherMeshes.set(ln.id, m);
    }

    for (const hs of this.level.hidingSpots) {
      const m = createHidingSpotModel(this.res, hs.kind);
      m.position.set(hs.x + 0.5, 0, hs.y + 0.5);
      this.levelGroup.add(m);
      this.hidingSpotMeshes.set(hs.id, m);
    }

    for (const enemy of this.level.stealthEnemies) {
      const m = createStealthEnemyModel(
        this.res,
        enemy.role,
        enemy.visionRange,
        enemy.visionHalfAngle
      );
      m.position.set(enemy.x, 0, enemy.y);
      this.levelGroup.add(m);
      this.stealthEnemyMeshes.set(enemy.id, m);
    }

    for (const cam of this.level.securityCameras) {
      const m = createSecurityCameraModel(this.res, cam.range, cam.halfAngle);
      m.position.set(cam.x, 0, cam.y);
      this.levelGroup.add(m);
      this.securityCameraMeshes.set(cam.id, m);
    }

    for (const lb of this.level.laserBarriers) {
      const m = createLaserBarrierModel(this.res, lb.x1, lb.y1, lb.x2, lb.y2);
      this.levelGroup.add(m);
      this.laserBarrierMeshes.set(lb.id, m);
    }

    // Actors: Santa, Reindeer, Helper Elf, Golden Compass Arrow
    const outfit = COSMETICS.find((c) => c.id === this.progress.equippedCosmetics.outfit);
    const reindeerCosm = COSMETICS.find((c) => c.id === this.progress.equippedCosmetics.reindeer);
    this.santaGroup = createSantaModel(this.res, outfit);
    this.reindeerGroup = createReindeerModel(this.res, reindeerCosm);
    this.reindeerGroup.visible = false;
    this.helperElfGroup = createElfModel(this.res, true);
    this.helperElfGroup.visible = false;

    this.compassArrow = new THREE.Mesh(
      this.res.trackGeometry(new THREE.ConeGeometry(0.14, 0.36, 4)),
      this.res.getStandard('#fde047', {
        emissive: '#fbbf24',
        emissiveIntensity: 0.9,
        roughness: 0.2,
      })
    );
    this.compassArrow.rotation.x = Math.PI / 2;
    this.compassArrow.visible = false;

    this.levelGroup.add(this.santaGroup, this.reindeerGroup, this.helperElfGroup, this.compassArrow);

    // Localized 3D Particle-Based Snowfall (wraps smoothly around camera view)
    this.snowCount = rangeCfg.snowCount;
    this.snowBoxHalfX = rangeCfg.snowBoxHalfX;
    this.snowBoxHalfZ = rangeCfg.snowBoxHalfZ;
    const posArr = new Float32Array(this.snowCount * 3);
    const colArr = new Float32Array(this.snowCount * 3);
    this.weatherVelocities = new Float32Array(this.snowCount);
    this.weatherDriftPhases = new Float32Array(this.snowCount);
    const tintBase = new THREE.Color('#ffffff');
    const tintIce = new THREE.Color('#bae6fd');
    const tintCity = new THREE.Color(pal.particleColor);
    const flakeCol = new THREE.Color();

    for (let i = 0; i < this.snowCount; i++) {
      posArr[i * 3] = spawnCx + (Math.random() * 2 - 1) * this.snowBoxHalfX;
      posArr[i * 3 + 1] = 0.25 + Math.random() * 9.5;
      posArr[i * 3 + 2] = spawnCz + (Math.random() * 2 - 1) * this.snowBoxHalfZ;
      this.weatherVelocities[i] = 1.35 + Math.random() * 1.55;
      this.weatherDriftPhases[i] = Math.random() * Math.PI * 2;

      const pick = i % 3;
      flakeCol.copy(pick === 0 ? tintBase : pick === 1 ? tintIce : tintCity);
      colArr[i * 3] = flakeCol.r;
      colArr[i * 3 + 1] = flakeCol.g;
      colArr[i * 3 + 2] = flakeCol.b;
    }

    const wGeo = new THREE.BufferGeometry();
    wGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    wGeo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
    const wMat = new THREE.PointsMaterial({
      size: 0.36,
      map: this.snowTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      alphaTest: 0.02,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.weatherPoints = new THREE.Points(wGeo, wMat);
    this.weatherPoints.frustumCulled = false;
    this.scene.add(this.weatherPoints);

    this.applyRenderRangeSettings();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  public loadLevel(cityIndex: number, difficulty: Difficulty, progress: PlayerProgress) {
    this.progress = progress;
    this.level = buildCityLevel(cityIndex, difficulty);
    this.buildLevelScene();
    this.resetLevelState();
    this.audio.startMusic(this.level.city.musicMotif);
    this.render();
  }

  public updateProgress(progress: PlayerProgress) {
    this.progress = progress;
    this.renderer.toneMappingExposure = progress.settings.theme === 'light' ? 1.18 : 1.05;
  }

  private resetLevelState() {
    this.santaX = this.level.spawn.x + 0.5;
    this.santaY = this.level.spawn.y + 0.5;
    this.santaDirX = 0;
    this.santaDirY = 1;
    this.santaYaw = 0;
    this.santaWalkDist = 0;
    this.santaSquash = 1;
    this.reindeerX = this.santaX - 0.65;
    this.reindeerY = this.santaY;
    this.helperElfX = this.santaX;
    this.helperElfY = this.santaY;

    this.camTargetX = this.santaX;
    this.camTargetZ = this.santaY;

    this.slowTimer = 0;
    this.slowFactor = 1;
    this.invulnTimer = 0;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.hitstopTimer = 0;
    this.shakeTrauma = 0;

    const gearBonuses = getGearBonuses(this.progress.equippedCosmetics.gear);
    this.maxHearts = gearBonuses.maxHearts;
    this.hearts = this.maxHearts;
    this.trailSpawnTimer = 0;
    this.realCookiesCollected = 0;
    this.deliveriesDone = 0;
    this.heldKeys.clear();
    this.heldGateKeys.clear();
    this.missionClearedInLevel = false;
    this.gateDoorOpenRatio = 0;
    this.score = 0;
    this.trapsTriggered = 0;
    this.secretRoomsFound = 0;
    this.secretRoomDiscovered = false;
    this.goldenPresentFound = false;
    this.elfHelped = false;
    this.niceMeter = 85;
    this.elapsedSeconds = 0;
    this.countdownRemaining = this.level.city.hasCountdown ? this.level.city.countdownSeconds : null;
    this.portalUnlocked = false;
    this.activePowerUps = createEmptyPowerUps();
    this.statusBanner =
      this.level.city.tutorialHint ??
      `Mission ${this.level.city.index + 1} (${this.level.city.city}): Collect ${this.level.city.requiredCookies} Cookies, ${this.level.city.requiredDeliveries} Gifts & ${this.level.requiredGateKeys} Gate Keys!`;
    this.statusBannerTimer = 5.5;
    this.elfClue = null;
    this.elfClueTimer = 0;
    this.finished = false;
    this.paused = false;

    for (const b of this.burstParticles) {
      b.active = false;
      b.mesh.visible = false;
    }
    for (const p of this.projectiles) {
      p.active = false;
      p.mesh.visible = false;
    }
    for (const l of this.labels) {
      l.active = false;
      l.el.style.display = 'none';
    }
    this.keys.clear();
    this.joyX = 0;
    this.joyY = 0;
    this.actionQueued = false;
    this.dashQueued = false;
    this.hideQueued = false;
    this.decoyQueued = false;

    this.sneakToggled = false;
    this.isHiding = false;
    this.hideGraceTimer = 0;
    this.activeHidingSpotId = null;
    this.noiseLevel = 0;
    this.suspicionLevel = 0;
    this.wasChased = false;
    this.stance = 'walk';
    this.cameraSuspicion = 0;
    this.enemyHitCooldown.clear();
    this.stealthAbilities = {
      disguiseActive: 0,
      disguiseCooldown: 0,
      silentBootsActive: 0,
      silentBootsCooldown: 0,
      elfSmokeActive: 0,
      elfSmokeCooldown: 0,
      decoyCooldown: 0,
    };
    this.decoySnowball.active = false;
    this.decoySnowball.mesh.visible = false;

    this.syncActorTransforms();
    this.emitHud();
  }

  public start() {
    if (this.running) return;
    this.running = true;
    this.lastTs = performance.now();
    this.audio.startMusic(this.level.city.musicMotif);
    this.render();
    this.scheduleNextFrame();
  }

  private scheduleNextFrame() {
    if (!this.running) return;
    if (this.isSoftwareGl) {
      this.afterDraw(() => {
        if (!this.running) return;
        const now = performance.now();
        const rawDt = Math.max(0, (now - this.lastTs) / 1000);
        this.lastTs = now;
        this.tick(Math.min(rawDt, 0.05));
        this.render();
        this.scheduleNextFrame();
      });
    } else {
      this.rafId = requestAnimationFrame((ts) => {
        if (!this.running) return;
        const rawDt = Math.max(0, (ts - this.lastTs) / 1000);
        this.lastTs = ts;
        this.tick(Math.min(rawDt, 0.05));
        this.render();
        this.scheduleNextFrame();
      });
    }
  }

  private afterDraw(fn: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl && typeof gl.fenceSync === 'function'
      ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0)
      : null;
    if (sync) {
      gl.flush();
      const poll = () => {
        if (!this.running) {
          gl.deleteSync(sync);
          return;
        }
        const status = gl.clientWaitSync(sync, 0, 0);
        if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED) {
          gl.deleteSync(sync);
          this.rafId = requestAnimationFrame(fn);
        } else {
          this.syncTimerId = window.setTimeout(poll, 80);
        }
      };
      this.syncTimerId = window.setTimeout(poll, 80);
    } else {
      this.syncTimerId = window.setTimeout(() => {
        this.rafId = requestAnimationFrame(fn);
      }, 80);
    }
  }

  public setPaused(paused: boolean) {
    this.paused = paused;
    this.keys.clear();
    this.joyX = 0;
    this.joyY = 0;
    if (paused) {
      this.audio.stopMusic();
    } else if (!this.finished) {
      this.audio.resumeMusic();
    }
  }

  public setHideOnScreenPopups(hide: boolean) {
    this.labelOverlayEl.style.display = hide ? 'none' : '';
  }

  public destroy() {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.syncTimerId !== null) {
      clearTimeout(this.syncTimerId);
      this.syncTimerId = null;
    }
    this.resizeObserver.disconnect();
    this.audio.stopMusic();
    this.keys.clear();

    this.clearLevelScene();
    for (const b of this.burstParticles) {
      b.mesh.geometry.dispose();
      (b.mesh.material as THREE.Material).dispose();
    }
    for (const p of this.projectiles) {
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    this.envRenderTarget.dispose();
    this.pmremGenerator.dispose();
    if (this.snowTexture) {
      this.snowTexture.dispose();
      this.snowTexture = null;
    }
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.mountEl) {
      this.mountEl.removeChild(this.renderer.domElement);
    }
    if (this.labelOverlayEl.parentNode === this.mountEl) {
      this.mountEl.removeChild(this.labelOverlayEl);
    }
  }

  public handleKeyDown(code: string) {
    if (this.paused || this.finished) return;
    if (code === 'Space') {
      this.actionQueued = true;
    }
    if (code === 'KeyC' || code === 'ControlLeft' || code === 'ControlRight') {
      this.toggleSneak();
    }
    if (code === 'KeyE') {
      this.hideQueued = true;
    }
    if (code === 'KeyQ') {
      this.decoyQueued = true;
    }
    if (code === 'Digit1') {
      this.activateAbility('disguise');
    }
    if (code === 'Digit2') {
      this.activateAbility('silent_boots');
    }
    if (code === 'Digit3') {
      this.activateAbility('elf_smoke');
    }
    if (code === 'KeyV') {
      this.toggleCameraMode();
    }
    this.keys.add(code);
  }

  public toggleCameraMode(): CameraViewMode {
    if (this.cameraMode === 'slightly_3d') {
      this.cameraMode = 'top_down';
    } else if (this.cameraMode === 'top_down') {
      this.cameraMode = 'cinematic';
    } else {
      this.cameraMode = 'slightly_3d';
    }
    this.applyRenderRangeSettings();
    const label =
      this.cameraMode === 'slightly_3d'
        ? 'Slightly 3D (2.5D View)'
        : this.cameraMode === 'top_down'
        ? 'Top-Down 3D'
        : 'Cinematic 3D';
    this.showBanner(`Camera: ${label}`, 2.0);
    this.emitHud();
    return this.cameraMode;
  }

  public getCameraMode(): CameraViewMode {
    return this.cameraMode;
  }

  public setCameraMode(mode: CameraViewMode) {
    this.cameraMode = mode;
    this.applyRenderRangeSettings();
    this.emitHud();
  }

  public handleKeyUp(code: string) {
    this.keys.delete(code);
  }

  public clearInputs() {
    this.keys.clear();
    this.joyX = 0;
    this.joyY = 0;
  }

  public setJoystickVector(vx: number, vy: number) {
    this.joyX = vx;
    this.joyY = vy;
  }

  public triggerAction() {
    if (this.paused || this.finished) return;
    this.actionQueued = true;
  }

  public toggleSneak() {
    if (this.paused || this.finished) return;
    this.sneakToggled = !this.sneakToggled;
    this.showBanner(
      this.sneakToggled ? 'Sneak Mode ON: Quiet footsteps!' : 'Sneak Mode OFF: Normal pace',
      1.6
    );
    this.emitHud();
  }

  public triggerHide() {
    if (this.paused || this.finished) return;
    this.hideQueued = true;
  }

  public triggerDash() {
    if (this.paused || this.finished) return;
    this.dashQueued = true;
  }

  public throwDecoy() {
    if (this.paused || this.finished) return;
    this.decoyQueued = true;
  }

  public activateAbility(id: StealthAbilityId) {
    if (this.paused || this.finished) return;
    if (id === 'disguise') {
      if (this.stealthAbilities.disguiseCooldown > 0 || this.stealthAbilities.disguiseActive > 0) return;
      this.stealthAbilities.disguiseActive = 6.5;
      this.stealthAbilities.disguiseCooldown = 16;
      this.audio.playHideToggle();
      this.spawnBurst(this.santaX, this.santaY, '#fbbf24', 16);
      this.spawnFloatingLabel(this.santaX, this.santaY, 'GIFT BOX DISGUISE!', '#fde047');
      this.showBanner('Magic Gift Disguise active! Patrols look right past Santa!', 2.8);
    } else if (id === 'silent_boots') {
      if (this.stealthAbilities.silentBootsCooldown > 0 || this.stealthAbilities.silentBootsActive > 0) return;
      this.stealthAbilities.silentBootsActive = 7.5;
      this.stealthAbilities.silentBootsCooldown = 14;
      this.audio.playPowerUp();
      this.spawnBurst(this.santaX, this.santaY, '#38bdf8', 14);
      this.spawnFloatingLabel(this.santaX, this.santaY, 'SILENT BOOTS!', '#38bdf8');
      this.showBanner('Silent Snow Boots active: Run across any floor noiselessly!', 2.8);
    } else if (id === 'elf_smoke') {
      if (this.stealthAbilities.elfSmokeCooldown > 0 || this.stealthAbilities.elfSmokeActive > 0) return;
      this.stealthAbilities.elfSmokeActive = 4.8;
      this.stealthAbilities.elfSmokeCooldown = 18;
      this.audio.playEscapeSfx();
      this.spawnBurst(this.santaX, this.santaY, '#e2e8f0', 28);
      this.spawnFloatingLabel(this.santaX, this.santaY, 'ELF SMOKE SCREEN!', '#f8fafc');
      this.showBanner('Elf Magic Smoke deployed! Line-of-sight broken!', 2.8);
      for (const e of this.level.stealthEnemies) {
        e.suspicion = Math.min(e.suspicion, 20);
        if (e.state === 'chase') e.state = 'suspicious';
      }
    }
    this.emitHud();
  }

  private spawnBurst(worldX: number, worldY: number, color: string, count = 14) {
    for (let i = 0; i < count; i++) {
      const b = this.burstParticles[this.burstCursor];
      this.burstCursor = (this.burstCursor + 1) % BURST_POOL_SIZE;
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const spd = 1.6 + Math.random() * 3.0;
      b.active = true;
      b.mesh.visible = true;
      b.mesh.position.set(worldX, 0.45, worldY);
      b.mesh.scale.setScalar(1);
      (b.mesh.material as THREE.MeshBasicMaterial).color.set(color);
      b.vx = Math.cos(ang) * spd;
      b.vy = 2.2 + Math.random() * 2.5;
      b.vz = Math.sin(ang) * spd;
      b.life = 0.55 + Math.random() * 0.25;
      b.maxLife = b.life;
    }
  }

  private spawnConfettiBurst3D(worldX: number, worldY: number, count = 48) {
    for (let i = 0; i < count; i++) {
      const b = this.burstParticles[this.burstCursor];
      this.burstCursor = (this.burstCursor + 1) % BURST_POOL_SIZE;
      const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
      const spd = 1.8 + Math.random() * 4.2;
      b.active = true;
      b.mesh.visible = true;
      b.mesh.position.set(worldX, 0.65, worldY);
      b.mesh.scale.setScalar(1.25);
      (b.mesh.material as THREE.MeshBasicMaterial).color.set(
        CONFETTI_COLORS[i % CONFETTI_COLORS.length]
      );
      b.vx = Math.cos(ang) * spd;
      b.vy = 3.4 + Math.random() * 3.0;
      b.vz = Math.sin(ang) * spd;
      b.life = 1.05 + Math.random() * 0.45;
      b.maxLife = b.life;
    }
  }

  private spawnFloatingLabel(worldX: number, worldY: number, text: string, color: string) {
    const activeNearby = this.labels.filter(
      (item) => item.active && Math.hypot(item.wx - worldX, item.wz - worldY) < 1.2
    ).length;
    const l = this.labels[this.labelCursor];
    this.labelCursor = (this.labelCursor + 1) % LABEL_POOL_SIZE;
    l.active = true;
    l.wx = worldX;
    l.wy = 1.45 + Math.min(3, activeNearby) * 0.42;
    l.wz = worldY;
    l.life = 1.3;
    l.maxLife = 1.3;
    l.el.textContent = text;
    l.el.style.color = color;

    this.tempVec3.set(l.wx, l.wy, l.wz).project(this.camera);
    if (this.tempVec3.z > 1) {
      l.el.style.display = 'none';
      return;
    }
    const width = this.renderer.domElement.clientWidth || window.innerWidth;
    const height = this.renderer.domElement.clientHeight || window.innerHeight;
    l.el.style.left = `${(this.tempVec3.x * 0.5 + 0.5) * width}px`;
    l.el.style.top = `${(-this.tempVec3.y * 0.5 + 0.5) * height}px`;
    l.el.style.opacity = '1';
    l.el.style.display = 'block';
  }

  private showBanner(text: string, duration = 2.6) {
    this.statusBanner = text;
    this.statusBannerTimer = duration;
  }

  private takeDangerHit(sourceX: number, sourceY: number, reasonBanner: string) {
    if (this.invulnTimer > 0 || this.dashTimer > 0) return;

    if (this.activePowerUps.snowflake_shield > 0) {
      this.activePowerUps.snowflake_shield = 0;
      this.invulnTimer = 1.4;
      this.audio.playShieldBlock();
      this.spawnBurst(this.santaX, this.santaY, '#7dd3fc', 16);
      this.spawnFloatingLabel(this.santaX, this.santaY, 'SHIELD BLOCKED!', '#7dd3fc');
      this.showBanner('Snowflake Shield absorbed the danger!', 2.2);
      this.emitHud();
      return;
    }

    this.hearts = Math.max(0, this.hearts - 1);
    this.trapsTriggered++;
    this.slowTimer = 1.35;
    this.slowFactor = 0.55;
    this.invulnTimer = 1.9;
    this.niceMeter = Math.max(0, this.niceMeter - 6);
    this.score = Math.max(0, this.score - 25);
    this.shakeTrauma = 0.72;
    this.hitstopTimer = 0.045;
    this.santaSquash = 1.28;
    this.audio.playTrapHit();
    this.spawnBurst(this.santaX, this.santaY, '#f43f5e', 18);
    this.spawnFloatingLabel(this.santaX, this.santaY, 'OUCH! -1 HEART', '#fda4af');
    this.showBanner(reasonBanner, 2.5);

    // Gentle knockback away from danger
    const kx = this.santaX - sourceX;
    const ky = this.santaY - sourceY;
    const kDist = Math.hypot(kx, ky) || 1;
    const push = moveWithWallCollision(
      this.level.grid,
      this.santaX,
      this.santaY,
      (kx / kDist) * 0.42,
      (ky / kDist) * 0.42,
      this.santaRadius,
      this.activePowerUps.christmas_wings > 0
    );
    this.santaX = push.x;
    this.santaY = push.y;

    this.emitHud();
    if (this.hearts <= 0) {
      this.finishLevel(false, 'hearts');
    }
  }

  private tick(dt: number) {
    this.animTime += dt;
    this.updateParticles(dt);

    if (this.paused || this.finished) return;

    this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 1.9);
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      return;
    }

    this.elapsedSeconds += dt;
    if (this.countdownRemaining !== null) {
      this.countdownRemaining = Math.max(0, this.countdownRemaining - dt);
      if (this.countdownRemaining <= 0) {
        this.finishLevel(false, 'timeout');
        return;
      }
    }

    const gearBonuses = getGearBonuses(this.progress.equippedCosmetics.gear);
    if (this.slowTimer > 0) {
      this.slowTimer = Math.max(0, this.slowTimer - dt);
      if (this.slowTimer === 0) this.slowFactor = 1;
    }
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.dashTimer > 0) this.dashTimer = Math.max(0, this.dashTimer - dt);
    if (this.dashCooldown > 0) {
      this.dashCooldown = Math.max(0, this.dashCooldown - dt * gearBonuses.dashRechargeMultiplier);
    }
    if (this.teleportCooldown > 0) {
      this.teleportCooldown = Math.max(0, this.teleportCooldown - dt);
    }
    if (this.statusBannerTimer > 0) {
      this.statusBannerTimer = Math.max(0, this.statusBannerTimer - dt);
      if (this.statusBannerTimer === 0) this.statusBanner = null;
    }
    if (this.elfClueTimer > 0) {
      this.elfClueTimer = Math.max(0, this.elfClueTimer - dt);
      if (this.elfClueTimer === 0) this.elfClue = null;
    }

    (Object.keys(this.activePowerUps) as Array<keyof ActivePowerUps>).forEach((k) => {
      if (this.activePowerUps[k] > 0) {
        this.activePowerUps[k] = Math.max(0, this.activePowerUps[k] - dt);
      }
    });

    // Stealth abilities timers & cooldowns
    const sa = this.stealthAbilities;
    const cdMult = gearBonuses.abilityCooldownMultiplier;
    sa.disguiseActive = Math.max(0, sa.disguiseActive - dt);
    sa.disguiseCooldown = Math.max(0, sa.disguiseCooldown - dt * cdMult);
    sa.silentBootsActive = Math.max(0, sa.silentBootsActive - dt);
    sa.silentBootsCooldown = Math.max(0, sa.silentBootsCooldown - dt * cdMult);
    sa.elfSmokeActive = Math.max(0, sa.elfSmokeActive - dt);
    sa.elfSmokeCooldown = Math.max(0, sa.elfSmokeCooldown - dt * cdMult);
    sa.decoyCooldown = Math.max(0, sa.decoyCooldown - dt * cdMult);
    if (this.hideGraceTimer > 0) this.hideGraceTimer = Math.max(0, this.hideGraceTimer - dt);

    this.enemyHitCooldown.forEach((v, k) => {
      if (v - dt <= 0) this.enemyHitCooldown.delete(k);
      else this.enemyHitCooldown.set(k, v - dt);
    });

    // Movement Input
    let ix = this.joyX;
    let iy = this.joyY;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) ix -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) ix += 1;
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) iy -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) iy += 1;

    const mag = Math.hypot(ix, iy);
    if (mag > 1) {
      ix /= mag;
      iy /= mag;
    }

    // Handle Hide toggle [E] or auto-exit hide on directional input
    if (this.hideQueued) {
      this.hideQueued = false;
      if (this.isHiding) {
        this.isHiding = false;
        this.activeHidingSpotId = null;
        this.audio.playHideToggle();
        this.spawnFloatingLabel(this.santaX, this.santaY, 'LEFT COVER', '#cbd5e1');
      } else {
        let bestSpot: LevelInstance['hidingSpots'][number] | null = null;
        let bestD = 1.15;
        for (const hs of this.level.hidingSpots) {
          const d = Math.hypot(hs.x + 0.5 - this.santaX, hs.y + 0.5 - this.santaY);
          if (d < bestD) {
            bestD = d;
            bestSpot = hs;
          }
        }
        if (bestSpot) {
          this.isHiding = true;
          this.hideGraceTimer = 0.28;
          this.activeHidingSpotId = bestSpot.id;
          this.santaX = bestSpot.x + 0.5;
          this.santaY = bestSpot.y + 0.5;
          this.audio.playHideToggle();
          this.spawnBurst(this.santaX, this.santaY, '#38bdf8', 10);
          this.spawnFloatingLabel(this.santaX, this.santaY, 'HIDDEN!', '#38bdf8');
          this.showBanner(`Hidden inside ${bestSpot.label}! Enemies cannot spot Santa here.`, 2.4);
        } else {
          this.showBanner('Move closer to a Wardrobe, Bed, Sofa, Gift Box, or Tree to hide!', 2.0);
        }
      }
    } else if (this.isHiding && mag > 0.3 && this.hideGraceTimer <= 0) {
      this.isHiding = false;
      this.activeHidingSpotId = null;
      this.audio.playHideToggle();
    }

    // Determine stance: hide | sneak | run | walk
    const isSprinting = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    this.stance = this.isHiding
      ? 'hide'
      : this.sneakToggled
      ? 'sneak'
      : isSprinting && mag > 0.1
      ? 'run'
      : 'walk';

    const currentTile = this.level.grid[Math.floor(this.santaY)]?.[Math.floor(this.santaX)];
    const onIce = currentTile === 'ice';
    const milkBoost = this.activePowerUps.magical_milk > 0 ? 1.38 : 1;
    const dashBoost = this.dashTimer > 0 ? 1.95 : 1;
    const iceBoost = onIce ? 1.22 : 1;
    const stanceSpeedMult =
      this.stance === 'hide'
        ? 0
        : this.stance === 'sneak'
        ? 0.64
        : this.stance === 'run'
        ? 1.44
        : 1.0;
    const speedTilesPerSec =
      4.45 *
      stanceSpeedMult *
      this.slowFactor *
      milkBoost *
      dashBoost *
      iceBoost *
      gearBonuses.speedMultiplier;

    let actuallyMoved = false;
    if (!this.isHiding && mag > 0.05) {
      this.santaDirX = ix / (mag > 1 ? 1 : mag);
      this.santaDirY = iy / (mag > 1 ? 1 : mag);
      this.santaYaw = Math.atan2(this.santaDirX, this.santaDirY);

      const stepDx = ix * speedTilesPerSec * dt;
      const stepDy = iy * speedTilesPerSec * dt;
      const hasWings = this.activePowerUps.christmas_wings > 0;
      const res = moveWithWallCollision(
        this.level.grid,
        this.santaX,
        this.santaY,
        stepDx,
        stepDy,
        this.santaRadius,
        hasWings
      );
      const movedDist = Math.hypot(res.x - this.santaX, res.y - this.santaY);
      actuallyMoved = movedDist > 0.001;
      this.santaX = res.x;
      this.santaY = res.y;
      this.santaWalkDist += movedDist;

      if (actuallyMoved) {
        this.trailSpawnTimer -= dt;
        if (this.trailSpawnTimer <= 0) {
          this.trailSpawnTimer = this.dashTimer > 0 ? 0.045 : 0.14;
          const sleighTrail = COSMETICS.find(
            (c) => c.id === this.progress.equippedCosmetics.sleigh
          );
          const trailColor =
            Math.random() < 0.55
              ? sleighTrail?.primaryColor ?? '#ef4444'
              : sleighTrail?.trimColor ?? '#fde68a';
          this.spawnBurst(this.santaX, this.santaY, trailColor, this.dashTimer > 0 ? 3 : 1);
        }
      }
    }

    const rawTargetNoise = calculateStepNoise({
      tile: currentTile,
      stance: this.stance,
      isMoving: actuallyMoved,
      silentBootsActive: this.stealthAbilities.silentBootsActive > 0,
    });
    const targetNoise = rawTargetNoise * gearBonuses.noiseMultiplier;
    this.noiseLevel += (targetNoise - this.noiseLevel) * Math.min(1, dt * 8);

    // Handle Decoy Snowball Throw [Q]
    if (this.decoyQueued) {
      this.decoyQueued = false;
      if (this.stealthAbilities.decoyCooldown <= 0 && !this.decoySnowball.active) {
        this.stealthAbilities.decoyCooldown = 4.5;
        this.decoySnowball.active = true;
        this.decoySnowball.x = this.santaX + this.santaDirX * 0.35;
        this.decoySnowball.y = this.santaY + this.santaDirY * 0.35;
        this.decoySnowball.vx = this.santaDirX * 6.5;
        this.decoySnowball.vy = this.santaDirY * 6.5;
        this.decoySnowball.z = 0.55;
        this.decoySnowball.vz = 3.2;
        this.decoySnowball.mesh.visible = true;
        this.audio.playDecoyThrow();
        this.spawnFloatingLabel(this.santaX, this.santaY, 'BELL DECOY!', '#fde047');
      }
    }

    if (this.decoySnowball.active) {
      const ds = this.decoySnowball;
      const nextX = ds.x + ds.vx * dt;
      const nextY = ds.y + ds.vy * dt;
      const hitTile = this.level.grid[Math.floor(nextY)]?.[Math.floor(nextX)];
      if (!hitTile || hitTile === 'wall' || hitTile === 'secret_wall') {
        ds.vx = 0;
        ds.vy = 0;
      } else {
        ds.x = nextX;
        ds.y = nextY;
      }
      ds.vz -= 12 * dt;
      ds.z += ds.vz * dt;
      if (ds.z <= 0.08) {
        ds.active = false;
        ds.mesh.visible = false;
        this.spawnBurst(ds.x, ds.y, '#fde047', 16);
        this.spawnFloatingLabel(ds.x, ds.y, 'JINGLE DISTRACTION!', '#fde047');
        let lured = 0;
        for (const e of this.level.stealthEnemies) {
          if (Math.hypot(e.x - ds.x, e.y - ds.y) < 7.0 && e.state !== 'chase') {
            e.state = 'distracted';
            e.investigateX = ds.x;
            e.investigateY = ds.y;
            e.investigateTimer = 4.5;
            e.awakeTimer = Math.max(e.awakeTimer, 5.0);
            lured++;
          }
        }
        if (lured > 0) {
          this.showBanner(`Bell Decoy lured ${lured} guard(s) away!`, 2.4);
        }
      }
    }

    this.santaSquash += (1 - this.santaSquash) * Math.min(1, dt * 12);

    // Companion Reindeer gently trails Santa
    const targetRx = this.santaX - this.santaDirX * 0.72;
    const targetRy = this.santaY - this.santaDirY * 0.72;
    this.reindeerX += (targetRx - this.reindeerX) * Math.min(1, dt * 5.2);
    this.reindeerY += (targetRy - this.reindeerY) * Math.min(1, dt * 5.2);

    // Camera smooth follow centered on Santa with subtle directional lookahead
    const lookAhead = this.isHiding ? 0 : 0.55;
    const lookX = this.santaX + this.santaDirX * lookAhead;
    const lookZ = this.santaY + this.santaDirY * lookAhead;
    const damp = 1 - Math.exp(-9.5 * dt);
    this.camTargetX += (lookX - this.camTargetX) * damp;
    this.camTargetZ += (lookZ - this.camTargetZ) * damp;

    // Secret Room Discovery
    if (this.level.secretRoomBounds && !this.secretRoomDiscovered) {
      const b = this.level.secretRoomBounds;
      if (
        this.santaX >= b.x &&
        this.santaX <= b.x + b.w &&
        this.santaY >= b.y &&
        this.santaY <= b.y + b.h
      ) {
        this.secretRoomDiscovered = true;
        this.secretRoomsFound++;
        this.score += 150;
        this.niceMeter = Math.min(100, this.niceMeter + 6);
        if (this.hearts < this.maxHearts) {
          this.hearts++;
          this.spawnFloatingLabel(this.santaX, this.santaY, 'SECRET ROOM +1 HEART!', '#fde047');
        } else {
          this.spawnFloatingLabel(this.santaX, this.santaY, 'SECRET ROOM!', '#fde047');
        }
        this.audio.playSecretUnlock();
        this.spawnBurst(this.santaX, this.santaY, '#fde047', 20);
        this.showBanner('Secret Christmas Room Discovered! +150 pts', 3.0);
        this.callbacks.onMissionEvent?.({ type: 'secret_room', elapsedSeconds: this.elapsedSeconds });
      }
    }

    // Update Houses illumination
    for (const h of this.level.houses) {
      if (h.delivered && h.lightProgress < 1) {
        h.lightProgress = Math.min(1, h.lightProgress + dt * 2.5);
      }
    }

    const smokeConcealed = this.stealthAbilities.elfSmokeActive > 0;

    // Update Moving Hazards with Tracking Lights & Pursuit AI
    for (let hIdx = 0; hIdx < this.level.hazards.length; hIdx++) {
      const haz = this.level.hazards[hIdx];
      if (haz.stunTimer > 0) {
        haz.stunTimer = Math.max(0, haz.stunTimer - dt);
        haz.pursuing = false;
        haz.alerted = false;
        continue;
      }

      if (haz.pursuing) {
        haz.lightYaw = Math.atan2(this.santaX - haz.x, this.santaY - haz.y);
      } else {
        const travelYaw = Math.atan2(haz.vx || 0, haz.vy || 1);
        haz.lightYaw = travelYaw + Math.sin(this.animTime * 2.1 + hIdx * 1.3) * 0.52;
      }

      const touchedByLight = isTargetTouchedByTrackingLight({
        lightX: haz.x,
        lightY: haz.y,
        lightYaw: haz.lightYaw,
        lightRange: haz.lightRange,
        lightHalfAngle: haz.lightHalfAngle,
        targetX: this.santaX,
        targetY: this.santaY,
        isHiding: this.isHiding,
        smokeConcealed,
        grid: this.level.grid,
      });

      const distToHaz = Math.hypot(this.santaX - haz.x, this.santaY - haz.y);
      if (touchedByLight) {
        if (!haz.pursuing) {
          haz.pursuing = true;
          haz.alerted = true;
          haz.pursuitLostTimer = 0;
          this.audio.playAlertSfx();
          this.spawnBurst(haz.x, haz.y, '#f43f5e', 12);
          this.spawnFloatingLabel(haz.x, haz.y, 'LOCKED ON!', '#f43f5e');
          this.showBanner('Trap tracking light touched Santa! Run or hide [E]!', 2.6);
        } else {
          haz.pursuitLostTimer = 0;
        }
      } else if (haz.pursuing) {
        const trackLoss = shouldLoseTrack({
          currentlyDetected: false,
          distance: distToHaz,
          trackRange: haz.lightRange,
          lostTimer: haz.pursuitLostTimer,
          dt,
          isHiding: this.isHiding,
          smokeConcealed,
          maxLostSeconds: 2.3,
          farLostSeconds: 1.0,
        });
        haz.pursuitLostTimer = trackLoss.nextLostTimer;
        if (trackLoss.lost) {
          haz.pursuing = false;
          haz.alerted = false;
          haz.pursuitLostTimer = 0;
          this.spawnFloatingLabel(haz.x, haz.y, 'BACK TO ROUTE', '#93c5fd');
        }
      }

      if (haz.pursuing) {
        const wp = computeGridNextWaypoint(
          this.level.grid,
          haz.x,
          haz.y,
          this.santaX,
          this.santaY
        );
        const step = computeTrapPursuitStep({
          grid: this.level.grid,
          x: haz.x,
          y: haz.y,
          targetX: wp.x,
          targetY: wp.y,
          speed: haz.speed * 1.28,
          dt,
          radius: 0.28,
          moveWithCollision: moveWithWallCollision,
        });
        haz.x = step.x;
        haz.y = step.y;
        haz.vx = step.vx;
        haz.vy = step.vy;
      } else {
        // Return cleanly around walls to patrol rail if displaced by a previous pursuit
        const clampX = Math.max(haz.patrolMinX, Math.min(haz.patrolMaxX, haz.x));
        const clampY = Math.max(haz.patrolMinY, Math.min(haz.patrolMaxY, haz.y));
        const offRailDist = Math.hypot(clampX - haz.x, clampY - haz.y);
        if (offRailDist > 0.12) {
          const wp = computeGridNextWaypoint(this.level.grid, haz.x, haz.y, clampX, clampY);
          const ret = computeTrapPursuitStep({
            grid: this.level.grid,
            x: haz.x,
            y: haz.y,
            targetX: wp.x,
            targetY: wp.y,
            speed: haz.speed * 1.08,
            dt,
            radius: 0.28,
            moveWithCollision: moveWithWallCollision,
          });
          haz.x = ret.x;
          haz.y = ret.y;
          haz.vx = ret.vx;
          haz.vy = ret.vy;
        } else if (haz.axis === 'x') {
          haz.vx = Math.sign(haz.vx || 1) * haz.speed;
          haz.vy = 0;
          haz.x += haz.vx * dt;
          if (haz.x >= haz.patrolMaxX) {
            haz.x = haz.patrolMaxX;
            haz.vx = -Math.abs(haz.speed);
          } else if (haz.x <= haz.patrolMinX) {
            haz.x = haz.patrolMinX;
            haz.vx = Math.abs(haz.speed);
          }
        } else {
          haz.vx = 0;
          haz.vy = Math.sign(haz.vy || 1) * haz.speed;
          haz.y += haz.vy * dt;
          if (haz.y >= haz.patrolMaxY) {
            haz.y = haz.patrolMaxY;
            haz.vy = -Math.abs(haz.speed);
          } else if (haz.y <= haz.patrolMinY) {
            haz.y = haz.patrolMinY;
            haz.vy = Math.abs(haz.speed);
          }
        }
      }

      const dToSanta = Math.hypot(haz.x - this.santaX, haz.y - this.santaY);
      if (dToSanta < haz.radius + this.santaRadius && !this.isHiding && !smokeConcealed) {
        if (this.activePowerUps.snowflake_shield > 0) {
          haz.stunTimer = 2.4;
        } else {
          haz.stunTimer = 1.6;
        }
        haz.pursuing = false;
        haz.alerted = false;
        this.takeDangerHit(haz.x, haz.y, 'Caught by a pursuing trap! Watch its tracking light!');
        if (this.finished) return;
      }
    }

    // Update Pop-Up Spike Trap Pads with Sweeping Tracking Light & Pursuit
    for (let tIdx = 0; tIdx < this.level.trapPads.length; tIdx++) {
      const tp = this.level.trapPads[tIdx];
      if (tp.stunTimer > 0) {
        tp.stunTimer = Math.max(0, tp.stunTimer - dt);
        tp.pursuing = false;
      }

      if (tp.pursuing) {
        tp.lightYaw = Math.atan2(this.santaX - tp.curX, this.santaY - tp.curY);
      } else {
        tp.lightYaw = tp.phaseOffset + this.animTime * 1.45 * (tIdx % 2 === 0 ? 1 : -1);
      }

      const touchedByPadLight =
        tp.stunTimer <= 0 &&
        isTargetTouchedByTrackingLight({
          lightX: tp.curX,
          lightY: tp.curY,
          lightYaw: tp.lightYaw,
          lightRange: tp.lightRange,
          lightHalfAngle: tp.lightHalfAngle,
          targetX: this.santaX,
          targetY: this.santaY,
          isHiding: this.isHiding,
          smokeConcealed,
          grid: this.level.grid,
        });

      const distToPad = Math.hypot(this.santaX - tp.curX, this.santaY - tp.curY);
      if (touchedByPadLight) {
        if (!tp.pursuing) {
          tp.pursuing = true;
          tp.pursuitLostTimer = 0;
          this.audio.playAlertSfx();
          this.spawnBurst(tp.curX, tp.curY, '#f43f5e', 14);
          this.spawnFloatingLabel(tp.curX, tp.curY, 'TRAP PURSUING!', '#f43f5e');
          this.showBanner('Trap tracking light spotted Santa! It is pursuing you!', 2.6);
        } else {
          tp.pursuitLostTimer = 0;
        }
      } else if (tp.pursuing) {
        const trackLoss = shouldLoseTrack({
          currentlyDetected: false,
          distance: distToPad,
          trackRange: tp.lightRange,
          lostTimer: tp.pursuitLostTimer,
          dt,
          isHiding: this.isHiding,
          smokeConcealed,
          maxLostSeconds: 2.2,
          farLostSeconds: 1.0,
        });
        tp.pursuitLostTimer = trackLoss.nextLostTimer;
        if (trackLoss.lost) {
          tp.pursuing = false;
          tp.pursuitLostTimer = 0;
          this.spawnFloatingLabel(tp.curX, tp.curY, 'BACK TO ROUTE', '#93c5fd');
        }
      }

      if (tp.pursuing) {
        const wp = computeGridNextWaypoint(
          this.level.grid,
          tp.curX,
          tp.curY,
          this.santaX,
          this.santaY
        );
        const step = computeTrapPursuitStep({
          grid: this.level.grid,
          x: tp.curX,
          y: tp.curY,
          targetX: wp.x,
          targetY: wp.y,
          speed: tp.speed,
          dt,
          radius: 0.28,
          moveWithCollision: moveWithWallCollision,
        });
        tp.curX = step.x;
        tp.curY = step.y;
      } else {
        const distHome = Math.hypot(tp.homeX - tp.curX, tp.homeY - tp.curY);
        if (distHome > 0.06) {
          const wp = computeGridNextWaypoint(this.level.grid, tp.curX, tp.curY, tp.homeX, tp.homeY);
          const ret = computeTrapPursuitStep({
            grid: this.level.grid,
            x: tp.curX,
            y: tp.curY,
            targetX: wp.x,
            targetY: wp.y,
            speed: tp.speed * 1.05,
            dt,
            radius: 0.28,
            moveWithCollision: moveWithWallCollision,
          });
          tp.curX = ret.x;
          tp.curY = ret.y;
        } else {
          tp.curX = tp.homeX;
          tp.curY = tp.homeY;
        }
      }

      const padState = getTrapPadState(this.elapsedSeconds, tp.phaseOffset, tp.cycleSeconds);
      if (tp.stunTimer <= 0 && (tp.pursuing || padState === 'active') && !this.isHiding && !smokeConcealed) {
        const dTrap = Math.hypot(tp.curX - this.santaX, tp.curY - this.santaY);
        if (dTrap < 0.48) {
          tp.stunTimer = this.activePowerUps.snowflake_shield > 0 ? 2.5 : 1.8;
          tp.pursuing = false;
          this.takeDangerHit(
            tp.curX,
            tp.curY,
            'Ouch! Caught by a pursuing spike trap! Watch out for tracking lights!'
          );
          if (this.finished) return;
        }
      }
    }

    // Update Stealth AI: Sleeping Kids, Naughty Kids, Homeowners, Security Guards
    const disguised = this.stealthAbilities.disguiseActive > 0;
    let maxSuspicion = 0;
    let anyChasing = false;

    for (const enemy of this.level.stealthEnemies) {
      const dToSanta = Math.hypot(enemy.x - this.santaX, enemy.y - this.santaY);

      // Pretend-sleeping naughty kids peek periodically; sleeping kids wake from loud noise
      const distHome = Math.hypot(enemy.homeX - enemy.x, enemy.homeY - enemy.y);
      if (enemy.role === 'sleeping_kid') {
        if (enemy.state === 'sleep') {
          if (this.noiseLevel >= 58 && dToSanta < 3.8) {
            enemy.state = 'suspicious';
            enemy.awakeTimer = 6.5;
            enemy.suspicion = 55;
            enemy.yaw = Math.atan2(this.santaX - enemy.x, this.santaY - enemy.y);
            this.spawnFloatingLabel(enemy.x, enemy.y, 'WOKE UP!', '#fde047');
          }
        } else if (enemy.state !== 'chase') {
          enemy.awakeTimer = Math.max(0, enemy.awakeTimer - dt);
          if (enemy.awakeTimer === 0 && enemy.suspicion < 10) {
            // Walk back to home spot before going back to sleep
            if (distHome <= 0.22) {
              enemy.state = 'sleep';
            } else {
              enemy.state = 'patrol';
            }
          }
        }
      } else if (enemy.role === 'naughty_kid' && enemy.pretendSleep) {
        const cycle = this.elapsedSeconds % 7.5;
        const nearRoute =
          enemy.patrolPoints.length > 0
            ? enemy.patrolPoints.some((pt) => Math.hypot(pt.x - enemy.x, pt.y - enemy.y) < 0.45)
            : distHome < 0.35;
        if (enemy.state === 'sleep' && cycle > 4.2) {
          enemy.state = 'patrol';
        } else if (enemy.state === 'patrol' && cycle <= 4.2 && enemy.suspicion < 15 && nearRoute) {
          enemy.state = 'sleep';
        }
      }

      // Loud footsteps attract nearby patrolling homeowners / guards
      if (
        enemy.state === 'patrol' &&
        this.noiseLevel >= 65 &&
        dToSanta < 4.6 &&
        !this.isHiding
      ) {
        enemy.state = 'suspicious';
        enemy.investigateX = this.santaX;
        enemy.investigateY = this.santaY;
        enemy.investigateTimer = 3.2;
        enemy.suspicion = Math.max(enemy.suspicion, 35);
      }

      const canDetect = enemy.state !== 'sleep';
      const spottedInCone =
        canDetect &&
        isPointInVisionCone({
          viewerX: enemy.x,
          viewerY: enemy.y,
          viewerYaw: enemy.yaw,
          targetX: this.santaX,
          targetY: this.santaY,
          range: enemy.visionRange,
          halfAngleRad: enemy.visionHalfAngle,
          grid: this.level.grid,
        });

      const rawDeltaSusp = computeSuspicionDelta({
        spottedInCone,
        distance: dToSanta,
        maxRange: enemy.visionRange,
        tile: currentTile,
        stance: this.stance,
        isHiding: this.isHiding,
        disguised,
        smokeConcealed,
        role: enemy.role,
        enemyState: enemy.state,
        dt,
      });
      const deltaSusp =
        rawDeltaSusp > 0 ? rawDeltaSusp * gearBonuses.suspicionMultiplier : rawDeltaSusp;

      enemy.suspicion = Math.max(0, Math.min(100, enemy.suspicion + deltaSusp));

      if (enemy.suspicion >= 100 && enemy.state !== 'chase') {
        enemy.state = 'chase';
        enemy.chaseLostTimer = 0;
        enemy.investigateX = this.santaX;
        enemy.investigateY = this.santaY;
        this.audio.playAlertSfx();
        this.spawnFloatingLabel(enemy.x, enemy.y, '! SPOTTED !', '#f43f5e');
        this.showBanner('SPOTTED! Run, break sight, or hide in cover [E]!', 2.8);
      } else if (enemy.state === 'chase') {
        const activelySeeingSanta = spottedInCone && !this.isHiding && !smokeConcealed;
        if (activelySeeingSanta) {
          enemy.investigateX = this.santaX;
          enemy.investigateY = this.santaY;
        }
        const trackLoss = shouldLoseTrack({
          currentlyDetected: activelySeeingSanta,
          distance: dToSanta,
          trackRange: enemy.visionRange,
          lostTimer: enemy.chaseLostTimer,
          dt,
          isHiding: this.isHiding,
          smokeConcealed,
          maxLostSeconds: 2.2,
          farLostSeconds: 0.95,
        });
        enemy.chaseLostTimer = trackLoss.nextLostTimer;
        if (trackLoss.lost) {
          enemy.state = 'patrol';
          enemy.suspicion = 15;
          enemy.chaseLostTimer = 0;
          enemy.patrolIndex = findNearestPatrolIndex(enemy.patrolPoints, enemy.x, enemy.y);
          this.spawnFloatingLabel(enemy.x, enemy.y, 'BACK TO ROUTE', '#93c5fd');
        }
      }

      // Enemy Movement (BFS waypoint-guided when chasing or returning to route around walls)
      let targetX = enemy.x;
      let targetY = enemy.y;
      let moveSpd = enemy.baseSpeed;
      let shouldMove = false;
      let usePathSteering = false;

      if (enemy.state === 'chase') {
        targetX = spottedInCone ? this.santaX : enemy.investigateX;
        targetY = spottedInCone ? this.santaY : enemy.investigateY;
        moveSpd = enemy.baseSpeed * 1.42;
        shouldMove = Math.hypot(targetX - enemy.x, targetY - enemy.y) > 0.12;
        usePathSteering = true;
      } else if (enemy.state === 'distracted' || enemy.state === 'suspicious') {
        targetX = enemy.investigateX;
        targetY = enemy.investigateY;
        moveSpd = enemy.baseSpeed * 1.05;
        shouldMove = Math.hypot(targetX - enemy.x, targetY - enemy.y) > 0.25;
        usePathSteering = true;
        enemy.investigateTimer -= dt;
        if (enemy.investigateTimer <= 0 && enemy.suspicion < 25) {
          enemy.state = 'patrol';
          enemy.patrolIndex = findNearestPatrolIndex(enemy.patrolPoints, enemy.x, enemy.y);
        }
      } else if (enemy.state === 'patrol' && enemy.patrolPoints.length > 1) {
        const wp = enemy.patrolPoints[enemy.patrolIndex % enemy.patrolPoints.length];
        targetX = wp.x;
        targetY = wp.y;
        shouldMove = true;
        usePathSteering = true;
        if (Math.hypot(targetX - enemy.x, targetY - enemy.y) < 0.24) {
          enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrolPoints.length;
        }
      } else if (enemy.state === 'patrol' && distHome > 0.2) {
        // Stationary guards / sleepers displaced from home walk cleanly back to their route post
        targetX = enemy.homeX;
        targetY = enemy.homeY;
        shouldMove = true;
        usePathSteering = true;
      } else if (enemy.role === 'sleeping_kid' && enemy.state !== 'sleep') {
        // Turns gently to look around when woken at home post
        enemy.yaw += dt * 1.6;
      }

      if (shouldMove) {
        const steerTarget = usePathSteering
          ? computeGridNextWaypoint(this.level.grid, enemy.x, enemy.y, targetX, targetY)
          : { x: targetX, y: targetY };
        const step = computeTrapPursuitStep({
          grid: this.level.grid,
          x: enemy.x,
          y: enemy.y,
          targetX: steerTarget.x,
          targetY: steerTarget.y,
          speed: moveSpd,
          dt,
          radius: 0.28,
          moveWithCollision: moveWithWallCollision,
        });
        const movedDx = step.x - enemy.x;
        const movedDy = step.y - enemy.y;
        if (Math.hypot(movedDx, movedDy) > 0.001) {
          enemy.yaw = Math.atan2(movedDx, movedDy);
        }
        enemy.x = step.x;
        enemy.y = step.y;
      }

      if (enemy.state === 'chase') {
        anyChasing = true;
        if (
          dToSanta < 0.58 &&
          !this.isHiding &&
          !smokeConcealed &&
          !this.enemyHitCooldown.has(enemy.id)
        ) {
          this.enemyHitCooldown.set(enemy.id, 2.2);
          this.takeDangerHit(
            enemy.x,
            enemy.y,
            'Caught by a patrol! Hide [E] or toss a Bell Decoy [Q]!'
          );
          if (this.finished) return;
        }
      }

      maxSuspicion = Math.max(maxSuspicion, enemy.suspicion);
    }

    // Security Cameras Sweep & Detection
    let cameraSawSanta = false;
    for (const cam of this.level.securityCameras) {
      if (cam.disabledTimer > 0) {
        cam.disabledTimer = Math.max(0, cam.disabledTimer - dt);
        continue;
      }
      cam.currentYaw = cam.baseYaw + Math.sin(this.animTime * cam.speed) * cam.sweepAngle;
      const inCam =
        !this.isHiding &&
        !disguised &&
        !smokeConcealed &&
        isPointInVisionCone({
          viewerX: cam.x,
          viewerY: cam.y,
          viewerYaw: cam.currentYaw,
          targetX: this.santaX,
          targetY: this.santaY,
          range: cam.range,
          halfAngleRad: cam.halfAngle,
          grid: this.level.grid,
        });
      if (inCam) {
        cameraSawSanta = true;
      }
    }
    if (cameraSawSanta) {
      this.cameraSuspicion = Math.min(100, this.cameraSuspicion + 75 * dt);
      if (this.cameraSuspicion >= 100) {
        this.cameraSuspicion = 45;
        this.audio.playAlertSfx();
        this.spawnFloatingLabel(this.santaX, this.santaY, 'CAMERA ALARM!', '#f43f5e');
        this.showBanner('Security Camera spotted Santa! Nearby patrols alerted!', 2.6);
        for (const e of this.level.stealthEnemies) {
          if (Math.hypot(e.x - this.santaX, e.y - this.santaY) < 9.5) {
            e.state = 'suspicious';
            e.investigateX = this.santaX;
            e.investigateY = this.santaY;
            e.investigateTimer = 5.0;
            e.suspicion = Math.max(e.suspicion, 75);
          }
        }
      }
    } else {
      this.cameraSuspicion = Math.max(0, this.cameraSuspicion - 35 * dt);
    }

    // Cycling Laser Security Beams
    for (const lb of this.level.laserBarriers) {
      const active = isLaserBarrierActive(
        this.elapsedSeconds,
        lb.cycleSeconds,
        lb.phaseOffset,
        lb.disabledBySwitch
      );
      if (
        active &&
        !this.isHiding &&
        !smokeConcealed &&
        this.activePowerUps.christmas_wings <= 0
      ) {
        const dBeam = distancePointToSegment(
          this.santaX,
          this.santaY,
          lb.x1,
          lb.y1,
          lb.x2,
          lb.y2
        );
        if (dBeam < 0.34) {
          this.audio.playAlertSfx();
          this.takeDangerHit(
            (lb.x1 + lb.x2) * 0.5,
            (lb.y1 + lb.y2) * 0.5,
            'Tripped a Security Laser! Wait for the cycle or glide with Wings!'
          );
          if (this.finished) return;
        }
      }
    }

    this.suspicionLevel = Math.round(Math.max(maxSuspicion, this.cameraSuspicion));
    if (this.wasChased && !anyChasing) {
      this.audio.playEscapeSfx();
      this.score += 50;
      this.spawnFloatingLabel(this.santaX, this.santaY, 'ESCAPED +50!', '#34d399');
      this.showBanner('Clean Escape! Patrolling guards lost Santa!', 2.4);
    }
    this.wasChased = anyChasing;

    // Update Wall-Mounted Snowball Launchers & Active Projectiles
    for (const ln of this.level.launchers) {
      ln.cooldown -= dt;
      if (ln.cooldown <= 0) {
        ln.cooldown = ln.interval;
        const proj = this.projectiles.find((p) => !p.active);
        if (proj) {
          proj.active = true;
          proj.x = ln.x + 0.5 + ln.dirX * 0.65;
          proj.y = ln.y + 0.5 + ln.dirY * 0.65;
          proj.vx = ln.dirX * 4.6;
          proj.vy = ln.dirY * 4.6;
          proj.life = 4.5;
          proj.mesh.visible = true;
        }
      }
    }

    for (const proj of this.projectiles) {
      if (!proj.active) continue;
      proj.life -= dt;
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      const gx = Math.floor(proj.x);
      const gy = Math.floor(proj.y);
      const tile = this.level.grid[gy]?.[gx];
      if (proj.life <= 0 || !tile || tile === 'wall' || tile === 'secret_wall') {
        proj.active = false;
        proj.mesh.visible = false;
        this.spawnBurst(proj.x, proj.y, '#e0f2fe', 7);
        continue;
      }
      if (Math.hypot(proj.x - this.santaX, proj.y - this.santaY) < 0.42) {
        proj.active = false;
        proj.mesh.visible = false;
        this.takeDangerHit(proj.x, proj.y, 'Bonk! Dodging launched prankster snowballs!');
        if (this.finished) return;
      }
    }

    // Elf Helper auto-collects nearby real cookies
    if (this.activePowerUps.elf_helper > 0) {
      this.helperElfGroup.visible = true;
      this.helperElfX +=
        (this.santaX + Math.cos(this.animTime * 4) * 0.95 - this.helperElfX) *
        Math.min(1, dt * 8);
      this.helperElfY +=
        (this.santaY + Math.sin(this.animTime * 4) * 0.95 - this.helperElfY) *
        Math.min(1, dt * 8);
      for (const c of this.level.cookies) {
        if (
          c.isReal &&
          !c.collected &&
          Math.hypot(c.x + 0.5 - this.santaX, c.y + 0.5 - this.santaY) < 2.2
        ) {
          this.collectRealCookie(c);
        }
      }
    } else {
      this.helperElfGroup.visible = false;
    }

    // Check Cookies
    for (const c of this.level.cookies) {
      if (c.collected || c.triggered) continue;
      const cx = c.x + 0.5;
      const cy = c.y + 0.5;
      const dist = Math.hypot(cx - this.santaX, cy - this.santaY);

      if (!c.isReal && c.kind === 'vanishing' && dist < 1.35 && !c.disappearTimer) {
        c.disappearTimer = 0.35;
      }
      if (c.disappearTimer !== undefined) {
        c.disappearTimer -= dt;
        if (c.disappearTimer <= 0) {
          c.triggered = true;
          const m = this.cookieMeshes.get(c.id);
          if (m) m.visible = false;
          this.spawnBurst(cx, cy, '#cbd5e1', 8);
          this.spawnFloatingLabel(cx, cy, 'VANISHED!', '#94a3b8');
          continue;
        }
      }

      if (dist < 0.62 * gearBonuses.pickupRadiusMultiplier) {
        if (c.isReal) {
          this.collectRealCookie(c);
        } else {
          this.triggerFakeCookie(c);
        }
      }
    }

    // Check Keys (House Keys & Mission Gate Keys)
    for (const k of this.level.keys) {
      if (k.collected) continue;
      if (Math.hypot(k.x + 0.5 - this.santaX, k.y + 0.5 - this.santaY) < 0.66) {
        k.collected = true;
        const km = this.keyMeshes.get(k.id);
        if (km) km.visible = false;
        this.score += 75;
        this.audio.playPowerUp();
        if (k.kind === 'gate') {
          this.heldGateKeys.add(k.id);
          this.spawnBurst(k.x + 0.5, k.y + 0.5, '#34d399', 16);
          this.spawnFloatingLabel(
            k.x + 0.5,
            k.y + 0.5,
            `GATE KEY ${this.heldGateKeys.size}/${this.level.requiredGateKeys}!`,
            '#34d399'
          );
          const remaining = Math.max(0, this.level.requiredGateKeys - this.heldGateKeys.size);
          if (remaining > 0) {
            this.showBanner(`Found ${k.label}! Find ${remaining} more Gate Key(s) to open the Gate!`, 3.0);
          } else {
            this.showBanner('All Gate Keys collected! Finish objectives or clear a mission to open the Gate!', 3.2);
          }
          this.checkPortalUnlock();
          this.emitHud();
        } else {
          this.heldKeys.add(k.id);
          this.spawnBurst(k.x + 0.5, k.y + 0.5, '#fbbf24', 14);
          this.spawnFloatingLabel(k.x + 0.5, k.y + 0.5, 'HOUSE KEY FOUND!', '#fde047');
          this.showBanner(`Picked up ${k.label}! Find the locked house!`, 2.8);
          this.emitHud();
        }
      }
    }

    // Check Secret Switches
    for (const sw of this.level.switches) {
      if (sw.activated) continue;
      if (Math.hypot(sw.x + 0.5 - this.santaX, sw.y + 0.5 - this.santaY) < 0.68) {
        sw.activated = true;
        for (const t of sw.unlocksTiles) {
          this.level.grid[t.y][t.x] = 'secret_floor';
          const wm = this.secretWallMeshes.get(`${t.x},${t.y}`);
          if (wm) wm.visible = false;
          this.spawnBurst(t.x + 0.5, t.y + 0.5, '#fde047', 16);
        }
        this.score += 100;
        this.audio.playSecretUnlock();
        this.spawnFloatingLabel(sw.x + 0.5, sw.y + 0.5, 'SECRET DOOR OPEN!', '#34d399');
        this.showBanner('Hidden wall switch flipped! Secret room passage opened!', 3.2);
      }
    }

    // Check In-Maze Teleportation Portals
    if (this.level.portals && this.level.portals.length >= 2) {
      for (const p of this.level.portals) {
        const pd = Math.hypot(p.x + 0.5 - this.santaX, p.y + 0.5 - this.santaY);
        if (pd < 0.55 && this.teleportCooldown <= 0) {
          const target = this.level.portals.find((tp) => tp.id !== p.id);
          if (target) {
            this.santaX = target.x + 0.5;
            this.santaY = target.y + 0.5;
            this.teleportCooldown = 1.25;
            this.audio.playPortalUnlock();
            this.spawnBurst(target.x + 0.5, target.y + 0.5, '#38bdf8', 22);
            this.spawnFloatingLabel(target.x + 0.5, target.y + 0.5, 'TELEPORTED!', '#38bdf8');
            this.showBanner('Whoosh! Teleported across the North Pole maze!', 2.2);
            break;
          }
        }
      }
    }

    // Check Power-Ups
    for (const pu of this.level.powerUps) {
      if (pu.collected) continue;
      if (Math.hypot(pu.x + 0.5 - this.santaX, pu.y + 0.5 - this.santaY) < 0.64) {
        pu.collected = true;
        const pm = this.powerUpMeshes.get(pu.id);
        if (pm) pm.visible = false;
        const info = getPowerUpInfo(pu.kind);
        this.activePowerUps[pu.kind] = info.duration;
        if (pu.kind === 'magical_milk' && this.hearts < this.maxHearts) {
          this.hearts++;
        }
        this.score += 50;
        this.audio.playPowerUp();
        this.spawnBurst(pu.x + 0.5, pu.y + 0.5, '#38bdf8', 16);
        this.spawnFloatingLabel(pu.x + 0.5, pu.y + 0.5, info.name.toUpperCase() + '!', '#38bdf8');
        this.showBanner(`${info.name}: ${info.effect}!`, 2.6);
      }
    }

    // Check Golden Present
    if (this.level.goldenPresent && !this.level.goldenPresent.found) {
      const gp = this.level.goldenPresent;
      if (Math.hypot(gp.x + 0.5 - this.santaX, gp.y + 0.5 - this.santaY) < 0.68) {
        gp.found = true;
        if (this.goldenPresentGroup) this.goldenPresentGroup.visible = false;
        this.goldenPresentFound = true;
        this.score += 250;
        this.niceMeter = Math.min(100, this.niceMeter + 8);
        this.audio.playSecretUnlock();
        this.spawnBurst(gp.x + 0.5, gp.y + 0.5, '#fbbf24', 24);
        this.spawnFloatingLabel(gp.x + 0.5, gp.y + 0.5, 'GOLDEN PRESENT +250!', '#fde047');
        this.showBanner('Found the Missing Golden Present! Bonus +250 pts!', 3.2);
        this.callbacks.onMissionEvent?.({ type: 'golden_present' });
      }
    }

    // Check Mystery Elf
    if (this.level.mysteryElf && !this.level.mysteryElf.helped) {
      const elf = this.level.mysteryElf;
      if (Math.hypot(elf.x + 0.5 - this.santaX, elf.y + 0.5 - this.santaY) < 0.88) {
        elf.helped = true;
        this.elfHelped = true;
        const info = getPowerUpInfo(elf.bonusPowerUp);
        this.activePowerUps[elf.bonusPowerUp] = info.duration;
        this.niceMeter = Math.min(100, this.niceMeter + 6);
        this.score += 100;
        this.elfClue = elf.clueText;
        this.elfClueTimer = 6.0;
        this.audio.playPowerUp();
        this.spawnBurst(elf.x + 0.5, elf.y + 0.5, '#34d399', 16);
        this.spawnFloatingLabel(elf.x + 0.5, elf.y + 0.5, `ELF GIFT: ${info.name}!`, '#34d399');
        this.callbacks.onMissionEvent?.({ type: 'elf' });
      }
    }

    // Check Delivery Houses
    for (const h of this.level.houses) {
      if (h.delivered) continue;
      const dist = Math.hypot(h.x + 0.5 - this.santaX, h.y + 0.5 - this.santaY);
      const triggerRange = this.actionQueued ? 1.2 : 0.78;
      if (dist < triggerRange) {
        if (canDeliverToHouse(h, this.heldKeys)) {
          h.delivered = true;
          h.lightProgress = 0.05;
          if (!h.isSecretBonus) {
            this.deliveriesDone++;
          }
          this.score += h.isSecretBonus ? 200 : 120;
          this.niceMeter = Math.min(100, this.niceMeter + 5);
          this.santaSquash = 1.22;
          this.audio.playDeliveryComplete();
          this.spawnBurst(h.x + 0.5, h.y + 0.5, '#4ade80', 22);
          this.spawnFloatingLabel(h.x + 0.5, h.y + 0.5, 'DELIVERY COMPLETE!', '#4ade80');
          this.showBanner(`Delivered present to ${h.name}!`, 2.6);
          this.actionQueued = false;
          this.callbacks.onMissionEvent?.({ type: 'delivery' });
          this.checkPortalUnlock();
        } else if (dist < 0.88 || this.actionQueued) {
          this.showBanner('Locked! Find the Golden House Key first!', 2.2);
        }
      }
    }

    // Check Chimney Warps
    if (this.actionQueued) {
      for (const ch of this.level.chimneys) {
        const dEntry = Math.hypot(ch.entryX + 0.5 - this.santaX, ch.entryY + 0.5 - this.santaY);
        const dExit = Math.hypot(ch.exitX + 0.5 - this.santaX, ch.exitY + 0.5 - this.santaY);
        if (dEntry < 0.9) {
          this.santaX = ch.exitX + 0.5;
          this.santaY = ch.exitY + 0.5;
          this.audio.playPowerUp();
          this.spawnBurst(this.santaX, this.santaY, '#f97316', 16);
          this.spawnFloatingLabel(this.santaX, this.santaY, 'ROOFTOP HOP!', '#fdba74');
          this.actionQueued = false;
          break;
        } else if (dExit < 0.9) {
          this.santaX = ch.entryX + 0.5;
          this.santaY = ch.entryY + 0.5;
          this.audio.playPowerUp();
          this.spawnBurst(this.santaX, this.santaY, '#f97316', 16);
          this.actionQueued = false;
          break;
        }
      }
    }

    // Dodge Dash on Shift OR Space when not consumed by house/chimney
    if ((this.dashQueued || this.actionQueued) && this.dashCooldown <= 0 && this.dashTimer <= 0) {
      const hasPowerDash = this.activePowerUps.reindeer_dash > 0;
      this.dashTimer = hasPowerDash ? 0.44 : 0.32;
      this.dashCooldown = hasPowerDash ? 0.9 : 2.3;
      this.santaSquash = 1.24;
      this.audio.playPowerUp();
      this.spawnBurst(this.santaX, this.santaY, '#fde047', 12);
      this.spawnFloatingLabel(this.santaX, this.santaY, 'SNOW DASH!', '#fde047');
    }
    this.actionQueued = false;
    this.dashQueued = false;

    // Check Portal Entry
    const dPortal = Math.hypot(
      this.level.portal.x + 0.5 - this.santaX,
      this.level.portal.y + 0.5 - this.santaY
    );
    if (this.portalUnlocked && dPortal < 0.78) {
      this.finishLevel(true);
      return;
    }

    this.hudSyncTimer += dt;
    if (this.hudSyncTimer >= 0.1) {
      this.hudSyncTimer = 0;
      this.emitHud();
    }
  }

  private collectRealCookie(c: LevelInstance['cookies'][number]) {
    c.collected = true;
    const cm = this.cookieMeshes.get(c.id);
    if (cm) cm.visible = false;
    this.realCookiesCollected++;
    this.score += 35;
    this.niceMeter = Math.min(100, this.niceMeter + 1);
    this.santaSquash = 1.15;
    this.audio.playCookieCollect(this.realCookiesCollected % 6);
    this.spawnBurst(c.x + 0.5, c.y + 0.5, '#fbbf24', 10);
    this.spawnFloatingLabel(c.x + 0.5, c.y + 0.5, '+1 COOKIE', '#fde047');
    this.callbacks.onMissionEvent?.({ type: 'cookie' });
    this.checkPortalUnlock();
    this.emitHud();
  }

  private triggerFakeCookie(c: LevelInstance['cookies'][number]) {
    c.triggered = true;
    const cm = this.cookieMeshes.get(c.id);
    if (cm) cm.visible = false;
    const cx = c.x + 0.5;
    const cy = c.y + 0.5;
    if (this.activePowerUps.snowflake_shield > 0) {
      this.activePowerUps.snowflake_shield = 0;
      this.audio.playShieldBlock();
      this.spawnBurst(cx, cy, '#7dd3fc', 14);
      this.spawnFloatingLabel(cx, cy, 'SHIELDED PRANK!', '#7dd3fc');
      this.showBanner('Snowflake Shield blocked a fake trap cookie!', 2.2);
      this.emitHud();
      return;
    }

    const penalty = getFakeCookiePenalty(c.kind as Parameters<typeof getFakeCookiePenalty>[0]);
    this.trapsTriggered++;
    this.slowTimer = penalty.slowDuration;
    this.slowFactor = penalty.slowFactor;
    this.niceMeter = Math.max(0, this.niceMeter + penalty.niceDelta);
    this.score = Math.max(0, this.score + penalty.scoreDelta);
    this.shakeTrauma = 0.55;
    this.hitstopTimer = 0.04;
    this.santaSquash = 0.8;
    this.audio.playTrapHit();
    this.spawnBurst(cx, cy, '#f43f5e', 18);
    this.spawnFloatingLabel(cx, cy, 'FAKE TRAP!', '#fda4af');
    this.showBanner(penalty.label, 2.4);
    this.emitHud();
  }

  public notifyMissionCleared(missionTitle: string, coinsAwarded: number) {
    if (this.finished) return;
    this.missionClearedInLevel = true;
    this.spawnBurst(this.santaX, this.santaY, '#34d399', 22);
    this.spawnFloatingLabel(
      this.santaX,
      this.santaY,
      coinsAwarded > 0 ? `MISSION CLEARED +${coinsAwarded} COINS!` : 'MISSION CLEARED!',
      '#34d399'
    );
    this.checkPortalUnlock();
    if (!this.portalUnlocked) {
      const rem = Math.max(0, this.level.requiredGateKeys - this.heldGateKeys.size);
      this.audio.playSecretUnlock();
      this.showBanner(
        `Mission Cleared (${missionTitle})! Find ${rem} Gate Key(s) to open the Gate to the next level!`,
        4.5
      );
    }
    this.emitHud();
  }

  private checkPortalUnlock() {
    if (this.portalUnlocked) return;
    const unlocked = isPortalUnlocked(
      this.realCookiesCollected,
      this.level.city.requiredCookies,
      this.deliveriesDone,
      this.level.city.requiredDeliveries,
      this.heldGateKeys.size,
      this.level.requiredGateKeys,
      this.missionClearedInLevel
    );
    if (unlocked) {
      this.portalUnlocked = true;
      this.audio.playPortalUnlock();
      this.spawnBurst(this.level.portal.x + 0.5, this.level.portal.y + 0.5, '#34d399', 28);
      this.spawnFloatingLabel(this.level.portal.x + 0.5, this.level.portal.y + 0.5, 'GATE OPEN!', '#34d399');
      this.showBanner(
        `Mission Gate Unlocked! Step through the Gate to reach ${this.level.city.nextCityLabel}!`,
        4.5
      );
      this.emitHud();
      return;
    }

    const objectivesDone =
      this.missionClearedInLevel ||
      (this.realCookiesCollected >= this.level.city.requiredCookies &&
        this.deliveriesDone >= this.level.city.requiredDeliveries);
    const remKeys = Math.max(0, this.level.requiredGateKeys - this.heldGateKeys.size);
    if (objectivesDone && remKeys > 0) {
      this.showBanner(
        `Mission Ready! Collect ${remKeys} more Gate Key(s) to unlock the Gate to the next level!`,
        4.0
      );
    }
  }

  private finishLevel(won: boolean, defeatReason?: 'timeout' | 'hearts') {
    if (this.finished) return;
    this.finished = true;
    this.audio.stopMusic();
    if (won) {
      this.audio.playVictory();
      if (!this.progress.settings.reducedMotion) {
        this.spawnConfettiBurst3D(this.santaX, this.santaY, 54);
      }
    } else {
      this.audio.playDefeat();
    }

    const summary = calculateLevelSummary({
      cityIndex: this.level.city.index,
      cityName: this.level.city.city,
      difficulty: this.level.difficulty,
      baseScore: this.score,
      realCookiesCollected: this.realCookiesCollected,
      requiredCookies: this.level.city.requiredCookies,
      deliveriesCompleted: this.deliveriesDone,
      requiredDeliveries: this.level.city.requiredDeliveries,
      trapsTriggered: this.trapsTriggered,
      secretRoomsFound: this.secretRoomsFound,
      goldenPresentFound: this.goldenPresentFound,
      elfHelped: this.elfHelped,
      niceMeter: this.niceMeter,
      elapsedSeconds: this.elapsedSeconds,
      won,
      defeatReason,
    });

    this.emitHud();
    this.callbacks.onLevelComplete(summary);
  }

  private getNearbyPrompt(): string | null {
    if (this.isHiding) {
      return 'E or Move · Exit Cover';
    }
    for (const hs of this.level.hidingSpots) {
      if (Math.hypot(hs.x + 0.5 - this.santaX, hs.y + 0.5 - this.santaY) < 1.15) {
        return `E · Hide in ${hs.label}`;
      }
    }
    for (const h of this.level.houses) {
      if (!h.delivered && Math.hypot(h.x + 0.5 - this.santaX, h.y + 0.5 - this.santaY) < 1.35) {
        if (h.requiresKeyId && !this.heldKeys.has(h.requiresKeyId)) {
          return 'Locked House · Find Golden Key';
        }
        return `Space · Deliver to ${h.name}`;
      }
    }
    for (const ch of this.level.chimneys) {
      const d1 = Math.hypot(ch.entryX + 0.5 - this.santaX, ch.entryY + 0.5 - this.santaY);
      const d2 = Math.hypot(ch.exitX + 0.5 - this.santaX, ch.exitY + 0.5 - this.santaY);
      if (d1 < 1.05 || d2 < 1.05) {
        return 'Space · Hop Through Magic Chimney';
      }
    }
    return null;
  }

  private buildMiniMap(): MiniMapSnapshot {
    return {
      cols: this.level.cols,
      rows: this.level.rows,
      grid: this.level.grid,
      santa: { x: this.santaX, y: this.santaY },
      portal: { x: this.level.portal.x + 0.5, y: this.level.portal.y + 0.5 },
      portalUnlocked: this.portalUnlocked,
      houses: this.level.houses
        .filter((h) => !h.isSecretBonus)
        .map((h) => ({ x: h.x + 0.5, y: h.y + 0.5, delivered: h.delivered })),
      gateKeys: this.level.keys
        .filter((k) => k.kind === 'gate')
        .map((k) => ({ x: k.x + 0.5, y: k.y + 0.5, collected: k.collected })),
      hidingSpots: this.level.hidingSpots.map((hs) => ({ x: hs.x + 0.5, y: hs.y + 0.5 })),
      enemies: this.level.stealthEnemies.map((e) => ({
        x: e.x,
        y: e.y,
        state: e.state,
        role: e.role,
      })),
    };
  }

  private emitHud() {
    const houseKeysTotal = this.level.keys.filter((k) => k.kind === 'house').length;
    const currentTile = this.level.grid[Math.floor(this.santaY)]?.[Math.floor(this.santaX)];
    const isChased =
      this.level.stealthEnemies.some((e) => e.state === 'chase') ||
      this.level.hazards.some((h) => h.pursuing) ||
      this.level.trapPads.some((tp) => tp.pursuing);

    this.callbacks.onHudUpdate({
      cityIndex: this.level.city.index,
      cityName: this.level.city.city,
      subtitle: this.level.city.subtitle,
      difficulty: this.level.difficulty,
      realCookies: this.realCookiesCollected,
      requiredCookies: this.level.city.requiredCookies,
      deliveriesDone: this.deliveriesDone,
      requiredDeliveries: this.level.city.requiredDeliveries,
      totalHouses: this.level.houses.length,
      keysHeld: this.heldKeys.size,
      totalKeys: houseKeysTotal,
      gateKeysHeld: this.heldGateKeys.size,
      requiredGateKeys: this.level.requiredGateKeys,
      missionCleared: this.missionClearedInLevel,
      niceMeter: Math.round(this.niceMeter),
      score: Math.round(this.score),
      coinsEarned: Math.round(this.realCookiesCollected * 2 + this.deliveriesDone * 5),
      trapsTriggered: this.trapsTriggered,
      secretRoomsFound: this.secretRoomsFound,
      portalUnlocked: this.portalUnlocked,
      countdownRemaining: this.countdownRemaining,
      elapsedSeconds: Math.round(this.elapsedSeconds),
      activePowerUps: { ...this.activePowerUps },
      nearbyPrompt: this.getNearbyPrompt(),
      statusBanner: this.statusBanner,
      elfClue: this.elfClue,
      santaSpeedPenalty: this.slowTimer > 0 ? this.slowFactor : 1,
      goldenPresentFound: this.goldenPresentFound,
      hearts: this.hearts,
      maxHearts: this.maxHearts,
      dashReady: this.dashCooldown <= 0,
      dashCooldownRatio: Math.max(0, Math.min(1, this.dashCooldown / 2.3)),
      stance: this.stance,
      noiseLevel: Math.round(this.noiseLevel),
      suspicionLevel: this.suspicionLevel,
      surfaceLabel: getSurfaceLabel(currentTile),
      inShadow: currentTile === 'shadow',
      isHiding: this.isHiding,
      isChased,
      disguised: this.stealthAbilities.disguiseActive > 0,
      stealthAbilities: { ...this.stealthAbilities },
      miniMap: this.buildMiniMap(),
    });
  }

  private updateParticles(dt: number) {
    if (this.weatherPoints && !this.progress.settings.reducedMotion) {
      const posAttr = this.weatherPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
      const cx = this.camTargetX;
      const cz = this.camTargetZ;
      const hx = this.snowBoxHalfX;
      const hz = this.snowBoxHalfZ;
      for (let i = 0; i < this.snowCount; i++) {
        const phase = this.weatherDriftPhases[i];
        let x = posAttr.getX(i) + (0.28 + Math.sin(this.animTime * 1.4 + phase) * 0.42) * dt;
        let y = posAttr.getY(i) - this.weatherVelocities[i] * dt;
        let z = posAttr.getZ(i) + Math.cos(this.animTime * 1.1 + phase) * 0.24 * dt;

        if (y < 0.12) {
          y = 9.4 + (i % 7) * 0.1;
          x = cx + (Math.random() * 2 - 1) * hx;
          z = cz + (Math.random() * 2 - 1) * hz;
        } else {
          x = wrapSnowflakeCoord(x, cx, hx);
          z = wrapSnowflakeCoord(z, cz, hz);
        }
        posAttr.setXYZ(i, x, y, z);
      }
      posAttr.needsUpdate = true;
    }

    for (const b of this.burstParticles) {
      if (!b.active) continue;
      b.life -= dt;
      if (b.life <= 0) {
        b.active = false;
        b.mesh.visible = false;
        continue;
      }
      const isConfetti = b.maxLife > 0.9;
      b.vy -= (isConfetti ? 4.4 : 7.5) * dt;
      if (isConfetti) {
        b.vx *= Math.pow(0.98, dt * 60);
        b.vz *= Math.pow(0.98, dt * 60);
      }
      b.mesh.position.x += b.vx * dt;
      b.mesh.position.y = Math.max(0.05, b.mesh.position.y + b.vy * dt);
      b.mesh.position.z += b.vz * dt;
      b.mesh.scale.setScalar(Math.max(0.18, b.life / b.maxLife));
    }

    for (const l of this.labels) {
      if (!l.active) continue;
      l.life -= dt;
      l.wy += dt * 0.85;
      if (l.life <= 0) {
        l.active = false;
        l.el.style.display = 'none';
      }
    }
  }

  private syncActorTransforms() {
    const t = this.animTime;
    const cx = this.camTargetX;
    const cz = this.camTargetZ;
    const rangeCfg = get3dRenderRangeConfig(this.cameraMode, this.isCompactViewport);
    const cullR = rangeCfg.cullRadius;

    // Keep compact directional shadow frustum centered near Santa (snapped to 0.5m grid to avoid shimmer)
    if (this.sunLight && !this.isSoftwareGl) {
      const sx = Math.round(cx * 2) * 0.5;
      const sz = Math.round(cz * 2) * 0.5;
      this.sunLight.position.set(sx + 8, 18, sz + 10);
      this.sunLight.target.position.set(sx, 0, sz);
      this.sunLight.target.updateMatrixWorld();
    }

    // Distance-cull outer landmark & static chimney pads
    if (this.landmarkGroup) {
      this.landmarkGroup.visible = isWithinRenderRange(
        this.landmarkGroup.position.x,
        this.landmarkGroup.position.z,
        cx,
        cz,
        cullR + 3.5
      );
    }
    for (const ch of this.chimneyMeshes) {
      ch.mesh.visible = isWithinRenderRange(ch.x, ch.z, cx, cz, cullR);
    }

    // Santa transform + bob + blink on invulnerability
    const blinkHide = this.invulnTimer > 0 && Math.floor(t * 14) % 2 === 0;
    this.santaGroup.visible = !blinkHide;
    this.santaGroup.position.set(this.santaX, 0, this.santaY);
    this.santaGroup.rotation.y = this.santaYaw;

    const actor = this.santaGroup.userData.actor as THREE.Group;
    const disguiseBox = this.santaGroup.userData.disguiseBox as THREE.Group | undefined;
    const isDisguised = this.stealthAbilities.disguiseActive > 0;
    if (disguiseBox) {
      disguiseBox.visible = isDisguised && !this.isHiding;
    }
    if (actor) {
      actor.visible = !isDisguised && !this.isHiding;
      const stride = Math.sin(this.santaWalkDist * 7.5);
      const crouchY = this.stance === 'sneak' ? 0.84 : 1.0;
      actor.position.y = Math.abs(stride) * 0.06;
      actor.scale.set(
        2 - this.santaSquash,
        this.santaSquash * crouchY,
        2 - this.santaSquash
      );
      const lb = this.santaGroup.userData.leftBoot as THREE.Mesh;
      const rb = this.santaGroup.userData.rightBoot as THREE.Mesh;
      const la = this.santaGroup.userData.leftArm as THREE.Mesh;
      const ra = this.santaGroup.userData.rightArm as THREE.Mesh;
      if (lb && rb) {
        lb.position.z = 0.02 + stride * 0.08;
        rb.position.z = 0.02 - stride * 0.08;
      }
      if (la && ra) {
        la.rotation.x = -stride * 0.55;
        ra.rotation.x = stride * 0.55;
      }
      const shieldMesh = this.santaGroup.userData.shieldMesh as THREE.Mesh;
      if (shieldMesh) {
        shieldMesh.visible = this.activePowerUps.snowflake_shield > 0;
        shieldMesh.rotation.y = t * 1.4;
      }
      const wingsGroup = this.santaGroup.userData.wingsGroup as THREE.Group;
      if (wingsGroup) {
        wingsGroup.visible = this.activePowerUps.christmas_wings > 0;
      }
    }

    // Reindeer trailing Santa
    this.reindeerGroup.position.set(
      this.reindeerX,
      Math.abs(Math.sin(t * 6)) * 0.05,
      this.reindeerY
    );
    this.reindeerGroup.rotation.y = Math.atan2(
      this.santaX - this.reindeerX,
      this.santaY - this.reindeerY
    );

    // Helper Elf
    if (this.helperElfGroup.visible) {
      this.helperElfGroup.position.set(
        this.helperElfX,
        0.15 + Math.sin(t * 6) * 0.08,
        this.helperElfY
      );
      this.helperElfGroup.rotation.y = t * 2.5;
    }

    // Mystery Elf
    if (this.mysteryElfGroup && this.level.mysteryElf) {
      const inRange = isWithinRenderRange(
        this.level.mysteryElf.x + 0.5,
        this.level.mysteryElf.y + 0.5,
        cx,
        cz,
        cullR
      );
      this.mysteryElfGroup.visible = inRange;
      if (inRange) {
        this.mysteryElfGroup.position.y = this.level.mysteryElf.helped
          ? 0
          : Math.abs(Math.sin(t * 3.5)) * 0.08;
        this.mysteryElfGroup.rotation.y = Math.sin(t * 1.5) * 0.4;
      }
    }

    // Cookies spin & bob + Magic Lantern reveal ring (distance-culled)
    const lanternOn = this.activePowerUps.magic_lantern > 0;
    for (const c of this.level.cookies) {
      if (c.collected || c.triggered) continue;
      const cm = this.cookieMeshes.get(c.id);
      if (!cm) continue;
      const inRange = isWithinRenderRange(c.x + 0.5, c.y + 0.5, cx, cz, cullR);
      cm.visible = inRange;
      if (!inRange) continue;
      const spin = cm.userData.spinGroup as THREE.Group;
      if (spin) {
        spin.rotation.y = t * 2.2 + c.bobOffset;
        spin.position.y = 0.34 + Math.sin(t * 3.2 + c.bobOffset) * 0.06;
      }
      const revMat = cm.userData.revealRingMat as THREE.MeshBasicMaterial | undefined;
      if (revMat) {
        revMat.opacity = lanternOn ? 0.85 : 0.14;
      }
    }

    // Houses illumination & beacons (distance-culled)
    for (const h of this.level.houses) {
      const hm = this.houseMeshes.get(h.id);
      if (!hm) continue;
      const inRange = isWithinRenderRange(h.x + 0.5, h.y + 0.5, cx, cz, cullR + 1.5);
      hm.visible = inRange;
      if (!inRange) continue;
      const winMat = hm.userData.winMat as THREE.MeshStandardMaterial;
      const ringMat = hm.userData.ringMat as THREE.MeshStandardMaterial;
      const beacon = hm.userData.beacon as THREE.Mesh;
      const lockGroup = hm.userData.lockGroup as THREE.Group | undefined;
      if (h.delivered) {
        if (winMat) {
          winMat.color.set('#fef08a');
          winMat.emissiveIntensity = 1.25;
        }
        if (ringMat) {
          ringMat.color.set('#34d399');
          ringMat.emissiveIntensity = 0.25;
        }
        if (beacon) beacon.visible = false;
        if (lockGroup) lockGroup.visible = false;
      } else {
        if (beacon) {
          beacon.rotation.y = t * 2.4;
          beacon.position.y = 1.18 + Math.sin(t * 4) * 0.08;
        }
        if (lockGroup && h.requiresKeyId && this.heldKeys.has(h.requiresKeyId)) {
          lockGroup.visible = false;
        }
      }
    }

    // Keys, Switches, Power-Ups, Golden Present (distance-culled)
    for (const k of this.level.keys) {
      if (k.collected) continue;
      const km = this.keyMeshes.get(k.id);
      if (!km) continue;
      const inRange = isWithinRenderRange(k.x + 0.5, k.y + 0.5, cx, cz, cullR);
      km.visible = inRange;
      if (!inRange) continue;
      const spin = km.userData.spin as THREE.Group | undefined;
      if (spin) {
        spin.rotation.y = t * 2.6;
        spin.position.y = 0.42 + Math.sin(t * 3.5) * 0.07;
      }
    }
    for (const sw of this.level.switches) {
      const sm = this.switchMeshes.get(sw.id);
      if (!sm) continue;
      const inRange = isWithinRenderRange(sw.x + 0.5, sw.y + 0.5, cx, cz, cullR);
      sm.visible = inRange;
      if (!inRange) continue;
      const orb = sm.userData.orb as THREE.Mesh | undefined;
      const orbMat = sm.userData.orbMat as THREE.MeshStandardMaterial | undefined;
      if (orb) orb.rotation.y = t * 2.0;
      if (orbMat) {
        orbMat.color.set(sw.activated ? '#34d399' : '#fde047');
        orbMat.emissive.set(sw.activated ? '#10b981' : '#f59e0b');
      }
    }
    for (const pu of this.level.powerUps) {
      if (pu.collected) continue;
      const pm = this.powerUpMeshes.get(pu.id);
      if (!pm) continue;
      const inRange = isWithinRenderRange(pu.x + 0.5, pu.y + 0.5, cx, cz, cullR);
      pm.visible = inRange;
      if (!inRange) continue;
      const spin = pm.userData.spin as THREE.Group | undefined;
      if (spin) {
        spin.rotation.y = t * 2.3;
        spin.position.y = 0.44 + Math.sin(t * 3.8) * 0.08;
      }
    }
    if (this.goldenPresentGroup && this.level.goldenPresent && !this.level.goldenPresent.found) {
      const inRange = isWithinRenderRange(
        this.level.goldenPresent.x + 0.5,
        this.level.goldenPresent.y + 0.5,
        cx,
        cz,
        cullR
      );
      this.goldenPresentGroup.visible = inRange;
      if (inRange) {
        const spin = this.goldenPresentGroup.userData.spin as THREE.Group | undefined;
        if (spin) {
          spin.rotation.y = t * 2.0;
          spin.position.y = 0.36 + Math.sin(t * 3.2) * 0.07;
        }
      }
    }

    // Moving Hazards + Tracking Lights (distance-culled)
    for (const haz of this.level.hazards) {
      const hm = this.hazardMeshes.get(haz.id);
      if (!hm) continue;
      const inRange = isWithinRenderRange(haz.x, haz.y, cx, cz, cullR + 2.0);
      hm.visible = inRange;
      if (!inRange) continue;
      hm.position.set(haz.x, 0, haz.y);
      const bodyYaw = Math.atan2(haz.vx || 0, haz.vy || 1);
      hm.rotation.y = bodyYaw;

      const lightRig = hm.userData.trackingLight as THREE.Group | undefined;
      if (lightRig) {
        lightRig.visible = haz.stunTimer <= 0;
        lightRig.rotation.y = haz.lightYaw - bodyYaw;
        const lensMat = lightRig.userData.lensMat as THREE.MeshStandardMaterial | undefined;
        const floorMat = lightRig.userData.floorMat as THREE.MeshBasicMaterial | undefined;
        const rimMat = lightRig.userData.rimMat as THREE.MeshBasicMaterial | undefined;
        const beamMat = lightRig.userData.beamMat as THREE.MeshBasicMaterial | undefined;
        const activeCol = haz.pursuing ? '#f43f5e' : '#f97316';
        if (lensMat) {
          lensMat.color.set(haz.pursuing ? '#fda4af' : '#fdba74');
          lensMat.emissive.set(activeCol);
        }
        if (floorMat) {
          floorMat.color.set(activeCol);
          floorMat.opacity = haz.pursuing ? 0.44 + 0.08 * Math.sin(t * 14) : 0.36;
        }
        if (rimMat) {
          rimMat.color.set(haz.pursuing ? '#fecdd3' : '#ea580c');
          rimMat.opacity = haz.pursuing ? 0.94 : 0.86;
        }
        if (beamMat) {
          beamMat.color.set(haz.pursuing ? '#f43f5e' : '#fb923c');
          beamMat.opacity = haz.pursuing ? 0.28 : 0.17;
        }
      }

      const beacon = hm.userData.alertBeacon as THREE.Mesh | undefined;
      if (beacon) {
        beacon.visible = haz.pursuing || haz.alerted;
        beacon.rotation.y = t * 6;
      }
      const roll = hm.userData.rollMesh as THREE.Group | undefined;
      if (roll && haz.kind === 'snowball') {
        roll.rotation.x += haz.pursuing ? 0.2 : 0.12;
      }
    }

    // Cycling & Pursuing Trap Pads + Tracking Lights (distance-culled)
    for (const tp of this.level.trapPads) {
      const tm = this.trapPadMeshes.get(tp.id);
      if (!tm) continue;
      const inRange = isWithinRenderRange(tp.curX, tp.curY, cx, cz, cullR + 1.5);
      tm.visible = inRange;
      if (!inRange) continue;
      tm.position.set(tp.curX, tp.pursuing ? 0.12 + Math.sin(t * 12) * 0.04 : 0, tp.curY);

      const state = getTrapPadState(this.elapsedSeconds, tp.phaseOffset, tp.cycleSeconds);
      const ringMat = tm.userData.ringMat as THREE.MeshStandardMaterial;
      const spikesGroup = tm.userData.spikesGroup as THREE.Group;

      if (tp.pursuing) {
        ringMat.color.set('#f43f5e');
        ringMat.emissive.set('#e11d48');
        spikesGroup.position.y = 0.04;
      } else if (state === 'safe') {
        ringMat.color.set('#4ade80');
        ringMat.emissive.set('#22c55e');
        spikesGroup.position.y = -0.34;
      } else if (state === 'warning') {
        ringMat.color.set('#fbbf24');
        ringMat.emissive.set('#f59e0b');
        spikesGroup.position.y = -0.22 + Math.sin(t * 35) * 0.025;
      } else {
        ringMat.color.set('#f43f5e');
        ringMat.emissive.set('#e11d48');
        spikesGroup.position.y = 0.0;
      }

      const lightRig = tm.userData.trackingLight as THREE.Group | undefined;
      if (lightRig) {
        lightRig.visible = tp.stunTimer <= 0;
        lightRig.rotation.y = tp.lightYaw;
        const lensMat = lightRig.userData.lensMat as THREE.MeshStandardMaterial | undefined;
        const floorMat = lightRig.userData.floorMat as THREE.MeshBasicMaterial | undefined;
        const rimMat = lightRig.userData.rimMat as THREE.MeshBasicMaterial | undefined;
        const beamMat = lightRig.userData.beamMat as THREE.MeshBasicMaterial | undefined;
        const activeCol = tp.pursuing ? '#f43f5e' : '#f97316';
        if (lensMat) {
          lensMat.color.set(tp.pursuing ? '#fda4af' : '#fdba74');
          lensMat.emissive.set(activeCol);
        }
        if (floorMat) {
          floorMat.color.set(activeCol);
          floorMat.opacity = tp.pursuing ? 0.44 + 0.08 * Math.sin(t * 14) : 0.36;
        }
        if (rimMat) {
          rimMat.color.set(tp.pursuing ? '#fecdd3' : '#ea580c');
          rimMat.opacity = tp.pursuing ? 0.94 : 0.86;
        }
        if (beamMat) {
          beamMat.color.set(tp.pursuing ? '#f43f5e' : '#fb923c');
          beamMat.opacity = tp.pursuing ? 0.28 : 0.17;
        }
      }
    }

    // Snowball Launchers Telegraph & Projectiles (distance-culled)
    for (const ln of this.level.launchers) {
      const lm = this.launcherMeshes.get(ln.id);
      if (!lm) continue;
      const inRange = isWithinRenderRange(ln.x + 0.5, ln.y + 0.5, cx, cz, cullR);
      lm.visible = inRange;
      if (!inRange) continue;
      const muzzleMat = lm.userData.muzzleMat as THREE.MeshStandardMaterial;
      if (muzzleMat) {
        const soon = ln.cooldown < 0.75;
        muzzleMat.emissiveIntensity = soon ? 0.5 + 0.5 * Math.sin(t * 24) : 0.15;
      }
    }
    for (const proj of this.projectiles) {
      if (!proj.active) continue;
      proj.mesh.position.set(proj.x, 0.36, proj.y);
      proj.mesh.rotation.x += 0.15;
    }

    // Decoy Snowball arc
    if (this.decoySnowball.active) {
      this.decoySnowball.mesh.position.set(
        this.decoySnowball.x,
        this.decoySnowball.z,
        this.decoySnowball.y
      );
    }

    // Hiding Spots highlight ring (distance-culled)
    for (const hs of this.level.hidingSpots) {
      const hm = this.hidingSpotMeshes.get(hs.id);
      if (!hm) continue;
      const inRange = isWithinRenderRange(hs.x + 0.5, hs.y + 0.5, cx, cz, cullR);
      hm.visible = inRange;
      if (!inRange) continue;
      const ringMat = hm.userData.ringMat as THREE.MeshBasicMaterial | undefined;
      if (!ringMat) continue;
      const d = Math.hypot(hs.x + 0.5 - this.santaX, hs.y + 0.5 - this.santaY);
      if (this.activeHidingSpotId === hs.id) {
        ringMat.color.set('#34d399');
        ringMat.opacity = 0.85;
      } else if (d < 1.15) {
        ringMat.color.set('#fde047');
        ringMat.opacity = 0.72;
      } else {
        ringMat.color.set('#38bdf8');
        ringMat.opacity = 0.25;
      }
    }

    // Stealth Enemies + Vision Cones + Overhead Alert Beacons (distance-culled)
    for (const enemy of this.level.stealthEnemies) {
      const em = this.stealthEnemyMeshes.get(enemy.id);
      if (!em) continue;
      const inRange = isWithinRenderRange(enemy.x, enemy.y, cx, cz, cullR + 2.0);
      em.visible = inRange;
      if (!inRange) continue;
      em.position.set(enemy.x, 0, enemy.y);
      em.rotation.y = enemy.yaw;

      const actorGroup = em.userData.actor as THREE.Group | undefined;
      if (actorGroup) {
        if (enemy.state === 'sleep') {
          actorGroup.rotation.x = Math.PI * 0.42;
          actorGroup.position.y = 0.14;
        } else {
          actorGroup.rotation.x = 0;
          actorGroup.position.y = Math.abs(Math.sin(t * 5)) * 0.03;
        }
      }

      const cone = em.userData.visionCone as THREE.Mesh | undefined;
      const coneMat = em.userData.coneMat as THREE.MeshBasicMaterial | undefined;
      if (cone && coneMat) {
        cone.visible = enemy.state !== 'sleep';
        if (enemy.state === 'chase') {
          coneMat.color.set('#f43f5e');
          coneMat.opacity = 0.36;
        } else if (enemy.state === 'suspicious' || enemy.state === 'distracted' || enemy.suspicion > 15) {
          coneMat.color.set('#fb923c');
          coneMat.opacity = 0.28;
        } else {
          coneMat.color.set('#fde047');
          coneMat.opacity = 0.18;
        }
      }

      const beacon = em.userData.beacon as THREE.Mesh | undefined;
      const beaconMat = em.userData.beaconMat as THREE.MeshStandardMaterial | undefined;
      if (beacon && beaconMat) {
        beacon.visible = enemy.state === 'chase' || enemy.state === 'suspicious' || enemy.state === 'distracted';
        beacon.rotation.y = t * 5;
        if (enemy.state === 'chase') {
          beaconMat.color.set('#f43f5e');
          beaconMat.emissive.set('#ef4444');
        } else {
          beaconMat.color.set('#fde047');
          beaconMat.emissive.set('#f59e0b');
        }
      }
    }

    // Security Cameras Sweep (distance-culled)
    for (const cam of this.level.securityCameras) {
      const cm = this.securityCameraMeshes.get(cam.id);
      if (!cm) continue;
      const inRange = isWithinRenderRange(cam.x, cam.y, cx, cz, cullR + 2.0);
      cm.visible = inRange;
      if (!inRange) continue;
      const head = cm.userData.head as THREE.Group | undefined;
      const cone = cm.userData.cone as THREE.Mesh | undefined;
      const coneMat = cm.userData.coneMat as THREE.MeshBasicMaterial | undefined;
      if (head) head.rotation.y = cam.currentYaw;
      if (cone) {
        cone.visible = cam.disabledTimer <= 0;
        cone.rotation.y = cam.currentYaw;
      }
      if (coneMat) {
        coneMat.color.set(this.cameraSuspicion > 20 ? '#f43f5e' : '#fb923c');
        coneMat.opacity = this.cameraSuspicion > 20 ? 0.34 : 0.2;
      }
    }

    // Cycling Laser Security Beams (distance-culled)
    for (const lb of this.level.laserBarriers) {
      const lm = this.laserBarrierMeshes.get(lb.id);
      if (!lm) continue;
      const inRange = isWithinRenderRange(
        (lb.x1 + lb.x2) * 0.5,
        (lb.y1 + lb.y2) * 0.5,
        cx,
        cz,
        cullR + 1.5
      );
      lm.visible = inRange;
      if (!inRange) continue;
      const active = isLaserBarrierActive(
        this.elapsedSeconds,
        lb.cycleSeconds,
        lb.phaseOffset,
        lb.disabledBySwitch
      );
      const beams = lm.userData.beams as THREE.Mesh[] | undefined;
      const beamMat = lm.userData.beamMat as THREE.MeshBasicMaterial | undefined;
      if (beams) beams.forEach((b) => (b.visible = active));
      if (beamMat) beamMat.opacity = active ? 0.65 + 0.3 * Math.sin(t * 16) : 0;
    }

    // In-Maze Teleportation Portals (distance-culled)
    if (this.level.portals) {
      for (const p of this.level.portals) {
        const pm = this.teleportPortalMeshes.get(p.id);
        if (!pm) continue;
        const inRange = isWithinRenderRange(p.x + 0.5, p.y + 0.5, cx, cz, cullR + 1.0);
        pm.visible = inRange;
        if (inRange) {
          pm.rotation.y = t * 2.5;
        }
      }
    }

    // Mission Gate Doors Swing + Portal Vortex Animation
    const gateInRange = isWithinRenderRange(
      this.level.portal.x + 0.5,
      this.level.portal.y + 0.5,
      cx,
      cz,
      cullR + 2.0
    );
    this.portalGroup.visible = gateInRange;
    if (gateInRange) {
      const leftDoor = this.portalGroup.userData.leftDoor as THREE.Group | undefined;
      const rightDoor = this.portalGroup.userData.rightDoor as THREE.Group | undefined;
      const lockBadge = this.portalGroup.userData.lockBadge as THREE.Group | undefined;
      const lockCoreMat = this.portalGroup.userData.lockCoreMat as THREE.MeshStandardMaterial | undefined;
      const torusMat = this.portalGroup.userData.torusMat as THREE.MeshStandardMaterial;
      const vortexMat = this.portalGroup.userData.vortexMat as THREE.MeshStandardMaterial;
      const vortex = this.portalGroup.userData.vortex as THREE.Mesh;
      const beamMat = this.portalGroup.userData.beamMat as THREE.MeshBasicMaterial;

      const targetOpen = this.portalUnlocked ? 1 : 0;
      this.gateDoorOpenRatio += (targetOpen - this.gateDoorOpenRatio) * 0.14;
      if (leftDoor && rightDoor) {
        leftDoor.rotation.y = -this.gateDoorOpenRatio * (Math.PI * 0.52);
        rightDoor.rotation.y = this.gateDoorOpenRatio * (Math.PI * 0.52);
      }
      if (lockBadge) {
        lockBadge.visible = !this.portalUnlocked;
      }
      if (lockCoreMat) {
        const hasAllGateKeys = this.heldGateKeys.size >= this.level.requiredGateKeys;
        lockCoreMat.color.set(hasAllGateKeys ? '#fbbf24' : '#ef4444');
        lockCoreMat.emissive.set(hasAllGateKeys ? '#f59e0b' : '#ef4444');
      }

      if (this.portalUnlocked) {
        torusMat.color.set('#34d399');
        torusMat.emissive.set('#10b981');
        torusMat.emissiveIntensity = 0.9;
        vortexMat.opacity = 0.78 + 0.18 * Math.sin(t * 5);
        beamMat.opacity = 0.28 + 0.1 * Math.sin(t * 4);
        vortex.rotation.z = t * 2.5;
      } else {
        torusMat.color.set('#64748b');
        torusMat.emissive.set('#334155');
        torusMat.emissiveIntensity = 0.3;
        vortexMat.opacity = 0.12;
        beamMat.opacity = 0;
      }
    }

    // Golden Compass 3D Arrow above Santa pointing toward Open Gate, missing Gate Key, or House
    const needsGateKeys =
      this.heldGateKeys.size < this.level.requiredGateKeys &&
      (this.missionClearedInLevel ||
        (this.realCookiesCollected >= this.level.city.requiredCookies &&
          this.deliveriesDone >= this.level.city.requiredDeliveries));

    if (this.activePowerUps.golden_compass > 0 || this.portalUnlocked || needsGateKeys) {
      let targetX = this.level.portal.x + 0.5;
      let targetY = this.level.portal.y + 0.5;
      if (!this.portalUnlocked) {
        let bestDist = Infinity;
        if (needsGateKeys) {
          for (const k of this.level.keys) {
            if (k.collected || k.kind !== 'gate') continue;
            const d = Math.hypot(k.x + 0.5 - this.santaX, k.y + 0.5 - this.santaY);
            if (d < bestDist) {
              bestDist = d;
              targetX = k.x + 0.5;
              targetY = k.y + 0.5;
            }
          }
        } else {
          for (const h of this.level.houses) {
            if (h.delivered) continue;
            const d = Math.hypot(h.x + 0.5 - this.santaX, h.y + 0.5 - this.santaY);
            if (d < bestDist) {
              bestDist = d;
              targetX = h.x + 0.5;
              targetY = h.y + 0.5;
            }
          }
        }
      }
      this.compassArrow.visible = true;
      this.compassArrow.position.set(this.santaX, 1.48, this.santaY);
      this.compassArrow.rotation.z = -Math.atan2(targetX - this.santaX, targetY - this.santaY);
    } else {
      this.compassArrow.visible = false;
    }
  }

  private projectFloatingLabels() {
    const width = this.renderer.domElement.clientWidth || window.innerWidth;
    const height = this.renderer.domElement.clientHeight || window.innerHeight;
    for (const l of this.labels) {
      if (!l.active) continue;
      this.tempVec3.set(l.wx, l.wy, l.wz).project(this.camera);
      if (this.tempVec3.z > 1) {
        l.el.style.display = 'none';
        continue;
      }
      const sx = (this.tempVec3.x * 0.5 + 0.5) * width;
      const sy = (-this.tempVec3.y * 0.5 + 0.5) * height;
      l.el.style.display = 'block';
      l.el.style.left = `${sx}px`;
      l.el.style.top = `${sy}px`;
      l.el.style.opacity = `${Math.max(0, Math.min(1, l.life / l.maxLife))}`;
    }
  }

  private render() {
    this.syncActorTransforms();

    const shakeMag = this.shakeTrauma * this.shakeTrauma * 0.35;
    const sx = (Math.random() - 0.5) * shakeMag;
    const sz = (Math.random() - 0.5) * shakeMag;

    const rangeCfg = get3dRenderRangeConfig(this.cameraMode, this.isCompactViewport);

    // Smoothly interpolate camera settings for silky smooth transitions
    const camLerp = 0.12;
    this.currentCamHeight += (rangeCfg.camHeight - this.currentCamHeight) * camLerp;
    this.currentCamZOffset += (rangeCfg.camZOffset - this.currentCamZOffset) * camLerp;
    this.currentCamLookAtY += (rangeCfg.lookY - this.currentCamLookAtY) * camLerp;
    this.currentCamLookAtZOffset += (rangeCfg.lookZOffset - this.currentCamLookAtZOffset) * camLerp;

    this.camera.position.set(
      this.camTargetX + sx,
      this.currentCamHeight,
      this.camTargetZ + this.currentCamZOffset + sz
    );
    this.camera.lookAt(
      this.camTargetX,
      this.currentCamLookAtY,
      this.camTargetZ + this.currentCamLookAtZOffset
    );

    this.projectFloatingLabels();
    this.renderer.render(this.scene, this.camera);
  }
}

export { SantaMazeEngine3D as SantaMazeEngine };

