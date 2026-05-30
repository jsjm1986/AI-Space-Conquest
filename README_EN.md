# AI Space Conquest

A space strategy battle royale driven by 7 AI empires with distinct personalities. The AIs make all decisions autonomously — expanding, scouting, forming alliances, backstabbing, researching, deploying fleets, and waging war — until only one empire remains. You sit in the best spectator seat, watching this continuously evolving space epic unfold in real time.

**[中文版](README.md)**

---

## Table of Contents

- [The Seven AI Rulers](#the-seven-ai-rulers)
- [Map System](#map-system)
- [Lane Topology](#lane-topology)
- [Resource System](#resource-system)
- [Building System](#building-system)
- [Fleet System](#fleet-system)
- [Supply and Readiness](#supply-and-readiness)
- [Combat System](#combat-system)
- [Occupation and Stabilization](#occupation-and-stabilization)
- [Technology System](#technology-system)
- [Diplomacy System](#diplomacy-system)
- [Intelligence System](#intelligence-system)
- [AI Decision System](#ai-decision-system)
- [Victory and Elimination](#victory-and-elimination)
- [Spectator Features](#spectator-features)
- [Deployment and Running](#deployment-and-running)

---

## The Seven AI Rulers

Each AI has a unique personality that influences its strategic preferences, research choices, and diplomatic tendencies.

| # | Name | Personality | Color | Strategy |
|---|------|-------------|-------|----------|
| 1 | Conqueror Karax | Aggressive | 🔴 | Military expansion first, actively seeks attack opportunities, rarely defends |
| 2 | Guardian Aria | Defensive | 🔵 | Secures borders first, avoids risks, long-term development |
| 3 | Merchant Victor | Economic | 🟢 | Rushes economy early, mass produces fleets late game |
| 4 | Scientist Zeta | Tech | 🟣 | Fast research, crushes opponents with tech advantage |
| 5 | Diplomat Sophia | Diplomatic | 🟡 | Alliance weaving, frequent betrayals |
| 6 | Hunter Rex | Opportunist | 🔷 | Strikes at weak points, likes to mop up remnants |
| 7 | Gambler Kane | Unpredictable | 🟠 | All-in gambles, hardest to predict |

Each AI has four trait values (0–1): `aggression`, `economy`, `tech`, and `diplomacy`. These influence decision preferences but don't enforce behavior.

---

## Map System

### Basic Parameters

- **Map size**: 2200×2200 coordinate units
- **Total planets**: ~84 (varies by map template)
- **7 home planets**: One per AI, evenly distributed on a ring ~390 units from center
- **Central resource ring**: 4–6 super resource planets within 150 units of center — the highest value area on the map

### Planet Types

| Type | Count | Metal/s | Energy/s | Pop/s | Base Defense |
|------|-------|---------|----------|-------|--------------|
| Home | 7 | 5 | 3 | 0.2 | 200 |
| Resource | ~21+ | 3 | 2 | 0.1 | 50 |
| Normal | ~50+ | 1 | 1 | 0.05 | 25–45 |

Home planets start with all 5 building types at level 1 (Mine, Power Plant, Shipyard, Defense Turret, Research Lab), ensuring AIs can immediately start building ships and researching.

### Strategic Roles

Each planet has a strategic role tag:

| Role | Description |
|------|-------------|
| `home_core` | Home planet core |
| `central_hub` | Central hub (super resource planet) |
| `approach_gate` | Approach gate (jump point between home and center) |
| `core_relay` | Core relay (relay station around the central ring) |
| `border_bastion` | Border bastion |
| `inner_resource` | Inner ring resource planet |
| `frontier_resource` | Frontier resource planet |
| `outer_relay` | Outer ring relay |

### Map Templates

Each game randomly selects one template affecting central ring layout and lane patterns:

| Template | Description |
|----------|-------------|
| Balanced Ring | Complete central resource ring, balanced main lanes |
| Dual Core | Central area splits into twin core clusters; controlling both wings dictates the game |
| Fractured Core | Central lanes have gaps; flanking maneuvers are more valuable |
| Outer Rich | Outer ring is richer; suitable for expanding first then pressing center |

### Region Traits

The map is divided into 7 outer sectors + 1 central resource ring. Each outer sector is randomly assigned a trait:

| Trait | Effect |
|-------|--------|
| Forge Belt | Metal +28%, Shipyard +1 |
| Scholar Drift | Energy +18%, Lab +1, Sensor range +30 |
| Bulwark Arc | Defense +80, Stability gain +0.05 |
| Relay Web | Repair rate +0.00004, Maintenance reduction +6% |
| Frontier March | Population +18%, Frontier value +1 |
| Signal Nest | Sensor range +55, Intel retention +35% |
| Trade Wind | Energy +12%, Population +10%, Relay value +1 |

### Special Nodes

Some planets have special node types providing additional bonuses:

| Node | Bonus |
|------|-------|
| Industrial Hub | Metal +22%, Shipyard +1 |
| Research Archive | Energy +10%, Lab +1 |
| Fortress World | Defense +160, Stability gain +0.08 |
| Supply Nexus | Repair rate +0.00005, Maintenance reduction +8%, Shipyard +1 |
| Sensor Array | Sensor range +70, Intel retention +45% |
| Arcology | Population +22% |

---

## Lane Topology

### Lane Tiers

| Tier | Name | Speed Multiplier | Strategic Weight | Description |
|------|------|-----------------|------------------|-------------|
| trunk | Core Trunk | ×1.32 | 1.0 | Core arteries connecting central ring relays |
| corridor | Strategic Corridor | ×1.18 | 0.84 | Push lines from home to approach gates and into center |
| frontier | Frontier Lane | ×1.08 | 0.68 | Connects border bastions and flanks |
| relay | Outer Relay | ×1.02 | 0.54 | Outer ring circumnavigation lines |

### Deep Space Travel

Movement outside lanes uses deep space jumps with speed penalties:

- **Intra-region deep space**: ×0.92
- **Inter-region deep space**: ×0.78

### Lane Control Status

The ownership of endpoints determines lane status:

| Status | Condition | Effect |
|--------|-----------|--------|
| Secured | Both endpoints owned by same faction, no hostile incoming | Speed +8% |
| Pressured | Both endpoints owned by same faction, but hostile incoming | Speed -4% |
| Contested | Endpoints owned by different factions | Speed -10% |
| Enemy Controlled | Both endpoints controlled by same enemy | Speed -14% |
| Neutral | Both endpoints unowned | No modifier |

---

## Resource System

### Three Resources

| Resource | Usage | Source |
|----------|-------|--------|
| Metal | Buildings, ships | Planet production |
| Energy | Fleet maintenance, sustained research consumption | Planet production |
| Population | Fleet capacity limit | Natural growth |

### Production Formula

```
Per-second output = Base output × (1 + Building level × 0.2) × (1 + Tech bonus + Node bonus) × Occupation multiplier × 0.88
```

- **Base output**: Determined by planet type (see table above)
- **Building bonus**: Each Mine/Power Plant level +20%
- **Tech bonus**: Mining Efficiency / Energy Tech / Population Growth, +15%–20% per level
- **Node bonus**: Additional percentages from region traits and special nodes
- **Occupation multiplier**: Stabilizing planets produce 0.35–1.0 (scales linearly with stability)
- **Global factor**: 0.88 (overall pace adjustment)

### Resource Caps

- Base cap: 50,000
- Per building level: +10,000
- Population cap determined by total building levels

---

## Building System

| Building | Effect | Metal | Energy | Base Time |
|----------|--------|-------|--------|-----------|
| Mine | Metal output +20%/level | 500 | 200 | 36 min |
| Power Plant | Energy output +20%/level | 400 | 300 | 36 min |
| Shipyard | Ship build speed +50%/level | 800 | 400 | 72 min |
| Defense Turret | Defense value +100/level | 600 | 500 | 54 min |
| Research Lab | Research speed +30%/level | 1000 | 800 | 144 min |

**Rules**:
- Only 1 building can be under construction per planet at a time
- Maximum level 5
- Upgrade cost = Base cost × (current level + 1)
- Upgrade time = Base time × (current level + 1)

---

## Fleet System

### Ship Types

| Ship | Attack | Defense | Speed | Pop Cost | Metal | Energy | Build Time | Maintenance/s |
|------|--------|---------|-------|----------|-------|--------|------------|---------------|
| Scout | 5 | 10 | 10 | 1 | 100 | 50 | 6 min | 0.1 |
| Frigate | 20 | 30 | 5 | 3 | 300 | 150 | 18 min | 0.3 |
| Cruiser | 60 | 80 | 3 | 8 | 800 | 400 | 54 min | 0.8 |
| Battleship | 150 | 200 | 2 | 20 | 2000 | 1000 | 144 min | 2.0 |

### Population Mechanic

- Empire population = Sum of all planet populations
- Used population = Sum of all ship population costs + ship build queue costs
- Available population = Total population - Used population
- **When available population is insufficient, ships cannot be built** (even with enough resources)

### Ship Building Rules

- Ships are built in the planet's ship build queue
- Higher shipyard level = faster build speed
- Completed ships automatically join the idle fleet at that planet's position
- If no idle fleet exists, a new fleet is automatically created

---

## Supply and Readiness

### Supply States

A fleet's supply state depends on its current position and movement status:

| State | Label | Maintenance Multiplier | Readiness Change/s |
|-------|-------|----------------------|-------------------|
| Home Supply | Parked at own planet | ×0.82 | +0.00012 |
| Supply Nexus | Parked at own supply node | ×0.62 | +0.00012 |
| Main Lane Supply | Moving along high-speed lane | ×0.98 | +0.00003 |
| Lane Maneuver | Moving along normal lane | ×1.08 | -0.00002 |
| Outpost Stay | Parked at neutral planet | ×1.12 | -0.00004 |
| Expedition | Moving toward enemy / parked at enemy | ×1.32 | -0.00008 |
| Deep Space | Deep space jump | ×1.55 | -0.00012 |

### Readiness

- Range: 35%–115%
- Impact: Readiness directly multiplies combat attack/defense. 100% = normal power, 50% = half power
- Recovery: Auto-recovers when parked at safe owned planets; higher shipyard level = faster recovery
- Combat loss: Each battle reduces readiness
- **Low-readiness fleets should not continue attacking** — redeploy to rear for repair

### Repair System

When a fleet is idle at a safe owned planet with readiness below 98.5%, it automatically enters repair state:
- Repair rate depends on shipyard level, home planet bonus, and technology
- Automatically returns to "ready" state when complete
- Repair rate decreases when hostile forces are incoming

### Exiled Fleet Attrition

Fleets that have lost all planets lose 18% of ships every 3 minutes until completely destroyed.

---

## Combat System

### Trigger Conditions

Combat triggers when a fleet arrives at an enemy or neutral planet. Must be at war to attack (allies/neutral cannot be attacked).

### Power Calculation

**Attacker**:
```
Power = Σ(Ship count × Attack value) × (1 + Weapon Upgrade level × 0.1) × (1 + Siege Engineering level × 0.12) × Stance modifier × Readiness × Supply modifier
```

**Defender**:
```
Power = (Defense value × (1 + Defense Turret level × 0.5) × Fortification bonus × Occupation penalty) + Σ(Garrison fleet defense × Stance × Readiness × Supply × Fortification bonus) × Shield bonus
```

### Stance Modifiers

| Stance | Attack Multiplier | Defense Multiplier |
|--------|------------------|-------------------|
| Balanced | ×1.00 | ×1.00 |
| Assault | ×1.12 | ×0.90 |
| Hold | ×0.92 | ×1.15 |
| Intercept | ×1.04 | ×1.06 |
| Mobile | ×0.98 | ×0.98 |

### Battle Results (6 Tiers)

| Attack/Defense Ratio | Result | Attacker Loss | Defender Loss | Capture? |
|---------------------|--------|---------------|---------------|----------|
| ≥ 3.0 | Crushing Victory | 8% | 100% | ✅ |
| ≥ 2.15 | Victory | 24% | 100% | ✅ |
| ≥ 1.45 | Stalemate | 36% | 78% | ❌ |
| ≥ 0.95 | Stalemate | 50% | 58% | ❌ |
| ≥ 0.72 | Defeat | 72% | 34% | ❌ |
| < 0.72 | Defeat | 86% | 18% | ❌ |

- Defeated attacker fleets **retreat to their origin planet**
- Defender garrison fleets also take proportional losses

---

## Occupation and Stabilization

### Occupation Flow

1. After winning a battle, the fleet captures the planet and enters **stabilization**
2. Initial stability:
   - Capturing enemy planet: 12%–72% (depends on siege tech, logistics tech, fleet readiness)
   - Colonizing neutral planet: 42%–72%

### Stabilization Effects

- **Reduced production**: Stabilizing output = Base output × (0.35 + Stability/100 × 0.65)
- **Reduced defense**: Defense value = Base value × (0.45 + Stability/100 × 0.55)
- Lower stability = weaker production and defense

### Stability Progress

Stability increases per second. Growth rate depends on:
- Base growth rate
- Garrison fleet power
- Defense Turret level
- Siege Engineering / Logistics Network tech
- Home planet bonus
- Frontline pressure (decreases when hostile forces incoming)

When stability reaches 100%, stabilization completes and the planet is fully controlled.

---

## Technology System

### 10 Technologies

| Tech | Branch | Effect | Cost Curve |
|------|--------|--------|------------|
| Weapon Upgrade | Firepower | Attack +10%/level | Standard |
| Shield Tech | Resilience | Defense +10%/level | Standard |
| Engine Upgrade | Mobility | Speed +20%/level | Standard |
| Mining Efficiency | Economy | Metal output +15%/level | Standard |
| Energy Tech | Economy | Energy output +15%/level | High Energy |
| Population Growth | Economy | Population cap +20%/level | Standard |
| Logistics Network | Mobility | Maintenance reduction, faster readiness recovery, reduced deep space penalty | High Energy |
| Siege Engineering | Firepower | Attack/defense bonus, faster occupation stabilization | Heavy |
| Fortification | Resilience | Planet defense and garrison resilience boost | Heavy |
| Sensor Network | Intel | Longer intel retention, larger sensor range | High Energy |

### Research Rules

- Each AI can research only 1 tech at a time
- Requires at least level 1 Research Lab
- Research speed = Base time / (1 + Total lab levels × 0.3)
- **Research continuously consumes energy**: Pauses when energy is insufficient, resumes when energy is restored
- Maximum level 5, costs and time increase per level

### Cost Progression

Standard curve example:

| Level | Metal | Energy | Time |
|-------|-------|--------|------|
| 1→2 | 1,000 | 500 | 1 hour |
| 2→3 | 2,000 | 1,000 | 2 hours |
| 3→4 | 4,000 | 2,000 | 4 hours |
| 4→5 | 8,000 | 4,000 | 8 hours |
| 5→6 | 16,000 | 8,000 | 16 hours |

---

## Diplomacy System

### Relationship States

| State | Description |
|-------|-------------|
| Neutral | Default state, cannot attack |
| Ally | Allied, shared vision, cannot attack each other |
| Trade | Improved relations after trade execution |
| War | Can attack each other |

### Proposal-Based Diplomacy

All diplomatic actions go through a proposal flow:
1. Initiator creates a proposal (alliance/peace/trade)
2. Proposal waits up to 30 minutes for response
3. Target can accept or reject
4. Unresponded proposals expire automatically

### Alliance

- Duration: 2–8 hours
- Effect: Shared vision, cannot attack each other
- Returns to neutral upon expiration
- Alliance may break early due to **low treaty stability, high crisis level, or high border tension**

### War Declaration

- Can be declared unilaterally
- Cannot make peace for 1 hour after declaring
- **Declaring war on an ally = betrayal**, reputation -50
- **Declaring war on a trade partner**, reputation -20

### Peace

- Requires mutual agreement
- Cannot re-declare war for 1 hour after peace

### Trade

- Resources are exchanged; AI sets its own prices
- Trade takes effect immediately and improves relations

### Surprise Attack

- Can attack without being at war, breaking surface relations
- Severe reputation cost (ally -70, trade -38, neutral -24)
- Suitable for backstabbing, seizing initiative, or breaking fragile alliances

### 7-Dimension Relationship Model

Each AI pair's relationship is composed of 7 dimensions:

| Dimension | Range | Description |
|-----------|-------|-------------|
| Trust | 0–100 | Higher trust makes alliance and trade easier |
| Fear | 0–100 | High fear may lead to seeking peace or alliance |
| Grievance | 0–100 | Accumulates from betrayals and battles, hard to reduce |
| Dependency | 0–100 | Increases with trade and common enemies |
| Border Tension | 0–100 | More nearby planets and military pressure = higher tension |
| Treaty Stability | 0–100 | Alliance/trade exclusive; below 45 risks collapse |
| Crisis Level | 5 tiers | Calm → Strained → Crisis → Fracture → War |

### Reputation System

- Initial 50, range 0–100
- Betray ally -50, keep promise +10, aid ally +20
- Low reputation makes it hard to find allies

---

## Intelligence System

### Fog of War

**AIs do not have omniscient vision.** Each AI can only make decisions based on its own scouted information.

### Intel Sources

1. **Own planets**: Full real-time information
2. **Own fleets**: Full knowledge of own fleet positions and states
3. **Fleet arrival**: Updates planet intel when a fleet arrives
4. **Sensor Network**: Higher tech level = wider detection range radiating from own planets
5. **Alliance sharing**: Allies share all planet and fleet intel

### Intel Freshness

Intel expires over time:
- Planet intel threshold = 300 ticks + Sensor level × 120 + Region intel retention bonus
- Fleet intel threshold = 120 ticks + Sensor level × 60 + Region intel retention bonus
- Expired intel is marked "stale"; AIs consider uncertainty in their decisions

### Feint Deception

AIs can initiate a **feint assault**:
- Injects a **phantom fleet** into the target AI's intel layer
- Phantom fleet appears to be moving toward the target planet
- Doesn't change ground truth, only affects the target AI's judgment
- Lasts 4–8 minutes, then dissipates
- 12-minute cooldown
- Costs resources (energy + metal)

---

## AI Decision System

### Three-Layer Decisions

| Layer | Frequency | Content |
|-------|-----------|---------|
| Strategic | Every 15 min | Development strategy, diplomatic actions, long-term goals, memory updates |
| Tactical | Every 5 min | Resource allocation, fleet dispatch, tech selection |
| Event Response | Immediate | Being attacked, diplomatic proposals, enemy spotted |

### Memory System

| Layer | Retention | Content |
|-------|-----------|---------|
| Short-term | Last 1 hour | All decisions and events |
| Mid-term | Last 6 hours | Key events (battles, diplomatic changes, major losses) |
| Long-term | Entire game | Enemy behavior patterns, successful/failed strategies |

### Scheduler Bias

The AI scheduler automatically supplements AI decisions with:
- Defense building for threatened strategic nodes
- Low-readiness fleet redeployment for repair
- Central ring and chokepoint contest orders
- Forced Research Lab construction when none exists
- Automatic diplomatic proposal responses

### Opening

The game immediately executes a full round of strategic + tactical decisions upon startup, ensuring AIs have action plans from the start.

---

## Victory and Elimination

- **No fixed duration**: The game runs continuously until only one empire survives
- **Elimination condition**: Planet count = 0 AND fleet count = 0
- **AIs that lose all planets but retain fleets remain alive** (exile status, gradually attritioning)
- **The last surviving AI is the winner**

---

## Spectator Features

### Map

- Canvas real-time star map rendering
- Zoom, pan, minimap navigation
- 4 layer toggles: Routes, Labels, Sectors, Theaters
- Fleet movement animation, battle hotspot markers
- Lane control status coloring

### Info Panels (Right Drawer)

| Panel | Content |
|-------|---------|
| Overview | Empire status, intel coverage, region traits, live rankings |
| Focus | Click planet to see control, resources, garrison, incoming fleets, lane connections |
| Diplomacy | Diplomacy matrix (7-dimension relations), tech portraits, proposal list |
| Operations | Moving fleet list, structured battle reports, frontline hotspots |
| Timeline | Event filtering (battle/diplomacy/tech/intel/system), AI/planet/sector filters |
| Interactive | Ask AI questions, place bets |

### Ask AI

- Ask any AI about its current strategic intentions at any time
- Rate limit: 3 questions per 5 minutes per connection
- AI answers based on its own memory and current state

### Betting

- Can bet within the first 10 minutes of the game
- Predict ultimate winner or top 3
- Automatically settled when the game ends

---

## Deployment and Running

### Requirements

- Node.js 18+
- npm
- OpenAI-compatible chat completions API

### Installation

```bash
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure at minimum:

```env
API_BASE_URL=http://localhost:8000
API_KEY=your_api_key_here
API_MODEL=gpt-5.2
HOST=0.0.0.0
PORT=3000
```

Optional parameters:

| Parameter | Default | Description |
|-----------|---------|-------------|
| TICK_RATE | 1000 | Main loop interval in milliseconds |
| STRATEGY_INTERVAL | 900000 | Strategic decision interval (15 min) |
| TACTICAL_INTERVAL | 300000 | Tactical decision interval (5 min) |
| SAVE_INTERVAL | 300000 | Auto-save interval (5 min) |
| DB_PATH | ./data/game.db | SQLite database path |

### Running

```bash
npm start          # Production
npm run dev        # Development (auto-reload)
npm run smoke      # Minimal regression test
```

### Linux One-Click Deploy

```bash
bash deploy.sh
```

### PM2 Daemon

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### Access

- HTTP page: `http://localhost:3000`
- WebSocket: `ws://localhost:3000/ws`

---

## Tech Stack

- **Backend**: Node.js + Express + WebSocket (ws)
- **Database**: sql.js (SQLite file)
- **AI**: OpenAI-compatible chat completions API
- **Frontend**: Vanilla HTML/CSS/JavaScript + Canvas
- **Process Manager**: PM2
