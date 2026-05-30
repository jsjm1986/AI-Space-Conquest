import { GAME_CONFIG } from '../../config/game-config.js';

export const LANE_TIER_RULES = {
  trunk: {
    label: '中枢主航道',
    speedMultiplier: 1.32,
    strategicWeight: 1
  },
  corridor: {
    label: '战略走廊',
    speedMultiplier: 1.18,
    strategicWeight: 0.84
  },
  frontier: {
    label: '边境航道',
    speedMultiplier: 1.08,
    strategicWeight: 0.68
  },
  relay: {
    label: '外环中继',
    speedMultiplier: 1.02,
    strategicWeight: 0.54
  }
};

export const DEEP_SPACE_RULES = {
  intraRegionMultiplier: 0.92,
  interRegionMultiplier: 0.78,
  intraRegionLabel: '区域内深空跃迁',
  interRegionLabel: '跨区深空跃迁'
};

export function normalizeLaneKey(fromId, toId) {
  return [fromId, toId].filter(Boolean).sort().join('::');
}

export function buildLaneIndex(mapMeta) {
  const index = new Map();
  (mapMeta?.lanes || []).forEach(lane => {
    index.set(normalizeLaneKey(lane.from, lane.to), lane);
  });
  return index;
}

export function findLaneBetween(mapMeta, fromId, toId) {
  if (!fromId || !toId) return null;
  return buildLaneIndex(mapMeta).get(normalizeLaneKey(fromId, toId)) || null;
}

export function inferRegionId(position, mapMeta) {
  if (!position) return null;
  const width = mapMeta?.size?.width || GAME_CONFIG.MAP_SIZE.width || 1600;
  const height = mapMeta?.size?.height || GAME_CONFIG.MAP_SIZE.height || 1600;
  const centerX = width / 2;
  const centerY = height / 2;
  const coreRadius = Math.min(width, height) * 0.21;
  const regions = Array.isArray(mapMeta?.regions) ? mapMeta.regions : [];
  if (regions.length > 0) {
    const nearest = regions.reduce((best, region) => {
      if (!region?.center) return best;
      const distance = Math.hypot((position.x || 0) - region.center.x, (position.y || 0) - region.center.y);
      if (!best || distance < best.distance) {
        return { id: region.id, distance };
      }
      return best;
    }, null);
    if (nearest?.id) return nearest.id;
  }

  const dx = (position.x || 0) - centerX;
  const dy = (position.y || 0) - centerY;
  const distance = Math.hypot(dx, dy);
  if (distance <= coreRadius) return 'core';
  const angle = (Math.atan2(dy, dx) + Math.PI * 2 + Math.PI / 14) % (Math.PI * 2);
  return `sector_${Math.floor(angle / (Math.PI * 2 / 7)) + 1}`;
}

export function computeTravelProfile(originPlanet, targetPlanet, mapMeta) {
  const templateVariant = mapMeta?.template?.laneVariant || null;
  if (!originPlanet || !targetPlanet) {
    return {
      tier: 'deep_space',
      label: DEEP_SPACE_RULES.interRegionLabel,
      speedMultiplier: DEEP_SPACE_RULES.interRegionMultiplier,
      strategicWeight: 0.2,
      exposure: 0.35,
      stealthValue: 0.52,
      supplyQuality: 0.24,
      chokepointRisk: 0.18,
      templateModifier: templateVariant?.label || '深空跃迁',
      offLane: true
    };
  }

  const lane = findLaneBetween(mapMeta, originPlanet.id, targetPlanet.id);
  if (lane) {
    const tierRule = LANE_TIER_RULES[lane.tier] || LANE_TIER_RULES.frontier;
    return {
      laneId: lane.id,
      tier: lane.tier,
      label: lane.label || tierRule.label,
      speedMultiplier: lane.speedMultiplier || tierRule.speedMultiplier,
      strategicWeight: lane.strategicWeight || tierRule.strategicWeight,
      exposure: lane.exposure ?? 0.5,
      stealthValue: lane.stealthValue ?? 0.3,
      supplyQuality: lane.supplyQuality ?? 0.6,
      chokepointRisk: lane.chokepointRisk ?? 0.5,
      templateModifier: templateVariant?.label || tierRule.label,
      offLane: false
    };
  }

  const originRegion = originPlanet.regionId || inferRegionId(originPlanet.position, mapMeta);
  const targetRegion = targetPlanet.regionId || inferRegionId(targetPlanet.position, mapMeta);
  const intraRegion = originRegion && targetRegion && originRegion === targetRegion;

  return {
    tier: 'deep_space',
    label: intraRegion ? DEEP_SPACE_RULES.intraRegionLabel : DEEP_SPACE_RULES.interRegionLabel,
    speedMultiplier: intraRegion ? DEEP_SPACE_RULES.intraRegionMultiplier : DEEP_SPACE_RULES.interRegionMultiplier,
    strategicWeight: intraRegion ? 0.34 : 0.2,
    exposure: intraRegion ? 0.3 : 0.24,
    stealthValue: intraRegion ? 0.56 : 0.64,
    supplyQuality: intraRegion ? 0.36 : 0.24,
    chokepointRisk: intraRegion ? 0.22 : 0.12,
    templateModifier: templateVariant?.label || '深空跃迁',
    offLane: true
  };
}
