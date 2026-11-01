// Cabeçalho, rodapé e janela de doação, iguais em todas as páginas.
import { aoMudarConta, entrar, sair } from "./conta.js";

document.body.insertAdjacentHTML(
  "afterbegin",
  `<header class="topo">
    <a class="marca" href="/">ML Tech Games</a>
    <nav class="topo-acoes">
      <span id="nome-conta" class="nome-conta"></span>
      <button id="botao-conta" class="botao botao-pequeno" type="button">Entrar</button>
      <button class="botao botao-pequeno botao-doar" type="button" data-doar>Doar</button>
    </nav>
  </header>`,
);

document.body.insertAdjacentHTML(
  "beforeend",
  `<footer class="rodape">
    <p>Grátis e sem anúncios. O login com Google serve só para guardar recordes e progresso.</p>
    <button class="link" type="button" data-doar>Apoiar com uma doação</button>
  </footer>
  <dialog id="janela-doacao" class="janela">
    <h2>Apoie o ML Tech Games</h2>
    <p>Os jogos são grátis e continuam sendo. Se você é adulto e quer ajudar a criar os próximos, doe qualquer valor por PIX:</p>
    <img src="/img/qrcode-pix.jpeg" alt="QR Code PIX para doação" width="240" height="240" />
    <form method="dialog"><button class="botao" type="submit">Fechar</button></form>
  </dialog>`,
);

const janela = document.getElementById("janela-doacao");
const botaoConta = document.getElementById("botao-conta");
const nomeConta = document.getElementById("nome-conta");

document.addEventListener("click", (evento) => {
  if (evento.target.closest("[data-doar]")) janela.showModal();
});

let logado = false;
botaoConta.addEventListener("click", () => (logado ? sair() : entrar()));

aoMudarConta((usuario) => {
  logado = Boolean(usuario);
  botaoConta.textContent = logado ? "Sair" : "Entrar";
  nomeConta.textContent = usuario?.displayName?.split(" ")[0] ?? "";
});
