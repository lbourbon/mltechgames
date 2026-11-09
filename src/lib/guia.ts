// Filtro por área do guia dos jogos, na página dos responsáveis. O endereço guarda a
// área (/responsaveis/#matematica), para a página inicial poder apontar direto para ela.
const botoes = [...document.querySelectorAll<HTMLButtonElement>("[data-filtro]")];
const fichas = [...document.querySelectorAll<HTMLElement>("[data-areas]")];
const areas = new Set(botoes.map((botao) => botao.dataset.filtro).filter(Boolean));

function filtrar(area: string) {
  botoes.forEach((botao) => botao.setAttribute("aria-pressed", String(botao.dataset.filtro === area)));
  fichas.forEach((ficha) => {
    ficha.hidden = area !== "" && !ficha.dataset.areas!.split(" ").includes(area);
  });
}

botoes.forEach((botao) =>
  botao.addEventListener("click", () => {
    const area = botao.dataset.filtro!;
    filtrar(area);
    history.replaceState(null, "", area ? `#${area}` : location.pathname);
  }),
);

const doEndereco = location.hash.slice(1);
if (areas.has(doEndereco)) {
  filtrar(doEndereco);
  document.getElementById("guia")?.scrollIntoView();
}
