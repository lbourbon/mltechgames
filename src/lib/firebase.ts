// Único ponto de entrada do Firebase. Os imports são dinâmicos para que quem joga
// sem conta não baixe o SDK nem faça nenhuma conexão com o Google.
const emulador = import.meta.env.PUBLIC_EMULADOR === "1";

const firebaseConfig = {
  apiKey: "AIzaSyCU5utH8qJv9M2siNgZHeTPHKMWBlbfLAo",
  authDomain: "mltechgames.firebaseapp.com",
  projectId: emulador ? "demo-mltg" : "mltechgames",
  storageBucket: "mltechgames.firebasestorage.app",
  messagingSenderId: "1041587431526",
  appId: "1:1041587431526:web:8024adb2350d72b20465a7",
};

async function iniciar() {
  const [{ initializeApp }, auth, fs] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore"),
  ]);
  const app = initializeApp(firebaseConfig);
  const sessao = auth.getAuth(app);
  const db = fs.getFirestore(app);
  if (emulador) {
    auth.connectAuthEmulator(sessao, "http://127.0.0.1:9099", { disableWarnings: true });
    fs.connectFirestoreEmulator(db, "127.0.0.1", 8099);
  }
  return { auth, fs, sessao, db };
}

export type Firebase = Awaited<ReturnType<typeof iniciar>>;

let promessa: Promise<Firebase> | null = null;
let carregado: Firebase | null = null;

export const carregarFirebase = () =>
  (promessa ??= iniciar().then((firebase) => (carregado = firebase)));

// O popup do Google só abre direto do clique: quem abre precisa do SDK já carregado.
export const firebaseCarregado = () => carregado;
