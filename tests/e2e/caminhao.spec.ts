import { expect, test, type Page } from "@playwright/test";
import { ESTADOS, type Sigla } from "../../src/jogos/caminhao/estados";
import { progressoLocal } from "./ajuda";

const pronta = (page: Page) => expect(page.locator("#estrada")).toHaveAttribute("data-pronta", "1", { timeout: 15_000 });

async function abrirNaFase(page: Page, fase: number) {
  await page.addInitScript((f) => localStorage.setItem("mltg:progresso:caminhao", JSON.stringify({ recorde: 0, fase: f })), fase);
  await page.goto("/jogos/caminhao/");
  await page.getByRole("button", { name: `Continuar da fase ${fase}` }).click();
}

function caminho(de: Sigla, para: Sigla) {
  const veio = new Map<Sigla, Sigla | null>([[de, null]]);
  const fila = [de];
  while (fila.length > 0) {
    const atual = fila.shift()!;
    for (const vizinho of ESTADOS[atual].vizinhos) {
      if (veio.has(vizinho)) continue;
      veio.set(vizinho, atual);
      fila.push(vizinho);
    }
  }
  const rota: Sigla[] = [];
  for (let atual = para; atual !== de; atual = veio.get(atual)!) rota.unshift(atual);
  return rota;
}

const posicao = async (page: Page) => (await page.locator("#estrada").getAttribute("data-posicao")) as Sigla;

// Toca no centro do estado, como um dedo no mapa.
async function tocar(page: Page, sigla: Sigla) {
  const caixa = (await page.locator("#mapa").boundingBox())!;
  const [minX, minY, largura, altura] = (await page.locator("#estrada").getAttribute("data-caixa"))!.split(" ").map(Number);
  const [x, y] = ESTADOS[sigla].centro;
  await page.mouse.click(caixa.x + ((x - minX) / largura) * caixa.width, caixa.y + ((y - minY) / altura) * caixa.height);
}

test("leva a carga pelo caminho mais curto, e a fase fica salva", async ({ page }) => {
  await page.goto("/jogos/caminhao/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await pronta(page);
  // Na fase 1 o pedido mostra as siglas.
  const [, destino] = [...(await page.locator(".pedido").first().textContent())!.matchAll(/\(([A-Z]{2})\)/g)].map((m) => m[1] as Sigla);
  const rota = caminho(await posicao(page), destino);
  const tanque = Number(await page.locator("#combustivel").textContent());

  for (const sigla of rota.slice(0, -1)) {
    await tocar(page, sigla);
    await pronta(page);
    expect(await posicao(page)).toBe(sigla);
  }
  await expect(page.locator("#combustivel")).toHaveText(String(tanque - rota.length + 1));
  await expect(page.locator(".uf.visitado")).toHaveCount(rota.length);
  await tocar(page, rota.at(-1)!);

  await expect(page.getByRole("heading", { name: "Fase 1 completa!" })).toBeVisible({ timeout: 15_000 });
  expect((await progressoLocal(page, "caminhao")).fase).toBe(2);
});

test("um estado sem fronteira não deixa andar nem gasta combustível", async ({ page }) => {
  await page.goto("/jogos/caminhao/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await pronta(page);
  const aqui = await posicao(page);
  const tanque = await page.locator("#combustivel").textContent();
  // O estado mais distante de onde o caminhão está.
  const longe = (Object.keys(ESTADOS) as Sigla[]).sort((a, b) => caminho(aqui, b).length - caminho(aqui, a).length)[0];

  await tocar(page, longe);
  await expect(page.locator("#fala")).toContainText("não faz fronteira");
  expect(await posicao(page)).toBe(aqui);
  await expect(page.locator("#combustivel")).toHaveText(tanque!);
});

test("ficar sem combustível custa um coração, recomeça a viagem e libera a dica", async ({ page }) => {
  await abrirNaFase(page, 4);
  await expect(page.locator("#painel")).toContainText("Sem marcas");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await pronta(page);
  const inicio = await posicao(page);
  await expect(page.locator(".marca")).toHaveCount(0);
  await expect(page.locator("#dica")).toBeHidden();

  // Vai e volta entre dois vizinhos até o tanque não dar mais.
  const vizinho = ESTADOS[inicio].vizinhos[0];
  const seco = page.getByRole("heading", { name: "Acabou o combustível!" });
  for (let passo = 0; passo < 30 && !(await seco.isVisible()); passo++) {
    await tocar(page, passo % 2 === 0 ? vizinho : inicio);
    await expect(page.locator("#estrada[data-pronta='1'], #painel:not([hidden])").first()).toBeAttached();
  }
  await expect(seco).toBeVisible();
  await expect(page.locator("#vidas")).toHaveAttribute("aria-label", "2 vidas");

  await page.getByRole("button", { name: "Tentar de novo" }).click();
  await pronta(page);
  expect(await posicao(page)).toBe(inicio);
  await page.locator("#dica").click();
  await expect(page.locator(".marca")).not.toHaveCount(0);
  await expect(page.locator("#dica")).toBeHidden();
});
