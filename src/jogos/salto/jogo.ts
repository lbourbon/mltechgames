import { porId } from "../kit/dom";
import { animar, centroDe, confete, estourar, flutuar, pular, tremer, type Ponto } from "../kit/efeitos";
import { criarMoldura } from "../kit/moldura";
import { somVitoria } from "../kit/som";
import { esperar } from "../kit/tempo";
import {
  acesas,
  alvoDe,
  novoJogo,
  saltar,
  VIDAS_INICIAIS,
  type Estado,
  type Jogada,
  type Mapa,
  type Pedra,
} from "./logica";
import {
  somAcendeu,
  somBeirada,
  somCentro,
  somCratera,
  somEsticar,
  somFoguete,
  somMochila,
  somOutra,
  somPouso,
  somRevelou,
  somSoltar,
  somVoo,
} from "./sons";

// Câmera lenta: até o salto mais curto leva tempo, para dar frio na barriga.
const VOO_MINIMO = 900;
const VOO_POR_REGUA = 900;
// A pedra aparece com ele ainda no ar, para o pouso ser uma surpresa.
const REVELA_EM = 0.62;
const QUADROS_DO_VOO = 24;
const PULINHO = 26;
const MARGEM_DO_TEXTO = 110;
const DEGRAUS_DO_ELASTICO = 24;
const PASSO_DO_TECLADO = 0.01;

// A estreia de cada régua. Quem volta direto para essa fase também vê.
const NOVIDADES: Record<number, string> = {
  5: "A régua cresceu! Agora ela vai até 1000.",
  7: "Agora a régua é uma só, de 0 a 1, e as pedras são pedaços dela: 1/2 fica bem no meio.",
  9: "Pedras com vírgula! O 2,5 fica no meio do caminho entre o 2 e o 3.",
  11: "A régua passou do zero! Agora há pedras à esquerda dele, como o −3.",
  13: "Sem tracinhos e com uma régua diferente a cada fase. Boa sorte, astronauta!",
};

const lua = porId("lua");
const pista = porId("pista");
const regua = porId("regua");
const tracos = porId("tracos");
const rotulos = porId("rotulos");
const pedras = porId("pedras");
const sombra = porId("sombra");
const astronauta = porId("astronauta");
const figura = astronauta.querySelector("img")!;
const foguete = porId("foguete");
const elastico = porId("elastico");
const linhas = elastico.querySelectorAll("path");
const gancho = elastico.querySelector("circle")!;
const alvo = porId("alvo");
const trilha = porId("trilha");
const fala = porId("fala");
const dica = porId("dica");

const moldura = criarMoldura({ aoComecar: comecar, aoSeguir: seguir });

let estado: Estado = novoJogo();
let travado = true;
let mira: number | null = null;
let dedo: number | null = null;
let degrau = 0;
let novidadeVista = 0;
const naTela = new Map<number, HTMLElement>();

const limitar = (pos: number) => Math.min(1, Math.max(0, pos));

function colocar(el: HTMLElement, pos: number) {
  el.style.setProperty("--x", String(pos));
}

function falar(texto: string) {
  fala.textContent = texto;
}

function travar(valor: boolean) {
  travado = valor;
  lua.dataset.pronta = valor ? "" : "1";
}

function criarPedra({ texto, pos }: Pedra, largura: number, base: boolean) {
  const pedra = document.createElement("span");
  pedra.className = base ? "pedra pedra-base" : "pedra";
  colocar(pedra, pos);
  pedra.style.setProperty("--largura", String(largura));
  pedra.innerHTML = `<span class="pedra-centro"></span>`;
  if (!base) {
    const numero = document.createElement("span");
    numero.className = "pedra-numero";
    numero.textContent = texto;
    pedra.append(numero);
  }
  return pedra;
}

function mostrarPedra(pedra: Pedra, festa = false) {
  if (naTela.has(pedra.valor)) return;
  const { mapa } = estado;
  const el = criarPedra(pedra, mapa.pedra * 2, pedra === mapa.base);
  pedras.append(el);
  naTela.set(pedra.valor, el);
  if (festa) animar(el, [{ scale: 0, opacity: 0 }, { scale: 1.3, opacity: 1 }, { scale: 1 }], 300);
}

function desenharRegua({ regua: medidas, base }: Mapa) {
  tracos.replaceChildren(
    ...medidas.tracos.map((pos) => {
      const traco = document.createElement("span");
      traco.className = "traco";
      colocar(traco, pos);
      return traco;
    }),
  );
  rotulos.replaceChildren(
    ...medidas.rotulos.map(({ texto, pos }) => {
      const rotulo = document.createElement("span");
      rotulo.className = "rotulo";
      rotulo.textContent = texto;
      colocar(rotulo, pos);
      return rotulo;
    }),
  );
  pista.dataset.min = String(medidas.min);
  pista.dataset.max = String(medidas.max);
  naTela.clear();
  pedras.replaceChildren();
  mostrarPedra(base);
}

function desenharPedido() {
  alvo.textContent = alvoDe(estado).texto;
  pular(alvo, 1.2);
  const total = estado.mapa.rota.length;
  trilha.setAttribute("aria-label", `${estado.feitas} de ${total} pedras`);
  trilha.replaceChildren(
    ...Array.from({ length: total }, (_, i) => {
      const marca = document.createElement("span");
      marca.className = i < estado.feitas ? "marca feita" : "marca";
      return marca;
    }),
  );
}

function pontoDaMira(pos: number): Ponto {
  const base = lua.getBoundingClientRect();
  const caixa = regua.getBoundingClientRect();
  return { x: caixa.left - base.left + caixa.width * pos, y: caixa.bottom - base.top + 44 };
}

function pontoDoDedo(evento: PointerEvent): Ponto {
  const base = lua.getBoundingClientRect();
  return { x: evento.clientX - base.left, y: evento.clientY - base.top };
}

function posDoDedo({ clientX }: PointerEvent) {
  const caixa = regua.getBoundingClientRect();
  return limitar((clientX - caixa.left) / caixa.width);
}

// Quanto mais esticado, mais fino e mais reto: o elástico parece ter força guardada.
function desenharElastico({ x, y }: Ponto) {
  const base = lua.getBoundingClientRect();
  const corpo = astronauta.getBoundingClientRect();
  const deX = corpo.left + corpo.width / 2 - base.left;
  const deY = corpo.top + corpo.height * 0.72 - base.top;
  const tamanho = Math.hypot(x - deX, y - deY);
  const barriga = Math.max(0, 36 - tamanho / 6);
  const caminho = `M${deX} ${deY} Q${(deX + x) / 2} ${(deY + y) / 2 + barriga} ${x} ${y}`;
  linhas.forEach((linha) => linha.setAttribute("d", caminho));
  elastico.style.setProperty("--espessura", `${Math.max(3, 8 - tamanho / 70)}px`);
  gancho.setAttribute("cx", String(x));
  gancho.setAttribute("cy", String(y));
}

function mirar(pos: number, ponto: Ponto) {
  mira = pos;
  sombra.hidden = false;
  elastico.dataset.ativo = "1";
  colocar(sombra, pos);
  desenharElastico(ponto);
  regua.setAttribute("aria-valuenow", String(Math.round(pos * 100)));

  const distancia = pos - estado.em.pos;
  figura.style.rotate = `${distancia * 28}deg`;
  figura.style.scale = `1 ${1 - Math.abs(distancia) * 0.14}`;
  const novo = Math.round(Math.abs(distancia) * DEGRAUS_DO_ELASTICO);
  if (novo !== degrau) somEsticar(Math.abs(distancia));
  degrau = novo;
}

function largarElastico() {
  mira = null;
  dedo = null;
  degrau = 0;
  sombra.hidden = true;
  elastico.dataset.ativo = "";
  figura.style.rotate = "";
  figura.style.scale = "";
}

const tempoDeVoo = (de: number, para: number) => VOO_MINIMO + Math.abs(de - para) * VOO_POR_REGUA;

// A posição final já vale desde o começo, e o voo anima por cima dela. Com menos movimento, ele só aparece lá.
async function voar(de: number, para: number, duracao: number, altura = pista.clientHeight - astronauta.offsetHeight - 24) {
  const distancia = (de - para) * pista.clientWidth;
  colocar(astronauta, para);
  const quadros = Array.from({ length: QUADROS_DO_VOO + 1 }, (_, i) => {
    const t = i / QUADROS_DO_VOO;
    return { translate: `${distancia * (1 - t)}px ${-4 * altura * t * (1 - t)}px` };
  });
  animar(astronauta, quadros, duracao, "linear");
  await esperar(duracao);
}

function poeira() {
  estourar(pontoDosPes(), ["#d9d4e8", "#b8b4c8", "#fff"], 12, 60);
}

function pontoDosPes(): Ponto {
  const { x, y } = centroDe(astronauta);
  return { x, y: y + astronauta.offsetHeight / 2 };
}

// Longe das bordas da cena, onde o texto seria cortado.
function acimaDele(): Ponto {
  const { x, y } = centroDe(astronauta);
  const margem = Math.min(MARGEM_DO_TEXTO, lua.clientWidth / 2);
  return { x: Math.min(lua.clientWidth - margem, Math.max(margem, x)), y };
}

function cambalhota() {
  animar(astronauta, [{ translate: "0 0" }, { translate: "0 -64px" }, { translate: "0 0" }], 620);
  animar(figura, [{ rotate: "0deg" }, { rotate: "360deg" }], 620, "ease-in-out");
}

async function pousar({ pouso, pedra, ganhou }: Jogada, onde: number) {
  somPouso();
  poeira();
  if (pouso === "centro") {
    colocar(astronauta, pedra!.pos);
    somCentro();
    cambalhota();
    estourar(pontoDosPes(), ["⭐", "✨", "#ffc933"], 18, 120);
    flutuar(acimaDele(), "Bem no centro!", "efeito-ouro");
    await esperar(760);
    return;
  }
  if (pouso === "beirada") {
    somBeirada();
    falar("Ufa! Quase escorregou!");
    animar(figura, [{ rotate: "0deg" }, { rotate: "-22deg" }, { rotate: "22deg" }, { rotate: "-14deg" }, { rotate: "0deg" }], 620);
    await esperar(640);
  }
  if (pouso === "outra") {
    somOutra();
    falar(`Essa é a pedra ${pedra!.texto}. A ${alvoDe(estado).texto} é em outro lugar!`);
  }
  await voar(onde, pedra!.pos, 240, PULINHO);
  if (ganhou > 0 && pouso !== "outra") flutuar(acimaDele(), `+${ganhou}`);
}

function abrirCratera(pos: number) {
  const cratera = document.createElement("span");
  cratera.className = "cratera";
  colocar(cratera, pos);
  pista.append(cratera);
  animar(cratera, [{ scale: "0 0" }, { scale: "1.2 1.2" }, { scale: "1 1" }], 260);
  return cratera;
}

// Quem cai vê onde a pedra estava. Ela fica acesa, e o astronauta volta para tentar de novo.
async function cair({ estado: depois, resultado }: Jogada, onde: number) {
  const procurada = alvoDe(estado);
  const cratera = abrirCratera(onde);
  somCratera();
  poeira();
  tremer(lua, 7);
  animar(figura, [{ rotate: "0deg", scale: 1 }, { rotate: "200deg", scale: 0.35 }], 520, "ease-in");
  animar(astronauta, [{ translate: "0 0", opacity: 1 }, { translate: "0 44px", opacity: 0 }], 520, "ease-in");
  await esperar(500);
  astronauta.style.opacity = "0";

  estado = depois;
  moldura.placa(estado);
  estourar(centroDe(cratera), ["⭐", "💫"], 6, 44);
  falar(`A pedra ${procurada.texto} estava aqui!`);
  const luz = naTela.get(procurada.valor);
  luz?.classList.add("brilhando");
  await esperar(1500);

  if (resultado === "fim") {
    moldura.fim(estado, "O astronauta ficou na cratera. Ele está bem, só um pouco empoeirado!");
    return;
  }

  somMochila();
  astronauta.style.opacity = "";
  await voar(onde, estado.em.pos, 800, 110);
  cratera.remove();
  luz?.classList.remove("brilhando");
  falar(`Agora você viu onde fica a ${procurada.texto}. Vá até lá!`);
  travar(false);
}

// Fim da fase: as pedras acendem uma atrás da outra, e o foguete vem buscá-lo.
async function decolar(mapa: Mapa) {
  falar("Todas as pedras acesas!");
  const emOrdem = [mapa.base, ...mapa.rota].sort((a, b) => a.pos - b.pos);
  for (const [ordem, pedra] of emOrdem.entries()) {
    const el = naTela.get(pedra.valor);
    if (!el) continue;
    el.classList.add("brilhando");
    somAcendeu(ordem);
    pular(el, 1.3);
    await esperar(170);
  }

  const de = centroDe(astronauta);
  const para = centroDe(foguete);
  const [dx, dy] = [para.x - de.x, para.y - de.y];
  animar(
    astronauta,
    [
      { translate: "0 0", opacity: 1 },
      { translate: `${dx / 2}px ${dy / 2 - 60}px`, opacity: 1 },
      { translate: `${dx}px ${dy}px`, opacity: 0.2 },
    ],
    820,
    "ease-in-out",
  );
  await esperar(800);
  astronauta.hidden = true;

  somFoguete();
  foguete.dataset.etapa = "subindo";
  estourar(para, ["#ffc933", "#ff5a5f", "#fff"], 18, 90);
  await esperar(1000);
  somVitoria();
  confete();
  await esperar(900);
}

async function pularPara(pos: number) {
  const anterior = estado;
  const jogada = saltar(estado, pos);
  largarElastico();
  if (jogada.pouso === "parado") return;

  travar(true);
  dica.hidden = true;
  falar("");
  somSoltar();
  const duracao = tempoDeVoo(anterior.em.pos, pos);
  somVoo(duracao / 1000);
  const voo = voar(anterior.em.pos, pos, duracao);
  await esperar(duracao * REVELA_EM);
  if (jogada.pouso !== "outra") {
    mostrarPedra(alvoDe(anterior), true);
    somRevelou();
  }
  await voo;

  if (jogada.pouso === "cratera") {
    await cair(jogada, pos);
    return;
  }

  await pousar(jogada, pos);
  if (jogada.resultado === "fase") {
    trilha.querySelectorAll(".marca").forEach((marca) => marca.classList.add("feita"));
    await decolar(anterior.mapa);
    estado = jogada.estado;
    moldura.placa(estado);
    moldura.salvar(estado);
    moldura.mostrar(telaFase(anterior.fase, jogada.ganhou, anterior.vidas));
    return;
  }

  estado = jogada.estado;
  moldura.placa(estado);
  desenharPedido();
  travar(false);
}

lua.addEventListener("pointerdown", (evento) => {
  if (travado || dedo !== null) return;
  dedo = evento.pointerId;
  lua.setPointerCapture(evento.pointerId);
  mirar(posDoDedo(evento), pontoDoDedo(evento));
});

lua.addEventListener("pointermove", (evento) => {
  if (evento.pointerId === dedo) mirar(posDoDedo(evento), pontoDoDedo(evento));
});

lua.addEventListener("pointerup", (evento) => {
  if (evento.pointerId !== dedo || mira === null) return;
  pularPara(mira);
});

lua.addEventListener("pointercancel", (evento) => {
  if (evento.pointerId === dedo) largarElastico();
});

// Pelo teclado as setas levam a sombra, e Enter solta.
regua.addEventListener("keydown", (evento) => {
  if (travado) return;
  const direcao = { ArrowLeft: -1, ArrowRight: 1 }[evento.key];
  if (direcao) {
    evento.preventDefault();
    const pos = limitar((mira ?? estado.em.pos) + direcao * PASSO_DO_TECLADO * (evento.shiftKey ? 5 : 1));
    mirar(pos, pontoDaMira(pos));
  }
  if ((evento.key === "Enter" || evento.key === " ") && mira !== null) {
    evento.preventDefault();
    pularPara(mira);
  }
  if (evento.key === "Escape") largarElastico();
});

function prepararFase() {
  largarElastico();
  desenharRegua(estado.mapa);
  acesas(estado).forEach((pedra) => mostrarPedra(pedra));
  astronauta.hidden = false;
  astronauta.style.opacity = "";
  colocar(astronauta, estado.em.pos);
  foguete.dataset.etapa = "";
  desenharPedido();
  moldura.placa(estado);
  dica.hidden = estado.fase > 1;
  falar("");
  travar(false);
}

function seguir() {
  const novidade = NOVIDADES[estado.fase];
  prepararFase();
  if (!novidade || novidadeVista === estado.fase) return;
  novidadeVista = estado.fase;
  travar(true);
  moldura.mostrar(telaNovidade(novidade));
}

function comecar(fase: number) {
  estado = novoJogo(fase);
  novidadeVista = 0;
  seguir();
}

function telaNovidade(texto: string) {
  return `<h2>Régua nova!</h2>
    <p>${texto}</p>
    <button class="botao" type="button" data-acao="seguir">Continuar</button>`;
}

function telaFase(concluida: number, bonus: number, vidas: number) {
  return `<h2>Fase ${concluida} completa!</h2>
    <p class="placar">+${bonus} pontos</p>
    <p>${vidas === VIDAS_INICIAIS ? "Nenhuma cratera no caminho!" : "O foguete veio buscar o astronauta!"}</p>
    <button class="botao" type="button" data-acao="seguir">Continuar</button>`;
}
