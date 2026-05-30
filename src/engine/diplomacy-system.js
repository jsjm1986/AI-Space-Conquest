import gameEventBus from '../services/game-event-bus.js';

const DIPLOMATIC_STATUS = {
  NEUTRAL: 'neutral',
  ALLY: 'ally',
  WAR: 'war',
  TRADE: 'trade'
};

const CRISIS_LEVEL = {
  CALM: 'calm',
  STRAINED: 'strained',
  CRISIS: 'crisis',
  FRACTURE: 'fracture',
  WAR: 'war'
};

const DEFAULT_RELATION_VALUES = {
  trust: 42,
  fear: 18,
  grievance: 0,
  dependency: 8,
  borderTension: 12,
  treatyStability: 0,
  crisisLevel: CRISIS_LEVEL.CALM,
  lastIncidentAt: null,
  lastTradeAt: null,
  lastProposalAt: null,
  lastStatusChangeAt: null,
  commitmentUntil: null,
  commonEnemyCount: 0
};

const PROPOSAL_TIMEOUT_MS = 30 * 60 * 1000;
const PROPOSAL_RETENTION_MS = 6 * 60 * 60 * 1000;

class DiplomacySystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.relations = new Map();
    this.allianceTimers = new Map();
    this.warCooldowns = new Map();
    this.lastUpdateAt = Date.now();
    if (this.gameState) {
      this.initRelations();
    }
  }

  setGameState(gameState) {
    this.gameState = gameState;
    this.initRelations();
  }

  initRelations() {
    this.relations.clear();
    this.allianceTimers.clear();
    this.gameState.diplomacyProposals = Array.isArray(this.gameState.diplomacyProposals) ? this.gameState.diplomacyProposals : [];
    const now = Date.now();
    const aiIds = this.gameState.aiStates.map(ai => ai.id);
    for (let i = 0; i < aiIds.length; i++) {
      for (let j = i + 1; j < aiIds.length; j++) {
        const ai1 = this.getAI(aiIds[i]);
        const existing = ai1?.diplomacy?.[aiIds[j]];
        const key = this.getRelationKey(aiIds[i], aiIds[j]);
        const normalized = this.normalizeRelation(existing, now);
        this.relations.set(key, normalized);
        if (normalized.status === DIPLOMATIC_STATUS.ALLY && normalized.commitmentUntil && normalized.commitmentUntil > now) {
          this.allianceTimers.set(key, normalized.commitmentUntil);
        }
      }
    }
    this.lastUpdateAt = now;
    this.syncAIStates();
  }

  getRelationKey(ai1, ai2) {
    return [ai1, ai2].sort().join('::');
  }

  parseRelationKey(key) {
    return key.split('::');
  }

  getRelation(ai1, ai2) {
    const key = this.getRelationKey(ai1, ai2);
    const relation = this.relations.get(key);
    if (relation) {
      return this.normalizeRelation(relation, Date.now());
    }
    return this.createRelation(DIPLOMATIC_STATUS.NEUTRAL, Date.now());
  }

  getAI(aiId) {
    return this.gameState.aiStates.find(ai => ai.id === aiId);
  }

  syncAIStates() {
    this.gameState.aiStates.forEach(ai => {
      ai.diplomacy = ai.diplomacy && typeof ai.diplomacy === 'object' ? ai.diplomacy : {};
    });

    this.relations.forEach((relation, key) => {
      const [ai1, ai2] = this.parseRelationKey(key);
      const left = this.getAI(ai1);
      const right = this.getAI(ai2);
      const normalized = this.normalizeRelation(relation, Date.now());
      if (left) left.diplomacy[ai2] = { ...normalized };
      if (right) right.diplomacy[ai1] = { ...normalized };
    });
  }

  _setRelation(ai1, ai2, status, since = Date.now(), updates = {}) {
    const key = this.getRelationKey(ai1, ai2);
    const current = this.getRelation(ai1, ai2);
    const next = this.normalizeRelation({
      ...current,
      ...updates,
      status,
      since,
      lastStatusChangeAt: updates.lastStatusChangeAt ?? since
    }, since);
    this.relations.set(key, next);
  }

  createRelation(status = DIPLOMATIC_STATUS.NEUTRAL, since = Date.now(), updates = {}) {
    return this.normalizeRelation({
      ...DEFAULT_RELATION_VALUES,
      status,
      since,
      lastStatusChangeAt: since,
      ...updates
    }, since);
  }

  normalizeRelation(relation = {}, fallbackTime = Date.now()) {
    if (typeof relation === 'string') {
      return this.createRelation(relation, fallbackTime);
    }

    const status = relation?.status || DIPLOMATIC_STATUS.NEUTRAL;
    const since = relation?.since || fallbackTime;
    const treatyStability = status === DIPLOMATIC_STATUS.ALLY || status === DIPLOMATIC_STATUS.TRADE
      ? this.clampMetric(relation?.treatyStability ?? 58)
      : this.clampMetric(relation?.treatyStability ?? 0);

    const normalized = {
      ...DEFAULT_RELATION_VALUES,
      ...(relation || {}),
      status,
      since,
      trust: this.clampMetric(relation?.trust ?? (status === DIPLOMATIC_STATUS.ALLY ? 65 : status === DIPLOMATIC_STATUS.TRADE ? 56 : status === DIPLOMATIC_STATUS.WAR ? 8 : 42)),
      fear: this.clampMetric(relation?.fear ?? 18),
      grievance: this.clampMetric(relation?.grievance ?? (status === DIPLOMATIC_STATUS.WAR ? 35 : 0)),
      dependency: this.clampMetric(relation?.dependency ?? (status === DIPLOMATIC_STATUS.ALLY ? 26 : status === DIPLOMATIC_STATUS.TRADE ? 22 : 8)),
      borderTension: this.clampMetric(relation?.borderTension ?? 12),
      treatyStability,
      lastIncidentAt: relation?.lastIncidentAt ?? null,
      lastTradeAt: relation?.lastTradeAt ?? null,
      lastProposalAt: relation?.lastProposalAt ?? null,
      lastStatusChangeAt: relation?.lastStatusChangeAt ?? since,
      commitmentUntil: relation?.commitmentUntil ?? null,
      commonEnemyCount: Math.max(0, Math.floor(relation?.commonEnemyCount ?? 0))
    };

    if (status === DIPLOMATIC_STATUS.WAR) {
      normalized.crisisLevel = CRISIS_LEVEL.WAR;
      normalized.treatyStability = 0;
    } else if (normalized.crisisLevel === CRISIS_LEVEL.WAR) {
      normalized.crisisLevel = CRISIS_LEVEL.CALM;
    }

    return normalized;
  }

  clampMetric(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
  }

  proposeAlliance(fromAi, toAi, duration = 7200000) {
    const validationError = this.validateParticipants(fromAi, toAi);
    if (validationError) {
      return { success: false, error: validationError };
    }

    const relation = this.getRelation(fromAi, toAi);
    if (relation.status === DIPLOMATIC_STATUS.WAR) {
      return { success: false, error: '交战中无法结盟' };
    }
    if (relation.status === DIPLOMATIC_STATUS.ALLY) {
      return { success: false, error: '已处于盟友状态' };
    }
    if (duration < 7200000 || duration > 28800000) {
      return { success: false, error: '结盟时间必须在2-8小时之间' };
    }
    if (this.hasPendingProposal(fromAi, toAi, 'alliance') || this.hasPendingProposal(toAi, fromAi, 'alliance')) {
      return { success: false, error: '已有待处理结盟提案' };
    }

    const proposal = this.createProposal('alliance', fromAi, toAi, { duration });
    this._recordWorldEvent('alliance_proposed', {
      proposalId: proposal.id,
      fromAi,
      toAi,
      duration,
      expiresAt: proposal.expiresAt
    });
    return { success: true, proposal };
  }

  acceptAlliance(fromAi, toAi, duration = 7200000, proposalId = null) {
    const validationError = this.validateParticipants(fromAi, toAi);
    if (validationError) {
      return { success: false, error: validationError };
    }

    const key = this.getRelationKey(fromAi, toAi);
    const acceptedAt = Date.now();
    this._setRelation(fromAi, toAi, DIPLOMATIC_STATUS.ALLY, acceptedAt, {
      trust: 68,
      grievance: Math.max(0, this.getRelation(fromAi, toAi).grievance - 8),
      dependency: Math.max(this.getRelation(fromAi, toAi).dependency, 24),
      treatyStability: 66,
      crisisLevel: CRISIS_LEVEL.CALM,
      commitmentUntil: acceptedAt + duration
    });
    this.allianceTimers.set(key, acceptedAt + duration);
    this.syncAIStates();
    if (proposalId) {
      this.resolveProposal(proposalId, 'accepted', toAi);
    }
    this._recordWorldEvent('alliance_formed', { fromAi, toAi, duration });
    return { success: true };
  }

  declareWar(fromAi, toAi) {
    const validationError = this.validateParticipants(fromAi, toAi);
    if (validationError) {
      return { success: false, error: validationError };
    }

    const relation = this.getRelation(fromAi, toAi);
    const key = this.getRelationKey(fromAi, toAi);
    const cooldown = this.warCooldowns.get(key);

    if (cooldown && Date.now() < cooldown && relation.status !== DIPLOMATIC_STATUS.WAR) {
      return { success: false, error: '停战冷却中，暂时不能再次宣战' };
    }
    if (relation.status === DIPLOMATIC_STATUS.WAR) {
      return { success: false, error: '已处于交战状态' };
    }

    let reputationPenalty = 0;
    if (relation.status === DIPLOMATIC_STATUS.ALLY) {
      const ai = this.getAI(fromAi);
      reputationPenalty = 50;
      if (ai) ai.reputation = Math.max(0, ai.reputation - reputationPenalty);
    } else if (relation.status === DIPLOMATIC_STATUS.TRADE) {
      const ai = this.getAI(fromAi);
      reputationPenalty = 20;
      if (ai) ai.reputation = Math.max(0, ai.reputation - reputationPenalty);
    }

    this.allianceTimers.delete(key);
    const declaredAt = Date.now();
    this._setRelation(fromAi, toAi, DIPLOMATIC_STATUS.WAR, declaredAt, {
      trust: Math.max(0, relation.trust - 30),
      grievance: Math.min(100, relation.grievance + (relation.status === DIPLOMATIC_STATUS.ALLY ? 34 : 18)),
      dependency: Math.max(0, relation.dependency - 12),
      borderTension: Math.max(72, relation.borderTension),
      treatyStability: 0,
      crisisLevel: CRISIS_LEVEL.WAR,
      commitmentUntil: null,
      lastIncidentAt: declaredAt
    });
    this.warCooldowns.set(key, Date.now() + 3600000);
    this.syncAIStates();
    this._recordWorldEvent('war_declared', {
      fromAi,
      toAi,
      previousStatus: relation.status,
      reputationPenalty
    });
    return { success: true };
  }

  launchSurpriseAttack(fromAi, toAi, reason = 'surprise_strike') {
    const validationError = this.validateParticipants(fromAi, toAi);
    if (validationError) {
      return { success: false, error: validationError };
    }

    const relation = this.getRelation(fromAi, toAi);
    if (relation.status === DIPLOMATIC_STATUS.WAR) {
      return { success: false, error: '已处于交战状态' };
    }

    const key = this.getRelationKey(fromAi, toAi);
    const now = Date.now();
    const attacker = this.getAI(fromAi);
    const reputationPenalty = relation.status === DIPLOMATIC_STATUS.ALLY ? 70 : relation.status === DIPLOMATIC_STATUS.TRADE ? 38 : 24;
    if (attacker) {
      attacker.reputation = Math.max(0, attacker.reputation - reputationPenalty);
    }

    this.allianceTimers.delete(key);
    this._setRelation(fromAi, toAi, DIPLOMATIC_STATUS.WAR, now, {
      trust: Math.max(0, relation.trust - 55),
      grievance: Math.min(100, relation.grievance + 42),
      dependency: Math.max(0, relation.dependency - 20),
      borderTension: Math.max(84, relation.borderTension),
      treatyStability: 0,
      crisisLevel: CRISIS_LEVEL.WAR,
      commitmentUntil: null,
      lastIncidentAt: now
    });
    this.warCooldowns.set(key, now + 3600000);
    this.syncAIStates();
    this._recordWorldEvent('surprise_attack', {
      fromAi,
      toAi,
      previousStatus: relation.status,
      reputationPenalty,
      reason
    });
    return { success: true };
  }

  proposePeace(fromAi, toAi) {
    const validationError = this.validateParticipants(fromAi, toAi);
    if (validationError) {
      return { success: false, error: validationError };
    }

    const relation = this.getRelation(fromAi, toAi);
    if (relation.status !== DIPLOMATIC_STATUS.WAR) {
      return { success: false, error: '未处于交战状态' };
    }
    const cooldown = this.warCooldowns.get(this.getRelationKey(fromAi, toAi));
    if (cooldown && Date.now() < cooldown) {
      return { success: false, error: '宣战后1小时内不能停战' };
    }
    if (this.hasPendingProposal(fromAi, toAi, 'peace') || this.hasPendingProposal(toAi, fromAi, 'peace')) {
      return { success: false, error: '已有待处理停战提案' };
    }

    const proposal = this.createProposal('peace', fromAi, toAi);
    this._recordWorldEvent('peace_proposed', {
      proposalId: proposal.id,
      fromAi,
      toAi,
      expiresAt: proposal.expiresAt
    });
    return { success: true, proposal };
  }

  acceptPeace(fromAi, toAi, proposalId = null) {
    const validationError = this.validateParticipants(fromAi, toAi);
    if (validationError) {
      return { success: false, error: validationError };
    }

    const key = this.getRelationKey(fromAi, toAi);
    this.allianceTimers.delete(key);
    const signedAt = Date.now();
    const previous = this.getRelation(fromAi, toAi);
    this._setRelation(fromAi, toAi, DIPLOMATIC_STATUS.NEUTRAL, signedAt, {
      trust: Math.max(18, previous.trust - 6),
      grievance: Math.max(0, previous.grievance - 12),
      dependency: Math.max(0, previous.dependency - 4),
      borderTension: Math.max(16, Math.round(previous.borderTension * 0.72)),
      treatyStability: 0,
      crisisLevel: CRISIS_LEVEL.STRAINED,
      commitmentUntil: null
    });
    this.warCooldowns.set(key, Date.now() + 3600000);
    this.syncAIStates();
    if (proposalId) {
      this.resolveProposal(proposalId, 'accepted', toAi);
    }
    this._recordWorldEvent('peace_signed', { fromAi, toAi });
    return { success: true };
  }

  proposeTrade(fromAi, toAi, offer, request) {
    const validationError = this.validateParticipants(fromAi, toAi);
    if (validationError) {
      return { success: false, error: validationError };
    }

    const relation = this.getRelation(fromAi, toAi);
    if (relation.status === DIPLOMATIC_STATUS.WAR) {
      return { success: false, error: '交战中无法贸易' };
    }
    if (this.hasPendingProposal(fromAi, toAi, 'trade') || this.hasPendingProposal(toAi, fromAi, 'trade')) {
      return { success: false, error: '已有待处理贸易提案' };
    }
    const normalizedOffer = this.normalizeBundle(offer);
    const normalizedRequest = this.normalizeBundle(request);
    if (!this.hasBundleResources(normalizedOffer) && !this.hasBundleResources(normalizedRequest)) {
      return { success: false, error: '贸易提案不能为空' };
    }
    if (!this.hasTradeAnchor(fromAi) || !this.hasTradeAnchor(toAi)) {
      return { success: false, error: '失去全部星球的帝国无法进行贸易' };
    }

    const proposal = this.createProposal('trade', fromAi, toAi, { offer: normalizedOffer, request: normalizedRequest });
    this._recordWorldEvent('trade_proposed', {
      proposalId: proposal.id,
      fromAi,
      toAi,
      offer: normalizedOffer,
      request: normalizedRequest,
      expiresAt: proposal.expiresAt
    });
    return { success: true, proposal };
  }

  executeTrade(fromAi, toAi, offer, request) {
    const validationError = this.validateParticipants(fromAi, toAi);
    if (validationError) return { success: false, error: validationError };

    const normalizedOffer = this.normalizeBundle(offer);
    const normalizedRequest = this.normalizeBundle(request);
    if (!this.hasBundleResources(normalizedOffer) && !this.hasBundleResources(normalizedRequest)) {
      return { success: false, error: '贸易提案不能为空' };
    }
    if (!this.hasTradeAnchor(fromAi) || !this.hasTradeAnchor(toAi)) {
      return { success: false, error: '失去全部星球的帝国无法进行贸易' };
    }
    if (!this.canAffordEmpire(fromAi, normalizedOffer)) return { success: false, error: '资源不足' };
    if (!this.canAffordEmpire(toAi, normalizedRequest)) return { success: false, error: '对方资源不足' };

    this.transferResources(fromAi, toAi, normalizedOffer);
    this.transferResources(toAi, fromAi, normalizedRequest);

    const now = Date.now();
    const current = this.getRelation(fromAi, toAi);
    const nextStatus = current.status === DIPLOMATIC_STATUS.ALLY ? DIPLOMATIC_STATUS.ALLY : DIPLOMATIC_STATUS.TRADE;
    this._setRelation(fromAi, toAi, nextStatus, current.since || now, {
      trust: Math.min(100, current.trust + 6),
      grievance: Math.max(0, current.grievance - 4),
      dependency: Math.min(100, current.dependency + 10),
      borderTension: Math.max(0, current.borderTension - 3),
      treatyStability: nextStatus === DIPLOMATIC_STATUS.TRADE ? Math.max(52, current.treatyStability + 8) : Math.min(100, current.treatyStability + 4),
      crisisLevel: current.crisisLevel === CRISIS_LEVEL.CALM ? CRISIS_LEVEL.CALM : CRISIS_LEVEL.STRAINED,
      lastTradeAt: now
    });
    this.syncAIStates();

    this._recordWorldEvent('trade_executed', { fromAi, toAi, offer: normalizedOffer, request: normalizedRequest });
    return { success: true };
  }

  acceptProposal(proposalId, responderId) {
    const proposal = this.getProposal(proposalId);
    if (!proposal || proposal.status !== 'pending') {
      return { success: false, error: '提案不存在或已处理' };
    }
    if (proposal.toAi !== responderId) {
      return { success: false, error: '无权处理该提案' };
    }

    if (proposal.type === 'alliance') {
      return this.acceptAlliance(proposal.fromAi, proposal.toAi, proposal.duration || 7200000, proposalId);
    }
    if (proposal.type === 'peace') {
      return this.acceptPeace(proposal.fromAi, proposal.toAi, proposalId);
    }
    if (proposal.type === 'trade') {
      const result = this.executeTrade(proposal.fromAi, proposal.toAi, proposal.offer || {}, proposal.request || {});
      if (result.success) {
        this.resolveProposal(proposalId, 'accepted', responderId);
      }
      return result;
    }

    return { success: false, error: '未知提案类型' };
  }

  rejectProposal(proposalId, responderId, reason = 'rejected') {
    const proposal = this.getProposal(proposalId);
    if (!proposal || proposal.status !== 'pending') {
      return { success: false, error: '提案不存在或已处理' };
    }
    if (proposal.toAi !== responderId) {
      return { success: false, error: '无权处理该提案' };
    }

    const relation = this.getRelation(proposal.fromAi, proposal.toAi);
    this._setRelation(proposal.fromAi, proposal.toAi, relation.status, relation.since, {
      trust: Math.max(0, relation.trust - (proposal.type === 'alliance' ? 7 : proposal.type === 'trade' ? 4 : 3)),
      grievance: Math.min(100, relation.grievance + (proposal.type === 'alliance' ? 8 : proposal.type === 'peace' ? 5 : 3)),
      treatyStability: relation.status === DIPLOMATIC_STATUS.ALLY || relation.status === DIPLOMATIC_STATUS.TRADE
        ? Math.max(0, relation.treatyStability - 6)
        : relation.treatyStability,
      lastProposalAt: Date.now()
    });
    this.syncAIStates();
    this.resolveProposal(proposalId, 'rejected', responderId, reason);
    this._recordWorldEvent('diplomacy_rejected', {
      proposalId,
      proposalType: proposal.type,
      fromAi: proposal.fromAi,
      toAi: proposal.toAi,
      rejectedBy: responderId,
      reason
    });
    return { success: true };
  }

  updateReputation(aiId, change, reason) {
    const ai = this.getAI(aiId);
    if (ai) {
      ai.reputation = Math.max(0, Math.min(100, ai.reputation + change));
    }
  }

  update(now = Date.now()) {
    const elapsedSeconds = Math.max(1, (now - (this.lastUpdateAt || now - 1000)) / 1000);
    const relationEvents = [];

    for (const key of this.relations.keys()) {
      const [ai1, ai2] = this.parseRelationKey(key);
      const previous = this.getRelation(ai1, ai2);
      const next = this.evaluateDynamicRelation(ai1, ai2, previous, now, elapsedSeconds);
      this.relations.set(key, next);
      relationEvents.push(...this.getRelationDeltaEvents(ai1, ai2, previous, next, now));
    }

    relationEvents.push(...this.resolveAllianceLifecycle(now));
    this.cleanupProposals();
    this.syncAIStates();
    relationEvents.forEach(event => this._recordWorldEvent(event.type, event.data));
    this.lastUpdateAt = now;
  }

  canAttack(attackerId, defenderId) {
    if (!attackerId || !defenderId || attackerId === defenderId) {
      return false;
    }
    const relation = this.getRelation(attackerId, defenderId);
    return relation.status === DIPLOMATIC_STATUS.WAR;
  }

  _recordWorldEvent(type, data) {
    if (!this.gameState) return;
    gameEventBus.recordWorldEvent(this.gameState, type, data);
  }

  createProposal(type, fromAi, toAi, extra = {}) {
    const createdAt = Date.now();
    const proposal = {
      id: `proposal_${createdAt}_${Math.random().toString(36).slice(2, 10)}`,
      type,
      fromAi,
      toAi,
      status: 'pending',
      createdAt,
      expiresAt: extra.expiresAt ?? (createdAt + PROPOSAL_TIMEOUT_MS),
      ...extra
    };

    this.gameState.diplomacyProposals.push(proposal);
    const relation = this.getRelation(fromAi, toAi);
    this._setRelation(fromAi, toAi, relation.status, relation.since, {
      lastProposalAt: createdAt
    });
    this.syncAIStates();
    this.cleanupProposals();
    return proposal;
  }

  hasPendingProposal(fromAi, toAi, type) {
    this.expireStaleProposals();
    return this.gameState.diplomacyProposals.some(proposal =>
      proposal.status === 'pending' &&
      proposal.type === type &&
      proposal.fromAi === fromAi &&
      proposal.toAi === toAi
    );
  }

  getProposal(proposalId) {
    this.expireStaleProposals();
    return this.gameState.diplomacyProposals.find(proposal => proposal.id === proposalId) || null;
  }

  resolveProposal(proposalId, status, responderId, reason = null) {
    const proposal = this.getProposal(proposalId);
    if (!proposal || proposal.status !== 'pending') return null;

    proposal.status = status;
    proposal.resolvedAt = Date.now();
    proposal.responderId = responderId;
    proposal.reason = reason;
    return proposal;
  }

  expireStaleProposals(now = Date.now()) {
    if (!Array.isArray(this.gameState.diplomacyProposals)) {
      this.gameState.diplomacyProposals = [];
      return;
    }

    let changed = false;
    for (const proposal of this.gameState.diplomacyProposals) {
      const expiresAt = proposal.expiresAt ?? ((proposal.createdAt || now) + PROPOSAL_TIMEOUT_MS);
      proposal.expiresAt = expiresAt;
      if (proposal.status === 'pending' && expiresAt <= now) {
        proposal.status = 'expired';
        proposal.resolvedAt = now;
        proposal.reason = proposal.reason || 'timed_out';
        changed = true;
        this._recordWorldEvent('proposal_expired', {
          proposalId: proposal.id,
          type: proposal.type,
          fromAi: proposal.fromAi,
          toAi: proposal.toAi
        });
      }
    }

    if (changed) {
      this.syncAIStates();
    }
  }

  cleanupProposals(now = Date.now()) {
    if (!Array.isArray(this.gameState.diplomacyProposals)) {
      this.gameState.diplomacyProposals = [];
      return;
    }

    this.expireStaleProposals(now);
    this.gameState.diplomacyProposals = this.gameState.diplomacyProposals
      .filter(proposal => proposal.status === 'pending' || (now - (proposal.resolvedAt || proposal.createdAt || 0)) < PROPOSAL_RETENTION_MS)
      .slice(-200);
  }

  canAffordEmpire(aiId, bundle) {
    const totals = this.gameState.planets
      .filter(planet => planet.owner === aiId)
      .reduce((acc, planet) => {
        acc.metal += planet.resources?.metal || 0;
        acc.energy += planet.resources?.energy || 0;
        acc.population += planet.resources?.population || 0;
        return acc;
      }, { metal: 0, energy: 0, population: 0 });

    return Object.entries(bundle || {}).every(([resource, amount]) => (totals[resource] || 0) >= amount);
  }

  hasTradeAnchor(aiId) {
    return this.gameState.planets.some(planet => planet.owner === aiId);
  }

  validateParticipants(fromAi, toAi) {
    if (!fromAi || !toAi) return '外交对象无效';
    if (fromAi === toAi) return '不能对自己发起外交操作';
    if (!this.getAI(fromAi) || !this.getAI(toAi)) return 'AI不存在';
    return null;
  }

  normalizeBundle(bundle = {}) {
    const normalized = {};
    Object.entries(bundle || {}).forEach(([resource, amount]) => {
      const value = Math.max(0, Math.floor(Number(amount) || 0));
      if (value > 0) {
        normalized[resource] = value;
      }
    });
    return normalized;
  }

  hasBundleResources(bundle = {}) {
    return Object.values(bundle).some(amount => Number(amount) > 0);
  }

  evaluateDynamicRelation(ai1, ai2, relation, now, elapsedSeconds) {
    const leftPlanets = this.getOwnedPlanets(ai1);
    const rightPlanets = this.getOwnedPlanets(ai2);
    const borderStats = this.computeBorderStats(leftPlanets, rightPlanets);
    const hostilePressure = Math.max(
      this.calculateMilitaryPressure(ai1, rightPlanets),
      this.calculateMilitaryPressure(ai2, leftPlanets)
    );
    const commonEnemyCount = this.countCommonEnemies(ai1, ai2);
    const recentTradeBoost = relation.lastTradeAt && (now - relation.lastTradeAt) < 30 * 60 * 1000 ? 10 : 0;
    const hostileStatusPenalty = relation.status === DIPLOMATIC_STATUS.WAR ? 30 : 0;

    const borderTensionTarget = this.clampMetric(
      8 +
      borderStats.nearbyPairs * 12 +
      borderStats.chokepointPairs * 10 +
      hostilePressure * 0.18 +
      hostileStatusPenalty -
      (relation.status === DIPLOMATIC_STATUS.ALLY ? 16 : 0) -
      recentTradeBoost
    );

    const dependencyTarget = this.clampMetric(
      (relation.status === DIPLOMATIC_STATUS.ALLY ? 26 : relation.status === DIPLOMATIC_STATUS.TRADE ? 24 : 8) +
      commonEnemyCount * 6 +
      recentTradeBoost * 0.8 -
      borderTensionTarget * 0.08
    );

    const trustTarget = this.clampMetric(
      (relation.status === DIPLOMATIC_STATUS.ALLY ? 70 : relation.status === DIPLOMATIC_STATUS.TRADE ? 58 : relation.status === DIPLOMATIC_STATUS.WAR ? 6 : 42) +
      commonEnemyCount * 8 +
      dependencyTarget * 0.15 -
      relation.grievance * 0.42 -
      borderTensionTarget * 0.3
    );

    const fearTarget = this.clampMetric(12 + hostilePressure * 0.2 + borderTensionTarget * 0.35 + borderStats.chokepointPairs * 6);
    const grievanceDrift = relation.status === DIPLOMATIC_STATUS.WAR ? 0.6 : borderTensionTarget >= 55 ? 0.18 : -0.12;
    const grievanceNext = this.clampMetric(relation.grievance + grievanceDrift * elapsedSeconds);
    const treatyStabilityTarget = (relation.status === DIPLOMATIC_STATUS.ALLY || relation.status === DIPLOMATIC_STATUS.TRADE)
      ? this.clampMetric(64 + dependencyTarget * 0.22 + commonEnemyCount * 4 - grievanceNext * 0.42 - borderTensionTarget * 0.36)
      : 0;

    const next = {
      ...relation,
      trust: this.smoothMetric(relation.trust, trustTarget, elapsedSeconds, 0.22),
      fear: this.smoothMetric(relation.fear, fearTarget, elapsedSeconds, 0.2),
      grievance: grievanceNext,
      dependency: this.smoothMetric(relation.dependency, dependencyTarget, elapsedSeconds, 0.16),
      borderTension: this.smoothMetric(relation.borderTension, borderTensionTarget, elapsedSeconds, 0.24),
      treatyStability: relation.status === DIPLOMATIC_STATUS.ALLY || relation.status === DIPLOMATIC_STATUS.TRADE
        ? this.smoothMetric(relation.treatyStability, treatyStabilityTarget, elapsedSeconds, 0.24)
        : 0,
      commonEnemyCount
    };
    next.crisisLevel = this.deriveCrisisLevel(next);
    if (next.status === DIPLOMATIC_STATUS.WAR) {
      next.crisisLevel = CRISIS_LEVEL.WAR;
      next.treatyStability = 0;
    }
    return next;
  }

  resolveAllianceLifecycle(now) {
    const events = [];
    for (const [key, reviewAt] of [...this.allianceTimers.entries()]) {
      const [ai1, ai2] = this.parseRelationKey(key);
      const relation = this.getRelation(ai1, ai2);
      if (relation.status !== DIPLOMATIC_STATUS.ALLY) {
        this.allianceTimers.delete(key);
        continue;
      }
      if (now < reviewAt) {
        continue;
      }

      const shouldBreak = relation.treatyStability < 45 || relation.crisisLevel === CRISIS_LEVEL.FRACTURE || relation.borderTension >= 70;
      const shouldContinue = relation.treatyStability >= 72 && relation.commonEnemyCount > 0 && relation.borderTension < 50;
      if (shouldContinue) {
        this.allianceTimers.set(key, now + 30 * 60 * 1000);
        continue;
      }

      this.allianceTimers.delete(key);
      this._setRelation(ai1, ai2, DIPLOMATIC_STATUS.NEUTRAL, now, {
        trust: Math.max(18, relation.trust - (shouldBreak ? 24 : 10)),
        grievance: Math.min(100, relation.grievance + (shouldBreak ? 12 : 4)),
        dependency: Math.max(0, relation.dependency - 12),
        borderTension: Math.max(14, relation.borderTension - 6),
        treatyStability: 0,
        crisisLevel: shouldBreak ? CRISIS_LEVEL.STRAINED : CRISIS_LEVEL.CALM,
        commitmentUntil: null,
        lastIncidentAt: shouldBreak ? now : relation.lastIncidentAt
      });

      events.push({
        type: shouldBreak ? 'alliance_broken' : 'alliance_expired',
        data: {
          fromAi: ai1,
          toAi: ai2,
          stability: relation.treatyStability,
          borderTension: relation.borderTension,
          grievance: relation.grievance
        }
      });
    }
    return events;
  }

  getRelationDeltaEvents(ai1, ai2, previous, next, now) {
    const events = [];
    const previousSeverity = this.getCrisisSeverity(previous.crisisLevel);
    const nextSeverity = this.getCrisisSeverity(next.crisisLevel);
    if (previous.status !== DIPLOMATIC_STATUS.WAR && next.status !== DIPLOMATIC_STATUS.WAR && previousSeverity !== nextSeverity) {
      if (nextSeverity >= 2 && nextSeverity > previousSeverity) {
        events.push({
          type: 'crisis_escalated',
          data: { fromAi: ai1, toAi: ai2, crisisLevel: next.crisisLevel, borderTension: next.borderTension, grievance: next.grievance, timestamp: now }
        });
      } else if (previousSeverity >= 2 && nextSeverity < previousSeverity) {
        events.push({
          type: 'crisis_cooled',
          data: { fromAi: ai1, toAi: ai2, crisisLevel: next.crisisLevel, borderTension: next.borderTension, grievance: next.grievance, timestamp: now }
        });
      }
    }
    return events;
  }

  getCrisisSeverity(level) {
    return {
      [CRISIS_LEVEL.CALM]: 0,
      [CRISIS_LEVEL.STRAINED]: 1,
      [CRISIS_LEVEL.CRISIS]: 2,
      [CRISIS_LEVEL.FRACTURE]: 3,
      [CRISIS_LEVEL.WAR]: 4
    }[level] ?? 0;
  }

  deriveCrisisLevel(relation) {
    if (relation.status === DIPLOMATIC_STATUS.WAR) return CRISIS_LEVEL.WAR;
    if ((relation.status === DIPLOMATIC_STATUS.ALLY || relation.status === DIPLOMATIC_STATUS.TRADE) && (relation.treatyStability < 28 || relation.borderTension >= 78 || relation.grievance >= 72)) {
      return CRISIS_LEVEL.FRACTURE;
    }
    if (relation.borderTension >= 62 || relation.grievance >= 55 || relation.fear >= 68) {
      return CRISIS_LEVEL.CRISIS;
    }
    if (relation.borderTension >= 38 || relation.grievance >= 26 || relation.fear >= 42) {
      return CRISIS_LEVEL.STRAINED;
    }
    return CRISIS_LEVEL.CALM;
  }

  smoothMetric(current, target, elapsedSeconds, factor = 0.2) {
    const currentValue = Number(current) || 0;
    const next = currentValue + (target - currentValue) * Math.min(1, factor * Math.max(1, elapsedSeconds));
    return this.clampMetric(next);
  }

  getOwnedPlanets(aiId) {
    return this.gameState.planets.filter(planet => planet.owner === aiId);
  }

  getOwnedFleets(aiId) {
    return this.gameState.fleets.filter(fleet => fleet.owner === aiId);
  }

  computeBorderStats(leftPlanets, rightPlanets) {
    let nearbyPairs = 0;
    let chokepointPairs = 0;
    for (const left of leftPlanets) {
      for (const right of rightPlanets) {
        const distance = this.distanceBetween(left.position, right.position);
        if (distance <= 260) {
          nearbyPairs += 1;
        }
        if (distance <= 320 && (this.isStrategicBorderNode(left) || this.isStrategicBorderNode(right))) {
          chokepointPairs += 1;
        }
      }
    }
    return { nearbyPairs, chokepointPairs };
  }

  isStrategicBorderNode(planet) {
    return ['approach_gate', 'border_bastion', 'core_relay', 'central_hub'].includes(planet?.strategicRole);
  }

  calculateMilitaryPressure(attackerId, defenderPlanets) {
    if (!Array.isArray(defenderPlanets) || defenderPlanets.length === 0) return 0;

    return this.getOwnedFleets(attackerId).reduce((pressure, fleet) => {
      const power = (fleet.totalPower || 0) * Math.max(0.35, fleet.readiness ?? 1);
      const targetedEnemy = defenderPlanets.some(planet => planet.id === fleet.targetPlanet);
      if (targetedEnemy) {
        return pressure + power * 0.35;
      }

      const nearestDistance = defenderPlanets.reduce((best, planet) => {
        return Math.min(best, this.distanceBetween(fleet.position, planet.position));
      }, Number.POSITIVE_INFINITY);

      if (!Number.isFinite(nearestDistance) || nearestDistance > 260) {
        return pressure;
      }

      return pressure + power * Math.max(0, 1 - nearestDistance / 260) * 0.22;
    }, 0);
  }

  countCommonEnemies(ai1, ai2) {
    const aiIds = this.gameState.aiStates.map(ai => ai.id).filter(id => id !== ai1 && id !== ai2);
    return aiIds.filter(otherId => {
      return this.getRelation(ai1, otherId).status === DIPLOMATIC_STATUS.WAR &&
        this.getRelation(ai2, otherId).status === DIPLOMATIC_STATUS.WAR;
    }).length;
  }

  distanceBetween(left, right) {
    if (!left || !right) return Number.POSITIVE_INFINITY;
    const dx = (left.x || 0) - (right.x || 0);
    const dy = (left.y || 0) - (right.y || 0);
    return Math.sqrt(dx * dx + dy * dy);
  }

  transferResources(fromAi, toAi, bundle) {
    const fromPlanets = this.gameState.planets
      .filter(planet => planet.owner === fromAi)
      .sort((left, right) => ((right.resources?.metal || 0) + (right.resources?.energy || 0) + (right.resources?.population || 0)) - ((left.resources?.metal || 0) + (left.resources?.energy || 0) + (left.resources?.population || 0)));
    const toPlanets = this.gameState.planets
      .filter(planet => planet.owner === toAi)
      .sort((left, right) => ((right.resources?.metal || 0) + (right.resources?.energy || 0) + (right.resources?.population || 0)) - ((left.resources?.metal || 0) + (left.resources?.energy || 0) + (left.resources?.population || 0)));

    Object.entries(bundle || {}).forEach(([resource, amount]) => {
      let remaining = amount;
      fromPlanets.forEach(planet => {
        if (remaining <= 0) return;
        const available = planet.resources?.[resource] || 0;
        const deducted = Math.min(available, remaining);
        planet.resources[resource] -= deducted;
        remaining -= deducted;
      });

      if (toPlanets[0]) {
        toPlanets[0].resources[resource] = (toPlanets[0].resources?.[resource] || 0) + amount;
      }
    });
  }
}

export { DiplomacySystem, DIPLOMATIC_STATUS };
export default DiplomacySystem;
