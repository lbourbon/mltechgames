import { expect, test, type Page } from "@playwright/test";
import { progressoLocal } from "./ajuda";

const pronta = (page: Page) => expect(page.locator("#ceu")).toHaveAttribute("data-pronta", "1", { timeout: 15_000 });

async function abrirNaFase(page: Page, fase: number) {
  await page.addInitScript((f) => localStorage.setItem("mltg:progresso:aviao", JSON.stringify({ recorde: 0, fase: f })), fase);
  await page.goto("/jogos/aviao/");
  await page.getByRole("button", { name: `Continuar da fase ${fase}` }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await pronta(page);
}

// Toca num ponto de dentro do país da carta, ou bem longe dele, como um dedo no mapa.
async function tocarNoDestino(page: Page, longe = false) {
  const [x, y] = await page.evaluate((longe) => {
    const mapa = document.querySelector<SVGSVGElement>("#mapa")!;
    const alvo = document.querySelector<HTMLElement>("#ceu")!.dataset.alvo;
    const el = document.querySelector<SVGPathElement>(`.regiao.ativa .pais[data-pais="${alvo}"]`)!;
    const caixa = el.getBBox();
    let ponto = new DOMPoint(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
    if (longe) {
      const [, , largura, altura] = mapa.getAttribute("viewBox")!.split(" ").map(Number);
      ponto = new DOMPoint(ponto.x > largura / 2 ? 5 : largura - 5, ponto.y > altura / 2 ? 5 : altura - 5);
    } else {
      for (let k = 0; k < 5000 && !el.isPointInFill(ponto); k++) {
        ponto = new DOMPoint(caixa.x + (k % 70) / 70 * caixa.width, caixa.y + Math.floor(k / 70) / 70 * caixa.height);
      }
    }
    const tela = ponto.matrixTransform(mapa.getScreenCTM()!);
    return [tela.x, tela.y];
  }, longe);
  await page.mouse.click(x, y);
}

test("tocar dentro de cada país entrega na mosca, e a fase fica salva", async ({ page }) => {
  await page.goto("/jogos/aviao/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await pronta(page);
  // Na fase 1 os nomes estão no mapa.
  await expect(page.locator(".rotulo.visivel").first()).toBeVisible();

  for (let carta = 1; carta <= 5; carta++) {
    await expect(page.locator("#contador")).toContainText(`${carta} de 5`);
    await tocarNoDestino(page);
    if (carta < 5) await pronta(page);
  }
  await expect(page.getByRole("heading", { name: "Fase 1 completa!" })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#painel")).toContainText("+50 pontos");
  await expect(page.locator(".passaporte li")).toHaveCount(5);
  expect((await progressoLocal(page, "aviao")).fase).toBe(2);
});

test("pousar longe custa um coração, mostra o país certo e conta os quilômetros", async ({ page }) => {
  await abrirNaFase(page, 4);
  const alvo = await page.locator("#ceu").getAttribute("data-alvo");
  await tocarNoDestino(page, true);
  await expect(page.locator("#fala")).toContainText(/Longe! .* fica a uns [\d.]+ km daqui\./);
  await expect(page.locator("#vidas")).toHaveAttribute("aria-label", "2 vidas");
  await pronta(page);
  // O país certo ficou com a bandeira no mapa, e a próxima carta já veio.
  await expect(page.locator(`#bandeiras .carimbo[data-pais="${alvo}"]`)).toHaveCount(1);
  await expect(page.locator("#contador")).toContainText("2 de 5");
});

test("na fase das bandeiras, a carta só mostra a bandeira", async ({ page }) => {
  await abrirNaFase(page, 9);
  const alvo = await page.locator("#ceu").getAttribute("data-alvo");
  await expect(page.locator("#pedido img")).toHaveAttribute("src", `/img/bandeiras/${alvo}.svg`);
  await expect(page.locator("#pedido")).toHaveText("Carta para");
  await expect(page.locator(".rotulo.visivel")).toHaveCount(0);
});
