import { porId } from "../kit/dom";
import { animar, centroDe, confete, flutuar, pular } from "../kit/efeitos";
import { criarMoldura } from "../kit/moldura";
import { somVitoria } from "../kit/som";
import { telaFase, telaNovidade, telaTropeco } from "../kit/telas";
import { esperar } from "../kit/tempo";
import {
  CRESCE,
  ESPECIES,
  MAXIMO,
  MESES,
  ULTIMA_FASE_MANSA,
  cartaDaDica,
  especiesDa,
  estacaoAgora,
  estacaoDoMes,
  jogar,
  mesesDa,
  novoJogo,
  type Bando,
  type Especie,
  type Estado,
  type Evento,
} from "./logica";
import { somAnoPerdido, somChegou, somChuva, somComeu, somCresceu, somNasceu, somSaiu, somSol } from "./sons";

const NOMES: Record<Especie, [string, string]> = {
  capim: ["tufo de capim", "tufos de capim"],
  capivara: ["capivara", "capivaras"],
  onca: ["onça", "onças"],
  peixe: ["peixe", "peixes"],
  garca: ["garça", "garças"],
  jacare: ["jacaré", "jacarés"],
};
const TITULOS: Record<Especie, string> = {
  capim: "Capim",
  capivara: "Capivara",
  onca: "Onça",
  peixe: "Peixe",
  garca: "Garça",
  jacare: "Jacaré",
};
const nome = (especie: Especie, quantos: number) => NOMES[especie][quantos === 1 ? 0 : 1];

const CORES: Record<Especie, string> = {
  capim: "#4fae3a",
  capivara: "#a0622d",
  onca: "#e8a33c",
  peixe: "#2f7bff",
  garca: "#8b93a7",
  jacare: "#2f6b2a",
};

// O que cada carta faz, no botão e para o leitor de tela.
const ACAO: Record<Especie, string> = {
  capim: "Plantar",
  peixe: "Soltar",
  capivara: "Trazer",
  onca: "Trazer",
  garca: "Trazer",
  jacare: "Trazer",
};

const NOVIDADES: Record<number, { titulo: string; especie: Especie; texto: string }> = {
  2: {
    titulo: "Chegou a onça!",
    especie: "onca",
    texto: "A onça come 1 capivara por mês. Se não achar nenhuma, ela vai embora. Com a onça, as capivaras não crescem demais.",
  },
  [ULTIMA_FASE_MANSA + 1]: {
    titulo: "Agora vale coração",
    especie: "capim",
    texto: "Um ano que não fecha custa um coração. Olhe o calendário: na seca o capim quase não cresce!",
  },
  4: {
    titulo: "A lagoa!",
    especie: "peixe",
    texto: "Na cheia nascem 3 peixes por mês, e na seca nenhum. O jacaré e a garça comem 1 peixe por mês cada um. O jacaré come primeiro: se faltar peixe, a garça voa embora.",
  },
  5: {
    titulo: "A onça caça jacaré!",
    especie: "jacare",
    texto: "Quando não acha capivara, a onça come 1 jacaré. Ela só vai embora se não houver nenhum dos dois.",
  },
};

const meses = porId("meses");
const cena = porId("pantanal");
const metas = porId("metas");
const grafico = porId("grafico");
const fala = porId("fala");
const mao = porId("mao");
const botaoRegras = porId("regras") as HTMLButtonElement;
const botaoDica = porId("dica") as HTMLButtonElement;
const zonas = Object.fromEntries(
  ESPECIES.map((especie) => [especie, cena.querySelector<HTMLElement>(`.zona-${especie}`)!]),
) as Record<Especie, HTMLElement>;

const moldura = criarMoldura({ aoComecar: comecar, aoSeguir: seguir });

let estado: Estado = novoJogo();
let travado = true;
let novidadeVista = 0;
// O painel aberto por cima do jogo é só o das regras: fechar volta para o mesmo mês.
let lendoRegras = false;

const icone = (especie: Especie, classe = "icone") =>
  `<svg class="${classe}" viewBox="0 0 40 40" aria-hidden="true"><use href="#bicho-${especie}"/></svg>`;

function falar(texto: string) {
  fala.textContent = texto;
}

function travar(valor: boolean) {
  travado = valor;
  mao.querySelectorAll<HTMLButtonElement>(".carta").forEach((carta) => (carta.disabled = valor));
  botaoDica.disabled = valor;
  botaoRegras.disabled = valor;
}

// As espécies que aparecem na fase: as das metas, as da mão, as que já estão lá e a comida delas.
function especiesNaFase(): Especie[] {
  const { mapa } = estado;
  const usadas = new Set<Especie>([...especiesDa(mapa), ...mapa.mao.map((carta) => carta.especie)]);
  ESPECIES.forEach((especie) => mapa.comeco[especie] > 0 && usadas.add(especie));
  if (usadas.has("capivara")) usadas.add("capim");
  if (usadas.has("garca") || usadas.has("jacare")) usadas.add("peixe");
  return ESPECIES.filter((especie) => usadas.has(especie));
}

function desenharZona(especie: Especie, quantos: number, antes = quantos) {
  const zona = zonas[especie];
  zona.hidden = !especiesNaFase().includes(especie);
  zona.setAttribute("aria-label", `${quantos} ${nome(especie, quantos)}`);
  zona.setAttribute("role", "img");
  zona.innerHTML = `<span class="bichos">${Array.from({ length: quantos }, (_, i) => icone(especie, i >= antes ? "icone novo" : "icone")).join("")}</span>
    <span class="conta${quantos === 0 ? " zerada" : ""}">${quantos}</span>`;
}

function desenharCena(bando: Bando) {
  ESPECIES.forEach((especie) => desenharZona(especie, bando[especie]));
}

function desenharMeses() {
  const lista = mesesDa(estado.mapa);
  meses.replaceChildren(
    ...lista.map((mes, i) => {
      const item = document.createElement("li");
      const estacao = estacaoDoMes(mes);
      item.className = `mes ${estacao}${i < estado.mes ? " passado" : ""}${i === estado.mes ? " atual" : ""}`;
      item.innerHTML = `<span aria-hidden="true">${estacao === "cheia" ? "🌧️" : "☀️"}</span>${MESES[mes]}`;
      item.setAttribute("aria-label", `${MESES[mes]}, ${estacao}`);
      item.dataset.mes = String(mes);
      return item;
    }),
  );
}

function desenharMetas() {
  const lista = especiesDa(estado.mapa);
  metas.setAttribute("aria-label", `No fim do ano: ${lista.map((especie) => `${estado.mapa.metas[especie]} ${nome(especie, estado.mapa.metas[especie]!)}`).join(", ")}`);
  metas.innerHTML = `<span class="metas-alvo" aria-hidden="true">🎯</span>${lista
    .map((especie) => `<span class="meta" data-especie="${especie}">${icone(especie)}${estado.mapa.metas[especie]}</span>`)
    .join("")}`;
}

function desenharMao() {
  const grupos = new Map<Especie, number>();
  estado.mao.forEach((carta) => grupos.set(carta.especie, (grupos.get(carta.especie) ?? 0) + 1));
  const cartas = ESPECIES.filter((especie) => grupos.has(especie)).map((especie) => {
    const quantos = estado.mao.find((carta) => carta.especie === especie)!.quantos;
    const vezes = grupos.get(especie)!;
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "carta";
    botao.dataset.especie = especie;
    botao.disabled = travado;
    botao.setAttribute("aria-label", `${ACAO[especie]} ${quantos} ${nome(especie, quantos)}${vezes > 1 ? `, ${vezes} cartas` : ""}`);
    botao.innerHTML = `${icone(especie)}<span class="carta-mais">+${quantos}</span>${vezes > 1 ? `<span class="carta-vezes">×${vezes}</span>` : ""}`;
    return botao;
  });
  mao.replaceChildren(...cartas);
}

// O gráfico do ano: uma linha por espécie, as faixas da cheia e da seca e, apagado, o ano
// que não fechou na última tentativa.
function desenharGrafico() {
  const largura = grafico.clientWidth || 300;
  const altura = grafico.clientHeight || 80;
  const lista = mesesDa(estado.mapa);
  const especies = especiesNaFase();
  const MARGEM = { esquerda: 6, direita: 22, cima: 8, baixo: 6 };
  const teto = Math.max(MAXIMO.capim, ...estado.historia.flatMap((bando) => especies.map((e) => bando[e])));
  const x = (i: number) => MARGEM.esquerda + (i / lista.length) * (largura - MARGEM.esquerda - MARGEM.direita);
  const y = (valor: number) => altura - MARGEM.baixo - (valor / teto) * (altura - MARGEM.cima - MARGEM.baixo);
  const faixas = lista
    .map((mes, i) => `<rect class="faixa-${estacaoDoMes(mes)}" x="${x(i)}" y="0" width="${x(i + 1) - x(i)}" height="${altura}" />`)
    .join("");
  const linha = (historia: Bando[], especie: Especie, classe: string) =>
    `<polyline class="${classe}" stroke="${CORES[especie]}" points="${historia.map((bando, i) => `${x(i)},${y(bando[especie])}`).join(" ")}" />`;
  const anterior = estado.anterior ? especies.map((especie) => linha(estado.anterior!, especie, "linha-anterior")).join("") : "";
  const atuais = especies.map((especie) => linha(estado.historia, especie, "linha")).join("");
  const ultimo = estado.historia.at(-1)!;
  const pontas = especies
    .map((especie) => {
      const px = x(estado.historia.length - 1);
      return `<circle cx="${px}" cy="${y(ultimo[especie])}" r="3.5" fill="${CORES[especie]}" />`;
    })
    .join("");
  // As metas ficam na ponta direita, onde o ano termina.
  const alvos = especiesDa(estado.mapa)
    .map((especie) => `<path class="alvo" stroke="${CORES[especie]}" d="M${x(lista.length)} ${y(estado.mapa.metas[especie]!)} h10" />`)
    .join("");
  grafico.setAttribute("viewBox", `0 0 ${largura} ${altura}`);
  grafico.innerHTML = `${faixas}${anterior}${atuais}${pontas}${alvos}`;
}

function desenharTudo() {
  cena.dataset.estacao = estado.mes < estado.mapa.meses ? estacaoAgora(estado) : cena.dataset.estacao!;
  desenharMeses();
  desenharMetas();
  desenharCena(estado.bando);
  desenharMao();
  desenharGrafico();
}

const ESPERA = { chegou: 520, cresceu: 420, comeu: 520, saiu: 760, nasceu: 420 };

async function animarEvento(bando: Bando, evento: Evento) {
  const centro = (especie: Especie) => centroDe(zonas[especie]);
  if (evento.tipo === "chegou" || evento.tipo === "cresceu" || evento.tipo === "nasceu") {
    const antes = bando[evento.especie];
    bando[evento.especie] += evento.quantos;
    desenharZona(evento.especie, bando[evento.especie], antes);
    if (evento.tipo === "chegou") somChegou();
    else if (evento.tipo === "cresceu") somCresceu();
    else somNasceu();
    const texto = evento.tipo === "nasceu" ? "Filhote!" : `+${evento.quantos}`;
    flutuar(centro(evento.especie), texto, evento.tipo === "nasceu" ? "efeito-ouro" : "");
  }
  if (evento.tipo === "comeu") {
    somComeu();
    pular(zonas[evento.quem], 1.12);
    flutuar(centro(evento.comida), `−${evento.quantos}`);
    await esperar(200);
    bando[evento.comida] -= evento.quantos;
    desenharZona(evento.comida, bando[evento.comida]);
  }
  if (evento.tipo === "saiu") {
    somSaiu();
    const icones = [...zonas[evento.especie].querySelectorAll(".icone")].slice(-evento.quantos);
    icones.forEach((el) => el.classList.add("saindo"));
    flutuar(centro(evento.especie), "Tchau!");
    const foram = evento.quantos === 1 ? "ficou sem comida e foi embora" : "ficaram sem comida e foram embora";
    falar(`${evento.quantos} ${nome(evento.especie, evento.quantos)} ${foram}.`);
    await esperar(ESPERA.saiu - 200);
    bando[evento.especie] -= evento.quantos;
    desenharZona(evento.especie, bando[evento.especie]);
  }
  await esperar(ESPERA[evento.tipo]);
}

async function passarMesNaTela(indice: number) {
  if (travado) return;
  travar(true);
  falar("");
  const anterior = estado;
  const estacao = estacaoAgora(anterior);
  cena.dataset.estacao = estacao;
  if (estacao === "cheia") somChuva();
  else somSol();
  const jogada = jogar(estado, indice);
  // Enquanto o mês anima, a carta já saiu da mão.
  estado = { ...anterior, mao: anterior.mao.filter((_, i) => i !== indice) };
  desenharMao();
  travar(true);
  const bando = { ...anterior.bando };
  for (const evento of jogada.eventos) await animarEvento(bando, evento);
  estado = { ...anterior, mes: anterior.mes + 1, bando: jogada.bando, mao: estado.mao, historia: [...anterior.historia, jogada.bando] };
  desenharMeses();
  desenharGrafico();

  if (jogada.resultado === "mes") {
    estado = jogada.estado;
    travar(false);
    desenharTudo();
    if (!fala.textContent) falar(estacaoAgora(estado) !== estacao ? (estacaoAgora(estado) === "seca" ? "Começou a seca: o capim quase para de crescer." : "Voltou a cheia: chuva, capim e peixes!") : "");
    return;
  }
  if (jogada.resultado === "fase") return fecharAno(anterior, jogada.estado);
  perderAno(jogada.estado, jogada.faltam, jogada.resultado === "fim");
}

async function fecharAno(anterior: Estado, depois: Estado) {
  falar("O ano fechou com todo mundo lá!");
  cena.querySelectorAll(".zona:not([hidden]) .icone").forEach((el, i) =>
    animar(el, [{ translate: "0 0" }, { translate: "0 -10px" }, { translate: "0 0" }], 360 + (i % 5) * 60),
  );
  somVitoria();
  confete();
  await esperar(1300);
  estado = depois;
  moldura.placa(estado);
  moldura.salvar(estado);
  moldura.mostrar(
    telaFase({
      fase: anterior.fase,
      pontos: depois.pontos - anterior.pontos,
      perfeita: anterior.limpa,
      frase: anterior.limpa ? "De primeira e sem dica. O Pantanal agradece!" : "O Pantanal ficou em equilíbrio!",
    }),
  );
}

function explicarFalta(faltam: Especie[], bando: Bando) {
  const sumiram = faltam.filter((especie) => bando[especie] === 0);
  const poucos = faltam.filter((especie) => bando[especie] > 0);
  const frases = poucos.map(
    (especie) => `Ficaram ${bando[especie]} ${nome(especie, bando[especie])}, e o alvo era ${estado.mapa.metas[especie]}.`,
  );
  if (sumiram.length) frases.unshift(`Ficou sem ${sumiram.map((especie) => NOMES[especie][1]).join(" e sem ")}.`);
  return frases.join(" ");
}

async function perderAno(depois: Estado, faltam: Especie[], fim: boolean) {
  somAnoPerdido();
  const texto = explicarFalta(faltam, estado.bando);
  const perdeu = depois.vidas < estado.vidas;
  await esperar(900);
  estado = depois;
  moldura.placa(estado);
  if (fim) {
    moldura.fim(estado, "Os bichos se espalharam pelo Pantanal. Que tal outro ano?");
    return;
  }
  botaoDica.hidden = false;
  moldura.mostrar(
    telaTropeco({
      titulo: "O ano não fechou",
      texto: `${texto} O gráfico guarda esse ano apagadinho: veja em que mês tudo mudou e tente outra ordem.`,
      perdeuVida: perdeu,
    }),
  );
}

function telaRegras() {
  const especies = especiesNaFase();
  const regra: Record<Especie, string> = {
    capim: `Nasce ${CRESCE.cheia.capim} por mês na cheia e ${CRESCE.seca.capim} na seca. Cabem ${MAXIMO.capim}.`,
    peixe: `Nascem ${CRESCE.cheia.peixe} por mês na cheia e nenhum na seca. Cabem ${MAXIMO.peixe}.`,
    capivara: "Come 1 capim por mês. Com 2 ou mais capivaras, nasce 1 filhote por mês.",
    jacare: "Come 1 peixe por mês, antes da garça.",
    garca: "Come 1 peixe por mês, depois do jacaré.",
    onca: especies.includes("jacare") ? "Come 1 capivara por mês. Sem capivara, come 1 jacaré." : "Come 1 capivara por mês.",
  };
  const itens = especies
    .map((especie) => `<li>${icone(especie, "icone regra-icone")}<span><strong>${TITULOS[especie]}:</strong> ${regra[especie]}</span></li>`)
    .join("");
  return `<h2>Quem come quem?</h2>
    <ul class="regras">${itens}</ul>
    <p>Quem fica sem comida vai embora. Cada mês, uma carta chega antes de todo mundo comer.</p>
    <button class="botao" type="button" data-acao="seguir">Voltar ao Pantanal</button>`;
}

mao.addEventListener("click", (evento) => {
  const botao = (evento.target as HTMLElement).closest<HTMLButtonElement>(".carta");
  if (!botao || travado) return;
  const indice = estado.mao.findIndex((carta) => carta.especie === botao.dataset.especie);
  if (indice >= 0) passarMesNaTela(indice);
});

botaoRegras.addEventListener("click", () => {
  if (travado) return;
  lendoRegras = true;
  moldura.mostrar(telaRegras());
});

botaoDica.addEventListener("click", () => {
  if (travado) return;
  const indice = cartaDaDica(estado);
  estado = { ...estado, limpa: false };
  if (indice < 0) {
    falar("Daqui, nenhuma ordem fecha o ano. Termine este ano e tente outra ordem.");
    return;
  }
  const especie = estado.mao[indice].especie;
  const carta = mao.querySelector<HTMLElement>(`[data-especie="${especie}"]`);
  mao.querySelectorAll(".dica").forEach((el) => el.classList.remove("dica"));
  carta?.classList.add("dica");
  falar(`Experimente ${ACAO[especie].toLowerCase()} ${nome(especie, 2)} agora.`);
});

addEventListener("resize", () => desenharGrafico());

function prepararFase() {
  botaoDica.hidden = estado.anterior === null;
  moldura.placa(estado);
  travar(false);
  desenharTudo();
  if (estado.fase === 1 && estado.mes === 0) falar("Toque numa carta: ela chega e o mês passa.");
  else falar("");
}

function seguir() {
  if (lendoRegras) {
    lendoRegras = false;
    return;
  }
  const novidade = NOVIDADES[estado.fase];
  prepararFase();
  if (!novidade || novidadeVista === estado.fase) return;
  novidadeVista = estado.fase;
  travar(true);
  moldura.mostrar(telaNovidade({ titulo: novidade.titulo, texto: novidade.texto, miolo: icone(novidade.especie, "icone novidade-icone") }));
}

function comecar(fase: number) {
  estado = novoJogo(fase);
  novidadeVista = 0;
  seguir();
}
