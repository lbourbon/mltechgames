import { porId } from "../kit/dom";
import { centroDe, confete, estourar, flutuar, pular, tremer } from "../kit/efeitos";
import { criarMoldura } from "../kit/moldura";
import { somLigado, somVitoria } from "../kit/som";
import { esperar } from "../kit/tempo";
import {
  cancaoMontada,
  cantar,
  configDaFase,
  frequencias,
  novoJogo,
  podeCantar,
  pousar,
  temPausas,
  ULTIMA_FASE_MANSA,
  type Estado,
  type Nota,
} from "./logica";
import { somDesafinou, somFixo, somPiu, somRevoada, somVoou } from "./sons";

// Uma cor por fio, do mais grosso ao mais fino.
const CORES = ["#8a5cf6", "#2f7bff", "#18b67e", "#f5a623", "#ff5a5f"];

const NOVIDADES: Record<number, { titulo: string; texto: string }> = {
  2: {
    titulo: "Três fios!",
    texto: "Agora tem um fio no meio. A nota dele fica no meio do caminho entre a mais grossa e a mais fina.",
  },
  [ULTIMA_FASE_MANSA + 1]: {
    titulo: "Agora é sério!",
    texto: "Cantar errado custa um coração. Ouça quantas vezes quiser e toque nos passarinhos para comparar as notas antes de cantar.",
  },
  4: {
    titulo: "Quatro fios!",
    texto: "Mais um fio lá em cima. Compare cada nota com a do primeiro passarinho: subiu, desceu ou ficou igual?",
  },
  5: {
    titulo: "Pausa!",
    texto: "Às vezes o bando fica quieto por um instante. Quando ouvir um silêncio, ponha o passarinho no chão.",
  },
  6: {
    titulo: "Cinco fios!",
    texto: "Agora as notas ficam bem pertinho umas das outras. Ouça com atenção!",
  },
};

// O span posiciona o passarinho no fio; os efeitos animam só o desenho, sem mexer no fio.
const ave = (cor: string) => `<span class="ave" style="--cor:${cor}"><svg viewBox="0 0 64 58" aria-hidden="true">
  <path class="ave-cauda" d="M13 32 L1 22 L3 42 Z"/>
  <ellipse class="ave-corpo" cx="30" cy="34" rx="20" ry="16"/>
  <path class="ave-asa" d="M18 32 Q30 22 40 34 Q28 44 18 32 Z"/>
  <circle class="ave-corpo" cx="44" cy="19" r="11"/>
  <circle class="ave-olho" cx="47" cy="17" r="2.6"/>
  <path class="ave-bico" d="M54 17 L63 21 L54 25 Z"/>
  <path class="ave-pe" d="M25 48 V57 M35 48 V57"/>
</svg></span>`;

const poste = porId("poste");
const pauta = porId("pauta");
const fala = porId("fala");
const botaoOuvir = porId("ouvir") as HTMLButtonElement;
const botaoCantar = porId("cantar") as HTMLButtonElement;
const botaoSom = porId("som");

const moldura = criarMoldura({ aoComecar: comecar, aoSeguir: seguir });

let estado: Estado = novoJogo();
let travado = true;
let novidadeVista = 0;
let ouviu = false;
// Cada coluna tem um lugar por fio, de cima para baixo, e o chão por último nas fases com pausa.
let lugares: HTMLButtonElement[][] = [];

const pausa = (ms: number) => new Promise((pronto) => setTimeout(pronto, ms));

function falar(texto: string) {
  fala.textContent = texto;
}

function travar(valor: boolean) {
  travado = valor;
  poste.dataset.pronto = valor ? "" : "1";
  botaoOuvir.disabled = valor;
  botaoCantar.disabled = valor || !podeCantar(estado);
}

const fios = () => configDaFase(estado.fase).fios;

// Índice do lugar na coluna: o fio mais fino fica em cima.
const lugarDoFio = (fio: number) => fios() - 1 - fio;

function lugarDoPouso(coluna: number) {
  const pouso = estado.pousos[coluna];
  if (pouso === null) return -1;
  return pouso === "chao" ? fios() : lugarDoFio(pouso);
}

function rotulo(coluna: number, lugar: number) {
  const nome = lugar === fios() ? "chão" : `fio ${fios() - lugar} de ${fios()}`;
  return `Coluna ${coluna + 1}, ${nome}`;
}

function criarLugar(coluna: number, lugar: number) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = lugar === fios() ? "lugar chao" : "lugar";
  botao.style.gridColumn = String(coluna + 1);
  botao.style.gridRow = String(lugar + 1);
  botao.setAttribute("aria-label", rotulo(coluna, lugar));
  botao.addEventListener("click", () => tocarLugar(coluna, lugar));
  return botao;
}

function desenharPauta() {
  const { colunas } = configDaFase(estado.fase);
  const linhas = fios() + (temPausas(estado.fase) ? 1 : 0);
  pauta.style.setProperty("--colunas", String(colunas));
  pauta.style.setProperty("--linhas", String(linhas));
  poste.dataset.pausas = temPausas(estado.fase) ? "1" : "";
  lugares = Array.from({ length: colunas }, (_, coluna) =>
    Array.from({ length: linhas }, (_, lugar) => criarLugar(coluna, lugar)),
  );
  pauta.replaceChildren(...lugares.flat());
  lugares.forEach((_, coluna) => desenharColuna(coluna));
}

function desenharColuna(coluna: number) {
  const ocupado = lugarDoPouso(coluna);
  lugares[coluna].forEach((botao, lugar) => {
    const aqui = lugar === ocupado;
    botao.classList.toggle("ocupado", aqui);
    botao.classList.toggle("confuso", aqui && estado.confusos[coluna]);
    botao.classList.toggle("referencia", aqui && coluna === 0);
    const temAve = botao.querySelector(".ave");
    if (aqui && !temAve) {
      const pouso = estado.pousos[coluna];
      botao.innerHTML = `${ave(pouso === "chao" ? "#a08a7a" : CORES[pouso as number])}<span class="duvida" aria-hidden="true">?</span>`;
    }
    if (!aqui && temAve) botao.replaceChildren();
    botao.setAttribute("aria-label", `${rotulo(coluna, lugar)}${aqui ? ", com passarinho" : ""}`);
  });
}

function aveDa(coluna: number) {
  const lugar = lugarDoPouso(coluna);
  return lugar < 0 ? null : lugares[coluna][lugar].querySelector<SVGElement>(".ave svg");
}

function cantarNota(nota: Nota | "chao") {
  if (nota === null || nota === "chao") return;
  somPiu(frequencias(fios())[nota]);
}

function tocarLugar(coluna: number, lugar: number) {
  if (travado) return;
  const destino = lugar === fios() ? "chao" : fios() - 1 - lugar;
  const jogada = pousar(estado, coluna, destino);
  if (jogada.resultado === "fixo") {
    // O primeiro passarinho não sai, mas canta a nota dele, que é a referência.
    const referencia = aveDa(0)!;
    cantarNota(estado.pousos[0]);
    pular(referencia, 1.2);
    if (lugar !== lugarDoPouso(0)) {
      somFixo();
      falar("Esse já sabe a nota dele. Ouça e compare!");
    }
    return;
  }
  estado = jogada.estado;
  if (jogada.resultado === "pousou") {
    desenharColuna(coluna);
    if (destino === "chao") somVoou();
  }
  cantarNota(destino);
  const passaro = aveDa(coluna);
  if (passaro) pular(passaro, 1.25);
  botaoCantar.disabled = !podeCantar(estado);
  if (podeCantar(estado) && !fala.textContent?.startsWith("Pronto")) falar("Pronto? Toque em Cantar!");
}

function marcarColuna(coluna: number) {
  pauta.style.setProperty("--batida", String(coluna));
  poste.dataset.tocando = coluna < 0 ? "" : "1";
}

// Toca uma canção marcando a coluna da vez. Não usa esperar(): o ritmo é a própria canção.
async function tocarCancao(notas: Nota[], aoBater: (coluna: number) => void) {
  const { batida } = configDaFase(estado.fase);
  for (const [coluna, nota] of notas.entries()) {
    marcarColuna(coluna);
    cantarNota(nota);
    aoBater(coluna);
    await pausa(batida);
  }
  marcarColuna(-1);
}

function semSom() {
  if (somLigado()) return false;
  falar("Ligue o som para ouvir a canção!");
  pular(botaoSom, 1.4);
  return true;
}

botaoOuvir.addEventListener("click", async () => {
  if (travado || semSom()) return;
  travar(true);
  falar("Escute o bando…");
  // Só o primeiro pisca: os outros estão esperando a criança.
  await tocarCancao(estado.cancao.notas, (coluna) => {
    if (coluna === 0) pular(aveDa(0)!, 1.2);
  });
  if (!ouviu) falar("Agora toque nos fios para pousar os passarinhos.");
  else falar("");
  ouviu = true;
  poste.dataset.ouviu = "1";
  travar(false);
});

botaoCantar.addEventListener("click", async () => {
  if (travado || !podeCantar(estado) || semSom()) return;
  travar(true);
  falar("");
  await tocarCancao(cancaoMontada(estado), (coluna) => {
    const passaro = aveDa(coluna);
    if (passaro && estado.pousos[coluna] !== "chao") pular(passaro, 1.3);
  });
  await pausa(250);
  const anterior = estado;
  const jogada = cantar(estado);
  if (jogada.resultado === "fase") {
    revoada(anterior, jogada.estado);
    return;
  }
  desafinou(jogada.estado, jogada.resultado === "fim");
});

async function desafinou(depois: Estado, fim: boolean) {
  estado = depois;
  somDesafinou();
  lugares.forEach((_, coluna) => desenharColuna(coluna));
  estado.confusos.forEach((confuso, coluna) => {
    const passaro = aveDa(coluna);
    if (confuso && passaro) tremer(passaro, 5);
  });
  moldura.placa(estado);
  const quantos = estado.confusos.filter(Boolean).length;
  falar(quantos === 1 ? "Quase! Um passarinho desafinou." : `Ops! ${quantos} passarinhos desafinaram.`);
  if (!fim) {
    travar(false);
    return;
  }
  await esperar(1000);
  moldura.fim(estado, "O bando desafinou tanto que foi cantar em outro poste.");
}

async function revoada(anterior: Estado, depois: Estado) {
  falar("Igualzinho! O bando inteiro cantou junto!");
  await tocarCancao(anterior.cancao.notas, (coluna) => {
    const passaro = aveDa(coluna);
    if (passaro) estourar(centroDe(passaro), [CORES[coluna % CORES.length], "♪"], 4, 40);
  });
  somVitoria();
  confete();
  somRevoada();
  poste.dataset.voando = "1";
  const ganhou = depois.pontos - anterior.pontos;
  if (anterior.limpa) flutuar(centroDe(pauta), "Sem desafinar!", "efeito-ouro");
  await esperar(1400);
  estado = depois;
  moldura.placa(estado);
  moldura.salvar(estado);
  moldura.mostrar(telaFase(anterior.fase, ganhou, anterior.limpa));
}

function prepararFase() {
  delete poste.dataset.voando;
  poste.dataset.ouviu = "";
  ouviu = false;
  desenharPauta();
  moldura.placa(estado);
  falar("Toque em Ouvir para escutar a canção.");
  travar(false);
}

function seguir() {
  const novidade = NOVIDADES[estado.fase];
  prepararFase();
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

function telaFase(concluida: number, bonus: number, limpa: boolean) {
  return `<h2>Fase ${concluida} completa!</h2>
    <p class="placar">+${bonus} pontos</p>
    <p>${limpa ? "Afinadinho de primeira!" : "O bando aprendeu a canção!"}</p>
    <button class="botao" type="button" data-acao="seguir">Continuar</button>`;
}
