import { expect, test, type Page } from "@playwright/test";
import { progressoLocal } from "./ajuda";

async function tocarBolha(page: Page, escolher: string) {
  const posicao = await page.evaluate((corpo) => {
    const alvo = Number(document.getElementById("alvo")!.textContent);
    const comeu = Number(document.getElementById("comeu")!.textContent);
    const bolhas = [...document.querySelectorAll<HTMLElement>(".bolha")].filter(
      (el) => el.getBoundingClientRect().top > document.getElementById("ceu")!.getBoundingClientRect().top,
    );
    const bolha = new Function("bolhas", "restante", corpo)(bolhas, alvo - comeu) as HTMLElement | undefined;
    if (!bolha) return null;
    const caixa = bolha.getBoundingClientRect();
    return { x: caixa.x + caixa.width / 2, y: caixa.y + caixa.height / 2 };
  }, escolher);
  if (posicao) await page.mouse.click(posicao.x, posicao.y);
}

const ACERTAR = `return bolhas.find((b) => Number(b.textContent) <= restante)`;
const ERRAR = `return bolhas.find((b) => Number(b.textContent) > restante) ?? bolhas.find((b) => Number(b.textContent) < restante)`;

test("catálogo vem no HTML estático, sem depender de JS", async ({ request }) => {
  const html = await (await request.get("/")).text();
  expect(html).toContain("Monstrinho Guloso");
  expect(html).toContain('id="botao-conta"');
});

test("quem joga sem conta não baixa o Firebase nem fala com o Google", async ({ page }) => {
  const externos: string[] = [];
  const js: string[] = [];
  page.on("request", (requisicao) => {
    const url = requisicao.url();
    if (!url.startsWith("http://127.0.0.1:4329")) externos.push(url);
    if (url.endsWith(".js")) js.push(url);
  });
  await page.goto("/");
  await page.goto("/jogos/monstrinho/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await page.waitForTimeout(1500);
  expect(externos).toEqual([]);
  const tamanhos = await Promise.all(js.map((url) => page.request.get(url).then((r) => r.body()).then((b) => b.length)));
  expect(Math.max(...tamanhos)).toBeLessThan(100_000);
});

test("doação mostra QR Code e copia o PIX", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("banner").getByRole("button", { name: "Doar" }).click();
  const qr = page.getByAltText("QR Code PIX para doação");
  await expect(qr).toBeVisible();
  expect(await qr.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Copiar código" }).click();
  await expect(page.getByText("Código copiado")).toBeVisible();
  const copiado = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiado).toBe(await page.locator("#codigo-pix").inputValue());
  expect(copiado).toMatch(/^000201/);
});

test("joga, sobe de fase, perde tudo e continua de onde parou", async ({ page }) => {
  await page.goto("/jogos/monstrinho/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();

  const painel = page.locator("#painel");
  await expect(async () => {
    await tocarBolha(page, ACERTAR);
    expect(await painel.isVisible()).toBe(true);
  }).toPass({ timeout: 90_000, intervals: [120] });
  await expect(painel).toContainText("Fase 1 completa");
  expect((await progressoLocal(page)).fase).toBe(2);

  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(async () => {
    if (await page.getByRole("button", { name: "Continuar" }).isVisible()) {
      await page.getByRole("button", { name: "Continuar" }).click();
    }
    await tocarBolha(page, ERRAR);
    expect(await page.getByRole("button", { name: "Jogar de novo" }).isVisible()).toBe(true);
  }).toPass({ timeout: 90_000, intervals: [120] });
  await expect(page.getByRole("button", { name: "Chamar um adulto" })).toBeVisible();

  await page.goto("/jogos/monstrinho/");
  await expect(page.getByRole("button", { name: /Continuar da fase/ })).toBeVisible();
  await page.goto("/");
  await expect(page.locator(".cartao-recorde")).toContainText("Seu recorde");
});

test("página inexistente responde em português", async ({ page }) => {
  await page.goto("/nao-existe");
  await expect(page.getByRole("heading", { name: "Ops, essa página sumiu!" })).toBeVisible();
});

test("responsável apaga o progresso do aparelho", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("mltg:progresso:monstrinho", '{"recorde":5,"fase":2}'));
  await page.goto("/responsaveis/");
  await page.getByRole("button", { name: "Apagar progresso deste aparelho" }).click();
  await expect(page.getByText("foi apagado")).toBeVisible();
  expect(await progressoLocal(page)).toBeNull();
});
