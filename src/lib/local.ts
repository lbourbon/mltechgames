// localStorage é a cópia de trabalho do progresso, com ou sem conta.
import { mesclar, type Progresso } from "./progresso";

const PREFIXO = "mltg:progresso:";
const CHAVE_SESSAO = "mltg:sessao";
const CHAVE_PERFIL = "mltg:perfil";
const CHAVE_SOM = "mltg:som";
const CHAVE_ULTIMOS = "mltg:ultimos";

const chaveDe = (jogoId: string) => PREFIXO + jogoId;

export const idsLocais = () =>
  Object.keys(localStorage)
    .filter((chave) => chave.startsWith(PREFIXO))
    .map((chave) => chave.slice(PREFIXO.length));

export function lerProgresso(jogoId: string): Progresso {
  try {
    return mesclar(JSON.parse(localStorage.getItem(chaveDe(jogoId)) ?? "null"));
  } catch {
    return mesclar();
  }
}

export function salvarProgresso(jogoId: string, progresso: Progresso) {
  localStorage.setItem(chaveDe(jogoId), JSON.stringify(progresso));
}

// Ids dos jogos começados neste aparelho, do mais recente ao mais antigo, para a
// página inicial oferecer "Continue jogando". É do perfil, como o progresso.
export function lerUltimosJogos(): string[] {
  try {
    const ids: unknown = JSON.parse(localStorage.getItem(CHAVE_ULTIMOS) ?? "[]");
    return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function marcarJogado(jogoId: string) {
  localStorage.setItem(CHAVE_ULTIMOS, JSON.stringify([jogoId, ...lerUltimosJogos().filter((id) => id !== jogoId)]));
}

export function limparProgresso() {
  idsLocais().forEach((jogoId) => localStorage.removeItem(chaveDe(jogoId)));
  localStorage.removeItem(CHAVE_ULTIMOS);
}

// Preferência do aparelho, não do perfil: fica mesmo depois de sair da conta.
export const lerSomLigado = () => localStorage.getItem(CHAVE_SOM) !== "0";
export const salvarSomLigado = (ligado: boolean) => localStorage.setItem(CHAVE_SOM, ligado ? "1" : "0");

// Marca que há sessão neste aparelho: sem ela, o Firebase nem é carregado.
export const temSessao = () => localStorage.getItem(CHAVE_SESSAO) !== null;
export const marcarSessao = () => localStorage.setItem(CHAVE_SESSAO, "1");
export const lerPerfilAtivo = () => localStorage.getItem(CHAVE_PERFIL);
export const salvarPerfilAtivo = (id: string) => localStorage.setItem(CHAVE_PERFIL, id);
export const esquecerPerfilAtivo = () => localStorage.removeItem(CHAVE_PERFIL);

export function esquecerSessao() {
  localStorage.removeItem(CHAVE_SESSAO);
  esquecerPerfilAtivo();
  limparProgresso();
}
