import { test } from "node:test";
import assert from "node:assert/strict";
import {
  create,
  explore,
  flag,
  chord,
  neighbors,
  expeditions,
  readSave,
  blank,
  record,
  nextSeed,
} from "../src/model.js";
for (let config = 0; config < 3; config++) {
  test(`${expeditions[config].name}: every first point and adjacent region is safe`, () => {
    for (
      let i = 0;
      i < expeditions[config].width * expeditions[config].height;
      i++
    ) {
      const initial = create(config),
        g = explore(initial, i);
      assert.equal(g.mines.filter(Boolean).length, g.total);
      assert.ok(
        [i, ...neighbors(g, i)].every((n) => !g.mines[n] && g.revealed[n]),
      );
      assert.equal(initial.mines, null);
      assert.deepEqual(explore(create(config), i), g);
      assert.equal(g.moves, 1);
    }
  });
  test(`${expeditions[config].name}: independent neighbor counts and complete win`, () => {
    let g = explore(create(config), 0);
    for (let i = 0; i < g.revealed.length; i++) {
      let expected = 0;
      for (let n = 0; n < g.revealed.length; n++)
        if (
          n !== i &&
          Math.abs((n % g.width) - (i % g.width)) <= 1 &&
          Math.abs(Math.floor(n / g.width) - Math.floor(i / g.width)) <= 1 &&
          g.mines[n]
        )
          expected++;
      assert.equal(g.counts[i], expected);
    }
    for (let i = 0; i < g.revealed.length; i++)
      if (!g.mines[i]) g = explore(g, i);
    assert.equal(g.status, "won");
    assert.deepEqual(g.flags, g.mines);
    assert.equal(
      g.revealed.filter(Boolean).length,
      g.width * g.height - g.total,
    );
    assert.equal(explore(g, 0), g);
    assert.equal(flag(g, 0), g);
    assert.equal(chord(g, 0), g);
  });
}
test("Pre-start flags block reveal, cap is enforced and unflag restores access", () => {
  let g = create();
  for (let i = 0; i < g.total; i++) g = flag(g, i);
  assert.equal(g.status, "ready");
  assert.equal(g.mines, null);
  assert.equal(flag(g, 10), g);
  assert.equal(explore(g, 0), g);
  g = flag(g, 0);
  g = explore(g, 0);
  assert.notEqual(g.mines, null);
  assert.equal(g.revealed[1], false);
  assert.equal(g.flags[1], true);
});
test("Invalid indices, already open cells and revealed flags are inert", () => {
  const g = explore(create(), 0);
  for (const i of [-1, 0.5, NaN, 999]) {
    assert.equal(explore(g, i), g);
    assert.equal(flag(g, i), g);
    assert.equal(chord(g, i), g);
  }
  assert.equal(flag(g, 0), g);
  assert.equal(explore(g, 0), g);
});
test("Correct chord opens neighbors; wrong flags cause a loss", () => {
  let base, index;
  for (let seed = 1; seed < 100 && !base; seed++) {
    const g = explore(create(1, seed), 0);
    const i = g.revealed.findIndex(
      (r, i) =>
        r &&
        g.counts[i] > 0 &&
        neighbors(g, i).filter((n) => !g.revealed[n] && !g.mines[n]).length >=
          g.counts[i] &&
        neighbors(g, i).some((n) => g.mines[n]),
    );
    if (i >= 0) {
      base = g;
      index = i;
    }
  }
  assert.ok(base);
  let correct = base;
  for (const n of neighbors(base, index))
    if (base.mines[n]) correct = flag(correct, n);
  const before = correct.revealed.filter(Boolean).length;
  const opened = chord(correct, index);
  assert.notEqual(opened.status, "lost");
  assert.ok(opened.revealed.filter(Boolean).length > before);
  assert.equal(opened.moves, correct.moves + 1);
  let wrong = base;
  const safe = neighbors(base, index).filter(
    (n) => !base.revealed[n] && !base.mines[n],
  );
  for (const n of safe.slice(0, base.counts[index])) wrong = flag(wrong, n);
  const lost = chord(wrong, index);
  assert.equal(lost.status, "lost");
  assert.ok(lost.mines[lost.exploded]);
  assert.equal(chord(base, index), base);
});
test("Direct loss, same seed repetition and new seeds", () => {
  const g = explore(create(), 0),
    mine = g.mines.indexOf(true),
    lost = explore(g, mine);
  assert.equal(lost.status, "lost");
  assert.equal(lost.exploded, mine);
  assert.equal(explore(lost, 2), lost);
  assert.deepEqual(explore(create(0, g.seed), 0).mines, g.mines);
  assert.notEqual(nextSeed(g.seed), g.seed);
  assert.notDeepEqual(explore(create(0, nextSeed(g.seed)), 0).mines, g.mines);
});
test("Saves rejected when corrupt, results immutable and best stays lowest", () => {
  for (const raw of [
    null,
    "bad",
    "{}",
    JSON.stringify({ ...blank(), records: [{ played: 0, wins: 1, best: 1 }] }),
  ])
    assert.deepEqual(readSave(raw), blank());
  const save = blank();
  let g = explore(create(), 0);
  for (let i = 0; i < g.revealed.length; i++)
    if (!g.mines[i]) g = explore(g, i);
  const recorded = record(save, g);
  assert.equal(save.records[0].played, 0);
  assert.equal(recorded.records[0].wins, 1);
  assert.deepEqual(readSave(JSON.stringify(recorded)), recorded);
  assert.equal(
    record(recorded, { ...g, moves: g.moves + 5 }).records[0].best,
    g.moves,
  );
  assert.equal(record(save, create()), save);
});
