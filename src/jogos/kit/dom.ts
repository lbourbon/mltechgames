export const porId = (id: string) => document.getElementById(id)!;

// Para alvos em movimento: age ao encostar o dedo, sem esperar soltar.
export function aoTocar(el: HTMLElement, acao: () => void) {
  el.addEventListener("pointerdown", acao);
  // detail 0 é o clique vindo do teclado.
  el.addEventListener("click", (evento) => {
    if (evento.detail === 0) acao();
  });
}
