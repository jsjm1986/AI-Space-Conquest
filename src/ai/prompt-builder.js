import { AI_PERSONALITIES, BUILDINGS, TECH_TREE } from '../utils/constants.js';
import { computeTravelProfile } from '../utils/map-topology.js';

const STRATEGIC_ROLE_LABELS = {
  home_core: '母星核心',
  central_hub: '中央枢纽',
  approach_gate: '前线门扉',
  core_relay: '中央跳点',
  border_bastion: '边境关口',
  inner_resource: '内环资源星',
  frontier_resource: '边境资源星',
  outer_relay: '外环中继'
};

const STRATEGIC_ROLE_WEIGHTS = {
  home_core: 140,
  central_hub: 125,
  approach_gate: 96,
  core_relay: 88,
  border_bastion: 74,
  inner_resource: 70,
  frontier_resource: 62,
  outer_relay: 48
};

const SPECIAL_NODE_LABELS = {
  industrial_hub: '工业星',
  research_archive: '科研星',
  fortress_world: '要塞星',
  supply_nexus: '补给星',
  sensor_array: '监听星',
  arcology: '居住穹顶'
};

const GAME_RULES = `
游戏规则：
1. 时间机制：每秒1tick，资源每秒更新，建造/移动按实际时间计算
2. 地图：2200x2200坐标系，地图分为7个外环战区和1个中央资源环，并额外分布更多深空缓冲节点；存在主航道/战略走廊/边境航道/外环中继，远征线更长，回防与迂回窗口更大
3. 建筑类型：mine(矿场,+20%金属,500金属200能量,36分钟), powerPlant(能源站,+20%能量,400金属300能量,36分钟), shipyard(船坞,加速造船,800金属400能量,72分钟), defense(防御炮台,+100防御,600金属500能量,54分钟), lab(研究中心,加速科研,1000金属800能量,144分钟)
4. 舰船类型：scout(侦察5攻10防速10,100金属50能量,6分钟), frigate(护卫20攻30防速5,300金属150能量,18分钟), cruiser(巡洋60攻80防速3,800金属400能量,54分钟), battleship(战列150攻200防速2,2000金属1000能量,144分钟)
5. 科技类型：weaponUpgrade(武器强化), shieldTech(护盾技术), engineUpgrade(引擎升级), miningEfficiency(采矿效率), energyTech(能源技术), populationGrowth(人口增长), logisticsNetwork(后勤网络), siegeEngineering(攻城工程), fortification(要塞化), sensorNetwork(传感网络)
6. 行动：build建造建筑, ships建造舰船, attack攻击星球, defend调防关键节点, redeploy机动换防, contest争夺咽喉/中央环, research研究科技
7. 人口机制：人口决定舰队容量，人口不足时不能继续扩军
8. 补给与战备：舰队持续消耗能源维持后勤，主航道与本土补给更稳定，深空或敌境远征会降低战备(readiness)；战备越低，战斗越弱
9. 科研机制：研究会持续消耗能源，能源不足会暂停研究
10. 占领机制：舰队抵达中立星球可直接夺取，但新占星球会进入稳控期；舰队打赢敌方星球后只是“夺取并进入稳控”，稳控低时产能和防御都偏弱，需要留兵稳住
11. 淘汰机制：某个帝国只有在“星球数=0 且 舰队数=0”时才算被淘汰；只有失去星球但还保有舰队时仍然存活
12. 胜利机制：本局没有固定结束时长，只有当对局中只剩一个存活帝国时才结束；你要持续扩张、压制并最终消灭所有对手
13. 资源、人口、建筑和科技本身不直接决定胜负，它们只是帮助你占星、保星、造舰、歼敌、避免被淘汰的手段
14. 航道规则：沿标记航道移动更快，跨区深空跃迁更慢；中央主航道与前线门扉是战略咽喉
15. fleet_orders 优先使用数组格式，action 只能使用 attack / defend / redeploy / contest / move 之一: {"fleet_orders": [{"fleet_id": "舰队ID", "action": "contest", "target": "目标星球ID"}]}
16. tech_research 字段只能填写上述科技 key 之一或 null；如果帝国已有研究中心且当前无研究，应优先考虑返回 tech_research
17. 只返回纯 JSON，不要输出 Markdown、解释文本或代码块
18. 外交并非只有稳定关系：信任、边境紧张、旧怨、共同敌人都会影响关系；如果你选择 surprise_strike(违约突袭)，会立刻撕毁表面关系并带来严重声誉代价，只有在能换取关键战略收益时才考虑
19. 欺骗机制：你可以通过 deception 字段发起 feint_assault(佯攻假象)，系统只会把一支伪装中的“假舰队接触”写入指定对手的情报层；它不会改变世界真相，但会误导对方判断，适合拖主力、诱导换防、掩护真正攻势
20. 信息迷雾是硬约束：你绝不能假设自己知道世界公开排名、全图分数、未侦察区域兵力或其他帝国的完整资源账本；只能基于自己已知情报、联盟共享情报和公开地图推理
`;

class PromptBuilder {
  constructor(aiId) {
    this.personality = AI_PERSONALITIES.find(p => p.id === aiId);
  }

  buildStrategyPrompt(gameState, memory) {
    const ai = this.getAIState(gameState);
    const recentEvents = memory.getMidTermEvents(3);
    const knownIntelligence = this.getKnownPlanetIntel(ai, gameState);
    const knownFleetIntel = this.getKnownFleetIntel(ai);
    const knownAIs = this.getKnownAIContacts(ai, gameState);
    const diplomacyLandscape = this.getDiplomacyLandscape(ai, gameState, knownIntelligence);
    const myBattles = (gameState.battles || [])
      .filter(b => b.attacker === this.personality.id || b.defender === this.personality.id)
      .slice(-3)
      .map(b => `${this.getAIName(gameState, b.attacker)} 对阵 ${this.getAIName(gameState, b.defender)}，战场 ${this.getPlanetName(gameState, b.planet)}，结果 ${this.formatBattleResult(b.result)}`)
      .join('; ') || '无';
    const timeInfo = this.formatTimeInfo(gameState);
    const ownedPlanets = this.getOwnedPlanets(ai, gameState);
    const expansionTargets = this.getExpansionTargets(ai, gameState, knownIntelligence);
    const mapSituation = this.getMapSituationSummary(ai, gameState);
    const mapBriefing = this.getMapBriefSummary(gameState);
    const regionTraitSummary = this.getRegionTraitSummary(ownedPlanets, gameState);
    const strategicTargets = this.getStrategicTargets(ai, gameState, knownIntelligence);
    const activeResearch = this.formatResearchQueue(ai.researchQueue);
    const totalLabLevel = this.getTotalLabLevel(ownedPlanets);
    const occupationSummary = this.getOccupiedPlanetSummary(ownedPlanets);
    const victorySummary = this.getLocalVictorySummary(ai, gameState, knownIntelligence, knownFleetIntel, ownedPlanets);
    const strategicWinDirective = this.getLocalStrategicWinDirective(ai, gameState, knownIntelligence, knownFleetIntel, ownedPlanets);
    const pendingProposals = this.getPendingProposalSummary(ai, gameState);
    const deceptionStatus = this.getDeceptionStatus(ai, gameState);
    const enemyPlanets = knownIntelligence
      .filter(p => p.owner && p.owner !== ai.id)
      .slice(0, 8)
      .map(p => `${p.name}(${p.id}) 主人:${p.owner} 防御:${p.defenseValue ?? '?'}${p.specialNodeType ? ` 节点:${this.formatSpecialNodeType(p.specialNodeType)}` : ''}${p.regionTraitName ? ` 战区:${p.regionTraitName}` : ''} 情报:${this.formatIntelAge(p.lastSeenAt, p.stale)}`)
      .join('\n') || '暂无确认敌方星球';
    const enemyFleets = knownFleetIntel
      .filter(f => f.owner && f.owner !== ai.id)
      .slice(0, 6)
      .map(f => `${f.id} 主人:${f.owner} 战力:${f.totalPower ?? '?'} 状态:${f.status} 情报:${this.formatIntelAge(f.lastSeenAt, f.stale)}`)
      .join('\n') || '暂无确认敌方舰队';
    const longTermPatterns = Object.entries(memory.longTerm?.enemyPatterns || {})
      .map(([enemyId, pattern]) => `${enemyId}: ${pattern}`)
      .join('; ') || '无';

    return [
      { role: 'system', content: this.personality.systemPrompt + '\n\n' + GAME_RULES },
      { role: 'user', content: `
时间:
- 时刻: ${gameState.currentTick || 0}
- 已运行: ${timeInfo}
- 全局排名: 未知（信息迷雾下不可见）
- 胜负态势: ${victorySummary}

我的帝国:
- 星球数: ${ownedPlanets.length}
- 地图模板: ${mapBriefing}
- 地图态势: ${mapSituation}
- 战区风格: ${regionTraitSummary}
- 资源: 金属${Math.floor(ai.resources?.metal || 0)} 能源${Math.floor(ai.resources?.energy || 0)}
- 人口容量: 已用${ai.usedPopulation || 0} / 可用${Math.max(0, Math.floor(ai.availablePopulation ?? 0))}
- 舰队战力: ${ai.totalFleetPower || 0}
- 科技概况: ${this.formatTechOverview(ai.tech)}
- 研究中心总等级: ${totalLabLevel}
- 当前研究: ${activeResearch}
- 占领稳控: ${occupationSummary}

已知AI接触:
${knownAIs}

已知外交气候:
${diplomacyLandscape}

待处理外交:
${pendingProposals}

当前佯动:
${deceptionStatus}

已知敌方/中立情报:
${enemyPlanets}

已知舰队情报:
${enemyFleets}

附近可扩张目标:
${expansionTargets}

关键节点:
${strategicTargets}

我的战斗: ${myBattles}

长期记忆:
${longTermPatterns}

最近事件:
${this.formatMemoryEvents(recentEvents, gameState)}

  严格要求:
  - 你的首要目标是“最终获胜”，不是单纯囤资源；资源、科技和外交都必须服务于占星、保星、歼敌、扩大生存优势或制造淘汰
  - 请基于当前胜负态势制定策略：${strategicWinDirective}
  - 只能基于“已知/侦察到/公开信息”判断，不要臆造未知占领情况
  - 对刚夺下的关键节点，要考虑补给与稳控，不要空防裸放
  - 如果情报过时，要在reasoning里说明不确定性
  - 如需使用外交，必须通过 diplomatic 字段返回：ally_with / declare_war / offer_peace / surprise_strike 使用 AI ID 数组；offer_trade 使用数组，每项格式 {"target":"AI_ID","offer":{"metal":300},"request":{"energy":200}}
  - 只有当你已经掌握足够局部优势、航道位置或时机窗口时才考虑 surprise_strike；它适合背刺、抢先手或撕毁脆弱联盟，但会重创声誉与信任
  - 如需使用欺骗，请通过 deception 字段返回：{"mode":"feint_assault","target_ai":"AI_ID","target_planet":"星球ID","intensity":0.6}；只有在你已经知道对方、且想诱导其调防或误判主攻方向时才使用
  - 只有当外交动作真的服务于当前胜势时才发起，不能把所有已知 AI 都一股脑写进外交字段
  请制定战略决策，返回JSON:
  {"strategy": {"focus": "military", "priority": "expand", "reasoning": "原因"}, "diplomatic": {"ally_with": [], "declare_war": [], "offer_peace": [], "surprise_strike": [], "offer_trade": []}, "deception": {"mode": "feint_assault", "target_ai": "AI_ID", "target_planet": "星球ID", "intensity": 0.6}, "memory_update": {"learned": "学到的"}}。只返回 JSON。` }
      ];
    }

  buildTacticalPrompt(gameState, memory) {
    const ai = this.getAIState(gameState);
    const fleets = gameState.fleets.filter(f => f.owner === ai.id);
    const ownedPlanets = this.getOwnedPlanets(ai, gameState);
    const knownIntelligence = this.getKnownPlanetIntel(ai, gameState);
    const knownFleetIntel = this.getKnownFleetIntel(ai);
    const scoutedPlanets = knownIntelligence
      .filter(p => p.owner !== ai.id)
      .slice(0, 8)
      .map(p =>
        `${p.id}(主人:${p.owner || '未知'}, 防御:${p.defenseValue ?? '?'}, 情报:${this.formatIntelAge(p.lastSeenAt, p.stale)})`
      ).join('; ') || '未侦察到敌方或中立星球';
    const visibleFleetThreats = knownFleetIntel
      .filter(f => f.owner && f.owner !== ai.id)
      .slice(0, 5)
      .map(f => `${f.id}(主人:${f.owner}, 战力:${f.totalPower ?? '?'}, 状态:${f.status}, 情报:${this.formatIntelAge(f.lastSeenAt, f.stale)})`)
      .join('; ') || '暂无敌方舰队情报';
    const expansionTargets = this.getExpansionTargets(ai, gameState, knownIntelligence);
    const mapSituation = this.getMapSituationSummary(ai, gameState);
    const mapBriefing = this.getMapBriefSummary(gameState);
    const regionTraitSummary = this.getRegionTraitSummary(ownedPlanets, gameState);
    const strategicTargets = this.getStrategicTargets(ai, gameState, knownIntelligence, 5);
    const criticalDefense = this.getCriticalDefenseSummary(ai, gameState, knownFleetIntel);
    const recentEvents = this.formatMemoryEvents(memory.getRecentEvents(20).slice(-8), gameState);
    const activeResearch = this.formatResearchQueue(ai.researchQueue);
    const totalLabLevel = this.getTotalLabLevel(ownedPlanets);
    const researchDirective = this.getResearchDirective(ai, ownedPlanets, gameState);
    const occupationSummary = this.getOccupiedPlanetSummary(ownedPlanets);
    const victorySummary = this.getLocalVictorySummary(ai, gameState, knownIntelligence, knownFleetIntel, ownedPlanets);
    const tacticalWinDirective = this.getLocalTacticalWinDirective(ai, gameState, knownIntelligence, knownFleetIntel, ownedPlanets);
    const pendingProposals = this.getPendingProposalSummary(ai, gameState);

    const fleetDetails = fleets.map(f => {
      const ships = f.ships || {};
      return `${f.id}: 侦察${ships.scout||0} 护卫${ships.frigate||0} 巡洋${ships.cruiser||0} 战列${ships.battleship||0} (状态:${f.status}, 姿态:${this.getStanceLabel(f.stance)}, 战备:${this.formatReadiness(f.readiness)}, 补给:${f.supplyLabel || '未知'}, 整补:${this.getRepairLabel(f)})`;
    }).join('; ') || '无舰队';

    const buildingQueue = ownedPlanets.map(p =>
      p.buildQueue.length > 0 ? `${p.name}正在建造${this.getBuildingLabel(p.buildQueue[0].type)}` : null
    ).filter(Boolean).join('; ') || '无';

    return [
      { role: 'system', content: this.personality.systemPrompt + '\n\n' + GAME_RULES },
      { role: 'user', content: `
当前状态:
- 时间: 时刻 ${gameState.currentTick || 0} / ${this.formatTimeInfo(gameState)}
- 胜负态势: ${victorySummary}
- 地图模板: ${mapBriefing}
- 地图态势: ${mapSituation}
- 战区风格: ${regionTraitSummary}
- 星球: ${ownedPlanets.map(p => `${p.name}(金属${Math.floor(p.resources.metal)}) 能量${Math.floor(p.resources.energy)})`).slice(0, 5).join(', ')}
- 舰队详情: ${fleetDetails}
- 人口容量: 已用${ai.usedPopulation || 0} / 可用${Math.max(0, Math.floor(ai.availablePopulation ?? 0))}
- 科技概况: ${this.formatTechOverview(ai.tech)}
- 研究中心总等级: ${totalLabLevel}
- 研究中: ${activeResearch}
- 占领稳控: ${occupationSummary}

建造中: ${buildingQueue}

已知目标: ${scoutedPlanets}
已知舰队: ${visibleFleetThreats}

附近目标: ${expansionTargets}
优先节点: ${strategicTargets}
本方关键防区: ${criticalDefense}

待处理外交:
${pendingProposals}

最近事件:
${recentEvents}

严格要求:
- 本回合战术必须服务于胜利：${tacticalWinDirective}
- 不要假设未侦察星球的主人和防御
- 资源分配只能给自己的星球
- fleet_orders 优先返回数组格式
- ${researchDirective}
- tech_research 只能填写：${this.getTechOptionGuide()}
- 低稳定度占领区要优先稳控，不要夺点后立刻空置
- 低战备舰队不应继续强攻，必要时应 redeploy 回母星或后方节点整补
- 标记为整补中的舰队应优先留在安全后方恢复，不要把它们当作正常战力重复投入
- 若你准备扩大优势，优先考虑夺取星球、摧毁敌方舰队、压制关键咽喉；若你准备稳住局面，优先考虑保护核心星球、主力舰队与中央/边境关键节点

请制定战术决策，返回JSON:
{"resource_allocation": {"${ownedPlanets[0]?.id}": {"build": "mine", "ships": {"scout": 2}}}, "fleet_orders": [{"fleet_id": "舰队ID", "action": "contest", "target": "星球ID"}], "reasoning": "原因"}。只返回 JSON。` }
    ];
  }

  buildEventPrompt(event, gameState, memory) {
    const ai = this.getAIState(gameState);
    const ownedPlanets = this.getOwnedPlanets(ai, gameState);
    const payload = event?.data || event || {};
    const proposal = payload.proposalId ? (gameState.diplomacyProposals || []).find(item => item.id === payload.proposalId) : null;
    const visibleThreats = this.getKnownPlanetIntel(ai, gameState)
      .filter(p => p.owner && p.owner !== ai.id)
      .slice(0, 5)
      .map(p => `${p.id}:${p.owner} 防御${p.defenseValue ?? '?'} 情报${this.formatIntelAge(p.lastSeenAt, p.stale)}`)
      .join('; ') || '暂无';
    const proposalContext = proposal
      ? `提案详情:
- proposal_id: ${proposal.id}
- 类型: ${proposal.type}
- 发起者: ${proposal.fromAi}
- 接收者: ${proposal.toAi}
- 时长: ${proposal.duration || '无'}
- 报价: ${proposal.offer ? JSON.stringify(proposal.offer) : '无'}
- 要求: ${proposal.request ? JSON.stringify(proposal.request) : '无'}`
      : '无待处理提案详情';
    const responseSchema = proposal
      ? '{"diplomatic_response": {"action": "accept_proposal", "proposal_id": "提案ID", "reason": "原因"}, "resource_allocation": {}, "fleet_orders": [{"fleet_id": "舰队ID", "action": "defend", "target": "星球ID"}], "tech_research": null, "reasoning": "原因"}'
      : '{"resource_allocation": {}, "fleet_orders": [{"fleet_id": "舰队ID", "action": "defend", "target": "星球ID"}], "tech_research": null, "reasoning": "原因"}';
    const eventWinDirective = this.getLocalTacticalWinDirective(
      ai,
      gameState,
      this.getKnownPlanetIntel(ai, gameState),
      this.getKnownFleetIntel(ai),
      ownedPlanets
    );

    return [
      { role: 'system', content: this.personality.systemPrompt + '\n\n' + GAME_RULES },
      { role: 'user', content: `
触发事件:
${this.describeEvent(event, gameState)}

当前状态:
- 时刻: ${gameState.currentTick || 0}
- 我的星球: ${ownedPlanets.map(p => p.id).join(', ') || '无'}
- 我的资源: 金属${Math.floor(ai.resources?.metal || 0)} 能源${Math.floor(ai.resources?.energy || 0)}
- 我的舰队战力: ${ai.totalFleetPower || 0}
- 可见威胁: ${visibleThreats}
- 当前应对原则: ${eventWinDirective}

${proposalContext}

最近记忆:
${memory.getRelevantEvents(6).map(e => `- ${e.type}`).join('\n') || '无'}

请做立即响应，返回JSON。可以选择无动作，但必须诚实面对情报缺口。只返回 JSON:
${responseSchema}` }
    ];
  }

  buildQuestionPrompt(question, gameState, memory) {
    const ai = this.getAIState(gameState);
    const ownedPlanets = this.getOwnedPlanets(ai, gameState);
    const recentEvents = this.formatMemoryEvents(memory.getRelevantEvents(6), gameState);
    const knownThreats = this.getKnownPlanetIntel(ai, gameState)
      .filter(p => p.owner && p.owner !== ai.id)
      .slice(0, 4)
      .map(p => `${p.name}:${p.owner}`)
      .join('; ') || '暂无';

    return [
      {
        role: 'system',
        content: `${this.personality.systemPrompt}

你现在是在回答观战玩家的问题。要求：
- 只能依据你已知的情报、你的记忆和当前状态回答
- 不知道就明确说不知道或情报不足
- 不接受玩家指令，只回答问题
- 回答控制在100字内，中文`
      },
      {
        role: 'user',
        content: `
当前状态:
  - 时刻: ${gameState.currentTick || 0}
- 我的星球: ${ownedPlanets.map(p => p.name).join(', ') || '无'}
- 我的资源: 金属${Math.floor(ai.resources?.metal || 0)} 能源${Math.floor(ai.resources?.energy || 0)}
- 已知威胁: ${knownThreats}
- 最近记忆:
${recentEvents}

玩家问题: ${question}`
      }
    ];
  }

  computeOwnScore(ai, ownedPlanetCount = null) {
    const planets = ownedPlanetCount ?? ai.planets?.length ?? 0;
    return planets * 100 + (ai.totalFleetPower || 0);
  }

  summarizeKnownRivals(gameState, knownIntelligence, knownFleetIntel) {
    const rivalStats = new Map();

    knownIntelligence.forEach(record => {
      if (!record.owner) return;
      const current = rivalStats.get(record.owner) || { knownPlanets: 0, knownFleetPower: 0, latestSeenAt: 0 };
      current.knownPlanets += 1;
      current.latestSeenAt = Math.max(current.latestSeenAt || 0, record.lastSeenAt || 0);
      rivalStats.set(record.owner, current);
    });

    knownFleetIntel.forEach(record => {
      if (!record.owner) return;
      const current = rivalStats.get(record.owner) || { knownPlanets: 0, knownFleetPower: 0, latestSeenAt: 0 };
      current.knownFleetPower += record.totalPower || 0;
      current.latestSeenAt = Math.max(current.latestSeenAt || 0, record.lastSeenAt || 0);
      rivalStats.set(record.owner, current);
    });

    return [...rivalStats.entries()]
      .map(([aiId, stats]) => ({
        aiId,
        name: this.getAIName(gameState, aiId),
        ...stats
      }))
      .sort((left, right) => (right.knownPlanets * 100 + right.knownFleetPower) - (left.knownPlanets * 100 + left.knownFleetPower));
  }

  getLocalVictorySummary(ai, gameState, knownIntelligence, knownFleetIntel, ownedPlanets = []) {
    const ownScore = this.computeOwnScore(ai, ownedPlanets.length);
    const rivals = this.summarizeKnownRivals(gameState, knownIntelligence, knownFleetIntel);
    const strongestKnown = rivals[0];
    const knownPressure = strongestKnown
      ? `已知最强接触对象是 ${strongestKnown.name}，你已确认其 ${strongestKnown.knownPlanets} 颗星球、约 ${Math.round(strongestKnown.knownFleetPower)} 战力`
      : '尚无足够敌情，无法判断谁在领先';

    return `本局无固定结束时长，只有场上只剩一个帝国时才结束；你当前掌控 ${ownedPlanets.length} 颗星球、舰队战力 ${ai.totalFleetPower || 0}、局部实力指数约 ${ownScore}；${knownPressure}；在信息迷雾下你无法确认全图真实态势`;
  }

  getLocalStrategicWinDirective(ai, gameState, knownIntelligence, knownFleetIntel, ownedPlanets = []) {
    const rivals = this.summarizeKnownRivals(gameState, knownIntelligence, knownFleetIntel);
    const strongestKnown = rivals[0];
    const ownScore = this.computeOwnScore(ai, ownedPlanets.length);
    const knownRivalScore = strongestKnown ? strongestKnown.knownPlanets * 100 + strongestKnown.knownFleetPower : null;
    if (ownedPlanets.length === 0 && (ai.totalFleetPower || 0) > 0) {
      return '你已失去所有星球但尚未被淘汰，战略上必须优先夺取落脚点，避免舰队流亡到被逐步围剿';
    }
    if (!strongestKnown) {
      return '敌情不足时不要空想终局，应优先侦察、稳固母星与航道，同时建立科研和持续造舰能力';
    }
    if (knownRivalScore != null && knownRivalScore > ownScore * 1.15) {
      return '从已知情报看你暂处劣势，战略上应先保核心、抢中立与薄弱节点、切断强敌扩张路径，避免无把握决战';
    }
    if (knownRivalScore != null && ownScore > knownRivalScore * 1.15) {
      return '你对已知主要对手具备局部优势，战略上应扩大包围、压缩其生存空间，并逐步制造淘汰而不是停在守成';
    }
    return '当前应持续积累胜势，在不破坏信息迷雾边界的前提下扩张、侦察、建立科研能力，并围绕中央环与咽喉逐步消灭对手';
  }

  getLocalTacticalWinDirective(ai, gameState, knownIntelligence, knownFleetIntel, ownedPlanets = []) {
    const rivals = this.summarizeKnownRivals(gameState, knownIntelligence, knownFleetIntel);
    const strongestKnown = rivals[0];
    const ownScore = this.computeOwnScore(ai, ownedPlanets.length);
    const knownRivalScore = strongestKnown ? strongestKnown.knownPlanets * 100 + strongestKnown.knownFleetPower : null;

    if (ownedPlanets.length === 0 && (ai.totalFleetPower || 0) > 0) {
      return '本回合必须优先寻找并夺取可以落脚的中立星或薄弱敌星，否则你虽存活却会不断失去主动权';
    }
    if (knownRivalScore != null && knownRivalScore > ownScore * 1.15 && strongestKnown) {
      return `本回合不宜和 ${strongestKnown.name} 正面硬耗，应优先侦察、抢薄弱点、切断关键航道并保护主力舰队`;
    }
    if (knownRivalScore != null && ownScore > knownRivalScore * 1.15 && strongestKnown) {
      return `本回合应扩大对 ${strongestKnown.name} 的局部优势，优先夺点、围堵、歼灭孤军，并压住中央环和关键门扉`;
    }
    return '当前战术目标应是扩张、侦察、补研究中心、压住关键节点，并通过持续局部优势逐步把对手打到淘汰';
  }

  getAIState(gameState) {
    return gameState.aiStates.find(a => a.id === this.personality.id) || {
      id: this.personality.id,
      planets: [],
      resources: { metal: 0, energy: 0 },
      tech: {},
      totalFleetPower: 0,
      knownAIs: [],
      scoutedPlanets: []
    };
  }

  getOwnedPlanets(ai, gameState) {
    return gameState.planets.filter(p => p.owner === ai.id);
  }

  getKnownPlanetIntel(ai, gameState) {
    const sources = [
      ai.intelligence?.planets,
      ai.intel?.planets,
      ai.worldKnowledge?.planets
    ].filter(Boolean);

    if (sources.length > 0) {
      return Object.values(sources[0]).map(record => ({
        ...record,
        id: record.id || record.planetId,
        lastSeenAt: record.lastSeenAt || record.timestamp || null,
        stale: Boolean(record.stale)
      })).filter(record => record.id);
    }

    const knownIds = new Set([
      ...(Array.isArray(ai.scoutedPlanets) ? ai.scoutedPlanets : []),
      ...this.getOwnedPlanets(ai, gameState).map(p => p.id)
    ]);

    return gameState.planets
      .filter(p => knownIds.has(p.id))
      .map(p => ({
        id: p.id,
        name: p.name,
        type: p.type,
        position: p.position,
        regionId: p.regionId,
        regionName: p.regionName,
        strategicRole: p.strategicRole,
        specialNodeType: p.specialNodeType,
        specialNodeLabel: p.specialNodeLabel,
        regionTraitName: p.regionTraitName,
        owner: p.owner === ai.id ? ai.id : null,
        defenseValue: p.owner === ai.id ? p.defenseValue : 0,
        lastSeenAt: Date.now(),
        stale: p.owner !== ai.id
      }));
  }

  getKnownFleetIntel(ai) {
    const fleets = ai.intelligence?.fleets || ai.intel?.fleets || ai.worldKnowledge?.fleets || {};
    return Object.values(fleets).map(record => ({
      ...record,
      lastSeenAt: record.lastSeenAt || record.timestamp || null,
      stale: Boolean(record.stale)
    }));
  }

  getKnownAIContacts(ai, gameState) {
    const knownIds = this.collectKnownContactIds(ai, gameState, this.getKnownPlanetIntel(ai, gameState));

    const labels = gameState.aiStates
      .filter(other => other.id !== ai.id && knownIds.has(other.id))
      .map(other => `${other.name}(${other.id})`);

    return labels.join('; ') || '未知';
  }

  getDiplomacyLandscape(ai, gameState, knownIntelligence = []) {
    const knownIds = this.collectKnownContactIds(ai, gameState, knownIntelligence);

    const entries = [...knownIds]
      .map(targetId => {
        const relation = ai?.diplomacy?.[targetId];
        if (!relation) return null;
        const normalized = typeof relation === 'string' ? { status: relation } : relation;
        return `${this.getAIName(gameState, targetId)}: 关系${this.getRelationLabel(normalized.status)}，信任${normalized.trust ?? '?'}，紧张${normalized.borderTension ?? '?'}，旧怨${normalized.grievance ?? '?'}，危机${this.getCrisisLabel(normalized.crisisLevel)}`;
      })
      .filter(Boolean);

    return entries.join('\n') || '暂无可靠外交接触';
  }

  collectKnownContactIds(ai, gameState, knownIntelligence = []) {
    const knownIds = new Set(Array.isArray(ai.knownAIs) ? ai.knownAIs : []);
    (knownIntelligence || []).forEach(planet => {
      if (planet.owner && planet.owner !== ai.id) {
        knownIds.add(planet.owner);
      }
    });

    Object.entries(ai?.diplomacy || {}).forEach(([targetId, relation]) => {
      const status = typeof relation === 'string' ? relation : relation?.status;
      if (status && status !== 'neutral') {
        knownIds.add(targetId);
      }
    });

    (gameState.diplomacyProposals || []).forEach(proposal => {
      if (proposal.fromAi === ai.id) knownIds.add(proposal.toAi);
      if (proposal.toAi === ai.id) knownIds.add(proposal.fromAi);
    });

    return knownIds;
  }

  getPendingProposalSummary(ai, gameState) {
    const proposals = ai.pendingProposals || (gameState.diplomacyProposals || []).filter(proposal =>
      proposal.status === 'pending' && (proposal.fromAi === ai.id || proposal.toAi === ai.id)
    );

    if (proposals.length === 0) return '无';

    return proposals.slice(0, 5).map(proposal => {
      const direction = proposal.toAi === ai.id ? '收到' : '发出';
      const otherId = proposal.toAi === ai.id ? proposal.fromAi : proposal.toAi;
      const typeLabel = { alliance: '结盟', peace: '停战', trade: '贸易' }[proposal.type] || proposal.type;
      return `${direction}${typeLabel}提案 ${proposal.id}，对象:${this.getAIName(gameState, otherId)}`;
    }).join('\n');
  }

  getDeceptionStatus(ai, gameState) {
    const operation = ai?.deception?.operation;
    if (!operation) return '无';
    return `正在对 ${this.getAIName(gameState, operation.targetAi)} 发动佯攻，诱导目标指向 ${this.getPlanetName(gameState, operation.targetPlanetId)}，强度 ${Math.round((operation.intensity || 0.6) * 100)}%`;
  }

  getRelationLabel(status) {
    return {
      ally: '盟友',
      war: '战争',
      trade: '贸易',
      neutral: '中立'
    }[status] || status || '未知';
  }

  getCrisisLabel(level) {
    return {
      calm: '平静',
      strained: '紧张',
      crisis: '危机',
      fracture: '濒裂',
      war: '战争'
    }[level] || (level || '未知');
  }

  getExpansionTargets(ai, gameState, knownIntelligence) {
    const ownedPlanets = this.getOwnedPlanets(ai, gameState);
    if (ownedPlanets.length === 0) return '无';

    return this.rankStrategicTargets(ai, gameState, knownIntelligence, 8)
      .map(({ planet, distance, intel, route }) => {
        const owner = intel ? (intel.owner || '未知') : '未知';
        const intelAge = intel ? this.formatIntelAge(intel.lastSeenAt) : '未侦察';
        return `${planet.id}(${planet.type}, 距离${distance.toFixed(0)}, 路线:${route.label}, 主人:${owner}${planet.specialNodeType ? `, 节点:${this.formatSpecialNodeType(planet.specialNodeType)}` : ''}${planet.regionTraitName ? `, 战区:${planet.regionTraitName}` : ''}, 情报:${intelAge})`;
      })
      .join('; ') || '无';
  }

  getStrategicTargets(ai, gameState, knownIntelligence, limit = 6) {
    const ranked = this.rankStrategicTargets(ai, gameState, knownIntelligence, limit);
    if (ranked.length === 0) return '无';

    return ranked.map(({ planet, intel, route, score, reasons }) => {
      const owner = intel ? (intel.owner || '未知') : '未知';
      return `${planet.name}(${planet.id}) 评分${score.toFixed(0)} · ${this.formatStrategicRole(planet.strategicRole)}${planet.specialNodeType ? ` · ${this.formatSpecialNodeType(planet.specialNodeType)}` : ''} · ${planet.regionName || planet.regionId || '未知区域'}${planet.regionTraitName ? `(${planet.regionTraitName})` : ''} · 路线:${route.label} · 主人:${owner} · ${reasons.join('/')}`;
    }).join('\n');
  }

  getCriticalDefenseSummary(ai, gameState, knownFleetIntel = []) {
    const hostileFleetIntel = Array.isArray(knownFleetIntel) ? knownFleetIntel : [];
    const ownedPlanets = this.getOwnedPlanets(ai, gameState)
      .filter(planet => ['home_core', 'approach_gate', 'core_relay', 'central_hub', 'border_bastion'].includes(planet.strategicRole))
      .map(planet => {
        const incomingHostile = hostileFleetIntel
          .filter(fleet => fleet.status === 'moving' && fleet.targetPlanet === planet.id && fleet.owner !== ai.id)
          .reduce((sum, fleet) => sum + ((fleet.totalPower || 0) * (fleet.stale ? 0.6 : 1)), 0);
        const connectedLanes = (gameState.mapMeta?.lanes || []).filter(lane => lane.from === planet.id || lane.to === planet.id).length;
        return { planet, incomingHostile, connectedLanes };
      })
      .sort((left, right) => (right.incomingHostile * 2 + right.connectedLanes) - (left.incomingHostile * 2 + left.connectedLanes))
      .slice(0, 4);

    if (ownedPlanets.length === 0) return '暂无关键防区';
    return ownedPlanets
      .map(({ planet, incomingHostile, connectedLanes }) => `${planet.name}:${this.formatStrategicRole(planet.strategicRole)} 航道${connectedLanes} 敌袭${Math.round(incomingHostile)}`)
      .join('; ');
  }

  getBestRouteProfile(ownedPlanets, targetPlanet, gameState) {
    const origin = ownedPlanets
      .map(planet => ({
        planet,
        distance: this.distanceToPlanet(planet, targetPlanet)
      }))
      .sort((left, right) => left.distance - right.distance)[0]?.planet;

    return computeTravelProfile(origin, targetPlanet, gameState.mapMeta);
  }

  getMapSituationSummary(ai, gameState) {
    const mapMeta = gameState.mapMeta || {};
    const lanes = Array.isArray(mapMeta.lanes) ? mapMeta.lanes : [];
    const ownedPlanets = this.getOwnedPlanets(ai, gameState);
    const ownedIds = new Set(ownedPlanets.map(planet => planet.id));
    const connectedLanes = lanes.filter(lane => ownedIds.has(lane.from) || ownedIds.has(lane.to));
    const centralPlanets = gameState.planets.filter(planet => planet.regionId === 'core');
    const controlledCore = centralPlanets.filter(planet => planet.owner === ai.id).length;
    const controlledChokepoints = ownedPlanets.filter(planet => ['approach_gate', 'border_bastion', 'core_relay'].includes(planet.strategicRole)).length;
    const controlledSpecialNodes = ownedPlanets.filter(planet => planet.specialNodeType).length;
    const templateName = mapMeta.template?.name || '未知模板';
    const laneVariant = mapMeta.template?.laneVariant?.label || '常规航道';
    return `模板:${templateName}，航道格局:${laneVariant}，相关航道${connectedLanes.length}条，咽喉节点${controlledChokepoints}个，中央环控制${controlledCore}/${centralPlanets.length || 0}，特殊节点${controlledSpecialNodes}个，非航道深空移动更慢`;
  }

  rankStrategicTargets(ai, gameState, knownIntelligence, limit = 8) {
    const ownedPlanets = this.getOwnedPlanets(ai, gameState);
    if (ownedPlanets.length === 0) return [];

    const intelMap = new Map(knownIntelligence.map(item => [item.id, item]));
    const ownedIds = new Set(ownedPlanets.map(planet => planet.id));
    return gameState.planets
      .filter(planet => !ownedIds.has(planet.id))
      .map(planet => {
        const intel = intelMap.get(planet.id);
        const distance = this.distanceToEmpire(planet, ownedPlanets);
        const route = this.getBestRouteProfile(ownedPlanets, planet, gameState);
        const laneCount = (gameState.mapMeta?.lanes || []).filter(lane => lane.from === planet.id || lane.to === planet.id).length;
        const roleWeight = STRATEGIC_ROLE_WEIGHTS[planet.strategicRole] || 36;
        const centralBonus = planet.regionId === 'core' ? 18 : 0;
        const ownerBonus = !intel?.owner ? 16 : intel.owner === ai.id ? -1000 : 24;
        const freshnessPenalty = intel?.stale ? 8 : 0;
        const routeBonus = (route.strategicWeight || 0.2) * 54;
        const distancePenalty = distance * 0.16;
        const laneBonus = laneCount * 5;
        const specialNodeBonus = this.getSpecialNodeWeight(planet.specialNodeType);
        const regionTraitBonus = this.getRegionTraitWeight(planet.regionTraitId, planet.strategicRole);
        const routeFeatureBonus = ((route.supplyQuality || 0) * 16) + ((route.stealthValue || 0) * 8) - ((route.chokepointRisk || 0) * 6);
        const score = roleWeight + centralBonus + ownerBonus + routeBonus + laneBonus + specialNodeBonus + regionTraitBonus + routeFeatureBonus - distancePenalty - freshnessPenalty;
        const reasons = [
          this.formatStrategicRole(planet.strategicRole),
          planet.specialNodeType ? this.formatSpecialNodeType(planet.specialNodeType) : null,
          laneCount > 2 ? `连接${laneCount}条航道` : `路线${route.label}`,
          planet.regionId === 'core' ? '中央环' : (planet.regionName || planet.regionId || '战区节点'),
          planet.regionTraitName || null
        ].filter(Boolean);
        return { planet, intel, distance, route, score, reasons };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, limit);
  }

  formatStrategicRole(role) {
    return STRATEGIC_ROLE_LABELS[role] || role || '普通节点';
  }

  distanceToPlanet(left, right) {
    const dx = (left.position?.x || 0) - (right.position?.x || 0);
    const dy = (left.position?.y || 0) - (right.position?.y || 0);
    return Math.sqrt(dx * dx + dy * dy);
  }

  distanceToEmpire(planet, ownedPlanets) {
    return ownedPlanets.reduce((best, mine) => {
      const dx = (planet.position?.x || 0) - (mine.position?.x || 0);
      const dy = (planet.position?.y || 0) - (mine.position?.y || 0);
      const distance = Math.sqrt(dx * dx + dy * dy);
      return Math.min(best, distance);
    }, Number.POSITIVE_INFINITY);
  }

  formatTimeInfo(gameState) {
    const totalSeconds = Math.max(0, Math.floor(gameState.currentTick || 0));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}小时${minutes}分钟`;
  }

  formatIntelAge(lastSeenAt, stale) {
    const label = this.formatIntelAgeBase(lastSeenAt);
    return stale ? `${label}(过期)` : label;
  }

  formatIntelAgeBase(lastSeenAt) {
    if (!lastSeenAt) return '未知';
    const diffSeconds = Math.max(0, Math.floor((Date.now() - lastSeenAt) / 1000));
    if (diffSeconds < 60) return `${diffSeconds}秒前`;
    const minutes = Math.floor(diffSeconds / 60);
    if (minutes < 60) return `${minutes}分钟前`;
    return `${Math.floor(minutes / 60)}小时前`;
  }

  formatResearchQueue(researchQueue) {
    if (!researchQueue) return '无';

    const status = researchQueue.paused ? '暂停' : '进行中';
    const remainingMinutes = Math.max(0, Math.ceil((researchQueue.remainingTimeMs ?? Math.max(0, (researchQueue.endTime || Date.now()) - Date.now())) / 60000));
    const energyRemaining = researchQueue.energyRemaining != null ? ` 能源剩余${Math.ceil(researchQueue.energyRemaining)}` : '';
    const techLabel = TECH_TREE[researchQueue.techType]?.name || researchQueue.techType;
    return `${techLabel}(${researchQueue.techType}) 等级${researchQueue.level} ${status} 剩余${remainingMinutes}分钟${energyRemaining}`;
  }

  formatTechOverview(tech = {}) {
    const warfare = `战斗: 武器${tech.weaponUpgrade || 0} 护盾${tech.shieldTech || 0} 攻城${tech.siegeEngineering || 0} 要塞${tech.fortification || 0}`;
    const economy = `经济: 采矿${tech.miningEfficiency || 0} 能源${tech.energyTech || 0} 人口${tech.populationGrowth || 0}`;
    const mobility = `机动: 引擎${tech.engineUpgrade || 0} 后勤${tech.logisticsNetwork || 0}`;
    const intel = `情报: 传感${tech.sensorNetwork || 0}`;
    return [warfare, economy, mobility, intel].join(' / ');
  }

  getOccupiedPlanetSummary(ownedPlanets = []) {
    const occupied = (ownedPlanets || [])
      .filter(planet => planet.occupation)
      .sort((left, right) => (left.occupation?.stability || 0) - (right.occupation?.stability || 0))
      .slice(0, 4);

    if (occupied.length === 0) return '无';

    return occupied
      .map(planet => `${planet.name} 稳定${Math.round(planet.occupation?.stability || 0)}% 驻军${Math.round(planet.occupation?.garrisonPower || 0)}`)
      .join('；');
  }

  getStanceLabel(stance) {
    return {
      balanced: '均衡',
      assault: '强攻',
      hold: '坚守',
      intercept: '截击',
      mobile: '机动'
    }[stance] || '均衡';
  }

  formatReadiness(readiness) {
    const value = Number.isFinite(readiness) ? Math.max(0.35, Math.min(1.15, readiness)) : 1;
    return `${Math.round(value * 100)}%`;
  }

  getRepairLabel(fleet) {
    if (!fleet) return '未知';
    if (fleet.repairLabel) return fleet.repairLabel;
    return fleet.repairState === 'repairing' ? '整补中' : '可投入';
  }

  getBuildingLabel(buildingType) {
    return BUILDINGS[buildingType]?.name || buildingType || '建筑';
  }

  getTotalLabLevel(ownedPlanets) {
    return (ownedPlanets || []).reduce((sum, planet) => sum + (planet.buildings?.lab || 0) + (planet.nodeModifiers?.labLevel || 0), 0);
  }

  getMapBriefSummary(gameState) {
    const template = gameState.mapMeta?.template;
    if (!template) return '未知地图模板';
    return `${template.name} · ${template.description}`;
  }

  getRegionTraitSummary(ownedPlanets, gameState) {
    const seen = new Set();
    const summaries = (ownedPlanets || [])
      .map(planet => {
        const region = (gameState.mapMeta?.regions || []).find(item => item.id === planet.regionId);
        const trait = region?.trait;
        if (!trait || seen.has(region.id)) return null;
        seen.add(region.id);
        return `${region.name}:${trait.name}(${trait.doctrine})`;
      })
      .filter(Boolean)
      .slice(0, 4);

    return summaries.join('；') || '当前已控区域尚未形成鲜明战区风格';
  }

  getSpecialNodeWeight(specialNodeType) {
    return {
      industrial_hub: 28,
      research_archive: 24,
      fortress_world: 26,
      supply_nexus: 24,
      sensor_array: 22,
      arcology: 18
    }[specialNodeType] || 0;
  }

  getRegionTraitWeight(regionTraitId, strategicRole) {
    if (!regionTraitId) return 0;
    const base = {
      forge_belt: strategicRole === 'frontier_resource' || strategicRole === 'inner_resource' ? 12 : 6,
      scholar_drift: strategicRole === 'core_relay' || strategicRole === 'central_hub' ? 12 : 6,
      bulwark_arc: strategicRole === 'border_bastion' || strategicRole === 'approach_gate' ? 14 : 5,
      relay_web: strategicRole === 'outer_relay' || strategicRole === 'approach_gate' ? 12 : 5,
      frontier_march: strategicRole === 'frontier_resource' || strategicRole === 'outer_relay' ? 12 : 5,
      signal_nest: strategicRole === 'core_relay' || strategicRole === 'outer_relay' ? 11 : 5,
      trade_wind: strategicRole === 'frontier_resource' || strategicRole === 'outer_relay' ? 10 : 5
    }[regionTraitId];
    return base || 0;
  }

  formatSpecialNodeType(type) {
    return SPECIAL_NODE_LABELS[type] || type || '特殊节点';
  }

  getTechOptionGuide() {
    return Object.entries(TECH_TREE)
      .map(([key, info]) => `${key}(${info.name})`)
      .join('、');
  }

  getResearchDirective(ai, ownedPlanets, gameState) {
    const totalLabLevel = this.getTotalLabLevel(ownedPlanets);
    const totalMetal = (ownedPlanets || []).reduce((sum, planet) => sum + (planet.resources?.metal || 0), 0);
    const totalEnergy = (ownedPlanets || []).reduce((sum, planet) => sum + (planet.resources?.energy || 0), 0);
    const canBuildLab = (ownedPlanets || []).some(planet => (planet.resources?.metal || 0) >= 1000 && (planet.resources?.energy || 0) >= 800);
    const unstableOccupation = (ownedPlanets || []).some(planet => planet.occupation && (planet.occupation.stability || 0) < 70);
    const frontLinePressure = (ownedPlanets || []).some(planet => ['approach_gate', 'border_bastion', 'central_hub'].includes(planet.strategicRole));

    if (totalLabLevel <= 0 && canBuildLab) {
      return '如果帝国还没有研究中心，请优先在母星或后方高资源星建造 lab(研究中心)，不要长期零科技';
    }

    if (!ai.researchQueue && totalLabLevel > 0 && unstableOccupation && totalMetal >= 1000 && totalEnergy >= 700) {
      return '如果你刚夺下关键节点但稳控不足，请优先考虑 logisticsNetwork(后勤网络) 或 fortification(要塞化)，避免前线新领地空防失守';
    }

    if (!ai.researchQueue && totalLabLevel > 0 && frontLinePressure && totalMetal >= 1200 && totalEnergy >= 700) {
      return '如果你正在争夺中央环、咽喉或高防御星球，请优先考虑 siegeEngineering(攻城工程)、shieldTech(护盾技术) 或 logisticsNetwork(后勤网络)';
    }

    if (!ai.researchQueue && totalLabLevel > 0 && totalMetal >= 1000 && totalEnergy >= 600) {
      return `如果已有研究中心且当前没有研究，请结合局势主动返回 tech_research；当前时刻 ${gameState.currentTick || 0} 不应长期停在零研发`;
    }

    return '如果资源或研究条件不足，可以暂缓科研，但要在 reasoning 中说明原因';
  }

  getAIName(gameState, aiId) {
    if (!aiId) return '中立势力';
    return gameState.aiStates.find(ai => ai.id === aiId)?.name || aiId;
  }

  getPlanetName(gameState, planetId) {
    if (!planetId) return '未知星球';
    return gameState.planets.find(planet => planet.id === planetId)?.name || planetId;
  }

  formatBattleResult(result) {
    return {
      crushing_victory: '碾压胜利',
      victory: '胜利占领',
      pyrrhic_victory: '惨胜占领',
      stalemate: '僵持',
      defeat: '失利'
    }[result] || result || '未知';
  }

  formatMemoryEvents(events, gameState) {
    if (!Array.isArray(events) || events.length === 0) return '无';
    return events.map(event => `- ${this.formatMemoryEvent(event, gameState)}`).join('\n');
  }

  formatMemoryEvent(event, gameState) {
    if (!event) return '未知事件';
    const payload = event.data || event;

    if (event.type === 'strategy_decision') {
      const focus = payload.strategy?.focus || payload.focus || '战略调整';
      return `我方曾做出战略决策：${focus}`;
    }
    if (event.type === 'tactical_decision') {
      return '我方最近执行过一轮战术调整';
    }
    if (event.type === 'battle' || event.type === 'battle_resolved') {
      return `${this.getAIName(gameState, payload.attacker || payload.attackerId || payload.fromAi)} 与 ${this.getAIName(gameState, payload.defender || payload.defenderId || payload.toAi)} 在 ${this.getPlanetName(gameState, payload.planet || payload.planetId)} 爆发战斗`;
    }
    if (event.type === 'question_answered') {
      return '最近回答过玩家提问';
    }

    return this.describeEvent(event, gameState);
  }

  describeEvent(event, gameState = { aiStates: [], planets: [] }) {
    if (!event) return '未知事件';
    const payload = event.data || event;
    if (event.summary) return event.summary;
    if (event.type === 'battle_resolved' || event.type === 'battle') {
      return `${this.getAIName(gameState, payload.attacker || payload.attackerId)} 与 ${this.getAIName(gameState, payload.defender || payload.defenderId)} 在 ${this.getPlanetName(gameState, payload.planet || payload.planetId)} 发生战斗，结果 ${this.formatBattleResult(payload.result)}`;
    }
    if (event.type === 'planet_captured') {
      return `${this.getAIName(gameState, payload.toOwner || payload.owner)} 占领了 ${this.getPlanetName(gameState, payload.planetId || payload.planet)}`;
    }
    if (event.type === 'war_declared') {
      return `${this.getAIName(gameState, payload.fromAi || payload.attackerId)} 向 ${this.getAIName(gameState, payload.toAi || payload.defenderId)} 宣战`;
    }
      if (event.type === 'alliance_formed') {
        return `${this.getAIName(gameState, payload.ai1 || payload.fromAi)} 与 ${this.getAIName(gameState, payload.ai2 || payload.toAi)} 结盟`;
      }
      if (event.type === 'alliance_expired') {
        return `${this.getAIName(gameState, payload.fromAi)} 与 ${this.getAIName(gameState, payload.toAi)} 的联盟已到期`;
      }
      if (event.type === 'alliance_proposed') {
        return `${this.getAIName(gameState, payload.fromAi)} 向 ${this.getAIName(gameState, payload.toAi)} 发起结盟提案，提案ID=${payload.proposalId}`;
      }
    if (event.type === 'peace_proposed') {
      return `${this.getAIName(gameState, payload.fromAi)} 向 ${this.getAIName(gameState, payload.toAi)} 发起停战提案，提案ID=${payload.proposalId}`;
    }
      if (event.type === 'trade_proposed') {
        return `${this.getAIName(gameState, payload.fromAi)} 向 ${this.getAIName(gameState, payload.toAi)} 发起贸易提案，提案ID=${payload.proposalId}`;
      }
      if (event.type === 'trade_executed') {
        return `${this.getAIName(gameState, payload.fromAi)} 与 ${this.getAIName(gameState, payload.toAi)} 完成了一次贸易交换`;
      }
      if (event.type === 'diplomacy_rejected') {
        return `${this.getAIName(gameState, payload.toAi)} 拒绝了来自 ${this.getAIName(gameState, payload.fromAi)} 的外交提案`;
      }
      return `${event.type}: ${JSON.stringify(payload)}`;
    }
}

export default PromptBuilder;
