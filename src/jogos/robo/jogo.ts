import { aoMudarConta, contaAtual, lerProgresso, registrarResultado } from "../../lib/conta";
import { AVISO_LOGIN } from "../comum";
import { atacar, configDaFase, novoJogo, PODERES, type Estado, type Jogada } from "./logica";

type Tela = { nome: "inicio" | "fim" | "sem-forca" } | { nome: "fase"; concluida: number; bonus: number };

const JOGO_ID = "robo";
const ICONES: Record<string, string> = {
  soco: "👊",
  laser: "🔴",
  canhao: "💣",
  missil: "🚀",
  raio: "⚡",
  supernova: "🌟",
};

const porId = (id: string) => document.getElementById(id)!;

const painel = porId("painel");
const rua = porId("rua");
const robo = porId("robo");
const inimigo = porId("inimigo");
const fala = porId("fala");
const fila = porId("fila");
const poderes = porId("poderes");
const hud = { vidas: porId("vidas"), pontos: porId("pontos"), fase: porId("fase"), defesa: porId("defesa") };

const movimentoReduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
const esperar = (ms: number) => new Promise((pronto) => setTimeout(pronto, movimentoReduzido ? ms / 4 : ms));

let estado: Estado = novoJogo();
let travado = true;
let recordeAnterior = 0;
let telaAtual: Tela | null = null;
let botoes: HTMLButtonElement[] = [];

function desenharPlaca() {
  hud.vidas.textContent = "❤️".repeat(estado.vidas);
  hud.vidas.setAttribute("aria-label", `${estado.vidas} vidas`);
  hud.pontos.textContent = String(estado.pontos);
  hud.fase.textContent = String(estado.fase);
  hud.defesa.textContent = String(estado.restante);
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
    botao.querySelector(".poder-cargas")!.textContent = `×${estado.cargas[i]}`;
    botao.disabled = travado || estado.cargas[i] === 0;
  });
}

function montarPoderes() {
  botoes = estado.cargas.map((_, i) => {
    const { id, nome, forca } = PODERES[i];
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "poder";
    botao.dataset.forca = String(forca);
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

// O robô corre pela rua até o próximo monstro, que fica parado esperando a jogada.
async function correrAteInimigo() {
  travar(true);
  const { chefe } = estado.inimigos[0];
  inimigo.className = chefe ? "inimigo inimigo-chefe chegando" : "inimigo chegando";
  rua.dataset.correndo = "1";
  desenharPlaca();
  desenharFila();
  falar(chefe ? "Olha o chefão!" : "");
  await esperar(850);
  rua.dataset.correndo = "";
  inimigo.classList.remove("chegando");
  travar(false);
}

async function golpear(indice: number) {
  if (travado || estado.cargas[indice] === 0) return;
  travar(true);

  const { id, forca } = PODERES[indice];
  const tiro = document.createElement("span");
  tiro.className = "tiro";
  tiro.textContent = ICONES[id];
  rua.append(tiro);
  await esperar(320);
  tiro.remove();

  const restanteAntes = estado.restante;
  await aplicar(atacar(estado, indice), forca - restanteAntes);
}

async function derrubarInimigo(sobra: number) {
  inimigo.classList.add("derrotado");
  falar(sobra === 0 ? "Na medida! Pontos extras!" : `Derrotou! Mas desperdiçou ${sobra} de força.`);
  await esperar(800);
  inimigo.classList.remove("derrotado");
}

async function aplicar({ estado: novoEstado, resultado }: Jogada, sobra: number) {
  const anterior = estado;
  estado = novoEstado;

  if (resultado === "golpe") {
    desenharPlaca();
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
    hud.defesa.textContent = String(Math.max(0, -sobra));
    if (sobra >= 0) await derrubarInimigo(sobra);
    falar("Acabaram os golpes!");
    await esperar(900);
    desenharPlaca();
    if (resultado === "fim") {
      registrarResultado(JOGO_ID, { pontos: estado.pontos, fase: estado.fase });
      mostrar({ nome: "fim" });
    } else {
      montarPoderes();
      mostrar({ nome: "sem-forca" });
    }
    return;
  }

  await derrubarInimigo(sobra);

  if (resultado === "fase") {
    registrarResultado(JOGO_ID, { pontos: estado.pontos, fase: estado.fase });
    desenharPlaca();
    montarPoderes();
    mostrar({ nome: "fase", concluida: anterior.fase, bonus: estado.pontos - anterior.pontos });
    return;
  }

  await correrAteInimigo();
}

function retomar() {
  telaAtual = null;
  painel.hidden = true;
  correrAteInimigo();
}

function comecar(fase: number) {
  recordeAnterior = lerProgresso(JOGO_ID).recorde;
  estado = novoJogo(fase);
  montarPoderes();
  retomar();
}

function htmlDaTela(tela: Tela) {
  if (tela.nome === "fase") {
    const { poderes: total } = configDaFase(estado.fase);
    const novo = configDaFase(tela.concluida).poderes < total ? PODERES[total - 1] : null;
    return `<h2>Fase ${tela.concluida} completa!</h2>
      <p class="placar">+${tela.bonus} pontos</p>
      ${novo ? `<p><strong>Novo poder: ${ICONES[novo.id]} ${novo.nome}, força ${novo.forca}!</strong></p>` : ""}
      <p>Quanto mais força você guardar, mais pontos ganha no fim da fase.</p>
      <button class="botao" type="button" data-acao="seguir">Continuar</button>`;
  }
  if (tela.nome === "sem-forca") {
    return `<h2>Acabaram os golpes!</h2>
      <p>Você perdeu uma vida, mas pode tentar a fase de novo. Olhe quem vem aí e guarde seus golpes fortes.</p>
      <button class="botao" type="button" data-acao="seguir">Tentar de novo</button>`;
  }
  if (tela.nome === "fim") {
    return `<h2>${estado.pontos > recordeAnterior ? "Novo recorde!" : "Fim de jogo"}</h2>
      <p>Acabaram os golpes e as vidas.</p>
      <p class="placar">${estado.pontos} pontos</p>
      <p>Você chegou à fase ${estado.fase}.</p>
      <button class="botao" type="button" data-acao="inicio">Jogar de novo</button>
      ${contaAtual().logado ? "" : AVISO_LOGIN}`;
  }
  const { recorde, fase } = lerProgresso(JOGO_ID);
  const continuar = `<button class="botao" type="button" data-acao="jogar" data-fase="${fase}">Continuar da fase ${fase}</button>`;
  return `<h1>Robô Turbo</h1>
    <p>Derrube a defesa dos monstros com seus poderes. Cada golpe gasta uma carga, e o que passar da defesa é desperdiçado. Guarde os golpes fortes para o chefão!</p>
    ${recorde ? `<p><strong>Recorde: ${recorde}</strong></p>` : ""}
    ${fase > 1 ? continuar : ""}
    <button class="botao ${fase > 1 ? "botao-claro" : ""}" type="button" data-acao="jogar" data-fase="1">${fase > 1 ? "Começar do início" : "Jogar"}</button>`;
}

function mostrar(tela: Tela) {
  telaAtual = tela;
  painel.innerHTML = htmlDaTela(tela);
  painel.hidden = false;
}

painel.addEventListener("click", (evento) => {
  const botao = (evento.target as HTMLElement).closest<HTMLElement>("[data-acao]");
  if (!botao) return;
  const { acao, fase } = botao.dataset;
  if (acao === "jogar") comecar(Number(fase));
  if (acao === "seguir") retomar();
  if (acao === "inicio") mostrar({ nome: "inicio" });
});

// O login ou a troca de perfil podem chegar com um painel aberto: redesenha com o progresso novo.
aoMudarConta(() => {
  if (telaAtual) mostrar(telaAtual);
});

mostrar({ nome: "inicio" });
