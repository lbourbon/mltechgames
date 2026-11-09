// O que todo jogo tem em volta da brincadeira: placa, telas de início e de fim, recorde
// e convite ao login. A marcação vem de layouts/Jogo.astro.
import { aoMudarConta, contaAtual, lerProgresso, registrarResultado } from "../../lib/conta";
import { marcarJogado } from "../../lib/local";
import { porId } from "./dom";
import { confete, pular, tremer } from "./efeitos";
import { ligarSom, somClique, somFim, somLigado, somRecorde } from "./som";

export type Placar = { vidas: number; pontos: number; fase: number };
type Resultado = Pick<Placar, "pontos" | "fase">;

type Opcoes = {
  // Começa uma partida na fase escolhida, com o painel já fechado.
  aoComecar: (fase: number) => void;
  // Volta ao jogo depois de uma tela própria, que tem um botão com data-acao="seguir".
  aoSeguir: () => void;
};

// O adulto entra, nunca a criança.
const AVISO_LOGIN = `<p class="aviso-login">Seu progresso está guardado só neste aparelho.
  Chame um adulto para guardar e continuar em qualquer lugar.</p>
  <button class="botao botao-claro" type="button" data-abrir="janela-entrar">Chamar um adulto</button>`;

export function criarMoldura({ aoComecar, aoSeguir }: Opcoes) {
  const painel = porId("painel");
  const jogoId = painel.dataset.jogo!;
  // O título e as instruções vêm prontos no HTML estático.
  const abertura = painel.innerHTML;
  const campos = { vidas: porId("vidas"), pontos: porId("pontos"), fase: porId("fase") };
  const botaoSom = porId("som");

  let recordeAnterior = 0;
  let telaAtual: (() => string) | null = null;
  let vidasAtuais = 0;

  function desenharSom() {
    botaoSom.textContent = somLigado() ? "🔊" : "🔇";
    botaoSom.setAttribute("aria-pressed", String(somLigado()));
  }

  botaoSom.addEventListener("click", () => {
    ligarSom(!somLigado());
    desenharSom();
  });
  desenharSom();

  function abrir(tela: () => string) {
    telaAtual = tela;
    painel.innerHTML = tela();
    painel.hidden = false;
    // Uma tela nova começa do topo, mesmo que a anterior tenha rolado.
    painel.scrollTop = 0;
  }

  function fechar() {
    telaAtual = null;
    painel.hidden = true;
  }

  function telaInicio() {
    const { recorde, fase } = lerProgresso(jogoId);
    const continuar = `<button class="botao" type="button" data-acao="jogar" data-fase="${fase}">Continuar da fase ${fase}</button>`;
    return `${abertura}
      ${recorde ? `<p><strong>Recorde: ${recorde}</strong></p>` : ""}
      ${fase > 1 ? continuar : ""}
      <button class="botao ${fase > 1 ? "botao-claro" : ""}" type="button" data-acao="jogar" data-fase="1">${fase > 1 ? "Começar do início" : "Jogar"}</button>`;
  }

  function salvar({ pontos, fase }: Resultado) {
    registrarResultado(jogoId, { pontos, fase });
  }

  painel.addEventListener("click", (evento) => {
    const botao = (evento.target as HTMLElement).closest<HTMLElement>("[data-acao]");
    if (!botao) return;
    somClique();
    const { acao, fase } = botao.dataset;
    if (acao === "jogar") {
      recordeAnterior = lerProgresso(jogoId).recorde;
      marcarJogado(jogoId);
      fechar();
      aoComecar(Number(fase));
    }
    if (acao === "seguir") {
      fechar();
      aoSeguir();
    }
    if (acao === "inicio") abrir(telaInicio);
  });

  // O login ou a troca de perfil podem chegar com um painel aberto: redesenha com o progresso novo.
  aoMudarConta(() => {
    if (telaAtual) abrir(telaAtual);
  });

  abrir(telaInicio);

  return {
    salvar,

    placa({ vidas, pontos, fase }: Placar) {
      if (vidas < vidasAtuais) tremer(campos.vidas);
      vidasAtuais = vidas;
      campos.vidas.textContent = "❤️".repeat(vidas);
      campos.vidas.setAttribute("aria-label", `${vidas} vidas`);
      if (campos.pontos.textContent !== String(pontos)) pular(campos.pontos);
      campos.pontos.textContent = String(pontos);
      campos.fase.textContent = String(fase);
    },

    // Telas próprias do jogo, como a de fase concluída. Não salva: chame salvar antes.
    mostrar(html: string) {
      abrir(() => html);
    },

    // Salva e mostra o fim da partida. A frase conta como o jogo terminou. Um jogo que tem
    // última fase passa `final` quando ela é vencida, com o título e o desenho da festa.
    fim(resultado: Resultado, frase = "", final?: { titulo: string; html?: string }) {
      salvar(resultado);
      const novoRecorde = resultado.pontos > recordeAnterior;
      if (novoRecorde || final) {
        confete();
        somRecorde();
      } else {
        somFim();
      }
      const titulo = final?.titulo ?? (novoRecorde ? "Novo recorde!" : "Fim de jogo");
      abrir(
        () => `<h2>${titulo}</h2>
          ${final?.html ?? ""}
          ${frase ? `<p>${frase}</p>` : ""}
          <p class="placar">${resultado.pontos} pontos</p>
          ${final ? (novoRecorde ? "<p><strong>Novo recorde!</strong></p>" : "") : `<p>Você chegou à fase ${resultado.fase}.</p>`}
          <button class="botao" type="button" data-acao="inicio">Jogar de novo</button>
          ${contaAtual().logado ? "" : AVISO_LOGIN}`,
      );
    },
  };
}
