export const expeditions = [
  {
    name: "Baía",
    width: 8,
    height: 5,
    mines: 6,
    seed: 2147,
    description: "Um primeiro contato com o terreno.",
  },
  {
    name: "Travessia",
    width: 10,
    height: 6,
    mines: 10,
    seed: 6833,
    description: "Mais horizonte, mais hipóteses.",
  },
  {
    name: "Platô",
    width: 12,
    height: 7,
    mines: 16,
    seed: 9151,
    description: "Pouco espaço para certezas apressadas.",
  },
];
export function neighbors(g, i) {
  const x = i % g.width,
    y = Math.floor(i / g.width),
    out = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx,
        ny = y + dy;
      if (nx >= 0 && nx < g.width && ny >= 0 && ny < g.height)
        out.push(ny * g.width + nx);
    }
  return out;
}
export function create(config = 0, seed = expeditions[config].seed) {
  const { width, height, mines } = expeditions[config],
    length = width * height;
  return {
    config,
    seed,
    width,
    height,
    total: mines,
    mines: null,
    counts: Array(length).fill(0),
    revealed: Array(length).fill(false),
    flags: Array(length).fill(false),
    status: "ready",
    moves: 0,
    exploded: -1,
  };
}
const valid = (g, i) => Number.isInteger(i) && i >= 0 && i < g.revealed.length;
const active = (g) => g.status === "ready" || g.status === "playing";
function generate(g, first) {
  const excluded = new Set([first, ...neighbors(g, first)]),
    positions = g.revealed.map((_, i) => i).filter((i) => !excluded.has(i));
  let seed = g.seed >>> 0;
  for (let i = positions.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  const mines = Array(g.revealed.length).fill(false);
  for (const i of positions.slice(0, g.total)) mines[i] = true;
  return {
    ...g,
    mines,
    counts: mines.map((_, i) => neighbors(g, i).filter((n) => mines[n]).length),
    status: "playing",
  };
}
function uncover(g, seeds) {
  const mine = seeds.find((i) => g.mines[i]);
  if (mine !== undefined)
    return { ...g, status: "lost", exploded: mine, moves: g.moves + 1 };
  const revealed = [...g.revealed],
    queue = [...seeds],
    seen = new Set();
  while (queue.length) {
    const i = queue.pop();
    if (seen.has(i) || revealed[i] || g.flags[i] || g.mines[i]) continue;
    seen.add(i);
    revealed[i] = true;
    if (g.counts[i] === 0) queue.push(...neighbors(g, i));
  }
  if (revealed.every((v, i) => v || g.mines[i]))
    return {
      ...g,
      revealed,
      flags: [...g.mines],
      status: "won",
      moves: g.moves + 1,
    };
  return { ...g, revealed, moves: g.moves + 1 };
}
export function explore(g, i) {
  if (!active(g) || !valid(g, i) || g.flags[i] || g.revealed[i]) return g;
  const started = g.mines ? g : generate(g, i);
  return uncover(started, [i]);
}
export function flag(g, i) {
  if (!active(g) || !valid(g, i) || g.revealed[i]) return g;
  if (!g.flags[i] && g.flags.filter(Boolean).length >= g.total) return g;
  const flags = [...g.flags];
  flags[i] = !flags[i];
  return { ...g, flags, moves: g.moves + 1 };
}
export function chord(g, i) {
  if (
    g.status !== "playing" ||
    !valid(g, i) ||
    !g.revealed[i] ||
    g.counts[i] === 0
  )
    return g;
  const around = neighbors(g, i);
  if (around.filter((n) => g.flags[n]).length !== g.counts[i]) return g;
  const targets = around.filter((n) => !g.flags[n] && !g.revealed[n]);
  return targets.length ? uncover(g, targets) : g;
}
export const blank = () => ({
  version: 1,
  sound: false,
  motion: false,
  records: Array.from({ length: 3 }, () => ({
    played: 0,
    wins: 0,
    best: null,
  })),
});
export function readSave(raw) {
  try {
    const s = JSON.parse(raw || "null");
    if (
      s?.version !== 1 ||
      typeof s.sound !== "boolean" ||
      typeof s.motion !== "boolean" ||
      !Array.isArray(s.records) ||
      s.records.length !== 3 ||
      s.records.some(
        (r) =>
          !r ||
          ![r.played, r.wins].every(
            (n) => Number.isInteger(n) && n >= 0 && n <= 1000000,
          ) ||
          r.wins > r.played ||
          (r.best !== null &&
            (!Number.isInteger(r.best) || r.best < 1 || r.best > 1000000)) ||
          (r.wins === 0) !== (r.best === null),
      )
    )
      return blank();
    return {
      version: 1,
      sound: s.sound,
      motion: s.motion,
      records: s.records.map((r) => ({
        played: r.played,
        wins: r.wins,
        best: r.best,
      })),
    };
  } catch {
    return blank();
  }
}
export function record(save, g) {
  if (active(g)) return save;
  const old = save.records[g.config];
  if (old.played >= 1000000) return save;
  const records = save.records.map((r) => ({ ...r }));
  records[g.config] = {
    played: old.played + 1,
    wins: old.wins + (g.status === "won" ? 1 : 0),
    best:
      g.status === "won" ? Math.min(old.best ?? Infinity, g.moves) : old.best,
  };
  return { ...save, records };
}
export function nextSeed(seed) {
  return (((Math.imul(seed, 1664525) + 1013904223) >>> 0) % 1000000) + 1;
}
