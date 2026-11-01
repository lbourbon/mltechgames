import { expect, test, type Page } from "@playwright/test";
import {
  entrarComGoogle,
  limparEmuladores,
  perfisRemotos,
  progressoLocal,
  progressoRemoto,
  semearProgresso,
  uidAtual,
} from "./ajuda";

const JOGO = "/jogos/monstrinho/";
const janelaPerfis = (page: Page) => page.locator("#janela-perfis");

async function entrar(page: Page) {
  await page.getByRole("banner").getByRole("button", { name: "Entrar" }).click();
  const botao = page.getByRole("button", { name: "Entrar com Google" });
  await expect(botao).toBeEnabled();
  await entrarComGoogle(page, () => botao.click());
}


test.beforeEach(limparEmuladores);

test("conta do adulto com perfis: migra, separa, restaura e apaga", async ({ page }) => {
  await page.goto(JOGO);
  await semearProgresso(page, 60, 2);
  await page.reload();

  // Primeiro login: sem perfis, pede um e leva o progresso anônimo para ele.
  await entrar(page);
  await expect(janelaPerfis(page)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Crie o perfil da criança" })).toBeVisible();
  await page.getByRole("button", { name: "Raposa" }).click();
  await expect(page.locator("#botao-conta")).toHaveText("🦊");

  const [{ localId: uid }] = await uidAtual();
  await expect.poll(async () => (await perfisRemotos(uid)).length).toBe(1);
  const [raposa] = await perfisRemotos(uid);
  expect(Object.keys(raposa.fields).sort()).toEqual(["avatar", "criadoEm"]);
  await expect.poll(() => progressoRemoto(raposa.name)).toEqual({
    campos: ["atualizadoEm", "fase", "recorde"],
    recorde: 60,
    fase: 2,
  });

  // Recarregar mantém a sessão e o perfil.
  await page.reload();
  await expect(page.locator("#botao-conta")).toHaveText("🦊");
  await expect(page.getByRole("button", { name: "Continuar da fase 2" })).toBeVisible();

  // Segundo perfil começa zerado: o progresso da raposa não vaza.
  await page.locator("#botao-conta").click();
  await page.getByRole("button", { name: "Panda" }).click();
  await expect(page.locator("#botao-conta")).toHaveText("🐼");
  await expect.poll(() => progressoLocal(page)).toBeNull();
  await expect(page.getByRole("button", { name: "Jogar", exact: true })).toBeVisible();

  await page.locator("#botao-conta").click();
  await page.locator("#lista-perfis").getByRole("button", { name: "Raposa" }).click();
  await expect(page.getByRole("button", { name: "Continuar da fase 2" })).toBeVisible();

  // Sair limpa o aparelho e não deixa marca de sessão.
  await page.locator("#botao-conta").click();
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(page.locator("#botao-conta")).toHaveText("Entrar");
  expect(await progressoLocal(page)).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("mltg:sessao"))).toBeNull();

  // Novo login com dois perfis pergunta quem joga e restaura da nuvem, mesclando com o aparelho.
  await semearProgresso(page, 500, 1);
  await entrar(page);
  await expect(page.getByRole("heading", { name: "Quem está jogando?" })).toBeVisible();
  await page.locator("#lista-perfis").getByRole("button", { name: "Raposa" }).click();
  await expect.poll(() => progressoRemoto(raposa.name)).toMatchObject({ recorde: 500, fase: 2 });
  await expect.poll(() => progressoLocal(page)).toEqual({ recorde: 500, fase: 2 });

  // Apagar um perfil remove o progresso dele na nuvem.
  await page.goto("/responsaveis/");
  page.on("dialog", (dialogo) => dialogo.accept());
  const linhas = page.locator(".conta-perfil");
  await expect(linhas).toHaveCount(2);
  await linhas.filter({ hasText: "Raposa" }).getByRole("button", { name: "Apagar perfil" }).click();
  await expect(linhas).toHaveCount(1);
  expect(await progressoRemoto(raposa.name)).toBeNull();
  expect(await progressoLocal(page)).toBeNull();

  // Excluir a conta remove perfis e o usuário, e o aparelho volta a anônimo.
  await page.getByRole("button", { name: "Excluir conta e todos os dados" }).click();
  await entrarComGoogle(page, () => page.getByRole("button", { name: "Sim, excluir tudo" }).click());
  await expect(page.locator("#botao-conta")).toHaveText("Entrar");
  await expect.poll(async () => (await perfisRemotos(uid)).length).toBe(0);
  await expect.poll(async () => (await uidAtual()).length).toBe(0);
});
