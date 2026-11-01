// Efeitos visuais descartáveis: nascem, animam e somem sozinhos, por cima do jogo e dos
// painéis, sem receber toques (.efeito em styles/jogo.css). São só enfeite: quem pediu
// menos movimento fica sem eles, e o jogo continua igual.
import { movimentoReduzido } from "./tempo";

export type Ponto = { x: number; y: number };

const CORES_FESTA = ["#ff5a5f", "#2f7bff", "#ffc933", "#18b67e", "#a45cff"];

const palco = document.querySelector<HTMLElement>(".jogo")!;

const acaso = (min: number, max: number) => min + Math.random() * (max - min);

export function animar(el: Element, quadros: Keyframe[], duracao: number, easing = "ease-out") {
  if (!movimentoReduzido) el.animate(quadros, { duration: duracao, easing });
}

export const pular = (el: Element, tamanho = 1.35) =>
  animar(el, [{ scale: 1 }, { scale: tamanho }, { scale: 1 }], 260);

export function tremer(el: Element, forca = 6) {
  const lado = (fator: number) => ({ translate: `${forca * fator}px 0` });
  animar(el, [lado(0), lado(1), lado(-1), lado(0.6), lado(-0.3), lado(0)], 280, "linear");
}

export function centroDe(el: Element): Ponto {
  const caixa = el.getBoundingClientRect();
  const base = palco.getBoundingClientRect();
  return { x: caixa.left - base.left + caixa.width / 2, y: caixa.top - base.top + caixa.height / 2 };
}

function criar({ x, y }: Ponto, classe: string, texto = "") {
  const el = document.createElement("span");
  el.className = `efeito ${classe}`;
  el.textContent = texto;
  el.setAttribute("aria-hidden", "true");
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  palco.append(el);
  return el;
}

function soltar(el: HTMLElement, quadros: Keyframe[], duracao: number, easing = "ease-out") {
  el.animate(quadros, { duration: duracao, easing }).onfinish = () => el.remove();
}

// Texto que sobe e some, como "+3". Com menos movimento, ele aparece no lugar e some.
export function flutuar(ponto: Ponto, texto: string, classe = "") {
  const sobe = movimentoReduzido ? "0" : "-70px";
  soltar(
    criar(ponto, `efeito-texto ${classe}`, texto),
    [
      { translate: "0 0", opacity: 1, scale: 0.6 },
      { translate: "0 -24px", opacity: 1, scale: 1.2, offset: 0.25 },
      { translate: `0 ${sobe}`, opacity: 0, scale: 1 },
    ],
    1000,
  );
}

// Peças saindo de um ponto. Cada peça é uma cor (#...) ou um emoji.
export function estourar(ponto: Ponto, pecas: string[] = CORES_FESTA, quantidade = 10, alcance = 90) {
  if (movimentoReduzido) return;
  for (let i = 0; i < quantidade; i++) {
    const peca = pecas[i % pecas.length];
    const cor = peca.startsWith("#");
    const el = criar(ponto, cor ? "efeito-peca" : "efeito-emoji", cor ? "" : peca);
    if (cor) el.style.background = peca;
    const angulo = acaso(0, Math.PI * 2);
    const distancia = acaso(alcance * 0.5, alcance);
    const destino = `${Math.cos(angulo) * distancia}px ${Math.sin(angulo) * distancia}px`;
    soltar(
      el,
      [
        { translate: "0 0", opacity: 1, scale: 1 },
        { translate: destino, opacity: 0, scale: 0.4 },
      ],
      acaso(420, 680),
      "cubic-bezier(0.15, 0.7, 0.3, 1)",
    );
  }
}

// Lança algo de um ponto a outro, em arco. A duração combina com o esperar de quem chama.
export function lancar(de: Ponto, para: Ponto, classe: string, texto = "", duracao = 300, arco = 0) {
  if (movimentoReduzido) return null;
  const dx = para.x - de.x;
  const dy = para.y - de.y;
  const el = criar(de, classe, texto);
  soltar(
    el,
    [
      { translate: "0 0" },
      { translate: `${dx / 2}px ${dy / 2 - arco}px`, offset: 0.5 },
      { translate: `${dx}px ${dy}px` },
    ],
    duracao,
    "linear",
  );
  return el;
}

export function confete(quantidade = 44) {
  if (movimentoReduzido) return;
  const largura = palco.clientWidth;
  for (let i = 0; i < quantidade; i++) {
    const el = criar({ x: acaso(0, largura), y: -16 }, "efeito-confete");
    el.style.background = CORES_FESTA[i % CORES_FESTA.length];
    const queda = `${acaso(-40, 40)}px ${palco.clientHeight + 40}px`;
    soltar(
      el,
      [
        { translate: "0 0", rotate: "0deg" },
        { translate: queda, rotate: `${acaso(360, 1080)}deg` },
      ],
      acaso(1100, 2100),
      "ease-in",
    );
  }
}
