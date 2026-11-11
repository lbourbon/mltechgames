export const porId = (id: string) => document.getElementById(id)!;

// Para a cena de um jogo caber na tela quando o que fica em volta dela muda de altura entre
// as fases, como uma lista de pedidos ou uma fileira de cartas. Mede tudo o que não é a cena
// e guarda em --fora, e o CSS da cena cede o tamanho exato: calc(var(--livre) - var(--fora)).
export function medirEmVolta(cena: HTMLElement) {
  const cenario = cena.closest<HTMLElement>(".cenario")!;
  const placa = document.querySelector<HTMLElement>(".placa")!;
  const blocos = [...cenario.children] as HTMLElement[];
  // As bordas do jogo e uma folga para a sombra dele.
  const BORDAS = 12;

  function medir() {
    const tudo = blocos.reduce((soma, bloco) => soma + bloco.offsetHeight, 0);
    cena.style.setProperty("--fora", `${placa.offsetHeight + tudo - cena.offsetHeight + BORDAS}px`);
  }

  // A cena muda de tamanho por causa da medida: só os outros blocos disparam uma nova.
  const vigia = new ResizeObserver(medir);
  blocos.filter((bloco) => !bloco.contains(cena)).forEach((bloco) => vigia.observe(bloco));
  medir();
}

// Para alvos em movimento: age ao encostar o dedo, sem esperar soltar.
export function aoTocar(el: HTMLElement, acao: () => void) {
  el.addEventListener("pointerdown", acao);
  // detail 0 é o clique vindo do teclado.
  el.addEventListener("click", (evento) => {
    if (evento.detail === 0) acao();
  });
}
