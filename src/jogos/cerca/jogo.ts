import { porId } from "../kit/dom";
import { animar, centroDe, confete, estourar, flutuar, tremer } from "../kit/efeitos";
import { criarMoldura } from "../kit/moldura";
import { somVitoria } from "../kit/som";
import { telaFase } from "../kit/telas";
import { esperar } from "../kit/tempo";
import {
  abrirCerca,
  bichoDaCerca,
  cercar,
  cruzam,
  dica,
  entre,
  novoJogo,
  semLugar,
  ULTIMA_FASE_MANSA,
  type Estado,
  type Jogada,
  type Retangulo,
} from "./logica";
import { somAbriu, somCaiu, somCerca, somInvalida, somMedida, somPulo, somRisco } from "./sons";

type Casa = { x: number; y: number };

const BICHOS = ["🐄", "🐖", "🐑", "🐐", "🐔", "🦆", "🐎", "🐇"];
const CORES = ["#f6d365", "#f7b267", "#a8dadc", "#c9b6e4", "#f4a6b0", "#bde0a8"];
const PASSO_DO_POSTE = 0.035;
const PULO_FINAL = 130;

const campo = porId("campo");
const pasto = porId("pasto");
const camadaCercas = porId("cercas");
const camadaBichos = porId("bichos");
const previa = porId("previa");
const medidas = porId("medidas");
const trilha = porId("trilha");
const fala = porId("fala");
const botaoDica = porId("dica") as HTMLButtonElement;

const moldura = criarMoldura({ aoComecar: comecar, aoSeguir: prepararFase });

let estado: Estado = novoJogo();
let travado = true;
let bichosNaTela: HTMLElement[] = [];
let cercasNaTela: (HTMLElement | null)[] = [];
// O canto onde o dedo começou e a casa embaixo dele. Sem inicio, ninguém está cercando.
let inicio: Casa | null = null;
let atual: Casa = { x: 0, y: 0 };
let dedo: number | null = null;

function colocar(el: HTMLElement, { x, y, largura, altura }: Retangulo) {
  el.style.setProperty("--x", String(x));
  el.style.setProperty("--y", String(y));
  el.style.setProperty("--largura", String(largura));
  el.style.setProperty("--altura", String(altura));
}

function falar(texto: string) {
  fala.textContent = texto;
}

function travar(valor: boolean) {
  travado = valor;
  campo.dataset.pronto = valor ? "" : "1";
  botaoDica.disabled = valor;
}

function mostrarMedidas(texto: string) {
  medidas.textContent = texto || "Arraste no pasto";
  medidas.dataset.vazia = texto ? "" : "1";
}

function desenharTrilha() {
  const total = estado.mapa.bichos.length;
  const feitas = estado.cercas.filter(Boolean).length;
  trilha.setAttribute("aria-label", `${feitas} de ${total} bichos cercados`);
  trilha.replaceChildren(
    ...Array.from({ length: total }, (_, i) => {
      const marca = document.createElement("span");
      marca.className = i < feitas ? "marca feita" : "marca";
      return marca;
    }),
  );
}

function criarBicho(area: number, indice: number) {
  const bicho = document.createElement("span");
  bicho.className = "bicho";
  bicho.innerHTML = `<span class="bicho-figura" aria-hidden="true">${BICHOS[indice % BICHOS.length]}</span>`;
  const plaquinha = document.createElement("span");
  plaquinha.className = "plaquinha";
  plaquinha.textContent = String(area);
  bicho.append(plaquinha);
  return bicho;
}

function desenharPasto() {
  const { colunas, linhas, bichos } = estado.mapa;
  pasto.style.setProperty("--colunas", String(colunas));
  pasto.style.setProperty("--linhas", String(linhas));
  camadaCercas.replaceChildren();
  cercasNaTela = bichos.map(() => null);
  bichosNaTela = bichos.map(({ x, y, area }, i) => {
    const bicho = criarBicho(area, i);
    colocar(bicho, { x, y, largura: 1, altura: 1 });
    return bicho;
  });
  camadaBichos.replaceChildren(...bichosNaTela);
}

// Os cantos e os encontros da grade na volta da cerca, em ordem: é por onde os postes sobem.
function pontosDaVolta({ largura, altura }: Retangulo) {
  const pontos: Casa[] = [];
  for (let x = 0; x < largura; x++) pontos.push({ x, y: 0 });
  for (let y = 0; y < altura; y++) pontos.push({ x: largura, y });
  for (let x = largura; x > 0; x--) pontos.push({ x, y: altura });
  for (let y = altura; y > 0; y--) pontos.push({ x: 0, y });
  return pontos;
}

function montarCerca(retangulo: Retangulo, indice: number, classe = "") {
  const cerca = document.createElement("div");
  cerca.className = `cerca ${classe}`;
  cerca.style.setProperty("--cor", CORES[indice % CORES.length]);
  colocar(cerca, retangulo);
  const pontos = pontosDaVolta(retangulo);
  pontos.forEach(({ x, y }, i) => {
    const poste = document.createElement("span");
    poste.className = "poste";
    poste.style.left = `${(x / retangulo.largura) * 100}%`;
    poste.style.top = `${(y / retangulo.altura) * 100}%`;
    poste.style.animationDelay = `${i * PASSO_DO_POSTE}s`;
    cerca.append(poste);
  });
  camadaCercas.append(cerca);
  somCerca(pontos.length, PASSO_DO_POSTE);
  return cerca;
}

function levantarCerca(retangulo: Retangulo, bicho: number) {
  const cerca = montarCerca(retangulo, bicho);
  cercasNaTela[bicho] = cerca;
  const figura = bichosNaTela[bicho];
  figura.classList.add("cercado");
  animar(figura, [{ translate: "0 0" }, { translate: "0 -18px" }, { translate: "0 0" }], 340);
}

function derrubarCerca(bicho: number) {
  cercasNaTela[bicho]?.remove();
  cercasNaTela[bicho] = null;
  bichosNaTela[bicho].classList.remove("cercado");
}

// Tamanho errado: a cerca sobe, não aguenta e cai. Nada fica no pasto.
async function cercaCaindo(retangulo: Retangulo, bicho: number) {
  const cerca = montarCerca(retangulo, bicho, "caindo");
  tremer(bichosNaTela[bicho], 7);
  await esperar(480);
  somCaiu();
  cerca.classList.add("tombou");
  await esperar(360);
  cerca.remove();
}

function liberarDica() {
  botaoDica.hidden = false;
}

function avisarSeFaltaLugar() {
  const presos = semLugar(estado);
  if (presos.length === 0) return false;
  presos.forEach((bicho) => tremer(bichosNaTela[bicho], 5));
  falar("Esse bicho ficou sem lugar! Toque em uma cerca para abrir.");
  liberarDica();
  return true;
}

function depoisDeCercar() {
  desenharTrilha();
  if (avisarSeFaltaLugar()) return;
  falar("");
}

// Todos pulam, um atrás do outro, com o pasto inteiro cercado.
async function fecharPasto(anterior: Estado, depois: Estado) {
  travar(true);
  falar("O pasto ficou todo cercado!");
  for (const [ordem, bicho] of bichosNaTela.entries()) {
    somPulo(ordem * 2);
    animar(bicho, [{ translate: "0 0" }, { translate: "0 -26px" }, { translate: "0 0" }], 320);
    estourar(centroDe(bicho), ["#fff", "#ffc933"], 5, 44);
    await esperar(PULO_FINAL);
  }
  await esperar(240);
  somVitoria();
  confete();
  await esperar(1000);
  estado = depois;
  moldura.placa(estado);
  moldura.salvar(estado);
  moldura.mostrar(telaDaFase(anterior.fase, depois.pontos - anterior.pontos, anterior.limpa));
}

async function errarTamanho(jogada: Jogada, retangulo: Retangulo) {
  const anterior = estado;
  const bicho = jogada.bicho!;
  travar(true);
  estado = jogada.estado;
  falar(`Essa cerca é ${retangulo.largura} × ${retangulo.altura}, e a plaquinha pede ${anterior.mapa.bichos[bicho].area}.`);
  await cercaCaindo(retangulo, bicho);
  moldura.placa(estado);
  liberarDica();
  if (jogada.resultado === "fim") {
    moldura.fim(estado, "A cerca caiu de novo, e os bichos fugiram pelo pasto.");
    return;
  }
  travar(false);
}

function recusar(texto: string) {
  somInvalida();
  tremer(pasto, 4);
  falar(texto);
}

function fechar(retangulo: Retangulo) {
  const jogada = cercar(estado, retangulo);
  if (jogada.resultado === "vazia") return recusar("Não tem nenhum bicho aí dentro.");
  if (jogada.resultado === "dois") return recusar("Dois bichos na mesma cerca vão brigar!");
  if (jogada.resultado === "encostou") return recusar("Essa cerca passa por cima de outra.");
  if (jogada.resultado === "errada" || jogada.resultado === "fim") {
    errarTamanho(jogada, retangulo);
    return;
  }

  const bicho = jogada.bicho!;
  levantarCerca(retangulo, bicho);
  somMedida();
  flutuar(centroDe(bichosNaTela[bicho]), "Na medida!", "efeito-ouro");
  if (jogada.resultado === "fase") {
    trilha.querySelectorAll(".marca").forEach((marca) => marca.classList.add("feita"));
    fecharPasto(estado, jogada.estado);
    return;
  }
  estado = jogada.estado;
  depoisDeCercar();
}

function abrir(bicho: number) {
  somAbriu();
  derrubarCerca(bicho);
  estado = abrirCerca(estado, bicho);
  desenharTrilha();
  if (!avisarSeFaltaLugar()) falar("");
}

function casaDe({ clientX, clientY }: PointerEvent): Casa {
  const caixa = pasto.getBoundingClientRect();
  const { colunas, linhas } = estado.mapa;
  return {
    x: Math.min(colunas - 1, Math.max(0, Math.floor(((clientX - caixa.left) / caixa.width) * colunas))),
    y: Math.min(linhas - 1, Math.max(0, Math.floor(((clientY - caixa.top) / caixa.height) * linhas))),
  };
}

// Mostra os lados, nunca o total: multiplicar é o que a criança veio fazer aqui.
function desenharPrevia() {
  const retangulo = entre(inicio ?? atual, atual);
  colocar(previa, retangulo);
  previa.hidden = false;
  previa.dataset.ruim = estado.cercas.some((cerca) => cerca && cruzam(cerca, retangulo)) ? "1" : "";
  mostrarMedidas(inicio ? `${retangulo.largura} × ${retangulo.altura}` : "");
}

function largar() {
  inicio = null;
  dedo = null;
  previa.hidden = true;
  mostrarMedidas("");
}

function comecarCerca(casa: Casa) {
  inicio = casa;
  atual = casa;
  desenharPrevia();
}

function moverPara(casa: Casa) {
  if (casa.x === atual.x && casa.y === atual.y) return;
  atual = casa;
  somRisco();
  desenharPrevia();
}

// Um toque só abre a cerca que está ali. Fora dela, ainda não é uma cerca.
function soltar() {
  const retangulo = entre(inicio!, atual);
  const tocouUmaCasa = retangulo.largura === 1 && retangulo.altura === 1;
  const bicho = tocouUmaCasa ? bichoDaCerca(estado, atual) : -1;
  if (bicho >= 0) abrir(bicho);
  else if (tocouUmaCasa) falar("Arraste o dedo de um canto ao outro da cerca.");
  else fechar(retangulo);
  largar();
}

pasto.addEventListener("pointerdown", (evento) => {
  if (travado || dedo !== null) return;
  dedo = evento.pointerId;
  pasto.setPointerCapture(evento.pointerId);
  comecarCerca(casaDe(evento));
});

pasto.addEventListener("pointermove", (evento) => {
  if (evento.pointerId === dedo) moverPara(casaDe(evento));
});

pasto.addEventListener("pointerup", (evento) => {
  if (evento.pointerId === dedo) soltar();
});

// O navegador pode tomar o gesto sem avisar com pointerup: sem isto o dedo ficaria preso,
// e o pasto não aceitaria mais nenhum arrasto.
const desistir = (evento: PointerEvent) => {
  if (evento.pointerId === dedo) largar();
};
pasto.addEventListener("pointercancel", desistir);
pasto.addEventListener("lostpointercapture", desistir);

// Pelo teclado as setas andam pelo pasto, e Enter marca um canto de cada vez.
pasto.addEventListener("keydown", (evento) => {
  if (travado) return;
  const passo = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[evento.key];
  if (passo) {
    evento.preventDefault();
    const { colunas, linhas } = estado.mapa;
    moverPara({
      x: Math.min(colunas - 1, Math.max(0, atual.x + passo[0])),
      y: Math.min(linhas - 1, Math.max(0, atual.y + passo[1])),
    });
  }
  if (evento.key === "Enter" || evento.key === " ") {
    evento.preventDefault();
    if (inicio) soltar();
    else comecarCerca(atual);
  }
  if (evento.key === "Escape") largar();
});

pasto.addEventListener("blur", () => {
  if (dedo === null) largar();
});

botaoDica.addEventListener("click", () => {
  if (travado) return;
  const jogada = dica(estado);
  const certa = estado.mapa.solucao[jogada.bicho!];
  estado.cercas.forEach((cerca, bicho) => {
    if (cerca && (bicho === jogada.bicho || cruzam(cerca, certa))) derrubarCerca(bicho);
  });
  levantarCerca(certa, jogada.bicho!);
  if (jogada.resultado === "fase") {
    trilha.querySelectorAll(".marca").forEach((marca) => marca.classList.add("feita"));
    fecharPasto({ ...estado, limpa: false }, jogada.estado);
    return;
  }
  estado = jogada.estado;
  depoisDeCercar();
});

function prepararFase() {
  largar();
  atual = { x: 0, y: 0 };
  desenharPasto();
  desenharTrilha();
  moldura.placa(estado);
  botaoDica.hidden = true;
  if (estado.fase === 1) falar("Arraste o dedo para cercar cada bicho!");
  else if (estado.fase === ULTIMA_FASE_MANSA + 1) falar("Agora, cerca do tamanho errado custa um coração.");
  else falar("");
  travar(false);
}

function comecar(fase: number) {
  estado = novoJogo(fase);
  prepararFase();
}

function telaDaFase(concluida: number, bonus: number, limpa: boolean) {
  return telaFase({
    fase: concluida,
    pontos: bonus,
    perfeita: limpa,
    frase: limpa ? "Nenhuma cerca caiu. Trabalho de mestre!" : "Todo mundo no seu cantinho!",
  });
}
