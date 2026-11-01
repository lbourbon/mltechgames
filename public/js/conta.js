// Conta e progresso. Sem login, tudo fica no localStorage; com login, o
// localStorage continua sendo a cópia de trabalho e é espelhado no Firestore.
import { mesclar } from "./progresso.js";

const firebaseConfig = {
  apiKey: "AIzaSyCU5utH8qJv9M2siNgZHeTPHKMWBlbfLAo",
  authDomain: "mltechgames.firebaseapp.com",
  projectId: "mltechgames",
  storageBucket: "mltechgames.firebasestorage.app",
  messagingSenderId: "1041587431526",
  appId: "1:1041587431526:web:8024adb2350d72b20465a7",
};

const SDK = "https://www.gstatic.com/firebasejs/11.0.1";
const PREFIXO = "mltg:progresso:";

const ouvintes = new Set();
let fb = null;
let usuario = null;

const chaveDe = (jogoId) => PREFIXO + jogoId;

const idsLocais = () =>
  Object.keys(localStorage)
    .filter((chave) => chave.startsWith(PREFIXO))
    .map((chave) => chave.slice(PREFIXO.length));

export function lerProgresso(jogoId) {
  try {
    return mesclar(JSON.parse(localStorage.getItem(chaveDe(jogoId))));
  } catch {
    return mesclar();
  }
}

function salvarLocal(jogoId, progresso) {
  localStorage.setItem(chaveDe(jogoId), JSON.stringify(progresso));
}

async function enviar(uid, jogoId) {
  const { db, fs } = fb;
  const ref = fs.doc(db, "usuarios", uid, "progresso", jogoId);
  await fs.runTransaction(db, async (transacao) => {
    const remoto = await transacao.get(ref);
    const final = mesclar(lerProgresso(jogoId), remoto.data());
    transacao.set(ref, { ...final, atualizadoEm: fs.serverTimestamp() });
    salvarLocal(jogoId, final);
  });
}

async function sincronizar(uid) {
  const { db, fs } = fb;
  const remotos = await fs.getDocs(fs.collection(db, "usuarios", uid, "progresso"));
  remotos.forEach((item) => {
    salvarLocal(item.id, mesclar(lerProgresso(item.id), item.data()));
  });
  await Promise.all(idsLocais().map((jogoId) => enviar(uid, jogoId)));
}

function avisar() {
  ouvintes.forEach((ouvinte) => ouvinte(usuario));
}

// O SDK só é carregado aqui para que os jogos funcionem mesmo se o CDN falhar.
async function iniciar() {
  const [app, auth, fs] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`),
  ]);
  const firebaseApp = app.initializeApp(firebaseConfig);
  fb = { auth, fs, sessao: auth.getAuth(firebaseApp), db: fs.getFirestore(firebaseApp) };

  auth.onAuthStateChanged(fb.sessao, async (novoUsuario) => {
    // Aparelho compartilhado: ao sair, o progresso não passa para a próxima criança.
    if (usuario && !novoUsuario) {
      idsLocais().forEach((jogoId) => localStorage.removeItem(chaveDe(jogoId)));
    }
    usuario = novoUsuario;
    if (usuario) await sincronizar(usuario.uid).catch(console.error);
    avisar();
  });
}

iniciar().catch(console.error);

export function aoMudarConta(ouvinte) {
  ouvintes.add(ouvinte);
  ouvinte(usuario);
}

export const usuarioAtual = () => usuario;

export async function entrar() {
  try {
    await fb.auth.signInWithPopup(fb.sessao, new fb.auth.GoogleAuthProvider());
  } catch (erro) {
    if (erro.code === "auth/popup-closed-by-user" || erro.code === "auth/cancelled-popup-request") return;
    console.error("Erro ao entrar:", erro);
    alert("Não deu para entrar agora. Tente de novo daqui a pouco.");
  }
}

export const sair = () => fb.auth.signOut(fb.sessao);

export function registrarResultado(jogoId, { pontos = 0, fase = 1 }) {
  const progresso = mesclar(lerProgresso(jogoId), { recorde: pontos, fase });
  salvarLocal(jogoId, progresso);
  if (usuario) enviar(usuario.uid, jogoId).catch(console.error);
  return progresso;
}
