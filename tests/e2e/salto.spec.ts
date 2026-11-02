import { expect, test, type Page } from "@playwright/test";
import { progressoLocal } from "./ajuda";

const pronta = (page: Page) => expect(page.locator("#lua")).toHaveAttribute("data-pronta", "1", { timeout: 15_000 });

// Onde fica, na tela, um ponto da régua de 0 a 1. O dedo fica abaixo dela, como no celular.
async function pontoNaTela(page: Page, pos: number) {
  const caixa = (await page.locator("#regua").boundingBox())!;
  return { x: caixa.x + caixa.width * pos, y: caixa.y + caixa.height + 70 };
}

async function esticar(page: Page, pos: number) {
  const { x, y } = await pontoNaTela(page, pos);
  await page.mouse.move(x, y);
  await page.mouse.down();
}

async function pularEm(page: Page, pos: number) {
  await esticar(page, pos);
  await page.mouse.up();
}

// A resposta sai do pedido, igual a como a criança lê. Só serve para as réguas de inteiros.
async function posDoAlvo(page: Page) {
  return page.evaluate(() => {
    const { min, max } = document.getElementById("pista")!.dataset;
    const valor = Number(document.getElementById("alvo")!.textContent!.replace("−", "-"));
    return (valor - Number(min)) / (Number(max) - Number(min));
  });
}

async function pularLonge(page: Page) {
  const alvo = await posDoAlvo(page);
  await pularEm(page, alvo > 0.5 ? 0.25 : 0.75);
}

async function abrirNaFase(page: Page, fase: number) {
  await page.addInitScript((f) => localStorage.setItem("mltg:progresso:salto", JSON.stringify({ recorde: 0, fase: f })), fase);
  await page.goto("/jogos/salto/");
  await page.getByRole("button", { name: `Continuar da fase ${fase}` }).click();
}

async function comecar(page: Page) {
  await page.goto("/jogos/salto/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await pronta(page);
}

test("pula em todas as pedras, o foguete decola e a fase fica salva", async ({ page }) => {
  await comecar(page);
  await expect(page.locator(".marca")).toHaveCount(4);

  for (let i = 0; i < 4; i++) {
    await pularEm(page, await posDoAlvo(page));
    if (i < 3) {
      await pronta(page);
      await expect(page.locator(".marca.feita")).toHaveCount(i + 1);
    }
  }

  await expect(page.locator("#foguete")).toHaveAttribute("data-etapa", "subindo", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Fase 1 completa!" })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#vidas")).toHaveAttribute("aria-label", "3 vidas");
  expect((await progressoLocal(page, "salto")).fase).toBe(2);

  await page.getByRole("button", { name: "Continuar" }).click();
  await pronta(page);
  await expect(page.locator(".placa")).toContainText("Fase 2");
  await expect(page.locator("#astronauta")).toBeVisible();
  await expect(page.locator(".pedra")).toHaveCount(1);
  await expect(page.locator(".marca.feita")).toHaveCount(0);
});

test("a pedra procurada só existe depois do salto, e a sombra não diz o número", async ({ page }) => {
  await comecar(page);
  const alvo = await page.locator("#alvo").textContent();
  await expect(page.locator(".pedra")).toHaveCount(1);
  await expect(page.locator("#sombra")).toBeHidden();

  await esticar(page, 0.5);
  await expect(page.locator("#sombra")).toBeVisible();
  await expect(page.locator("#elastico")).toBeVisible();
  await expect(page.locator("#sombra")).toHaveText("");
  await expect(page.locator(".pedra")).toHaveCount(1);
  expect(await page.locator(".pista").textContent()).not.toContain(alvo);
  await page.mouse.up();
});

test("a sombra acompanha o dedo e cai exatamente onde mostrou", async ({ page }) => {
  await comecar(page);
  const alvo = await posDoAlvo(page);
  const mira = alvo > 0.5 ? 0.3 : 0.7;
  await esticar(page, 0.2);
  const { x, y } = await pontoNaTela(page, mira);
  await page.mouse.move(x, y, { steps: 6 });

  const sombra = (await page.locator("#sombra").boundingBox())!;
  expect(Math.abs(sombra.x + sombra.width / 2 - x)).toBeLessThan(2);

  await page.mouse.up();
  await expect(page.locator(".cratera")).toBeVisible({ timeout: 10_000 });
  // A queda treme a cena: medir antes de ela parar soma o tremor à posição.
  await page.locator("#lua").evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  const cratera = (await page.locator(".cratera").boundingBox())!;
  expect(Math.abs(cratera.x + cratera.width / 2 - x)).toBeLessThan(2);
});

test("cratera custa uma vida, mostra a pedra e a volta não rende pontos", async ({ page }) => {
  await comecar(page);
  const texto = (await page.locator("#alvo").textContent())!;
  await pularLonge(page);

  await expect(page.locator("#fala")).toContainText(`A pedra ${texto} estava aqui`, { timeout: 10_000 });
  await expect(page.locator("#vidas")).toHaveAttribute("aria-label", "2 vidas");
  await expect(page.locator(".pedra-numero")).toHaveText(texto);
  await pronta(page);
  await expect(page.locator(".cratera")).toHaveCount(0);
  await expect(page.locator("#alvo")).toHaveText(texto);
  await expect(page.locator(".marca.feita")).toHaveCount(0);

  await pularEm(page, await posDoAlvo(page));
  await pronta(page);
  await expect(page.locator(".marca.feita")).toHaveCount(1);
  await expect(page.locator("#pontos")).toHaveText("0");
  await expect(page.locator("#vidas")).toHaveAttribute("aria-label", "2 vidas");
});

test("as vidas acabam e a partida mostra o fim", async ({ page }) => {
  await comecar(page);
  for (let i = 0; i < 3; i++) {
    await pularLonge(page);
    if (i < 2) await pronta(page);
  }
  await expect(page.getByRole("button", { name: "Jogar de novo" })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#painel")).toContainText("ficou na cratera");
});

test("soltar em cima do astronauta desiste do salto", async ({ page }) => {
  await comecar(page);
  await pularEm(page, 0);
  await expect(page.locator("#sombra")).toBeHidden();
  await expect(page.locator("#lua")).toHaveAttribute("data-pronta", "1");
  await expect(page.locator("#vidas")).toHaveAttribute("aria-label", "3 vidas");
  await expect(page.locator("#dica")).toBeVisible();
});

test("cair em pedra acesa é seguro e o pedido continua", async ({ page }) => {
  await comecar(page);
  const primeira = await posDoAlvo(page);
  await pularEm(page, primeira);
  await pronta(page);
  const alvo = await page.locator("#alvo").textContent();
  await pularEm(page, await posDoAlvo(page));
  await pronta(page);
  const terceiro = await page.locator("#alvo").textContent();
  expect(terceiro).not.toBe(alvo);

  await pularEm(page, primeira);
  await expect(page.locator("#fala")).toContainText(`A ${terceiro} é em outro lugar`, { timeout: 10_000 });
  await pronta(page);
  await expect(page.locator("#vidas")).toHaveAttribute("aria-label", "3 vidas");
  await expect(page.locator("#alvo")).toHaveText(terceiro!);
  await expect(page.locator(".marca.feita")).toHaveCount(2);
});

test("dá para jogar só com o teclado", async ({ page }) => {
  await comecar(page);
  const alvo = await posDoAlvo(page);
  await page.locator("#regua").focus();
  for (let i = 0; i < Math.round(alvo * 20); i++) await page.keyboard.press("Shift+ArrowRight");
  await expect(page.locator("#sombra")).toBeVisible();
  await page.keyboard.press("Enter");
  await pronta(page);
  await expect(page.locator(".marca.feita")).toHaveCount(1);
});

test("quem chega a uma fase de régua nova vê a explicação antes de jogar", async ({ page }) => {
  await abrirNaFase(page, 5);
  await expect(page.locator("#painel")).toContainText("A régua cresceu");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await pronta(page);
  await expect(page.locator(".rotulo")).toHaveText(["0", "1000"]);
  await expect(page.locator(".placa")).toContainText("Fase 5");
});

test("régua com negativos começa no zero, no meio", async ({ page }) => {
  await abrirNaFase(page, 11);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await pronta(page);
  await expect(page.locator(".rotulo")).toHaveText(["−10", "0", "10"]);
  const regua = (await page.locator("#regua").boundingBox())!;
  const astronauta = (await page.locator("#astronauta").boundingBox())!;
  expect(Math.abs(astronauta.x + astronauta.width / 2 - (regua.x + regua.width / 2))).toBeLessThan(2);
});

test("com menos movimento a fase termina igual, sem efeitos", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await comecar(page);
  for (let i = 0; i < 4; i++) {
    await pularEm(page, await posDoAlvo(page));
    if (i < 3) await pronta(page);
  }
  await expect(page.getByRole("heading", { name: "Fase 1 completa!" })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".efeito-peca, .efeito-emoji")).toHaveCount(0);
});

test("em tela pequena o número da pedra não cobre o da régua", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await comecar(page);
  await pularEm(page, await posDoAlvo(page));
  await pronta(page);

  const pedra = (await page.locator(".pedra-numero").first().boundingBox())!;
  for (const rotulo of await page.locator(".rotulo").all()) {
    const caixa = (await rotulo.boundingBox())!;
    expect(pedra.y).toBeGreaterThanOrEqual(caixa.y + caixa.height);
  }
  const cena = (await page.locator("#lua").boundingBox())!;
  expect(pedra.y + pedra.height).toBeLessThan(cena.y + cena.height);
});

test("a cena segura o dedo: arrastar não rola a página", async ({ page }) => {
  await comecar(page);
  expect(await page.locator("#lua").evaluate((el) => getComputedStyle(el).touchAction)).toBe("none");
});
