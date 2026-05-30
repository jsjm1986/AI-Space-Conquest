import { normalizeLaneKey } from './map-topology.js';

const FRONTLINE_WINDOW_MS = 15 * 60 * 1000;

function getLaneStateId(lane) {
  return lane?.id || normalizeLaneKey(lane?.from, lane?.to);
}

function getPlanetById(gameState, planetId) {
  return gameState?.planets?.find(planet => planet.id === planetId) || null;
}

function getRecentBattlePlanetIds(gameState, now = Date.now()) {
  const ids = new Set();
  for (const battle of gameState?.battles || []) {
    if (!battle?.planet || !battle.timestamp || now - battle.timestamp > FRONTLINE_WINDOW_MS) continue;
    ids.add(battle.planet);
  }
  return ids;
}

function getIncomingMovements(gameState, planetId) {
  return (gameState?.fleets || []).filter(fleet =>
    fleet.status === 'moving' &&
    (fleet.targetPlanet === planetId || fleet.currentPlanetId === planetId)
  );
}

function summarizeLaneState(lane, gameState, now = Date.now()) {
  const fromPlanet = getPlanetById(gameState, lane.from);
  const toPlanet = getPlanetById(gameState, lane.to);
  if (!fromPlanet || !toPlanet) {
    return null;
  }

  const recentBattlePlanetIds = getRecentBattlePlanetIds(gameState, now);
  const laneOwner = fromPlanet.owner && fromPlanet.owner === toPlanet.owner ? fromPlanet.owner : null;
  const endpointOwners = new Set([fromPlanet.owner, toPlanet.owner].filter(Boolean));
  const incomingToEndpoints = [
    ...getIncomingMovements(gameState, fromPlanet.id),
    ...getIncomingMovements(gameState, toPlanet.id)
  ];
  const incomingOwners = new Set(incomingToEndpoints.map(fleet => fleet.owner).filter(Boolean));
  const hostilePressure = [...incomingOwners].some(owner => owner && owner !== laneOwner);
  const activeBattle = recentBattlePlanetIds.has(fromPlanet.id) || recentBattlePlanetIds.has(toPlanet.id);
  const ownershipConflict = endpointOwners.size > 1;

  let status = 'neutral';
  if (laneOwner && !ownershipConflict && !hostilePressure && !activeBattle) {
    status = 'secured';
  } else if (laneOwner && (hostilePressure || activeBattle)) {
    status = 'pressured';
  } else if (ownershipConflict || hostilePressure || activeBattle) {
    status = 'contested';
  }

  const heat =
    (ownershipConflict ? 45 : 0) +
    (activeBattle ? 38 : 0) +
    incomingToEndpoints.length * 12 +
    (lane.strategicWeight || 0) * 28 +
    (lane.tier === 'trunk' ? 18 : lane.tier === 'corridor' ? 12 : 6);

  return {
    id: getLaneStateId(lane),
    from: lane.from,
    to: lane.to,
    owner: laneOwner,
    status,
    activeBattle,
    hostilePressure,
    incomingFleetCount: incomingToEndpoints.length,
    heat: Math.round(heat),
    updatedAt: now
  };
}

function buildStrategicMapState(gameState, now = Date.now()) {
  const lanes = Array.isArray(gameState?.mapMeta?.lanes) ? gameState.mapMeta.lanes : [];
  const laneStates = lanes
    .map(lane => summarizeLaneState(lane, gameState, now))
    .filter(Boolean);

  const frontlines = laneStates
    .filter(state => state.heat >= 38 || state.status === 'contested' || state.status === 'pressured')
    .sort((left, right) => right.heat - left.heat)
    .slice(0, 24);

  return {
    updatedAt: now,
    laneStates,
    frontlines
  };
}

function findLaneState(mapMeta, fromId, toId) {
  const key = normalizeLaneKey(fromId, toId);
  const laneStates = mapMeta?.dynamic?.laneStates || [];
  return laneStates.find(item => item.id === key || (item.from === fromId && item.to === toId) || (item.from === toId && item.to === fromId)) || null;
}

export {
  buildStrategicMapState,
  findLaneState,
  getLaneStateId
};
