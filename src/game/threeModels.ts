import * as THREE from 'three';
import {
  CookieItem,
  CosmeticItem,
  DeliveryHouse,
  HidingSpotKind,
  PowerUpKind,
  StealthEnemyRole,
  TrapKind,
} from './types';

export interface MaterialPaletteCache {
  getStandard: (
    color: string | number,
    opts?: {
      roughness?: number;
      metalness?: number;
      emissive?: string | number;
      emissiveIntensity?: number;
      transparent?: boolean;
      opacity?: number;
    }
  ) => THREE.MeshStandardMaterial;
  trackGeometry: <T extends THREE.BufferGeometry>(g: T) => T;
  trackMaterial: <T extends THREE.Material>(m: T) => T;
  disposeAll: () => void;
}

export function createResourceTracker(): MaterialPaletteCache {
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const geometries: THREE.BufferGeometry[] = [];
  const extraMaterials: THREE.Material[] = [];

  return {
    getStandard(color, opts = {}) {
      const colHex = new THREE.Color(color).getHexString();
      const emHex = opts.emissive !== undefined ? new THREE.Color(opts.emissive).getHexString() : 'none';
      const key = `${colHex}_${opts.roughness ?? 0.65}_${opts.metalness ?? 0.08}_${emHex}_${opts.emissiveIntensity ?? 0}_${opts.transparent ?? false}_${opts.opacity ?? 1}`;
      const existing = materials.get(key);
      if (existing) return existing;
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: opts.roughness ?? 0.65,
        metalness: opts.metalness ?? 0.08,
        emissive: opts.emissive ?? 0x000000,
        emissiveIntensity: opts.emissiveIntensity ?? 0,
        transparent: opts.transparent ?? false,
        opacity: opts.opacity ?? 1,
      });
      materials.set(key, mat);
      return mat;
    },
    trackGeometry<T extends THREE.BufferGeometry>(g: T): T {
      geometries.push(g);
      return g;
    },
    trackMaterial<T extends THREE.Material>(m: T): T {
      extraMaterials.push(m);
      return m;
    },
    disposeAll() {
      materials.forEach((m) => m.dispose());
      materials.clear();
      extraMaterials.forEach((m) => m.dispose());
      extraMaterials.length = 0;
      geometries.forEach((g) => g.dispose());
      geometries.length = 0;
    },
  };
}

export function addContactShadow(
  parent: THREE.Group,
  res: MaterialPaletteCache,
  radius: number,
  opacity = 0.34
) {
  const geo = res.trackGeometry(new THREE.CircleGeometry(radius, 10));
  const mat = res.trackMaterial(
    new THREE.MeshBasicMaterial({
      color: 0x040916,
      transparent: true,
      opacity,
      depthWrite: false,
    })
  );
  const shadow = new THREE.Mesh(geo, mat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  parent.add(shadow);
  return shadow;
}

export function createSantaModel(
  res: MaterialPaletteCache,
  outfit: CosmeticItem | undefined
): THREE.Group {
  const root = new THREE.Group();
  const coatColor = outfit?.primaryColor ?? '#dc2626';
  const trimColor = outfit?.trimColor ?? '#f8fafc';

  const coatMat = res.getStandard(coatColor, { roughness: 0.72, metalness: 0.05 });
  const trimMat = res.getStandard(trimColor, { roughness: 0.85, metalness: 0.02 });
  const bootMat = res.getStandard('#1e293b', { roughness: 0.45, metalness: 0.15 });
  const goldMat = res.getStandard('#fbbf24', {
    roughness: 0.25,
    metalness: 0.85,
    emissive: '#f59e0b',
    emissiveIntensity: 0.15,
  });
  const skinMat = res.getStandard('#fed7aa', { roughness: 0.6, metalness: 0 });
  const beardMat = res.getStandard('#ffffff', { roughness: 0.9, metalness: 0 });

  addContactShadow(root, res, 0.36, 0.42);

  const actor = new THREE.Group();
  root.add(actor);
  root.userData.actor = actor;

  // Boots
  const bootGeo = res.trackGeometry(new THREE.BoxGeometry(0.14, 0.16, 0.2));
  const leftBoot = new THREE.Mesh(bootGeo, bootMat);
  leftBoot.position.set(-0.1, 0.08, 0.02);
  const rightBoot = new THREE.Mesh(bootGeo, bootMat);
  rightBoot.position.set(0.1, 0.08, 0.02);
  actor.add(leftBoot, rightBoot);
  root.userData.leftBoot = leftBoot;
  root.userData.rightBoot = rightBoot;

  // Coat skirt & round belly
  const skirt = new THREE.Mesh(
    res.trackGeometry(new THREE.CylinderGeometry(0.22, 0.29, 0.32, 10)),
    coatMat
  );
  skirt.position.y = 0.3;
  skirt.castShadow = true;
  actor.add(skirt);

  const trimHem = new THREE.Mesh(
    res.trackGeometry(new THREE.TorusGeometry(0.28, 0.045, 5, 10)),
    trimMat
  );
  trimHem.rotation.x = Math.PI / 2;
  trimHem.position.y = 0.16;
  actor.add(trimHem);

  const torso = new THREE.Mesh(
    res.trackGeometry(new THREE.SphereGeometry(0.25, 10, 8)),
    coatMat
  );
  torso.position.y = 0.48;
  torso.scale.set(1, 0.95, 0.95);
  torso.castShadow = true;
  actor.add(torso);

  // Leather belt & brass buckle
  const belt = new THREE.Mesh(
    res.trackGeometry(new THREE.CylinderGeometry(0.255, 0.255, 0.075, 10)),
    bootMat
  );
  belt.position.y = 0.42;
  actor.add(belt);

  const buckle = new THREE.Mesh(
    res.trackGeometry(new THREE.BoxGeometry(0.11, 0.09, 0.04)),
    goldMat
  );
  buckle.position.set(0, 0.42, 0.245);
  actor.add(buckle);

  // Arms
  const armGeo = res.trackGeometry(new THREE.CapsuleGeometry(0.065, 0.16, 2, 5));
  const leftArm = new THREE.Mesh(armGeo, coatMat);
  leftArm.position.set(-0.27, 0.48, 0.02);
  leftArm.rotation.z = 0.35;
  const rightArm = new THREE.Mesh(armGeo, coatMat);
  rightArm.position.set(0.27, 0.48, 0.02);
  rightArm.rotation.z = -0.35;
  actor.add(leftArm, rightArm);
  root.userData.leftArm = leftArm;
  root.userData.rightArm = rightArm;

  // Head + Beard + Nose + Eyes
  const head = new THREE.Mesh(
    res.trackGeometry(new THREE.SphereGeometry(0.175, 10, 8)),
    skinMat
  );
  head.position.y = 0.77;
  actor.add(head);

  const beard = new THREE.Mesh(
    res.trackGeometry(new THREE.ConeGeometry(0.16, 0.24, 8)),
    beardMat
  );
  beard.rotation.x = Math.PI;
  beard.position.set(0, 0.65, 0.1);
  actor.add(beard);

  const nose = new THREE.Mesh(
    res.trackGeometry(new THREE.SphereGeometry(0.038, 6, 5)),
    res.getStandard('#f87171', { roughness: 0.5 })
  );
  nose.position.set(0, 0.77, 0.175);
  actor.add(nose);

  const eyeMat = res.getStandard('#0f172a', { roughness: 0.2 });
  const eyeGeo = res.trackGeometry(new THREE.SphereGeometry(0.022, 5, 4));
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.055, 0.81, 0.155);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.055, 0.81, 0.155);
  actor.add(leftEye, rightEye);

  // Hat brim + cone + pom-pom
  const hatBrim = new THREE.Mesh(
    res.trackGeometry(new THREE.TorusGeometry(0.17, 0.04, 5, 10)),
    trimMat
  );
  hatBrim.rotation.x = Math.PI / 2;
  hatBrim.position.y = 0.89;
  actor.add(hatBrim);

  const hatCone = new THREE.Mesh(
    res.trackGeometry(new THREE.ConeGeometry(0.16, 0.3, 8)),
    coatMat
  );
  hatCone.position.set(0, 1.03, -0.02);
  hatCone.rotation.x = -0.22;
  actor.add(hatCone);

  const pom = new THREE.Mesh(
    res.trackGeometry(new THREE.SphereGeometry(0.052, 6, 5)),
    trimMat
  );
  pom.position.set(0, 1.17, -0.07);
  actor.add(pom);

  // Snowflake Shield Dome (toggled when active)
  const shieldMat = res.trackMaterial(
    new THREE.MeshStandardMaterial({
      color: '#7dd3fc',
      emissive: '#38bdf8',
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.28,
      roughness: 0.1,
      metalness: 0.2,
    })
  );
  const shieldMesh = new THREE.Mesh(
    res.trackGeometry(new THREE.SphereGeometry(0.56, 10, 8)),
    shieldMat
  );
  shieldMesh.position.y = 0.56;
  shieldMesh.visible = false;
  root.add(shieldMesh);
  root.userData.shieldMesh = shieldMesh;

  // Christmas Wings (toggled when active)
  const wingsGroup = new THREE.Group();
  const wingGeo = res.trackGeometry(new THREE.BoxGeometry(0.32, 0.18, 0.04));
  const wingMat = res.getStandard('#fef08a', {
    roughness: 0.3,
    emissive: '#fde047',
    emissiveIntensity: 0.45,
  });
  const wL = new THREE.Mesh(wingGeo, wingMat);
  wL.position.set(-0.34, 0.62, -0.18);
  wL.rotation.y = 0.35;
  const wR = new THREE.Mesh(wingGeo, wingMat);
  wR.position.set(0.34, 0.62, -0.18);
  wR.rotation.y = -0.35;
  wingsGroup.add(wL, wR);
  wingsGroup.visible = false;
  actor.add(wingsGroup);
  root.userData.wingsGroup = wingsGroup;

  // Gift Box Magic Disguise Shell (toggled when Magic Disguise active)
  const disguiseGroup = new THREE.Group();
  const dBox = new THREE.Mesh(
    res.trackGeometry(new THREE.BoxGeometry(0.66, 0.72, 0.66)),
    res.getStandard('#b91c1c', { roughness: 0.55 })
  );
  dBox.position.y = 0.36;
  const dRib1 = new THREE.Mesh(
    res.trackGeometry(new THREE.BoxGeometry(0.69, 0.74, 0.14)),
    goldMat
  );
  dRib1.position.y = 0.36;
  const dRib2 = new THREE.Mesh(
    res.trackGeometry(new THREE.BoxGeometry(0.14, 0.74, 0.69)),
    goldMat
  );
  dRib2.position.y = 0.36;
  const dBow = new THREE.Mesh(
    res.trackGeometry(new THREE.TorusGeometry(0.11, 0.03, 6, 12)),
    goldMat
  );
  dBow.position.y = 0.76;
  disguiseGroup.add(dBox, dRib1, dRib2, dBow);
  disguiseGroup.visible = false;
  root.add(disguiseGroup);
  root.userData.disguiseBox = disguiseGroup;

  return root;
}

export function createReindeerModel(
  res: MaterialPaletteCache,
  reindeerItem: CosmeticItem | undefined
): THREE.Group {
  const root = new THREE.Group();
  addContactShadow(root, res, 0.28, 0.35);

  const furMat = res.getStandard('#92400e', { roughness: 0.78 });
  const bellyMat = res.getStandard('#d6a87c', { roughness: 0.85 });
  const antlerMat = res.getStandard('#fde68a', { roughness: 0.4, metalness: 0.3 });
  const isRedNose = reindeerItem?.id === 'reindeer_red_nose';
  const noseMat = res.getStandard(isRedNose ? '#f43f5e' : '#334155', {
    roughness: 0.25,
    emissive: isRedNose ? '#f43f5e' : '#000000',
    emissiveIntensity: isRedNose ? 0.9 : 0,
  });

  const body = new THREE.Mesh(
    res.trackGeometry(new THREE.CapsuleGeometry(0.14, 0.24, 3, 6)),
    furMat
  );
  body.rotation.x = Math.PI / 2;
  body.position.y = 0.28;
  root.add(body);

  const legGeo = res.trackGeometry(new THREE.CylinderGeometry(0.03, 0.025, 0.22, 5));
  const legOffsets = [
    [-0.08, 0.11, 0.12],
    [0.08, 0.11, 0.12],
    [-0.08, 0.11, -0.12],
    [0.08, 0.11, -0.12],
  ];
  legOffsets.forEach(([lx, ly, lz]) => {
    const leg = new THREE.Mesh(legGeo, furMat);
    leg.position.set(lx, ly, lz);
    root.add(leg);
  });

  const neck = new THREE.Mesh(
    res.trackGeometry(new THREE.CylinderGeometry(0.065, 0.09, 0.22, 6)),
    bellyMat
  );
  neck.position.set(0, 0.42, 0.16);
  neck.rotation.x = 0.25;
  root.add(neck);

  const head = new THREE.Mesh(
    res.trackGeometry(new THREE.SphereGeometry(0.11, 8, 6)),
    furMat
  );
  head.position.set(0, 0.54, 0.22);
  head.scale.set(0.95, 0.9, 1.25);
  root.add(head);

  const nose = new THREE.Mesh(
    res.trackGeometry(new THREE.SphereGeometry(0.036, 6, 5)),
    noseMat
  );
  nose.position.set(0, 0.54, 0.36);
  root.add(nose);

  // Antlers
  const antlerGeo = res.trackGeometry(new THREE.CylinderGeometry(0.014, 0.02, 0.2, 5));
  const leftAntler = new THREE.Mesh(antlerGeo, antlerMat);
  leftAntler.position.set(-0.08, 0.68, 0.19);
  leftAntler.rotation.z = 0.4;
  const rightAntler = new THREE.Mesh(antlerGeo, antlerMat);
  rightAntler.position.set(0.08, 0.68, 0.19);
  rightAntler.rotation.z = -0.4;
  root.add(leftAntler, rightAntler);

  const collarMat = res.getStandard(reindeerItem?.primaryColor ?? '#dc2626', {
    roughness: 0.38,
    metalness: 0.45,
    emissive: reindeerItem?.primaryColor ?? '#000000',
    emissiveIntensity: reindeerItem?.cost ? 0.25 : 0,
  });
  const collar = new THREE.Mesh(
    res.trackGeometry(new THREE.TorusGeometry(0.09, 0.022, 4, 8)),
    collarMat
  );
  collar.rotation.x = Math.PI / 2 + 0.2;
  collar.position.set(0, 0.4, 0.17);
  root.add(collar);

  if (reindeerItem?.id && reindeerItem.id !== 'reindeer_bells') {
    const trimMat = res.getStandard(reindeerItem.trimColor ?? '#fde68a', {
      roughness: 0.3,
      metalness: 0.35,
      emissive: reindeerItem.trimColor ?? '#fde68a',
      emissiveIntensity: 0.28,
    });
    const crest = new THREE.Mesh(
      res.trackGeometry(new THREE.OctahedronGeometry(0.042, 0)),
      trimMat
    );
    crest.position.set(0, 0.65, 0.21);
    root.add(crest);

    if (
      reindeerItem.id === 'reindeer_emerald_cape' ||
      reindeerItem.id === 'reindeer_cosmic_halo' ||
      reindeerItem.id === 'reindeer_frost_collar'
    ) {
      const saddle = new THREE.Mesh(
        res.trackGeometry(new THREE.BoxGeometry(0.26, 0.05, 0.24)),
        collarMat
      );
      saddle.position.set(0, 0.39, -0.01);
      const saddleTrim = new THREE.Mesh(
        res.trackGeometry(new THREE.BoxGeometry(0.28, 0.02, 0.26)),
        trimMat
      );
      saddleTrim.position.set(0, 0.37, -0.01);
      root.add(saddle, saddleTrim);
    }
  }

  return root;
}

export function createElfModel(res: MaterialPaletteCache, isHelper: boolean): THREE.Group {
  const root = new THREE.Group();
  addContactShadow(root, res, 0.24, 0.34);

  const tunicColor = isHelper ? '#38bdf8' : '#10b981';
  const tunicMat = res.getStandard(tunicColor, {
    roughness: 0.65,
    emissive: tunicColor,
    emissiveIntensity: 0.18,
  });
  const hatMat = res.getStandard(isHelper ? '#0284c7' : '#059669', { roughness: 0.6 });
  const skinMat = res.getStandard('#fde68a', { roughness: 0.6 });
  const trimMat = res.getStandard('#fbbf24', { roughness: 0.3, metalness: 0.7 });

  const body = new THREE.Mesh(
    res.trackGeometry(new THREE.ConeGeometry(0.18, 0.36, 8)),
    tunicMat
  );
  body.position.y = 0.22;
  root.add(body);

  const head = new THREE.Mesh(
    res.trackGeometry(new THREE.SphereGeometry(0.125, 8, 6)),
    skinMat
  );
  head.position.y = 0.46;
  root.add(head);

  const hat = new THREE.Mesh(
    res.trackGeometry(new THREE.ConeGeometry(0.13, 0.24, 8)),
    hatMat
  );
  hat.position.y = 0.64;
  root.add(hat);

  const jingle = new THREE.Mesh(
    res.trackGeometry(new THREE.SphereGeometry(0.036, 6, 5)),
    trimMat
  );
  jingle.position.y = 0.76;
  root.add(jingle);

  return root;
}

export function createDeliveryHouseModel(
  res: MaterialPaletteCache,
  house: DeliveryHouse
): THREE.Group {
  const root = new THREE.Group();

  const wallMat = res.getStandard(house.isSecretBonus ? '#b45309' : '#78350f', {
    roughness: 0.72,
  });
  const roofMat = res.getStandard('#e2e8f0', { roughness: 0.75 });
  const trimMat = res.getStandard(house.isSecretBonus ? '#fbbf24' : '#dc2626', {
    roughness: 0.5,
  });

  // Base platform ring (glowing indicator)
  const ringMat = res.trackMaterial(
    new THREE.MeshStandardMaterial({
      color: house.requiresKeyId ? '#fbbf24' : '#4ade80',
      emissive: house.requiresKeyId ? '#f59e0b' : '#22c55e',
      emissiveIntensity: 0.75,
      roughness: 0.3,
    })
  );
  const ring = new THREE.Mesh(
    res.trackGeometry(new THREE.TorusGeometry(0.47, 0.045, 5, 12)),
    ringMat
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.04;
  root.add(ring);
  root.userData.ring = ring;
  root.userData.ringMat = ringMat;

  // Cottage body
  const body = new THREE.Mesh(
    res.trackGeometry(new THREE.BoxGeometry(0.68, 0.54, 0.62)),
    wallMat
  );
  body.position.y = 0.27;
  body.castShadow = true;
  body.receiveShadow = true;
  root.add(body);

  // Pitched snowy roof (4-sided cone rotated 45 deg)
  const roof = new THREE.Mesh(
    res.trackGeometry(new THREE.ConeGeometry(0.56, 0.38, 4)),
    roofMat
  );
  roof.position.y = 0.72;
  roof.rotation.y = Math.PI / 4;
  root.add(roof);

  // Chimney
  const chimney = new THREE.Mesh(
    res.trackGeometry(new THREE.BoxGeometry(0.14, 0.3, 0.14)),
    trimMat
  );
  chimney.position.set(0.2, 0.75, -0.14);
  root.add(chimney);

  // Front Door
  const door = new THREE.Mesh(
    res.trackGeometry(new THREE.BoxGeometry(0.16, 0.28, 0.04)),
    trimMat
  );
  door.position.set(0, 0.16, 0.31);
  root.add(door);

  // Windows (illuminated when delivered!)
  const winMat = res.trackMaterial(
    new THREE.MeshStandardMaterial({
      color: '#334155',
      emissive: '#fde047',
      emissiveIntensity: 0.15,
      roughness: 0.2,
    })
  );
  const winGeo = res.trackGeometry(new THREE.BoxGeometry(0.14, 0.14, 0.04));
  const winL = new THREE.Mesh(winGeo, winMat);
  winL.position.set(-0.18, 0.33, 0.31);
  const winR = new THREE.Mesh(winGeo, winMat);
  winR.position.set(0.18, 0.33, 0.31);
  root.add(winL, winR);
  root.userData.winMat = winMat;

  // Floating delivery beacon diamond above roof
  const beacon = new THREE.Mesh(
    res.trackGeometry(new THREE.OctahedronGeometry(0.13, 0)),
    ringMat
  );
  beacon.position.y = 1.18;
  root.add(beacon);
  root.userData.beacon = beacon;

  // Padlock indicator for locked houses
  if (house.requiresKeyId) {
    const lockGroup = new THREE.Group();
    const lockBody = new THREE.Mesh(
      res.trackGeometry(new THREE.BoxGeometry(0.16, 0.14, 0.08)),
      res.getStandard('#fbbf24', {
        roughness: 0.25,
        metalness: 0.85,
        emissive: '#f59e0b',
        emissiveIntensity: 0.35,
      })
    );
    const shackle = new THREE.Mesh(
      res.trackGeometry(new THREE.TorusGeometry(0.055, 0.018, 4, 8, Math.PI)),
      res.getStandard('#e2e8f0', { roughness: 0.2, metalness: 0.85 })
    );
    shackle.position.y = 0.07;
    lockGroup.add(lockBody, shackle);
    lockGroup.position.set(0, 0.56, 0.36);
    root.add(lockGroup);
    root.userData.lockGroup = lockGroup;
  }

  return root;
}

export function createCookieModel(res: MaterialPaletteCache, cookie: CookieItem): THREE.Group {
  const root = new THREE.Group();
  addContactShadow(root, res, 0.22, 0.3);

  const spinGroup = new THREE.Group();
  spinGroup.position.y = 0.32;
  root.add(spinGroup);
  root.userData.spinGroup = spinGroup;

  if (cookie.isReal) {
    if (cookie.kind === 'star') {
      const starShape = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const ang = (i * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? 0.24 : 0.11;
        const x = Math.cos(ang) * r;
        const y = Math.sin(ang) * r;
        if (i === 0) starShape.moveTo(x, y);
        else starShape.lineTo(x, y);
      }
      starShape.closePath();
      const starGeo = res.trackGeometry(
        new THREE.ExtrudeGeometry(starShape, {
          depth: 0.07,
          bevelEnabled: false,
        })
      );
      starGeo.center();
      const mesh = new THREE.Mesh(
        starGeo,
        res.getStandard('#fbbf24', {
          roughness: 0.35,
          metalness: 0.25,
          emissive: '#f59e0b',
          emissiveIntensity: 0.35,
        })
      );
      spinGroup.add(mesh);
    } else if (cookie.kind === 'gingerbread') {
      const gbMat = res.getStandard('#b45309', { roughness: 0.72 });
      const icingMat = res.getStandard('#f8fafc', { roughness: 0.4 });
      const torso = new THREE.Mesh(res.trackGeometry(new THREE.BoxGeometry(0.18, 0.22, 0.07)), gbMat);
      const head = new THREE.Mesh(res.trackGeometry(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 8)), gbMat);
      head.rotation.x = Math.PI / 2;
      head.position.y = 0.16;
      const arms = new THREE.Mesh(res.trackGeometry(new THREE.BoxGeometry(0.32, 0.07, 0.06)), gbMat);
      arms.position.y = 0.04;
      const btn = new THREE.Mesh(res.trackGeometry(new THREE.SphereGeometry(0.028, 5, 4)), icingMat);
      btn.position.set(0, 0.02, 0.04);
      spinGroup.add(torso, head, arms, btn);
    } else if (cookie.kind === 'candy_cane') {
      const redMat = res.getStandard('#ef4444', { roughness: 0.35, emissive: '#dc2626', emissiveIntensity: 0.2 });
      const whiteMat = res.getStandard('#ffffff', { roughness: 0.35 });
      const stem = new THREE.Mesh(res.trackGeometry(new THREE.CylinderGeometry(0.042, 0.042, 0.28, 6)), whiteMat);
      stem.position.set(-0.04, -0.02, 0);
      const hook = new THREE.Mesh(res.trackGeometry(new THREE.TorusGeometry(0.085, 0.042, 5, 8, Math.PI)), redMat);
      hook.position.set(0.045, 0.12, 0);
      spinGroup.add(stem, hook);
    } else if (cookie.kind === 'magic_glow') {
      const disc = new THREE.Mesh(
        res.trackGeometry(new THREE.CylinderGeometry(0.21, 0.21, 0.08, 10)),
        res.getStandard('#fde047', {
          roughness: 0.2,
          metalness: 0.4,
          emissive: '#fbbf24',
          emissiveIntensity: 0.65,
        })
      );
      disc.rotation.x = Math.PI / 2;
      const halo = new THREE.Mesh(
        res.trackGeometry(new THREE.TorusGeometry(0.28, 0.025, 4, 10)),
        res.getStandard('#fef08a', { emissive: '#fde047', emissiveIntensity: 0.8 })
      );
      spinGroup.add(disc, halo);
    } else {
      // choc_chip
      const dough = new THREE.Mesh(
        res.trackGeometry(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 10)),
        res.getStandard('#d97706', { roughness: 0.68, emissive: '#b45309', emissiveIntensity: 0.15 })
      );
      dough.rotation.x = Math.PI / 2;
      const chipMat = res.getStandard('#3b1f0e', { roughness: 0.5 });
      const chipGeo = res.trackGeometry(new THREE.SphereGeometry(0.032, 4, 4));
      [
        [-0.08, 0.07, 0.04],
        [0.09, 0.05, 0.04],
        [0, -0.09, 0.04],
      ].forEach(([cx, cy, cz]) => {
        const chip = new THREE.Mesh(chipGeo, chipMat);
        chip.position.set(cx, cy, cz);
        spinGroup.add(chip);
      });
      spinGroup.add(dough);
    }
  } else {
    // Fake Trap Cookies with clever 3D tells
    if (cookie.kind === 'cardboard') {
      const box = new THREE.Mesh(
        res.trackGeometry(new THREE.BoxGeometry(0.32, 0.32, 0.05)),
        res.getStandard('#a16207', { roughness: 0.95 })
      );
      const tape = new THREE.Mesh(
        res.trackGeometry(new THREE.BoxGeometry(0.26, 0.06, 0.06)),
        res.getStandard('#fef3c7', { roughness: 0.6 })
      );
      tape.rotation.z = 0.45;
      spinGroup.add(box, tape);
    } else if (cookie.kind === 'frozen') {
      const ice = new THREE.Mesh(
        res.trackGeometry(new THREE.OctahedronGeometry(0.21, 0)),
        res.getStandard('#38bdf8', {
          roughness: 0.15,
          metalness: 0.35,
          emissive: '#0284c7',
          emissiveIntensity: 0.45,
        })
      );
      spinGroup.add(ice);
    } else if (cookie.kind === 'spring_trap') {
      const top = new THREE.Mesh(
        res.trackGeometry(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 8)),
        res.getStandard('#b45309', { roughness: 0.7 })
      );
      top.position.y = 0.08;
      const spring = new THREE.Mesh(
        res.trackGeometry(new THREE.TorusGeometry(0.11, 0.025, 4, 8)),
        res.getStandard('#94a3b8', { metalness: 0.8, roughness: 0.25 })
      );
      spring.rotation.x = Math.PI / 2;
      spring.position.y = -0.06;
      spinGroup.add(top, spring);
    } else {
      // prank_boom / vanishing / elf_morph
      const base = new THREE.Mesh(
        res.trackGeometry(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 8)),
        res.getStandard(cookie.kind === 'vanishing' ? '#94a3b8' : '#78350f', {
          roughness: 0.6,
          emissive: cookie.kind === 'prank_boom' ? '#dc2626' : '#7c3aed',
          emissiveIntensity: 0.25,
        })
      );
      base.rotation.x = Math.PI / 2;
      const fuse = new THREE.Mesh(
        res.trackGeometry(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 5)),
        res.getStandard('#1e293b')
      );
      fuse.position.y = 0.22;
      const spark = new THREE.Mesh(
        res.trackGeometry(new THREE.SphereGeometry(0.042, 5, 4)),
        res.getStandard('#f43f5e', { emissive: '#f43f5e', emissiveIntensity: 0.9 })
      );
      spark.position.y = 0.29;
      spinGroup.add(base, fuse, spark);
    }

    // Subtle warning ring revealed brightly when Magic Lantern is active
    const revealRingMat = res.trackMaterial(
      new THREE.MeshBasicMaterial({
        color: '#f43f5e',
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
      })
    );
    const revealRing = new THREE.Mesh(
      res.trackGeometry(new THREE.RingGeometry(0.27, 0.35, 10)),
      revealRingMat
    );
    revealRing.rotation.x = -Math.PI / 2;
    revealRing.position.y = 0.025;
    root.add(revealRing);
    root.userData.revealRingMat = revealRingMat;
  }

  return root;
}

export function createTrackingLightRig(
  res: MaterialPaletteCache,
  range: number,
  halfAngle: number,
  emitterHeight: number
): THREE.Group {
  const rig = new THREE.Group();

  // Searchlight Turret Head + Glowing Lens
  const headGroup = new THREE.Group();
  headGroup.position.y = emitterHeight;

  const housing = new THREE.Mesh(
    res.trackGeometry(new THREE.CylinderGeometry(0.1, 0.12, 0.22, 6)),
    res.getStandard('#1e293b', { roughness: 0.35, metalness: 0.7 })
  );
  housing.rotation.x = Math.PI / 2;
  housing.position.z = 0.06;

  const lensMat = res.trackMaterial(
    new THREE.MeshStandardMaterial({
      color: '#fdba74',
      emissive: '#fb923c',
      emissiveIntensity: 1.15,
      roughness: 0.15,
    })
  );
  const lens = new THREE.Mesh(
    res.trackGeometry(new THREE.SphereGeometry(0.085, 6, 5)),
    lensMat
  );
  lens.position.z = 0.17;
  headGroup.add(housing, lens);
  rig.add(headGroup);

  // Floor Tracking Light Sector (exact match to detection cone)
  const segs = 8;
  const floorPositions: number[] = [];
  const rimPositions: number[] = [];
  const beamPositions: number[] = [];
  const innerRim = range * 0.92;

  for (let i = 0; i < segs; i++) {
    const a1 = -halfAngle + (2 * halfAngle * i) / segs;
    const a2 = -halfAngle + (2 * halfAngle * (i + 1)) / segs;
    const x1 = Math.sin(a1);
    const z1 = Math.cos(a1);
    const x2 = Math.sin(a2);
    const z2 = Math.cos(a2);

    // Floor sweep disc sector
    floorPositions.push(0, 0.036, 0);
    floorPositions.push(x1 * range, 0.036, z1 * range);
    floorPositions.push(x2 * range, 0.036, z2 * range);

    // Crisp outer boundary arc
    rimPositions.push(x1 * innerRim, 0.042, z1 * innerRim);
    rimPositions.push(x1 * range, 0.042, z1 * range);
    rimPositions.push(x2 * range, 0.042, z2 * range);

    rimPositions.push(x1 * innerRim, 0.042, z1 * innerRim);
    rimPositions.push(x2 * range, 0.042, z2 * range);
    rimPositions.push(x2 * innerRim, 0.042, z2 * innerRim);

    // Volumetric 3D beam from lamp lens down to floor perimeter
    beamPositions.push(0, emitterHeight, 0.16);
    beamPositions.push(x1 * range, 0.04, z1 * range);
    beamPositions.push(x2 * range, 0.04, z2 * range);
  }

  const floorGeo = res.trackGeometry(new THREE.BufferGeometry());
  floorGeo.setAttribute('position', new THREE.Float32BufferAttribute(floorPositions, 3));
  const floorMat = res.trackMaterial(
    new THREE.MeshBasicMaterial({
      color: '#f97316',
      transparent: true,
      opacity: 0.36,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);

  const rimGeo = res.trackGeometry(new THREE.BufferGeometry());
  rimGeo.setAttribute('position', new THREE.Float32BufferAttribute(rimPositions, 3));
  const rimMat = res.trackMaterial(
    new THREE.MeshBasicMaterial({
      color: '#ea580c',
      transparent: true,
      opacity: 0.86,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);

  const beamGeo = res.trackGeometry(new THREE.BufferGeometry());
  beamGeo.setAttribute('position', new THREE.Float32BufferAttribute(beamPositions, 3));
  const beamMat = res.trackMaterial(
    new THREE.MeshBasicMaterial({
      color: '#fb923c',
      transparent: true,
      opacity: 0.17,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const beamMesh = new THREE.Mesh(beamGeo, beamMat);

  rig.add(floorMesh, rimMesh, beamMesh);
  rig.userData.lensMat = lensMat;
  rig.userData.floorMat = floorMat;
  rig.userData.rimMat = rimMat;
  rig.userData.beamMat = beamMat;
  return rig;
}

export function createHazardModel(
  res: MaterialPaletteCache,
  kind: TrapKind,
  lightRange = 3.6,
  lightHalfAngle = 0.42
): THREE.Group {
  const root = new THREE.Group();
  addContactShadow(root, res, 0.34, 0.42);

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);
  root.userData.bodyGroup = bodyGroup;

  if (kind === 'moving_traffic') {
    // Midtown Yellow Taxi Cab
    const yellowMat = res.getStandard('#facc15', { roughness: 0.32, metalness: 0.3 });
    const darkMat = res.getStandard('#1e293b', { roughness: 0.4 });
    const glassMat = res.getStandard('#0f172a', { roughness: 0.15, metalness: 0.6 });

    const chassis = new THREE.Mesh(res.trackGeometry(new THREE.BoxGeometry(0.68, 0.22, 0.44)), yellowMat);
    chassis.position.y = 0.18;
    chassis.castShadow = true;
    const cabin = new THREE.Mesh(res.trackGeometry(new THREE.BoxGeometry(0.38, 0.18, 0.38)), yellowMat);
    cabin.position.set(-0.04, 0.37, 0);
    const windshield = new THREE.Mesh(res.trackGeometry(new THREE.BoxGeometry(0.4, 0.12, 0.34)), glassMat);
    windshield.position.set(-0.04, 0.37, 0);
    const sign = new THREE.Mesh(
      res.trackGeometry(new THREE.BoxGeometry(0.14, 0.08, 0.18)),
      res.getStandard('#fef08a', { emissive: '#fde047', emissiveIntensity: 0.7 })
    );
    sign.position.set(-0.04, 0.5, 0);

    const wheelGeo = res.trackGeometry(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 8));
    [
      [-0.2, 0.09, 0.22],
      [0.2, 0.09, 0.22],
      [-0.2, 0.09, -0.22],
      [0.2, 0.09, -0.22],
    ].forEach(([wx, wy, wz]) => {
      const w = new THREE.Mesh(wheelGeo, darkMat);
      w.rotation.x = Math.PI / 2;
      w.position.set(wx, wy, wz);
      bodyGroup.add(w);
    });

    const headlightMat = res.getStandard('#fef9c3', { emissive: '#fef08a', emissiveIntensity: 1.0 });
    const hl1 = new THREE.Mesh(res.trackGeometry(new THREE.SphereGeometry(0.04, 5, 4)), headlightMat);
    hl1.position.set(0.34, 0.2, 0.14);
    const hl2 = new THREE.Mesh(res.trackGeometry(new THREE.SphereGeometry(0.04, 5, 4)), headlightMat);
    hl2.position.set(0.34, 0.2, -0.14);

    bodyGroup.add(chassis, cabin, windshield, sign, hl1, hl2);
  } else if (kind === 'neon_drone') {
    // Patrolling Holiday Security Drone
    const metalMat = res.getStandard('#334155', { roughness: 0.3, metalness: 0.75 });
    const neonMat = res.getStandard('#f43f5e', {
      roughness: 0.2,
      emissive: '#f43f5e',
      emissiveIntensity: 0.9,
    });
    const core = new THREE.Mesh(res.trackGeometry(new THREE.OctahedronGeometry(0.2, 0)), metalMat);
    core.position.y = 0.52;
    const ring = new THREE.Mesh(res.trackGeometry(new THREE.TorusGeometry(0.3, 0.032, 5, 10)), neonMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.52;
    const eye = new THREE.Mesh(res.trackGeometry(new THREE.SphereGeometry(0.08, 6, 5)), neonMat);
    eye.position.set(0, 0.52, 0.18);
    bodyGroup.add(core, ring, eye);
  } else if (kind === 'snowball') {
    // Rolling Spiky Snowball / Carnival Ball
    const ball = new THREE.Mesh(
      res.trackGeometry(new THREE.DodecahedronGeometry(0.28, 0)),
      res.getStandard('#f1f5f9', { roughness: 0.78 })
    );
    ball.position.y = 0.29;
    const band = new THREE.Mesh(
      res.trackGeometry(new THREE.TorusGeometry(0.27, 0.04, 5, 10)),
      res.getStandard('#ef4444', { roughness: 0.5, emissive: '#dc2626', emissiveIntensity: 0.2 })
    );
    band.position.y = 0.29;
    bodyGroup.add(ball, band);
    root.userData.rollMesh = bodyGroup;
  } else {
    // Snowman Guard
    const snowMat = res.getStandard('#f8fafc', { roughness: 0.8 });
    const hatMat = res.getStandard('#1e293b', { roughness: 0.45 });
    const scarfMat = res.getStandard('#ef4444', { roughness: 0.65 });
    const carrotMat = res.getStandard('#f97316', { roughness: 0.5 });

    const base = new THREE.Mesh(res.trackGeometry(new THREE.SphereGeometry(0.24, 8, 6)), snowMat);
    base.position.y = 0.22;
    const mid = new THREE.Mesh(res.trackGeometry(new THREE.SphereGeometry(0.18, 8, 6)), snowMat);
    mid.position.y = 0.52;
    const head = new THREE.Mesh(res.trackGeometry(new THREE.SphereGeometry(0.135, 8, 6)), snowMat);
    head.position.y = 0.76;

    const scarf = new THREE.Mesh(res.trackGeometry(new THREE.TorusGeometry(0.13, 0.035, 4, 8)), scarfMat);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 0.65;

    const brim = new THREE.Mesh(res.trackGeometry(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 8)), hatMat);
    brim.position.y = 0.87;
    const crown = new THREE.Mesh(res.trackGeometry(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 8)), hatMat);
    crown.position.y = 0.97;

    const nose = new THREE.Mesh(res.trackGeometry(new THREE.ConeGeometry(0.03, 0.12, 5)), carrotMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.76, 0.16);

    bodyGroup.add(base, mid, head, scarf, brim, crown, nose);
  }

  // Sweeping 3D Tracking Light attached to Hazard
  const emitterY = kind === 'moving_traffic' ? 0.58 : kind === 'snowball' ? 0.62 : 0.88;
  const trackingLight = createTrackingLightRig(res, lightRange, lightHalfAngle, emitterY);
  root.add(trackingLight);
  root.userData.trackingLight = trackingLight;

  // Alert beacon shown when hazard locks onto Santa!
  const alertMat = res.trackMaterial(
    new THREE.MeshStandardMaterial({
      color: '#ef4444',
      emissive: '#ef4444',
      emissiveIntensity: 1.0,
    })
  );
  const alertBeacon = new THREE.Mesh(
    res.trackGeometry(new THREE.OctahedronGeometry(0.12, 0)),
    alertMat
  );
  alertBeacon.position.y = 1.3;
  alertBeacon.visible = false;
  root.add(alertBeacon);
  root.userData.alertBeacon = alertBeacon;

  return root;
}

export function createTrapPadModel(
  res: MaterialPaletteCache,
  lightRange = 3.05,
  lightHalfAngle = 0.38
): THREE.Group {
  const root = new THREE.Group();
  addContactShadow(root, res, 0.36, 0.35);

  const plate = new THREE.Mesh(
    res.trackGeometry(new THREE.CylinderGeometry(0.4, 0.44, 0.08, 10)),
    res.getStandard('#334155', { roughness: 0.4, metalness: 0.65 })
  );
  plate.position.y = 0.04;
  root.add(plate);

  const ringMat = res.trackMaterial(
    new THREE.MeshStandardMaterial({
      color: '#4ade80',
      emissive: '#22c55e',
      emissiveIntensity: 0.65,
      roughness: 0.3,
    })
  );
  const ring = new THREE.Mesh(
    res.trackGeometry(new THREE.TorusGeometry(0.36, 0.032, 5, 10)),
    ringMat
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.08;
  root.add(ring);
  root.userData.ringMat = ringMat;

  // Central turret pedestal supporting the rotating tracking light
  const turretBase = new THREE.Mesh(
    res.trackGeometry(new THREE.CylinderGeometry(0.11, 0.15, 0.24, 6)),
    res.getStandard('#1e293b', { roughness: 0.38, metalness: 0.7 })
  );
  turretBase.position.y = 0.16;
  root.add(turretBase);

  const spikesGroup = new THREE.Group();
  const spikeGeo = res.trackGeometry(new THREE.ConeGeometry(0.065, 0.36, 5));
  const spikeMat = res.getStandard('#f43f5e', {
    roughness: 0.3,
    metalness: 0.4,
    emissive: '#e11d48',
    emissiveIntensity: 0.35,
  });
  [
    [-0.19, -0.17],
    [0.19, -0.17],
    [-0.19, 0.17],
    [0.19, 0.17],
  ].forEach(([sx, sz]) => {
    const spike = new THREE.Mesh(spikeGeo, spikeMat);
    spike.position.set(sx, 0.18, sz);
    spikesGroup.add(spike);
  });
  spikesGroup.position.y = -0.34;
  root.add(spikesGroup);
  root.userData.spikesGroup = spikesGroup;

  // Rotating 3D Tracking Light mounted atop the trap pad turret
  const trackingLight = createTrackingLightRig(res, lightRange, lightHalfAngle, 0.32);
  root.add(trackingLight);
  root.userData.trackingLight = trackingLight;

  return root;
}

export function createLauncherModel(
  res: MaterialPaletteCache,
  dirX: number,
  dirY: number
): THREE.Group {
  const root = new THREE.Group();

  const base = new THREE.Mesh(
    res.trackGeometry(new THREE.CylinderGeometry(0.32, 0.36, 0.36, 8)),
    res.getStandard('#1e293b', { roughness: 0.45, metalness: 0.6 })
  );
  base.position.y = 0.72;
  root.add(base);

  const cannon = new THREE.Group();
  cannon.position.y = 0.88;
  cannon.rotation.y = Math.atan2(dirX, dirY);
  root.add(cannon);

  const barrel = new THREE.Mesh(
    res.trackGeometry(new THREE.CylinderGeometry(0.14, 0.18, 0.56, 8)),
    res.getStandard('#dc2626', { roughness: 0.35, metalness: 0.45 })
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 0.25;
  cannon.add(barrel);

  const muzzleMat = res.trackMaterial(
    new THREE.MeshStandardMaterial({
      color: '#fde047',
      emissive: '#ef4444',
      emissiveIntensity: 0.2,
      roughness: 0.3,
    })
  );
  const muzzle = new THREE.Mesh(
    res.trackGeometry(new THREE.TorusGeometry(0.14, 0.03, 5, 8)),
    muzzleMat
  );
  muzzle.position.z = 0.53;
  cannon.add(muzzle);
  root.userData.muzzleMat = muzzleMat;

  return root;
}

export function createPortalModel(res: MaterialPaletteCache): THREE.Group {
  const root = new THREE.Group();

  const pillarMat = res.getStandard('#334155', { roughness: 0.4, metalness: 0.6 });
  const goldMat = res.getStandard('#fbbf24', {
    roughness: 0.25,
    metalness: 0.78,
    emissive: '#f59e0b',
    emissiveIntensity: 0.22,
  });
  const lanternMat = res.getStandard('#fde047', {
    emissive: '#fbbf24',
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });

  const pillarGeo = res.trackGeometry(new THREE.CylinderGeometry(0.11, 0.14, 1.45, 6));
  const leftP = new THREE.Mesh(pillarGeo, pillarMat);
  leftP.position.set(-0.5, 0.725, 0);
  const rightP = new THREE.Mesh(pillarGeo, pillarMat);
  rightP.position.set(0.5, 0.725, 0);
  root.add(leftP, rightP);

  // Arch lintel & lanterns atop pillars
  const lintel = new THREE.Mesh(
    res.trackGeometry(new THREE.BoxGeometry(1.22, 0.16, 0.26)),
    goldMat
  );
  lintel.position.y = 1.48;
  const lampGeo = res.trackGeometry(new THREE.SphereGeometry(0.1, 6, 5));
  const leftLamp = new THREE.Mesh(lampGeo, lanternMat);
  leftLamp.position.set(-0.5, 1.62, 0);
  const rightLamp = new THREE.Mesh(lampGeo, lanternMat);
  rightLamp.position.set(0.5, 1.62, 0);
  root.add(lintel, leftLamp, rightLamp);

  // Hinged Double Gate Doors (swing open when unlocked!)
  const barMat = res.getStandard('#991b1b', { roughness: 0.35, metalness: 0.5 });
  const leftDoor = new THREE.Group();
  leftDoor.position.set(-0.42, 0, 0.08);
  const rightDoor = new THREE.Group();
  rightDoor.position.set(0.42, 0, 0.08);

  const doorFrameGeo = res.trackGeometry(new THREE.BoxGeometry(0.4, 0.08, 0.06));
  const doorBarGeo = res.trackGeometry(new THREE.CylinderGeometry(0.025, 0.025, 1.22, 5));
  [
    { door: leftDoor, sign: 1 },
    { door: rightDoor, sign: -1 },
  ].forEach(({ door, sign }) => {
    const topRail = new THREE.Mesh(doorFrameGeo, goldMat);
    topRail.position.set(sign * 0.2, 1.22, 0);
    const botRail = new THREE.Mesh(doorFrameGeo, goldMat);
    botRail.position.set(sign * 0.2, 0.16, 0);
    door.add(topRail, botRail);
    for (let b = 0; b < 3; b++) {
      const bar = new THREE.Mesh(doorBarGeo, barMat);
      bar.position.set(sign * (0.08 + b * 0.13), 0.68, 0);
      door.add(bar);
    }
  });
  root.add(leftDoor, rightDoor);

  // Center Keyhole Lock Badge (visible while gate is locked)
  const lockBadge = new THREE.Group();
  lockBadge.position.set(0, 0.72, 0.16);
  const lockPlate = new THREE.Mesh(
    res.trackGeometry(new THREE.BoxGeometry(0.24, 0.26, 0.07)),
    goldMat
  );
  const lockCoreMat = res.trackMaterial(
    new THREE.MeshStandardMaterial({
      color: '#ef4444',
      emissive: '#ef4444',
      emissiveIntensity: 0.85,
      roughness: 0.25,
    })
  );
  const lockCore = new THREE.Mesh(
    res.trackGeometry(new THREE.OctahedronGeometry(0.075, 0)),
    lockCoreMat
  );
  lockCore.position.z = 0.05;
  lockBadge.add(lockPlate, lockCore);
  root.add(lockBadge);

  const torusMat = res.trackMaterial(
    new THREE.MeshStandardMaterial({
      color: '#64748b',
      emissive: '#334155',
      emissiveIntensity: 0.4,
      roughness: 0.25,
      metalness: 0.75,
    })
  );
  const ring = new THREE.Mesh(
    res.trackGeometry(new THREE.TorusGeometry(0.42, 0.06, 6, 12)),
    torusMat
  );
  ring.position.set(0, 0.76, -0.05);
  root.add(ring);

  const vortexMat = res.trackMaterial(
    new THREE.MeshStandardMaterial({
      color: '#10b981',
      emissive: '#34d399',
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    })
  );
  const vortex = new THREE.Mesh(
    res.trackGeometry(new THREE.CircleGeometry(0.38, 10)),
    vortexMat
  );
  vortex.position.set(0, 0.76, -0.05);
  root.add(vortex);

  const beamMat = res.trackMaterial(
    new THREE.MeshBasicMaterial({
      color: '#34d399',
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const beam = new THREE.Mesh(
    res.trackGeometry(new THREE.CylinderGeometry(0.28, 0.42, 3.4, 8, 1, true)),
    beamMat
  );
  beam.position.y = 1.7;
  root.add(beam);

  root.userData.leftDoor = leftDoor;
  root.userData.rightDoor = rightDoor;
  root.userData.lockBadge = lockBadge;
  root.userData.lockCoreMat = lockCoreMat;
  root.userData.torusMat = torusMat;
  root.userData.vortexMat = vortexMat;
  root.userData.vortex = vortex;
  root.userData.beamMat = beamMat;
  root.userData.ring = ring;
  return root;
}

export function createKeyModel(
  res: MaterialPaletteCache,
  kind: 'house' | 'gate' = 'house'
): THREE.Group {
  const root = new THREE.Group();
  addContactShadow(root, res, 0.22, 0.32);
  const isGate = kind === 'gate';
  const keyMat = res.getStandard(isGate ? '#34d399' : '#fbbf24', {
    roughness: 0.2,
    metalness: 0.85,
    emissive: isGate ? '#10b981' : '#f59e0b',
    emissiveIntensity: isGate ? 0.65 : 0.45,
  });
  const gemMat = res.getStandard(isGate ? '#fde047' : '#ffffff', {
    roughness: 0.15,
    emissive: isGate ? '#fbbf24' : '#fde047',
    emissiveIntensity: 0.85,
  });
  const spin = new THREE.Group();
  spin.position.y = 0.44;
  const bow = new THREE.Mesh(res.trackGeometry(new THREE.TorusGeometry(0.12, 0.032, 5, 10)), keyMat);
  bow.position.y = 0.13;
  const gem = new THREE.Mesh(res.trackGeometry(new THREE.OctahedronGeometry(0.065, 0)), gemMat);
  gem.position.y = 0.13;
  const shaft = new THREE.Mesh(res.trackGeometry(new THREE.CylinderGeometry(0.026, 0.026, 0.3, 5)), keyMat);
  shaft.position.y = -0.06;
  const tooth = new THREE.Mesh(res.trackGeometry(new THREE.BoxGeometry(0.11, 0.045, 0.03)), keyMat);
  tooth.position.set(0.055, -0.15, 0);
  spin.add(bow, gem, shaft, tooth);
  root.add(spin);
  root.userData.spin = spin;
  return root;
}

export function createSwitchModel(res: MaterialPaletteCache): THREE.Group {
  const root = new THREE.Group();
  const plinth = new THREE.Mesh(
    res.trackGeometry(new THREE.CylinderGeometry(0.25, 0.3, 0.18, 8)),
    res.getStandard('#334155', { roughness: 0.5, metalness: 0.5 })
  );
  plinth.position.y = 0.09;
  const orbMat = res.trackMaterial(
    new THREE.MeshStandardMaterial({
      color: '#fde047',
      emissive: '#f59e0b',
      emissiveIntensity: 0.8,
      roughness: 0.2,
    })
  );
  const orb = new THREE.Mesh(res.trackGeometry(new THREE.OctahedronGeometry(0.14, 0)), orbMat);
  orb.position.y = 0.34;
  root.add(plinth, orb);
  root.userData.orb = orb;
  root.userData.orbMat = orbMat;
  return root;
}

export function createChimneyPadModel(res: MaterialPaletteCache): THREE.Group {
  const root = new THREE.Group();
  const brick = new THREE.Mesh(
    res.trackGeometry(new THREE.BoxGeometry(0.68, 0.36, 0.68)),
    res.getStandard('#9a3412', { roughness: 0.85 })
  );
  brick.position.y = 0.18;
  const rim = new THREE.Mesh(
    res.trackGeometry(new THREE.BoxGeometry(0.76, 0.08, 0.76)),
    res.getStandard('#cbd5e1', { roughness: 0.7 })
  );
  rim.position.y = 0.38;
  const pit = new THREE.Mesh(
    res.trackGeometry(new THREE.BoxGeometry(0.46, 0.06, 0.46)),
    res.getStandard('#fb923c', { emissive: '#f97316', emissiveIntensity: 0.8 })
  );
  pit.position.y = 0.41;
  root.add(brick, rim, pit);
  return root;
}

export function createPowerUpModel(res: MaterialPaletteCache, kind: PowerUpKind): THREE.Group {
  const root = new THREE.Group();
  addContactShadow(root, res, 0.24, 0.32);

  const colorMap: Record<PowerUpKind, string> = {
    magical_milk: '#e0f2fe',
    reindeer_dash: '#fb923c',
    snowflake_shield: '#38bdf8',
    golden_compass: '#fbbf24',
    magic_lantern: '#fde047',
    elf_helper: '#34d399',
    christmas_wings: '#f472b6',
  };
  const col = colorMap[kind];
  const mat = res.getStandard(col, {
    roughness: 0.25,
    metalness: 0.3,
    emissive: col,
    emissiveIntensity: 0.55,
  });

  const spin = new THREE.Group();
  spin.position.y = 0.42;

  const core = new THREE.Mesh(
    res.trackGeometry(new THREE.IcosahedronGeometry(0.18, 0)),
    mat
  );
  const ring = new THREE.Mesh(
    res.trackGeometry(new THREE.TorusGeometry(0.26, 0.025, 5, 10)),
    res.getStandard('#ffffff', { emissive: col, emissiveIntensity: 0.6 })
  );
  spin.add(core, ring);
  root.add(spin);
  root.userData.spin = spin;
  return root;
}

export function createGoldenPresentModel(res: MaterialPaletteCache): THREE.Group {
  const root = new THREE.Group();
  addContactShadow(root, res, 0.28, 0.38);

  const spin = new THREE.Group();
  spin.position.y = 0.34;
  const box = new THREE.Mesh(
    res.trackGeometry(new THREE.BoxGeometry(0.36, 0.32, 0.36)),
    res.getStandard('#fbbf24', {
      roughness: 0.25,
      metalness: 0.75,
      emissive: '#f59e0b',
      emissiveIntensity: 0.4,
    })
  );
  const rib1 = new THREE.Mesh(
    res.trackGeometry(new THREE.BoxGeometry(0.39, 0.34, 0.08)),
    res.getStandard('#ef4444', { roughness: 0.35 })
  );
  const rib2 = new THREE.Mesh(
    res.trackGeometry(new THREE.BoxGeometry(0.08, 0.34, 0.39)),
    res.getStandard('#ef4444', { roughness: 0.35 })
  );
  spin.add(box, rib1, rib2);
  root.add(spin);
  root.userData.spin = spin;
  return root;
}

export function createCityLandmarkModel(
  res: MaterialPaletteCache,
  cityId: string,
  accentColor: string
): THREE.Group {
  const root = new THREE.Group();
  const baseMat = res.getStandard('#334155', { roughness: 0.5, metalness: 0.4 });
  const goldMat = res.getStandard(accentColor, {
    roughness: 0.3,
    metalness: 0.6,
    emissive: accentColor,
    emissiveIntensity: 0.35,
  });

  if (cityId === 'paris') {
    // Eiffel-inspired glowing lattice tower
    const tower = new THREE.Mesh(res.trackGeometry(new THREE.ConeGeometry(1.1, 4.8, 4)), goldMat);
    tower.position.y = 2.4;
    tower.rotation.y = Math.PI / 4;
    const deck = new THREE.Mesh(res.trackGeometry(new THREE.BoxGeometry(1.3, 0.22, 1.3)), baseMat);
    deck.position.y = 1.6;
    const spire = new THREE.Mesh(res.trackGeometry(new THREE.SphereGeometry(0.25, 6, 5)), goldMat);
    spire.position.y = 4.9;
    root.add(tower, deck, spire);
  } else if (cityId === 'london') {
    // Big Ben clock tower
    const shaft = new THREE.Mesh(res.trackGeometry(new THREE.BoxGeometry(1.1, 4.0, 1.1)), baseMat);
    shaft.position.y = 2.0;
    const clock = new THREE.Mesh(
      res.trackGeometry(new THREE.CylinderGeometry(0.42, 0.42, 1.18, 10)),
      res.getStandard('#fef3c7', { emissive: '#fde047', emissiveIntensity: 0.65 })
    );
    clock.rotation.x = Math.PI / 2;
    clock.position.y = 3.3;
    const spire = new THREE.Mesh(res.trackGeometry(new THREE.ConeGeometry(0.85, 1.5, 4)), goldMat);
    spire.position.y = 4.75;
    spire.rotation.y = Math.PI / 4;
    root.add(shaft, clock, spire);
  } else {
    // Festive Grand Tree / Workshop / Skyscraper Spire
    const plinth = new THREE.Mesh(res.trackGeometry(new THREE.CylinderGeometry(1.1, 1.3, 0.5, 8)), baseMat);
    plinth.position.y = 0.25;
    const c1 = new THREE.Mesh(
      res.trackGeometry(new THREE.ConeGeometry(1.35, 1.8, 7)),
      res.getStandard('#15803d', { roughness: 0.75 })
    );
    c1.position.y = 1.35;
    const c2 = new THREE.Mesh(
      res.trackGeometry(new THREE.ConeGeometry(1.0, 1.5, 7)),
      res.getStandard('#16a34a', { roughness: 0.75 })
    );
    c2.position.y = 2.4;
    const c3 = new THREE.Mesh(
      res.trackGeometry(new THREE.ConeGeometry(0.65, 1.2, 7)),
      res.getStandard('#22c55e', { roughness: 0.75 })
    );
    c3.position.y = 3.3;
    const star = new THREE.Mesh(res.trackGeometry(new THREE.OctahedronGeometry(0.32, 0)), goldMat);
    star.position.y = 4.15;
    root.add(plinth, c1, c2, c3, star);
  }

  return root;
}

export function createVisionConeMesh(
  res: MaterialPaletteCache,
  range: number,
  halfAngle: number
): THREE.Mesh {
  const segs = 8;
  const positions: number[] = [];
  for (let i = 0; i < segs; i++) {
    const a1 = -halfAngle + (2 * halfAngle * i) / segs;
    const a2 = -halfAngle + (2 * halfAngle * (i + 1)) / segs;
    positions.push(0, 0.03, 0);
    positions.push(Math.sin(a1) * range, 0.03, Math.cos(a1) * range);
    positions.push(Math.sin(a2) * range, 0.03, Math.cos(a2) * range);
  }
  const geo = res.trackGeometry(new THREE.BufferGeometry());
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  const mat = res.trackMaterial(
    new THREE.MeshBasicMaterial({
      color: '#fde047',
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.coneMat = mat;
  return mesh;
}

export function createStealthEnemyModel(
  res: MaterialPaletteCache,
  role: StealthEnemyRole,
  range: number,
  halfAngle: number
): THREE.Group {
  const root = new THREE.Group();
  addContactShadow(root, res, 0.3, 0.38);

  const actor = new THREE.Group();
  root.add(actor);
  root.userData.actor = actor;

  const skinMat = res.getStandard('#fed7aa', { roughness: 0.65 });
  const darkMat = res.getStandard('#0f172a', { roughness: 0.45 });

  if (role === 'guard') {
    const uniformMat = res.getStandard('#1e3a8a', { roughness: 0.55, metalness: 0.15 });
    const goldMat = res.getStandard('#fbbf24', { roughness: 0.25, metalness: 0.8 });
    const torso = new THREE.Mesh(res.trackGeometry(new THREE.CylinderGeometry(0.2, 0.24, 0.52, 8)), uniformMat);
    torso.position.y = 0.36;
    const badge = new THREE.Mesh(res.trackGeometry(new THREE.BoxGeometry(0.08, 0.08, 0.04)), goldMat);
    badge.position.set(0.08, 0.48, 0.21);
    const head = new THREE.Mesh(res.trackGeometry(new THREE.SphereGeometry(0.15, 8, 6)), skinMat);
    head.position.y = 0.74;
    const cap = new THREE.Mesh(res.trackGeometry(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 8)), uniformMat);
    cap.position.y = 0.88;
    const visor = new THREE.Mesh(res.trackGeometry(new THREE.BoxGeometry(0.18, 0.03, 0.12)), darkMat);
    visor.position.set(0, 0.84, 0.13);
    const torch = new THREE.Mesh(
      res.trackGeometry(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 6)),
      goldMat
    );
    torch.rotation.x = Math.PI / 2;
    torch.position.set(0.22, 0.42, 0.18);
    actor.add(torso, badge, head, cap, visor, torch);
  } else if (role === 'homeowner') {
    const sweaterMat = res.getStandard('#7c3aed', { roughness: 0.75 });
    const pantsMat = res.getStandard('#334155', { roughness: 0.7 });
    const legs = new THREE.Mesh(res.trackGeometry(new THREE.CylinderGeometry(0.17, 0.18, 0.26, 7)), pantsMat);
    legs.position.y = 0.15;
    const torso = new THREE.Mesh(res.trackGeometry(new THREE.SphereGeometry(0.22, 8, 6)), sweaterMat);
    torso.position.y = 0.42;
    torso.scale.set(1, 1.1, 0.9);
    const head = new THREE.Mesh(res.trackGeometry(new THREE.SphereGeometry(0.145, 8, 6)), skinMat);
    head.position.y = 0.72;
    const hair = new THREE.Mesh(
      res.trackGeometry(new THREE.SphereGeometry(0.152, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.55)),
      res.getStandard('#451a03', { roughness: 0.8 })
    );
    hair.position.y = 0.74;
    actor.add(legs, torso, head, hair);
  } else {
    // sleeping_kid or naughty_kid
    const pjColor = role === 'sleeping_kid' ? '#0ea5e9' : '#f97316';
    const pjMat = res.getStandard(pjColor, { roughness: 0.72 });
    const torso = new THREE.Mesh(res.trackGeometry(new THREE.CylinderGeometry(0.14, 0.17, 0.34, 7)), pjMat);
    torso.position.y = 0.24;
    const head = new THREE.Mesh(res.trackGeometry(new THREE.SphereGeometry(0.13, 8, 6)), skinMat);
    head.position.y = 0.5;
    const cap = new THREE.Mesh(
      res.trackGeometry(new THREE.ConeGeometry(0.13, 0.24, 7)),
      res.getStandard(role === 'sleeping_kid' ? '#fde047' : '#ef4444', { roughness: 0.65 })
    );
    cap.position.set(0, 0.66, -0.02);
    cap.rotation.x = -0.25;
    actor.add(torso, head, cap);
  }

  // Vision cone anchored to enemy root
  const cone = createVisionConeMesh(res, range, halfAngle);
  root.add(cone);
  root.userData.visionCone = cone;
  root.userData.coneMat = cone.userData.coneMat;

  // Overhead state beacon (? suspicious, ! chasing)
  const beaconMat = res.trackMaterial(
    new THREE.MeshStandardMaterial({
      color: '#fde047',
      emissive: '#fbbf24',
      emissiveIntensity: 0.9,
      roughness: 0.25,
    })
  );
  const beacon = new THREE.Mesh(
    res.trackGeometry(new THREE.OctahedronGeometry(0.11, 0)),
    beaconMat
  );
  beacon.position.y = 1.16;
  beacon.visible = false;
  root.add(beacon);
  root.userData.beacon = beacon;
  root.userData.beaconMat = beaconMat;

  return root;
}

export function createHidingSpotModel(
  res: MaterialPaletteCache,
  kind: HidingSpotKind
): THREE.Group {
  const root = new THREE.Group();

  const ringMat = res.trackMaterial(
    new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const ring = new THREE.Mesh(
    res.trackGeometry(new THREE.RingGeometry(0.36, 0.45, 10)),
    ringMat
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  root.add(ring);
  root.userData.ringMat = ringMat;

  if (kind === 'wardrobe') {
    const wood = res.getStandard('#78350f', { roughness: 0.72 });
    const trim = res.getStandard('#fbbf24', { roughness: 0.3, metalness: 0.7 });
    const body = new THREE.Mesh(res.trackGeometry(new THREE.BoxGeometry(0.54, 0.88, 0.44)), wood);
    body.position.set(0, 0.44, -0.15);
    const knob = new THREE.Mesh(res.trackGeometry(new THREE.SphereGeometry(0.035, 5, 4)), trim);
    knob.position.set(0.07, 0.46, 0.08);
    root.add(body, knob);
  } else if (kind === 'bed') {
    const frame = res.getStandard('#78350f', { roughness: 0.75 });
    const quilt = res.getStandard('#dc2626', { roughness: 0.8 });
    const pillow = res.getStandard('#f8fafc', { roughness: 0.85 });
    const base = new THREE.Mesh(res.trackGeometry(new THREE.BoxGeometry(0.64, 0.18, 0.56)), frame);
    base.position.set(0, 0.12, -0.05);
    const top = new THREE.Mesh(res.trackGeometry(new THREE.BoxGeometry(0.62, 0.12, 0.52)), quilt);
    top.position.set(0, 0.25, -0.05);
    const pil = new THREE.Mesh(res.trackGeometry(new THREE.BoxGeometry(0.36, 0.08, 0.16)), pillow);
    pil.position.set(0, 0.34, -0.2);
    root.add(base, top, pil);
  } else if (kind === 'sofa') {
    const plush = res.getStandard('#991b1b', { roughness: 0.82 });
    const seat = new THREE.Mesh(res.trackGeometry(new THREE.BoxGeometry(0.68, 0.22, 0.38)), plush);
    seat.position.set(0, 0.14, -0.1);
    const back = new THREE.Mesh(res.trackGeometry(new THREE.BoxGeometry(0.68, 0.34, 0.12)), plush);
    back.position.set(0, 0.34, -0.25);
    root.add(seat, back);
  } else if (kind === 'curtain') {
    const velvet = res.getStandard('#be123c', { roughness: 0.78 });
    const rod = res.getStandard('#fbbf24', { roughness: 0.3, metalness: 0.75 });
    const drapeL = new THREE.Mesh(res.trackGeometry(new THREE.CylinderGeometry(0.11, 0.14, 0.92, 6)), velvet);
    drapeL.position.set(-0.2, 0.46, -0.18);
    const drapeR = new THREE.Mesh(res.trackGeometry(new THREE.CylinderGeometry(0.11, 0.14, 0.92, 6)), velvet);
    drapeR.position.set(0.2, 0.46, -0.18);
    const rail = new THREE.Mesh(res.trackGeometry(new THREE.CylinderGeometry(0.025, 0.025, 0.62, 5)), rod);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, 0.94, -0.18);
    root.add(drapeL, drapeR, rail);
  } else if (kind === 'tree_cover') {
    const green = res.getStandard('#166534', { roughness: 0.8 });
    const c1 = new THREE.Mesh(res.trackGeometry(new THREE.ConeGeometry(0.34, 0.56, 6)), green);
    c1.position.set(0, 0.32, -0.12);
    const c2 = new THREE.Mesh(res.trackGeometry(new THREE.ConeGeometry(0.24, 0.46, 6)), green);
    c2.position.set(0, 0.62, -0.12);
    root.add(c1, c2);
  } else {
    // giant gift_box
    const wrap = res.getStandard('#059669', { roughness: 0.55 });
    const ribbon = res.getStandard('#fbbf24', { roughness: 0.3, metalness: 0.6 });
    const box = new THREE.Mesh(res.trackGeometry(new THREE.BoxGeometry(0.56, 0.56, 0.56)), wrap);
    box.position.set(0, 0.28, -0.12);
    const rib = new THREE.Mesh(res.trackGeometry(new THREE.BoxGeometry(0.59, 0.58, 0.1)), ribbon);
    rib.position.set(0, 0.28, -0.12);
    root.add(box, rib);
  }

  return root;
}

export function createSecurityCameraModel(
  res: MaterialPaletteCache,
  range: number,
  halfAngle: number
): THREE.Group {
  const root = new THREE.Group();

  const pole = new THREE.Mesh(
    res.trackGeometry(new THREE.CylinderGeometry(0.05, 0.05, 0.36, 5)),
    res.getStandard('#334155', { roughness: 0.4, metalness: 0.6 })
  );
  pole.position.y = 1.12;
  root.add(pole);

  const head = new THREE.Group();
  head.position.y = 1.04;
  const housing = new THREE.Mesh(
    res.trackGeometry(new THREE.BoxGeometry(0.18, 0.14, 0.28)),
    res.getStandard('#e2e8f0', { roughness: 0.35, metalness: 0.4 })
  );
  housing.position.z = 0.08;
  const lens = new THREE.Mesh(
    res.trackGeometry(new THREE.SphereGeometry(0.05, 5, 4)),
    res.getStandard('#ef4444', { emissive: '#ef4444', emissiveIntensity: 1.0 })
  );
  lens.position.set(0, -0.01, 0.22);
  head.add(housing, lens);
  root.add(head);

  const cone = createVisionConeMesh(res, range, halfAngle);
  root.add(cone);

  root.userData.head = head;
  root.userData.cone = cone;
  root.userData.coneMat = cone.userData.coneMat;
  return root;
}

export function createLaserBarrierModel(
  res: MaterialPaletteCache,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): THREE.Group {
  const root = new THREE.Group();
  const cx = (x1 + x2) * 0.5;
  const cz = (y1 + y2) * 0.5;
  root.position.set(cx, 0, cz);

  const dx = x2 - x1;
  const dz = y2 - y1;
  const len = Math.max(0.2, Math.hypot(dx, dz));
  const yaw = Math.atan2(dx, dz);

  const postGeo = res.trackGeometry(new THREE.CylinderGeometry(0.055, 0.065, 0.72, 8));
  const postMat = res.getStandard('#334155', { roughness: 0.35, metalness: 0.7 });
  const p1 = new THREE.Mesh(postGeo, postMat);
  p1.position.set(x1 - cx, 0.36, y1 - cz);
  const p2 = new THREE.Mesh(postGeo, postMat);
  p2.position.set(x2 - cx, 0.36, y2 - cz);
  root.add(p1, p2);

  const beamMat = res.trackMaterial(
    new THREE.MeshBasicMaterial({
      color: '#f43f5e',
      transparent: true,
      opacity: 0.85,
    })
  );
  const beamGeo = res.trackGeometry(new THREE.CylinderGeometry(0.022, 0.022, len, 6));
  beamGeo.rotateX(Math.PI / 2);

  const b1 = new THREE.Mesh(beamGeo, beamMat);
  b1.position.y = 0.26;
  b1.rotation.y = yaw;

  const b2 = new THREE.Mesh(beamGeo, beamMat);
  b2.position.y = 0.52;
  b2.rotation.y = yaw;

  root.add(b1, b2);
  root.userData.beamMat = beamMat;
  root.userData.beams = [b1, b2];
  return root;
}

