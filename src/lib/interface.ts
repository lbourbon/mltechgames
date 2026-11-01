// Comportamento do cabeçalho e das janelas de conta e doação, em todas as páginas.
import {
  aoMudarConta,
  contaAtual,
  criarPerfil,
  entrar,
  sair,
  selecionarPerfil,
  type Conta,
} from "./conta";
import { carregarFirebase } from "./firebase";
import { AVATARES, avatarDe, MAX_PERFIS } from "./perfis";

const porId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const janelaEntrar = porId<HTMLDialogElement>("janela-entrar");
const janelaPerfis = porId<HTMLDialogElement>("janela-perfis");
const botaoConta = porId<HTMLButtonElement>("botao-conta");
const botaoGoogle = porId<HTMLButtonElement>("botao-google");
const listaPerfis = porId("lista-perfis");
const listaAvatares = porId("lista-avatares");
const blocoNovoPerfil = porId("bloco-novo-perfil");
const tituloPerfis = porId("titulo-perfis");

function abrirEntrar() {
  janelaEntrar.showModal();
  botaoGoogle.disabled = true;
  carregarFirebase()
    .then(() => (botaoGoogle.disabled = false))
    .catch(console.error);
}

function criarBotaoPerfil(emoji: string, nome: string, aoClicar: () => void) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "perfil";
  botao.textContent = emoji;
  botao.setAttribute("aria-label", nome);
  botao.addEventListener("click", aoClicar);
  return botao;
}

function desenharPerfis({ perfis, perfil: ativo }: Conta) {
  tituloPerfis.textContent = perfis.length ? "Quem está jogando?" : "Crie o perfil da criança";

  listaPerfis.replaceChildren(
    ...perfis.map((perfil) => {
      const { emoji, nome } = avatarDe(perfil.avatar);
      const botao = criarBotaoPerfil(emoji, nome, () => {
        janelaPerfis.close();
        selecionarPerfil(perfil);
      });
      botao.setAttribute("aria-current", String(perfil.id === ativo?.id));
      return botao;
    }),
  );

  const emUso = new Set(perfis.map((perfil) => perfil.avatar));
  listaAvatares.replaceChildren(
    ...AVATARES.filter((avatar) => !emUso.has(avatar.id)).map((avatar) =>
      criarBotaoPerfil(avatar.emoji, avatar.nome, () => {
        janelaPerfis.close();
        criarPerfil(avatar.id).catch((erro) => {
          console.error("Erro ao criar perfil:", erro);
          alert("Não deu para criar o perfil. Tente de novo.");
        });
      }),
    ),
  );
  blocoNovoPerfil.hidden = perfis.length >= MAX_PERFIS;
}

document.addEventListener("click", (evento) => {
  const gatilho = (evento.target as HTMLElement).closest<HTMLElement>("[data-abrir]");
  if (!gatilho) return;
  if (gatilho.dataset.abrir === "janela-entrar") abrirEntrar();
  else porId<HTMLDialogElement>(gatilho.dataset.abrir!).showModal();
});

botaoConta.addEventListener("click", () => {
  if (contaAtual().logado) janelaPerfis.showModal();
  else abrirEntrar();
});

botaoGoogle.addEventListener("click", async () => {
  janelaEntrar.close();
  await entrar();
});

porId("botao-sair").addEventListener("click", () => {
  janelaPerfis.close();
  sair();
});

const botaoCopiar = porId<HTMLButtonElement>("copiar-pix");
const codigoPix = porId<HTMLInputElement>("codigo-pix");
const avisoPix = porId("aviso-pix");

botaoCopiar.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(codigoPix.value);
    avisoPix.textContent = "Código copiado. Agora é só colar no app do banco.";
  } catch {
    codigoPix.select();
    avisoPix.textContent = "Selecione o código e copie.";
  }
});
codigoPix.addEventListener("focus", () => codigoPix.select());

aoMudarConta((conta) => {
  desenharPerfis(conta);
  botaoConta.textContent = conta.perfil ? avatarDe(conta.perfil.avatar).emoji : conta.logado ? "Perfis" : "Entrar";
  botaoConta.setAttribute("aria-label", conta.logado ? "Trocar de perfil" : "Entrar");
  // Na área dos responsáveis a janela não abre sozinha: ali o adulto pode estar apagando tudo.
  const pedirPerfil = conta.logado && !conta.perfil && !location.pathname.startsWith("/responsaveis");
  if (pedirPerfil && !janelaPerfis.open) janelaPerfis.showModal();
});
