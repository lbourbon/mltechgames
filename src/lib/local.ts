// localStorage é a cópia de trabalho do progresso, com ou sem conta.
import { mesclar, type Progresso } from "./progresso";

const PREFIXO = "mltg:progresso:";
const CHAVE_SESSAO = "mltg:sessao";
const CHAVE_PERFIL = "mltg:perfil";
const CHAVE_SOM = "mltg:som";
const CHAVE_ULTIMOS = "mltg:ultimos";

const chaveDe = (jogoId: string) => PREFIXO + jogoId;

// Com os cookies bloqueados, só de tocar em localStorage o navegador lança um erro, e um
// aparelho cheio recusa gravações. Nada disso pode impedir a criança de jogar: o que não
// deu para gravar vive na memória da página, e o jogo só não se lembra dele depois.
const memoria = new Map<string, string>();

function cofre(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function ler(chave: string): string | null {
  if (memoria.has(chave)) return memoria.get(chave)!;
  try {
    return cofre()?.getItem(chave) ?? null;
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: string) {
  try {
    const guarda = cofre();
    if (!guarda) throw new Error("sem localStorage");
    guarda.setItem(chave, valor);
    memoria.delete(chave);
  } catch {
    memoria.set(chave, valor);
  }
}

function apagar(chave: string) {
  memoria.delete(chave);
  try {
    cofre()?.removeItem(chave);
  } catch {
    // Já saiu da memória.
  }
}

function chaves(): string[] {
  try {
    return [...new Set([...Object.keys(cofre() ?? {}), ...memoria.keys()])];
  } catch {
    return [...memoria.keys()];
  }
}

export const idsLocais = () =>
  chaves()
    .filter((chave) => chave.startsWith(PREFIXO))
    .map((chave) => chave.slice(PREFIXO.length));

export function lerProgresso(jogoId: string): Progresso {
  try {
    return mesclar(JSON.parse(ler(chaveDe(jogoId)) ?? "null"));
  } catch {
    return mesclar();
  }
}

export function salvarProgresso(jogoId: string, progresso: Progresso) {
  gravar(chaveDe(jogoId), JSON.stringify(progresso));
}

// Ids dos jogos começados neste aparelho, do mais recente ao mais antigo, para a
// página inicial oferecer "Continue jogando". É do perfil, como o progresso.
export function lerUltimosJogos(): string[] {
  try {
    const ids: unknown = JSON.parse(ler(CHAVE_ULTIMOS) ?? "[]");
    return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function marcarJogado(jogoId: string) {
  gravar(CHAVE_ULTIMOS, JSON.stringify([jogoId, ...lerUltimosJogos().filter((id) => id !== jogoId)]));
}

export function limparProgresso() {
  idsLocais().forEach((jogoId) => apagar(chaveDe(jogoId)));
  apagar(CHAVE_ULTIMOS);
}

// Preferência do aparelho, não do perfil: fica mesmo depois de sair da conta.
export const lerSomLigado = () => ler(CHAVE_SOM) !== "0";
export const salvarSomLigado = (ligado: boolean) => gravar(CHAVE_SOM, ligado ? "1" : "0");

// Marca que há sessão neste aparelho: sem ela, o Firebase nem é carregado.
export const temSessao = () => ler(CHAVE_SESSAO) !== null;
export const marcarSessao = () => gravar(CHAVE_SESSAO, "1");
export const lerPerfilAtivo = () => ler(CHAVE_PERFIL);
export const salvarPerfilAtivo = (id: string) => gravar(CHAVE_PERFIL, id);
export const esquecerPerfilAtivo = () => apagar(CHAVE_PERFIL);

export function esquecerSessao() {
  apagar(CHAVE_SESSAO);
  esquecerPerfilAtivo();
  limparProgresso();
}
