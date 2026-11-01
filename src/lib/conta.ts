// Conta do adulto e perfis das crianças. Sem conta, o progresso fica só no aparelho;
// com conta, o localStorage guarda o perfil ativo e é espelhado no Firestore.
import { carregarFirebase, firebaseCarregado, type Firebase } from "./firebase";
import * as local from "./local";
import { mesclar, mesmoProgresso, type Progresso } from "./progresso";

export { lerProgresso } from "./local";

export type Perfil = { id: string; avatar: string };
export type Conta = { logado: boolean; perfis: Perfil[]; perfil: Perfil | null };

const ouvintes = new Set<(conta: Conta) => void>();
let conta: Conta = { logado: false, perfis: [], perfil: null };
let vigiando = false;

function publicar(mudancas: Partial<Conta>) {
  conta = { ...conta, ...mudancas };
  ouvintes.forEach((ouvinte) => ouvinte(conta));
}

const uid = (firebase: Firebase) => firebase.sessao.currentUser!.uid;

const refPerfis = (firebase: Firebase) =>
  firebase.fs.collection(firebase.db, "usuarios", uid(firebase), "perfis");

const refProgressos = (firebase: Firebase, perfilId: string) =>
  firebase.fs.collection(firebase.db, "usuarios", uid(firebase), "perfis", perfilId, "progresso");

async function lerPerfis(firebase: Firebase): Promise<Perfil[]> {
  const perfis = await firebase.fs.getDocs(refPerfis(firebase));
  return perfis.docs.map((item) => ({ id: item.id, avatar: item.data().avatar }));
}

async function enviar(firebase: Firebase, perfilId: string, jogoId: string) {
  const { fs, db } = firebase;
  const ref = fs.doc(refProgressos(firebase, perfilId), jogoId);
  await fs.runTransaction(db, async (transacao) => {
    const remoto = (await transacao.get(ref)).data() as Partial<Progresso> | undefined;
    const final = mesclar(local.lerProgresso(jogoId), remoto);
    local.salvarProgresso(jogoId, final);
    if (mesmoProgresso(remoto, final)) return;
    transacao.set(ref, { ...final, atualizadoEm: fs.serverTimestamp() });
  });
}

async function sincronizar(firebase: Firebase, perfilId: string) {
  const remotos = await firebase.fs.getDocs(refProgressos(firebase, perfilId));
  const porJogo = new Map(remotos.docs.map((item) => [item.id, item.data() as Partial<Progresso>]));
  porJogo.forEach((remoto, jogoId) => {
    local.salvarProgresso(jogoId, mesclar(local.lerProgresso(jogoId), remoto));
  });
  // Só grava o que mudou: abrir uma página não deve custar escritas no Firestore.
  const pendentes = local
    .idsLocais()
    .filter((jogoId) => !mesmoProgresso(porJogo.get(jogoId), local.lerProgresso(jogoId)));
  await Promise.all(pendentes.map((jogoId) => enviar(firebase, perfilId, jogoId)));
}

function vigiarSessao(firebase: Firebase) {
  if (vigiando) return;
  vigiando = true;
  firebase.auth.onAuthStateChanged(firebase.sessao, async (usuario) => {
    if (!usuario) {
      // Aparelho compartilhado: ao sair, o progresso não passa para a próxima criança.
      if (local.temSessao()) local.esquecerSessao();
      publicar({ logado: false, perfis: [], perfil: null });
      return;
    }
    local.marcarSessao();
    const perfis = await lerPerfis(firebase);
    const guardado = perfis.find((perfil) => perfil.id === local.lerPerfilAtivo());
    const perfil = guardado ?? (perfis.length === 1 ? perfis[0] : null);
    if (perfil) {
      local.salvarPerfilAtivo(perfil.id);
      await sincronizar(firebase, perfil.id).catch(console.error);
    }
    publicar({ logado: true, perfis, perfil });
  });
}

if (local.temSessao()) carregarFirebase().then(vigiarSessao).catch(console.error);

export function aoMudarConta(ouvinte: (conta: Conta) => void) {
  ouvintes.add(ouvinte);
  ouvinte(conta);
}

export const contaAtual = () => conta;

export async function entrar() {
  const firebase = firebaseCarregado();
  if (!firebase) return;
  vigiarSessao(firebase);
  try {
    await firebase.auth.signInWithPopup(firebase.sessao, new firebase.auth.GoogleAuthProvider());
  } catch (erro) {
    const { code } = erro as { code?: string };
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
    console.error("Erro ao entrar:", erro);
    alert("Não deu para entrar agora. Tente de novo daqui a pouco.");
  }
}

export const sair = () => carregarFirebase().then((firebase) => firebase.auth.signOut(firebase.sessao));

export async function selecionarPerfil(perfil: Perfil) {
  const firebase = await carregarFirebase();
  // O progresso local sem perfil vai para o escolhido; o de outro perfil não se mistura.
  if (conta.perfil && conta.perfil.id !== perfil.id) local.limparProgresso();
  local.salvarPerfilAtivo(perfil.id);
  await sincronizar(firebase, perfil.id).catch(console.error);
  publicar({ perfil });
}

export async function criarPerfil(avatar: string) {
  const firebase = await carregarFirebase();
  const ref = await firebase.fs.addDoc(refPerfis(firebase), {
    avatar,
    criadoEm: firebase.fs.serverTimestamp(),
  });
  const perfil = { id: ref.id, avatar };
  publicar({ perfis: [...conta.perfis, perfil] });
  await selecionarPerfil(perfil);
}

async function removerDadosDoPerfil(firebase: Firebase, perfilId: string) {
  const { fs, db } = firebase;
  const progressos = await fs.getDocs(refProgressos(firebase, perfilId));
  const lote = fs.writeBatch(db);
  progressos.docs.forEach((item) => lote.delete(item.ref));
  lote.delete(fs.doc(refPerfis(firebase), perfilId));
  await lote.commit();
}

export async function apagarPerfil(perfilId: string) {
  const firebase = await carregarFirebase();
  await removerDadosDoPerfil(firebase, perfilId);
  const ativo = conta.perfil?.id === perfilId;
  if (ativo) {
    local.limparProgresso();
    local.esquecerPerfilAtivo();
  }
  publicar({
    perfis: conta.perfis.filter((perfil) => perfil.id !== perfilId),
    perfil: ativo ? null : conta.perfil,
  });
}

export async function excluirConta() {
  const firebase = firebaseCarregado();
  const usuario = firebase?.sessao.currentUser;
  if (!firebase || !usuario) return;
  // O Firebase exige login recente; confirmar antes evita apagar os dados e falhar na conta.
  await firebase.auth.reauthenticateWithPopup(usuario, new firebase.auth.GoogleAuthProvider());
  await Promise.all(conta.perfis.map((perfil) => removerDadosDoPerfil(firebase, perfil.id)));
  await firebase.auth.deleteUser(usuario);
}

export function registrarResultado(jogoId: string, { pontos = 0, fase = 1 }) {
  const progresso = mesclar(local.lerProgresso(jogoId), { recorde: pontos, fase });
  local.salvarProgresso(jogoId, progresso);
  const firebase = firebaseCarregado();
  if (firebase && conta.perfil) enviar(firebase, conta.perfil.id, jogoId).catch(console.error);
  return progresso;
}
