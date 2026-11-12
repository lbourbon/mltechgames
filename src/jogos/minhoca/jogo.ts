import { porId } from "../kit/dom";
import { animar, centroDe, confete, estourar, flutuar, tremer } from "../kit/efeitos";
import { criarMoldura } from "../kit/moldura";
import { somVitoria } from "../kit/som";
import { telaFase, telaNovidade } from "../kit/telas";
import { criarLaco, esperar, movimentoReduzido } from "../kit/tempo";
import {
  CAUDA,
  casas,
  chegouNoAlvo,
  ESPACO_DOS_GOMOS,
  novoJogo,
  palavraAtual,
  passo,
  pontoDoCorpo,
  redimensionar,
  seguirAdiante,
  ULTIMA_FASE_MANSA,
  type Estado,
  type Evento,
  type Letra,
  type Ponto,
} from "./logica";
import type { Palavra } from "./palavras";
import { somBleh, somDanca, somEstouro, somMordeu, somNham, somPerfeita } from "./sons";

const TREMOR_DO_DEDO = 12;
// Pelo teclado não há dedo: um ponto logo à frente da cabeça faz o papel dele.
const FRENTE_DO_TECLADO = 40;
const BOCA_ABRE_EM = 72;
const MARGEM_DO_TEXTO = 90;
const SETAS: Record<string, Ponto> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

// A estreia de cada dificuldade. Quem volta direto para essa fase também vê.
const NOVIDADES: Record<number, string> = {
  [ULTIMA_FASE_MANSA + 1]: "A minhoca acordou! Agora ela não para de andar. Ir buscar a letra errada custa um coração, e morder o próprio corpo também. Se soltar o dedo, ela se vira sozinha.",
  6: "O S e o Z vão aparecer juntos, e às vezes eles têm o mesmo som. Olho na palavra!",
  7: "Agora é a vez do X e do CH, que também têm o mesmo som.",
  8: "Ç ou SS? Os dois têm o mesmo som, e só um deles é o certo.",
  9: "Antes do E e do I, o G e o J têm o mesmo som. Quem é girafa e quem é jipe?",
  10: "Chegou o Ã, o A com uma minhoquinha na cabeça! Ele aparece nas palavras que soam pelo nariz, como LEÃO.",
  11: "Agora vale tudo: todas as letras parecidas se misturam, e a minhoca está com pressa!",
};

const jardim = porId("jardim");
const camadaLetras = porId("letras");
const corpo = porId("corpo");
const cabeca = porId("cabeca");
const rosto = cabeca.querySelector<HTMLElement>(".rosto")!;
const desenho = porId("desenho");
const casasEl = porId("casas");
const trilha = porId("trilha");
const fala = porId("fala");
const dica = porId("dica");
const palco = jardim.closest(".jogo")!;

type Gomo = { el: HTMLElement; bola: HTMLElement; longe: number };

const medir = () => ({ largura: jardim.clientWidth, altura: jardim.clientHeight });

const moldura = criarMoldura({ aoComecar: comecar, aoSeguir: seguir });
const laco = criarLaco(quadro);

let estado: Estado = novoJogo(1, medir());
let alvo: Ponto | null = null;
let dedo: number | null = null;
let ultimoToque: Ponto | null = null;
let seta: Ponto | null = null;
let tempo = 0;
let novidadeVista = 0;
// A terceira estrela é de quem escreve todas as palavras da fase sem letra errada nem mordida.
let tropecouNaFase = false;
const naTela = new Map<number, HTMLElement>();
// Do pescoço à ponta: primeiro as letras, na ordem da palavra, e depois a cauda.
const gomos: Gomo[] = [];

function falar(texto: string) {
  fala.textContent = texto;
}

function liberar() {
  jardim.dataset.pronto = "1";
  laco.ligar();
}

function travar() {
  jardim.dataset.pronto = "";
  laco.desligar();
  alvo = null;
}

function noPalco({ x, y }: Ponto): Ponto {
  const base = jardim.getBoundingClientRect();
  const caixa = palco.getBoundingClientRect();
  return { x: base.left - caixa.left + jardim.clientLeft + x, y: base.top - caixa.top + jardim.clientTop + y };
}

// Longe das bordas, onde o texto seria cortado.
function paraTexto(ponto: Ponto): Ponto {
  const margem = Math.min(MARGEM_DO_TEXTO, palco.clientWidth / 2);
  return { x: Math.min(palco.clientWidth - margem, Math.max(margem, ponto.x)), y: Math.max(40, ponto.y) };
}

function colocarLetra(el: HTMLElement, { x, y }: Letra) {
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
}

function criarLetra(letra: Letra) {
  const el = document.createElement("span");
  el.className = letra.texto.length > 1 ? "letra letra-dupla" : "letra";
  el.textContent = letra.texto;
  el.style.animationDelay = `${-(letra.id % 5) * 0.4}s`;
  colocarLetra(el, letra);
  camadaLetras.append(el);
  naTela.set(letra.id, el);
  animar(el, [{ scale: 0 }, { scale: 1.2 }, { scale: 1 }], 280);
}

function desenharLetras() {
  const vivas = new Set(estado.letras.map(({ id }) => id));
  naTela.forEach((el, id) => {
    if (vivas.has(id)) return;
    el.remove();
    naTela.delete(id);
  });
  estado.letras.forEach((letra) => {
    const el = naTela.get(letra.id);
    if (el) colocarLetra(el, letra);
    else criarLetra(letra);
  });
}

function criarGomo(classe: string, texto: string, longe: number): Gomo {
  const el = document.createElement("span");
  const bola = document.createElement("span");
  el.className = "gomo";
  bola.className = `bola ${classe}`;
  bola.textContent = texto;
  el.append(bola);
  corpo.append(el);
  return { el, bola, longe };
}

function desenharCauda() {
  corpo.replaceChildren();
  gomos.length = 0;
  for (let i = 1; i <= CAUDA; i++) gomos.push(criarGomo(i === CAUDA ? "ponta" : "", "", i * ESPACO_DOS_GOMOS));
  empilhar();
}

// Quem está mais perto da cabeça fica por cima.
function empilhar() {
  gomos.forEach(({ el }, i) => (el.style.zIndex = String(gomos.length - i)));
}

// A nova letra entra antes da cauda, e o resto do corpo vai para trás aos poucos.
function grudar(texto: string) {
  const ordem = gomos.length - CAUDA;
  const gomo = criarGomo(texto.length > 1 ? "bola-letra bola-dupla" : "bola-letra", texto, gomos[ordem].longe);
  gomos.splice(ordem, 0, gomo);
  empilhar();
  animar(gomo.bola, [{ scale: 0.2 }, { scale: 1.3 }, { scale: 1 }], 260);
}

function desenharMinhoca(dt: number) {
  const { minhoca, letras } = estado;
  tempo += dt;
  cabeca.style.transform = `translate(${minhoca.x}px, ${minhoca.y}px) rotate(${minhoca.angulo}rad)`;
  gomos.forEach((gomo, i) => {
    // Os gomos se encolhem e esticam em onda, como uma minhoca de verdade.
    const onda = movimentoReduzido ? 0 : Math.sin(tempo * 7 - i * 0.9) * 2;
    const meta = (i + 1) * ESPACO_DOS_GOMOS + onda;
    gomo.longe += (meta - gomo.longe) * Math.min(1, dt * 10);
    const { x, y } = pontoDoCorpo(minhoca, gomo.longe);
    gomo.el.style.transform = `translate(${x}px, ${y}px)`;
  });
  const perto = letras.some(({ x, y }) => Math.hypot(x - minhoca.x, y - minhoca.y) < BOCA_ABRE_EM);
  rosto.classList.toggle("com-fome", perto);
  jardim.classList.toggle("assustada", estado.imune > 0);
}

function desenharCasas() {
  const proxima = estado.comidas;
  casasEl.replaceChildren(
    ...casas(estado).map(({ texto, tipo }, i) => {
      const casa = document.createElement("span");
      casa.className = `casa casa-${tipo}${i === proxima ? " casa-agora" : ""}${texto.length > 1 ? " casa-dupla" : ""}`;
      casa.textContent = texto;
      return casa;
    }),
  );
}

function desenharPedido() {
  const palavra = palavraAtual(estado);
  desenho.textContent = palavra.desenho;
  desenho.setAttribute("aria-label", palavra.texto);
  animar(desenho, [{ scale: 0.4 }, { scale: 1.2 }, { scale: 1 }], 320);
  desenharCasas();
  const total = estado.palavras.length;
  trilha.setAttribute("aria-label", `${estado.feitas} de ${total} palavras`);
  trilha.replaceChildren(
    ...Array.from({ length: total }, (_, i) => {
      const marca = document.createElement("span");
      marca.className = i < estado.feitas ? "marca feita" : "marca";
      return marca;
    }),
  );
}

function comeu(letra: Letra) {
  const ponto = noPalco(letra);
  somNham(estado.comidas - 1);
  estourar(ponto, ["#ffc933", "#fff", "#ff9db4"], 8, 46);
  flutuar(paraTexto(ponto), "nham!");
  falar("");
  grudar(letra.texto);
  desenharLetras();
  desenharCasas();
  moldura.placa(estado);
}

function errou({ letra, de, palavra, certa, armadilha }: Extract<Evento, { tipo: "errou" }>) {
  somBleh();
  flutuar(paraTexto(noPalco(de)), "Bleh!");
  tremer(rosto);
  falar(armadilha ? `${palavra.texto} é com ${certa}!` : `A letra ${letra.texto} não! Agora vem o ${certa}.`);
  desenharLetras();
  desenharCasas();
  acusar();
}

function mordida() {
  somMordeu();
  flutuar(paraTexto(noPalco(estado.minhoca)), "Ai!");
  tremer(rosto);
  falar("Ai! Mordeu o próprio corpo!");
  acusar();
}

function acusar() {
  tropecouNaFase = true;
  moldura.placa(estado);
  if (estado.vidas > 0) return;
  travar();
  moldura.fim(estado, "A minhoca ficou cansada e foi tirar uma soneca debaixo da terra.");
}

// A palavra pronta passa dançando pelo corpo e estoura.
async function festejar(palavra: Palavra, perfeita: boolean) {
  const quantas = palavra.pedacos.length;
  const letras = gomos.slice(0, quantas);
  falar(palavra.texto);
  for (const [i, { bola }] of letras.entries()) {
    animar(bola, [{ translate: "0 0", scale: 1 }, { translate: "0 -18px", scale: 1.4 }, { translate: "0 0", scale: 1 }], 300);
    somDanca(i);
    await esperar(110);
  }
  await esperar(240);

  letras.forEach(({ el }) => {
    estourar(centroDe(el), undefined, 6, 70);
    el.remove();
  });
  gomos.splice(0, quantas);
  empilhar();
  somEstouro();
  confete(26);
  if (perfeita) {
    somPerfeita();
    flutuar(paraTexto(noPalco({ x: jardim.clientWidth / 2, y: jardim.clientHeight / 2 })), "Perfeita!", "efeito-ouro");
  }
  await esperar(700);
}

async function terminarPalavra({ letra, palavra, perfeita }: Extract<Evento, { tipo: "palavra" }>) {
  if (!perfeita) tropecouNaFase = true;
  travar();
  comeu(letra);
  await festejar(palavra, perfeita);

  const { palavras } = estado;
  const { estado: proximo, bonus, passou } = seguirAdiante(estado);
  estado = proximo;
  moldura.placa(estado);
  falar("");
  if (!passou) {
    desenharLetras();
    desenharPedido();
    liberar();
    return;
  }
  somVitoria();
  confete();
  await esperar(900);
  moldura.salvar(estado);
  const lista = palavras.map(({ desenho, texto }) => `<span>${desenho} ${texto}</span>`).join("");
  moldura.mostrar(
    telaFase({
      fase: estado.fase - 1,
      pontos: bonus,
      perfeita: !tropecouNaFase,
      miolo: `<p class="escritas">${lista}</p>`,
      frase: tropecouNaFase ? "" : "Todas as palavras certinhas!",
    }),
  );
}

function reagir(evento: Evento) {
  if (evento.tipo === "comeu") comeu(evento.letra);
  if (evento.tipo === "palavra") terminarPalavra(evento);
  if (evento.tipo === "errou") errou(evento);
  if (evento.tipo === "mordeu") mordida();
}

function quadro(dt: number) {
  const { minhoca } = estado;
  if (alvo && chegouNoAlvo(minhoca, alvo)) alvo = null;
  const guia = seta ? { x: minhoca.x + seta.x * FRENTE_DO_TECLADO, y: minhoca.y + seta.y * FRENTE_DO_TECLADO } : alvo;
  const evento = passo(estado, guia, dt);
  desenharMinhoca(dt);
  if (evento) reagir(evento);
}

function pontoDoDedo({ clientX, clientY }: PointerEvent): Ponto {
  const base = jardim.getBoundingClientRect();
  return { x: clientX - base.left - jardim.clientLeft, y: clientY - base.top - jardim.clientTop };
}

function mirar(evento: PointerEvent) {
  const ponto = pontoDoDedo(evento);
  // O dedo parado nunca fica imóvel de verdade, e ela daria voltas em torno dele.
  if (ultimoToque && Math.hypot(ponto.x - ultimoToque.x, ponto.y - ultimoToque.y) < TREMOR_DO_DEDO) return;
  ultimoToque = ponto;
  alvo = ponto;
}

jardim.addEventListener("pointerdown", (evento) => {
  if (jardim.dataset.pronto !== "1" || dedo !== null) return;
  dedo = evento.pointerId;
  jardim.setPointerCapture(evento.pointerId);
  dica.hidden = true;
  ultimoToque = null;
  mirar(evento);
});

jardim.addEventListener("pointermove", (evento) => {
  if (evento.pointerId === dedo && jardim.dataset.pronto === "1") mirar(evento);
});

const soltar = (evento: PointerEvent) => {
  if (evento.pointerId === dedo) dedo = null;
};
jardim.addEventListener("pointerup", soltar);
jardim.addEventListener("pointercancel", soltar);
// Se o navegador tomar o gesto sem avisar, o próximo toque ainda guia a minhoca.
jardim.addEventListener("lostpointercapture", soltar);

jardim.addEventListener("keydown", (evento) => {
  const direcao = SETAS[evento.key];
  if (!direcao) return;
  evento.preventDefault();
  seta = direcao;
  dica.hidden = true;
});

jardim.addEventListener("keyup", (evento) => {
  if (SETAS[evento.key] === seta) seta = null;
});

jardim.addEventListener("blur", () => {
  seta = null;
});

new ResizeObserver(() => {
  redimensionar(estado, medir());
  desenharLetras();
  desenharMinhoca(0);
}).observe(jardim);

function prepararFase() {
  tropecouNaFase = false;
  travar();
  naTela.clear();
  camadaLetras.replaceChildren();
  desenharCauda();
  desenharLetras();
  desenharPedido();
  desenharMinhoca(0);
  moldura.placa(estado);
  dica.hidden = estado.fase > 1;
  falar("");
}

function seguir() {
  const novidade = NOVIDADES[estado.fase];
  prepararFase();
  if (novidade && novidadeVista !== estado.fase) {
    novidadeVista = estado.fase;
    moldura.mostrar(telaNovidade({ titulo: "Novidade no jardim!", texto: novidade, emblema: "🌼" }));
    return;
  }
  jardim.focus({ preventScroll: true });
  liberar();
}

function comecar(fase: number) {
  // Recomeçar não esquece as palavras já vistas, até a página fechar.
  estado = novoJogo(fase, medir(), Math.random, estado.vistas);
  novidadeVista = 0;
  seguir();
}


