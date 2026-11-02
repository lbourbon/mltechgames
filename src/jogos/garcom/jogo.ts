import { porId } from "../kit/dom";
import { centroDe, confete, estourar, flutuar, lancar, pular, tremer } from "../kit/efeitos";
import { criarMoldura } from "../kit/moldura";
import { somVitoria } from "../kit/som";
import { esperar } from "../kit/tempo";
import { CORES, ITEM, type Item } from "./cardapio";
import {
  colocar,
  configDaFase,
  enfeiteNovo,
  enfeites,
  MAX_BANDEJA,
  novidades,
  novoJogo,
  servir,
  tirar,
  usarDica,
  type Estado,
  type Jogada,
  type Linha,
} from "./logica";
import {
  somArroto,
  somChefao,
  somChegou,
  somColocar,
  somCuspir,
  somFaltou,
  somNhac,
  somSatisfeito,
  somSino,
  somTirar,
} from "./sons";

const CLIENTES = [
  { id: "verde", pele: "#18b67e" },
  { id: "roxo", pele: "#a45cff" },
  { id: "azul", pele: "#2f9bff" },
  { id: "laranja", pele: "#ff9a3d" },
  { id: "rosa", pele: "#ff6fa8" },
];
const CHEFAO = { id: "chefao", pele: "#e5484d" };
const ELOGIOS = ["Yummy!", "Delicious!", "Thank you!", "So good!", "Yum, yum!"];
const SEQUENCIA_PERFEITA = 3;
const CHANCE_DE_ARROTO = 1 / 3;
const TROCA_DE_CLIENTE_MS = 320;
const COMER_MS = 240;
const FESTA_MS = 1300;
const RECLAMAR_MS = 1500;
// Acima disso a letra diminui, para o pedido do chefão caber no balão de um celular pequeno.
const FRASE_LONGA = 44;

// Explica o que há de novo na forma de pedir, sem traduzir as palavras.
const AVISOS: Record<number, string> = {
  3: "Agora eles também pedem coisas que não são comida. Monstrinho come de tudo!",
  4: "Agora eles pedem mais de um: two é 2 e three é 3. Toque quantas vezes precisar.",
  5: "Agora a cor conta! Olhe bem antes de pôr na bandeja.",
  6: "Agora vêm dois pedidos de uma vez. Só toque no sino quando estiver tudo na bandeja.",
  7: "Cuidado: agora eles dizem o que não querem. No é não!",
  8: "Agora a ordem conta: first vai primeiro na bandeja, then vai depois.",
  9: "Chegaram os indecisos! Eles mudam de ideia: wait! quer dizer espere.",
  10: "Agora eles não dizem o que querem. Só contam o que aconteceu, e você descobre o que resolve.",
  11: "Hora de adivinhar! Eles descrevem o que querem sem dizer o nome.",
  12: "Agora vale tudo! Qualquer tipo de pedido pode aparecer.",
};

const cliente = porId("cliente");
const boca = cliente.querySelector(".boca")!;
const balao = porId("balao");
const frase = porId("frase");
const desenho = porId("desenho");
const botaoDica = porId("dica") as HTMLButtonElement;
const parede = porId("parede");
const trilha = porId("trilha");
const bandeja = porId("bandeja");
const sino = porId("sino") as HTMLButtonElement;
const cozinha = porId("cozinha");
const jogo = document.querySelector(".jogo")!;

const moldura = criarMoldura({ aoComecar: comecar, aoSeguir: chegar });

let estado: Estado = novoJogo();
let ocupado = true;

function travar(valor: boolean) {
  ocupado = valor;
  cozinha.dataset.pronta = valor ? "" : "1";
  sino.disabled = valor || estado.bandeja.length === 0;
  botaoDica.disabled = valor;
}

function arte({ emoji, forma, cor }: Item) {
  if (emoji) return `<span class="arte">${emoji}</span>`;
  return `<svg class="arte" style="color: ${CORES[cor!]}" aria-hidden="true"><use href="#forma-${forma}"></use></svg>`;
}

const maiuscula = (texto: string) => texto[0].toUpperCase() + texto.slice(1);

function desenharCozinha() {
  cozinha.dataset.colunas = String(configDaFase(estado.fase).prateleira / 2);
  cozinha.innerHTML = estado.prateleira
    .map((id) => `<button class="item" type="button" data-item="${id}" aria-label="${ITEM[id].en}">${arte(ITEM[id])}</button>`)
    .join("");
}

function desenharBandeja() {
  bandeja.innerHTML = estado.bandeja
    .map((id, i) => `<button class="na-bandeja" type="button" data-indice="${i}" aria-label="Tirar ${ITEM[id].en}">${arte(ITEM[id])}</button>`)
    .join("");
  sino.disabled = ocupado || estado.bandeja.length === 0;
}

function desenharPedido() {
  const { pedido, dica } = estado;
  balao.classList.remove("reacao");
  balao.classList.toggle("longo", pedido.frase.length > FRASE_LONGA);
  frase.textContent = pedido.frase;
  const uma = ({ aceita, quantos }: Linha) => arte(ITEM[aceita[0]]).repeat(quantos);
  desenho.innerHTML = dica ? pedido.linhas.map(uma).join(pedido.emOrdem ? "<span>➡️</span>" : "") : "";
  botaoDica.hidden = dica;
}

function dizer(texto: string, humor: string) {
  balao.classList.add("reacao");
  balao.classList.remove("longo");
  frase.textContent = texto;
  desenho.innerHTML = "";
  botaoDica.hidden = true;
  cliente.dataset.humor = humor;
}

function desenharSala() {
  const { fase, numero, pedido } = estado;
  const { pedidos } = configDaFase(fase);
  moldura.placa(estado);
  parede.textContent = enfeites(fase).join(" ");
  trilha.innerHTML = Array.from({ length: pedidos }, (_, i) => {
    const classe = i < numero ? "feita" : i === pedidos - 1 ? "ultima" : "";
    return `<span class="marca ${classe}"></span>`;
  }).join("");
  trilha.setAttribute("aria-label", `Cliente ${numero + 1} de ${pedidos}`);

  const { id, pele } = pedido.tipo === "chefao" ? CHEFAO : CLIENTES[(fase + numero) % CLIENTES.length];
  cliente.dataset.cliente = id;
  cliente.style.setProperty("--pele", pele);
  cliente.style.setProperty("--cheio", "0");
  cliente.dataset.humor = "";
}

async function chegar() {
  travar(true);
  balao.hidden = true;
  cliente.dataset.fora = "1";
  await esperar(TROCA_DE_CLIENTE_MS);

  desenharSala();
  desenharCozinha();
  desenharBandeja();
  desenharPedido();
  cliente.dataset.fora = "";
  if (estado.pedido.tipo === "chefao") somChefao();
  else somChegou();
  await esperar(TROCA_DE_CLIENTE_MS);

  balao.hidden = false;
  travar(false);
}

function voar(id: string, de: { x: number; y: number }, para: { x: number; y: number }, duracao: number, arco: number) {
  const voando = lancar(de, para, "item-voando", "", duracao, arco);
  if (voando) voando.innerHTML = arte(ITEM[id]);
}

// Peça por peça, com a barriga crescendo. Comer uma meia é tão bom quanto comer uma pizza.
async function comerBandeja(itens: string[]) {
  const pecas = [...bandeja.children];
  cliente.dataset.humor = "nhac";
  for (const [i, id] of itens.entries()) {
    voar(id, centroDe(pecas[i]), centroDe(boca), COMER_MS, 34);
    pecas[i].remove();
    await esperar(COMER_MS);
    somNhac();
    cliente.style.setProperty("--cheio", String((i + 1) / itens.length));
    estourar(centroDe(boca), ["#ffc933", "#fff"], 4, 40);
  }
}

async function festejar({ estado: novo }: Jogada, anterior: Estado) {
  await comerBandeja(anterior.bandeja);
  const ganhou = novo.pontos - anterior.pontos;
  const chefao = anterior.pedido.tipo === "chefao";
  flutuar(centroDe(boca), `+${ganhou}`, "efeito-ouro");
  estourar(centroDe(cliente), ["💚", "⭐", "#ffc933", "#18b67e"], 12, 110);
  if (chefao || Math.random() < CHANCE_DE_ARROTO) {
    somArroto();
    dizer("BUUURP! Excuse me!", "arroto");
  } else {
    somSatisfeito(novo.sequencia);
    const elogio = ELOGIOS[Math.floor(Math.random() * ELOGIOS.length)];
    dizer(novo.sequencia >= SEQUENCIA_PERFEITA ? "Perfect!" : elogio, "feliz");
  }
  moldura.placa({ ...novo, fase: anterior.fase });
}

// O monstrinho diz o nome do que recebeu: o erro também mostra a palavra daquela coisa.
async function reclamar({ estado: novo, sobraram }: Jogada) {
  const [recusado] = sobraram;
  if (recusado) voar(recusado, centroDe(boca), { x: -60, y: 20 }, 420, 60);
  somCuspir();
  tremer(jogo, 9);
  dizer(recusado ? `${maiuscula(ITEM[recusado].en)}? No, no!` : "Oops! Wrong order!", "enjoado");
  desenharBandeja();
  moldura.placa(novo);
  await esperar(RECLAMAR_MS);
}

async function tocarSino() {
  if (ocupado || estado.bandeja.length === 0) return;
  travar(true);
  somSino();
  pular(sino.querySelector(".sino-icone")!, 1.5);

  const anterior = estado;
  const jogada = servir(estado);
  estado = jogada.estado;

  switch (jogada.resultado) {
    case "faltou":
      somFaltou();
      dizer("More, please!", "");
      await esperar(RECLAMAR_MS / 2);
      break;
    case "errou":
    case "ordem":
      await reclamar(jogada);
      cliente.dataset.humor = "";
      break;
    case "fim":
      await reclamar(jogada);
      moldura.fim(estado, "O monstrinho saiu de barriga vazia.");
      return;
    case "certo":
      await festejar(jogada, anterior);
      await esperar(FESTA_MS);
      chegar();
      return;
    case "fase":
      moldura.salvar(estado);
      await festejar(jogada, anterior);
      somVitoria();
      confete();
      await esperar(FESTA_MS);
      moldura.mostrar(telaFase(anterior.fase));
      return;
  }
  desenharPedido();
  travar(false);
}

function novidadeDaFase(fase: number) {
  const aviso = AVISOS[fase] ? `<p>${AVISOS[fase]}</p>` : "";
  const itens = novidades(fase)
    .map((item) => `<li class="novo-item">${arte(item)}<span lang="en">${item.en}</span></li>`)
    .join("");
  return `${aviso}${itens ? `<p><strong>Chegou na cozinha:</strong></p><ul class="vitrine">${itens}</ul>` : ""}`;
}

function telaFase(concluida: number) {
  const enfeite = enfeiteNovo(estado.fase);
  return `<h2>Fase ${concluida} completa!</h2>
    ${enfeite ? `<p>Novo enfeite no restaurante: <span class="enfeite-novo">${enfeite}</span></p>` : ""}
    ${novidadeDaFase(estado.fase)}
    <button class="botao" type="button" data-acao="seguir">Continuar</button>`;
}

function telaEstreia(fase: number) {
  return `<h2>Fase ${fase}</h2>
    ${novidadeDaFase(fase)}
    <button class="botao" type="button" data-acao="seguir">Continuar</button>`;
}

function comecar(fase: number) {
  estado = novoJogo(fase);
  moldura.placa(estado);
  if (fase > 1) moldura.mostrar(telaEstreia(fase));
  else chegar();
}

cozinha.addEventListener("click", (evento) => {
  const botao = (evento.target as HTMLElement).closest<HTMLElement>("[data-item]");
  if (!botao || ocupado || estado.bandeja.length >= MAX_BANDEJA) return;
  estado = colocar(estado, botao.dataset.item!);
  somColocar(estado.bandeja.length);
  const quantos = estado.bandeja.length;
  voar(botao.dataset.item!, centroDe(botao), centroDe(bandeja), 160, 18);
  desenharBandeja();
  pular(bandeja.children[quantos - 1], 1.25);
});

bandeja.addEventListener("click", (evento) => {
  const botao = (evento.target as HTMLElement).closest<HTMLElement>("[data-indice]");
  if (!botao || ocupado) return;
  estado = tirar(estado, Number(botao.dataset.indice));
  somTirar();
  desenharBandeja();
});

sino.addEventListener("click", tocarSino);

botaoDica.addEventListener("click", () => {
  if (ocupado) return;
  estado = usarDica(estado);
  desenharPedido();
  pular(desenho);
});
