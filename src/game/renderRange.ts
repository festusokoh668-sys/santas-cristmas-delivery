export type CameraViewMode = 'slightly_3d' | 'top_down' | 'cinematic';

export interface RenderRangeConfig {
  farPlane: number;
  fogNear: number;
  fogFar: number;
  cullRadius: number;
  camHeight: number;
  camZOffset: number;
  lookY: number;
  lookZOffset: number;
  maxPixelRatio: number;
  shadowFrustumHalfSize: number;
  shadowMapSize: number;
  snowCount: number;
  snowBoxHalfX: number;
  snowBoxHalfZ: number;
}

export function get3dRenderRangeConfig(
  mode: CameraViewMode,
  isCompactViewport: boolean
): RenderRangeConfig {
  if (mode === 'top_down') {
    return isCompactViewport
      ? {
          farPlane: 21,
          fogNear: 10.5,
          fogFar: 18.5,
          cullRadius: 8.2,
          camHeight: 12.2,
          camZOffset: 0.55,
          lookY: 0.0,
          lookZOffset: 0.0,
          maxPixelRatio: 1.0,
          shadowFrustumHalfSize: 6.8,
          shadowMapSize: 512,
          snowCount: 85,
          snowBoxHalfX: 8,
          snowBoxHalfZ: 8,
        }
      : {
          farPlane: 25,
          fogNear: 12.5,
          fogFar: 22.5,
          cullRadius: 10.2,
          camHeight: 13.4,
          camZOffset: 0.65,
          lookY: 0.0,
          lookZOffset: 0.0,
          maxPixelRatio: 1.25,
          shadowFrustumHalfSize: 8.2,
          shadowMapSize: 512,
          snowCount: 130,
          snowBoxHalfX: 10,
          snowBoxHalfZ: 9.5,
        };
  }

  if (mode === 'cinematic') {
    return isCompactViewport
      ? {
          farPlane: 17,
          fogNear: 6.8,
          fogFar: 15.0,
          cullRadius: 7.2,
          camHeight: 6.2,
          camZOffset: 3.6,
          lookY: 0.32,
          lookZOffset: 0.0,
          maxPixelRatio: 1.0,
          shadowFrustumHalfSize: 6.0,
          shadowMapSize: 512,
          snowCount: 85,
          snowBoxHalfX: 8,
          snowBoxHalfZ: 8,
        }
      : {
          farPlane: 20.5,
          fogNear: 8.0,
          fogFar: 18.0,
          cullRadius: 8.8,
          camHeight: 6.6,
          camZOffset: 4.0,
          lookY: 0.34,
          lookZOffset: 0.0,
          maxPixelRatio: 1.25,
          shadowFrustumHalfSize: 7.2,
          shadowMapSize: 512,
          snowCount: 130,
          snowBoxHalfX: 10,
          snowBoxHalfZ: 9.5,
        };
  }

  // Default: 'slightly_3d' gentle 2.5D diorama with reduced 3D tilt and tight render range
  return isCompactViewport
    ? {
        farPlane: 19.5,
        fogNear: 7.5,
        fogFar: 17.0,
        cullRadius: 7.6,
        camHeight: 10.4,
        camZOffset: 2.3,
        lookY: 0.16,
        lookZOffset: 0.32,
        maxPixelRatio: 1.0,
        shadowFrustumHalfSize: 6.2,
        shadowMapSize: 512,
        snowCount: 85,
        snowBoxHalfX: 8,
        snowBoxHalfZ: 8,
      }
    : {
        farPlane: 23,
        fogNear: 9.5,
        fogFar: 20.5,
        cullRadius: 9.2,
        camHeight: 11.2,
        camZOffset: 2.6,
        lookY: 0.16,
        lookZOffset: 0.35,
        maxPixelRatio: 1.25,
        shadowFrustumHalfSize: 7.8,
        shadowMapSize: 512,
        snowCount: 130,
        snowBoxHalfX: 10,
        snowBoxHalfZ: 9.5,
      };
}

export function isWithinRenderRange(
  x: number,
  z: number,
  centerX: number,
  centerZ: number,
  radius: number
): boolean {
  const dx = x - centerX;
  const dz = z - centerZ;
  return dx * dx + dz * dz <= radius * radius;
}

export function wrapSnowflakeCoord(
  value: number,
  center: number,
  halfExtent: number
): number {
  const min = center - halfExtent;
  const max = center + halfExtent;
  const span = halfExtent * 2;
  if (span <= 0) return center;
  if (value < min) {
    return max - ((min - value) % span);
  }
  if (value > max) {
    return min + ((value - max) % span);
  }
  return value;
}
