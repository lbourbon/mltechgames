import { expect, test, type Page } from "@playwright/test";

// A primeira luta começa direto no treino.
async function abrirTreino(page: Page) {
  await page.goto("/jogos/luta/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await expect(page.locator("#painel")).toBeHidden();
}

test("a ficha do adversário abre por cima do treino e volta para ele", async ({ page }) => {
  await abrirTreino(page);
  const forca = page.getByRole("button", { name: "Treinar Força" });
  await forca.click();
  await page.getByRole("button", { name: "Ver a ficha do adversário" }).click();
  const painel = page.locator("#painel");
  await expect(painel.getByRole("heading", { name: "Luta 1" })).toBeVisible();
  await painel.getByRole("button", { name: /Treinar!/ }).click();
  await expect(painel).toBeHidden();
  // O treino que já tinha sido feito continua lá.
  await expect(forca.locator(".ganho")).toHaveText("+1");
});

test("os treinos sobem o atributo, acabam, e só então dá para lutar", async ({ page }) => {
  await abrirTreino(page);
  const forca = page.getByRole("button", { name: "Treinar Força" });
  const lutar = page.getByRole("button", { name: /Lutar!/ });
  const antes = Number(await forca.locator(".meu").evaluate((el) => el.firstChild!.textContent));
  await expect(lutar).toBeDisabled();
  await forca.click();
  await expect(forca.locator(".meu")).toContainText(String(antes + 1));
  await page.getByRole("button", { name: "Refazer o treino" }).click();
  await expect(forca.locator(".meu")).toHaveText(String(antes));
  for (let i = 0; i < 3; i++) await forca.click();
  await expect(forca).toBeDisabled();
  await expect(lutar).toBeEnabled();
});

test("na luta, o soco tira vida do adversário e a rodada volta para a criança", async ({ page }) => {
  await abrirTreino(page);
  const forca = page.getByRole("button", { name: "Treinar Força" });
  for (let i = 0; i < 3; i++) await forca.click();
  await page.getByRole("button", { name: /Lutar!/ }).click();
  const soco = page.getByRole("button", { name: "Soco" });
  await expect(soco).toBeEnabled();
  const vidaDoRival = page.locator(".barra-rival .barra-numero");
  const antes = Number(await vidaDoRival.textContent());
  await soco.click();
  await expect(soco).toBeDisabled();
  await expect(soco).toBeEnabled({ timeout: 10_000 });
  expect(Number(await vidaDoRival.textContent())).toBeLessThan(antes);
});

test("quem continua de uma fase adiantada passa na loja, compra e veste", async ({ page }) => {
  await page.goto("/jogos/luta/");
  await page.evaluate(() => localStorage.setItem("mltg:progresso:luta", JSON.stringify({ recorde: 100, fase: 6 })));
  await page.reload();
  await page.getByRole("button", { name: "Continuar da fase 6" }).click();
  const painel = page.locator("#painel");
  await expect(painel.getByRole("heading", { name: "Loja" })).toBeVisible();
  await painel.getByRole("button", { name: /Anilhas pesadas/ }).click();
  await painel.getByRole("button", { name: /Comprar por/ }).click();
  await expect(painel.getByText("Anilhas pesadas: comprado!")).toBeVisible();
  await painel.getByRole("button", { name: /Luvas Dourada/ }).click();
  await painel.getByRole("button", { name: /Comprar por/ }).click();
  await expect(painel.getByRole("button", { name: /Luvas Dourada/ })).toContainText("✓");
  await painel.getByRole("button", { name: "Pronto" }).click();
  // A fase 6 estreia o gelo, que a ficha deixa escolher.
  await expect(painel.getByRole("heading", { name: "Novidade!" })).toBeVisible();
  await painel.getByRole("button", { name: "Continuar" }).click();
  await painel.getByRole("button", { name: /Gelo/ }).click();
  await expect(painel.getByRole("button", { name: /Gelo/ })).toHaveAttribute("aria-pressed", "true");
  await painel.getByRole("button", { name: /Treinar!/ }).click();
  await expect(painel).toBeHidden();
  // O equipamento comprado já conta na força.
  await expect(page.getByRole("button", { name: "Treinar Força" }).locator(".meu")).toHaveText("3");
});
