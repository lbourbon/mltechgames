import { expect, test } from "@playwright/test";

const filasNoTime = (page: import("@playwright/test").Page) => page.locator("#time .galope").count();

test("arrastando o dedo até a rena com o resultado, ela entra no time", async ({ page }) => {
  await page.goto("/jogos/treno/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await expect(page.locator("#painel")).toBeHidden();
  // O trenó sai sozinho, sem nenhuma rena.
  expect(await filasNoTime(page)).toBe(0);
  await expect(page.locator("#time-renas")).toHaveText("🦌 0/4");

  const cena = (await page.locator("#cena").boundingBox())!;
  await page.mouse.move(cena.x + cena.width / 2, cena.y + cena.height * 0.4);
  await page.mouse.down();
  await expect(async () => {
    const certa = await page.evaluate(() => {
      const conta = document.getElementById("conta")!;
      const resultado = [...conta.querySelectorAll(".conta-numero")].reduce((soma, el) => soma + Number(el.textContent), 0);
      const rena = [...document.querySelectorAll(".solta:not(.fugindo)")].find(
        (el) => Number(el.querySelector(".sino-numero")!.textContent) === resultado,
      );
      if (!rena) return null;
      const caixa = rena.getBoundingClientRect();
      return caixa.top + caixa.height / 2;
    });
    if (certa !== null) await page.mouse.move(cena.x + cena.width / 2, certa + 4);
    expect(await filasNoTime(page)).toBeGreaterThan(0);
  }).toPass({ timeout: 30_000, intervals: [100] });
  await page.mouse.up();
  await expect(page.locator("#pontos")).not.toHaveText("0");
  await expect(page.locator("#time-renas")).not.toHaveText("🦌 0/4");
});

test("enquanto chama as renas, o presente não sai", async ({ page }) => {
  await page.goto("/jogos/treno/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  const saco = page.locator("#saco");
  const cheio = await saco.textContent();
  await page.getByRole("button", { name: "Jogar presente" }).click();
  await page.waitForTimeout(300);
  await expect(saco).toHaveText(cheio!);
});

test("quem continua de uma noite adiantada passa na oficina e compra um trenó", async ({ page }) => {
  await page.goto("/jogos/treno/");
  await page.evaluate(() => localStorage.setItem("mltg:progresso:treno", JSON.stringify({ recorde: 100, fase: 6 })));
  await page.reload();
  await page.getByRole("button", { name: "Continuar da fase 6" }).click();
  const painel = page.locator("#painel");
  await expect(painel.getByRole("heading", { name: "Oficina dos Duendes" })).toBeVisible();
  await painel.getByRole("button", { name: /Trenó Clássico/ }).click();
  await painel.getByRole("button", { name: /Comprar por/ }).click();
  await expect(painel.getByText("Trenó Clássico: é seu!")).toBeVisible();
  await expect(painel.getByRole("button", { name: /Trenó Clássico/ })).toContainText("Usando");
  await painel.getByRole("button", { name: "Voar!" }).click();
  // A noite 6 estreia um tipo de conta.
  await expect(painel.getByRole("heading", { name: "Novidade na noite!" })).toBeVisible();
  await painel.getByRole("button", { name: "Continuar" }).click();
  await expect(painel).toBeHidden();
});
