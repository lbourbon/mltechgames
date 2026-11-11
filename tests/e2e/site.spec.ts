import { expect, test, type Page } from "@playwright/test";
import { JOGOS } from "../../src/lib/jogos";
import { progressoLocal } from "./ajuda";

async function tocarBolha(page: Page, escolher: string) {
  const posicao = await page.evaluate((corpo) => {
    const alvo = Number(document.getElementById("alvo")!.textContent);
    const comeu = Number(document.getElementById("comeu")!.textContent);
    const bolhas = [...document.querySelectorAll<HTMLElement>(".bolha")].filter(
      (el) => el.getBoundingClientRect().top > document.getElementById("ceu")!.getBoundingClientRect().top,
    );
    const bolha = new Function("bolhas", "restante", corpo)(bolhas, alvo - comeu) as HTMLElement | undefined;
    if (!bolha) return null;
    const caixa = bolha.getBoundingClientRect();
    return { x: caixa.x + caixa.width / 2, y: caixa.y + caixa.height / 2 };
  }, escolher);
  if (posicao) await page.mouse.click(posicao.x, posicao.y);
}

const ACERTAR = `return bolhas.find((b) => Number(b.textContent) <= restante)`;
const ERRAR = `return bolhas.find((b) => Number(b.textContent) > restante) ?? bolhas.find((b) => Number(b.textContent) < restante)`;

test("catálogo vem no HTML estático, sem depender de JS", async ({ request }) => {
  const html = await (await request.get("/")).text();
  expect(html).toContain("Monstrinho Guloso");
  expect(html).toContain('id="botao-conta"');
});

for (const { id, nome, comoJogar } of JOGOS) {
  test(`${nome}: instruções no HTML estático e joga sem Firebase nem Google`, async ({ page, request }) => {
    const html = await (await request.get(`/jogos/${id}/`)).text();
    expect(html).toContain(comoJogar);

    const externos: string[] = [];
    const js: string[] = [];
    const erros: Error[] = [];
    page.on("pageerror", (erro) => erros.push(erro));
    page.on("request", (requisicao) => {
      const url = requisicao.url();
      if (!url.startsWith("http://127.0.0.1:4329")) externos.push(url);
      if (url.endsWith(".js")) js.push(url);
    });
    await page.goto("/");
    await page.getByRole("link", { name: nome }).click();
    await expect(page.getByRole("heading", { name: nome })).toBeVisible();
    await page.getByRole("button", { name: "Jogar", exact: true }).click();
    await expect(page.locator("#painel")).toBeHidden();
    await page.waitForTimeout(1500);
    expect(erros).toEqual([]);
    expect(externos).toEqual([]);
    const tamanhos = await Promise.all(js.map((url) => page.request.get(url).then((r) => r.body()).then((b) => b.length)));
    expect(Math.max(...tamanhos)).toBeLessThan(100_000);
  });
}

for (const { id, nome } of JOGOS) {
  test(`${nome}: dá para voltar aos jogos na abertura e no meio da partida`, async ({ page }) => {
    const voltar = page.getByRole("link", { name: "Voltar" });

    await page.goto(`/jogos/${id}/`);
    await voltar.click();
    await expect(page).toHaveURL("/");

    await page.goto(`/jogos/${id}/`);
    await page.getByRole("button", { name: "Jogar", exact: true }).click();
    await voltar.click();
    await expect(page).toHaveURL("/");
  });
}

// A altura de um celular comum com as barras do navegador à vista. Se o jogo passa disso, a
// criança precisa rolar a página no meio da partida, e o arrasto dos jogos briga com a rolagem.
for (const { id, nome } of JOGOS) {
  test(`${nome}: cabe na tela de um celular pequeno, sem rolar a página`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto(`/jogos/${id}/`);
    const jogar = page.getByRole("button", { name: "Jogar", exact: true });
    await expect(jogar).toBeInViewport({ ratio: 1 });
    await jogar.click();
    await expect(page.locator("#painel")).toBeHidden();

    const sobra = () => page.evaluate(() => innerHeight - document.querySelector(".jogo")!.getBoundingClientRect().bottom);
    await expect.poll(sobra).toBeGreaterThanOrEqual(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  });
}

test("responsável volta aos jogos", async ({ page }) => {
  await page.goto("/responsaveis/");
  await page.getByRole("link", { name: "Voltar" }).click();
  await expect(page).toHaveURL("/");
});

test("doação mostra QR Code e copia o PIX", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("banner").getByRole("button", { name: "Doar" }).click();
  const qr = page.getByAltText("QR Code PIX para doação");
  await expect(qr).toBeVisible();
  expect(await qr.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Copiar código" }).click();
  await expect(page.getByText("Código copiado")).toBeVisible();
  const copiado = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiado).toBe(await page.locator("#codigo-pix").inputValue());
  expect(copiado).toMatch(/^000201/);
});

test("joga, sobe de fase, perde tudo e continua de onde parou", async ({ page }) => {
  await page.goto("/jogos/monstrinho/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();

  const painel = page.locator("#painel");
  await expect(async () => {
    await tocarBolha(page, ACERTAR);
    expect(await painel.isVisible()).toBe(true);
  }).toPass({ timeout: 90_000, intervals: [120] });
  await expect(painel).toContainText("Fase 1 completa");
  expect((await progressoLocal(page)).fase).toBe(2);

  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(async () => {
    if (await page.getByRole("button", { name: "Continuar" }).isVisible()) {
      await page.getByRole("button", { name: "Continuar" }).click();
    }
    await tocarBolha(page, ERRAR);
    expect(await page.getByRole("button", { name: "Jogar de novo" }).isVisible()).toBe(true);
  }).toPass({ timeout: 90_000, intervals: [120] });
  await expect(page.getByRole("button", { name: "Chamar um adulto" })).toBeVisible();
  await expect(painel).toContainText("Novo recorde");

  await page.getByRole("button", { name: "Jogar de novo" }).click();
  await expect(page.getByRole("button", { name: /Continuar da fase/ })).toBeVisible();
  await expect(painel).toContainText("Recorde:");

  await page.goto("/jogos/monstrinho/");
  await expect(page.getByRole("button", { name: /Continuar da fase/ })).toBeVisible();
  await page.goto("/");
  await expect(page.locator('[data-recorde="monstrinho"]')).toContainText("Recorde");
  await expect(page.getByRole("region", { name: "Continue jogando" }).getByRole("link", { name: /Monstrinho Guloso/ })).toBeVisible();
});

test("Robô Turbo: vence uma fase, ganha poder novo e continua de onde parou", async ({ page }) => {
  await page.goto("/jogos/robo/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();

  await expect(async () => {
    const seguir = page.locator("[data-acao=seguir]");
    if ((await seguir.isVisible()) && !(await page.getByRole("heading", { name: /completa/ }).isVisible())) {
      await seguir.click();
    }
    await page.evaluate(() => {
      const restante = Number(document.getElementById("defesa")!.textContent);
      const ativos = [...document.querySelectorAll<HTMLButtonElement>(".poder:not([disabled])")];
      const cabem = ativos.filter((botao) => Number(botao.dataset.forca) <= restante);
      const botao = cabem.at(-1) ?? ativos[0];
      botao?.click();
    });
    expect(await page.getByRole("heading", { name: "Fase 1 completa!" }).isVisible()).toBe(true);
  }).toPass({ timeout: 60_000, intervals: [200] });

  await expect(page.locator("#painel")).toContainText("Novo poder");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.locator(".poder")).toHaveCount(3);

  await page.goto("/jogos/robo/");
  await expect(page.getByRole("button", { name: "Continuar da fase 2" })).toBeVisible();
  await page.goto("/");
  await expect(page.locator(".cartao")).toHaveCount(JOGOS.length);
});

test("Robô Turbo só termina quando todas as cargas acabam", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("mltg:progresso:robo", '{"recorde":0,"fase":3}'));
  await page.goto("/jogos/robo/");
  await page.getByRole("button", { name: "Continuar da fase 3" }).click();

  const fim = page.getByRole("button", { name: "Jogar de novo" });
  await expect(async () => {
    const tentar = page.getByRole("button", { name: "Tentar de novo" });
    if (await tentar.isVisible()) await tentar.click();
    // Desperdiça de propósito: gasta sempre o golpe mais forte.
    await page.evaluate(() => [...document.querySelectorAll<HTMLButtonElement>(".poder:not([disabled])")].at(-1)?.click());
    expect(await fim.isVisible()).toBe(true);
  }).toPass({ timeout: 90_000, intervals: [150] });

  await expect(page.locator("#painel")).toContainText("Acabaram os golpes");
  const cargas = await page.locator(".poder-cargas").allTextContents();
  expect(new Set(cargas)).toEqual(new Set(["×0"]));
});

const carta = (page: Page, nome: string) => page.locator(`#baralho [data-carta=${nome}]`);

async function abrirSubmarinoNaFase(page: Page, fase: number) {
  await page.goto("/");
  await page.evaluate((f) => localStorage.setItem("mltg:progresso:submarino", JSON.stringify({ recorde: 0, fase: f })), fase);
  await page.goto("/jogos/submarino/");
  await page.getByRole("button", { name: `Continuar da fase ${fase}` }).click();
  // As fases de estreia explicam a carta nova antes de deixar jogar.
  if ([4, 7, 10].includes(fase)) await page.getByRole("button", { name: "Continuar", exact: true }).click();
}

test("Submarino: monta a rota, vence a fase 1 e continua de onde parou", async ({ page }) => {
  await page.goto("/jogos/submarino/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await expect(page.locator(".placa")).toContainText("Fase 1");
  await expect(page.locator("#vai")).toBeDisabled();

  const coluna = (seletor: string) => page.locator(seletor).evaluate((el: HTMLElement) => Number(el.style.getPropertyValue("--x")));
  const distancia = (await coluna(".tesouro")) - (await coluna("#sub"));
  for (let i = 0; i < distancia; i++) await carta(page, "frente").click();
  await page.locator("#vai").click();

  await expect(page.getByRole("heading", { name: "Fase 1 completa!" })).toBeVisible();
  expect((await progressoLocal(page, "submarino")).fase).toBe(2);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.locator(".placa")).toContainText("Fase 2");
  await expect(page.locator(".casa:not(.casa-vazia)")).toHaveCount(0);

  await page.goto("/jogos/submarino/");
  await expect(page.getByRole("button", { name: "Continuar da fase 2" })).toBeVisible();
});

test("Submarino: bater tira uma vida, mantém a rota e libera a dica", async ({ page }) => {
  await page.goto("/jogos/submarino/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await expect(page.locator("#dica")).toBeHidden();

  // Sai da fileira do tesouro rumo à parede mais perto, até encher as vagas.
  const linha = await page.locator("#sub").evaluate((el: HTMLElement) => Number(el.style.getPropertyValue("--y")));
  await carta(page, linha <= 3 ? "esquerda" : "direita").click();
  while (await carta(page, "frente").isEnabled()) await carta(page, "frente").click();
  const usadas = await page.locator(".casa:not(.casa-vazia)").count();

  await page.locator("#vai").click();
  await expect(page.locator("#vidas")).toHaveAttribute("aria-label", "2 vidas");
  await expect(page.locator("#fala")).toContainText("Bateu");
  await expect(page.locator(".casa.erro")).toHaveCount(1);
  await expect(page.locator(".casa:not(.casa-vazia)")).toHaveCount(usadas);

  await page.locator("#dica").click();
  await expect(page.locator(".casa.erro")).toHaveCount(0);
  await expect(page.locator(".casa:not(.casa-vazia)")).toHaveCount(1);
  await expect(page.locator("#fala")).toHaveText("");
});

test("Submarino: Parar volta ao início sem custar vida", async ({ page }) => {
  await page.goto("/jogos/submarino/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  const posicao = () => page.locator("#sub").evaluate((el: HTMLElement) => el.getAttribute("style"));
  const inicio = await posicao();
  await carta(page, "frente").click();
  await carta(page, "frente").click();
  await page.locator("#vai").click();
  await page.getByRole("button", { name: "Parar" }).click();

  await expect(page.getByRole("button", { name: "Vai!" })).toBeEnabled();
  expect(await posicao()).toBe(inicio);
  await expect(page.locator("#vidas")).toHaveAttribute("aria-label", "3 vidas");
  await expect(page.locator(".casa:not(.casa-vazia)")).toHaveCount(2);
});

test("Submarino: com dicas chega à solução e a carta nova é apresentada", async ({ page }) => {
  await abrirSubmarinoNaFase(page, 3);
  await carta(page, "direita").click();
  await page.locator("#vai").click();
  await expect(page.locator("#fala")).toContainText("falta tesouro");

  for (let i = 0; i < 14; i++) await page.locator("#dica").click();
  await page.locator("#vai").click();
  await expect(page.getByRole("heading", { name: "Fase 3 completa!" })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#painel")).toContainText("Nova carta: 🔁 Repetir!");

  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.locator(".placa")).toContainText("Fase 4");
  await expect(page.locator(".fileira-principal .fileira-laco")).toBeVisible();
  await expect(page.locator(".fileira-laco .casa:not(.casa-vazia)")).toHaveCount(1);
});

test("Submarino: quem volta direto para a fase de estreia vê a explicação da carta", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("mltg:progresso:submarino", JSON.stringify({ recorde: 0, fase: 7 })));
  await page.goto("/jogos/submarino/");
  await page.getByRole("button", { name: "Continuar da fase 7" }).click();

  await expect(page.locator("#painel")).toContainText("Nova carta: ⭐ Truque!");
  await expect(page.locator("#painel .exemplo")).toHaveCount(2);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();

  await expect(page.locator("#painel")).toBeHidden();
  await expect(page.locator(".placa")).toContainText("Fase 7");
  await expect(page.locator(".fileira-truque .casa:not(.casa-vazia)").first()).toBeVisible();
});

test("Submarino: o bloco fica na rota, entre o que vem antes e o que vem depois", async ({ page }) => {
  await abrirSubmarinoNaFase(page, 4);
  const ordem = () =>
    page.locator(".fileira-principal > .casas > :not(.casa-vazia)").evaluateAll((itens) =>
      itens.map((item) => (item as HTMLElement).dataset.carta ?? "bloco"),
    );
  expect(await ordem()).toEqual(["bloco"]);
  await expect(carta(page, "laco")).toBeDisabled();

  await page.locator(".casa-antes").click();
  await carta(page, "direita").click();
  expect(await ordem()).toEqual(["direita", "bloco"]);

  // Tirar o bloco guarda o que estava dentro, para ele poder voltar em outro lugar.
  await page.getByRole("button", { name: "Tirar o bloco" }).click();
  await expect(page.locator(".fileira-laco")).toHaveCount(0);
  await carta(page, "laco").click();
  expect(await ordem()).toEqual(["direita", "bloco"]);
  await expect(page.locator(".fileira-laco .casa:not(.casa-vazia)")).toHaveCount(1);
});

test("Submarino: repetir com sensor percorre a fase inteira sozinho", async ({ page }) => {
  await abrirSubmarinoNaFase(page, 10);
  await expect(page.locator(".vezes")).toHaveText("×∞");
  await carta(page, "frente").click();
  await page.locator("#vai").click();

  // Enquanto roda, o bloco acende e conta as voltas.
  await expect(page.locator(".fileira-laco")).toHaveClass(/rodando/);
  await expect(page.locator(".vezes")).toHaveText(/^\d+$/);

  await expect(page.getByRole("heading", { name: "Fase 10 completa!" })).toBeVisible({ timeout: 30_000 });
});

test("som só toca depois de um toque e o botão desliga de verdade", async ({ page }) => {
  await page.addInitScript(() => {
    const iniciar = OscillatorNode.prototype.start;
    (window as any).tons = 0;
    OscillatorNode.prototype.start = function (...args) {
      (window as any).tons++;
      return iniciar.apply(this, args);
    };
  });
  const tons = () => page.evaluate(() => (window as any).tons as number);

  await page.goto("/jogos/robo/");
  expect(await tons()).toBe(0);

  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await expect(page.locator(".poder:not([disabled])").first()).toBeVisible();
  expect(await tons()).toBeGreaterThan(0);

  const som = page.getByRole("button", { name: "Som" });
  await som.click();
  await expect(som).toHaveAttribute("aria-pressed", "false");
  const antes = await tons();
  await page.locator(".poder:not([disabled])").first().click();
  await expect(page.locator(".poder-cargas").first()).not.toHaveText("×6");
  expect(await tons()).toBe(antes);

  await page.reload();
  await expect(som).toHaveAttribute("aria-pressed", "false");
});

test("efeitos somem sozinhos e ficam de fora com menos movimento", async ({ page }) => {
  const golpear = async () => {
    await page.goto("/jogos/robo/");
    await page.getByRole("button", { name: "Jogar", exact: true }).click();
    await page.locator(".poder:not([disabled])").first().click();
  };

  await golpear();
  await expect(page.locator(".efeito-peca, .efeito-emoji").first()).toBeAttached();
  await expect(page.locator(".efeito")).toHaveCount(0, { timeout: 3000 });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await golpear();
  await expect(page.locator(".poder-cargas").first()).not.toHaveText("×6");
  await expect(page.locator(".efeito-peca, .efeito-emoji, .tiro")).toHaveCount(0);
});

test("cartões mostram a capa de cada jogo", async ({ page }) => {
  await page.goto("/");
  for (const img of await page.locator(".cartao img").all()) {
    expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
  }
});

test("página inexistente responde em português", async ({ page }) => {
  await page.goto("/nao-existe");
  await expect(page.getByRole("heading", { name: "Ops, essa página sumiu!" })).toBeVisible();
});

test("responsável apaga o progresso do aparelho", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("mltg:progresso:monstrinho", '{"recorde":5,"fase":2}'));
  await page.goto("/responsaveis/");
  await page.getByRole("button", { name: "Apagar progresso deste aparelho" }).click();
  await expect(page.getByText("foi apagado")).toBeVisible();
  expect(await progressoLocal(page)).toBeNull();
});

test("adulto filtra o guia por área a partir da página inicial", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Jogos por área" }).getByRole("link", { name: "Geografia" }).click();
  await expect(page).toHaveURL("/responsaveis/#geografia");

  const fichas = page.locator(".ficha:visible");
  const deGeografia = JOGOS.filter((jogo) => (jogo.areas as readonly string[]).includes("geografia"));
  await expect(fichas).toHaveCount(deGeografia.length);
  await expect(page.getByRole("button", { name: "Geografia" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Todas" }).click();
  await expect(fichas).toHaveCount(JOGOS.length);
  await expect(page).toHaveURL("/responsaveis/");

  await page.locator(".ficha", { hasText: "Pizzaria Maluca" }).getByRole("link", { name: "Jogar" }).click();
  await expect(page).toHaveURL("/jogos/pizza/");
});
