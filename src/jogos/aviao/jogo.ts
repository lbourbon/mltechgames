import { porId } from "../kit/dom";
import { centroDe, confete, estourar, flutuar, pular } from "../kit/efeitos";
import { criarMoldura } from "../kit/moldura";
import { somVitoria } from "../kit/som";
import { esperar, movimentoReduzido } from "../kit/tempo";
import {
  CARTAS_POR_FASE,
  destino,
  entregar,
  novoJogo,
  pistaDaFase,
  ULTIMA_FASE_FIXA,
  ULTIMA_FASE_MANSA,
  type Estado,
  type Jogada,
} from "./logica";
import { capitalDe, nomeCurto, nomeDe, noPais, oPais, paraACapital, paraOPais, type Id } from "./paises";
import { REGIOES, type RegiaoId } from "./regioes";
import { somDecolar, somEntregou, somLonge, somNaMosca, somPerto, somPousar } from "./sons";

const SVG = "http://www.w3.org/2000/svg";
// Tamanhos na tela, em pixels: o mapa muda de escala com a região e com o aparelho.
const LETRA = 12.5;
const AVIAO = 34;
const BANDEIRA = 22;
// Um toque a até esta distância da borda conta como dentro: o dedo da criança é largo.
const FOLGA_DO_DEDO = 8;

const NOVIDADES: Record<number, { titulo: string; texto: string }> = {
  2: {
    titulo: "Sem nomes",
    texto:
      "Agora o mapa não mostra os nomes. Toque onde você acha que o país fica: quanto mais perto, mais pontos! Cada país achado fica marcado e ajuda a encontrar os próximos.",
  },
  [ULTIMA_FASE_MANSA + 1]: {
    titulo: "América do Norte e Central",
    texto:
      "O avião subiu para o norte! O Canadá e os Estados Unidos são enormes, e entre o México e a Colômbia há sete países pequenos. E agora é sério: pousar longe demais custa um coração.",
  },
  4: {
    titulo: "Europa",
    texto: "A Europa tem muitos países pertinho uns dos outros. Use os que você já achou para se guiar!",
  },
  5: {
    titulo: "África",
    texto: "A África é enorme e tem mais de 50 países. O deserto do Saara fica no norte.",
  },
  6: {
    titulo: "Oriente Médio e Ásia Central",
    texto: "Desertos, montanhas e o Mar Cáspio, o maior lago do mundo.",
  },
  7: {
    titulo: "Ásia",
    texto: "A China e a Índia são os países com mais gente no mundo.",
  },
  8: {
    titulo: "Oceania",
    texto: "A Austrália é um país do tamanho de um continente, cercado de ilhas.",
  },
  9: {
    titulo: "Bandeiras!",
    texto: "Nova volta ao mundo! Agora a carta só mostra a bandeira do país.",
  },
  16: {
    titulo: "Capitais!",
    texto: "Última volta: agora a carta diz só a capital. Lima é a capital do Peru, Paris é a da França...",
  },
  [ULTIMA_FASE_FIXA + 1]: {
    titulo: "Volta extra",
    texto: "Você deu três voltas ao mundo! As capitais continuam, região por região.",
  },
};

const ceu = porId("ceu");
const mapa = porId("mapa") as unknown as SVGSVGElement;
const camadas = {
  erro: porId("erro") as unknown as SVGGElement,
  bandeiras: porId("bandeiras") as unknown as SVGGElement,
  rotulos: porId("rotulos") as unknown as SVGGElement,
};
const aviao = porId("aviao") as unknown as SVGGElement;
const voo = aviao.querySelector<SVGGElement>(".voo")!;
const sombra = aviao.querySelector<SVGGElement>(".sombra")!;
const contador = porId("contador");
const pedido = porId("pedido");
const fala = porId("fala");

const moldura = criarMoldura({ aoComecar: comecar, aoSeguir: seguir });

let estado: Estado = novoJogo();
let regiaoAtual: RegiaoId | null = null;
let paises = new Map<Id, SVGPathElement>();
let rotulos = new Map<Id, SVGTextElement>();
const amostras = new Map<SVGPathElement, DOMPoint[]>();
let travado = true;
let novidadeVista = 0;
// Unidades do mapa por pixel na tela.
let u = 1;
let largura = 1000;
let altura = 1000;
// Onde o avião está, em unidades do mapa, e para onde aponta.
let aviaoEm = { x: 500, y: 500 };
let anguloAtual = 0;

const centro = (id: Id) => (REGIOES[estado.regiao].centros as Record<string, [number, number]>)[id];
const maiuscula = (texto: string) => texto[0].toUpperCase() + texto.slice(1);

function falar(texto: string) {
  fala.textContent = texto;
}

function travar(valor: boolean) {
  travado = valor;
  ceu.dataset.pronta = valor ? "" : "1";
}

const bandeira = (id: Id, alt = nomeDe(id), classe = "bandeira") =>
  `<img class="${classe}" src="/img/bandeiras/${id}.svg" alt="${alt}" width="28" height="21">`;

function desenharCarta() {
  const alvo = destino(estado);
  const { pedido: tipo } = pistaDaFase(estado.fase);
  contador.textContent = `💌 ${estado.vez + 1} de ${CARTAS_POR_FASE}`;
  ceu.dataset.alvo = alvo;
  if (tipo === "bandeira") pedido.innerHTML = `Carta para ${bandeira(alvo, "bandeira", "bandeira grande")}`;
  else if (tipo === "capital") pedido.textContent = `Carta ${paraACapital(alvo)}`;
  else pedido.innerHTML = `Carta ${paraOPais(alvo)} ${bandeira(alvo)}`;
  pular(pedido, 1.08);
}

// Mapa ------------------------------------------------------------------------------------------

function criar<K extends keyof SVGElementTagNameMap>(tag: K, atributos: Record<string, string | number>) {
  const el = document.createElementNS(SVG, tag);
  for (const [nome, valor] of Object.entries(atributos)) el.setAttribute(nome, String(valor));
  return el;
}

function trocarRegiao() {
  if (regiaoAtual === estado.regiao) return;
  regiaoAtual = estado.regiao;
  const grupo = mapa.querySelector<SVGGElement>(`.regiao[data-regiao="${regiaoAtual}"]`)!;
  mapa.querySelectorAll(".regiao").forEach((g) => g.classList.toggle("ativa", g === grupo));
  mapa.setAttribute("viewBox", grupo.dataset.caixa!);
  [, , largura, altura] = grupo.dataset.caixa!.split(" ").map(Number);
  ceu.dataset.regiao = regiaoAtual;
  paises = new Map([...grupo.querySelectorAll<SVGPathElement>(".pais")].map((el) => [el.dataset.pais as Id, el]));
  // Os maiores países vêm primeiro na disputa por espaço dos nomes.
  const tamanho = (id: Id) => {
    const caixa = paises.get(id)!.getBBox();
    return caixa.width * caixa.height;
  };
  const ordem = [...paises.keys()].sort((a, b) => tamanho(b) - tamanho(a));
  rotulos = new Map(
    ordem.map((id) => {
      const texto = criar("text", { class: "rotulo" });
      texto.textContent = nomeCurto(id);
      return [id, texto];
    }),
  );
  camadas.rotulos.replaceChildren(...rotulos.values());
  medir();
}

// Letras, bandeiras e o avião ficam do mesmo tamanho na tela em qualquer região.
function medir() {
  const matriz = mapa.getScreenCTM();
  if (!matriz || matriz.a === 0) return;
  u = 1 / matriz.a;
  mapa.style.setProperty("--u", String(u));
}

new ResizeObserver(() => {
  const antes = u;
  medir();
  if (Math.abs(antes - u) > 0.01 * u && regiaoAtual) desenharMapa();
}).observe(mapa);

function colocarAviao(x: number, y: number, angulo: number, subida = 0) {
  aviaoEm = { x, y };
  anguloAtual = angulo;
  aviao.setAttribute("transform", `translate(${x} ${y}) scale(${(AVIAO * u) / 100})`);
  voo.setAttribute("transform", `rotate(${angulo}) scale(${1 + subida * 0.4})`);
  sombra.setAttribute("transform", `translate(${9 + subida * 30} ${12 + subida * 30})`);
}

function desenharBandeiras() {
  const w = BANDEIRA * u;
  const h = w * 0.75;
  camadas.bandeiras.replaceChildren(
    ...estado.revelados.map((id) => {
      const [x, y] = centro(id);
      const grupo = criar("g", { class: "carimbo", "data-pais": id });
      grupo.append(
        criar("image", { href: `/img/bandeiras/${id}.svg`, x: x - w / 2, y: y - h / 2, width: w, height: h, preserveAspectRatio: "none" }),
        criar("rect", { x: x - w / 2, y: y - h / 2, width: w, height: h }),
      );
      return grupo;
    }),
  );
}

// Nomes por ordem de importância, sem deixar um cobrir o outro.
function desenharRotulos() {
  const { nomes } = pistaDaFase(estado.fase);
  const alvo = destino(estado);
  const prioridade = (id: Id) => (nomes && id === alvo ? 0 : estado.revelados.includes(id) ? 1 : nomes ? 2 : 9);
  const ocupados: DOMRect[] = [];
  const folga = 2 * u;
  for (const id of [...rotulos.keys()].sort((a, b) => prioridade(a) - prioridade(b))) {
    const texto = rotulos.get(id)!;
    const visivel = prioridade(id) < 9;
    texto.classList.toggle("visivel", visivel);
    if (!visivel) continue;
    const [x, y] = centro(id);
    // Com a bandeira no lugar, o nome desce para baixo dela.
    const desce = estado.revelados.includes(id) ? BANDEIRA * u * 0.375 + LETRA * u * 0.7 : 0;
    texto.setAttribute("x", String(x));
    texto.setAttribute("y", String(y + desce));
    const { x: bx, y: by, width, height } = texto.getBBox();
    const caixa = new DOMRect(bx, by, width, height);
    const bate = ocupados.some(
      (o) => caixa.x < o.right + folga && caixa.right + folga > o.x && caixa.y < o.bottom + folga && caixa.bottom + folga > o.y,
    );
    if (bate && prioridade(id) > 0) {
      texto.classList.remove("visivel");
      continue;
    }
    ocupados.push(caixa);
  }
}

function desenharMapa() {
  for (const [id, el] of paises) el.classList.toggle("revelado", estado.revelados.includes(id));
  desenharBandeiras();
  desenharRotulos();
  colocarAviao(aviaoEm.x, aviaoEm.y, anguloAtual);
}

// O voo faz uma curva leve e sobe no meio do caminho, com a sombra se afastando.
function animarVoo(x2: number, y2: number) {
  const { x: x1, y: y1 } = aviaoEm;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distancia = Math.hypot(dx, dy);
  const angulo = distancia > 1 ? (Math.atan2(dy, dx) * 180) / Math.PI : anguloAtual;
  if (movimentoReduzido || distancia < 1) {
    colocarAviao(x2, y2, angulo);
    return esperar(300);
  }
  const duracao = Math.min(Math.max(distancia * 1.6, 500), 1100);
  const curva = Math.min(distancia * 0.12, 40);
  const [nx, ny] = [-dy / distancia, dx / distancia];
  const ponto = (t: number) => {
    const arco = Math.sin(Math.PI * t) * curva;
    return [x1 + dx * t + nx * arco, y1 + dy * t + ny * arco];
  };
  return new Promise<void>((pronto) => {
    const inicio = performance.now();
    function quadro(agora: number) {
      const bruto = Math.min((agora - inicio) / duracao, 1);
      const t = bruto < 0.5 ? 2 * bruto * bruto : 1 - (-2 * bruto + 2) ** 2 / 2;
      const [x, y] = ponto(t);
      const [ax, ay] = ponto(Math.min(t + 0.02, 1));
      const [bx, by] = ponto(Math.max(t - 0.02, 0));
      colocarAviao(x, y, (Math.atan2(ay - by, ax - bx) * 180) / Math.PI, Math.sin(Math.PI * t));
      if (bruto < 1) requestAnimationFrame(quadro);
      else pronto();
    }
    requestAnimationFrame(quadro);
  });
}

// Medida ----------------------------------------------------------------------------------------

// Pontos ao longo da borda do país, a cada 2 unidades, para medir a distância até um toque.
function bordaDe(el: SVGPathElement) {
  let pontos = amostras.get(el);
  if (!pontos) {
    const total = el.getTotalLength();
    const passos = Math.max(40, Math.ceil(total / 2));
    pontos = Array.from({ length: passos + 1 }, (_, i) => el.getPointAtLength((total * i) / passos));
    amostras.set(el, pontos);
  }
  return pontos;
}

function medirPouso(alvo: Id, x: number, y: number) {
  const el = paises.get(alvo)!;
  if (el.isPointInFill(new DOMPoint(x, y))) return { dentro: true, distancia: 0 };
  const distancia = Math.min(...bordaDe(el).map((p) => Math.hypot(p.x - x, p.y - y)));
  return { dentro: distancia / u <= FOLGA_DO_DEDO, distancia };
}

// Em km arredondados, que é como se fala de distância.
function quilometros(distancia: number) {
  const km = distancia * REGIOES[estado.regiao].km;
  if (km < 100) return "menos de 100 km";
  const passo = km < 1000 ? 50 : 100;
  return `uns ${(Math.round(km / passo) * passo).toLocaleString("pt-BR")} km`;
}

// Toque -----------------------------------------------------------------------------------------

function paisNoPonto(clienteX: number, clienteY: number) {
  const el = document.elementFromPoint(clienteX, clienteY)?.closest<SVGPathElement>(".pais");
  return (el?.dataset.pais as Id | undefined) ?? null;
}

mapa.addEventListener("pointerdown", (evento) => {
  if (travado) return;
  const ponto = new DOMPoint(evento.clientX, evento.clientY).matrixTransform(mapa.getScreenCTM()!.inverse());
  const x = Math.min(Math.max(ponto.x, 0), largura);
  const y = Math.min(Math.max(ponto.y, 0), altura);
  pousar(x, y, paisNoPonto(evento.clientX, evento.clientY));
});

// Pelo teclado, Enter num país pousa no meio dele.
mapa.addEventListener("keydown", (evento) => {
  const id = (evento.target as SVGElement).dataset?.pais as Id | undefined;
  if (!id || (evento.key !== "Enter" && evento.key !== " ")) return;
  evento.preventDefault();
  if (!travado) pousar(...centro(id), id);
});

function marcarErro(x: number, y: number, alvo: Id) {
  const [cx, cy] = centro(alvo);
  const t = 7 * u;
  camadas.erro.replaceChildren(
    criar("line", { class: "erro-linha", x1: x, y1: y, x2: cx, y2: cy }),
    criar("path", { class: "erro-x", d: `M${x - t} ${y - t}L${x + t} ${y + t}M${x + t} ${y - t}L${x - t} ${y + t}` }),
  );
  const el = paises.get(alvo)!;
  el.classList.add("certo");
  el.parentNode!.append(el);
}

async function pousar(x: number, y: number, tocado: Id | null) {
  const anterior = estado;
  const alvo = destino(anterior);
  const { dentro, distancia } = medirPouso(alvo, x, y);
  const jogada = entregar(anterior, dentro, distancia);

  travar(true);
  camadas.erro.replaceChildren();
  somDecolar();
  falar("");
  await animarVoo(x, y);
  somPousar();

  if (jogada.pouso === "na-mosca") {
    somNaMosca();
    const ponto = centroDe(voo);
    estourar(ponto, ["💌", "#ffc933", "#ff5a5f"], 12, 80);
    flutuar(ponto, `+${jogada.pontos}`);
    falar(`Na mosca! Entregue ${noPais(alvo)}.`);
    await animarVoo(...centro(alvo));
  } else {
    const isso = tocado && tocado !== alvo ? `Isso é ${oPais(tocado)}. ` : "";
    marcarErro(x, y, alvo);
    if (jogada.pouso === "perto") {
      somPerto();
      flutuar(centroDe(voo), `+${jogada.pontos}`);
      falar(`${isso}Pertinho! ${maiuscula(oPais(alvo))} fica a ${quilometros(distancia)} daqui.`);
    } else {
      somLonge();
      falar(`${isso}Longe! ${maiuscula(oPais(alvo))} fica a ${quilometros(distancia)} daqui.`);
    }
    // O coração some na hora do erro, antes de o avião ir entregar.
    moldura.placa({ ...anterior, vidas: jogada.estado.vidas });
    await esperar(1300);
    somDecolar();
    await animarVoo(...centro(alvo));
    somEntregou();
    paises.get(alvo)!.classList.remove("certo");
  }
  await depoisDaEntrega(anterior, jogada, alvo);
}

async function depoisDaEntrega(anterior: Estado, jogada: Jogada, alvo: Id) {
  // O país entregue ganha a bandeira, mesmo quando a fase seguinte já veio no estado.
  const feita: Estado = { ...anterior, revelados: [...anterior.revelados, alvo], daFase: anterior.daFase + jogada.pontos };
  estado = feita;
  desenharMapa();
  pular(paises.get(alvo)!, 1.04);
  await esperar(900);

  estado = jogada.estado;
  moldura.placa(estado);
  if (jogada.seguinte === "fim") {
    moldura.fim(estado, "O avião ficou sem corações no meio da viagem.");
    return;
  }
  if (jogada.seguinte === "fase") {
    somVitoria();
    confete();
    await esperar(900);
    moldura.salvar(estado);
    moldura.mostrar(telaFase(feita));
    return;
  }
  camadas.erro.replaceChildren();
  desenharMapa();
  desenharCarta();
  travar(false);
}

// Fases -----------------------------------------------------------------------------------------

function prepararFase() {
  trocarRegiao();
  camadas.erro.replaceChildren();
  for (const el of paises.values()) el.classList.remove("certo");
  // O avião começa cada região no meio do mapa.
  colocarAviao(largura / 2, altura / 2, 0);
  desenharMapa();
  desenharCarta();
  moldura.placa(estado);
  falar(estado.fase === 1 ? "Toque no país da carta: o avião voa até onde você tocar!" : `${REGIOES[estado.regiao].nome}: toque onde fica o país.`);
  travar(false);
}

function seguir() {
  prepararFase();
  const novidade = NOVIDADES[estado.fase];
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

// O passaporte ganha um carimbo de cada país da fase, com a bandeira e a capital.
function telaFase({ fase, revelados, daFase }: Estado) {
  const carimbos = revelados
    .map((id) => {
      const capital = capitalDe(id);
      return `<li>${bandeira(id, "")}<span><strong>${nomeDe(id)}</strong>${capital ? `<small>Capital: ${capital}</small>` : ""}</span></li>`;
    })
    .join("");
  return `<h2>Fase ${fase} completa!</h2>
    <p class="placar">+${daFase} pontos</p>
    <ul class="passaporte">${carimbos}</ul>
    <button class="botao" type="button" data-acao="seguir">Continuar</button>`;
}
