import { aoTocar, porId } from "../kit/dom";
import { centroDe, confete, estourar, flutuar, pular, tremer } from "../kit/efeitos";
import { criarMoldura } from "../kit/moldura";
import { somVitoria } from "../kit/som";
import { estrelas, telaNovidade } from "../kit/telas";
import { criarLaco, esperar } from "../kit/tempo";
import {
  desenharCasa,
  desenharCrianca,
  desenharPinheiro,
  desenharPresente,
  desenharRena,
  desenharSino,
  desenharTreno,
  ICONES,
} from "./desenho";
import {
  camera,
  CHAO,
  comprar,
  encerrar,
  espacoDaFila,
  filasDoTime,
  novoJogo,
  passo,
  pintar,
  precoDe,
  prepararNoite,
  tamanhoDaRena,
  ULTIMA_FASE,
  ULTIMA_FASE_MANSA,
  usarTreno,
  type Casa,
  type Compra,
  type Estado,
  type Evento,
  type Grupo,
  type Presente,
  type Resultado,
} from "./logica";
import { MELHORIAS, MELHORIAS_IDS, MODELOS, PINTURAS, TRENOS, type MelhoriaId, type TrenoId } from "./oficina";
import { somAmanheceu, somCaiu, somCompra, somEntregou, somErrou, somFalta, somFugiu, somRena, somSoltou } from "./sons";

const SVG = "http://www.w3.org/2000/svg";
// A faixa de morros ao longe se repete a cada FAIXA unidades e anda mais devagar que as casas.
const FAIXA = 240;
const PARALAXE = 0.3;

const NO_DEDO = matchMedia("(pointer: coarse)").matches;
const DICAS = [
  NO_DEDO ? "Arraste o dedo no céu para subir e descer." : "Use as setas para cima e para baixo para voar.",
  "Voe até a rena com o resultado da conta lá em cima!",
  NO_DEDO
    ? "Agora toque no 🎁 um pouco antes da chaminé!"
    : "Agora aperte espaço um pouco antes da chaminé para jogar o presente!",
];

// A estreia de cada novidade, antes da noite começar.
const NOVIDADES: Record<number, string> = {
  2: "Números iguais: 6 + 6!",
  [ULTIMA_FASE_MANSA + 1]:
    "Contas que passam do 10, e o time agora tem 6 renas. Cuidado: pegar a rena errada assusta uma rena do time!",
  5: "Time de 8 renas! E chegam as contas de dez em dez.",
  6: "Dezenas com mais um pouquinho: 40 + 3!",
  8: "Números de dois algarismos!",
  9: "Contas com três números!",
  11: "Números de dois algarismos que passam da dezena!",
  12: "Contas de cinco em cinco!",
  [ULTIMA_FASE]: "Noite de Natal! Tem conta de todo jeito. Cumpra a meta e você zera o Trenó de Natal!",
};

const cena = porId("cena");
const mundo = porId("mundo") as unknown as SVGSVGElement;
const lua = porId("lua");
const sol = porId("sol");
const longe = porId("longe");
const mundoMovel = porId("mundo-movel");
const camadaPinheiros = porId("pinheiros");
const camadaCasas = porId("casas");
const camadaPresentes = porId("presentes");
const camadaGrupos = porId("grupos");
const camadaTime = porId("time");
const barraDaNoite = porId("noite-barra");
const relogio = porId("noite");
const contagemDeRenas = porId("time-renas");
const conta = porId("conta");
const aviso = porId("aviso");
const entregas = porId("entregas");
const botaoSoltar = porId("soltar");
const contaDoSaco = porId("saco");
const carteira = porId("moedas");
const painel = porId("painel");
const palco = cena.closest<HTMLElement>(".jogo")!;

const moldura = criarMoldura({ aoComecar: comecar, aoSeguir: seguir });
const laco = criarLaco(quadro);

let estado: Estado = novoJogo(1, largura());
let voando = false;
let novidadeVista = 0;
let alturaPedida: number | null = null;
let dedo: number | null = null;
let soltarPedido = false;
let dica = -1;
let timerAviso = 0;
let moedasNoInicio = 0;
let assinaturaDoTime = "";
let textoDaConta = "";
let selecionado: Compra | null = null;
let avisoDaOficina = "";
let ultimaCasa: Casa | null = null;
const teclas = new Set<string>();
const casasNaTela = new Map<number, SVGGElement>();
const pinheirosNaTela = new Map<number, SVGGElement>();
const presentesNaTela = new Map<number, SVGGElement>();
let grupoNaTela: { grupo: Grupo; el: SVGGElement; membros: SVGGElement[] } | null = null;

function grupo(conteudo: string, classe = "") {
  const g = document.createElementNS(SVG, "g");
  if (classe) g.setAttribute("class", classe);
  g.innerHTML = conteudo;
  return g;
}

const mover = (el: Element, x: number, y: number) => el.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);

// A cena tem 100 unidades de altura, e a largura acompanha a tela.
function largura() {
  const { clientWidth, clientHeight } = cena;
  return clientHeight > 0 ? (100 * clientWidth) / clientHeight : 90;
}

function ajustarTela() {
  const l = largura();
  mundo.setAttribute("viewBox", `0 0 ${l.toFixed(2)} 100`);
  estado.noite.largura = l;
}

new ResizeObserver(ajustarTela).observe(cena);

// De um ponto do mundo para o palco, onde os efeitos do kit desenham.
function noPalco(x: number, y: number) {
  const matriz = mundo.getScreenCTM();
  const caixa = palco.getBoundingClientRect();
  if (!matriz) return { x: 0, y: 0 };
  const ponto = new DOMPoint(x - camera(estado.noite), y).matrixTransform(matriz);
  return { x: ponto.x - caixa.left, y: ponto.y - caixa.top };
}

// Um aviso com prazo volta para a dica da vez, se ainda houver uma.
function avisar(texto: string, ms = 0) {
  aviso.textContent = texto;
  clearTimeout(timerAviso);
  if (ms) timerAviso = window.setTimeout(() => (aviso.textContent = DICAS[dica] ?? ""), ms);
}

// As dicas da primeira noite vêm em ordem e nunca voltam.
function mostrarDica(qual: number) {
  if (estado.fase !== 1 || qual <= dica) return;
  dica = qual;
  avisar(DICAS[qual]);
}

function apagarDicas() {
  if (dica >= DICAS.length) return;
  dica = DICAS.length;
  avisar("");
}

// Casas e pinheiros
function desenharCasas() {
  const { casas } = estado.noite;
  const vivas = new Set(casas.map((casa) => casa.id));
  for (const casa of casas) {
    if (casasNaTela.has(casa.id)) continue;
    const el = grupo(desenharCasa(casa, CHAO), "casa");
    camadaCasas.append(el);
    casasNaTela.set(casa.id, el);
    // Um pinheiro no vão entre esta casa e a anterior, quando cabe.
    if (ultimaCasa) {
      const inicio = ultimaCasa.x + ultimaCasa.largura;
      const vao = casa.x - inicio;
      if (vao >= 9) {
        const pinheiro = grupo(desenharPinheiro(inicio + vao / 2, CHAO, Math.min(16, vao * 0.9)));
        camadaPinheiros.append(pinheiro);
        pinheirosNaTela.set(casa.id, pinheiro);
      }
    }
    ultimaCasa = casa;
  }
  for (const [id, el] of casasNaTela) {
    if (vivas.has(id)) continue;
    el.remove();
    casasNaTela.delete(id);
    pinheirosNaTela.get(id)?.remove();
    pinheirosNaTela.delete(id);
  }
}

function limparMundo() {
  [camadaCasas, camadaPinheiros, camadaPresentes, camadaGrupos, camadaTime].forEach((camada) => camada.replaceChildren());
  casasNaTela.clear();
  pinheirosNaTela.clear();
  presentesNaTela.clear();
  grupoNaTela = null;
  ultimaCasa = null;
  assinaturaDoTime = "";
  textoDaConta = "";
}

// Presentes caindo
function desenharPresentes() {
  const { presentes } = estado.noite;
  const vivos = new Set(presentes.map((presente) => presente.id));
  for (const presente of presentes) {
    let el = presentesNaTela.get(presente.id);
    if (!el) {
      el = grupo(`<g class="girando">${desenharPresente(presente.jeito)}</g>`, "presente");
      camadaPresentes.append(el);
      presentesNaTela.set(presente.id, el);
    }
    mover(el, presente.x, presente.y);
  }
  for (const [id, el] of presentesNaTela) {
    if (vivos.has(id)) continue;
    el.remove();
    presentesNaTela.delete(id);
  }
}

// Renas soltas: voam viradas para o trenó, com o número no sino.
function desenharGrupo() {
  const atual = estado.noite.grupo;
  if (!atual) return;
  if (grupoNaTela?.grupo !== atual) {
    const el = grupo("", "grupo");
    const membros = atual.membros.map((rena, i) => {
      const membro = grupo(
        `<g class="bate-asa" style="animation-delay:${i * 0.2}s">
          <g transform="scale(-1 1)">${desenharRena(rena.jeito)}</g>
          <g transform="translate(-6 0)">${desenharSino(rena.valor)}</g>
        </g>`,
        "solta",
      );
      mover(membro, 0, rena.y);
      el.append(membro);
      return membro;
    });
    camadaGrupos.append(el);
    grupoNaTela = { grupo: atual, el, membros };
  }
  mover(grupoNaTela.el, atual.x, 0);
}

// Tira o grupo da tela: a rena pega some no time, e as outras voam para longe.
function despedirGrupo(pega: number | null) {
  if (!grupoNaTela) return;
  const { el, membros } = grupoNaTela;
  membros.forEach((membro, i) => {
    if (i === pega) membro.remove();
    else membro.classList.add("fugindo");
  });
  grupoNaTela = null;
  setTimeout(() => el.remove(), 900);
}

// O time: as renas em pares e o trenó atrás. A origem é a ponta do time.
function montarTime() {
  const { noite, oficina } = estado;
  const esp = espacoDaFila(oficina);
  const t = tamanhoDaRena(oficina);
  const n = filasDoTime(noite);
  const frente = -n * esp;
  const centro = (k: number) => frente + (k + 0.5) * esp;
  const partes: string[] = [];

  // As rédeas, das mãos do Papai Noel até a fila da frente.
  if (n) {
    const pontos = [`${frente + 1} -2.6`, ...Array.from({ length: n }, (_, k) => `${centro(k) + 2.6 * t} ${-2.2 * t}`)];
    partes.push(`<polyline class="redea" points="${pontos.join(" ")}"/>`);
  }

  // Numa fila, a rena de trás fica um pouco acima e atrás.
  for (let k = 0; k < n; k++) {
    const par = noite.renas.slice(k * 2, k * 2 + 2);
    const renas = par
      .map((rena, j) => ({ rena, j }))
      .reverse()
      .map(({ rena, j }) => `<g transform="translate(${j} ${-j * 1.6})" class="${j ? "de-tras" : ""}">${desenharRena(rena.jeito, t)}</g>`)
      .join("");
    partes.push(
      `<g transform="translate(${centro(k).toFixed(2)} 0)"><g class="galope" style="animation-delay:${(k * 0.17).toFixed(2)}s">${renas}</g></g>`,
    );
  }

  partes.push(`<g transform="translate(${frente.toFixed(2)} 0)">${desenharTreno(oficina.treno, oficina.cor, oficina.niveis.saco)}</g>`);
  camadaTime.innerHTML = `<g class="time">${partes.join("")}</g>`;
}

function desenharTime() {
  const { noite, oficina } = estado;
  const assinatura = [
    noite.renas.map((rena) => rena.jeito).join(","),
    oficina.treno,
    oficina.cor,
    oficina.niveis.saco,
    oficina.niveis.renas,
  ].join("|");
  if (assinatura !== assinaturaDoTime) {
    assinaturaDoTime = assinatura;
    montarTime();
  }
  mover(camadaTime, noite.x, noite.y);
}

// Chamando as renas, a conta e quantas renas já vieram. Na entrega, só o relógio da noite.
function desenharConta() {
  const { noite } = estado;
  const chamando = noite.modo === "renas";
  relogio.hidden = chamando;
  contagemDeRenas.hidden = !chamando;
  contagemDeRenas.textContent = `🦌 ${noite.renas.length}/${noite.config.renas}`;
  const { parcelas } = noite.conta;
  const texto = chamando
    ? `${parcelas.map((n) => `<span class="conta-numero">${n}</span>`).join("<b>+</b>")}<b>=</b><span class="conta-sino conta-falta">?</span>`
    : "";
  if (texto === textoDaConta) return;
  textoDaConta = texto;
  conta.innerHTML = texto;
  if (!texto) return;
  conta.setAttribute("aria-label", `Quanto é ${parcelas.join(" mais ")}?`);
  pular(conta, 1.12);
}

function desenharPlaca() {
  const { noite } = estado;
  entregas.textContent = `🏠 ${noite.entregues}/${noite.config.meta}`;
  entregas.classList.toggle("cumprida", noite.entregues >= noite.config.meta);
  contaDoSaco.textContent = String(noite.saco);
  botaoSoltar.classList.toggle("vazio", noite.saco === 0 || noite.modo === "renas");
  carteira.textContent = `💰 ${estado.moedas}`;
}

function desenharCeu() {
  const { noite } = estado;
  const progresso = Math.min(1, noite.tempo / noite.config.noite);
  const l = noite.largura;
  barraDaNoite.style.width = `${((1 - progresso) * 100).toFixed(1)}%`;
  // O céu clareia no último terço da noite, a lua desce e o sol aparece.
  const dia = Math.max(0, (progresso - 0.65) / 0.35);
  cena.style.setProperty("--dia", dia.toFixed(3));
  mover(lua, l - 14, 14 + progresso * 34);
  mover(sol, 14, 100 + 8 - dia * 34);
  const cam = camera(noite);
  mover(longe, -((cam * PARALAXE) % FAIXA), 0);
  mover(mundoMovel, -cam, 0);
}

function desenharTudo() {
  desenharCeu();
  desenharCasas();
  desenharGrupo();
  desenharPresentes();
  desenharTime();
  desenharConta();
  desenharPlaca();
}

// Reações aos eventos da noite
function pegou({ grupo: g, rena }: Extract<Evento, { tipo: "pegou" }>) {
  despedirGrupo(g.membros.indexOf(rena));
  const ponta = noPalco(estado.noite.x, estado.noite.y);
  estourar(ponta, ["✨", "#ffc933", "#fff"], 10, 70);
  flutuar(ponta, "Mais uma rena!", "efeito-ouro");
  pular(contagemDeRenas, 1.25);
  somRena();
  moldura.placa(estado);
}

function errou({ rena, fugiu }: Extract<Evento, { tipo: "errou" }>) {
  despedirGrupo(null);
  const ponta = noPalco(estado.noite.x, estado.noite.y);
  flutuar(ponta, `${rena.valor}?`, "efeito-erro");
  tremer(cena, 5);
  somErrou();
  if (fugiu) {
    somFugiu();
    pular(contagemDeRenas, 1.25);
    avisar("Essa não era! Uma rena se assustou. Tente de novo.", 2600);
  } else {
    avisar("Essa não era! Tente de novo.", 2000);
  }
}

// O time está completo: as contas somem e começa a entrega.
function completo() {
  somVitoria();
  confete(30);
  if (estado.fase === 1) mostrarDica(2);
  else avisar("Time completo! Agora jogue os presentes nas chaminés.", 3000);
}

function entregou({ casa, meta }: Extract<Evento, { tipo: "entregou" }>) {
  const el = casasNaTela.get(casa.id);
  if (el) {
    el.classList.add("servida");
    const crianca = el.querySelector(".crianca");
    if (crianca) crianca.innerHTML = desenharCrianca(casa.id);
  }
  const chamine = noPalco(casa.chamine, casa.topoDaChamine);
  estourar(chamine, ["⭐", "#ffc933", "#ff5a5f"], 8, 50);
  // Corações saindo da criança, que aparece na porta pulando.
  const crianca = el?.querySelector(".crianca");
  if (crianca) estourar(centroDe(crianca), ["💛", "💖", "⭐"], 8, 45);
  flutuar(chamine, "+10 💰", "efeito-ouro");
  pular(carteira, 1.2);
  pular(entregas, 1.2);
  somEntregou();
  if (dica === DICAS.length - 1) apagarDicas();
  moldura.placa(estado);
  if (meta) {
    somVitoria();
    avisar("Meta cumprida! Continue entregando até o sol nascer.", 2600);
  }
}

function caiu(presente: Presente) {
  estourar(noPalco(presente.x, presente.y), ["#fff", "#e6eefc"], 6, 24);
  somCaiu();
}

function reagir(evento: Evento) {
  if (evento.tipo === "grupo") mostrarDica(1);
  if (evento.tipo === "pegou") pegou(evento);
  if (evento.tipo === "errou") errou(evento);
  if (evento.tipo === "completo") completo();
  if (evento.tipo === "passou") despedirGrupo(null);
  if (evento.tipo === "soltou") somSoltou();
  if (evento.tipo === "entregou") entregou(evento);
  if (evento.tipo === "caiu") caiu(evento.presente);
  if (evento.tipo === "amanheceu") amanheceu();
}

// Comandos
function alturaDoComando() {
  const { y } = estado.noite;
  if (teclas.has("ArrowUp")) alturaPedida = y - 12;
  else if (teclas.has("ArrowDown")) alturaPedida = y + 12;
  return alturaPedida;
}

function quadro(dt: number) {
  const comando = { altura: alturaDoComando(), soltar: soltarPedido };
  const esperandoRecarga = estado.noite.recarga > 0;
  soltarPedido = false;
  const eventos = passo(estado, comando, dt);
  desenharTudo();
  // O presente não sai sem uma chaminé chegando: o botão balança para avisar.
  if (comando.soltar && !esperandoRecarga && !eventos.some((evento) => evento.tipo === "soltou")) {
    tremer(botaoSoltar, 4);
    if (estado.noite.modo === "renas") avisar("Primeiro chame todas as renas!", 1600);
  }
  eventos.forEach(reagir);
}

function apontar(evento: PointerEvent) {
  const caixa = cena.getBoundingClientRect();
  alturaPedida = ((evento.clientY - caixa.top) / caixa.height) * 100;
  if (dica === 0) mostrarDica(1);
}

cena.addEventListener("pointerdown", (evento) => {
  if (!voando || dedo !== null) return;
  evento.preventDefault();
  dedo = evento.pointerId;
  cena.setPointerCapture(evento.pointerId);
  apontar(evento);
});
cena.addEventListener("pointermove", (evento) => {
  if (evento.pointerId === dedo) apontar(evento);
});
const soltarDedo = (evento: PointerEvent) => {
  if (evento.pointerId === dedo) dedo = null;
};
cena.addEventListener("pointerup", soltarDedo);
cena.addEventListener("pointercancel", soltarDedo);
cena.addEventListener("lostpointercapture", soltarDedo);

aoTocar(botaoSoltar, () => {
  if (!voando) return;
  soltarPedido = true;
  pular(botaoSoltar, 1.1);
});

document.addEventListener("keydown", (evento) => {
  if (!voando || evento.altKey || evento.ctrlKey || evento.metaKey) return;
  if (evento.key === " ") {
    evento.preventDefault();
    if (!evento.repeat) soltarPedido = true;
    return;
  }
  if (evento.key !== "ArrowUp" && evento.key !== "ArrowDown") return;
  evento.preventDefault();
  teclas.add(evento.key);
  if (dica === 0) mostrarDica(1);
});
document.addEventListener("keyup", (evento) => teclas.delete(evento.key));
window.addEventListener("blur", () => teclas.clear());

// Começo e fim da noite
function prepararCena() {
  limparMundo();
  ajustarTela();
  alturaPedida = null;
  dica = -1;
  avisar("");
  moedasNoInicio = estado.moedas;
  desenharTudo();
  moldura.placa(estado);
}

function voar() {
  voando = true;
  teclas.clear();
  dedo = null;
  cena.focus({ preventScroll: true });
  mostrarDica(0);
  laco.ligar();
}

function parar() {
  voando = false;
  laco.desligar();
  teclas.clear();
  dedo = null;
}

async function amanheceu() {
  parar();
  const ganho = estado.moedas - moedasNoInicio;
  const faseDaNoite = estado.fase;
  const resultado = encerrar(estado);
  moldura.placa(estado);
  somAmanheceu();
  if (resultado.passou) confete();
  await esperar(900);
  if (resultado.zerou) {
    moldura.fim(estado, `Você entregou ${resultado.entregues} presentes na Noite de Natal e terminou com ${estado.moedas} moedas.`, {
      titulo: "🎄 Feliz Natal! Você zerou o Trenó de Natal!",
      html: `<p class="festa-final" aria-hidden="true">🦌🛷🎁🏠🎄</p>`,
    });
    return;
  }
  if (resultado.passou) {
    moldura.salvar(estado);
    moldura.mostrar(telaNoite(resultado, faseDaNoite, ganho));
    return;
  }
  if (estado.vidas <= 0) {
    moldura.fim(estado, "O sol nasceu antes de o trenó terminar as entregas.");
    return;
  }
  moldura.mostrar(telaAmanheceu(resultado, ganho));
}

const resumo = (ganho: number) =>
  `<p class="placar">+${ganho} 💰</p><p>Agora você tem <strong>${estado.moedas} moedas</strong>.</p>`;

const botoes = (seguirTexto: string) =>
  `<button class="botao botao-claro" type="button" data-acao="oficina">🔧 Oficina</button>
   <button class="botao" type="button" data-acao="seguir">${seguirTexto}</button>`;

function telaNoite({ entregues, perfeita }: Resultado, fase: number, ganho: number) {
  return `${estrelas(perfeita)}
    <h2>Noite ${fase} completa!</h2>
    <p>Você entregou <strong>${entregues}</strong> presentes.</p>
    ${resumo(ganho)}
    ${perfeita ? "<p>Nenhuma rena errada!</p>" : ""}
    ${botoes("Próxima noite")}`;
}

function telaAmanheceu({ entregues, meta, perdeuVida }: Resultado, ganho: number) {
  const { noite } = estado;
  const dica =
    noite.saco === 0
      ? "Os presentes acabaram! Jogue um pouco antes da chaminé: ele cai andando junto com o trenó."
      : estado.oficina.niveis.renas === 0 && estado.moedas >= 100
        ? "Na oficina, renas fortes e trenós melhores voam mais rápido e passam por mais casas!"
        : "Jogue o presente um pouco antes da chaminé: ele cai andando junto com o trenó.";
  return `<div class="emblema emblema-tropeco" aria-hidden="true">${perdeuVida ? "💔" : "🌅"}</div>
    <h2>${noite.saco === 0 ? "O saco ficou vazio!" : "O sol nasceu!"}</h2>
    <p>Você entregou ${entregues} de ${meta} presentes.${perdeuVida ? " Você perdeu um coração." : ""}</p>
    <p>${dica}</p>
    ${resumo(ganho)}
    ${botoes("Tentar de novo")}`;
}

// Oficina dos duendes: um painel do kit, e só o miolo é redesenhado a cada toque.
function cartaoTreno(id: TrenoId) {
  const { oficina } = estado;
  const treno = TRENOS[id];
  const seu = oficina.trenos.includes(id);
  const usando = oficina.treno === id;
  const escolhido = selecionado?.tipo === "treno" && selecionado.id === id;
  const etiqueta = usando ? "Usando" : seu ? "Seu" : `💰 ${treno.preco}`;
  const classes = ["cartao", usando && "usando", seu && "seu", escolhido && "escolhido"].filter(Boolean).join(" ");
  const rapidez = Math.round((treno.base / TRENOS.foguete.base) * 100);
  return `<button class="${classes}" type="button" data-acao="treno" data-id="${id}">
    <svg class="foto" viewBox="-19 -15 24 22" aria-hidden="true">${desenharTreno(id, usando ? oficina.cor : treno.cor)}</svg>
    <strong>${treno.nome}</strong>
    <span class="rapidez" style="--rapidez: ${rapidez}%" aria-label="Rapidez ${rapidez} de 100"></span>
    <span class="etiqueta">${etiqueta}</span>
  </button>`;
}

function cartaoMelhoria(id: MelhoriaId) {
  const { nome, texto, precos } = MELHORIAS[id];
  const nivel = estado.oficina.niveis[id];
  const preco = precoDe(estado.oficina, { tipo: "melhoria", id });
  const escolhido = selecionado?.tipo === "melhoria" && selecionado.id === id;
  const pontos = precos.map((_, i) => `<span class="${i < nivel ? "nivel cheio" : "nivel"}"></span>`).join("");
  return `<button class="cartao cartao-melhoria${escolhido ? " escolhido" : ""}${preco === null ? " completo" : ""}" type="button" data-acao="melhoria" data-id="${id}">
    <svg class="icone" viewBox="-12 -12 24 24" aria-hidden="true">${ICONES[id]}</svg>
    <span class="sobre"><strong>${nome}</strong><small>${texto}</small><span class="niveis" aria-label="Nível ${nivel} de ${precos.length}">${pontos}</span></span>
    <span class="etiqueta">${preco === null ? "Completo" : `💰 ${preco}`}</span>
  </button>`;
}

const nomeDe = (compra: Compra) => (compra.tipo === "treno" ? TRENOS[compra.id].nome : MELHORIAS[compra.id].nome);

function mioloDaOficina() {
  const { oficina } = estado;
  const preco = selecionado ? precoDe(oficina, selecionado) : null;
  const balcao =
    selecionado && preco !== null
      ? `<button class="botao" type="button" data-acao="comprar">Comprar por 💰 ${preco}</button>`
      : "";
  const pinturas = PINTURAS.map(
    (cor) =>
      `<button class="pintura${cor === oficina.cor ? " escolhida" : ""}" type="button" data-acao="pintar" data-cor="${cor}" style="--cor: ${cor}" aria-label="Pintar"></button>`,
  ).join("");
  return `<h2>Oficina dos Duendes</h2>
    <div class="vitrine">${MODELOS.map(cartaoTreno).join("")}</div>
    <div class="melhorias">${MELHORIAS_IDS.map(cartaoMelhoria).join("")}</div>
    <p class="titulo-pintura">Cor do ${TRENOS[oficina.treno].nome}</p>
    <div class="pinturas">${pinturas}</div>
    <div class="balcao">
      <p class="saldo">Você tem <strong>💰 ${estado.moedas}</strong></p>
      <p class="aviso-oficina" aria-live="polite">${avisoDaOficina}</p>
      ${balcao}
      <button class="botao${balcao ? " botao-claro" : ""}" type="button" data-acao="seguir">Voar!</button>
    </div>`;
}

function redesenharOficina() {
  const oficina = document.getElementById("oficina");
  if (oficina) oficina.innerHTML = mioloDaOficina();
}

function abrirOficina() {
  selecionado = null;
  avisoDaOficina = "";
  moldura.mostrar(`<div id="oficina" class="oficina">${mioloDaOficina()}</div>`);
}

painel.addEventListener("click", (evento) => {
  const botao = (evento.target as HTMLElement).closest<HTMLElement>("[data-acao]");
  if (!botao) return;
  const { acao, id, cor } = botao.dataset;
  if (acao === "oficina") abrirOficina();
  if (acao === "treno" && id) {
    const modelo = id as TrenoId;
    avisoDaOficina = "";
    if (estado.oficina.trenos.includes(modelo)) {
      usarTreno(estado, modelo);
      selecionado = null;
    } else {
      selecionado = { tipo: "treno", id: modelo };
    }
    redesenharOficina();
  }
  if (acao === "melhoria" && id) {
    const compra: Compra = { tipo: "melhoria", id: id as MelhoriaId };
    selecionado = precoDe(estado.oficina, compra) === null ? null : compra;
    avisoDaOficina = selecionado ? "" : "Essa já está no máximo!";
    redesenharOficina();
  }
  if (acao === "pintar" && cor) {
    pintar(estado, cor);
    redesenharOficina();
  }
  if (acao === "comprar" && selecionado) {
    const nome = nomeDe(selecionado);
    const resposta = comprar(estado, selecionado);
    if (resposta === "comprou") {
      somCompra();
      confete(24);
      avisoDaOficina = `${nome}: é seu!`;
      selecionado = null;
    } else if (resposta === "falta") {
      somFalta();
      avisoDaOficina = "Ainda faltam moedas para esse.";
    }
    redesenharOficina();
  }
});

function seguir() {
  prepararNoite(estado, largura());
  prepararCena();
  const novidade = NOVIDADES[estado.fase];
  if (novidade && novidadeVista !== estado.fase) {
    novidadeVista = estado.fase;
    moldura.mostrar(telaNovidade({ titulo: "Novidade na noite!", texto: novidade, emblema: "🦌" }));
    return;
  }
  voar();
}

function comecar(fase: number) {
  parar();
  estado = novoJogo(fase, largura());
  novidadeVista = 0;
  prepararCena();
  // Quem continua de uma noite adiantada chega com moedas para arrumar o trenó.
  if (fase > 1) {
    abrirOficina();
    return;
  }
  voar();
}

prepararCena();
