import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";
import { AVATARES } from "../../src/lib/perfis";

let ambiente: RulesTestEnvironment;

const db = (uid?: string) =>
  (uid ? ambiente.authenticatedContext(uid) : ambiente.unauthenticatedContext()).firestore();

const perfil = (uid: string, id = "p1") => `usuarios/${uid}/perfis/${id}`;
const progresso = (uid: string, id = "p1") => `${perfil(uid, id)}/progresso/monstrinho`;
const dadosPerfil = (extra = {}) => ({ avatar: "raposa", criadoEm: serverTimestamp(), ...extra });
const dadosProgresso = (recorde: number, fase: number, extra = {}) => ({
  recorde,
  fase,
  atualizadoEm: serverTimestamp(),
  ...extra,
});

beforeAll(async () => {
  ambiente = await initializeTestEnvironment({
    projectId: "demo-mltg",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});
afterAll(() => ambiente.cleanup());
beforeEach(async () => {
  await ambiente.clearFirestore();
  await ambiente.withSecurityRulesDisabled(async (contexto) => {
    const admin = contexto.firestore();
    await setDoc(doc(admin, perfil("ana")), dadosPerfil());
    await setDoc(doc(admin, progresso("ana")), dadosProgresso(10, 2));
  });
});

describe("perfis", () => {
  test("todo avatar da interface é aceito", async () => {
    for (const { id } of AVATARES) {
      await assertSucceeds(setDoc(doc(db("ana"), perfil("ana", id)), dadosPerfil({ avatar: id })));
    }
  });
  test("dono lê e apaga", async () => {
    await assertSucceeds(getDoc(doc(db("ana"), perfil("ana"))));
    await assertSucceeds(deleteDoc(doc(db("ana"), perfil("ana"))));
  });
  test("avatar fora da lista é negado, o que impede gravar texto livre", () =>
    assertFails(setDoc(doc(db("ana"), perfil("ana", "p2")), dadosPerfil({ avatar: "Maria Silva" }))));
  test("campo extra é negado", () =>
    assertFails(setDoc(doc(db("ana"), perfil("ana", "p2")), dadosPerfil({ nome: "Maria" }))));
  test("perfil não pode ser alterado", () =>
    assertFails(updateDoc(doc(db("ana"), perfil("ana")), { avatar: "panda" })));
  test("outra conta não lê nem cria", async () => {
    await assertFails(getDoc(doc(db("bia"), perfil("ana"))));
    await assertFails(setDoc(doc(db("bia"), perfil("ana", "p2")), dadosPerfil()));
  });
  test("visitante sem conta não lê", () => assertFails(getDoc(doc(db(), perfil("ana")))));
});

describe("progresso", () => {
  test("dono cria, lê, sobe e apaga", async () => {
    await assertSucceeds(setDoc(doc(db("ana"), progresso("ana", "p2")), dadosProgresso(1, 1)));
    await assertSucceeds(getDoc(doc(db("ana"), progresso("ana"))));
    await assertSucceeds(setDoc(doc(db("ana"), progresso("ana")), dadosProgresso(20, 3)));
    await assertSucceeds(deleteDoc(doc(db("ana"), progresso("ana"))));
  });
  test("recorde e fase não baixam", async () => {
    await assertFails(setDoc(doc(db("ana"), progresso("ana")), dadosProgresso(5, 2)));
    await assertFails(setDoc(doc(db("ana"), progresso("ana")), dadosProgresso(10, 1)));
  });
  test("forma inválida é negada", async () => {
    const ref = doc(db("ana"), progresso("ana"));
    await assertFails(setDoc(ref, dadosProgresso(20, 3, { email: "x" })));
    await assertFails(setDoc(ref, dadosProgresso(1.5, 3)));
    await assertFails(setDoc(ref, { recorde: 20, fase: 3 }));
  });
  test("outra conta e visitante não acessam", async () => {
    await assertFails(getDoc(doc(db("bia"), progresso("ana"))));
    await assertFails(setDoc(doc(db("bia"), progresso("ana")), dadosProgresso(99, 9)));
    await assertFails(getDoc(doc(db(), progresso("ana"))));
  });
});

test("qualquer outro caminho é negado", async () => {
  await assertFails(getDoc(doc(db("ana"), "usuarios/ana")));
  await assertFails(setDoc(doc(db("ana"), "cadastros/x"), { nome: "x" }));
});
