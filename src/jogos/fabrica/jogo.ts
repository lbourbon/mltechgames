import { porId } from "../kit/dom";
import { centroDe, confete, estourar, flutuar, lancar, pular, tremer } from "../kit/efeitos";
import { criarMoldura } from "../kit/moldura";
import { somVitoria } from "../kit/som";
import { telaFase, telaNovidade } from "../kit/telas";
import { esperar } from "../kit/tempo";
import { casinha, COR, crianca, NOME, rosto, svgCaixa, svgPresente } from "./desenho";
import {
  cartaAtual,
  cheioDoSaco,
  criancaDaCasa,
  entregar,
  escolherNaCasa,
  novoJogo,
  pacoteCheio,
  por,
  tirar,
  type Cor,
  type Estado,
  type Pista,
} from "./logica";
import { somCerto, somEntregou, somErrou, somFalta, somGarca, somNegou, somPor, somSacoCheio, somTirar } from "./sons";

const VOO = 420;
// Quanto o trenó voa entre uma garça e a próxima.
const ENTRE_GARCAS = 900;
const ANDAR = 900;
const PAREDES = ["#ffe3c2", "#d8ecff", "#ffd6e4", "#e2f6d2", "#fff1b0", "#e6dcff"];
const TELHADOS = ["#c0392b", "#2f7bff", "#18b67e", "#7a4b2a", "#a45cff", "#e0662a"];

const recado = ({ cores, total }: Pista) =>
  `<p class="recado">${cores.map((cor) => svgPresente(cor, "mini")).join('<span class="sinal">+</span>')}<span class="sinal">=</span><strong>${total}</strong></p>`;

// A estreia de cada ideia. Quem volta direto para essa noite também vê.
const NOVIDADES: Record<number, { titulo: string; texto: string; miolo?: string; emblema?: string }> = {
  4: { titulo: "Três presentes!", texto: "Agora o bilhete da garça tem três lugares.", emblema: "🎁" },
  5: { titulo: "Presente amarelo!", texto: "Chegou uma cor nova.", miolo: svgPresente("amarelo", "novidade-presente"), emblema: "✨" },
  6: {
    titulo: "Presente misterioso!",
    texto: "Uma cor chegou com ?. O recado lá em cima conta quanto ela vale: se dois vermelhos dão 10, cada vermelho vale 5.",
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
const treno = porId("treno");
const sacoEl = treno.querySelector(".saco-do-treno")!;
const contador = porId("contador");
const garcaEl = porId("garca");
const bilhete = porId("bilhete");
const remetente = porId("remetente");
const alvoEl = porId("alvo");
const vagasEl = porId("vagas");
const rua = porId("rua");
const noelAPe = porId("noel-a-pe");
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

// A garça parou o trenó: o céu deixa de correr.
function parar(parado: boolean) {
  if (parado) cena.dataset.parado = "";
  else delete cena.dataset.parado;
}

const escondido = (cor: Cor) => estado.escondidas.includes(cor);

// No voo, as cores e o valor de cada uma. Na entrega, as caixas que ainda estão no saco.
function desenharPrateleira() {
  if (estado.modo === "entrega") {
    prateleira.setAttribute("aria-label", "Presentes no saco");
    prateleira.innerHTML = estado.saco
      .map(
        (quem) =>
          `<button class="caixa-botao" type="button" data-crianca="${quem}" aria-label="Presente com a foto da criança ${quem + 1}">${svgCaixa(quem)}</button>`,
      )
      .join("");
    return;
  }
  prateleira.setAttribute("aria-label", "Presentes");
  prateleira.innerHTML = estado.cores
    .map((cor) => {
      const valor = escondido(cor) ? "?" : String(estado.valores[cor]);
      const rotulo = `Presente ${NOME[cor]}, vale ${escondido(cor) ? "um número misterioso" : valor}`;
      return `<button class="presente-botao" type="button" data-cor="${cor}" aria-label="${rotulo}" style="--cor: ${COR[cor]}">
        ${svgPresente(cor)}
        <span class="etiqueta${escondido(cor) ? " misterio" : ""}">${valor}</span>
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
  contador.textContent = `🎁 ${estado.saco.length}/${estado.cartas.length}`;
}

async function chegarGarca() {
  const { alvo, crianca: quem } = cartaAtual(estado);
  alvoEl.textContent = String(alvo);
  remetente.innerHTML = `<svg viewBox="-12 -12 24 24" aria-hidden="true">${rosto(quem)}</svg>`;
  bilhete.setAttribute("aria-label", `Bilhete de uma criança: ${alvo}`);
  desenharVagas();
  garcaEl.dataset.voo = "chegando";
  somGarca();
  await esperar(VOO);
  garcaEl.dataset.voo = "parada";
  parar(true);
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

async function iniciarNoite() {
  inicioDaFase = { vidas: estado.vidas, pontos: estado.pontos };
  cena.dataset.modo = "voo";
  garcaEl.dataset.voo = "fora";
  parar(false);
  moldura.placa(estado);
  desenharPrateleira();
  desenharPistas();
  desenharSaco();
  falar(`${estado.cartas.length} crianças esperando!`);
  await esperar(ENTRE_GARCAS);
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

async function entregarAGarca() {
  if (travado || estado.modo !== "voo") return;
  if (!pacoteCheio(estado)) {
    tremer(bilhete);
    somFalta();
    falar("Ainda tem lugar vazio no bilhete!");
    return;
  }
  const { alvo, crianca: quem } = cartaAtual(estado);
  const jogada = entregar(estado);

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

  // Conta certa: a garça dá o presente da criança do bilhete, com a foto dela na caixa.
  travar(true);
  const destino = centroDe(sacoEl);
  const voando = lancar(centroDe(bilhete), destino, "presente-voando", "", VOO + 180, 70);
  if (voando) voando.innerHTML = svgCaixa(quem);
  estado = jogada.estado;
  desenharVagas();
  somCerto();
  await esperar(VOO + 180);
  estourar(destino, ["⭐", "#ffc933", "#e23b3b", "#18b67e"], 10, 70);
  flutuar(destino, `+${jogada.ganhou}`, "efeito-ouro");
  moldura.placa(estado);
  desenharSaco();
  garcaEl.dataset.voo = "saindo";
  parar(false);
  await esperar(VOO);
  garcaEl.dataset.voo = "fora";

  if (jogada.resultado === "certo") {
    await esperar(ENTRE_GARCAS);
    chegarGarca();
    return;
  }
  somSacoCheio();
  falar("Um presente para cada criança! Hora de entregar!", 1800);
  await esperar(1500);
  comecarEntrega();
}

function comecarEntrega() {
  cena.dataset.modo = "entrega";
  rua.innerHTML = estado.pedidos
    .map((quem, i) => {
      const parede = PAREDES[i % PAREDES.length];
      const telhado = TELHADOS[(i * 2 + estado.fase) % TELHADOS.length];
      return `<div class="casa">
        <svg class="casa-svg" viewBox="-32 -72 64 74" aria-hidden="true">${casinha(parede, telhado)}</svg>
        <div class="crianca-porta">
          <svg viewBox="-17 -42 34 44" aria-hidden="true">${crianca(quem)}</svg>
          <span class="ganhou">${svgCaixa(quem)}</span>
        </div>
      </div>`;
    })
    .join("");
  // Começa uma casa antes, para ele chegar andando até a primeira.
  rua.style.setProperty("--atual", "-1");
  void rua.offsetWidth;
  desenharPrateleira();
  irParaCasa();
}

// O Papai Noel anda até a próxima porta, e a criança sai para esperar.
async function irParaCasa() {
  travar(true);
  [...rua.children].forEach((casa) => casa.classList.remove("atual"));
  noelAPe.classList.add("andando");
  rua.style.setProperty("--atual", String(estado.casa));
  await esperar(ANDAR);
  noelAPe.classList.remove("andando");
  rua.children[estado.casa].classList.add("atual");
  rua.setAttribute("aria-label", `Na porta, a criança ${criancaDaCasa(estado) + 1}`);
  travar(false);
}

async function escolher(quem: number, botao: HTMLElement) {
  if (travado || estado.modo !== "entrega") return;
  const casa = rua.children[estado.casa] as HTMLElement;
  const jogada = escolherNaCasa(estado, quem);

  if (jogada.resultado === "outra-casa") {
    estado = jogada.estado;
    casa.classList.remove("nao");
    void casa.offsetWidth;
    casa.classList.add("nao");
    tremer(botao, 6);
    somNegou();
    falar("Esse não é o meu! Olhe a foto na caixa.");
    return;
  }
  if (jogada.resultado !== "entregou" && jogada.resultado !== "fase") return;

  travar(true);
  const anterior = estado;
  const alvo = centroDe(casa.querySelector(".crianca-porta")!);
  const voando = lancar(centroDe(botao), alvo, "presente-voando", "", VOO, 50);
  if (voando) voando.innerHTML = svgCaixa(quem);
  // A próxima noite já vem pronta no fim da entrega: a prateleira mostra o saco desta.
  estado = { ...anterior, saco: anterior.saco.filter((outra) => outra !== quem) };
  desenharPrateleira();
  await esperar(VOO);
  casa.classList.add("feliz");
  somEntregou();
  estourar(alvo, ["⭐", "❄️", "#ffc933"], 10, 60);
  flutuar(alvo, `+${jogada.ganhou}`, "efeito-ouro");
  estado = jogada.estado;
  moldura.placa(estado);

  if (jogada.resultado === "entregou") {
    await esperar(700);
    irParaCasa();
    return;
  }

  moldura.salvar(estado);
  somVitoria();
  confete();
  await esperar(1400);
  aoContinuar = abrirNoite;
  moldura.mostrar(
    telaFase({
      fase: anterior.fase,
      pontos: estado.pontos - inicioDaFase.pontos,
      perfeita: anterior.limpa,
      frase: anterior.limpa
        ? "Todas as contas certinhas de primeira, e todo mundo ganhou presente! Amanhã tem mais crianças."
        : "Todo mundo ganhou presente! Amanhã tem mais crianças esperando.",
    }),
  );
}

prateleira.addEventListener("click", (evento) => {
  const botao = (evento.target as HTMLElement).closest<HTMLElement>("[data-cor], [data-crianca]");
  if (!botao || travado) return;
  if (botao.dataset.cor && estado.modo === "voo") porPresente(botao.dataset.cor as Cor);
  if (botao.dataset.crianca && estado.modo === "entrega") escolher(Number(botao.dataset.crianca), botao);
});

vagasEl.addEventListener("click", (evento) => {
  const vaga = (evento.target as HTMLElement).closest<HTMLElement>("[data-vaga]");
  if (!vaga || travado) return;
  tirarPresente(Number(vaga.dataset.vaga));
});

pronto.addEventListener("click", entregarAGarca);
