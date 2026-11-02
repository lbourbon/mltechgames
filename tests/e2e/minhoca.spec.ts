import { expect, test, type Page } from "@playwright/test";
import { progressoLocal } from "./ajuda";

const pronta = (page: Page) => expect(page.locator("#jardim")).toHaveAttribute("data-pronto", "1", { timeout: 15_000 });

async function comecar(page: Page) {
  await page.goto("/jogos/minhoca/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await pronta(page);
}

async function abrirNaFase(page: Page, fase: number) {
  await page.addInitScript((f) => localStorage.setItem("mltg:progresso:minhoca", JSON.stringify({ recorde: 0, fase: f })), fase);
  await page.goto("/jogos/minhoca/");
  await page.getByRole("button", { name: `Continuar da fase ${fase}` }).click();
}

// A resposta sai do desenho. Só serve para as palavras sem casas de duas letras.
async function proxima(page: Page) {
  const palavra = await page.locator("#desenho").getAttribute("aria-label");
  const comidas = await page.locator(".casa-comida").count();
  return palavra![comidas];
}

async function tocar(page: Page, letra: ReturnType<Page["locator"]>) {
  const caixa = (await letra.boundingBox())!;
  await page.mouse.click(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
}

const letraCom = (page: Page, texto: string) => page.locator(".letra").filter({ hasText: new RegExp(`^${texto}$`) });

async function comerProxima(page: Page) {
  const comidas = await page.locator(".casa-comida").count();
  await tocar(page, letraCom(page, await proxima(page)).first());
  await expect(page.locator(".casa-comida")).not.toHaveCount(comidas, { timeout: 15_000 });
}

async function tocarErrada(page: Page) {
  const certa = await proxima(page);
  await tocar(page, page.locator(".letra").filter({ hasNotText: new RegExp(`^${certa}$`) }).first());
}

async function comerPalavra(page: Page) {
  const palavra = await page.locator("#desenho").getAttribute("aria-label");
  for (let i = 0; i < palavra!.length; i++) await comerProxima(page);
  return palavra!;
}

test("come as letras na ordem, a palavra dança, estoura e a fase fica salva", async ({ page }) => {
  await comecar(page);
  await expect(page.locator(".marca")).toHaveCount(4);
  await expect(page.locator("#dica")).toBeVisible();

  for (let i = 0; i < 4; i++) {
    const palavra = await comerPalavra(page);
    await expect(page.locator(".bola-letra")).toHaveCount(0, { timeout: 15_000 });
    if (i < 3) {
      await pronta(page);
      await expect(page.locator("#desenho")).not.toHaveAttribute("aria-label", palavra);
      await expect(page.locator(".marca.feita")).toHaveCount(i + 1);
    }
  }

  await expect(page.getByRole("heading", { name: "Fase 1 completa!" })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".escritas span")).toHaveCount(4);
  expect((await progressoLocal(page, "minhoca")).fase).toBe(2);

  await page.getByRole("button", { name: "Continuar" }).click();
  await pronta(page);
  await expect(page.locator(".placa")).toContainText("Fase 2");
  await expect(page.locator(".letra")).toHaveCount(3);
  await expect(page.locator(".casa-guia")).toHaveCount(1);
});

test("cada letra gruda no corpo, na ordem da palavra", async ({ page }) => {
  await comecar(page);
  const palavra = (await page.locator("#desenho").getAttribute("aria-label"))!;
  await comerProxima(page);
  await comerProxima(page);
  await expect(page.locator(".bola-letra")).toHaveText([palavra[0], palavra[1]]);
  await expect(page.locator(".casa-comida")).toHaveText([palavra[0], palavra[1]]);
});

test("na fase mansa a letra errada é cuspida de graça e não rende pontos", async ({ page }) => {
  await comecar(page);
  // No caminho ela pode comer a certa, e a letra escolhida deixa de ser errada.
  await expect(async () => {
    await tocarErrada(page);
    await expect(page.locator("#fala")).toContainText("Agora vem o", { timeout: 4000 });
  }).toPass({ timeout: 60_000 });
  await expect(page.locator("#vidas")).toHaveAttribute("aria-label", "3 vidas");

  const pontos = await page.locator("#pontos").textContent();
  await comerProxima(page);
  await expect(page.locator("#pontos")).toHaveText(pontos!);
});

test("arrastando, a minhoca segue o dedo", async ({ page }) => {
  await comecar(page);
  const cena = (await page.locator("#jardim").boundingBox())!;
  const antes = (await page.locator("#cabeca").boundingBox())!;
  await page.mouse.move(cena.x + cena.width / 2, cena.y + 30);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  const depois = (await page.locator("#cabeca").boundingBox())!;
  expect(depois.y).toBeLessThan(antes.y - 15);
});

test("a estreia explica a novidade, e depois dela o erro custa um coração", async ({ page }) => {
  await abrirNaFase(page, 3);
  await expect(page.locator("#painel")).toContainText("A minhoca acordou");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await pronta(page);
  await expect(page.locator(".casa-guia")).toHaveCount(0);

  await expect(async () => {
    await tocarErrada(page);
    await expect(page.locator("#vidas")).toHaveAttribute("aria-label", "2 vidas", { timeout: 4000 });
  }).toPass({ timeout: 60_000 });
  await expect(page.locator(".casa-guia")).toHaveCount(1);
});

test("as vidas acabam e a partida mostra o fim", async ({ page }) => {
  await abrirNaFase(page, 3);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await pronta(page);
  // Ela não para de andar: no caminho pode comer a certa, e a letra escolhida deixa de ser errada.
  for (let vidas = 2; vidas >= 0; vidas--) {
    await expect(async () => {
      await tocarErrada(page);
      await expect(page.locator("#vidas")).toHaveAttribute("aria-label", `${vidas} vidas`, { timeout: 4000 });
    }).toPass({ timeout: 60_000 });
  }
  await expect(page.getByRole("button", { name: "Jogar de novo" })).toBeVisible();
  await expect(page.locator("#painel")).toContainText("soneca");
});

test("solta, a minhoca acordada continua andando e nunca perde coração", async ({ page }) => {
  await abrirNaFase(page, 3);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await pronta(page);
  const antes = (await page.locator("#cabeca").boundingBox())!;
  await page.waitForTimeout(6000);
  const depois = (await page.locator("#cabeca").boundingBox())!;
  expect(Math.hypot(depois.x - antes.x, depois.y - antes.y)).toBeGreaterThan(5);
  await expect(page.locator("#vidas")).toHaveAttribute("aria-label", "3 vidas");
});

test("dá para jogar só com o teclado", async ({ page }) => {
  await comecar(page);
  const antes = (await page.locator("#cabeca").boundingBox())!;
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(800);
  await page.keyboard.up("ArrowUp");
  const depois = (await page.locator("#cabeca").boundingBox())!;
  expect(depois.y).toBeLessThan(antes.y - 15);

  await page.waitForTimeout(200);
  const parada = (await page.locator("#cabeca").boundingBox())!;
  await page.waitForTimeout(300);
  expect((await page.locator("#cabeca").boundingBox())!.y).toBe(parada.y);
});

test("com menos movimento a palavra termina igual, sem efeitos", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await comecar(page);
  await comerPalavra(page);
  await expect(page.locator(".efeito-peca, .efeito-emoji")).toHaveCount(0);
  await expect(page.locator(".marca.feita")).toHaveCount(1, { timeout: 15_000 });
});

test("girar a tela leva as letras e a minhoca junto, dentro do jardim", async ({ page }) => {
  await comecar(page);
  await page.setViewportSize({ width: 800, height: 420 });
  await page.waitForTimeout(500);
  await page.locator("#jardim").evaluate((el) => el.scrollIntoView());
  const cena = (await page.locator("#jardim").boundingBox())!;
  for (const letra of await page.locator(".letra").all()) {
    const caixa = (await letra.boundingBox())!;
    expect(caixa.x).toBeGreaterThanOrEqual(cena.x - 4);
    expect(caixa.y).toBeGreaterThanOrEqual(cena.y - 4);
    expect(caixa.x + caixa.width).toBeLessThanOrEqual(cena.x + cena.width + 4);
    expect(caixa.y + caixa.height).toBeLessThanOrEqual(cena.y + cena.height + 4);
  }
  await comerProxima(page);
});

test("em tela pequena a palavra mais comprida cabe no quadro", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await comecar(page);
  await page.evaluate(() => {
    const casas = document.getElementById("casas")!;
    const modelo = casas.firstElementChild!;
    while (casas.children.length < 9) casas.append(modelo.cloneNode(true));
  });
  const quadro = (await page.locator(".pedido").boundingBox())!;
  const casas = await page.locator(".casa").all();
  const ultima = (await casas.at(-1)!.boundingBox())!;
  expect(ultima.x + ultima.width).toBeLessThanOrEqual(quadro.x + quadro.width);
  expect(ultima.width).toBeGreaterThan(20);
});

test("a cena segura o dedo: arrastar não rola a página", async ({ page }) => {
  await comecar(page);
  expect(await page.locator("#jardim").evaluate((el) => getComputedStyle(el).touchAction)).toBe("none");
});
