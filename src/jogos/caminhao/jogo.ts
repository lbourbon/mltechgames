import { porId } from "../kit/dom";
import { centroDe, confete, estourar, flutuar, pular, tremer } from "../kit/efeitos";
import { criarMoldura } from "../kit/moldura";
import { somVitoria } from "../kit/som";
import { esperar } from "../kit/tempo";
import { doEstado, ESTADOS, paraACapital, paraOEstado, SIGLAS, type Sigla } from "./estados";
import {
  andar,
  menorRota,
  novoJogo,
  pedirDica,
  pistaDaFase,
  ULTIMA_FASE_MANSA,
  vizinhos,
  type Estado,
  type Jogada,
  type Pedido,
  type Situacao,
} from "./logica";
import { somBuzina, somEntregou, somLonge, somMotor, somPegou, somSeco } from "./sons";

// Até onde um toque perto de um vizinho ainda conta, para os estados pequenos.
const RAIOS_DE_BUSCA = [6, 12, 18, 26];
const DURACAO_DA_VIAGEM = 420;

const NOVIDADES: Record<number, { titulo: string; texto: string }> = {
  2: {
    titulo: "As regiões",
    texto: "O Brasil tem cinco regiões: Norte, Nordeste, Centro-Oeste, Sudeste e Sul. Cada uma ganha uma cor quando o caminhão passa por ela.",
  },
  [ULTIMA_FASE_MANSA + 1]: {
    titulo: "Agora é sério!",
    texto: "Ficar sem combustível custa um coração. E agora o caminhão começa vazio: primeiro vá buscar a carga.",
  },
  4: {
    titulo: "Sem marcas no mapa",
    texto: "Agora o pedido só diz o nome do estado. Cuidado com os parecidos: Pará é PA, Paraíba é PB e Paraná é PR!",
  },
  6: {
    titulo: "Sem siglas!",
    texto: "Agora o mapa não mostra as siglas. Por onde o caminhão passa, a sigla aparece.",
  },
  7: {
    titulo: "Planeje a rota!",
    texto: "O tanque ficou curto: fazer uma encomenda de cada vez não dá. Pegue as cargas que estão no caminho antes de entregar.",
  },
  8: {
    titulo: "Capitais!",
    texto: "Agora os pedidos dizem a cidade. Salvador é a capital da Bahia, Manaus é a do Amazonas, Curitiba é a do Paraná...",
  },
  9: {
    titulo: "Três encomendas",
    texto: "O caminhão está cheio de serviço! Agora são três encomendas por viagem.",
  },
};

const estrada = porId("estrada");
const mapa = porId("mapa") as unknown as SVGSVGElement;
const marcas = porId("marcas");
const caminhao = porId("caminhao");
const pedidos = porId("pedidos");
const fala = porId("fala");
const campoCombustivel = porId("combustivel");
const barra = porId("barra");
const botaoDica = porId("dica") as HTMLButtonElement;

const [minX, minY, largura, altura] = estrada.dataset.caixa!.split(" ").map(Number);
estrada.style.aspectRatio = `${largura} / ${altura}`;

const ufs = new Map<Sigla, SVGPathElement>(
  [...mapa.querySelectorAll<SVGPathElement>(".uf")].map((el) => [el.dataset.uf as Sigla, el]),
);
const rotulos = new Map<Sigla, SVGGElement>(
  [...mapa.querySelectorAll<SVGGElement>(".rotulo")].map((el) => [el.dataset.uf as Sigla, el]),
);

const moldura = criarMoldura({ aoComecar: comecar, aoSeguir: seguir });

let estado: Estado = novoJogo();
let travado = true;
let novidadeVista = 0;
// Depois de ficar sem combustível, a dica aparece.
let secouNaFase = false;

function falar(texto: string) {
  fala.textContent = texto;
}

function travar(valor: boolean) {
  travado = valor;
  estrada.dataset.pronta = valor ? "" : "1";
  botaoDica.disabled = valor;
}

const maiuscula = (texto: string) => texto[0].toUpperCase() + texto.slice(1);

function textoDoPedido({ emoji, nome, de, para }: Pedido) {
  const pista = pistaDaFase(estado.fase);
  const sigla = (s: Sigla) => (pista.siglaNoPedido ? ` (${s})` : "");
  const destino = pista.capital ? paraACapital(para) : `${paraOEstado(para)}${sigla(para)}`;
  return `${emoji} ${maiuscula(nome)} ${doEstado(de)}${sigla(de)} ${destino}`;
}

const ICONE: Record<Situacao, string> = { esperando: "📍", levando: "🚚", entregue: "✅" };
const ROTULO: Record<Situacao, string> = { esperando: "Buscar", levando: "No caminhão", entregue: "Entregue" };

function desenharPedidos() {
  pedidos.replaceChildren(
    ...estado.viagem.pedidos.map((pedido, i) => {
      const item = document.createElement("li");
      const situacao = estado.situacao[i];
      item.className = `pedido ${situacao}`;
      item.innerHTML = `<span class="situacao" title="${ROTULO[situacao]}">${ICONE[situacao]}</span><span></span>`;
      item.lastElementChild!.textContent = textoDoPedido(pedido);
      item.setAttribute("aria-label", `${ROTULO[situacao]}: ${textoDoPedido(pedido)}`);
      return item;
    }),
  );
}

function desenharCombustivel() {
  const { combustivel, viagem, posicao, situacao } = estado;
  campoCombustivel.textContent = String(combustivel);
  barra.style.width = `${(combustivel / viagem.tanque) * 100}%`;
  // Sem nenhuma sobra: qualquer desvio acaba com a viagem.
  barra.dataset.pouco = menorRota(viagem.pedidos, posicao, situacao) >= combustivel ? "1" : "";
}

function marca(sigla: Sigla, texto: string, classe: string, deslocamento = 0) {
  const [x, y] = ESTADOS[sigla].centro;
  const el = document.createElementNS("http://www.w3.org/2000/svg", "text");
  el.setAttribute("class", `marca ${classe}`);
  el.setAttribute("x", String(x + deslocamento));
  el.setAttribute("y", String(y - 26));
  el.textContent = texto;
  return el;
}

function desenharMarcas() {
  const mostrar = pistaDaFase(estado.fase).marcas || estado.dica;
  if (!mostrar) {
    marcas.replaceChildren();
    return;
  }
  marcas.replaceChildren(
    ...estado.viagem.pedidos.flatMap((pedido, i) => {
      const situacao = estado.situacao[i];
      if (situacao === "entregue") return [];
      const destino = marca(pedido.para, `🏁${pedido.emoji}`, "destino");
      return situacao === "esperando" ? [marca(pedido.de, pedido.emoji, "origem"), destino] : [destino];
    }),
  );
}

function desenharMapa() {
  const { posicao, visitados } = estado;
  const { siglas } = pistaDaFase(estado.fase);
  for (const sigla of SIGLAS) {
    const el = ufs.get(sigla)!;
    el.classList.toggle("visitado", visitados.includes(sigla));
    el.classList.toggle("aqui", sigla === posicao);
    el.classList.toggle("vizinho", vizinhos(posicao, sigla));
    rotulos.get(sigla)!.classList.toggle("visivel", siglas || visitados.includes(sigla));
  }
  // O estado atual vem por cima, para o contorno dele não ficar escondido pelos vizinhos.
  ufs.get(posicao)!.parentNode!.append(ufs.get(posicao)!);
  desenharMarcas();
}

let paraDireita = false;

function moverCaminhao(sigla: Sigla) {
  const [x, y] = ESTADOS[sigla].centro;
  const esquerda = ((x - minX) / largura) * 100;
  const atual = parseFloat(caminhao.style.left || "0");
  if (Math.abs(esquerda - atual) > 0.5) paraDireita = esquerda > atual;
  caminhao.style.left = `${esquerda}%`;
  caminhao.style.top = `${((y - minY) / altura) * 100}%`;
  caminhao.dataset.direita = paraDireita ? "1" : "";
}

function desenharTudo() {
  estrada.dataset.posicao = estado.posicao;
  desenharMapa();
  desenharPedidos();
  desenharCombustivel();
  moverCaminhao(estado.posicao);
  moldura.placa(estado);
  botaoDica.hidden = !secouNaFase || estado.dica || pistaDaFase(estado.fase).marcas;
}

// Toque -----------------------------------------------------------------------------------------

function estadoNoPonto(x: number, y: number) {
  const el = document.elementFromPoint(x, y)?.closest<SVGPathElement>(".uf");
  return (el?.dataset.uf as Sigla | undefined) ?? null;
}

// Vale o estado tocado. Se ele não é vizinho, procura um vizinho bem perto do dedo, porque
// Sergipe e o Distrito Federal são pequenos demais para um dedo de criança.
function escolher(x: number, y: number) {
  const tocado = estadoNoPonto(x, y);
  if (tocado && (tocado === estado.posicao || vizinhos(estado.posicao, tocado))) return tocado;
  for (const raio of RAIOS_DE_BUSCA) {
    for (let k = 0; k < 12; k++) {
      const angulo = (k / 12) * Math.PI * 2;
      const perto = estadoNoPonto(x + Math.cos(angulo) * raio, y + Math.sin(angulo) * raio);
      if (perto && vizinhos(estado.posicao, perto)) return perto;
    }
  }
  return tocado;
}

mapa.addEventListener("pointerdown", (evento) => {
  if (travado) return;
  const sigla = escolher(evento.clientX, evento.clientY);
  if (sigla) irPara(sigla);
});

mapa.addEventListener("keydown", (evento) => {
  const sigla = (evento.target as SVGElement).dataset?.uf as Sigla | undefined;
  if (!sigla || (evento.key !== "Enter" && evento.key !== " ")) return;
  evento.preventDefault();
  if (!travado) irPara(sigla);
});

async function irPara(sigla: Sigla) {
  const anterior = estado;
  const jogada = andar(estado, sigla);
  if (jogada.resultado === "parado") {
    pular(caminhao, 1.2);
    falar(`O caminhão está ${noEstado(sigla)}.`);
    return;
  }
  if (jogada.resultado === "longe") {
    somLonge();
    tremer(ufs.get(sigla)!, 4);
    falar(`${ESTADOS[sigla].nome} não faz fronteira com ${ESTADOS[anterior.posicao].nome}. Vá por um vizinho!`);
    return;
  }

  travar(true);
  somMotor();
  moverCaminhao(sigla);
  ufs.get(sigla)!.classList.add("visitado");
  rotulos.get(sigla)!.classList.add("visivel");
  falar(ESTADOS[sigla].nome);
  await esperar(DURACAO_DA_VIAGEM);
  await chegou(anterior, jogada, sigla);
}

const noEstado = (sigla: Sigla) => {
  const { artigo, nome } = ESTADOS[sigla];
  return `${artigo === "o" ? "no" : artigo === "a" ? "na" : "em"} ${nome}`;
};

function comemorar(anterior: Estado, { pegou, entregou }: Jogada) {
  const ponto = centroDe(caminhao);
  if (entregou.length > 0) {
    somEntregou();
    estourar(ponto, [...entregou.map((i) => anterior.viagem.pedidos[i].emoji), "#ffc933"], 10, 70);
    flutuar(ponto, "Entregue!");
  } else if (pegou.length > 0) {
    somPegou();
    estourar(ponto, pegou.map((i) => anterior.viagem.pedidos[i].emoji), 6, 40);
    pular(caminhao, 1.3);
  } else {
    somBuzina();
  }
}

async function chegou(anterior: Estado, jogada: Jogada, sigla: Sigla) {
  comemorar(anterior, jogada);
  if (jogada.resultado === "fase") {
    // A fase seguinte já veio no estado: o mapa fica como estava até o painel.
    falar("Todas as encomendas entregues!");
    estado = {
      ...anterior,
      posicao: sigla,
      situacao: anterior.situacao.map(() => "entregue"),
      combustivel: anterior.combustivel - 1,
      visitados: [...anterior.visitados, sigla],
    };
    secouNaFase = false;
    desenharMapa();
    desenharPedidos();
    desenharCombustivel();
    await esperar(600);
    somVitoria();
    confete();
    await esperar(1200);
    estado = jogada.estado;
    moldura.placa(estado);
    moldura.salvar(estado);
    moldura.mostrar(telaFase(anterior.fase, estado.pontos - anterior.pontos, anterior.limpa));
    return;
  }

  if (jogada.resultado === "seco" || jogada.resultado === "fim") {
    somSeco();
    // O caminhão se centraliza com translate: quem treme é o desenho dentro dele.
    tremer(caminhao.firstElementChild!, 6);
    falar("O combustível não dá mais para terminar a viagem!");
    estado = jogada.estado;
    moldura.placa(estado);
    await esperar(1000);
    if (jogada.resultado === "fim") {
      moldura.fim(estado, "O caminhão ficou sem combustível no meio da estrada.");
      return;
    }
    secouNaFase = true;
    moldura.mostrar(telaSeco(estado.fase <= ULTIMA_FASE_MANSA));
    return;
  }

  estado = jogada.estado;
  desenharTudo();
  if (jogada.entregou.length > 0) falar(`Entregue ${noEstado(sigla)}!`);
  else if (jogada.pegou.length > 0) falar(`Carga no caminhão!`);
  travar(false);
}

botaoDica.addEventListener("click", () => {
  if (travado) return;
  estado = pedirDica(estado);
  desenharTudo();
  falar("As marcas mostram onde buscar e onde entregar.");
});

// Fases -----------------------------------------------------------------------------------------

function prepararViagem() {
  // Numa viagem nova o caminhão aparece direto no lugar, sem atravessar o mapa.
  caminhao.style.transition = "none";
  desenharTudo();
  caminhao.getBoundingClientRect();
  caminhao.style.transition = "";
  falar(estado.fase === 1 ? "Toque num estado vizinho para o caminhão andar." : "");
  travar(false);
}

function seguir() {
  prepararViagem();
  const novidade = NOVIDADES[estado.fase];
  if (!novidade || novidadeVista === estado.fase) return;
  novidadeVista = estado.fase;
  travar(true);
  moldura.mostrar(telaNovidade(novidade.titulo, novidade.texto));
}

function comecar(fase: number) {
  estado = novoJogo(fase);
  novidadeVista = 0;
  secouNaFase = false;
  seguir();
}

function telaNovidade(titulo: string, texto: string) {
  return `<h2>${titulo}</h2>
    <p>${texto}</p>
    <button class="botao" type="button" data-acao="seguir">Continuar</button>`;
}

function telaFase(concluida: number, bonus: number, limpa: boolean) {
  return `<h2>Fase ${concluida} completa!</h2>
    <p class="placar">+${bonus} pontos</p>
    <p>${limpa ? "Rota perfeita, sem nenhum aperto!" : "Todas as encomendas chegaram!"}</p>
    <button class="botao" type="button" data-acao="seguir">Continuar</button>`;
}

function telaSeco(mansa: boolean) {
  return `<h2>Acabou o combustível!</h2>
    <p>${mansa ? "Sem problema: a viagem recomeça do mesmo lugar." : "Você perdeu uma vida. A viagem recomeça do mesmo lugar."} Procure um caminho mais curto pelos vizinhos.</p>
    <button class="botao" type="button" data-acao="seguir">Tentar de novo</button>`;
}
