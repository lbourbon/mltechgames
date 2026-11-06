import { expect, test, type Page } from "@playwright/test";
import { progressoLocal } from "./ajuda";

const painel = (page: Page) => page.locator("#painel");

// Posição do carro na área da pista, lida do desenho.
async function carro(page: Page) {
  const transform = (await page.locator("#jogador > g").getAttribute("transform")) ?? "";
  const [x, y] = transform.match(/-?[\d.]+/g)!.map(Number);
  return { x, y };
}

async function largar(page: Page) {
  await expect(painel(page)).toBeHidden();
  await expect(page.locator("#semaforo")).toHaveText("Vai!", { timeout: 6_000 });
}

// Motorista dentro da página: acelera e vira o volante para seguir a linha do meio da pista,
// apertando as setas do teclado como quem joga no computador.
async function dirigirSozinho(page: Page) {
  await page.evaluate(() => {
    const caminho = document.querySelector(".estrada-chao")!.getAttribute("d")!;
    const pontos = caminho
      .slice(1, -1)
      .split("L")
      .map((par) => par.split(" ").map(Number));
    const apertadas = new Set<string>();
    const tecla = (key: string, apertar: boolean) => {
      if (apertadas.has(key) === apertar) return;
      if (apertar) apertadas.add(key);
      else apertadas.delete(key);
      document.dispatchEvent(new KeyboardEvent(apertar ? "keydown" : "keyup", { key }));
    };
    const relogio = setInterval(() => {
      const el = document.querySelector("#jogador > g");
      if (!el || !document.getElementById("painel")!.hidden) return;
      const [x, y] = el.getAttribute("transform")!.match(/-?[\d.]+/g)!.map(Number);
      const angulo = (Number(el.querySelector(".giro")!.getAttribute("transform")!.match(/-?[\d.]+/)![0]) * Math.PI) / 180;
      let perto = 0;
      pontos.forEach(([px, py], i) => {
        const [qx, qy] = pontos[perto];
        if ((px - x) ** 2 + (py - y) ** 2 < (qx - x) ** 2 + (qy - y) ** 2) perto = i;
      });
      const [ax, ay] = pontos[(perto + 9) % pontos.length];
      const desvio = Math.atan2(ay - y, ax - x) - angulo;
      const giro = Math.atan2(Math.sin(desvio), Math.cos(desvio));
      tecla("ArrowUp", true);
      tecla("ArrowRight", giro > 0.12);
      tecla("ArrowLeft", giro < -0.12);
    }, 40);
    (window as unknown as { pararMotorista: () => void }).pararMotorista = () => clearInterval(relogio);
  });
}

test("seta para cima acelera e para baixo dá ré, no teclado e na tela", async ({ page }) => {
  await page.goto("/jogos/corrida/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await largar(page);

  // Na largada da primeira pista o carro aponta para a direita.
  const inicio = await carro(page);
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(800);
  await page.keyboard.up("ArrowUp");
  await page.waitForTimeout(800);
  const depois = await carro(page);
  expect(depois.x).toBeGreaterThan(inicio.x + 20);

  // O dedo abaixo do meio das setas dá ré.
  const setas = (await page.locator("#setas").boundingBox())!;
  await page.mouse.move(setas.x + setas.width / 2, setas.y + setas.height * 0.9);
  await page.mouse.down();
  await expect(page.locator('[data-seta="baixo"]')).toHaveClass(/acesa/);
  await page.waitForTimeout(1200);
  await page.mouse.up();
  expect((await carro(page)).x).toBeLessThan(depois.x - 10);
});

test("dá duas voltas, passa de fase e a fase fica salva", async ({ page }) => {
  test.slow();
  await page.goto("/jogos/corrida/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await largar(page);
  await dirigirSozinho(page);

  await expect(page.getByRole("heading", { name: "Fase 1 completa!" })).toBeVisible({ timeout: 90_000 });
  expect((await progressoLocal(page, "corrida")).fase).toBe(2);
  await expect(painel(page)).toContainText("Agora você tem");

  await page.getByRole("button", { name: /Garagem/ }).click();
  await expect(page.getByRole("heading", { name: "Garagem" })).toBeVisible();
  await page.getByRole("button", { name: "Correr!" }).click();
  await expect(page.getByRole("heading", { name: "Novidade na pista!" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  await largar(page);
  await expect(page.locator("#posicao")).toBeVisible();
});

test("quem continua de uma fase adiantada monta o carro na garagem", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("mltg:progresso:corrida", JSON.stringify({ recorde: 0, fase: 6 })));
  await page.goto("/jogos/corrida/");
  await page.getByRole("button", { name: "Continuar da fase 6" }).click();
  await expect(page.getByRole("heading", { name: "Garagem" })).toBeVisible();

  // Caro demais: o botão avisa e não compra.
  await page.locator('[data-acao="carro"][data-id="disco"]').click();
  await page.getByRole("button", { name: /Comprar por/ }).click();
  await expect(page.locator(".aviso-garagem")).toHaveText("Ainda falta dinheiro para esse.");

  await page.locator('[data-acao="carro"][data-id="esportivo"]').click();
  await page.getByRole("button", { name: /Comprar por/ }).click();
  await expect(page.locator(".aviso-garagem")).toHaveText("Esportivo é seu!");
  await expect(page.locator('[data-acao="carro"][data-id="esportivo"]')).toContainText("Usando");

  await page.getByRole("button", { name: "Correr!" }).click();
  await largar(page);
  await expect(page.locator("#jogador > g")).toHaveAttribute("data-modelo", "esportivo");
});
