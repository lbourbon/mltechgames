import { expect, test, type Page } from "@playwright/test";
import { progressoLocal } from "./ajuda";

const pronto = (page: Page) => expect(page.locator("#poste")).toHaveAttribute("data-pronto", "1", { timeout: 15_000 });

async function abrirNaFase(page: Page, fase: number) {
  await page.addInitScript((f) => localStorage.setItem("mltg:progresso:passarinhos", JSON.stringify({ recorde: 0, fase: f })), fase);
  await page.goto("/jogos/passarinhos/");
  await page.getByRole("button", { name: `Continuar da fase ${fase}` }).click();
}

// Os lugares vêm coluna por coluna, do fio mais fino ao mais grosso.
const lugares = (page: Page) =>
  page.evaluate(() => {
    const colunas = Number(getComputedStyle(document.getElementById("pauta")!).getPropertyValue("--colunas"));
    const todos = document.querySelectorAll(".lugar").length;
    return { colunas, linhas: todos / colunas };
  });

const lugar = (page: Page, linhas: number, coluna: number, linha: number) => page.locator(".lugar").nth(coluna * linhas + linha);

const colunasConfusas = (page: Page, linhas: number) =>
  page.evaluate((l) => {
    const todos = [...document.querySelectorAll(".lugar")];
    return todos.flatMap((el, i) => (el.classList.contains("confuso") ? [Math.floor(i / l)] : []));
  }, linhas);

test("o primeiro passarinho vem pousado, e só dá para cantar com todas as colunas cheias", async ({ page }) => {
  await page.goto("/jogos/passarinhos/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await pronto(page);
  await expect(page.locator(".lugar.ocupado")).toHaveCount(1);
  await expect(page.locator(".lugar.referencia")).toHaveCount(1);
  await expect(page.locator("#cantar")).toBeDisabled();

  const { colunas, linhas } = await lugares(page);
  for (let coluna = 1; coluna < colunas; coluna++) await lugar(page, linhas, coluna, 0).click();
  await expect(page.locator(".lugar.ocupado")).toHaveCount(colunas);
  await expect(page.locator("#cantar")).toBeEnabled();

  // Tocar no mesmo fio não espanta o passarinho: ele só canta de novo.
  await lugar(page, linhas, 1, 0).click();
  await expect(page.locator(".lugar.ocupado")).toHaveCount(colunas);
});

test("cantar errado marca quem desafinou, e corrigir vence a fase", async ({ page }) => {
  await page.goto("/jogos/passarinhos/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await pronto(page);
  await page.locator("#ouvir").click();
  await pronto(page);

  const { colunas, linhas } = await lugares(page);
  const tentativa = Array(colunas).fill(0);
  for (let coluna = 1; coluna < colunas; coluna++) await lugar(page, linhas, coluna, 0).click();

  const fim = page.getByRole("heading", { name: "Fase 1 completa!" });
  for (let vez = 0; vez < linhas + 1 && !(await fim.isVisible()); vez++) {
    await page.locator("#cantar").click();
    await expect(page.locator("#poste[data-pronto='1'], #painel:not([hidden])").first()).toBeAttached({ timeout: 15_000 });
    if (await page.locator("#painel").isVisible()) break;
    await expect(page.locator(".lugar.confuso")).not.toHaveCount(0);
    // A fase 1 é mansa: errar não custa coração.
    await expect(page.locator("#vidas")).toHaveAttribute("aria-label", "3 vidas");
    for (const coluna of await colunasConfusas(page, linhas)) await lugar(page, linhas, coluna, ++tentativa[coluna] % linhas).click();
  }
  await expect(fim).toBeVisible({ timeout: 15_000 });
  expect((await progressoLocal(page, "passarinhos")).fase).toBe(2);
});

test("com o som desligado, ouvir pede para ligar", async ({ page }) => {
  await page.goto("/jogos/passarinhos/");
  await page.getByRole("button", { name: "Som" }).click();
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await pronto(page);
  await page.locator("#ouvir").click();
  await expect(page.locator("#fala")).toContainText("Ligue o som");
});

test("a fase com pausa explica e ganha o chão", async ({ page }) => {
  await abrirNaFase(page, 5);
  await expect(page.locator("#painel")).toContainText("Pausa!");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await pronto(page);
  const { colunas } = await lugares(page);
  await expect(page.locator(".lugar.chao")).toHaveCount(colunas);
});
