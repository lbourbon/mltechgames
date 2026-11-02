import { porId } from "../kit/dom";
import { centroDe, confete, estourar, flutuar, pular, tremer } from "../kit/efeitos";
import { criarMoldura } from "../kit/moldura";
import { somVitoria } from "../kit/som";
import { esperar } from "../kit/tempo";
import {
  dica,
  energia,
  entradasDa,
  girar,
  novoJogo,
  toquesRestantes,
  ULTIMA_FASE_MANSA,
  type Energia,
  type Estado,
  type Jogada,
  type Peca,
} from "./logica";
import { somApagou, somFaisca, somGiro, somJanela, somLigou, somSobrecarga, somTravada } from "./sons";

// Os lados da peça em ordem: cima, direita, baixo e esquerda, no quadro de 100 por 100.
const PONTAS = ["M50 50 V0", "M50 50 H100", "M50 50 V100", "M50 50 H0"];
const CANTOS: Record<number, string> = {
  3: "M50 0 Q50 50 100 50",
  6: "M100 50 Q50 50 50 100",
  12: "M50 100 Q50 50 0 50",
  9: "M0 50 Q50 50 50 0",
};
const PASSO_DA_CORRENTE = 46;
const PASSO_DA_JANELA = 90;

const NOVIDADES: Record<number, { titulo: string; texto: string }> = {
  [ULTIMA_FASE_MANSA + 1]: {
    titulo: "Toques contados!",
    texto: "Agora os toques têm limite. Olhe bem para onde cada fio precisa apontar antes de girar.",
  },
  5: {
    titulo: "Chegou a fábrica!",
    texto: "A fábrica é grande e só liga com dois fios chegando nela, cada um por um lado.",
  },
  7: {
    titulo: "Chegou a bateria!",
    texto: "A bateria ajuda a usina, mas é fraquinha: o número mostra quantas casas ela aguenta. Se ligar mais do que isso, ela não dá conta!",
  },
};

const vila = porId("vila");
const tabuleiro = porId("tabuleiro");
const fala = porId("fala");
const contagem = porId("contagem");
const barraToques = porId("barra-toques");
const restam = porId("restam");
const palavra = porId("palavra");
const barra = porId("barra");
const botaoDica = porId("dica") as HTMLButtonElement;

const moldura = criarMoldura({ aoComecar: comecar, aoSeguir: seguir });

let estado: Estado = novoJogo();
let travado = true;
let novidadeVista = 0;
let pecasNaTela: HTMLElement[] = [];
// Quantos giros cada fio já deu na tela. Só cresce: assim ele nunca volta girando para trás.
let voltas: number[] = [];
let ligadasAntes = 0;
let sobrecargaAntes = 0;

const toques = (quantos: number) => (quantos === 1 ? "toque" : "toques");

function falar(texto: string) {
  fala.textContent = texto;
}

function travar(valor: boolean) {
  travado = valor;
  vila.dataset.pronta = valor ? "" : "1";
  botaoDica.disabled = valor;
}

function caminhoDo(bracos: number) {
  return CANTOS[bracos] ?? PONTAS.filter((_, lado) => bracos & (1 << lado)).join(" ");
}

function criarFio(peca: Peca, indice: number) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "peca fio";
  const caminho = caminhoDo(peca.bracos);
  botao.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true"><path class="fio-capa" d="${caminho}"></path><path class="fio-cobre" d="${caminho}"></path></svg>`;
  botao.addEventListener("click", () => tocar(indice));
  return botao;
}

function criarPredio(peca: Peca) {
  const el = document.createElement("div");
  el.className = `peca predio ${peca.tipo}`;
  el.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#${peca.tipo}"></use></svg>`;
  if (peca.tipo === "fabrica") {
    el.insertAdjacentHTML("beforeend", `<span class="tomadas" aria-hidden="true"><i></i><i></i></span>`);
  }
  if (peca.tipo === "bateria") {
    const carga = document.createElement("span");
    carga.className = "carga";
    carga.textContent = String(peca.carga);
    el.append(carga);
  }
  return el;
}

function criarPeca(peca: Peca, indice: number) {
  if (peca.tipo === "fio") return criarFio(peca, indice);
  if (peca.tipo !== "vazio") return criarPredio(peca);
  const el = document.createElement("div");
  el.className = "peca vazio";
  return el;
}

function rotuloDoFio(indice: number, viva: boolean) {
  const linha = Math.floor(indice / estado.mapa.colunas) + 1;
  const coluna = (indice % estado.mapa.colunas) + 1;
  return `Fio na linha ${linha}, coluna ${coluna}${viva ? ", com energia" : ""}`;
}

function desenharGiro(indice: number) {
  pecasNaTela[indice].querySelector("svg")!.style.rotate = `${voltas[indice] * 90}deg`;
}

function desenharEnergia({ passos, entradas, sobrecarga }: Energia) {
  estado.mapa.pecas.forEach((peca, indice) => {
    const el = pecasNaTela[indice];
    if (peca.tipo === "fio") {
      el.classList.toggle("viva", passos[indice] >= 0);
      el.setAttribute("aria-label", rotuloDoFio(indice, passos[indice] >= 0));
    }
    if (peca.tipo === "casa" || peca.tipo === "fabrica") {
      el.classList.toggle("ligada", entradas[indice] >= entradasDa(peca));
      el.dataset.entradas = String(Math.min(entradas[indice], entradasDa(peca)));
    }
    if (peca.tipo === "bateria") el.classList.toggle("fraca", sobrecarga.includes(indice));
  });
}

function desenharToques() {
  const limite = estado.mapa.toques;
  const faltam = toquesRestantes(estado);
  contagem.hidden = barraToques.hidden = faltam === null;
  if (faltam === null || limite === null) return;
  restam.textContent = String(faltam);
  palavra.textContent = toques(faltam);
  barra.style.width = `${(faltam / limite) * 100}%`;
  barra.dataset.pouco = faltam <= estado.mapa.menor ? "1" : "";
}

function desenharVila() {
  const { colunas, linhas, pecas } = estado.mapa;
  tabuleiro.style.setProperty("--colunas", String(colunas));
  tabuleiro.style.setProperty("--linhas", String(linhas));
  vila.dataset.acesa = "";
  pecasNaTela = pecas.map(criarPeca);
  voltas = [...estado.giros];
  pecas.forEach((peca, indice) => {
    if (peca.tipo === "fio") desenharGiro(indice);
  });
  tabuleiro.replaceChildren(...pecasNaTela);
}

// Festa pequena a cada casa nova, e a dica aparece para quem está girando há muito tempo.
function reagir(atual: Energia, indice: number) {
  if (atual.acesas > ligadasAntes) {
    somLigou();
    estourar(centroDe(pecasNaTela[indice]), ["#ffc933", "#fff"], 6, 44);
  }
  if (atual.sobrecarga.length > sobrecargaAntes) {
    somSobrecarga();
    falar("A bateria não aguenta tanta casa!");
    atual.sobrecarga.forEach((bateria) => tremer(pecasNaTela[bateria], 5));
  } else if (atual.sobrecarga.length === 0 && fala.textContent) {
    falar("");
  }
  ligadasAntes = atual.acesas;
  sobrecargaAntes = atual.sobrecarga.length;
  if (estado.gastos > estado.mapa.menor * 2 + 2) botaoDica.hidden = false;
}

function aplicar(jogada: Jogada) {
  estado = jogada.estado;
  const atual = energia(estado.mapa, estado.giros);
  desenharEnergia(atual);
  desenharToques();
  reagir(atual, jogada.indice!);
}

function tocar(indice: number) {
  if (travado) return;
  const anterior = estado;
  const jogada = girar(estado, indice);
  if (jogada.resultado === "parada") {
    somTravada();
    pular(pecasNaTela[indice], 1.08);
    falar("Essa peça encaixa de qualquer jeito.");
    return;
  }

  somGiro();
  voltas[indice]++;
  desenharGiro(indice);
  if (jogada.resultado === "fase") {
    terminarFase(anterior, jogada, anterior.giros.map((giro, i) => (i === indice ? (giro + 1) % 4 : giro)));
    return;
  }
  if (jogada.resultado === "apagou" || jogada.resultado === "fim") {
    apagar(jogada);
    return;
  }
  aplicar(jogada);
}

// A corrente corre pelos fios, e as janelas acendem uma atrás da outra.
async function correrCorrente(anterior: Estado, giros: number[]) {
  const { mapa } = anterior;
  const { passos, entradas } = energia(mapa, giros);
  const pecas = mapa.pecas.flatMap((peca, indice) => (peca.tipo === "fio" ? [indice] : []));
  const maior = Math.max(...pecas.map((indice) => passos[indice]));
  for (let passo = 0; passo <= maior; passo++) {
    pecas.filter((indice) => passos[indice] === passo).forEach((indice) => pecasNaTela[indice].classList.add("corrente"));
    somFaisca(passo);
    await esperar(PASSO_DA_CORRENTE);
  }
  const casas = mapa.pecas.flatMap((_, indice) => (entradas[indice] > 0 ? [indice] : []));
  for (const [ordem, indice] of casas.entries()) {
    pecasNaTela[indice].classList.add("acesa");
    somJanela(ordem);
    estourar(centroDe(pecasNaTela[indice]), ["#ffc933", "#fff3b0", "✨"], 8, 56);
    await esperar(PASSO_DA_JANELA);
  }
}

function ficouPerfeita(anterior: Estado, depois: Estado) {
  return depois.pontos - anterior.pontos === anterior.fase * 15;
}

async function terminarFase(anterior: Estado, jogada: Jogada, giros: number[]) {
  travar(true);
  falar("Luz na vila inteira!");
  desenharEnergia(energia(anterior.mapa, giros));
  await esperar(160);
  await correrCorrente(anterior, giros);
  vila.dataset.acesa = "1";
  somVitoria();
  confete();
  const perfeita = ficouPerfeita(anterior, jogada.estado);
  if (perfeita) flutuar(centroDe(tabuleiro), "Sem nenhum toque a mais!", "efeito-ouro");
  await esperar(1200);
  estado = jogada.estado;
  moldura.placa(estado);
  moldura.salvar(estado);
  moldura.mostrar(telaFase(anterior.fase, estado.pontos - anterior.pontos, perfeita));
}

async function apagar(jogada: Jogada) {
  travar(true);
  somApagou();
  tremer(tabuleiro, 6);
  vila.dataset.apagao = "1";
  falar("Acabaram os toques!");
  await esperar(900);
  vila.dataset.apagao = "";
  estado = jogada.estado;
  moldura.placa(estado);
  if (jogada.resultado === "fim") {
    moldura.fim(estado, "A vila ficou no escuro, e todo mundo foi dormir mais cedo.");
    return;
  }
  moldura.mostrar(telaApagou());
}

botaoDica.addEventListener("click", () => {
  if (travado) return;
  const anterior = estado;
  const jogada = dica(estado);
  const indice = jogada.indice!;
  somGiro();
  voltas[indice] += (4 - (anterior.giros[indice] % 4)) % 4;
  desenharGiro(indice);
  pular(pecasNaTela[indice], 1.15);
  if (jogada.resultado === "fase") {
    terminarFase(anterior, jogada, anterior.giros.map((giro, i) => (i === indice ? 0 : giro)));
    return;
  }
  aplicar(jogada);
});

function prepararVila() {
  desenharVila();
  const atual = energia(estado.mapa, estado.giros);
  desenharEnergia(atual);
  ligadasAntes = atual.acesas;
  sobrecargaAntes = atual.sobrecarga.length;
  desenharToques();
  moldura.placa(estado);
  botaoDica.hidden = estado.limpa;
  falar(estado.fase === 1 ? "Toque nos fios para girar!" : "");
  travar(false);
}

function seguir() {
  const novidade = NOVIDADES[estado.fase];
  prepararVila();
  if (!novidade || novidadeVista === estado.fase) return;
  novidadeVista = estado.fase;
  travar(true);
  moldura.mostrar(telaNovidade(novidade.titulo, novidade.texto));
}

function comecar(fase: number) {
  estado = novoJogo(fase);
  novidadeVista = 0;
  seguir();
}

function telaNovidade(titulo: string, texto: string) {
  return `<h2>${titulo}</h2>
    <p>${texto}</p>
    <button class="botao" type="button" data-acao="seguir">Continuar</button>`;
}

function telaFase(concluida: number, bonus: number, perfeita: boolean) {
  return `<h2>Fase ${concluida} completa!</h2>
    <p class="placar">+${bonus} pontos</p>
    <p>${perfeita ? "Nenhum toque desperdiçado!" : "A vila inteira agradece!"}</p>
    <button class="botao" type="button" data-acao="seguir">Continuar</button>`;
}

function telaApagou() {
  return `<h2>Apagão!</h2>
    <p>Os toques acabaram e você perdeu uma vida. A vila é a mesma: agora você já sabe para onde os fios precisam apontar.</p>
    <button class="botao" type="button" data-acao="seguir">Tentar de novo</button>`;
}
