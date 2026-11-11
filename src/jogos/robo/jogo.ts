import { porId } from "../kit/dom";
import { animar, centroDe, confete, estourar, flutuar, lancar, pular, tremer } from "../kit/efeitos";
import { criarMoldura } from "../kit/moldura";
import { somVitoria } from "../kit/som";
import { telaFase, telaTropeco } from "../kit/telas";
import { esperar } from "../kit/tempo";
import { atacar, configDaFase, novoJogo, PODERES, type Estado, type Jogada } from "./logica";
import {
  SOM_DO_PODER,
  somChefe,
  somChegou,
  somCorrida,
  somDerrubou,
  somExato,
  somImpacto,
  somSemForca,
} from "./sons";

const ICONES: Record<string, string> = {
  soco: "👊",
  laser: "🔴",
  canhao: "💣",
  missil: "🚀",
  raio: "⚡",
  supernova: "🌟",
};

// O laser é um feixe desenhado em CSS. Os outros usam o próprio ícone como projétil.
const PROJETEIS: Record<string, string> = { ...ICONES, laser: "" };

const COR_DO_PODER: Record<string, string> = {
  soco: "#ffc933",
  laser: "#ff5a5f",
  canhao: "#8d8aa0",
  missil: "#ff9a3d",
  raio: "#7fc8ff",
  supernova: "#c79bff",
};

const CORES_MONSTRO = ["#a45cff", "#2fbf9b", "#ff9a3d", "#ff6fb5", "#3f9dff"];
const VOO_MS = 320;

const TELA_SEM_FORCA = telaTropeco({
  titulo: "Acabaram os golpes!",
  texto: "Você perdeu uma vida, mas pode tentar a fase de novo. Olhe quem vem aí e guarde seus golpes fortes.",
});

const jogo = document.querySelector(".jogo")!;
const rua = porId("rua");
const robo = porId("robo");
const clarao = porId("clarao");
const inimigo = porId("inimigo");
const escudo = inimigo.querySelector(".escudo")!;
const fala = porId("fala");
const fila = porId("fila");
const poderes = porId("poderes");
const defesa = porId("defesa");

const moldura = criarMoldura({ aoComecar: comecar, aoSeguir: correrAteInimigo });

let estado: Estado = novoJogo();
let travado = true;
let botoes: HTMLButtonElement[] = [];
// Como a fase começou: a terceira estrela é de quem vence o chefão sem ficar sem golpes.
let inicioDaFase = { vidas: 0, pontos: 0 };

function desenharPlaca() {
  moldura.placa(estado);
  defesa.textContent = String(estado.restante);
}

function desenharFila() {
  fila.replaceChildren(
    ...estado.inimigos.slice(1).map(({ defesa, chefe }) => {
      const item = document.createElement("span");
      item.className = chefe ? "fila-item fila-chefe" : "fila-item";
      item.textContent = chefe ? `👑 ${defesa}` : String(defesa);
      return item;
    }),
  );
}

function atualizarPoderes() {
  botoes.forEach((botao, i) => {
    const cargas = botao.querySelector(".poder-cargas")!;
    if (cargas.textContent !== `×${estado.cargas[i]}`) pular(cargas, 1.5);
    cargas.textContent = `×${estado.cargas[i]}`;
    botao.disabled = travado || estado.cargas[i] === 0;
    botao.classList.toggle("vazio", estado.cargas[i] === 0);
  });
}

function montarPoderes() {
  botoes = estado.cargas.map((_, i) => {
    const { id, nome, forca } = PODERES[i];
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "poder";
    botao.dataset.forca = String(forca);
    botao.style.setProperty("--poder", COR_DO_PODER[id]);
    botao.innerHTML = `<span class="poder-icone">${ICONES[id]}</span>
      <span class="poder-nome">${nome}</span>
      <strong class="poder-forca">${forca}</strong>
      <span class="poder-cargas"></span>`;
    botao.addEventListener("click", () => golpear(i));
    return botao;
  });
  poderes.replaceChildren(...botoes);
  atualizarPoderes();
}

function travar(valor: boolean) {
  travado = valor;
  atualizarPoderes();
}

function falar(texto: string) {
  fala.textContent = texto;
}

function festejarRobo() {
  robo.dataset.humor = "feliz";
  animar(robo, [{ translate: "0 0" }, { translate: "0 -30px" }, { translate: "0 0" }], 420);
}

// O robô corre pela rua até o próximo monstro, que fica parado esperando a jogada.
async function correrAteInimigo() {
  travar(true);
  const { chefe } = estado.inimigos[0];
  inimigo.className = chefe ? "inimigo inimigo-chefe chegando" : "inimigo chegando";
  inimigo.style.setProperty("--corpo", CORES_MONSTRO[estado.inimigos.length % CORES_MONSTRO.length]);
  robo.dataset.humor = "";
  rua.dataset.correndo = "1";
  desenharPlaca();
  desenharFila();
  falar(chefe ? "Olha o chefão!" : "");
  somCorrida();
  await esperar(850);
  rua.dataset.correndo = "";
  inimigo.classList.remove("chegando");
  if (chefe) {
    somChefe();
    tremer(jogo, 8);
  } else {
    somChegou();
  }
  pular(escudo, 1.25);
  travar(false);
}

async function golpear(indice: number) {
  if (travado || estado.cargas[indice] === 0) return;
  travar(true);

  const { id, forca } = PODERES[indice];
  SOM_DO_PODER[id]();
  animar(robo, [{ translate: "0 0" }, { translate: "-12px 0" }, { translate: "0 0" }], 200);
  const arco = id === "canhao" ? 50 : 0;
  lancar(centroDe(robo), centroDe(inimigo), `tiro tiro-${id}`, PROJETEIS[id], VOO_MS, arco);
  await esperar(VOO_MS);

  impacto(indice);
  const restanteAntes = estado.restante;
  await aplicar(atacar(estado, indice), forca - restanteAntes);
}

// O impacto cresce com o poder: um soco é um tapinha, a supernova sacode o jogo.
function impacto(indice: number) {
  const peso = indice / (PODERES.length - 1);
  const centro = centroDe(inimigo);
  somImpacto(peso);
  estourar(centro, ["💥", "#ffc933", "#ff9a3d", "#fff"], 8 + Math.round(peso * 20), 60 + peso * 90);
  flutuar(centro, `-${PODERES[indice].forca}`);
  tremer(jogo, 2 + peso * 8);
  if (peso > 0.7) animar(clarao, [{ opacity: 0.6 }, { opacity: 0 }], 280);
}

async function derrubarInimigo(sobra: number) {
  defesa.textContent = "0";
  const exato = sobra === 0;
  const centro = centroDe(inimigo);
  inimigo.classList.add("derrotado");
  festejarRobo();
  if (exato) {
    somExato();
    estourar(centro, ["⭐", "✨", "#ffc933"], 22, 140);
    flutuar(centro, "Na medida!", "efeito-ouro");
  } else {
    somDerrubou();
  }
  falar(exato ? "Na medida! Pontos extras!" : `Derrotou! Mas desperdiçou ${sobra} de força.`);
  await esperar(800);
  inimigo.classList.remove("derrotado");
}

async function aplicar({ estado: novoEstado, resultado }: Jogada, sobra: number) {
  const anterior = estado;
  estado = novoEstado;

  if (resultado === "golpe") {
    desenharPlaca();
    pular(escudo, 1.3);
    inimigo.classList.add("atingido");
    falar(`Boa! Ainda falta ${estado.restante}.`);
    await esperar(250);
    inimigo.classList.remove("atingido");
    travar(false);
    return;
  }

  if (resultado === "sem-forca" || resultado === "fim") {
    // O estado novo já é o da próxima tentativa: mostra antes como terminou o último golpe.
    botoes.forEach((botao) => (botao.querySelector(".poder-cargas")!.textContent = "×0"));
    defesa.textContent = String(Math.max(0, -sobra));
    if (sobra >= 0) await derrubarInimigo(sobra);
    falar("Acabaram os golpes!");
    robo.dataset.humor = "triste";
    somSemForca();
    await esperar(900);
    desenharPlaca();
    if (resultado === "fim") {
      moldura.fim(estado, "Acabaram os golpes e as vidas.");
    } else {
      montarPoderes();
      moldura.mostrar(TELA_SEM_FORCA);
    }
    return;
  }

  await derrubarInimigo(sobra);

  if (resultado === "fase") {
    moldura.salvar(estado);
    falar("Chefão derrotado!");
    somVitoria();
    confete();
    festejarRobo();
    await esperar(900);
    desenharPlaca();
    montarPoderes();
    moldura.mostrar(telaDaFase(anterior.fase));
    inicioDaFase = { vidas: estado.vidas, pontos: estado.pontos };
    return;
  }

  await correrAteInimigo();
}

function comecar(fase: number) {
  estado = novoJogo(fase);
  inicioDaFase = { vidas: estado.vidas, pontos: estado.pontos };
  montarPoderes();
  correrAteInimigo();
}

function telaDaFase(concluida: number) {
  const { poderes: total } = configDaFase(estado.fase);
  const novo = configDaFase(concluida).poderes < total ? PODERES[total - 1] : null;
  return telaFase({
    fase: concluida,
    pontos: estado.pontos - inicioDaFase.pontos,
    perfeita: estado.vidas === inicioDaFase.vidas,
    miolo: novo ? `<p class="destaque">Novo poder: ${ICONES[novo.id]} <strong>${novo.nome}</strong>, força ${novo.forca}!</p>` : "",
    frase: "Quanto mais força você guardar, mais pontos ganha no fim da fase.",
  });
}
