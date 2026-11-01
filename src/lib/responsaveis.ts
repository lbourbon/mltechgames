// Área da conta na página dos responsáveis: apagar dados sem depender de ninguém.
import { aoMudarConta, apagarPerfil, excluirConta, type Conta } from "./conta";
import { limparProgresso } from "./local";
import { avatarDe } from "./perfis";

const area = document.getElementById("area-conta")!;
const anonimo = document.getElementById("area-anonima")!;
const lista = document.getElementById("lista-conta")!;
const aviso = document.getElementById("aviso-conta")!;

function desenhar({ logado, perfis }: Conta) {
  area.hidden = !logado;
  anonimo.hidden = logado;
  lista.replaceChildren(
    ...perfis.map((perfil) => {
      const { emoji, nome } = avatarDe(perfil.avatar);
      const linha = document.createElement("div");
      linha.className = "conta-perfil";
      const rotulo = document.createElement("span");
      rotulo.textContent = `${emoji} ${nome}`;
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = "botao botao-pequeno botao-perigo";
      botao.textContent = "Apagar perfil";
      botao.addEventListener("click", () => {
        if (confirm(`Apagar o perfil ${nome} e todo o progresso dele?`)) {
          apagarPerfil(perfil.id).catch(console.error);
        }
      });
      linha.append(rotulo, botao);
      return linha;
    }),
  );
}

const janelaExcluir = document.getElementById("janela-excluir") as HTMLDialogElement;

document.getElementById("apagar-conta")!.addEventListener("click", () => janelaExcluir.showModal());

// Este clique precisa abrir o popup direto: um confirm() antes faz o navegador bloqueá-lo.
document.getElementById("confirmar-exclusao")!.addEventListener("click", () => {
  janelaExcluir.close();
  excluirConta().catch((erro) => {
    console.error("Erro ao excluir conta:", erro);
    alert("Não deu para excluir a conta. Nada foi apagado. Tente de novo.");
  });
});

document.getElementById("apagar-aparelho")!.addEventListener("click", () => {
  limparProgresso();
  aviso.textContent = "Pronto, o progresso deste aparelho foi apagado.";
});

aoMudarConta(desenhar);
