import { aoTocar, porId } from "../kit/dom";
import { confete, estourar, flutuar, pular } from "../kit/efeitos";
import { criarMoldura } from "../kit/moldura";
import { somVitoria } from "../kit/som";
import { telaNovidade } from "../kit/telas";
import { criarLaco, esperar } from "../kit/tempo";
import { CARROS, EQUIPAMENTOS, EQUIPAMENTOS_IDS, MODELOS, PINTURAS, type ModeloId } from "./carros";
import { carroParado, desenharCarro, desenharEnfeite, desenharObstaculo, desenharPeca, ICONES } from "./desenho";
import { formatar } from "./dinheiro";
import {
  atributos,
  comprar,
  encerrar,
  ligarTurbo,
  novoJogo,
  passo,
  pintar,
  PODIO,
  posicaoDoRival,
  precoDe,
  prepararCorrida,
  TEMPO_DE_RECARGA,
  turboPronto,
  ULTIMA_FASE,
  ULTIMA_FASE_MANSA,
  usarCarro,
  type Comando,
  type Compra,
  type Estado,
  type Evento,
  type Par,
  type Peca,
  type Resultado,
} from "./logica";
import { caminhoSvg, maisProximo, MEIA_PISTA, pontoNaPista, ALTURA, LARGURA, type Ponto } from "./pistas";
import {
  somBateu,
  somCompra,
  somContagem,
  somDinheiro,
  somFalta,
  somMelhor,
  somPerdeu,
  somTurbo,
  somVolta,
} from "./sons";

const SVG = "http://www.w3.org/2000/svg";
const ZONA_MORTA = 0.18;
const ENFEITES = 16;
const MARGEM_DO_TEXTO = 80;

// Como no carro: para cima acelera, para baixo dá ré, e os lados viram o volante.
type Pedido = { acelera: number; vira: number };
const TECLAS: Record<string, Pedido> = {
  ArrowUp: { acelera: 1, vira: 0 },
  ArrowDown: { acelera: -1, vira: 0 },
  ArrowLeft: { acelera: 0, vira: -1 },
  ArrowRight: { acelera: 0, vira: 1 },
  w: { acelera: 1, vira: 0 },
  s: { acelera: -1, vira: 0 },
  a: { acelera: 0, vira: -1 },
  d: { acelera: 0, vira: 1 },
};
// O dedo conta numa seta quando está mais para o lado dela do que para as vizinhas.
const PARA_O_LADO = 0.38;

const DIRECOES: Record<string, Ponto> = {
  cima: { x: 0, y: -1 },
  baixo: { x: 0, y: 1 },
  esquerda: { x: -1, y: 0 },
  direita: { x: 1, y: 0 },
};

// A estreia de cada novidade. Quem continua direto dessa fase também vê.
const NOVIDADES: Record<number, string> = {
  2: "Primeira corrida! Chegue em 1º ou 2º lugar para passar de fase. Quem chega na frente ganha mais dinheiro.",
  3: "Agora os montes têm várias moedas. Pegue um e o outro some, então escolha o que vale mais! E cuidado com os obstáculos.",
  [ULTIMA_FASE_MANSA + 2]: "Daqui para a frente, chegar em 3º ou 4º lugar custa um coração. Passe na garagem antes de correr!",
  5: "Moedas misturadas nos montes. Qual vale mais?",
  7: "Chegaram as notas de 2 reais!",
  9: "Agora tem notas de 5 e de 10 reais.",
  13: "Notas de 20 e de 50 reais! E os rivais estão ficando rápidos demais para quem anda no chão...",
  [ULTIMA_FASE - 1]: "Semifinal! Chegue em 1º ou 2º lugar para ir para a grande final.",
  [ULTIMA_FASE]: "Grande final! São 4 voltas. Chegue em 1º ou 2º lugar e você zera a Corrida das Moedas!",
};

const cena = porId("cena");
const mundo = porId("mundo") as unknown as SVGSVGElement;
const cenario = porId("cenario");
const largada = porId("largada");
const camadaMontes = porId("montes");
const camadaObstaculos = porId("obstaculos");
const camadaRivais = porId("rivais");
const camadaJogador = porId("jogador");
const carteira = porId("carteira");
const volta = porId("volta");
const posicao = porId("posicao");
const semaforo = porId("semaforo");
const fala = porId("fala");
const setas = porId("setas");
const botaoTurbo = porId("turbo") as HTMLButtonElement;
const painel = porId("painel");
const palco = cena.closest<HTMLElement>(".jogo")!;
const estradas = [...cena.querySelectorAll<SVGPathElement>(".estrada path")];

const moldura = criarMoldura({ aoComecar: comecar, aoSeguir: seguir });
const laco = criarLaco(quadro);

let estado: Estado = novoJogo(1);
let correndo = false;
let novidadeVista = 0;
let ultimoNumero = 0;
let dinheiroNaTela = -1;
let dedo: { id: number; vetor: Ponto | null } | null = null;
let selecionado: Compra | null = null;
let aviso = "";
const teclas = new Set<string>();
const montesNaTela = new Map<Par, SVGGElement[]>();
let obstaculosNaTela: SVGGElement[] = [];
let rivaisNaTela: SVGGElement[] = [];
let jogadorNaTela: SVGGElement | null = null;

function grupo(conteudo: string, classe = "") {
  const g = document.createElementNS(SVG, "g");
  if (classe) g.setAttribute("class", classe);
  g.innerHTML = conteudo;
  return g;
}

function colocar(el: SVGGElement, { x, y }: Ponto, angulo?: number) {
  el.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  if (angulo !== undefined) el.querySelector(".giro")?.setAttribute("transform", `rotate(${((angulo * 180) / Math.PI).toFixed(1)})`);
}

function noPalco({ x, y }: Ponto) {
  const matriz = mundo.getScreenCTM();
  const caixa = palco.getBoundingClientRect();
  if (!matriz) return { x: 0, y: 0 };
  const ponto = new DOMPoint(x, y).matrixTransform(matriz);
  return { x: ponto.x - caixa.left, y: ponto.y - caixa.top };
}

// Longe das bordas, onde o texto seria cortado.
function paraTexto(ponto: Ponto): Ponto {
  const margem = Math.min(MARGEM_DO_TEXTO, palco.clientWidth / 2);
  return { x: Math.min(palco.clientWidth - margem, Math.max(margem, ponto.x)), y: Math.max(40, ponto.y) };
}

const voa = () => atributos(estado.garagem).voa;

function falar(texto: string) {
  fala.textContent = texto;
}

// Enfeites onde não há pista nem dinheiro. São só cenário, então podem vir do acaso.
function desenharCenario() {
  const { pista } = estado.corrida;
  const ceu = voa();
  const colocados: Ponto[] = [];
  const pedacos: string[] = [];
  for (let tentativa = 0; tentativa < 400 && colocados.length < ENFEITES; tentativa++) {
    const ponto = { x: 12 + Math.random() * (LARGURA - 24), y: 12 + Math.random() * (ALTURA - 24) };
    if (maisProximo(pista, ponto).distancia < pista.muro + 16) continue;
    if (colocados.some((outro) => Math.hypot(outro.x - ponto.x, outro.y - ponto.y) < 30)) continue;
    colocados.push(ponto);
    const tipo = colocados.length % 3;
    pedacos.push(`<g transform="translate(${ponto.x.toFixed(0)} ${ponto.y.toFixed(0)})">${desenharEnfeite(tipo, ceu)}</g>`);
  }
  cenario.innerHTML = pedacos.join("");
}

function desenharPista() {
  const { pista } = estado.corrida;
  const caminho = caminhoSvg(pista);
  estradas.forEach((el) => el.setAttribute("d", caminho));
  // O muro muda de distância conforme a pista: a faixa larga desenha tudo até ele.
  estradas.forEach((el) => {
    const alem = el.dataset.alemDoMuro;
    if (alem !== undefined) el.setAttribute("stroke-width", String(2 * (pista.muro + Number(alem))));
  });
  // Quadriculado da largada, atravessando a pista.
  const quadrados: string[] = [];
  const lado = 4;
  for (let fila = 0; fila < 2; fila++) {
    for (let y = -MEIA_PISTA; y < MEIA_PISTA; y += lado) {
      const escuro = (fila + (y + MEIA_PISTA) / lado) % 2 === 0;
      quadrados.push(`<rect x="${fila * lado - lado}" y="${y}" width="${lado}" height="${lado}" fill="${escuro ? "#2b2140" : "#fff"}"/>`);
    }
  }
  const inicio = pontoNaPista(pista, 0);
  const { x, y } = pista.tangentes[0];
  largada.setAttribute("transform", `translate(${inicio.x} ${inicio.y}) rotate(${(Math.atan2(y, x) * 180) / Math.PI})`);
  largada.innerHTML = quadrados.join("");
}

function desenharMonte(pecas: Peca[]) {
  return grupo(
    pecas.map(({ x, y, valor }) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${desenharPeca(valor)}</g>`).join(""),
    "monte",
  );
}

function desenharMontes() {
  camadaMontes.replaceChildren();
  montesNaTela.clear();
  for (const par of estado.corrida.pares) {
    if (!par.ativo) continue;
    const lados = par.lados.map(desenharMonte);
    lados.forEach((el) => camadaMontes.append(el));
    montesNaTela.set(par, lados);
  }
}

function desenharObstaculos() {
  const ceu = voa();
  obstaculosNaTela = estado.corrida.obstaculos.map(({ x, y, tipo, ativo }) => {
    const el = grupo(`<g class="obstaculo">${desenharObstaculo(tipo, ceu)}</g>`);
    colocar(el, { x, y });
    if (!ativo) el.style.display = "none";
    return el;
  });
  camadaObstaculos.replaceChildren(...obstaculosNaTela);
}

function desenharCarros() {
  const { rivais } = estado.corrida;
  rivaisNaTela = rivais.map(({ modelo, cor }) => grupo(desenharCarro(modelo, cor, Boolean(CARROS[modelo].voa)), "carro"));
  camadaRivais.replaceChildren(...rivaisNaTela);
  const { carro, cor } = estado.garagem;
  // O anel tracejado mostra qual carro é o seu.
  jogadorNaTela = grupo(`<circle r="19" class="marca-jogador"/>${desenharCarro(carro, cor, voa())}`, "carro carro-jogador");
  jogadorNaTela.dataset.modelo = carro;
  camadaJogador.replaceChildren(jogadorNaTela);
}

function posicaoAtual() {
  const { rivais, pista, jogador } = estado.corrida;
  return 1 + rivais.filter((rival) => rival.chegou || rival.s / pista.passo > jogador.progresso).length;
}

function desenharPlaca() {
  const { config, jogador } = estado.corrida;
  const atual = Math.min(config.voltas, jogador.voltas + 1);
  volta.textContent = `Volta ${atual}/${config.voltas}`;
  posicao.hidden = config.tipo !== "corrida";
  posicao.textContent = `${posicaoAtual()}º`;
  if (estado.dinheiro !== dinheiroNaTela) {
    if (dinheiroNaTela >= 0 && estado.dinheiro > dinheiroNaTela) pular(carteira, 1.2);
    dinheiroNaTela = estado.dinheiro;
    carteira.textContent = formatar(estado.dinheiro);
  }
  const temTurbo = estado.garagem.niveis.turbo > 0;
  botaoTurbo.hidden = !temTurbo;
  if (temTurbo) {
    const carga = 1 - estado.corrida.jogador.recarga / TEMPO_DE_RECARGA;
    botaoTurbo.style.setProperty("--carga", carga.toFixed(2));
    botaoTurbo.classList.toggle("pronto", turboPronto(estado));
  }
}

function desenharMovimento() {
  const { rivais, jogador } = estado.corrida;
  const corrida = estado.corrida;
  rivais.forEach((rival, i) => {
    const { x, y, angulo } = posicaoDoRival(corrida, rival);
    colocar(rivaisNaTela[i], { x, y }, angulo);
  });
  if (jogadorNaTela) {
    colocar(jogadorNaTela, jogador, jogador.angulo);
    jogadorNaTela.classList.toggle("com-turbo", jogador.turbo > 0);
  }
  desenharPlaca();
}

function prepararCena() {
  prepararCorrida(estado);
  cena.classList.toggle("ceu", voa());
  desenharCenario();
  desenharPista();
  desenharMontes();
  desenharObstaculos();
  desenharCarros();
  dinheiroNaTela = -1;
  desenharMovimento();
  moldura.placa(estado);
  semaforo.hidden = true;
  falar(estado.fase === 1 ? "Segure a seta para cima para acelerar!" : "");
}

function largar() {
  correndo = true;
  ultimoNumero = 0;
  teclas.clear();
  cena.focus({ preventScroll: true });
  laco.ligar();
}

function parar() {
  correndo = false;
  laco.desligar();
  teclas.clear();
  dedo = null;
  acenderSetas(null);
}

function centro(pecas: Peca[]) {
  const x = pecas.reduce((soma, peca) => soma + peca.x, 0) / pecas.length;
  const y = pecas.reduce((soma, peca) => soma + peca.y, 0) / pecas.length;
  return { x, y };
}

function pegou({ par, lado, valor, outro, melhor }: Extract<Evento, { tipo: "pegou" }>) {
  const [pegos, sobra] = [par.lados[lado], par.lados[1 - lado]];
  const els = montesNaTela.get(par) ?? [];
  const aqui = noPalco(centro(pegos));
  estourar(aqui, ["#ffc933", "#fff", "#18b67e"], 8, 50);
  flutuar(paraTexto(aqui), `+${formatar(valor)}`, melhor ? "efeito-ouro" : "");
  // O outro monte mostra quanto valia antes de sumir: dá para conferir a escolha.
  flutuar(paraTexto(noPalco(centro(sobra))), formatar(outro), "efeito-sobra");
  els[lado]?.remove();
  els[1 - lado]?.classList.add("sumindo");
  setTimeout(() => els[1 - lado]?.remove(), 600);
  montesNaTela.delete(par);
  somDinheiro(pegos.length);
  if (melhor) somMelhor();
  moldura.placa(estado);
}

function bateu({ obstaculo }: Extract<Evento, { tipo: "bateu" }>) {
  const el = obstaculosNaTela[estado.corrida.obstaculos.indexOf(obstaculo)];
  el?.querySelector(".obstaculo")?.classList.add("derrubado");
  somBateu();
}

function novaVolta(numero: number) {
  desenharMontes();
  desenharObstaculos();
  somVolta();
  const ultima = numero === estado.corrida.config.voltas;
  falar(ultima ? "Última volta!" : `Volta ${numero}!`);
  setTimeout(() => {
    if (fala.textContent?.startsWith(ultima ? "Última" : "Volta")) falar("");
  }, 1600);
}

async function chegou() {
  parar();
  const ganhoNaPista = estado.corrida.ganho;
  const resultado = encerrar(estado);
  moldura.placa(estado);
  desenharPlaca();
  if (resultado.passou) {
    somVitoria();
    confete();
  } else {
    somPerdeu();
  }
  semaforo.textContent = estado.corrida.config.tipo === "corrida" ? `${resultado.posicao}º` : "Chegou!";
  semaforo.hidden = false;
  pular(semaforo);
  await esperar(1400);
  semaforo.hidden = true;
  if (resultado.zerou) {
    const { posicao } = resultado;
    const carros = estado.garagem.carros.length;
    moldura.fim(
      estado,
      `${posicao === 1 ? "Você venceu a grande final!" : `Você chegou em ${posicao}º na grande final!`}
        Terminou com ${formatar(estado.dinheiro)} e ${carros} ${carros === 1 ? "carro" : "carros"} na garagem.`,
      { titulo: "🏆 Você zerou a Corrida das Moedas!", html: desenharPodio(posicao) },
    );
    return;
  }
  if (resultado.passou) {
    moldura.salvar(estado);
    moldura.mostrar(telaFase(resultado, ganhoNaPista));
    return;
  }
  if (estado.vidas <= 0) {
    moldura.fim(estado, "O carro foi para a oficina descansar.");
    return;
  }
  moldura.mostrar(telaPerdeu(resultado, ganhoNaPista));
}

function reagir(evento: Evento) {
  if (evento.tipo === "largou") {
    semaforo.textContent = "Vai!";
    pular(semaforo);
    somContagem(true);
    setTimeout(() => (semaforo.hidden = true), 700);
  }
  if (evento.tipo === "pegou") pegou(evento);
  if (evento.tipo === "bateu") bateu(evento);
  if (evento.tipo === "volta") novaVolta(evento.volta);
  if (evento.tipo === "chegou") chegou();
}

function lerComando(): Comando {
  let acelera = 0;
  let vira = 0;
  teclas.forEach((tecla) => {
    acelera += TECLAS[tecla].acelera;
    vira += TECLAS[tecla].vira;
  });
  if (acelera || vira) return { acelera, vira };
  const vetor = dedo?.vetor;
  if (!vetor) return null;
  // Na tela, as mesmas setas: o dedo acima do meio acelera, abaixo dá ré, e de lado vira.
  const tamanho = Math.hypot(vetor.x, vetor.y);
  const [x, y] = [vetor.x / tamanho, vetor.y / tamanho];
  return {
    acelera: y < -PARA_O_LADO ? 1 : y > PARA_O_LADO ? -1 : 0,
    vira: x > PARA_O_LADO ? 1 : x < -PARA_O_LADO ? -1 : 0,
  };
}

function contar() {
  const { largada: falta } = estado.corrida;
  if (falta <= 0) return;
  const numero = Math.ceil(falta);
  if (numero === ultimoNumero) return;
  ultimoNumero = numero;
  semaforo.hidden = false;
  semaforo.textContent = String(numero);
  pular(semaforo);
  somContagem(false);
}

function quadro(dt: number) {
  const comando = lerComando();
  if (comando && estado.fase === 1 && fala.textContent?.startsWith("Segure")) falar("Para virar, use as setas dos lados.");
  if (comando?.vira && fala.textContent?.startsWith("Para virar")) falar("");
  const eventos = passo(estado, comando, dt);
  contar();
  desenharMovimento();
  eventos.forEach(reagir);
}

// Setas na tela: o ângulo do dedo a partir do meio decide quais setas valem, até duas juntas.
function acenderSetas(vetor: Ponto | null) {
  setas.querySelectorAll<HTMLElement>(".seta").forEach((seta) => {
    const direcao = DIRECOES[seta.dataset.seta!];
    const tamanho = vetor ? Math.hypot(vetor.x, vetor.y) : 0;
    const acesa = vetor !== null && (direcao.x * vetor.x + direcao.y * vetor.y) / tamanho > PARA_O_LADO;
    seta.classList.toggle("acesa", acesa);
  });
}

function mirar(evento: PointerEvent) {
  if (!dedo) return;
  const caixa = setas.getBoundingClientRect();
  const x = evento.clientX - (caixa.left + caixa.width / 2);
  const y = evento.clientY - (caixa.top + caixa.height / 2);
  dedo.vetor = Math.hypot(x, y) < (caixa.width / 2) * ZONA_MORTA ? null : { x, y };
  acenderSetas(dedo.vetor);
}

setas.addEventListener("pointerdown", (evento) => {
  if (dedo) return;
  evento.preventDefault();
  dedo = { id: evento.pointerId, vetor: null };
  setas.setPointerCapture(evento.pointerId);
  mirar(evento);
});

setas.addEventListener("pointermove", (evento) => {
  if (dedo?.id === evento.pointerId) mirar(evento);
});

const soltar = (evento: PointerEvent) => {
  if (dedo?.id !== evento.pointerId) return;
  dedo = null;
  acenderSetas(null);
};
setas.addEventListener("pointerup", soltar);
setas.addEventListener("pointercancel", soltar);

function acionarTurbo() {
  if (!correndo || !ligarTurbo(estado)) return;
  somTurbo();
  pular(botaoTurbo, 1.15);
}

aoTocar(botaoTurbo, acionarTurbo);

document.addEventListener("keydown", (evento) => {
  if (!correndo || evento.altKey || evento.ctrlKey || evento.metaKey) return;
  const tecla = evento.key.length === 1 ? evento.key.toLowerCase() : evento.key;
  if (tecla === " ") {
    evento.preventDefault();
    if (!evento.repeat) acionarTurbo();
    return;
  }
  if (!TECLAS[tecla]) return;
  evento.preventDefault();
  teclas.add(tecla);
});

document.addEventListener("keyup", (evento) => {
  const tecla = evento.key.length === 1 ? evento.key.toLowerCase() : evento.key;
  teclas.delete(tecla);
});

window.addEventListener("blur", () => teclas.clear());

// A garagem fica num painel do kit, e só o miolo é redesenhado a cada toque.
function cartaoCarro(id: ModeloId) {
  const { garagem } = estado;
  const carro = CARROS[id];
  const seu = garagem.carros.includes(id);
  const usando = garagem.carro === id;
  const escolhido = selecionado?.tipo === "carro" && selecionado.id === id;
  const cor = usando ? garagem.cor : (garagem.pinturas[id] ?? carro.cor);
  const etiqueta = usando ? "Usando" : seu ? "Seu" : formatar(carro.preco);
  const classes = ["cartao", usando && "usando", seu && "seu", escolhido && "escolhido"].filter(Boolean).join(" ");
  const rapidez = Math.round((carro.vmax / CARROS.disco.vmax) * 100);
  return `<button class="${classes}" type="button" data-acao="carro" data-id="${id}">
    <svg class="foto" viewBox="-25 -22 50 44" aria-hidden="true">${carroParado(id, cor)}</svg>
    <strong>${carro.nome}</strong>
    <span class="rapidez" style="--rapidez: ${rapidez}%" aria-label="Rapidez ${rapidez} de 100"></span>
    ${carro.voa ? `<span class="voa">Voa!</span>` : carro.forte ? `<span class="voa forte">Forte!</span>` : ""}
    <span class="etiqueta">${etiqueta}</span>
  </button>`;
}

function cartaoEquipamento(id: (typeof EQUIPAMENTOS_IDS)[number]) {
  const { nome, texto, precos } = EQUIPAMENTOS[id];
  const nivel = estado.garagem.niveis[id];
  const preco = precoDe(estado.garagem, { tipo: "equipamento", id });
  const escolhido = selecionado?.tipo === "equipamento" && selecionado.id === id;
  const pontos = precos.map((_, i) => `<span class="${i < nivel ? "nivel cheio" : "nivel"}"></span>`).join("");
  return `<button class="cartao cartao-equipamento${escolhido ? " escolhido" : ""}${preco === null ? " completo" : ""}" type="button" data-acao="equipamento" data-id="${id}">
    <svg class="icone" viewBox="-12 -12 24 24" aria-hidden="true">${ICONES[id]}</svg>
    <span class="sobre"><strong>${nome}</strong><small>${texto}</small><span class="niveis" aria-label="Nível ${nivel} de ${precos.length}">${pontos}</span></span>
    <span class="etiqueta">${preco === null ? "Completo" : formatar(preco)}</span>
  </button>`;
}

function nomeDe(compra: Compra) {
  return compra.tipo === "carro" ? CARROS[compra.id].nome : EQUIPAMENTOS[compra.id].nome;
}

function miolosDaGaragem() {
  const { garagem } = estado;
  const preco = selecionado ? precoDe(garagem, selecionado) : null;
  const balcao =
    selecionado && preco !== null
      ? `<button class="botao" type="button" data-acao="comprar">Comprar por ${formatar(preco)}</button>`
      : "";
  const pinturas = PINTURAS.map(
    (cor) =>
      `<button class="pintura${cor === garagem.cor ? " escolhida" : ""}" type="button" data-acao="pintar" data-cor="${cor}" style="--cor: ${cor}" aria-label="Pintar"></button>`,
  ).join("");
  // O saldo e os botões ficam presos embaixo: a criança vê o preço e o que tem ao mesmo tempo.
  return `<h2>Garagem</h2>
    <div class="vitrine">${MODELOS.map(cartaoCarro).join("")}</div>
    <div class="equipamentos">${EQUIPAMENTOS_IDS.map(cartaoEquipamento).join("")}</div>
    <p class="titulo-pintura">Pintura do ${CARROS[garagem.carro].nome}</p>
    <div class="pinturas">${pinturas}</div>
    <div class="balcao">
      <p class="saldo">Você tem <strong>${formatar(estado.dinheiro)}</strong></p>
      <p class="aviso-garagem" aria-live="polite">${aviso}</p>
      ${balcao}
      <button class="botao${balcao ? " botao-claro" : ""}" type="button" data-acao="seguir">Correr!</button>
    </div>`;
}

function redesenharGaragem() {
  const garagem = document.getElementById("garagem");
  if (garagem) garagem.innerHTML = miolosDaGaragem();
}

function abrirGaragem() {
  selecionado = null;
  aviso = "";
  moldura.mostrar(`<div id="garagem" class="garagem">${miolosDaGaragem()}</div>`);
}

painel.addEventListener("click", (evento) => {
  const botao = (evento.target as HTMLElement).closest<HTMLElement>("[data-acao]");
  if (!botao) return;
  const { acao, id, cor } = botao.dataset;
  if (acao === "garagem") abrirGaragem();
  if (acao === "carro" && id) {
    const modelo = id as ModeloId;
    aviso = "";
    if (estado.garagem.carros.includes(modelo)) {
      usarCarro(estado, modelo);
      selecionado = null;
    } else {
      selecionado = { tipo: "carro", id: modelo };
    }
    redesenharGaragem();
  }
  if (acao === "equipamento" && id) {
    const compra: Compra = { tipo: "equipamento", id: id as (typeof EQUIPAMENTOS_IDS)[number] };
    selecionado = precoDe(estado.garagem, compra) === null ? null : compra;
    aviso = selecionado ? "" : "Esse já está no máximo!";
    redesenharGaragem();
  }
  if (acao === "pintar" && cor) {
    pintar(estado, cor);
    redesenharGaragem();
  }
  if (acao === "comprar" && selecionado) {
    const nome = nomeDe(selecionado);
    const resposta = comprar(estado, selecionado);
    if (resposta === "comprou") {
      somCompra();
      confete(24);
      aviso = `${nome} é seu!`;
      selecionado = null;
    } else if (resposta === "falta") {
      somFalta();
      aviso = "Ainda falta dinheiro para esse.";
    }
    redesenharGaragem();
  }
});

function seguir() {
  const novidade = NOVIDADES[estado.fase];
  prepararCena();
  if (novidade && novidadeVista !== estado.fase) {
    novidadeVista = estado.fase;
    moldura.mostrar(telaNovidade({ titulo: "Novidade na pista!", texto: novidade, emblema: "🏁" }));
    return;
  }
  largar();
}

function comecar(fase: number) {
  parar();
  estado = novoJogo(fase);
  novidadeVista = 0;
  prepararCena();
  // Quem continua de uma fase adiantada chega com dinheiro para montar o carro.
  if (fase > 1) {
    abrirGaragem();
    return;
  }
  largar();
}

// Pódio da grande final: cada carro no degrau de onde chegou.
const DEGRAUS = [
  { x: 85, altura: 62, classe: "ouro" },
  { x: 10, altura: 44, classe: "prata" },
  { x: 160, altura: 30, classe: "bronze" },
];

function desenharPodio(posicao: number) {
  const { garagem, corrida } = estado;
  const rivais = [...corrida.rivais].sort((a, b) => Number(b.chegou) - Number(a.chegou) || b.s - a.s);
  const ordem: { modelo: ModeloId; cor: string; seu?: boolean }[] = [...rivais];
  ordem.splice(posicao - 1, 0, { modelo: garagem.carro, cor: garagem.cor, seu: true });
  const chao = 140;
  const degraus = DEGRAUS.map(({ x, altura, classe }, i) => {
    const carro = ordem[i];
    const topo = chao - altura;
    const meio = x + 35;
    const foto = carro
      ? `<g transform="translate(${meio} ${topo - 20})"><g class="${carro.seu ? "seu" : ""}">
          <g transform="rotate(-90) scale(1.05)">${carroParado(carro.modelo, carro.cor)}</g></g></g>`
      : "";
    const voce = carro?.seu ? `<text class="voce" x="${meio}" y="${chao - 6}">Você</text>` : "";
    return `<rect class="degrau ${classe}" x="${x}" y="${topo}" width="70" height="${altura}" rx="4"></rect>
      <text class="numero" x="${meio}" y="${topo + 24}">${i + 1}</text>${voce}${foto}`;
  });
  return `<svg class="podio" viewBox="0 0 240 146" aria-hidden="true">${degraus.join("")}
    <line class="chao" x1="2" x2="238" y1="${chao}" y2="${chao}"></line></svg>`;
}


function resumo(ganho: number, premio: number) {
  const { acertos, escolhas } = estado.corrida;
  const montes = escolhas ? `<p>Você pegou o monte maior ${acertos} de ${escolhas} vezes.</p>` : "";
  return `<p class="placar">+${formatar(ganho + premio)}</p>
    ${montes}
    <p>Agora você tem <strong>${formatar(estado.dinheiro)}</strong>.</p>`;
}

function telaFase({ posicao: lugar, premio }: Resultado, ganho: number) {
  const corrida = estado.corrida.config.tipo === "corrida";
  const titulo = corrida ? (lugar === 1 ? "🏆 1º lugar!" : `${lugar}º lugar!`) : `Fase ${estado.fase - 1} completa!`;
  return `<h2>${titulo}</h2>
    ${resumo(ganho, premio)}
    <button class="botao botao-claro" type="button" data-acao="garagem">🔧 Garagem</button>
    <button class="botao" type="button" data-acao="seguir">Próxima fase</button>`;
}

function telaPerdeu({ posicao: lugar, premio, perdeuVida }: Resultado, ganho: number) {
  return `<h2>${lugar}º lugar</h2>
    <p>Para passar de fase, chegue em 1º ou ${PODIO}º.${perdeuVida ? " Você perdeu um coração." : ""}</p>
    ${resumo(ganho, premio)}
    <p>Um carro mais rápido ou um equipamento novo pode ajudar!</p>
    <button class="botao botao-claro" type="button" data-acao="garagem">🔧 Garagem</button>
    <button class="botao" type="button" data-acao="seguir">Correr de novo</button>`;
}
