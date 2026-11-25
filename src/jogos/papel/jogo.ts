import { porId } from "../kit/dom";
import { animar, centroDe, confete, estourar, flutuar, pular, tremer } from "../kit/efeitos";
import { criarMoldura } from "../kit/moldura";
import { somVitoria } from "../kit/som";
import { telaFase, telaNovidade, telaTropeco } from "../kit/telas";
import { esperar, movimentoReduzido } from "../kit/tempo";
import {
  abrir,
  abrirPapel,
  casaDe,
  configDaFase,
  cortar,
  dica,
  dobrar,
  faseQueApresenta,
  naDobradura,
  novoJogo,
  papelNovo,
  podeDobrar,
  restantes,
  type Conferencia,
  type Dobra,
  type Estado,
} from "./logica";
import { somAbre, somCorte, somDiferente, somDobra, somIgual, somNegado, somPapelNovo } from "./sons";

// Uma cor de papel para cada molde da fase, sempre clara: o furo precisa aparecer.
const CORES = ["#ffe08a", "#9fd8f5", "#ffb3c1", "#b9e6a1", "#d5c2f5", "#ffc58f"];
const DURACAO_DA_DOBRA = 520;
// O papel abre devagar: é o momento de expectativa do jogo.
const DURACAO_DA_ABERTURA = 900;

// O giro de cada dobra no espaço. A aba cobre o papel todo e só mostra a parte que dobra.
const GIRO: Record<Dobra, { origem: string; giro: string }> = {
  V: { origem: "50% 50%", giro: "rotateY(-180deg)" },
  H: { origem: "50% 50%", giro: "rotateX(180deg)" },
  D: { origem: "0 0", giro: "rotate3d(1, 1, 0, 180deg)" },
};

const NOVIDADES: Record<number, { titulo: string; texto: string; emblema: string }> = {
  [faseQueApresenta("VH")]: {
    titulo: "Duas dobras!",
    texto: "Dá para dobrar ao meio e ao meio de novo: um corte fura quatro lugares. Agora, papel diferente do molde custa um coração.",
    emblema: "✂️",
  },
  [faseQueApresenta("D")]: {
    titulo: "Dobra em triângulo!",
    texto: "Dobre o papel na diagonal, de uma ponta à outra. Olhe bem: o molde fica igual dos dois lados dessa linha?",
    emblema: "📐",
  },
  [faseQueApresenta("VHD")]: {
    titulo: "Três dobras!",
    texto: "Dobre ao meio, ao meio de novo e depois em triângulo. Um corte só vira oito furos, como num floco de neve!",
    emblema: "❄️",
  },
};

const mesa = porId("mesa");
const dobradura = porId("dobradura");
const folha = porId("folha");
const eixos = porId("eixos");
const molde = porId("molde");
const pendurados = porId("pendurados");
const tesoura = porId("tesoura");
const cortesRestam = porId("cortes-restam");
const fala = porId("fala");
const botaoDica = porId("dica") as HTMLButtonElement;
const botaoAbrir = porId("abrir") as HTMLButtonElement;
const botaoNovo = porId("papel-novo") as HTMLButtonElement;
const botoesDobra = [...document.querySelectorAll<HTMLButtonElement>(".dobrar")];

const moldura = criarMoldura({ aoComecar: comecar, aoSeguir: seguir });

let estado: Estado = novoJogo();
let travado = true;
let novidadeVista = 0;
let casas: HTMLElement[] = [];
// Os furos do papel aberto na mesa. Enquanto ele está dobrado, é null.
let aberto: number[] | null = null;
let dedo: number | null = null;
let cursor = 0;

const lado = () => estado.molde.lado;
const corDoPapel = () => CORES[(estado.fase + estado.feitos) % CORES.length];

function falar(texto: string) {
  fala.textContent = texto;
}

function travar(valor: boolean) {
  travado = valor;
  mesa.dataset.pronto = valor ? "" : "1";
  desenharFerramentas();
}

// Uma grade pequena, sem toque, para o molde e os papéis pendurados.
function miniatura(el: HTMLElement, furos: number[], cor: string) {
  const n = lado();
  el.style.setProperty("--lado", String(n));
  el.style.setProperty("--cor-papel", cor);
  const buracos = new Set(furos);
  el.replaceChildren(
    ...Array.from({ length: n * n }, (_, i) => {
      const casa = document.createElement("span");
      casa.className = buracos.has(i) ? "mini furo" : "mini";
      return casa;
    }),
  );
}

function desenharVaral() {
  miniatura(molde, estado.molde.furos, corDoPapel());
  const { papeis } = configDaFase(estado.fase);
  pendurados.setAttribute("aria-label", `${estado.feitos} de ${papeis} papéis pendurados`);
  const atuais = pendurados.children.length;
  // Os pendurados ficam: só entram os que faltam, para o desenho dos feitos não sumir.
  if (atuais !== papeis || estado.feitos === 0) {
    pendurados.replaceChildren(
      ...Array.from({ length: papeis }, () => {
        const vaga = document.createElement("span");
        vaga.className = "vaga";
        return vaga;
      }),
    );
  }
}

function criarCasas() {
  const n = lado();
  folha.style.setProperty("--lado", String(n));
  dobradura.style.setProperty("--lado", String(n));
  casas = Array.from({ length: n * n }, () => {
    const casa = document.createElement("span");
    casa.className = "casa";
    return casa;
  });
  folha.replaceChildren(...casas);
}

// Desenha o papel com essas dobras e esses furos. Fora da dobradura, a casa some.
function desenharPapel(dobras: Dobra[], furos: number[], marcas?: Conferencia) {
  const n = lado();
  const buracos = new Set(furos);
  const sobram = new Set(marcas?.sobram);
  const faltam = new Set(marcas?.faltam);
  folha.style.setProperty("--cor-papel", corDoPapel());
  folha.dataset.camadas = String(dobras.length);
  casas.forEach((casa, i) => {
    const ponto = casaDe(i, n);
    casa.classList.toggle("escondida", !naDobradura(dobras, ponto, n));
    casa.classList.toggle("furo", buracos.has(i));
    casa.classList.toggle("meia", dobras.includes("D") && ponto.x === ponto.y);
    casa.classList.toggle("sobra", sobram.has(i));
    casa.classList.toggle("falta", faltam.has(i));
    casa.classList.toggle("cursor", !travado && aberto === null && i === cursor && folha.matches(":focus-visible"));
  });
}

const desenharMesa = () => desenharPapel(estado.dobras, aberto ?? abrir(estado.dobras, estado.cortes, lado()));

// As linhas de dobra que ainda dá para usar, tracejadas por cima do papel.
function desenharEixos() {
  const n = lado();
  const { dobras } = estado;
  const largura = dobras.includes("V") ? n / 2 : n;
  const altura = dobras.includes("H") ? n / 2 : n;
  const linhas: string[] = [];
  const pode = (dobra: Dobra) =>
    aberto === null &&
    estado.cortes.length === 0 &&
    podeDobrar(dobras, dobra) &&
    (dobra !== "D" || estado.fase >= faseQueApresenta("D"));
  if (pode("V")) linhas.push(`<line data-eixo="V" x1="${n / 2}" y1="0" x2="${n / 2}" y2="${altura}" />`);
  if (pode("H")) linhas.push(`<line data-eixo="H" x1="0" y1="${n / 2}" x2="${largura}" y2="${n / 2}" />`);
  if (pode("D")) linhas.push(`<line data-eixo="D" x1="0" y1="0" x2="${largura}" y2="${altura}" />`);
  eixos.setAttribute("viewBox", `0 0 ${n} ${n}`);
  eixos.innerHTML = linhas.join("");
}

function desenharFerramentas() {
  const dobrado = aberto === null;
  botoesDobra.forEach((botao) => {
    const dobra = botao.dataset.dobra as Dobra;
    botao.disabled = travado || !dobrado || estado.cortes.length > 0 || !podeDobrar(estado.dobras, dobra);
    botao.hidden = dobra === "D" && estado.fase < faseQueApresenta("D");
  });
  botaoAbrir.disabled = travado || !dobrado || estado.cortes.length === 0;
  botaoNovo.disabled = travado || (estado.dobras.length === 0 && estado.cortes.length === 0);
  botaoDica.disabled = travado;
  const sobra = restantes(estado);
  cortesRestam.textContent = String(sobra);
  tesoura.setAttribute("aria-label", `${sobra} cortes de tesoura`);
  tesoura.dataset.acabou = sobra <= 0 ? "1" : "";
  desenharEixos();
}

function desenharTudo() {
  desenharMesa();
  desenharFerramentas();
}

// A aba é uma cópia do papel que mostra só a parte que dobra, já com os furos dela.
function montarAba(antes: Dobra[], dobra: Dobra, furos: number[]) {
  const n = lado();
  const depois = [...antes, dobra];
  const buracos = new Set(furos);
  const aba = document.createElement("div");
  aba.className = "aba folha";
  aba.style.setProperty("--lado", String(n));
  aba.style.setProperty("--cor-papel", corDoPapel());
  aba.style.transformOrigin = GIRO[dobra].origem;
  for (let i = 0; i < n * n; i++) {
    const ponto = casaDe(i, n);
    const casa = document.createElement("span");
    const naAba = naDobradura(antes, ponto, n) && !naDobradura(depois, ponto, n);
    // A metade de cima das casas da diagonal também dobra.
    const meiaDeCima = dobra === "D" && ponto.x === ponto.y && naDobradura(antes, ponto, n);
    casa.className = `casa${naAba || meiaDeCima ? "" : " escondida"}${meiaDeCima ? " meia-de-cima" : ""}${buracos.has(i) ? " furo" : ""}`;
    aba.append(casa);
  }
  dobradura.append(aba);
  return aba;
}

// O papel dobrado vai para o meio da mesa, e o quarto de papel cresce para caber o dedo.
// Antes de abrir, ele volta ao tamanho normal: a aba precisa de espaço para girar.
const ZOOM_DO_QUARTO = 1.8;
async function enquadrar(dobras: Dobra[]) {
  const v = dobras.includes("V");
  const h = dobras.includes("H");
  const zoom = v && h ? ZOOM_DO_QUARTO : 1;
  const sobra = ((1 - zoom / 2) / 2) * 100;
  const dx = v ? (h ? sobra : 25) : 0;
  const dy = h ? (v ? sobra : 25) : 0;
  const novo = `translate(${dx}%, ${dy}%) scale(${zoom})`;
  if (dobradura.style.transform === novo) return;
  dobradura.style.transform = novo;
  await esperar(360);
}

async function girarAba(aba: HTMLElement, dobra: Dobra, abrindo: boolean, duracao: number) {
  const quadros = [{ transform: "none" }, { transform: GIRO[dobra].giro }];
  if (abrindo) quadros.reverse();
  if (!movimentoReduzido) await aba.animate(quadros, { duration: duracao, easing: "ease-in-out" }).finished;
  aba.remove();
}

async function fazerDobra(dobra: Dobra) {
  const depois = dobrar(estado, dobra);
  if (depois === estado) return;
  travar(true);
  somDobra();
  const aba = montarAba(estado.dobras, dobra, []);
  desenharPapel(depois.dobras, []);
  eixos.innerHTML = "";
  await girarAba(aba, dobra, false, DURACAO_DA_DOBRA);
  await enquadrar(depois.dobras);
  estado = depois;
  travar(false);
  desenharTudo();
  if (estado.fase === 1 && estado.cortes.length === 0) falar("Agora corte o papel dobrado: arraste o dedo nas casinhas.");
}

function cortarCasa(i: number) {
  if (travado || aberto !== null) return;
  const depois = cortar(estado, i);
  if (depois === estado) {
    if (restantes(estado) <= 0 && !estado.cortes.includes(i)) {
      somNegado();
      tremer(tesoura, 5);
      falar("A tesoura acabou! Toque em Abrir, ou pegue um papel novo.");
    }
    return;
  }
  estado = depois;
  somCorte();
  if (casas[i]) estourar(centroDe(casas[i]), [corDoPapel(), "#fff"], 4, 34);
  pular(tesoura, 1.2);
  desenharTudo();
  if (restantes(estado) === 0) falar("Pronto? Toque em Abrir para ver o recorte!");
  else falar("");
}

async function abrirNaTela() {
  if (travado || estado.cortes.length === 0) return;
  travar(true);
  const furos = abrir(estado.dobras, estado.cortes, lado());
  const dobras = [...estado.dobras];
  eixos.innerHTML = "";
  await enquadrar([]);
  for (let passo = 0; dobras.length; passo++) {
    const ultima = dobras.pop()!;
    somAbre(passo);
    const aba = montarAba(dobras, ultima, furos);
    await girarAba(aba, ultima, true, DURACAO_DA_ABERTURA);
    desenharPapel(dobras, furos);
  }
  aberto = furos;
  desenharPapel([], furos);
  await esperar(350);

  const anterior = estado;
  const jogada = abrirPapel(estado);
  if (jogada.resultado === "igual" || jogada.resultado === "fase") return acertar(anterior, jogada.estado, jogada.resultado === "fase");
  errar(jogada.estado, jogada.conferencia, jogada.resultado === "fim");
}

// O papel certo voa para o varal, no lugar dele.
async function acertar(anterior: Estado, depois: Estado, fimDaFase: boolean) {
  somIgual();
  flutuar(centroDe(folha), "Igualzinho!", "efeito-ouro");
  const vaga = pendurados.children[anterior.feitos] as HTMLElement | undefined;
  await esperar(500);
  if (vaga) {
    const de = folha.getBoundingClientRect();
    const para = vaga.getBoundingClientRect();
    animar(
      folha,
      [
        { translate: "0 0", scale: 1 },
        { translate: `${para.left + para.width / 2 - (de.left + de.width / 2)}px ${para.top + para.height / 2 - (de.top + de.height / 2)}px`, scale: String(para.width / de.width) },
      ],
      520,
      "ease-in",
    );
    await esperar(520);
    miniatura(vaga, anterior.molde.furos, corDoPapel());
    vaga.classList.add("pendurado");
    pular(vaga, 1.4);
  }
  estado = depois;
  aberto = null;
  moldura.placa(estado);
  if (fimDaFase) {
    somVitoria();
    confete();
    await esperar(900);
    moldura.salvar(estado);
    const perfeita = anterior.limpa;
    moldura.mostrar(
      telaFase({
        fase: anterior.fase,
        pontos: estado.pontos - anterior.pontos,
        perfeita,
        frase: perfeita ? "Todos os recortes de primeira. Mãos de artista!" : "O varal ficou lindo!",
      }),
    );
    return;
  }
  // O próximo molde, em papel novo.
  criarCasas();
  desenharVaral();
  travar(false);
  desenharTudo();
  falar("Mais um! Olhe o molde novo.");
}

async function errar(depois: Estado, conferencia: Conferencia, fim: boolean) {
  somDiferente();
  desenharPapel([], aberto!, conferencia);
  tremer(folha, 6);
  const partes = [
    conferencia.sobram.length ? "os furos em vermelho não estão no molde" : "",
    conferencia.faltam.length ? "faltaram os furos marcados com ?" : "",
  ].filter(Boolean);
  falar(`Ficou diferente: ${partes.join(" e ")}.`);
  const perdeu = depois.vidas < estado.vidas;
  estado = depois;
  moldura.placa(estado);
  await esperar(1900);
  if (fim) {
    moldura.fim(estado, "O varal ficou pela metade, mas a tesoura já está afiada para a próxima.");
    return;
  }
  botaoDica.hidden = false;
  moldura.mostrar(
    telaTropeco({
      titulo: "Ficou diferente do molde",
      texto: "Olhe o molde: de que lado ele fica igual, como num espelho? É ali que o papel dobra.",
      perdeuVida: perdeu,
    }),
  );
}

function trocarPapel() {
  if (travado) return;
  somPapelNovo();
  estado = papelNovo(estado);
  aberto = null;
  enquadrar([]);
  desenharTudo();
  falar("");
}

function casaDoPonteiro({ clientX, clientY }: PointerEvent) {
  const caixa = folha.getBoundingClientRect();
  const n = lado();
  const x = Math.floor(((clientX - caixa.left) / caixa.width) * n);
  const y = Math.floor(((clientY - caixa.top) / caixa.height) * n);
  if (x < 0 || y < 0 || x >= n || y >= n) return -1;
  return y * n + x;
}

let ultimaCortada = -1;

folha.addEventListener("pointerdown", (evento) => {
  if (travado || dedo !== null || aberto !== null) return;
  dedo = evento.pointerId;
  folha.setPointerCapture(evento.pointerId);
  ultimaCortada = casaDoPonteiro(evento);
  if (ultimaCortada >= 0) cortarCasa(ultimaCortada);
});

folha.addEventListener("pointermove", (evento) => {
  if (evento.pointerId !== dedo) return;
  const casa = casaDoPonteiro(evento);
  if (casa < 0 || casa === ultimaCortada) return;
  ultimaCortada = casa;
  cortarCasa(casa);
});

// O navegador pode tomar o gesto sem avisar com pointerup: o dedo é largado em todos os casos.
const largar = (evento: PointerEvent) => {
  if (evento.pointerId === dedo) dedo = null;
};
folha.addEventListener("pointerup", largar);
folha.addEventListener("pointercancel", largar);
folha.addEventListener("lostpointercapture", largar);

// Pelo teclado as setas andam pelas casinhas e Enter corta.
folha.addEventListener("keydown", (evento) => {
  if (travado || aberto !== null) return;
  const n = lado();
  const passo = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[evento.key];
  const { x, y } = casaDe(cursor, n);
  if (passo) {
    evento.preventDefault();
    cursor = Math.min(n - 1, Math.max(0, y + passo[1])) * n + Math.min(n - 1, Math.max(0, x + passo[0]));
    desenharMesa();
  }
  if (evento.key === "Enter" || evento.key === " ") {
    evento.preventDefault();
    cortarCasa(cursor);
  }
});
folha.addEventListener("focus", desenharMesa);
folha.addEventListener("blur", desenharMesa);

botoesDobra.forEach((botao) => {
  botao.addEventListener("click", () => {
    if (!travado) fazerDobra(botao.dataset.dobra as Dobra);
  });
  // O eixo dessa dobra acende no papel enquanto o dedo ou o mouse está no botão.
  const acender = (valor: boolean) => () =>
    eixos.querySelector(`[data-eixo="${botao.dataset.dobra}"]`)?.classList.toggle("aceso", valor);
  botao.addEventListener("pointerenter", acender(true));
  botao.addEventListener("pointerleave", acender(false));
  botao.addEventListener("focus", acender(true));
  botao.addEventListener("blur", acender(false));
});

botaoAbrir.addEventListener("click", abrirNaTela);
botaoNovo.addEventListener("click", trocarPapel);

botaoDica.addEventListener("click", async () => {
  if (travado) return;
  const antes = estado;
  const depois = dica(estado);
  if (depois.dobras.length > antes.dobras.length) {
    // A dica dobra o papel de verdade, com a animação.
    estado = { ...estado, limpa: false };
    await fazerDobra(depois.dobras.at(-1)!);
    return;
  }
  if (depois.cortes.length > antes.cortes.length) {
    estado = { ...estado, limpa: false };
    cortarCasa(depois.cortes.at(-1)!);
    return;
  }
  estado = depois;
  const recomecou = depois.dobras.length < antes.dobras.length || depois.cortes.length < antes.cortes.length;
  if (!recomecou) return falar("Já está tudo cortado: toque em Abrir!");
  somPapelNovo();
  enquadrar([]);
  desenharTudo();
  falar("Esse papel não ia dar certo. Aqui está um novo!");
});

function prepararPapel() {
  aberto = null;
  dedo = null;
  cursor = 0;
  criarCasas();
  enquadrar([]);
  desenharVaral();
  moldura.placa(estado);
  botaoDica.hidden = true;
  travar(false);
  desenharTudo();
  if (estado.fase === 1 && estado.feitos === 0) falar("O molde é igual dos dois lados? Dobre o papel ao meio!");
  else falar("");
}

function seguir() {
  // Depois de um erro, o mesmo molde volta em papel novo.
  if (aberto !== null) {
    aberto = null;
    travar(false);
    desenharTudo();
    falar("");
    return;
  }
  const novidade = NOVIDADES[estado.fase];
  prepararPapel();
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
