import { expect, test, type Page } from "@playwright/test";
import { deCimaParaBaixo, ESPECIES, QUANTOS, resolver, vazio, type Carta, type Especie, type Fase } from "../../src/jogos/pantanal/logica";
import { progressoLocal } from "./ajuda";

const pronto = (page: Page) => expect(page.locator(".carta").first()).toBeEnabled({ timeout: 20_000 });

// A fase é lida da tela, igual à criança: o calendário, os bichos, o alvo e as cartas.
async function lerFase(page: Page): Promise<Fase> {
  const lido = await page.evaluate(() => {
    const meses = [...document.querySelectorAll<HTMLElement>(".mes")].map((mes) => Number(mes.dataset.mes));
    const contas = Object.fromEntries(
      [...document.querySelectorAll<HTMLElement>(".zona")].map((zona) => [zona.dataset.especie, Number(zona.querySelector(".conta")?.textContent ?? 0)]),
    );
    const metas = Object.fromEntries(
      [...document.querySelectorAll<HTMLElement>(".meta")].map((meta) => [meta.dataset.especie, Number(meta.textContent)]),
    );
    const cartas = [...document.querySelectorAll<HTMLElement>(".carta")].map((carta) => ({
      especie: carta.dataset.especie!,
      vezes: Number(carta.querySelector(".carta-vezes")?.textContent?.slice(1) ?? 1),
    }));
    return { meses, contas, metas, cartas };
  });
  const comeco = vazio();
  for (const especie of ESPECIES) comeco[especie] = lido.contas[especie] ?? 0;
  const mao: Carta[] = lido.cartas.flatMap(({ especie, vezes }) =>
    Array.from({ length: vezes }, () => ({ especie: especie as Especie, quantos: QUANTOS[especie as Especie] })),
  );
  return { inicio: lido.meses[0], meses: lido.meses.length, metas: lido.metas, comeco, mao };
}

test("uma carta faz o mês passar: ela sai da mão e o calendário anda", async ({ page }) => {
  await page.goto("/jogos/pantanal/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await pronto(page);
  const antes = (await lerFase(page)).mao.length;
  await expect(page.locator(".mes").nth(0)).toHaveClass(/atual/);
  await page.locator(".carta").first().click();
  await pronto(page);
  await expect(page.locator(".mes").nth(0)).toHaveClass(/passado/);
  await expect(page.locator(".mes").nth(1)).toHaveClass(/atual/);
  const depois = await page.evaluate(() =>
    [...document.querySelectorAll(".carta")].reduce((soma, carta) => soma + Number(carta.querySelector(".carta-vezes")?.textContent?.slice(1) ?? 1), 0),
  );
  expect(depois).toBe(antes - 1);
});

test("quem come quem abre por cima do jogo e volta para o mesmo mês", async ({ page }) => {
  await page.goto("/jogos/pantanal/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await pronto(page);
  await page.getByRole("button", { name: "Quem come quem?" }).click();
  await expect(page.locator("#painel")).toContainText("Come 1 capim por mês");
  await page.getByRole("button", { name: "Voltar ao Pantanal" }).click();
  await expect(page.locator("#painel")).toBeHidden();
  await expect(page.locator(".mes").nth(0)).toHaveClass(/atual/);
  await pronto(page);
});

test("prevendo os meses, o ano fecha e a fase fica salva", async ({ page }) => {
  await page.goto("/jogos/pantanal/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await pronto(page);
  const ordem = resolver(await lerFase(page))!;
  for (const [i, carta] of ordem.entries()) {
    await page.locator(`.carta[data-especie="${carta.especie}"]`).click();
    if (i < ordem.length - 1) await pronto(page);
  }
  await expect(page.locator("#painel")).toContainText("Fase 1 completa", { timeout: 30_000 });
  expect((await progressoLocal(page, "pantanal")).fase).toBe(2);
});

test("um ano perdido custa coração depois das fases mansas e deixa o gráfico e a dica", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("mltg:progresso:pantanal", JSON.stringify({ recorde: 0, fase: 3 })));
  await page.goto("/jogos/pantanal/");
  await page.getByRole("button", { name: "Continuar da fase 3" }).click();
  await page.locator("#painel [data-acao=seguir]").click();
  await pronto(page);
  // Caçador primeiro e comida por último: o verificador garante que essa ordem não fecha o ano.
  const ordem = deCimaParaBaixo((await lerFase(page)).mao);
  for (const carta of ordem) {
    await page.locator(`.carta[data-especie="${carta.especie}"]`).click();
    const seguiu = () =>
      page.evaluate(() => !document.getElementById("painel")!.hidden || !document.querySelector<HTMLButtonElement>(".carta")?.disabled);
    await expect.poll(seguiu, { timeout: 20_000 }).toBe(true);
    if (await page.locator("#painel").isVisible()) break;
  }
  await expect(page.locator("#painel")).toContainText("O ano não fechou", { timeout: 20_000 });
  await expect(page.locator("#vidas")).toHaveAttribute("aria-label", "2 vidas");
  await page.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(page.locator(".linha-anterior").first()).toBeAttached();
  await expect(page.getByRole("button", { name: "Dica" })).toBeVisible();
  await expect(page.locator(".mes").nth(0)).toHaveClass(/atual/);
});
