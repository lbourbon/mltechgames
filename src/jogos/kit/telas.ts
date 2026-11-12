// Telas que os jogos mostram no painel com moldura.mostrar. Ficam aqui para todo jogo
// comemorar, apresentar novidade e consolar do mesmo jeito. Só montam HTML, sem DOM.

const botaoSeguir = (texto: string) => `<button class="botao" type="button" data-acao="seguir">${texto}</button>`;

type Fase = {
  fase: number;
  // Pontos ganhos na fase. Sem eles, a linha do placar não aparece.
  pontos?: number;
  // Acende a terceira estrela. Cada jogo decide o que é uma fase sem tropeço.
  perfeita?: boolean;
  frase?: string;
  // HTML do próprio jogo, entre o placar e a frase.
  miolo?: string;
};

// Duas estrelas sempre, e a terceira para a fase sem tropeço. Para os jogos que montam a
// própria tela de fase, como a Corrida.
export function estrelas(perfeita: boolean) {
  const estrela = (apagada = false) => `<span class="conquista-estrela${apagada ? " apagada" : ""}">⭐</span>`;
  return `<div class="conquista" role="img" aria-label="${perfeita ? 3 : 2} de 3 estrelas">
      ${estrela()}${estrela()}${estrela(!perfeita)}
    </div>`;
}

export function telaFase({ fase, pontos, perfeita = false, frase = "", miolo = "" }: Fase) {
  return `${estrelas(perfeita)}
    <h2>Fase ${fase} completa!</h2>
    ${pontos === undefined ? "" : `<p class="placar">+${pontos} pontos</p>`}
    ${miolo}
    ${frase ? `<p>${frase}</p>` : ""}
    ${botaoSeguir("Continuar")}`;
}

type Novidade = { titulo: string; texto?: string; miolo?: string; emblema?: string };

// Uma regra, uma peça ou um mapa novo, antes de a fase começar.
export function telaNovidade({ titulo, texto = "", miolo = "", emblema = "✨" }: Novidade) {
  return `<div class="emblema" aria-hidden="true">${emblema}</div>
    <h2>${titulo}</h2>
    ${miolo}
    ${texto ? `<p>${texto}</p>` : ""}
    ${botaoSeguir("Continuar")}`;
}

type Tropeco = { titulo: string; texto: string; perdeuVida?: boolean };

// A tentativa não deu certo e a mesma fase volta. Com perdeuVida, o coração partido avisa.
export function telaTropeco({ titulo, texto, perdeuVida = true }: Tropeco) {
  return `<div class="emblema emblema-tropeco" aria-hidden="true">${perdeuVida ? "💔" : "🔁"}</div>
    <h2>${titulo}</h2>
    <p>${texto}</p>
    ${botaoSeguir("Tentar de novo")}`;
}
