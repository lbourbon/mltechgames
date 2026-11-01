export const movimentoReduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Pausa entre animações: quem pediu menos movimento espera menos.
export const esperar = (ms: number) => new Promise((pronto) => setTimeout(pronto, movimentoReduzido ? ms / 4 : ms));

// Laço de jogos em tempo real: aoQuadro recebe os segundos desde o quadro anterior.
export function criarLaco(aoQuadro: (dt: number) => void) {
  let rodando = false;
  let ultimoQuadro = 0;
  let pedido = 0;

  function quadro(agora: number) {
    // O teto evita um salto do jogo quando a aba volta de segundo plano.
    const dt = Math.min(agora - ultimoQuadro, 50) / 1000;
    ultimoQuadro = agora;
    aoQuadro(dt);
    if (rodando) pedido = requestAnimationFrame(quadro);
  }

  function desligar() {
    rodando = false;
    cancelAnimationFrame(pedido);
  }

  function ligar() {
    desligar();
    rodando = true;
    ultimoQuadro = performance.now();
    pedido = requestAnimationFrame(quadro);
  }

  return { ligar, desligar, rodando: () => rodando };
}
