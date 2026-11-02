import { expect, test, type Page } from "@playwright/test";
import { bichosDentro, resolverSemChute, type Mapa, type Retangulo } from "../../src/jogos/cerca/logica";
import { progressoLocal } from "./ajuda";

const pronto = (page: Page) => expect(page.locator("#campo")).toHaveAttribute("data-pronto", "1", { timeout: 15_000 });

// A fase é lida da tela, igual à criança: plaquinhas e posições, sem acesso à solução.
async function lerMapa(page: Page): Promise<Mapa> {
  return page.evaluate(() => {
    const pasto = document.getElementById("pasto")!;
    const numero = (el: HTMLElement, nome: string) => Number(el.style.getPropertyValue(nome));
    return {
      colunas: numero(pasto, "--colunas"),
      linhas: numero(pasto, "--linhas"),
      bichos: [...document.querySelectorAll<HTMLElement>(".bicho")].map((bicho) => ({
        x: numero(bicho, "--x"),
        y: numero(bicho, "--y"),
        area: Number(bicho.querySelector(".plaquinha")!.textContent),
      })),
      solucao: [],
    };
  });
}

async function centroDaCasa(page: Page, x: number, y: number) {
  const caixa = (await page.locator("#pasto").boundingBox())!;
  const { colunas, linhas } = await lerMapa(page);
  return { x: caixa.x + ((x + 0.5) / colunas) * caixa.width, y: caixa.y + ((y + 0.5) / linhas) * caixa.height };
}

async function esticar(page: Page, { x, y, largura, altura }: Retangulo) {
  const de = await centroDaCasa(page, x, y);
  const ate = await centroDaCasa(page, x + largura - 1, y + altura - 1);
  await page.mouse.move(de.x, de.y);
  await page.mouse.down();
  await page.mouse.move(ate.x, ate.y, { steps: 5 });
}

async function cercarNaTela(page: Page, retangulo: Retangulo) {
  await esticar(page, retangulo);
  await page.mouse.up();
}

async function tocarCasa(page: Page, x: number, y: number) {
  const { x: px, y: py } = await centroDaCasa(page, x, y);
  await page.mouse.click(px, py);
}

async function abrirNaFase(page: Page, fase: number) {
  await page.addInitScript((f) => localStorage.setItem("mltg:progresso:cerca", JSON.stringify({ recorde: 0, fase: f })), fase);
  await page.goto("/jogos/cerca/");
  await page.getByRole("button", { name: `Continuar da fase ${fase}` }).click();
  await pronto(page);
}

// Um retângulo de tamanho errado com só um bicho dentro, para errar de propósito.
function cercaErrada(mapa: Mapa): Retangulo {
  for (let x = 0; x < mapa.colunas; x++) {
    for (let y = 0; y < mapa.linhas; y++) {
      for (let largura = 1; x + largura <= mapa.colunas; largura++) {
        for (let altura = 1; y + altura <= mapa.linhas; altura++) {
          const cerca = { x, y, largura, altura };
          const dentro = bichosDentro(mapa, cerca);
          const errada = dentro.length === 1 && largura * altura !== mapa.bichos[dentro[0]].area;
          if (errada && largura * altura > 1) return cerca;
        }
      }
    }
  }
  throw new Error("nenhuma cerca errada coube");
}

test("cerca todos os bichos, o pasto fecha e a fase fica salva", async ({ page }) => {
  await page.goto("/jogos/cerca/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await pronto(page);

  const mapa = await lerMapa(page);
  for (const cerca of resolverSemChute(mapa)!) await cercarNaTela(page, cerca);

  await expect(page.getByRole("heading", { name: "Fase 1 completa!" })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#painel")).toContainText("Nenhuma cerca caiu");
  expect((await progressoLocal(page, "cerca")).fase).toBe(2);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.locator(".placa")).toContainText("Fase 2");
  await expect(page.locator(".cerca")).toHaveCount(0);
});

test("o arraste mostra os lados, nunca o total", async ({ page }) => {
  await abrirNaFase(page, 3);
  await esticar(page, { x: 0, y: 0, largura: 3, altura: 2 });
  await expect(page.locator("#medidas")).toHaveText("3 × 2");
  await expect(page.locator("#previa")).toBeVisible();
  await page.mouse.up();
  await expect(page.locator("#previa")).toBeHidden();
});

test("tamanho errado derruba a cerca, custa um coração e libera a dica", async ({ page }) => {
  await abrirNaFase(page, 3);
  await expect(page.locator("#dica")).toBeHidden();
  await cercarNaTela(page, cercaErrada(await lerMapa(page)));

  await expect(page.locator("#fala")).toContainText("a plaquinha pede");
  await expect(page.locator("#vidas")).toHaveAttribute("aria-label", "2 vidas");
  await expect(page.locator(".cerca")).toHaveCount(0);
  await expect(page.locator("#dica")).toBeVisible();
  await pronto(page);
});

test("nas primeiras fases o tamanho errado não custa coração", async ({ page }) => {
  await page.goto("/jogos/cerca/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await pronto(page);
  await cercarNaTela(page, cercaErrada(await lerMapa(page)));
  await expect(page.locator("#fala")).toContainText("a plaquinha pede");
  await pronto(page);
  await expect(page.locator("#vidas")).toHaveAttribute("aria-label", "3 vidas");
});

test("arrastar por um pedaço sem bicho não custa nada, e tocar na cerca abre", async ({ page }) => {
  await abrirNaFase(page, 3);
  const mapa = await lerMapa(page);
  const [primeira] = resolverSemChute(mapa)!;
  await cercarNaTela(page, primeira);
  await expect(page.locator(".cerca")).toHaveCount(1);

  await tocarCasa(page, primeira.x, primeira.y);
  await expect(page.locator(".cerca")).toHaveCount(0);
  await expect(page.locator("#vidas")).toHaveAttribute("aria-label", "3 vidas");
});

test("com dicas chega ao fim da fase, sem bônus", async ({ page }) => {
  await abrirNaFase(page, 3);
  await cercarNaTela(page, cercaErrada(await lerMapa(page)));
  await pronto(page);
  const fimDaFase = page.getByRole("heading", { name: "Fase 3 completa!" });
  await expect(async () => {
    const dica = page.locator("#dica:not([disabled])");
    if (await dica.isVisible()) await dica.click();
    await expect(fimDaFase).toBeVisible({ timeout: 100 });
  }).toPass({ timeout: 20_000, intervals: [100] });
  await expect(page.locator("#painel")).toContainText("+30 pontos");
});

test("três cercas erradas terminam a partida", async ({ page }) => {
  await abrirNaFase(page, 3);
  const errada = cercaErrada(await lerMapa(page));
  for (let i = 0; i < 2; i++) {
    await cercarNaTela(page, errada);
    await pronto(page);
    await expect(page.locator(".cerca")).toHaveCount(0);
  }
  await cercarNaTela(page, errada);
  await expect(page.getByRole("button", { name: "Jogar de novo" })).toBeVisible();
  await expect(page.locator("#painel")).toContainText("os bichos fugiram");
});

test("dá para cercar só com o teclado", async ({ page }) => {
  await abrirNaFase(page, 3);
  const [cerca] = resolverSemChute(await lerMapa(page))!;
  const apertar = async (tecla: string, vezes: number) => {
    for (let i = 0; i < vezes; i++) await page.keyboard.press(tecla);
  };
  await page.locator("#pasto").focus();
  await apertar("ArrowRight", cerca.x);
  await apertar("ArrowDown", cerca.y);
  await page.keyboard.press("Enter");
  await apertar("ArrowRight", cerca.largura - 1);
  await apertar("ArrowDown", cerca.altura - 1);
  await page.keyboard.press("Enter");
  await expect(page.locator(".cerca")).toHaveCount(1);
});
