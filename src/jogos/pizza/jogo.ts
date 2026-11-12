import { porId } from "../kit/dom";
import { animar, centroDe, confete, estourar, flutuar, lancar, pular, tremer } from "../kit/efeitos";
import { criarMoldura } from "../kit/moldura";
import { somVitoria } from "../kit/som";
import { telaFase, telaNovidade } from "../kit/telas";
import { esperar } from "../kit/tempo";
import {
  cobrir,
  cortar,
  dica,
  INTEIRO,
  novoJogo,
  pedidoAtual,
  SABORES,
  servir,
  ULTIMA_FASE_MANSA,
  type Conferencia,
  type Estado,
  type Jogada,
  type Parte,
  type Sabor,
} from "./logica";
import { somCobriu, somCorte, somEntrega, somForno, somNegou, somSabor, somSino, somTirou, somVazia } from "./sons";

const RAIO = 47;
const CLIENTES = ["😋", "🤤", "😃", "🤩", "😍", "😁"];
const COR: Record<Sabor, string> = { verde: "#8fd14f", vermelha: "#ff7a6b", azul: "#6fb6ff", roxa: "#c49bff" };
const COR_FORTE: Record<Sabor, string> = { verde: "#3f8f1f", vermelha: "#c62f22", azul: "#1f6fc9", roxa: "#7a3fd1" };
const VOO = 340;

// A estreia de cada ideia. Quem volta direto para essa fase também vê.
const NOVIDADES: Record<number, { titulo: string; texto: string }> = {
  3: {
    titulo: "Agora você corta!",
    texto: "A pizza vem inteira. Escolha o cortador: 1/4 pede uma pizza cortada em 4 fatias iguais.",
  },
  5: {
    titulo: "Dois pedaços diferentes!",
    texto: "Para 1/2 e 1/4 na mesma pizza, corte em 4: duas fatias são 1/2, e uma é 1/4. Procure o corte que serve para os dois!",
  },
  6: {
    titulo: "Corte difícil!",
    texto: "1/2 e 1/3 pedem um corte que divide nos dois jeitos. Conte as fatias antes de cortar.",
  },
  7: {
    titulo: "O resto!",
    texto: "Agora o cliente pede um sabor no resto da pizza. Pense em quanto sobra.",
  },
  9: {
    titulo: "Um cortador só!",
    texto: "Hoje só tem o cortador de 8. Metade da pizza continua sendo metade: quantas fatias de 8 dão 1/2?",
  },
  10: {
    titulo: "Agora é o cortador de 6!",
    texto: "Quantas fatias de 6 dão 1/2? E 1/3?",
  },
  11: {
    titulo: "Chegou o cortador de 12!",
    texto: "Com 12 fatias cabem 1/3 e 1/4 na mesma pizza. Os pedidos ficaram malucos!",
  },
};

const clienteEl = porId("cliente");
const pedidoEl = porId("pedido");
const fila = porId("fila");
const forno = porId("forno");
const pizza = porId("pizza") as unknown as SVGSVGElement;
const fala = porId("fala");
const cortes = porId("cortes");
const sabores = porId("sabores");
const botaoDica = porId("dica") as HTMLButtonElement;
const botaoServir = porId("servir") as HTMLButtonElement;
const jogo = document.querySelector<HTMLElement>(".jogo")!;

const moldura = criarMoldura({ aoComecar: comecar, aoSeguir: seguir });

let estado: Estado = novoJogo();
let travado = true;
let novidadeVista = 0;
let sabor: Sabor = "verde";
let dedo: number | null = null;
// O que o arraste está fazendo: cobrir com o sabor escolhido ou limpar, conforme a primeira fatia.
let pincel: Sabor | null = null;
let ultimaFatia = -1;

function falar(texto: string) {
  fala.textContent = texto;
}

function travar(valor: boolean) {
  travado = valor;
  jogo.dataset.travado = valor ? "1" : "";
  botaoServir.disabled = valor;
  botaoDica.disabled = valor;
}

function ponto(passo: number, raio: number) {
  const angulo = (passo / INTEIRO) * 2 * Math.PI;
  return { x: raio * Math.sin(angulo), y: -raio * Math.cos(angulo) };
}

function setor(de: number, medida: number, raio: number) {
  const a = ponto(de, raio);
  const b = ponto(de + medida, raio);
  const grande = medida > INTEIRO / 2 ? 1 : 0;
  return `M0 0 L${a.x.toFixed(2)} ${a.y.toFixed(2)} A${raio} ${raio} 0 ${grande} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)} Z`;
}

// Cada sabor tem sua forma, para quem não distingue bem as cores.
function cobertura(qual: Sabor, x: number, y: number, tamanho = 3.4) {
  const cor = COR_FORTE[qual];
  const [px, py] = [x.toFixed(2), y.toFixed(2)];
  if (qual === "verde") return `<circle cx="${px}" cy="${py}" r="${tamanho}" fill="${cor}"></circle>`;
  if (qual === "vermelha") {
    return `<rect x="${(x - tamanho).toFixed(2)}" y="${(y - tamanho).toFixed(2)}" width="${tamanho * 2}" height="${tamanho * 2}" rx="1" fill="${cor}"></rect>`;
  }
  const lados = qual === "azul" ? 3 : 4;
  const r = tamanho * 1.35;
  const pontas = Array.from({ length: lados }, (_, i) => {
    const angulo = (i / lados) * 2 * Math.PI;
    return `${(x + r * Math.sin(angulo)).toFixed(2)},${(y - r * Math.cos(angulo)).toFixed(2)}`;
  });
  return `<polygon points="${pontas.join(" ")}" fill="${cor}"></polygon>`;
}

function desenharPedaco(de: number, medida: number, qual: Sabor | null) {
  const pedacos = [
    `<path class="massa" d="${setor(de, medida, RAIO)}"></path>`,
    `<path d="${setor(de, medida, RAIO - 6)}" fill="${qual ? COR[qual] : "#ffd66b"}"></path>`,
  ];
  if (qual) {
    for (let parte = 1.5; parte < medida; parte += 3) {
      const longe = ponto(de + parte, 31);
      pedacos.push(cobertura(qual, longe.x, longe.y));
      if (Math.floor(parte) % 2 === 1) {
        const perto = ponto(de + parte, 17);
        pedacos.push(cobertura(qual, perto.x, perto.y, 2.6));
      }
    }
  }
  return pedacos.join("");
}

const fatiasNaTela = () => [...pizza.querySelectorAll<SVGGElement>(".pedaco")];

function desenharFatia(indice: number) {
  const { corte, fatias } = estado;
  const passo = INTEIRO / corte!;
  const el = fatiasNaTela()[indice];
  const qual = fatias[indice];
  el.innerHTML = desenharPedaco(indice * passo, passo, qual);
  el.dataset.sabor = qual ?? "";
  el.setAttribute("aria-label", `Fatia ${indice + 1} de ${corte}, ${qual ?? "só queijo"}`);
}

function desenharPizza() {
  const { corte, fatias } = estado;
  if (!corte) {
    pizza.innerHTML = `<circle class="massa" r="${RAIO}"></circle><circle r="${RAIO - 6}" fill="#ffd66b"></circle>`;
    return;
  }
  pizza.innerHTML = fatias
    .map(() => `<g class="pedaco" role="button" tabindex="0"></g>`)
    .join("");
  fatias.forEach((_, indice) => desenharFatia(indice));
}

function criarMiniCorte(corte: number) {
  const linhas = Array.from({ length: corte }, (_, i) => {
    const { x, y } = ponto((i * INTEIRO) / corte, 21);
    return `<path d="M0 0 L${x.toFixed(2)} ${y.toFixed(2)}"></path>`;
  });
  return `<svg viewBox="-24 -24 48 48" aria-hidden="true"><circle r="21"></circle>${linhas.join("")}</svg>`;
}

function desenharCortes() {
  const { config, corte } = estado;
  const escondidos = config.cortada || config.cortes.length === 1;
  cortes.hidden = escondidos;
  if (escondidos) return;
  cortes.replaceChildren(
    ...config.cortes.map((opcao) => {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = opcao === corte ? "corte ativo" : "corte";
      botao.dataset.corte = String(opcao);
      botao.setAttribute("aria-label", `Cortar em ${opcao} fatias`);
      botao.setAttribute("aria-pressed", String(opcao === corte));
      botao.innerHTML = `${criarMiniCorte(opcao)}<span>${opcao}</span>`;
      botao.addEventListener("click", () => escolherCorte(opcao));
      return botao;
    }),
  );
}

function desenharSabores() {
  const disponiveis = SABORES.slice(0, estado.config.sabores);
  if (!disponiveis.includes(sabor)) sabor = disponiveis[0];
  sabores.replaceChildren(
    ...disponiveis.map((opcao) => {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = opcao === sabor ? "pote ativo" : "pote";
      botao.dataset.sabor = opcao;
      botao.setAttribute("aria-label", `Sabor ${opcao}`);
      botao.setAttribute("aria-pressed", String(opcao === sabor));
      botao.style.setProperty("--cor", COR[opcao]);
      botao.innerHTML = `<svg viewBox="-9 -9 18 18" aria-hidden="true">${cobertura(opcao, 0, 0, 5)}</svg>`;
      botao.addEventListener("click", () => escolherSabor(opcao));
      return botao;
    }),
  );
}

const fracao = ({ n, d }: Pick<Parte, "n" | "d">) => `<span class="fracao"><span>${n}</span><span>${d}</span></span>`;
const amostra = (qual: Sabor) => `<span class="amostra" style="background:${COR[qual]}"></span><span class="sabor-nome">${qual}</span>`;

function desenharPedido() {
  const { partes, resto } = pedidoAtual(estado);
  const itens = partes.map(
    ({ sabor: qual, n, d }) => `<span class="parte" data-sabor="${qual}" data-n="${n}" data-d="${d}">${fracao({ n, d })}${amostra(qual)}</span>`,
  );
  if (resto) itens.push(`<span class="parte parte-resto" data-sabor="${resto}"><span>resto</span>${amostra(resto)}</span>`);
  pedidoEl.innerHTML = itens.join(`<span class="mais">+</span>`);
  const texto = partes.map(({ sabor: qual, n, d }) => `${n}/${d} ${qual}`);
  if (resto) texto.push(`o resto ${resto}`);
  pedidoEl.setAttribute("aria-label", `Pedido: ${texto.join(" mais ")}`);
}

function desenharFila() {
  const { pedidos, atual, fase } = estado;
  clienteEl.textContent = CLIENTES[(atual + fase) % CLIENTES.length];
  fila.setAttribute("aria-label", `Pedido ${atual + 1} de ${pedidos.length}`);
  fila.replaceChildren(
    ...pedidos.map((_, i) => {
      const marca = document.createElement("span");
      marca.className = i < atual ? "marca feita" : "marca";
      return marca;
    }),
  );
}

function escolherSabor(opcao: Sabor) {
  if (travado) return;
  sabor = opcao;
  somSabor();
  sabores.querySelectorAll<HTMLElement>(".pote").forEach((botao) => {
    const ativo = botao.dataset.sabor === opcao;
    botao.classList.toggle("ativo", ativo);
    botao.setAttribute("aria-pressed", String(ativo));
  });
}

function escolherCorte(opcao: number) {
  if (travado) return;
  estado = cortar(estado, opcao);
  somCorte(opcao);
  desenharPizza();
  desenharCortes();
  animar(pizza, [{ rotate: "-14deg" }, { rotate: "0deg" }], 220);
  falar("");
}

function aplicarNaFatia(indice: number) {
  if (estado.fatias[indice] === pincel) return;
  estado = cobrir(estado, indice, pincel);
  desenharFatia(indice);
  if (pincel) {
    somCobriu(estado.fatias.filter((fatia) => fatia === pincel).length);
    animar(fatiasNaTela()[indice], [{ scale: 1 }, { scale: 1.06 }, { scale: 1 }], 160);
  } else {
    somTirou();
  }
  falar("");
}

function fatiaEm({ clientX, clientY }: PointerEvent) {
  const caixa = pizza.getBoundingClientRect();
  const dx = clientX - (caixa.left + caixa.width / 2);
  const dy = clientY - (caixa.top + caixa.height / 2);
  const angulo = (Math.atan2(dx, -dy) + 2 * Math.PI) % (2 * Math.PI);
  return Math.min(estado.corte! - 1, Math.floor((angulo / (2 * Math.PI)) * estado.corte!));
}

function tocarFatia(indice: number) {
  pincel = estado.fatias[indice] === sabor ? null : sabor;
  aplicarNaFatia(indice);
}

pizza.addEventListener("pointerdown", (evento) => {
  if (travado || dedo !== null) return;
  if (!estado.corte) {
    somVazia();
    tremer(pizza, 4);
    falar("Corte a pizza primeiro!");
    return;
  }
  dedo = evento.pointerId;
  pizza.setPointerCapture(evento.pointerId);
  ultimaFatia = fatiaEm(evento);
  tocarFatia(ultimaFatia);
});

pizza.addEventListener("pointermove", (evento) => {
  if (evento.pointerId !== dedo) return;
  const indice = fatiaEm(evento);
  if (indice === ultimaFatia) return;
  ultimaFatia = indice;
  aplicarNaFatia(indice);
});

const soltarDedo = (evento: PointerEvent) => {
  if (evento.pointerId === dedo) dedo = null;
};
pizza.addEventListener("pointerup", soltarDedo);
pizza.addEventListener("pointercancel", soltarDedo);
// Se o navegador tomar o gesto sem avisar, a pizza continua aceitando o próximo dedo.
pizza.addEventListener("lostpointercapture", soltarDedo);

pizza.addEventListener("keydown", (evento) => {
  if (travado || (evento.key !== "Enter" && evento.key !== " ")) return;
  const indice = fatiasNaTela().indexOf(evento.target as SVGGElement);
  if (indice < 0) return;
  evento.preventDefault();
  tocarFatia(indice);
});

function motivo({ sabor: qual, problema }: Conferencia) {
  if (problema === "nao-pediu") return `Eu não pedi ${qual}!`;
  return problema === "faltou" ? `Faltou ${qual}!` : `Tem ${qual} demais!`;
}

async function reclamar(jogada: Jogada) {
  travar(true);
  estado = jogada.estado;
  somNegou();
  tremer(clienteEl, 7);
  clienteEl.textContent = "😠";
  falar(motivo(jogada.conferencia!));
  await esperar(700);
  moldura.placa(estado);
  botaoDica.hidden = false;
  if (jogada.resultado === "fim") {
    moldura.fim(estado, "Os clientes foram embora com fome, e a pizzaria fechou por hoje.");
    return;
  }
  desenharFila();
  travar(false);
}

// A pizza vai ao forno, faz ding e voa para o cliente.
async function entregar(jogada: Jogada, anterior: Estado) {
  travar(true);
  const de = centroDe(pizza);
  const boca = centroDe(forno);
  const chegada = centroDe(clienteEl);
  somSino();
  animar(pizza, [{ scale: 1 }, { scale: 1.1 }, { scale: 1 }], 200);
  await esperar(200);
  lancar(de, boca, "efeito-emoji efeito-pizza", "🍕", VOO, 40);
  pizza.innerHTML = "";
  await esperar(VOO);
  forno.dataset.quente = "1";
  somForno();
  await esperar(260);
  forno.dataset.quente = "";
  lancar(boca, chegada, "efeito-emoji efeito-pizza", "🍕", VOO, 40);
  await esperar(VOO);
  somEntrega();
  pular(clienteEl, 1.5);
  estourar(chegada, ["❤️", "#ffc933"], 6, 40);
  flutuar(chegada, `+${jogada.ganhou}`, "efeito-ouro");
  await esperar(420);

  if (jogada.resultado === "fase") {
    await terminarFase(jogada, anterior);
    return;
  }
  estado = jogada.estado;
  moldura.placa(estado);
  prepararPedido();
}

async function terminarFase(jogada: Jogada, anterior: Estado) {
  fila.querySelectorAll(".marca").forEach((marca) => marca.classList.add("feita"));
  falar("Todo mundo comeu!");
  somVitoria();
  confete();
  await esperar(1000);
  estado = jogada.estado;
  moldura.placa(estado);
  moldura.salvar(estado);
  moldura.mostrar(telaDaFase(anterior.fase, estado.pontos - anterior.pontos, anterior.limpa));
}

botaoServir.addEventListener("click", () => {
  if (travado) return;
  const anterior = estado;
  const jogada = servir(estado);
  if (jogada.resultado === "vazia") {
    somVazia();
    tremer(pizza, 4);
    falar(estado.corte ? "Cubra as fatias primeiro!" : "Corte a pizza primeiro!");
    return;
  }
  if (jogada.resultado === "errado" || jogada.resultado === "fim") {
    reclamar(jogada);
    return;
  }
  entregar(jogada, anterior);
});

botaoDica.addEventListener("click", () => {
  if (travado) return;
  const depois = dica(estado);
  if (depois === estado) {
    falar("Está certinha! Toque o sino.");
    return;
  }
  const mudouCorte = depois.corte !== estado.corte;
  estado = depois;
  somSabor();
  desenharPizza();
  if (mudouCorte) desenharCortes();
  falar("");
});

function prepararPedido() {
  dedo = null;
  desenharPedido();
  desenharFila();
  desenharPizza();
  desenharCortes();
  desenharSabores();
  botaoDica.hidden = true;
  falar(estado.fase === 1 && estado.atual === 0 ? "Escolha o sabor e passe o dedo nas fatias!" : "");
  animar(clienteEl, [{ translate: "-120% 0" }, { translate: "0 0" }], 260);
  travar(false);
}

function seguir() {
  const novidade = NOVIDADES[estado.fase];
  moldura.placa(estado);
  prepararPedido();
  if (estado.fase === ULTIMA_FASE_MANSA + 1) falar("Agora, pizza errada custa um coração.");
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


function telaDaFase(concluida: number, bonus: number, limpa: boolean) {
  return telaFase({
    fase: concluida,
    pontos: bonus,
    perfeita: limpa,
    frase: limpa ? "Nenhum pedido errado. Que pizzaiolo!" : "Todo mundo saiu de barriga cheia!",
  });
}
