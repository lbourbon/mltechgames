import { porId } from "../kit/dom";
import { centroDe, confete, estourar, flutuar, lancar, pular, tremer } from "../kit/efeitos";
import { criarMoldura } from "../kit/moldura";
import { somVitoria } from "../kit/som";
import { telaFase, telaNovidade } from "../kit/telas";
import { esperar } from "../kit/tempo";
import { casinha, COR, NOME, svgPresente } from "./desenho";
import {
  cartaAtual,
  cheioDoSaco,
  entregar,
  escolherNaCasa,
  novoJogo,
  pacoteCheio,
  pedidoAtual,
  por,
  tirar,
  type Cor,
  type Estado,
  type Pista,
} from "./logica";
import { somCerto, somEntregou, somErrou, somFalta, somGarca, somNegou, somPor, somSacoCheio, somTirar } from "./sons";

const VOO = 420;
const CRIANCAS = ["🧒", "👧", "👦", "👧🏽", "🧒🏿", "👦🏻", "👧🏾", "🧒🏼"];
const PAREDES = ["#ffe3c2", "#d8ecff", "#ffd6e4", "#e2f6d2", "#fff1b0", "#e6dcff"];
const TELHADOS = ["#c0392b", "#2f7bff", "#18b67e", "#7a4b2a", "#a45cff", "#e0662a"];

const recado = ({ cores, total }: Pista) =>
  `<p class="recado">${cores.map((cor) => svgPresente(cor, "mini")).join('<span class="sinal">+</span>')}<span class="sinal">=</span><strong>${total}</strong></p>`;

// A estreia de cada ideia. Quem volta direto para essa noite também vê.
const NOVIDADES: Record<number, { titulo: string; texto: string; miolo?: string; emblema?: string }> = {
  4: { titulo: "Três presentes!", texto: "Agora o bilhete da garça tem três lugares.", emblema: "🎁" },
  5: { titulo: "Presente amarelo!", texto: "Chegou uma cor nova na prateleira.", miolo: svgPresente("amarelo", "novidade-presente"), emblema: "✨" },
  6: {
    titulo: "Presente misterioso!",
    texto: "Uma cor chegou com ?. O recado na parede conta quanto ela vale: se dois vermelhos dão 10, cada vermelho vale 5.",
    miolo: recado({ cores: ["vermelho", "vermelho"], total: 10 }),
    emblema: "❓",
  },
  7: {
    titulo: "Outro recado!",
    texto: "Agora o recado junta o misterioso com outra cor. Quanto sobra para ele?",
    miolo: recado({ cores: ["azul", "verde"], total: 9 }),
    emblema: "📝",
  },
  9: {
    titulo: "Dois misteriosos!",
    texto: "Descubra o primeiro com o primeiro recado. Ele ajuda a descobrir o segundo.",
    emblema: "❓",
  },
  10: { titulo: "Quatro presentes!", texto: "O bilhete agora tem quatro lugares. Capriche!", emblema: "🎁" },
};

const jogo = document.querySelector<HTMLElement>(".jogo")!;
const cena = porId("cena");
const pistasEl = porId("pistas");
const sacoEl = porId("saco");
const contador = porId("contador");
const garcaEl = porId("garca");
const bilhete = porId("bilhete");
const alvoEl = porId("alvo");
const vagasEl = porId("vagas");
const treno = porId("treno");
const rua = porId("rua");
const fala = porId("fala");
const prateleira = porId("prateleira");
const pronto = porId("pronto") as HTMLButtonElement;

const moldura = criarMoldura({ aoComecar: comecar, aoSeguir: () => aoContinuar() });

let estado: Estado = novoJogo();
let travado = true;
let novidadeVista = 0;
let inicioDaFase = { vidas: 0, pontos: 0 };
let aoContinuar = () => {};
let timerFala = 0;

function travar(valor: boolean) {
  travado = valor;
  jogo.dataset.travado = valor ? "1" : "";
}

function falar(texto: string, demora = 1600) {
  fala.textContent = texto;
  fala.classList.add("visivel");
  clearTimeout(timerFala);
  timerFala = window.setTimeout(() => fala.classList.remove("visivel"), demora);
}

const escondido = (cor: Cor) => estado.escondidas.includes(cor);

function desenharPrateleira() {
  const naEntrega = estado.modo === "entrega";
  prateleira.innerHTML = estado.cores
    .map((cor) => {
      const valor = escondido(cor) ? "?" : String(estado.valores[cor]);
      const quantos = estado.saco.filter((outra) => outra === cor).length;
      const vazio = naEntrega && quantos === 0;
      const rotulo = `Presente ${NOME[cor]}, vale ${escondido(cor) ? "um número misterioso" : valor}${naEntrega ? `, ${quantos} no saco` : ""}`;
      return `<button class="presente-botao" type="button" data-cor="${cor}" aria-label="${rotulo}" ${vazio ? "disabled" : ""} style="--cor: ${COR[cor]}">
        ${svgPresente(cor)}
        <span class="etiqueta${escondido(cor) ? " misterio" : ""}">${valor}</span>
        ${naEntrega ? `<span class="quantos">×${quantos}</span>` : ""}
      </button>`;
    })
    .join("");
}

function desenharPistas() {
  pistasEl.hidden = estado.pistas.length === 0;
  pistasEl.innerHTML = estado.pistas.map(recado).join("");
}

// Só os lugares: o número muda quando a próxima garça chega, para a que vai embora não levar o novo.
function desenharVagas() {
  vagasEl.innerHTML = estado.pacote
    .map((cor, i) =>
      cor
        ? `<button class="vaga cheia" type="button" data-vaga="${i}" aria-label="Tirar o presente ${NOME[cor]}">${svgPresente(cor)}</button>`
        : `<button class="vaga" type="button" data-vaga="${i}" aria-label="Lugar vazio" tabindex="-1"></button>`,
    )
    .join("");
  // Continua tocável: com lugar vazio, o toque explica o que falta.
  pronto.classList.toggle("esperando", !pacoteCheio(estado));
}

function desenharSaco() {
  cena.style.setProperty("--cheio", String(cheioDoSaco(estado)));
  contador.textContent = estado.modo === "fabrica" ? `${estado.atual}/${estado.cartas.length}` : "";
}

async function chegarGarca() {
  alvoEl.textContent = String(cartaAtual(estado).alvo);
  desenharVagas();
  garcaEl.dataset.voo = "chegando";
  somGarca();
  await esperar(VOO);
  garcaEl.dataset.voo = "parada";
  travar(false);
}

function abrirNoite() {
  const novidade = NOVIDADES[estado.fase];
  if (novidade && novidadeVista < estado.fase) {
    novidadeVista = estado.fase;
    aoContinuar = iniciarNoite;
    moldura.mostrar(telaNovidade(novidade));
    return;
  }
  iniciarNoite();
}

function iniciarNoite() {
  inicioDaFase = { vidas: estado.vidas, pontos: estado.pontos };
  cena.dataset.modo = "fabrica";
  garcaEl.dataset.voo = "fora";
  moldura.placa(estado);
  desenharPrateleira();
  desenharPistas();
  desenharSaco();
  falar(estado.fase === 1 ? "A garça trouxe um bilhete!" : "A fábrica abriu!");
  chegarGarca();
}

function comecar(fase: number) {
  travar(true);
  estado = novoJogo(fase);
  abrirNoite();
}

function porPresente(cor: Cor) {
  if (pacoteCheio(estado)) {
    tremer(bilhete);
    somFalta();
    falar("O bilhete já está cheio! Toque num presente dele para tirar.");
    return;
  }
  const lugar = estado.pacote.indexOf(null);
  estado = por(estado, cor);
  desenharVagas();
  somPor(lugar);
  pular(vagasEl.children[lugar], 1.2);
}

function tirarPresente(indice: number) {
  if (!estado.pacote[indice]) return;
  estado = tirar(estado, indice);
  desenharVagas();
  somTirar();
}

async function mandarProSaco() {
  if (travado || estado.modo !== "fabrica") return;
  if (!pacoteCheio(estado)) {
    tremer(bilhete);
    somFalta();
    falar("Ainda tem lugar vazio no bilhete!");
    return;
  }
  const jogada = entregar(estado);
  const { alvo } = cartaAtual(estado);

  if (jogada.resultado === "errado" || jogada.resultado === "fim") {
    estado = jogada.estado;
    moldura.placa(estado);
    tremer(bilhete, 9);
    garcaEl.dataset.voo = "nao";
    setTimeout(() => garcaEl.dataset.voo === "nao" && (garcaEl.dataset.voo = "parada"), 600);
    somErrou();
    falar(jogada.problema === "passou" ? `Passou do ${alvo}! Troque algum presente.` : `Falta para chegar no ${alvo}! Troque algum presente.`, 2400);
    if (jogada.resultado === "fim") {
      travar(true);
      await esperar(1000);
      moldura.fim(estado, "Os corações acabaram, e a garça foi descansar.");
    }
    return;
  }

  travar(true);
  const destino = centroDe(sacoEl);
  [...vagasEl.children].forEach((vaga, i) => {
    const voando = lancar(centroDe(vaga), destino, "presente-voando", "", VOO, 60);
    if (voando) voando.innerHTML = svgPresente(estado.pacote[i]!);
  });
  estado = jogada.estado;
  desenharVagas();
  somCerto();
  await esperar(VOO);
  pular(sacoEl, 1.15);
  estourar(destino, ["⭐", "#ffc933", "#e23b3b", "#18b67e"], 10, 70);
  flutuar(destino, `+${jogada.ganhou}`, "efeito-ouro");
  moldura.placa(estado);
  desenharSaco();
  garcaEl.dataset.voo = "saindo";
  await esperar(VOO);

  if (jogada.resultado === "certo") {
    garcaEl.dataset.voo = "fora";
    await esperar(150);
    chegarGarca();
    return;
  }
  somSacoCheio();
  falar("Saco cheio! Hora de entregar!", 1800);
  await esperar(1300);
  comecarEntrega();
}

function comecarEntrega() {
  cena.dataset.modo = "entrega";
  rua.innerHTML = estado.pedidos
    .map((cor, i) => {
      const parede = PAREDES[i % PAREDES.length];
      const telhado = TELHADOS[(i * 2 + estado.fase) % TELHADOS.length];
      return `<div class="casa" style="--i: ${i}">
        <span class="desejo">${estado.valores[cor]}</span>
        <svg class="casa-svg" viewBox="-32 -72 64 74" aria-hidden="true">${casinha(parede, telhado)}</svg>
        <span class="crianca" aria-hidden="true">${CRIANCAS[(i + estado.fase) % CRIANCAS.length]}</span>
      </div>`;
    })
    .join("");
  desenharPrateleira();
  desenharSaco();
  irParaCasa();
  travar(false);
}

function irParaCasa() {
  rua.style.setProperty("--atual", String(estado.casa));
  [...rua.children].forEach((casa, i) => casa.classList.toggle("atual", i === estado.casa));
  const { numero } = pedidoAtual(estado);
  rua.setAttribute("aria-label", `Esta casa pede ${numero}`);
}

async function escolher(cor: Cor) {
  if (travado || estado.modo !== "entrega") return;
  const casa = rua.children[estado.casa] as HTMLElement;
  const jogada = escolherNaCasa(estado, cor);

  if (jogada.resultado === "outra-casa") {
    estado = jogada.estado;
    tremer(casa.querySelector(".desejo")!, 8);
    somNegou();
    falar("Essa casa pediu outro número!");
    return;
  }

  travar(true);
  const anterior = estado;
  // A próxima noite já vem pronta no fim da entrega: o saco que sobrou é o desta.
  const sobra = [...anterior.saco];
  sobra.splice(sobra.indexOf(cor), 1);
  estado = { ...anterior, saco: sobra };
  desenharPrateleira();

  const chamine = centroDe(casa.querySelector(".chamine")!);
  const voando = lancar(centroDe(treno), chamine, "presente-voando", "", VOO, 30);
  if (voando) voando.innerHTML = svgPresente(cor);
  await esperar(VOO);
  casa.classList.add("feliz");
  somEntregou();
  estourar(centroDe(casa), ["⭐", "❄️", COR[cor]], 10, 60);
  flutuar(chamine, `+${jogada.ganhou}`, "efeito-ouro");
  estado = jogada.estado;
  moldura.placa(estado);

  if (jogada.resultado === "entregou") {
    await esperar(650);
    irParaCasa();
    travar(false);
    return;
  }

  moldura.salvar(estado);
  somVitoria();
  confete();
  await esperar(1300);
  aoContinuar = abrirNoite;
  moldura.mostrar(
    telaFase({
      fase: anterior.fase,
      pontos: estado.pontos - inicioDaFase.pontos,
      perfeita: anterior.limpa,
      frase: anterior.limpa
        ? "Todos os pacotes certinhos de primeira! A garça já está trazendo os bilhetes da próxima noite."
        : "Todo mundo ganhou presente! A garça já está trazendo os bilhetes da próxima noite.",
    }),
  );
}

prateleira.addEventListener("click", (evento) => {
  const botao = (evento.target as HTMLElement).closest<HTMLElement>("[data-cor]");
  if (!botao || travado) return;
  const cor = botao.dataset.cor as Cor;
  if (estado.modo === "fabrica") porPresente(cor);
  else escolher(cor);
});

vagasEl.addEventListener("click", (evento) => {
  const vaga = (evento.target as HTMLElement).closest<HTMLElement>("[data-vaga]");
  if (!vaga || travado) return;
  tirarPresente(Number(vaga.dataset.vaga));
});

pronto.addEventListener("click", mandarProSaco);
