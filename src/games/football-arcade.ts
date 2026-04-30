import { Player, smoothChange } from '../common';
import { IncomingMsg, OutgoingMsg } from '../server';
import { GameClient, GameServer } from './game';
import { UserInput } from '../client/user-input';
import { Button } from '../client/ui-elements';
import { getCharacterDrawFunction } from '../client/characters';

type Vec2 = { x: number; y: number };

type AbilityKind = 'push' | 'blink' | 'shield' | 'slow' | 'powerKick';
type TrapKind = 'speed' | 'ice' | 'mine' | 'wall' | 'slow';
type PickupKind = 'dash_refill' | 'ability_refill' | 'boost';
type EffectKind = 'dash' | 'shoot' | 'pass' | 'tackle' | 'goal' | 'ability' | 'mine' | 'pickup';

type Team = 0 | 1;
type MatchPhase = 'playing' | 'finished';

type RolePreset = {
    role: string;
    ability: AbilityKind;
    maxSpeed: number;
    acceleration: number;
    friction: number;
    kickPower: number;
    control: number;
};

type FootballPlayer = Player & {
    id: string;
    team: Team;
    role: string;
    ability: AbilityKind;

    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;

    inputX: number;
    inputY: number;
    aimX: number;
    aimY: number;

    maxSpeed: number;
    acceleration: number;
    friction: number;
    kickPower: number;
    control: number;

    dashCooldown: number;
    dashTimer: number;
    invulnerableTimer: number;

    tackleCooldown: number;
    tackleTimer: number;
    stunnedTimer: number;

    abilityCooldown: number;
    shieldTimer: number;
    powerKickTimer: number;
    speedBoostTimer: number;

    hasBall: boolean;
    connected: boolean;
    lastSeenAt: number;
};

type BallState = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    maxSpeed: number;
    possessorId: string | null;
    lastTouchId: string | null;
};

type TrapState = {
    id: number;
    kind: TrapKind;
    x: number;
    y: number;
    radius?: number;
    w?: number;
    h?: number;
    ttl: number;
    team?: Team;
    armed?: boolean;
};

type PickupState = {
    id: number;
    kind: PickupKind;
    x: number;
    y: number;
    radius: number;
    ttl: number;
};

type EffectState = {
    id: number;
    kind: EffectKind;
    x: number;
    y: number;
    ttl: number;
    team?: Team;
};

type PublicPlayerState = {
    id: string;
    name: string;
    character: string;
    team: Team;
    role: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    dashCooldown: number;
    dashTimer: number;
    tackleCooldown: number;
    abilityCooldown: number;
    shieldTimer: number;
    stunnedTimer: number;
    hasBall: boolean;
    connected: boolean;
};

type PublicTrapState = {
    id: number;
    kind: TrapKind;
    x: number;
    y: number;
    radius?: number;
    w?: number;
    h?: number;
    ttl: number;
};

type PublicPickupState = {
    id: number;
    kind: PickupKind;
    x: number;
    y: number;
    radius: number;
    ttl: number;
};

type PublicEffectState = {
    id: number;
    kind: EffectKind;
    x: number;
    y: number;
    ttl: number;
    team?: Team;
};

type PublicGameState = {
    phase: MatchPhase;
    matchDuration: number;
    timeLeft: number;
    scores: { left: number; right: number };
    players: Record<string, PublicPlayerState>;
    ball: {
        x: number;
        y: number;
        vx: number;
        vy: number;
        radius: number;
        possessorId: string | null;
        lastTouchId: string | null;
    };
    traps: PublicTrapState[];
    pickups: PublicPickupState[];
    effects: PublicEffectState[];
    possession: {
        playerId: string | null;
        team: Team | null;
    };
    goalFlashTimer: number;
    winnerTeam: Team | null;
};

type FootballServerMsg = {
    kind: 'football_update';
    state: PublicGameState;
};

type FootballClientMsg =
    | {
          kind: 'football_input';
          moveX: number;
          moveY: number;
          aimX: number;
          aimY: number;
      }
    | {
          kind: 'football_dash';
          dirX: number;
          dirY: number;
      }
    | {
          kind: 'football_tackle';
      }
    | {
          kind: 'football_pass';
          dirX: number;
          dirY: number;
      }
    | {
          kind: 'football_shot';
          dirX: number;
          dirY: number;
          charge: number;
      }
    | {
          kind: 'football_ability';
          dirX: number;
          dirY: number;
      };

const FIELD_W = 2200;
const FIELD_H = 1200;
const GOAL_HALF_H = 200;
const GOAL_DEPTH = 90;
const FIELD_LEFT = -FIELD_W / 2;
const FIELD_RIGHT = FIELD_W / 2;
const FIELD_TOP = -FIELD_H / 2;
const FIELD_BOTTOM = FIELD_H / 2;

const PLAYER_RADIUS = 52;
const BALL_RADIUS = 30;

const MATCH_DURATION_SECONDS = 180;
const MATCH_END_HOLD_SECONDS = 5.5;

const DASH_COOLDOWN_SECONDS = 2.1;
const DASH_TIME_SECONDS = 0.16;
const DASH_IMPULSE = 1250;

const TACKLE_COOLDOWN_SECONDS = 1.15;
const TACKLE_TIME_SECONDS = 0.2;

const PASS_SPEED = 980;
const SHOT_MIN_SPEED = 900;
const SHOT_MAX_SPEED = 1600;

const BALL_DRAG = 1.0;
const BALL_MIN_SLIDE_SPEED = 10;

const ABILITY_COOLDOWNS: Record<AbilityKind, number> = {
    push: 7.0,
    blink: 6.0,
    shield: 10.0,
    slow: 8.5,
    powerKick: 9.0
};

const ROLE_PRESETS: RolePreset[] = [
    {
        role: 'Striker',
        ability: 'powerKick',
        maxSpeed: 540,
        acceleration: 2150,
        friction: 5.7,
        kickPower: 1.12,
        control: 0.95
    },
    {
        role: 'Guardian',
        ability: 'shield',
        maxSpeed: 470,
        acceleration: 1850,
        friction: 6.2,
        kickPower: 1.0,
        control: 1.2
    },
    {
        role: 'Trickster',
        ability: 'blink',
        maxSpeed: 560,
        acceleration: 2250,
        friction: 5.2,
        kickPower: 0.92,
        control: 0.95
    },
    {
        role: 'Disruptor',
        ability: 'push',
        maxSpeed: 505,
        acceleration: 2000,
        friction: 5.8,
        kickPower: 1.02,
        control: 0.9
    },
    {
        role: 'Controller',
        ability: 'slow',
        maxSpeed: 490,
        acceleration: 1900,
        friction: 5.9,
        kickPower: 0.95,
        control: 1.15
    }
];

const PICKUP_KINDS: PickupKind[] = ['dash_refill', 'ability_refill', 'boost'];

const LARGE_TTL = 1_000_000;

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

function vecLength(x: number, y: number): number {
    return Math.sqrt(x * x + y * y);
}

function normalize(x: number, y: number, fallbackX: number = 1, fallbackY: number = 0): Vec2 {
    const len = vecLength(x, y);
    if (len < 0.0001) {
        const fallbackLen = vecLength(fallbackX, fallbackY);
        if (fallbackLen < 0.0001) return { x: 1, y: 0 };
        return {
            x: fallbackX / fallbackLen,
            y: fallbackY / fallbackLen
        };
    }
    return {
        x: x / len,
        y: y / len
    };
}

function distSq(ax: number, ay: number, bx: number, by: number): number {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
}

function randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

function circleIntersectsRect(circleX: number, circleY: number, circleR: number, rectX: number, rectY: number, rectW: number, rectH: number): boolean {
    const nearestX = clamp(circleX, rectX, rectX + rectW);
    const nearestY = clamp(circleY, rectY, rectY + rectH);
    return distSq(circleX, circleY, nearestX, nearestY) <= circleR * circleR;
}

export class FootballArcadeServer extends GameServer {
    private players: Record<string, FootballPlayer> = {};
    private playerSpawn: Record<string, Vec2> = {};

    private ball: BallState = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: BALL_RADIUS,
        maxSpeed: 1850,
        possessorId: null,
        lastTouchId: null
    };

    private phase: MatchPhase = 'playing';
    private matchTimeLeft = MATCH_DURATION_SECONDS;
    private finishHoldTimeLeft = MATCH_END_HOLD_SECONDS;

    private leftScore = 0;
    private rightScore = 0;
    private winnerTeam: Team | null = null;

    private trapIdCounter = 0;
    private pickupIdCounter = 0;
    private effectIdCounter = 0;

    private traps: TrapState[] = [];
    private pickups: PickupState[] = [];
    private effects: EffectState[] = [];

    private mineSpawnTimer = 5;
    private wallSpawnTimer = 11;
    private pickupSpawnTimer = 7;

    private elapsedTime = 0;
    private goalFlashTimer = 0;

    init(players: Record<string, Player>) {
        const ids = Object.keys(players).sort((a, b) => Number(a) - Number(b));
        this.players = {};
        this.playerSpawn = {};

        ids.forEach((id, index) => {
            const base = players[id];
            const preset = ROLE_PRESETS[index % ROLE_PRESETS.length];
            const team: Team = index % 2 === 0 ? 0 : 1;

            this.players[id] = {
                id,
                name: base.name,
                character: base.character,
                team,
                role: preset.role,
                ability: preset.ability,
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                radius: PLAYER_RADIUS,
                inputX: 0,
                inputY: 0,
                aimX: team === 0 ? 1 : -1,
                aimY: 0,
                maxSpeed: preset.maxSpeed,
                acceleration: preset.acceleration,
                friction: preset.friction,
                kickPower: preset.kickPower,
                control: preset.control,
                dashCooldown: 0,
                dashTimer: 0,
                invulnerableTimer: 0,
                tackleCooldown: 0,
                tackleTimer: 0,
                stunnedTimer: 0,
                abilityCooldown: 0,
                shieldTimer: 0,
                powerKickTimer: 0,
                speedBoostTimer: 0,
                hasBall: false,
                connected: true,
                lastSeenAt: 0
            };
        });

        this.leftScore = 0;
        this.rightScore = 0;
        this.phase = 'playing';
        this.matchTimeLeft = MATCH_DURATION_SECONDS;
        this.finishHoldTimeLeft = MATCH_END_HOLD_SECONDS;
        this.winnerTeam = null;
        this.elapsedTime = 0;
        this.goalFlashTimer = 0;

        this.traps = [];
        this.pickups = [];
        this.effects = [];
        this.mineSpawnTimer = 5;
        this.wallSpawnTimer = 11;
        this.pickupSpawnTimer = 7;

        this.resetKickoffPositions();
        this.setupBaseArenaTraps();

        this.ball = {
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            radius: BALL_RADIUS,
            maxSpeed: 1850,
            possessorId: null,
            lastTouchId: null
        };
    }

    tick(incomingMessages: IncomingMsg[], dt: number): OutgoingMsg[] {
        const step = clamp(dt, 0, 0.08);
        this.elapsedTime += step;

        this.processMessages(incomingMessages);
        this.updateConnectionFlags();

        if (this.phase === 'playing') {
            this.updatePlayers(step);
            this.resolveTackles();
            this.updateTrapsAndPickups(step);
            this.updateBall(step);
            this.tryAcquireBallPossession();

            this.matchTimeLeft = Math.max(0, this.matchTimeLeft - step);
            if (this.matchTimeLeft <= 0) {
                this.phase = 'finished';
                this.finishHoldTimeLeft = MATCH_END_HOLD_SECONDS;
                if (this.leftScore > this.rightScore) this.winnerTeam = 0;
                else if (this.rightScore > this.leftScore) this.winnerTeam = 1;
                else this.winnerTeam = null;
            }
        } else {
            this.finishHoldTimeLeft = Math.max(0, this.finishHoldTimeLeft - step);
            this.updateEffects(step);
        }

        this.goalFlashTimer = Math.max(0, this.goalFlashTimer - step);
        this.updateEffects(step);

        const message: FootballServerMsg = {
            kind: 'football_update',
            state: this.getPublicState()
        };

        return [{ payload: message }];
    }

    isFinished(): boolean {
        return this.phase === 'finished' && this.finishHoldTimeLeft <= 0;
    }

    private processMessages(incomingMessages: IncomingMsg[]) {
        incomingMessages.forEach((message) => {
            const player = this.players[message.clientId];
            if (!player) return;

            player.lastSeenAt = this.elapsedTime;
            const payload = message.payload as FootballClientMsg;
            if (!payload || typeof payload !== 'object' || !('kind' in payload)) return;

            if (payload.kind === 'football_input') {
                player.inputX = clamp(payload.moveX, -1, 1);
                player.inputY = clamp(payload.moveY, -1, 1);

                const aim = normalize(payload.aimX, payload.aimY, player.aimX, player.aimY);
                player.aimX = aim.x;
                player.aimY = aim.y;
            } else if (payload.kind === 'football_dash') {
                this.tryDash(player, payload.dirX, payload.dirY);
            } else if (payload.kind === 'football_tackle') {
                this.tryTackle(player);
            } else if (payload.kind === 'football_pass') {
                this.tryPass(player, payload.dirX, payload.dirY);
            } else if (payload.kind === 'football_shot') {
                this.tryShot(player, payload.dirX, payload.dirY, payload.charge);
            } else if (payload.kind === 'football_ability') {
                this.tryAbility(player, payload.dirX, payload.dirY);
            }
        });
    }

    private updateConnectionFlags() {
        Object.values(this.players).forEach((player) => {
            player.connected = this.elapsedTime - player.lastSeenAt <= 2.6;
        });
    }

    private updatePlayers(dt: number) {
        Object.values(this.players).forEach((player) => {
            player.dashCooldown = Math.max(0, player.dashCooldown - dt);
            player.dashTimer = Math.max(0, player.dashTimer - dt);
            player.invulnerableTimer = Math.max(0, player.invulnerableTimer - dt);
            player.tackleCooldown = Math.max(0, player.tackleCooldown - dt);
            player.tackleTimer = Math.max(0, player.tackleTimer - dt);
            player.stunnedTimer = Math.max(0, player.stunnedTimer - dt);
            player.abilityCooldown = Math.max(0, player.abilityCooldown - dt);
            player.shieldTimer = Math.max(0, player.shieldTimer - dt);
            player.powerKickTimer = Math.max(0, player.powerKickTimer - dt);
            player.speedBoostTimer = Math.max(0, player.speedBoostTimer - dt);

            let inputX = player.connected ? player.inputX : 0;
            let inputY = player.connected ? player.inputY : 0;

            if (player.stunnedTimer > 0) {
                inputX = 0;
                inputY = 0;
            }

            const movementMods = this.getMovementModifiers(player);
            const moveDir = normalize(inputX, inputY, 0, 0);

            let acceleration = player.acceleration * movementMods.accelerationMul;
            let maxSpeed = player.maxSpeed * movementMods.speedMul;
            const friction = player.friction * movementMods.frictionMul;

            if (player.dashTimer > 0) {
                acceleration *= 1.15;
                maxSpeed *= 1.65;
            }
            if (player.speedBoostTimer > 0) {
                maxSpeed *= 1.23;
            }

            player.vx += moveDir.x * acceleration * dt;
            player.vy += moveDir.y * acceleration * dt;

            const dragFactor = Math.max(0, 1 - friction * dt);
            player.vx *= dragFactor;
            player.vy *= dragFactor;

            const speed = vecLength(player.vx, player.vy);
            if (speed > maxSpeed) {
                const scale = maxSpeed / speed;
                player.vx *= scale;
                player.vy *= scale;
            }

            player.x += player.vx * dt;
            player.y += player.vy * dt;

            player.x = clamp(player.x, FIELD_LEFT + player.radius, FIELD_RIGHT - player.radius);
            player.y = clamp(player.y, FIELD_TOP + player.radius, FIELD_BOTTOM - player.radius);

            this.resolvePlayerWallCollision(player);

            player.hasBall = this.ball.possessorId === player.id;
        });
    }

    private getMovementModifiers(player: FootballPlayer): { speedMul: number; accelerationMul: number; frictionMul: number } {
        let speedMul = 1;
        let accelerationMul = 1;
        let frictionMul = 1;

        this.traps.forEach((trap) => {
            if (trap.radius === undefined) return;
            const radius = trap.radius + player.radius;
            if (distSq(player.x, player.y, trap.x, trap.y) > radius * radius) return;

            if (trap.kind === 'speed') {
                speedMul *= 1.35;
                accelerationMul *= 1.15;
            } else if (trap.kind === 'ice') {
                accelerationMul *= 0.55;
                frictionMul *= 0.32;
            } else if (trap.kind === 'slow') {
                speedMul *= 0.72;
                accelerationMul *= 0.8;
            }
        });

        return { speedMul, accelerationMul, frictionMul };
    }

    private resolvePlayerWallCollision(player: FootballPlayer) {
        this.traps.forEach((trap) => {
            if (trap.kind !== 'wall') return;
            const w = trap.w || 0;
            const h = trap.h || 0;
            const rectX = trap.x - w / 2;
            const rectY = trap.y - h / 2;

            if (!circleIntersectsRect(player.x, player.y, player.radius, rectX, rectY, w, h)) return;

            const nearestX = clamp(player.x, rectX, rectX + w);
            const nearestY = clamp(player.y, rectY, rectY + h);
            let nx = player.x - nearestX;
            let ny = player.y - nearestY;
            let len = vecLength(nx, ny);

            if (len < 0.0001) {
                const leftDepth = Math.abs(player.x - rectX);
                const rightDepth = Math.abs(rectX + w - player.x);
                const topDepth = Math.abs(player.y - rectY);
                const bottomDepth = Math.abs(rectY + h - player.y);
                const minDepth = Math.min(leftDepth, rightDepth, topDepth, bottomDepth);

                if (minDepth === leftDepth) {
                    nx = -1;
                    ny = 0;
                } else if (minDepth === rightDepth) {
                    nx = 1;
                    ny = 0;
                } else if (minDepth === topDepth) {
                    nx = 0;
                    ny = -1;
                } else {
                    nx = 0;
                    ny = 1;
                }
                len = 1;
            }

            nx /= len;
            ny /= len;

            const penetration = player.radius - vecLength(player.x - nearestX, player.y - nearestY);
            if (penetration > 0) {
                player.x += nx * penetration;
                player.y += ny * penetration;

                const vn = player.vx * nx + player.vy * ny;
                if (vn < 0) {
                    player.vx -= vn * nx;
                    player.vy -= vn * ny;
                }
            }
        });
    }

    private tryDash(player: FootballPlayer, dirX: number, dirY: number) {
        if (this.phase !== 'playing') return;
        if (player.dashCooldown > 0 || player.stunnedTimer > 0) return;

        const dir = normalize(dirX, dirY, player.inputX, player.inputY || 0);
        player.vx += dir.x * DASH_IMPULSE;
        player.vy += dir.y * DASH_IMPULSE;
        player.dashTimer = DASH_TIME_SECONDS;
        player.dashCooldown = DASH_COOLDOWN_SECONDS;
        player.invulnerableTimer = 0.2;

        this.addEffect('dash', player.x, player.y, 0.25, player.team);
    }

    private tryTackle(player: FootballPlayer) {
        if (this.phase !== 'playing') return;
        if (player.tackleCooldown > 0 || player.stunnedTimer > 0) return;

        player.tackleTimer = TACKLE_TIME_SECONDS;
        player.tackleCooldown = TACKLE_COOLDOWN_SECONDS;
        this.addEffect('tackle', player.x, player.y, 0.22, player.team);
    }

    private resolveTackles() {
        const allPlayers = Object.values(this.players);

        allPlayers.forEach((attacker) => {
            if (attacker.tackleTimer <= 0) return;

            for (let i = 0; i < allPlayers.length; i += 1) {
                const defender = allPlayers[i];
                if (defender.id === attacker.id) continue;
                if (defender.team === attacker.team) continue;

                const range = attacker.radius + defender.radius + 30;
                if (distSq(attacker.x, attacker.y, defender.x, defender.y) > range * range) continue;
                if (defender.invulnerableTimer > 0) continue;

                const normal = normalize(defender.x - attacker.x, defender.y - attacker.y, attacker.team === 0 ? 1 : -1, 0);

                defender.vx += normal.x * 420;
                defender.vy += normal.y * 420;
                defender.invulnerableTimer = 0.4;

                if (defender.shieldTimer <= 0) {
                    defender.stunnedTimer = Math.max(defender.stunnedTimer, 0.45);
                }

                if (this.ball.possessorId === defender.id && defender.shieldTimer <= 0) {
                    this.ball.possessorId = attacker.id;
                    this.ball.lastTouchId = attacker.id;
                    attacker.hasBall = true;
                    defender.hasBall = false;
                }

                attacker.tackleTimer = 0;
                this.addEffect('tackle', (attacker.x + defender.x) * 0.5, (attacker.y + defender.y) * 0.5, 0.28, attacker.team);
                break;
            }
        });
    }

    private tryPass(player: FootballPlayer, dirX: number, dirY: number) {
        if (this.phase !== 'playing') return;
        if (this.ball.possessorId !== player.id) return;
        if (player.stunnedTimer > 0) return;

        let dir = normalize(dirX, dirY, player.aimX, player.aimY);
        if (Math.abs(dirX) < 0.1 && Math.abs(dirY) < 0.1) {
            const target = this.findPassTarget(player);
            if (target) dir = normalize(target.x - player.x, target.y - player.y, player.team === 0 ? 1 : -1, 0);
        }

        this.releaseBall(dir, PASS_SPEED * player.kickPower * 0.9, player.id);
        this.addEffect('pass', player.x, player.y, 0.35, player.team);
    }

    private findPassTarget(player: FootballPlayer): FootballPlayer | null {
        const teammates = Object.values(this.players).filter((p) => p.team === player.team && p.id !== player.id);
        if (teammates.length === 0) return null;

        let best: FootballPlayer | null = null;
        let bestScore = Number.POSITIVE_INFINITY;

        teammates.forEach((teammate) => {
            const score = distSq(player.x, player.y, teammate.x, teammate.y);
            if (score < bestScore) {
                best = teammate;
                bestScore = score;
            }
        });

        return best;
    }

    private tryShot(player: FootballPlayer, dirX: number, dirY: number, charge: number) {
        if (this.phase !== 'playing') return;
        if (this.ball.possessorId !== player.id) return;
        if (player.stunnedTimer > 0) return;

        const clampedCharge = clamp(charge, 0, 1);
        const dir = normalize(dirX, dirY, player.aimX, player.aimY);

        let shotSpeed = lerp(SHOT_MIN_SPEED, SHOT_MAX_SPEED, clampedCharge) * player.kickPower;
        if (player.powerKickTimer > 0) {
            shotSpeed *= 1.35;
            player.powerKickTimer = 0;
        }

        this.releaseBall(dir, shotSpeed, player.id);
        this.addEffect('shoot', player.x, player.y, 0.4, player.team);
    }

    private tryAbility(player: FootballPlayer, dirX: number, dirY: number) {
        if (this.phase !== 'playing') return;
        if (player.abilityCooldown > 0 || player.stunnedTimer > 0) return;

        const dir = normalize(dirX, dirY, player.aimX, player.aimY);

        if (player.ability === 'push') {
            this.activatePush(player);
        } else if (player.ability === 'blink') {
            this.activateBlink(player, dir);
        } else if (player.ability === 'shield') {
            this.activateShield(player);
        } else if (player.ability === 'slow') {
            this.activateSlowZone(player, dir);
        } else if (player.ability === 'powerKick') {
            this.activatePowerKick(player);
        }

        player.abilityCooldown = ABILITY_COOLDOWNS[player.ability];
        this.addEffect('ability', player.x, player.y, 0.45, player.team);
    }

    private activatePush(player: FootballPlayer) {
        const pushRadius = 280;
        const pushForce = 760;

        Object.values(this.players).forEach((target) => {
            if (target.id === player.id) return;

            const distanceSquared = distSq(player.x, player.y, target.x, target.y);
            if (distanceSquared > pushRadius * pushRadius) return;

            const normal = normalize(target.x - player.x, target.y - player.y, 1, 0);
            target.vx += normal.x * pushForce;
            target.vy += normal.y * pushForce;

            if (target.shieldTimer <= 0) {
                target.stunnedTimer = Math.max(target.stunnedTimer, 0.2);
            }

            if (this.ball.possessorId === target.id && target.shieldTimer <= 0) {
                this.releaseBall(normal, 680, player.id);
            }
        });

        if (this.ball.possessorId === null) {
            const ballDistSq = distSq(player.x, player.y, this.ball.x, this.ball.y);
            if (ballDistSq <= pushRadius * pushRadius) {
                const normal = normalize(this.ball.x - player.x, this.ball.y - player.y, 1, 0);
                this.ball.vx += normal.x * 640;
                this.ball.vy += normal.y * 640;
            }
        }
    }

    private activateBlink(player: FootballPlayer, dir: Vec2) {
        const blinkDistance = 280;
        player.x += dir.x * blinkDistance;
        player.y += dir.y * blinkDistance;

        player.x = clamp(player.x, FIELD_LEFT + player.radius, FIELD_RIGHT - player.radius);
        player.y = clamp(player.y, FIELD_TOP + player.radius, FIELD_BOTTOM - player.radius);
        this.resolvePlayerWallCollision(player);

        if (this.ball.possessorId === player.id) {
            this.ball.x = player.x + dir.x * (player.radius + this.ball.radius + 8);
            this.ball.y = player.y + dir.y * (player.radius + this.ball.radius + 8);
        }
    }

    private activateShield(player: FootballPlayer) {
        player.shieldTimer = 2.6;
    }

    private activateSlowZone(player: FootballPlayer, dir: Vec2) {
        const zoneDistance = 140;
        const zoneX = clamp(player.x + dir.x * zoneDistance, FIELD_LEFT + 120, FIELD_RIGHT - 120);
        const zoneY = clamp(player.y + dir.y * zoneDistance, FIELD_TOP + 120, FIELD_BOTTOM - 120);

        this.traps.push({
            id: ++this.trapIdCounter,
            kind: 'slow',
            x: zoneX,
            y: zoneY,
            radius: 190,
            ttl: 5.3,
            team: player.team
        });
    }

    private activatePowerKick(player: FootballPlayer) {
        player.powerKickTimer = 4.5;
    }

    private releaseBall(dir: Vec2, power: number, lastTouchId: string | null) {
        this.ball.possessorId = null;
        this.ball.lastTouchId = lastTouchId;

        const finalDir = normalize(dir.x, dir.y, 1, 0);
        this.ball.vx = finalDir.x * power;
        this.ball.vy = finalDir.y * power;

        const speed = vecLength(this.ball.vx, this.ball.vy);
        if (speed > this.ball.maxSpeed) {
            const scale = this.ball.maxSpeed / speed;
            this.ball.vx *= scale;
            this.ball.vy *= scale;
        }

        Object.values(this.players).forEach((player) => {
            player.hasBall = false;
        });
    }

    private updateBall(dt: number) {
        const possessorId = this.ball.possessorId;
        if (possessorId) {
            const possessor = this.players[possessorId];
            if (!possessor || possessor.stunnedTimer > 0) {
                const fallbackDir = possessor ? normalize(possessor.aimX, possessor.aimY, possessor.team === 0 ? 1 : -1, 0) : { x: 1, y: 0 };
                this.releaseBall(fallbackDir, 420, possessorId);
            } else {
                const holdDir = normalize(possessor.aimX, possessor.aimY, possessor.team === 0 ? 1 : -1, 0);
                const holdDistance = possessor.radius + this.ball.radius + 10;
                this.ball.x = possessor.x + holdDir.x * holdDistance;
                this.ball.y = possessor.y + holdDir.y * holdDistance;
                this.ball.vx = possessor.vx;
                this.ball.vy = possessor.vy;
                return;
            }
        }

        this.ball.x += this.ball.vx * dt;
        this.ball.y += this.ball.vy * dt;

        const drag = Math.max(0, 1 - BALL_DRAG * dt);
        this.ball.vx *= drag;
        this.ball.vy *= drag;

        const speed = vecLength(this.ball.vx, this.ball.vy);
        if (speed > this.ball.maxSpeed) {
            const scale = this.ball.maxSpeed / speed;
            this.ball.vx *= scale;
            this.ball.vy *= scale;
        }

        if (Math.abs(this.ball.vx) < BALL_MIN_SLIDE_SPEED) this.ball.vx = 0;
        if (Math.abs(this.ball.vy) < BALL_MIN_SLIDE_SPEED) this.ball.vy = 0;

        if (this.ball.y - this.ball.radius < FIELD_TOP) {
            this.ball.y = FIELD_TOP + this.ball.radius;
            this.ball.vy = Math.abs(this.ball.vy) * 0.88;
        } else if (this.ball.y + this.ball.radius > FIELD_BOTTOM) {
            this.ball.y = FIELD_BOTTOM - this.ball.radius;
            this.ball.vy = -Math.abs(this.ball.vy) * 0.88;
        }

        if (this.ball.x - this.ball.radius < FIELD_LEFT) {
            if (Math.abs(this.ball.y) <= GOAL_HALF_H) {
                this.registerGoal(1);
                return;
            }

            this.ball.x = FIELD_LEFT + this.ball.radius;
            this.ball.vx = Math.abs(this.ball.vx) * 0.88;
        } else if (this.ball.x + this.ball.radius > FIELD_RIGHT) {
            if (Math.abs(this.ball.y) <= GOAL_HALF_H) {
                this.registerGoal(0);
                return;
            }

            this.ball.x = FIELD_RIGHT - this.ball.radius;
            this.ball.vx = -Math.abs(this.ball.vx) * 0.88;
        }

        this.resolveBallWallCollision();
        this.resolveBallMineCollision();
    }

    private resolveBallWallCollision() {
        this.traps.forEach((trap) => {
            if (trap.kind !== 'wall') return;

            const w = trap.w || 0;
            const h = trap.h || 0;
            const rectX = trap.x - w / 2;
            const rectY = trap.y - h / 2;
            if (!circleIntersectsRect(this.ball.x, this.ball.y, this.ball.radius, rectX, rectY, w, h)) return;

            const nearestX = clamp(this.ball.x, rectX, rectX + w);
            const nearestY = clamp(this.ball.y, rectY, rectY + h);
            const dx = this.ball.x - nearestX;
            const dy = this.ball.y - nearestY;

            if (Math.abs(dx) > Math.abs(dy)) {
                this.ball.vx *= -0.92;
                if (dx > 0) this.ball.x = rectX + w + this.ball.radius;
                else this.ball.x = rectX - this.ball.radius;
            } else {
                this.ball.vy *= -0.92;
                if (dy > 0) this.ball.y = rectY + h + this.ball.radius;
                else this.ball.y = rectY - this.ball.radius;
            }
        });
    }

    private resolveBallMineCollision() {
        this.traps.forEach((trap) => {
            if (trap.kind !== 'mine') return;
            if (!trap.armed || trap.radius === undefined) return;

            const range = trap.radius + this.ball.radius;
            if (distSq(this.ball.x, this.ball.y, trap.x, trap.y) > range * range) return;

            const normal = normalize(this.ball.x - trap.x, this.ball.y - trap.y, randomRange(-1, 1), randomRange(-1, 1));
            this.ball.vx += normal.x * 760;
            this.ball.vy += normal.y * 760;
            trap.ttl = 0;
            this.addEffect('mine', trap.x, trap.y, 0.45);
        });
    }

    private tryAcquireBallPossession() {
        if (this.ball.possessorId !== null) return;

        const ballSpeed = vecLength(this.ball.vx, this.ball.vy);
        const allPlayers = Object.values(this.players);
        let best: FootballPlayer | null = null;
        let bestScore = Number.POSITIVE_INFINITY;

        allPlayers.forEach((player) => {
            if (player.stunnedTimer > 0) return;
            const maxDist = player.radius + this.ball.radius + 16;
            const dsq = distSq(this.ball.x, this.ball.y, player.x, player.y);
            if (dsq > maxDist * maxDist) return;

            if (ballSpeed > 980 && player.control < 1.05 && player.dashTimer <= 0) {
                const normal = normalize(this.ball.x - player.x, this.ball.y - player.y, 1, 0);
                this.ball.vx += normal.x * 280;
                this.ball.vy += normal.y * 280;
                return;
            }

            const score = dsq - player.control * 400;
            if (score < bestScore) {
                best = player;
                bestScore = score;
            }
        });

        if (best) {
            this.ball.possessorId = best.id;
            this.ball.lastTouchId = best.id;
            best.hasBall = true;
            allPlayers.forEach((player) => {
                if (player.id !== best!.id) player.hasBall = false;
            });
            return;
        }

        allPlayers.forEach((player) => {
            const overlap = player.radius + this.ball.radius;
            const dsq = distSq(this.ball.x, this.ball.y, player.x, player.y);
            if (dsq >= overlap * overlap) return;

            const normal = normalize(this.ball.x - player.x, this.ball.y - player.y, randomRange(-1, 1), randomRange(-1, 1));
            this.ball.vx += normal.x * 220;
            this.ball.vy += normal.y * 220;

            this.ball.x = player.x + normal.x * overlap;
            this.ball.y = player.y + normal.y * overlap;
        });
    }

    private registerGoal(scoringTeam: Team) {
        if (scoringTeam === 0) this.leftScore += 1;
        else this.rightScore += 1;

        this.goalFlashTimer = 1.2;
        this.addEffect('goal', 0, 0, 1.3, scoringTeam);

        this.ball.possessorId = null;
        this.ball.lastTouchId = null;
        this.ball.x = 0;
        this.ball.y = 0;
        this.ball.vx = scoringTeam === 0 ? -280 : 280;
        this.ball.vy = randomRange(-120, 120);

        this.resetKickoffPositions();
    }

    private setupBaseArenaTraps() {
        this.traps.push({
            id: ++this.trapIdCounter,
            kind: 'speed',
            x: -FIELD_W * 0.25,
            y: FIELD_H * 0.28,
            radius: 145,
            ttl: LARGE_TTL
        });

        this.traps.push({
            id: ++this.trapIdCounter,
            kind: 'speed',
            x: FIELD_W * 0.25,
            y: -FIELD_H * 0.28,
            radius: 145,
            ttl: LARGE_TTL
        });

        this.traps.push({
            id: ++this.trapIdCounter,
            kind: 'ice',
            x: 0,
            y: 0,
            radius: 175,
            ttl: LARGE_TTL
        });
    }

    private updateTrapsAndPickups(dt: number) {
        this.mineSpawnTimer -= dt;
        this.wallSpawnTimer -= dt;
        this.pickupSpawnTimer -= dt;

        if (this.mineSpawnTimer <= 0) {
            this.spawnMine();
            this.mineSpawnTimer = randomRange(7, 10);
        }

        if (this.wallSpawnTimer <= 0) {
            this.spawnTemporaryWall();
            this.wallSpawnTimer = randomRange(12, 17);
        }

        if (this.pickupSpawnTimer <= 0) {
            this.spawnPickup();
            this.pickupSpawnTimer = randomRange(8, 12);
        }

        for (let i = this.traps.length - 1; i >= 0; i -= 1) {
            const trap = this.traps[i];
            if (trap.ttl < LARGE_TTL) {
                trap.ttl -= dt;
            }

            if (trap.kind === 'mine' && trap.radius !== undefined && trap.armed) {
                const triggered = this.tryTriggerMineWithPlayers(trap);
                if (triggered) trap.ttl = 0;
            }

            if (trap.ttl <= 0) {
                this.traps.splice(i, 1);
            }
        }

        for (let i = this.pickups.length - 1; i >= 0; i -= 1) {
            const pickup = this.pickups[i];
            pickup.ttl -= dt;

            let collected = false;
            Object.values(this.players).forEach((player) => {
                if (collected) return;
                const range = pickup.radius + player.radius;
                if (distSq(pickup.x, pickup.y, player.x, player.y) > range * range) return;

                if (pickup.kind === 'dash_refill') {
                    player.dashCooldown = 0;
                } else if (pickup.kind === 'ability_refill') {
                    player.abilityCooldown = 0;
                } else if (pickup.kind === 'boost') {
                    player.speedBoostTimer = Math.max(player.speedBoostTimer, 4.2);
                }

                this.addEffect('pickup', pickup.x, pickup.y, 0.4, player.team);
                collected = true;
            });

            if (pickup.ttl <= 0 || collected) {
                this.pickups.splice(i, 1);
            }
        }
    }

    private tryTriggerMineWithPlayers(trap: TrapState): boolean {
        if (trap.radius === undefined) return false;

        let triggered = false;

        Object.values(this.players).forEach((player) => {
            if (triggered) return;
            const range = trap.radius! + player.radius;
            if (distSq(trap.x, trap.y, player.x, player.y) > range * range) return;

            triggered = true;
            const normal = normalize(player.x - trap.x, player.y - trap.y, randomRange(-1, 1), randomRange(-1, 1));
            player.vx += normal.x * 600;
            player.vy += normal.y * 600;

            if (player.shieldTimer <= 0) {
                player.stunnedTimer = Math.max(player.stunnedTimer, 0.65);
            }

            if (this.ball.possessorId === player.id && player.shieldTimer <= 0) {
                this.releaseBall(normal, 820, player.id);
            }

            this.addEffect('mine', trap.x, trap.y, 0.45);
        });

        return triggered;
    }

    private spawnMine() {
        const mineCount = this.traps.filter((t) => t.kind === 'mine').length;
        if (mineCount >= 4) return;

        this.traps.push({
            id: ++this.trapIdCounter,
            kind: 'mine',
            x: randomRange(FIELD_LEFT * 0.75, FIELD_RIGHT * 0.75),
            y: randomRange(FIELD_TOP * 0.75, FIELD_BOTTOM * 0.75),
            radius: 42,
            ttl: 13,
            armed: true
        });
    }

    private spawnTemporaryWall() {
        const wallCount = this.traps.filter((t) => t.kind === 'wall').length;
        if (wallCount >= 2) return;

        const vertical = Math.random() > 0.5;
        const w = vertical ? 46 : 270;
        const h = vertical ? 270 : 46;

        this.traps.push({
            id: ++this.trapIdCounter,
            kind: 'wall',
            x: randomRange(-FIELD_W * 0.22, FIELD_W * 0.22),
            y: randomRange(-FIELD_H * 0.22, FIELD_H * 0.22),
            w,
            h,
            ttl: 8.5
        });
    }

    private spawnPickup() {
        if (this.pickups.length >= 3) return;

        const randomKind = PICKUP_KINDS[Math.floor(Math.random() * PICKUP_KINDS.length)];
        this.pickups.push({
            id: ++this.pickupIdCounter,
            kind: randomKind,
            x: randomRange(FIELD_LEFT * 0.72, FIELD_RIGHT * 0.72),
            y: randomRange(FIELD_TOP * 0.72, FIELD_BOTTOM * 0.72),
            radius: 30,
            ttl: 10
        });
    }

    private addEffect(kind: EffectKind, x: number, y: number, ttl: number, team?: Team) {
        this.effects.push({
            id: ++this.effectIdCounter,
            kind,
            x,
            y,
            ttl,
            team
        });
    }

    private updateEffects(dt: number) {
        for (let i = this.effects.length - 1; i >= 0; i -= 1) {
            const effect = this.effects[i];
            effect.ttl -= dt;
            if (effect.ttl <= 0) this.effects.splice(i, 1);
        }
    }

    private resetKickoffPositions() {
        const leftTeam = Object.values(this.players).filter((p) => p.team === 0);
        const rightTeam = Object.values(this.players).filter((p) => p.team === 1);

        const applyTeamSpawn = (teamPlayers: FootballPlayer[], x: number) => {
            const count = teamPlayers.length;
            teamPlayers.forEach((player, index) => {
                const rowRatio = count <= 1 ? 0 : index / (count - 1);
                const y = count <= 1 ? 0 : lerp(-FIELD_H * 0.32, FIELD_H * 0.32, rowRatio);

                player.x = x;
                player.y = y;
                player.vx = 0;
                player.vy = 0;
                player.inputX = 0;
                player.inputY = 0;
                player.hasBall = false;

                this.playerSpawn[player.id] = { x, y };
            });
        };

        applyTeamSpawn(leftTeam, -FIELD_W * 0.3);
        applyTeamSpawn(rightTeam, FIELD_W * 0.3);
    }

    private getPublicState(): PublicGameState {
        const publicPlayers: Record<string, PublicPlayerState> = {};
        Object.values(this.players).forEach((player) => {
            publicPlayers[player.id] = {
                id: player.id,
                name: player.name,
                character: player.character,
                team: player.team,
                role: player.role,
                x: player.x,
                y: player.y,
                vx: player.vx,
                vy: player.vy,
                radius: player.radius,
                dashCooldown: player.dashCooldown,
                dashTimer: player.dashTimer,
                tackleCooldown: player.tackleCooldown,
                abilityCooldown: player.abilityCooldown,
                shieldTimer: player.shieldTimer,
                stunnedTimer: player.stunnedTimer,
                hasBall: this.ball.possessorId === player.id,
                connected: player.connected
            };
        });

        return {
            phase: this.phase,
            matchDuration: MATCH_DURATION_SECONDS,
            timeLeft: this.matchTimeLeft,
            scores: {
                left: this.leftScore,
                right: this.rightScore
            },
            players: publicPlayers,
            ball: {
                x: this.ball.x,
                y: this.ball.y,
                vx: this.ball.vx,
                vy: this.ball.vy,
                radius: this.ball.radius,
                possessorId: this.ball.possessorId,
                lastTouchId: this.ball.lastTouchId
            },
            traps: this.traps.map((trap) => ({
                id: trap.id,
                kind: trap.kind,
                x: trap.x,
                y: trap.y,
                radius: trap.radius,
                w: trap.w,
                h: trap.h,
                ttl: trap.ttl
            })),
            pickups: this.pickups.map((pickup) => ({
                id: pickup.id,
                kind: pickup.kind,
                x: pickup.x,
                y: pickup.y,
                radius: pickup.radius,
                ttl: pickup.ttl
            })),
            effects: this.effects.map((effect) => ({
                id: effect.id,
                kind: effect.kind,
                x: effect.x,
                y: effect.y,
                ttl: effect.ttl,
                team: effect.team
            })),
            possession: {
                playerId: this.ball.possessorId,
                team: this.ball.possessorId ? this.players[this.ball.possessorId]?.team ?? null : null
            },
            goalFlashTimer: this.goalFlashTimer,
            winnerTeam: this.winnerTeam
        };
    }
}

export class FootballArcadeClient extends GameClient {
    private state: PublicGameState | null = null;
    private renderPlayers: Record<string, { x: number; y: number }> = {};
    private messageQueue: FootballClientMsg[] = [];
    private userExited = false;

    private shootChargeStart: number | null = null;
    private finishSeenAtMs: number | null = null;
    private lastServerUpdateAtMs = performance.now();

    private exitButton: Button;
    private view = {
        scale: 1,
        offsetX: 0,
        offsetY: 0
    };

    private listenersAttached = false;
    private readonly onKeyDown = (event: KeyboardEvent) => {
        if (event.repeat) return;

        if (event.code === 'Space') {
            const aim = this.getAimDirection();
            this.messageQueue.push({
                kind: 'football_dash',
                dirX: aim.x,
                dirY: aim.y
            });
        } else if (event.code === 'KeyK') {
            this.messageQueue.push({ kind: 'football_tackle' });
        } else if (event.code === 'KeyJ') {
            const aim = this.getAimDirection();
            this.messageQueue.push({
                kind: 'football_pass',
                dirX: aim.x,
                dirY: aim.y
            });
        } else if (event.code === 'KeyE') {
            const aim = this.getAimDirection();
            this.messageQueue.push({
                kind: 'football_ability',
                dirX: aim.x,
                dirY: aim.y
            });
        } else if (event.code === 'KeyL') {
            if (this.shootChargeStart === null) this.shootChargeStart = performance.now();
        }
    };

    private readonly onKeyUp = (event: KeyboardEvent) => {
        if (event.code === 'KeyL' && this.shootChargeStart !== null) {
            const chargeSeconds = (performance.now() - this.shootChargeStart) / 1000;
            const charge = clamp(chargeSeconds / 1.15, 0, 1);
            const aim = this.getAimDirection();

            this.messageQueue.push({
                kind: 'football_shot',
                dirX: aim.x,
                dirY: aim.y,
                charge
            });
            this.shootChargeStart = null;
        } else if (event.code === 'Escape' && this.state?.phase === 'finished') {
            this.userExited = true;
        }
    };

    constructor(userInput: UserInput, myId: string) {
        super(userInput, myId);

        this.exitButton = new Button('exit', this.userInput, () => {
            this.userExited = true;
        });
        this.exitButton.setColors({ main: '#7a1c1c', text: '#f7f7f7', shadow: '#101010' });

        document.addEventListener('keydown', this.onKeyDown);
        document.addEventListener('keyup', this.onKeyUp);
        this.listenersAttached = true;
    }

    init(players: Record<string, Player>) {
        // Game state is provided by server snapshots; init is intentionally light.
        void players;
    }

    draw(ctx: CanvasRenderingContext2D, dt: number) {
        const { screenW, screenH } = this.userInput;

        if (!this.state) {
            ctx.fillStyle = '#0c1a24';
            ctx.fillRect(0, 0, screenW, screenH);
            ctx.fillStyle = '#f0f0f0';
            ctx.font = 'bold 34px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Loading Football Arena...', screenW / 2, screenH / 2);
            return;
        }

        const worldMargin = 40;
        const scaleX = (screenW - worldMargin * 2) / FIELD_W;
        const scaleY = (screenH - 180) / FIELD_H;
        const scale = Math.max(0.1, Math.min(scaleX, scaleY));

        this.view.scale = scale;
        this.view.offsetX = screenW / 2;
        this.view.offsetY = screenH / 2 + 30;

        this.drawBackground(ctx, screenW, screenH);

        ctx.save();
        ctx.translate(this.view.offsetX, this.view.offsetY);
        ctx.scale(scale, scale);

        this.drawField(ctx);
        this.drawGoals(ctx);
        this.drawTraps(ctx);
        this.drawPickups(ctx);
        this.drawEffects(ctx);
        this.drawPlayers(ctx, dt);
        this.drawBall(ctx);

        ctx.restore();

        this.drawHud(ctx, screenW, screenH);

        if (this.state.phase === 'finished') {
            if (this.finishSeenAtMs === null) this.finishSeenAtMs = performance.now();
            this.drawEndOverlay(ctx, screenW, screenH);
        } else {
            this.finishSeenAtMs = null;
        }
    }

    handleMessage(message: any) {
        if (message.kind !== 'football_update') return;

        const update = message as FootballServerMsg;
        this.state = update.state;
        this.lastServerUpdateAtMs = performance.now();

        Object.values(update.state.players).forEach((player) => {
            if (!this.renderPlayers[player.id]) {
                this.renderPlayers[player.id] = { x: player.x, y: player.y };
            }
        });

        Object.keys(this.renderPlayers).forEach((id) => {
            if (!update.state.players[id]) {
                delete this.renderPlayers[id];
            }
        });
    }

    flushMessages(): any[] {
        const messages: FootballClientMsg[] = [];

        const aim = this.getAimDirection();
        messages.push({
            kind: 'football_input',
            moveX: this.userInput.moveDirectionX,
            moveY: this.userInput.moveDirectionY,
            aimX: aim.x,
            aimY: aim.y
        });

        this.messageQueue.forEach((message) => messages.push(message));
        this.messageQueue = [];

        return messages;
    }

    isFinished(): boolean {
        const staleConnection = performance.now() - this.lastServerUpdateAtMs > 7000;
        const autoExitAfterMatch =
            this.finishSeenAtMs !== null && performance.now() - this.finishSeenAtMs > 5200;

        const finished = this.userExited || staleConnection || autoExitAfterMatch;
        if (finished) this.detachListeners();
        return finished;
    }

    private detachListeners() {
        if (!this.listenersAttached) return;
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        this.listenersAttached = false;
    }

    private getAimDirection(): Vec2 {
        const me = this.state?.players[this.myId];
        if (me) {
            const worldMouseX = (this.userInput.mouseX - this.view.offsetX) / this.view.scale;
            const worldMouseY = (this.userInput.mouseY - this.view.offsetY) / this.view.scale;
            const mouseDir = normalize(worldMouseX - me.x, worldMouseY - me.y, me.team === 0 ? 1 : -1, 0);
            if (vecLength(worldMouseX - me.x, worldMouseY - me.y) > 10) {
                return mouseDir;
            }
        }

        if (Math.abs(this.userInput.moveDirectionX) > 0.01 || Math.abs(this.userInput.moveDirectionY) > 0.01) {
            return normalize(this.userInput.moveDirectionX, this.userInput.moveDirectionY);
        }

        const fallbackX = me ? (me.team === 0 ? 1 : -1) : 1;
        return { x: fallbackX, y: 0 };
    }

    private drawBackground(ctx: CanvasRenderingContext2D, screenW: number, screenH: number) {
        const gradient = ctx.createLinearGradient(0, 0, 0, screenH);
        gradient.addColorStop(0, '#071722');
        gradient.addColorStop(1, '#1a3e24');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, screenW, screenH);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        for (let i = 0; i < 14; i += 1) {
            const y = 20 + i * 14;
            ctx.fillRect(0, y, screenW, 4);
        }
    }

    private drawField(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = '#2b8f3f';
        ctx.fillRect(FIELD_LEFT, FIELD_TOP, FIELD_W, FIELD_H);

        for (let i = 0; i < 10; i += 1) {
            ctx.fillStyle = i % 2 === 0 ? '#28903f' : '#228638';
            const stripeW = FIELD_W / 10;
            ctx.fillRect(FIELD_LEFT + i * stripeW, FIELD_TOP, stripeW, FIELD_H);
        }

        ctx.strokeStyle = '#f7f7f7';
        ctx.lineWidth = 8;
        ctx.strokeRect(FIELD_LEFT, FIELD_TOP, FIELD_W, FIELD_H);

        ctx.beginPath();
        ctx.moveTo(0, FIELD_TOP);
        ctx.lineTo(0, FIELD_BOTTOM);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 145, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(FIELD_LEFT, -GOAL_HALF_H);
        ctx.lineTo(FIELD_LEFT, GOAL_HALF_H);
        ctx.moveTo(FIELD_RIGHT, -GOAL_HALF_H);
        ctx.lineTo(FIELD_RIGHT, GOAL_HALF_H);
        ctx.strokeStyle = '#e7f4e8';
        ctx.lineWidth = 6;
        ctx.stroke();
    }

    private drawGoals(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = '#dce1e3';
        ctx.fillRect(FIELD_LEFT - GOAL_DEPTH, -GOAL_HALF_H, GOAL_DEPTH, GOAL_HALF_H * 2);
        ctx.fillRect(FIELD_RIGHT, -GOAL_HALF_H, GOAL_DEPTH, GOAL_HALF_H * 2);

        ctx.strokeStyle = '#9aa2a6';
        ctx.lineWidth = 4;
        ctx.strokeRect(FIELD_LEFT - GOAL_DEPTH, -GOAL_HALF_H, GOAL_DEPTH, GOAL_HALF_H * 2);
        ctx.strokeRect(FIELD_RIGHT, -GOAL_HALF_H, GOAL_DEPTH, GOAL_HALF_H * 2);

        ctx.strokeStyle = '#c8d1d4';
        ctx.lineWidth = 2;
        for (let i = 1; i <= 4; i += 1) {
            const ratio = i / 5;
            const y = lerp(-GOAL_HALF_H, GOAL_HALF_H, ratio);
            ctx.beginPath();
            ctx.moveTo(FIELD_LEFT - GOAL_DEPTH, y);
            ctx.lineTo(FIELD_LEFT, y);
            ctx.moveTo(FIELD_RIGHT, y);
            ctx.lineTo(FIELD_RIGHT + GOAL_DEPTH, y);
            ctx.stroke();
        }
    }

    private drawTraps(ctx: CanvasRenderingContext2D) {
        if (!this.state) return;

        this.state.traps.forEach((trap) => {
            if (trap.kind === 'wall') {
                const w = trap.w || 0;
                const h = trap.h || 0;
                ctx.fillStyle = 'rgba(75, 75, 85, 0.78)';
                ctx.fillRect(trap.x - w / 2, trap.y - h / 2, w, h);
                ctx.strokeStyle = 'rgba(220, 220, 230, 0.8)';
                ctx.lineWidth = 3;
                ctx.strokeRect(trap.x - w / 2, trap.y - h / 2, w, h);
                return;
            }

            const radius = trap.radius || 0;
            if (radius <= 0) return;

            if (trap.kind === 'speed') ctx.fillStyle = 'rgba(235, 201, 28, 0.25)';
            else if (trap.kind === 'ice') ctx.fillStyle = 'rgba(86, 188, 255, 0.2)';
            else if (trap.kind === 'mine') ctx.fillStyle = 'rgba(232, 58, 58, 0.4)';
            else ctx.fillStyle = 'rgba(116, 79, 170, 0.22)';

            ctx.beginPath();
            ctx.arc(trap.x, trap.y, radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.lineWidth = 3;
            if (trap.kind === 'mine') ctx.strokeStyle = '#f8caca';
            else if (trap.kind === 'ice') ctx.strokeStyle = '#c1e6ff';
            else if (trap.kind === 'speed') ctx.strokeStyle = '#f7de7f';
            else ctx.strokeStyle = '#d6b9f7';
            ctx.stroke();
        });
    }

    private drawPickups(ctx: CanvasRenderingContext2D) {
        if (!this.state) return;

        this.state.pickups.forEach((pickup) => {
            ctx.beginPath();
            ctx.arc(pickup.x, pickup.y, pickup.radius, 0, Math.PI * 2);

            if (pickup.kind === 'dash_refill') ctx.fillStyle = '#ffd95e';
            else if (pickup.kind === 'ability_refill') ctx.fillStyle = '#6fd3ff';
            else ctx.fillStyle = '#8fff8f';

            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#111';
            ctx.stroke();
        });
    }

    private drawEffects(ctx: CanvasRenderingContext2D) {
        if (!this.state) return;

        this.state.effects.forEach((effect) => {
            const pulse = 1 + Math.sin(performance.now() / 120) * 0.15;
            let color = 'rgba(255, 255, 255, 0.5)';
            if (effect.kind === 'dash') color = 'rgba(255, 235, 95, 0.65)';
            else if (effect.kind === 'shoot') color = 'rgba(255, 129, 72, 0.6)';
            else if (effect.kind === 'pass') color = 'rgba(114, 221, 255, 0.55)';
            else if (effect.kind === 'tackle') color = 'rgba(255, 83, 83, 0.55)';
            else if (effect.kind === 'goal') color = 'rgba(255, 255, 255, 0.6)';
            else if (effect.kind === 'ability') color = 'rgba(200, 124, 255, 0.45)';
            else if (effect.kind === 'mine') color = 'rgba(255, 70, 70, 0.6)';
            else if (effect.kind === 'pickup') color = 'rgba(167, 255, 167, 0.5)';

            const radius = 35 + effect.ttl * 45;
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, radius * pulse, 0, Math.PI * 2);
            ctx.stroke();
        });
    }

    private drawPlayers(ctx: CanvasRenderingContext2D, dt: number) {
        if (!this.state) return;

        const entries = Object.values(this.state.players);
        entries.forEach((player) => {
            const render = this.renderPlayers[player.id] || { x: player.x, y: player.y };
            this.renderPlayers[player.id] = render;

            const halfLife = player.id === this.myId ? 0.035 : 0.07;
            render.x = smoothChange(render.x, player.x, dt, halfLife);
            render.y = smoothChange(render.y, player.y, dt, halfLife);

            const moveMag = clamp(vecLength(player.vx, player.vy) / 560, 0, 1);
            const bob = Math.sin(performance.now() / 85 + render.x * 0.01) * 6 * moveMag;

            ctx.beginPath();
            ctx.ellipse(render.x, render.y + 58, 42, 14, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
            ctx.fill();

            if (player.dashTimer > 0) {
                ctx.beginPath();
                ctx.arc(render.x, render.y, player.radius + 14, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 220, 87, 0.35)';
                ctx.fill();
            }
            if (player.shieldTimer > 0) {
                ctx.beginPath();
                ctx.arc(render.x, render.y, player.radius + 20, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(120, 220, 255, 0.2)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(180, 240, 255, 0.7)';
                ctx.lineWidth = 3;
                ctx.stroke();
            }
            if (player.stunnedTimer > 0) {
                ctx.beginPath();
                ctx.arc(render.x, render.y - 70, 10, 0, Math.PI * 2);
                ctx.fillStyle = '#ffe04d';
                ctx.fill();
            }

            const drawCharacter = getCharacterDrawFunction(player.character);
            const width = 86;
            const height = 134;
            drawCharacter(ctx, render.x, render.y - bob, width, height);

            const teamColor = player.team === 0 ? '#9af5a6' : '#80d6ff';
            ctx.strokeStyle = teamColor;
            ctx.lineWidth = player.id === this.myId ? 5 : 3;
            ctx.beginPath();
            ctx.arc(render.x, render.y + 3, player.radius - 7, 0, Math.PI * 2);
            ctx.stroke();

            if (player.hasBall) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.moveTo(render.x, render.y - 96);
                ctx.lineTo(render.x - 12, render.y - 118);
                ctx.lineTo(render.x + 12, render.y - 118);
                ctx.closePath();
                ctx.fill();
            }

            ctx.fillStyle = '#f4f4f4';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(player.name, render.x, render.y - 86);

            ctx.fillStyle = '#d7d7d7';
            ctx.font = '16px Arial';
            ctx.fillText(player.role, render.x, render.y - 68);
        });
    }

    private drawBall(ctx: CanvasRenderingContext2D) {
        if (!this.state) return;

        const ball = this.state.ball;
        ctx.beginPath();
        ctx.ellipse(ball.x, ball.y + 40, 26, 10, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#f6f6f6';
        ctx.fill();
        ctx.strokeStyle = '#202020';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(ball.x + 10, ball.y - 8, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#272727';
        ctx.fill();

        if (this.state.goalFlashTimer > 0) {
            const alpha = clamp(this.state.goalFlashTimer / 1.2, 0, 1) * 0.7;
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fillRect(FIELD_LEFT, FIELD_TOP, FIELD_W, FIELD_H);
        }
    }

    private drawHud(ctx: CanvasRenderingContext2D, screenW: number, screenH: number) {
        if (!this.state) return;

        const panelW = 390;
        const panelH = 86;
        const panelX = screenW / 2 - panelW / 2;
        const panelY = 14;

        ctx.fillStyle = 'rgba(8, 12, 20, 0.84)';
        ctx.fillRect(panelX, panelY, panelW, panelH);
        ctx.strokeStyle = '#d0d0d0';
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, panelY, panelW, panelH);

        ctx.font = 'bold 34px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#8ef497';
        ctx.fillText(String(this.state.scores.left), panelX + 88, panelY + panelH / 2 + 4);

        ctx.fillStyle = '#87ceff';
        ctx.fillText(String(this.state.scores.right), panelX + panelW - 88, panelY + panelH / 2 + 4);

        const timeLeft = Math.max(0, this.state.timeLeft);
        const minutes = Math.floor(timeLeft / 60);
        const seconds = Math.floor(timeLeft % 60);
        const timeLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        ctx.fillStyle = '#f5f5f5';
        ctx.font = 'bold 28px Arial';
        ctx.fillText(timeLabel, panelX + panelW / 2, panelY + panelH / 2 + 2);

        const me = this.state.players[this.myId];
        if (me) {
            const barX = 26;
            const barY = screenH - 120;
            const barW = 270;
            const barH = 18;

            const dashRatio = 1 - clamp(me.dashCooldown / DASH_COOLDOWN_SECONDS, 0, 1);
            const abilityRatio = 1 - clamp(me.abilityCooldown / ABILITY_COOLDOWNS[this.getMyAbilityKind(me.role)], 0, 1);

            this.drawBar(ctx, barX, barY, barW, barH, dashRatio, '#f5cc4f', 'DASH');
            this.drawBar(ctx, barX, barY + 28, barW, barH, abilityRatio, '#6fc9ff', 'ABILITY');

            const charging = this.shootChargeStart !== null;
            const chargeValue = charging ? clamp((performance.now() - this.shootChargeStart!) / 1150, 0, 1) : 0;
            this.drawBar(ctx, barX, barY + 56, barW, barH, chargeValue, '#ff9b6f', 'SHOT');

            ctx.fillStyle = '#f2f2f2';
            ctx.font = '20px Arial';
            ctx.textAlign = 'left';
            const possessionLabel = me.hasBall ? 'Possesso: SI' : 'Possesso: NO';
            ctx.fillText(possessionLabel, barX, barY - 16);
        }

        const connectedPlayers = Object.values(this.state.players).filter((p) => p.connected).length;
        const totalPlayers = Object.keys(this.state.players).length;
        ctx.fillStyle = '#f3f3f3';
        ctx.font = '18px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`Giocatori connessi: ${connectedPlayers}/${totalPlayers}`, screenW - 24, 34);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#e5e5e5';
        ctx.font = '18px Arial';
        ctx.fillText('Controlli: WASD muovi, Spazio dash, J pass, L tiro caricato, K tackle, E abilita', 24, screenH - 24);
    }

    private drawBar(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        w: number,
        h: number,
        ratio: number,
        fillColor: string,
        label: string
    ) {
        ctx.fillStyle = 'rgba(10, 12, 18, 0.8)';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, w * clamp(ratio, 0, 1), h);
        ctx.strokeStyle = '#d0d0d0';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = '#f2f2f2';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(label, x, y - 2);
    }

    private drawEndOverlay(ctx: CanvasRenderingContext2D, screenW: number, screenH: number) {
        if (!this.state) return;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, 0, screenW, screenH);

        let title = 'Pareggio';
        if (this.state.winnerTeam === 0) title = 'Team Sinistra Vince';
        else if (this.state.winnerTeam === 1) title = 'Team Destra Vince';

        ctx.fillStyle = '#f8f8f8';
        ctx.font = 'bold 58px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, screenW / 2, screenH / 2 - 70);

        ctx.font = '28px Arial';
        ctx.fillText(
            `${this.state.scores.left} - ${this.state.scores.right}`,
            screenW / 2,
            screenH / 2 - 18
        );

        ctx.font = '20px Arial';
        ctx.fillText('Premi ESC o clicca exit per tornare alla lobby', screenW / 2, screenH / 2 + 26);

        this.exitButton.draw(ctx, screenW / 2 - 90, screenH / 2 + 62, 180, 52);
    }

    private getMyAbilityKind(role: string): AbilityKind {
        const preset = ROLE_PRESETS.find((candidate) => candidate.role === role);
        return preset ? preset.ability : 'push';
    }
}
