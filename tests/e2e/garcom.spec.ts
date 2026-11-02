import { expect, test, type Page } from "@playwright/test";
import { progressoLocal } from "./ajuda";

const pronto = (page: Page) => page.locator('#cozinha[data-pronta="1"]');
const prateleira = (page: Page) => page.locator("#cozinha .item");

async function jogar(page: Page) {
  await page.goto("/jogos/garcom/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await expect(pronto(page)).toBeAttached();
}

// Na fase 1 os pedidos são só palavras soltas, como "Apple!" ou "Pizza! Cake!".
async function palavrasDoPedido(page: Page) {
  const frase = await page.locator("#frase").textContent();
  return frase!.split("!").map((palavra) => palavra.trim().toLowerCase()).filter(Boolean);
}

async function itemErrado(page: Page) {
  const pedidas = await palavrasDoPedido(page);
  const todos = await prateleira(page).evaluateAll((itens) => itens.map((item) => (item as HTMLElement).dataset.item!));
  return todos.find((id) => !pedidas.includes(id))!;
}

const item = (page: Page, id: string) => page.locator(`#cozinha [data-item="${id}"]`);

test("serve certo até o fim da fase, e a fase fica salva", async ({ page }) => {
  await jogar(page);
  const painel = page.locator("#painel");
  await expect(page.locator(".marca")).toHaveCount(4);

  await expect(async () => {
    if (await painel.isVisible()) return;
    await expect(pronto(page)).toBeAttached({ timeout: 200 });
    for (const palavra of await palavrasDoPedido(page)) await item(page, palavra).click();
    await page.locator("#sino").click();
    throw new Error("ainda atendendo");
  }).toPass({ timeout: 45_000, intervals: [200] });

  await expect(painel).toContainText("Fase 1 completa");
  await expect(painel).toContainText("Novo enfeite");
  await expect(page.locator(".vitrine .novo-item")).toHaveCount(4);
  expect((await progressoLocal(page, "garcom")).fase).toBe(2);

  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.locator(".placa")).toContainText("Fase 2");
  await expect(pronto(page)).toBeAttached();
  await expect(page.locator("#parede")).not.toBeEmpty();
});

test("tirar da bandeja devolve o item, e o sino só acorda com algo nela", async ({ page }) => {
  await jogar(page);
  const sino = page.locator("#sino");
  await expect(sino).toBeDisabled();
  await prateleira(page).first().click();
  await expect(page.locator(".na-bandeja")).toHaveCount(1);
  await expect(sino).toBeEnabled();
  await page.locator(".na-bandeja").click();
  await expect(page.locator(".na-bandeja")).toHaveCount(0);
  await expect(sino).toBeDisabled();
});

test("servir errado custa um coração, diz o nome do item e mantém o pedido", async ({ page }) => {
  await jogar(page);
  const pedido = await page.locator("#frase").textContent();
  const errado = await itemErrado(page);

  await item(page, errado).click();
  await page.locator("#sino").click();

  await expect(page.locator("#vidas")).toHaveAttribute("aria-label", "2 vidas");
  await expect(page.locator("#frase")).toContainText("No, no!");
  await expect(page.locator("#frase")).toContainText(errado, { ignoreCase: true });
  await expect(page.locator("#frase")).toHaveText(pedido!);
  await expect(page.locator("#desenho .arte").first()).toBeVisible();
  await expect(page.locator(".na-bandeja")).toHaveCount(0);
});

test("três erros terminam a partida", async ({ page }) => {
  await jogar(page);
  const errado = await itemErrado(page);
  for (const vidas of ["2 vidas", "1 vidas"]) {
    await expect(pronto(page)).toBeAttached();
    await item(page, errado).click();
    await page.locator("#sino").click();
    await expect(page.locator("#vidas")).toHaveAttribute("aria-label", vidas);
  }
  await expect(pronto(page)).toBeAttached();
  await item(page, errado).click();
  await page.locator("#sino").click();
  await expect(page.getByRole("button", { name: "Jogar de novo" })).toBeVisible();
  await expect(page.locator("#painel")).toContainText("barriga vazia");
});

test("a prateleira só mostra desenhos, e a dica desenha o pedido", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("mltg:progresso:garcom", '{"recorde":0,"fase":13}'));
  await page.goto("/jogos/garcom/");
  await page.getByRole("button", { name: "Continuar da fase 13" }).click();

  await expect(page.locator(".vitrine .novo-item")).toHaveCount(3);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(pronto(page)).toBeAttached();

  const textos = await prateleira(page).evaluateAll((itens) => itens.map((item) => item.textContent!));
  textos.forEach((texto) => expect(texto).not.toMatch(/[a-z]/i));
  await expect(page.locator("#desenho .arte")).toHaveCount(0);

  await page.getByRole("button", { name: "Dica" }).click();
  await expect(page.locator("#desenho .arte").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Dica" })).toBeHidden();
});

test("as coisas coloridas aparecem desenhadas na estreia das cores", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("mltg:progresso:garcom", '{"recorde":0,"fase":5}'));
  await page.goto("/jogos/garcom/");
  await page.getByRole("button", { name: "Continuar da fase 5" }).click();
  await expect(page.locator(".vitrine svg.arte")).toHaveCount(4);
  await expect(page.locator("#painel")).toContainText("red balloon");
});

test("a cena cabe em um celular pequeno, com alvos grandes", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.addInitScript(() => localStorage.setItem("mltg:progresso:garcom", '{"recorde":0,"fase":9}'));
  await page.goto("/jogos/garcom/");
  await page.getByRole("button", { name: "Continuar da fase 9" }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(pronto(page)).toBeAttached();

  const larguraDoJogo = await page.locator(".jogo").evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(larguraDoJogo).toBe(0);
  for (const botao of await prateleira(page).all()) {
    const caixa = await botao.boundingBox();
    expect(caixa!.width).toBeGreaterThanOrEqual(70);
    expect(caixa!.height).toBeGreaterThanOrEqual(70);
  }
});

test("o pedido mais comprido do chefão cabe no balão, mesmo com a dica", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.addInitScript(() => localStorage.setItem("mltg:progresso:garcom", '{"recorde":0,"fase":9}'));
  await page.goto("/jogos/garcom/");
  await page.getByRole("button", { name: "Continuar da fase 9" }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(pronto(page)).toBeAttached();

  const sobra = await page.evaluate(() => {
    const balao = document.getElementById("balao")!;
    balao.classList.add("longo");
    document.getElementById("frase")!.textContent =
      "A strawberry, three tomatoes, a flashlight and a teddy bear, please. No watermelons!";
    document.getElementById("desenho")!.innerHTML = '<span class="arte">🍓</span>'.repeat(6);
    document.getElementById("dica")!.hidden = true;
    return balao.scrollHeight - balao.clientHeight;
  });
  expect(sobra).toBeLessThanOrEqual(1);
});

test("a estreia com muitas palavras mostra o título e o botão em um celular pequeno", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.addInitScript(() => localStorage.setItem("mltg:progresso:garcom", '{"recorde":0,"fase":3}'));
  await page.goto("/jogos/garcom/");
  await page.getByRole("button", { name: "Continuar da fase 3" }).click();
  await expect(page.locator(".vitrine .novo-item")).toHaveCount(6);

  const painel = await page.locator("#painel").boundingBox();
  const titulo = await page.getByRole("heading", { name: "Fase 3" }).boundingBox();
  expect(titulo!.y).toBeGreaterThanOrEqual(painel!.y);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(pronto(page)).toBeAttached();
});
