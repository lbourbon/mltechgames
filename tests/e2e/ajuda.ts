import type { Page } from "@playwright/test";

const FIRESTORE = "http://127.0.0.1:8099";
const AUTH = "http://127.0.0.1:9099";
const owner = { authorization: "Bearer owner" };

export async function limparEmuladores() {
  await fetch(`${FIRESTORE}/emulator/v1/projects/demo-mltg/databases/(default)/documents`, { method: "DELETE" });
  await fetch(`${AUTH}/emulator/v1/projects/demo-mltg/accounts`, { method: "DELETE", headers: owner });
}

export const progressoLocal = (page: Page, jogo = "monstrinho") =>
  page.evaluate((id) => JSON.parse(localStorage.getItem(`mltg:progresso:${id}`) ?? "null"), jogo);

export const semearProgresso = (page: Page, recorde: number, fase: number) =>
  page.evaluate(
    ([r, f]) => localStorage.setItem("mltg:progresso:monstrinho", JSON.stringify({ recorde: r, fase: f })),
    [recorde, fase],
  );

export const uidAtual = async () => {
  const resposta = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/demo-mltg/accounts:query`, {
    method: "POST",
    headers: { ...owner, "content-type": "application/json" },
    body: "{}",
  });
  const { userInfo } = await resposta.json();
  return (userInfo ?? []) as { localId: string; email?: string }[];
};

export async function perfisRemotos(uid: string) {
  const url = `${FIRESTORE}/v1/projects/demo-mltg/databases/(default)/documents/usuarios/${uid}/perfis`;
  const { documents = [] } = await (await fetch(url, { headers: owner })).json();
  return documents as { name: string; fields: Record<string, { stringValue?: string }> }[];
}

export async function progressoRemoto(perfilNome: string) {
  const url = `${FIRESTORE}/v1/${perfilNome}/progresso/monstrinho`;
  const resposta = await fetch(url, { headers: owner });
  if (!resposta.ok) return null;
  const { fields } = await resposta.json();
  return { campos: Object.keys(fields).sort(), recorde: Number(fields.recorde.integerValue), fase: Number(fields.fase.integerValue) };
}

// Conduz o popup real do Google simulado pelo emulador de Auth.
export async function entrarComGoogle(page: Page, disparar: () => Promise<void>) {
  const [popup] = await Promise.all([page.waitForEvent("popup"), disparar()]);
  await popup.waitForLoadState();
  const novaConta = popup.getByRole("button", { name: /add new account/i });
  await novaConta.waitFor();
  await popup.waitForLoadState("networkidle");
  // O botão de nova conta sempre aparece: uma conta existente é a linha com e-mail.
  const existente = popup.locator(".mdc-list-item").filter({ hasText: "@" }).first();
  if (await existente.isVisible()) {
    await existente.click();
  } else {
    await novaConta.click();
    await popup.getByRole("button", { name: /auto-generate/i }).click();
    await popup.getByRole("button", { name: /sign in with google/i }).click();
  }
  await popup.waitForEvent("close");
}
