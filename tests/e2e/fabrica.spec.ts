import { expect, test, type Page } from "@playwright/test";
import { progressoLocal } from "./ajuda";

const pronta = (page: Page) =>
  expect(page.locator(".jogo")).toHaveAttribute("data-travado", "", { timeout: 15_000 });

// A tela, lida como a criança lê: o valor de cada cor nas etiquetas e o número do bilhete.
async function lerTela(page: Page) {
  return page.evaluate(() => {
    const valores: Record<string, number> = {};
    document.querySelectorAll<HTMLElement>("#prateleira [data-cor]").forEach((botao) => {
      valores[botao.dataset.cor!] = Number(botao.querySelector(".etiqueta")!.textContent);
    });
    return {
      valores,
      alvo: Number(document.getElementById("alvo")!.textContent),
      vagas: document.querySelectorAll("#vagas .vaga").length,
      desejo: Number(document.querySelector(".casa.atual .desejo")?.textContent),
    };
  });
}

// Todos os pacotes possíveis, sem repetir a mesma mistura em outra ordem.
function pacotes(cores: string[], vagas: number): string[][] {
  if (vagas === 0) return [[]];
  return cores.flatMap((cor, i) => pacotes(cores.slice(i), vagas - 1).map((resto) => [cor, ...resto]));
}

async function montar(page: Page, certo: boolean) {
  const { valores, alvo, vagas } = await lerTela(page);
  const pacote = pacotes(Object.keys(valores), vagas).find(
    (cores) => (cores.reduce((soma, cor) => soma + valores[cor], 0) === alvo) === certo,
  )!;
  for (const cor of pacote) await page.locator(`#prateleira [data-cor=${cor}]`).click();
}

async function abrirNaFase(page: Page, fase: number) {
  await page.addInitScript((f) => localStorage.setItem("mltg:progresso:fabrica", JSON.stringify({ recorde: 0, fase: f })), fase);
  await page.goto("/jogos/fabrica/");
  await page.getByRole("button", { name: `Continuar da fase ${fase}` }).click();
  await pronta(page);
}

test("enche o saco com os pacotes certos, entrega em cada casa e passa de noite", async ({ page }) => {
  await page.goto("/jogos/fabrica/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await pronta(page);

  // Com lugar vazio, o pacote não sai.
  await page.locator("#pronto").click();
  await expect(page.locator("#contador")).toHaveText("0/3");

  for (let i = 1; i <= 3; i++) {
    await pronta(page);
    await montar(page, true);
    await page.locator("#pronto").click();
    if (i < 3) await expect(page.locator("#contador")).toHaveText(`${i}/3`);
  }

  await expect(page.locator("#cena")).toHaveAttribute("data-modo", "entrega");
  for (let casa = 0; casa < 3; casa++) {
    await pronta(page);
    const { valores, desejo } = await lerTela(page);
    const cor = Object.keys(valores).find((c) => valores[c] === desejo)!;
    await page.locator(`#prateleira [data-cor=${cor}]`).click();
  }
  await expect(page.getByRole("heading", { name: "Fase 1 completa!" })).toBeVisible();
  expect((await progressoLocal(page, "fabrica")).fase).toBe(2);
});

test("depois das noites mansas, o pacote errado custa coração e fica para consertar", async ({ page }) => {
  await abrirNaFase(page, 3);
  await montar(page, false);
  await page.locator("#pronto").click();
  await expect(page.locator("#vidas")).toHaveAttribute("aria-label", "2 vidas");
  await expect(page.locator("#vagas .vaga.cheia")).toHaveCount(2);

  // Tocar num presente do bilhete tira ele, de graça.
  await page.locator("#vagas .vaga.cheia").first().click();
  await page.locator("#vagas .vaga.cheia").first().click();
  await montar(page, true);
  await page.locator("#pronto").click();
  await expect(page.locator("#contador")).toHaveText("1/4");
  await expect(page.locator("#vidas")).toHaveAttribute("aria-label", "2 vidas");
});

test("na noite do presente misterioso, a etiqueta mostra ? e o recado fica na parede", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("mltg:progresso:fabrica", JSON.stringify({ recorde: 0, fase: 6 })));
  await page.goto("/jogos/fabrica/");
  await page.getByRole("button", { name: "Continuar da fase 6" }).click();
  await expect(page.getByRole("heading", { name: "Presente misterioso!" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await pronta(page);
  await expect(page.locator(".etiqueta.misterio")).toHaveCount(1);
  await expect(page.locator("#pistas .recado")).toHaveCount(1);
});
