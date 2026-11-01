import assert from "node:assert/strict";
import { test } from "node:test";
import { mesclar } from "../public/js/progresso.js";

test("sem dados, parte do recorde zero na fase 1", () => {
  assert.deepEqual(mesclar(), { recorde: 0, fase: 1 });
});

test("mantém o maior valor de cada campo", () => {
  assert.deepEqual(mesclar({ recorde: 50, fase: 2 }, { recorde: 30, fase: 4 }), { recorde: 50, fase: 4 });
});

test("ignora campos extras do documento remoto", () => {
  assert.deepEqual(mesclar({ recorde: 1, fase: 1 }, { recorde: 2, fase: 1, atualizadoEm: "x" }), { recorde: 2, fase: 1 });
});
