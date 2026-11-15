// Desenhos da Fábrica do Papai Noel, em SVG. Só montam texto, sem DOM: a capa do jogo também
// é feita com eles. Sem ids, para vários poderem morar na mesma página.
import type { Cor } from "./logica";

const TINTA = "#2b2140";
const linha = (largura = 2.4) => `stroke="${TINTA}" stroke-width="${largura}" stroke-linejoin="round" stroke-linecap="round"`;

export const COR: Record<Cor, string> = { vermelho: "#e23b3b", verde: "#18b67e", azul: "#2f7bff", amarelo: "#ffc933" };
export const NOME: Record<Cor, string> = { vermelho: "vermelho", verde: "verde", azul: "azul", amarelo: "amarelo" };

function laco(x: number, y: number, cor: string) {
  return `<path d="M${x} ${y}c-3-6-11-7-10-2s7 3 10 2zM${x} ${y}c3-6 11-7 10-2s-7 3-10 2z" fill="${cor}" ${linha(2)}/>
    <circle cx="${x}" cy="${y}" r="2.6" fill="${cor}" ${linha(2)}/>`;
}

// Cada cor tem seu formato, para a cor não ser a única pista. Centro na origem, cabe em 40 x 40.
export function presente(cor: Cor) {
  const c = COR[cor];
  switch (cor) {
    case "vermelho":
      return `<rect x="-13" y="-8" width="26" height="22" rx="2" fill="${c}" ${linha()}/>
        <rect x="-15" y="-13" width="30" height="7" rx="2" fill="${c}" ${linha()}/>
        <path d="M-2.5 -13h5v27h-5z" fill="#ffc933" ${linha(1.6)}/>
        ${laco(0, -14, "#ffc933")}`;
    case "verde":
      return `<rect x="-9" y="-12" width="18" height="28" rx="2" fill="${c}" ${linha()}/>
        <path d="M-9 -2h18M-9 6h18" stroke="#c8f5e2" stroke-width="2.2"/>
        <path d="M-2.2 -12h4.4v28h-4.4z" fill="#fff" ${linha(1.6)}/>
        <rect x="-9" y="-12" width="18" height="28" rx="2" fill="none" ${linha()}/>
        ${laco(0, -13, "#fff")}`;
    case "azul":
      return `<path d="M-14 -4v13a14 5 0 0 0 28 0v-13" fill="${c}" ${linha()}/>
        <path d="M-14 3a14 5 0 0 0 28 0" fill="none" stroke="#ffc933" stroke-width="3.4"/>
        <ellipse cx="0" cy="-4" rx="14" ry="5" fill="#6fa8ff" ${linha()}/>
        ${laco(0, -7, "#ffc933")}`;
    case "amarelo":
      return `<rect x="-16" y="-2" width="32" height="15" rx="2" fill="${c}" ${linha()}/>
        <rect x="-17" y="-7" width="34" height="6" rx="2" fill="${c}" ${linha()}/>
        <circle cx="-10" cy="5" r="1.6" fill="#fff"/><circle cx="9" cy="8" r="1.6" fill="#fff"/><circle cx="12" cy="2" r="1.3" fill="#fff"/>
        <path d="M-2.2 -7h4.4v20h-4.4z" fill="${COR.vermelho}" ${linha(1.6)}/>
        ${laco(0, -8, COR.vermelho)}`;
  }
}

export const svgPresente = (cor: Cor, classe = "presente-svg") =>
  `<svg class="${classe}" viewBox="-20 -22 40 40" aria-hidden="true">${presente(cor)}</svg>`;

// O Papai Noel de frente, no estilo dos outros personagens: cabeça e olhos grandes. Cabe em 0 0 100 130.
export function papaiNoel() {
  return `<g class="noel">
    <path d="M20 128v-12q0-6 7-6h12v18zM61 128v-18h12q7 0 7 6v12z" fill="${TINTA}"/>
    <path d="M18 112q-2-44 32-46q34 2 32 46z" fill="#e23b3b" ${linha(3)}/>
    <path d="M50 68v44" stroke="#fff" stroke-width="6"/>
    <rect x="17" y="96" width="66" height="9" rx="3" fill="${TINTA}"/>
    <rect x="43" y="95" width="14" height="11" rx="2" fill="#ffc933" stroke="${TINTA}" stroke-width="2.4"/>
    <g class="noel-braco-esq"><path d="M24 76q-14 10-12 26" fill="none" stroke="${TINTA}" stroke-width="13" stroke-linecap="round"/>
      <path d="M24 76q-14 10-12 26" fill="none" stroke="#e23b3b" stroke-width="8" stroke-linecap="round"/>
      <circle cx="12" cy="104" r="6" fill="#fff" ${linha()}/></g>
    <g class="noel-braco-dir"><path d="M76 76q14 10 12 26" fill="none" stroke="${TINTA}" stroke-width="13" stroke-linecap="round"/>
      <path d="M76 76q14 10 12 26" fill="none" stroke="#e23b3b" stroke-width="8" stroke-linecap="round"/>
      <circle cx="88" cy="104" r="6" fill="#fff" ${linha()}/></g>
    <circle cx="50" cy="40" r="25" fill="#ffd7b5" ${linha(3)}/>
    <path d="M24 44q-2 34 26 36q28-2 26-36q-6 8-14 6q-6 6-12 2q-6 4-12-2q-8 2-14-6z" fill="#fff" ${linha(3)}/>
    <path d="M38 52q12 -7 24 0q-6 6-12 2q-6 4-12-2z" fill="#fff" ${linha(2.4)}/>
    <ellipse cx="50" cy="56" rx="4" ry="2.4" fill="#e9707f"/>
    <circle cx="50" cy="45" r="5" fill="#ff9a8a" ${linha(2)}/>
    <g class="noel-olhos">
      <ellipse cx="40" cy="37" rx="4.4" ry="5.4" fill="${TINTA}"/><circle cx="41.6" cy="35" r="1.7" fill="#fff"/>
      <ellipse cx="60" cy="37" rx="4.4" ry="5.4" fill="${TINTA}"/><circle cx="61.6" cy="35" r="1.7" fill="#fff"/>
    </g>
    <ellipse cx="32" cy="47" rx="5" ry="3" fill="#ff8a9a" opacity=".7"/><ellipse cx="68" cy="47" rx="5" ry="3" fill="#ff8a9a" opacity=".7"/>
    <path d="M33 29q4-4 10-2M57 27q6-2 10 2" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
    <path d="M26 24q4-24 30-20q20 4 26 26q-6 2-6 8q-4-18-20-18q-18 0-30 4z" fill="#e23b3b" ${linha(3)}/>
    <circle cx="82" cy="36" r="6" fill="#fff" ${linha(2.6)}/>
    <rect x="22" y="18" width="56" height="10" rx="5" fill="#fff" ${linha(2.6)}/>
  </g>`;
}

// O saco, que enche de baixo para cima com --cheio (0 a 1, no CSS). Cabe em 0 0 80 90.
export function saco() {
  return `<path class="saco-pano" d="M14 86q-14-4-10-30q6-30 22-36h28q16 6 22 36q4 26-10 30z" fill="#b5713d" ${linha(3)}/>
    <path class="saco-presentes" d="M18 22l6-8 8 6 6-10 8 8 8-6 6 10" fill="none"/>
    <path d="M26 20q14 6 28 0" fill="none" stroke="#ffc933" stroke-width="4" stroke-linecap="round"/>
    <path d="M24 14q16-6 32 0l-2 6q-14 4-28 0z" fill="#9a5c2e" ${linha(2.4)}/>
    <path d="M22 50q4 10 0 22M58 44q-4 14 2 24" fill="none" stroke="#8f5527" stroke-width="2.4" stroke-linecap="round"/>`;
}

// A garça fofinha, de lado, olhando para a esquerda, com o bico na origem. Cabe em -6 -40 110 90.
export function garca() {
  return `<g class="garca-desenho">
    <path d="M44 46q10 22 4 34M58 46q12 20 20 28" fill="none" stroke="${TINTA}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M78 74l6 4M48 80l-2 6" stroke="${TINTA}" stroke-width="2.6" stroke-linecap="round"/>
    <g class="garca-asa-tras"><path d="M60 22q20-34 46-30q-12 10-12 22q-14 2-34 8z" fill="#e4ecf7" ${linha(2.6)}/></g>
    <path d="M30 30q-2-24 8-34q6-6 6-14" fill="none" stroke="${TINTA}" stroke-width="12" stroke-linecap="round"/>
    <path d="M30 30q-2-24 8-34q6-6 6-14" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
    <ellipse cx="54" cy="36" rx="28" ry="17" fill="#fff" ${linha(3)}/>
    <path d="M78 30q16-4 26 4q-12 2-22 10z" fill="#fff" ${linha(2.6)}/>
    <g class="garca-asa"><path d="M44 28q18-30 50-26q-10 10-10 22q-18 8-40 4z" fill="#fff" ${linha(2.6)}/>
      <path d="M62 14q8-2 16 0M58 22q10-2 20 0" fill="none" stroke="#c9d6ea" stroke-width="2.2" stroke-linecap="round"/></g>
    <circle cx="40" cy="-14" r="14" fill="#fff" ${linha(3)}/>
    <path d="M44 -28q8-10 18-4q-8 0-10 8" fill="#fff" ${linha(2.4)}/>
    <path d="M28 -18L0 -12 28 -9z" fill="#ffc933" ${linha(2.4)}/>
    <path d="M28 -13.5 6 -12" stroke="${TINTA}" stroke-width="1.6" stroke-linecap="round"/>
    <ellipse cx="36" cy="-17" rx="4" ry="4.8" fill="${TINTA}"/><circle cx="37.2" cy="-18.8" r="1.6" fill="#fff"/>
    <ellipse cx="42" cy="-8" rx="4.4" ry="2.6" fill="#ff8a9a" opacity=".75"/>
  </g>`;
}

// O trenó de lado, com o Papai Noel e o saco, para a entrega. Cabe em 0 0 120 60.
export function trenoDeEntrega() {
  return `<path d="M8 50h88q14 0 18-12" fill="none" stroke="${TINTA}" stroke-width="5" stroke-linecap="round"/>
    <path d="M8 50h88q14 0 18-12" fill="none" stroke="#ffc933" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M30 50v-8M80 50v-8" stroke="${TINTA}" stroke-width="3"/>
    <g transform="translate(2 -2) scale(.5)">${saco()}</g>
    <circle cx="66" cy="12" r="10" fill="#ffd7b5" ${linha(2.4)}/>
    <path d="M56 14q-2 14 10 15q12-1 10-15q-3 3-6 2q-4 3-8 0q-3 1-6-2z" fill="#fff" ${linha(2)}/>
    <ellipse cx="62" cy="10" rx="1.8" ry="2.2" fill="${TINTA}"/><ellipse cx="70" cy="10" rx="1.8" ry="2.2" fill="${TINTA}"/>
    <circle cx="66" cy="15" r="2.2" fill="#ff9a8a"/>
    <path d="M55 6q2-12 14-10q10 2 10 12q-10-6-24-2z" fill="#e23b3b" ${linha(2.2)}/>
    <circle cx="79" cy="8" r="3" fill="#fff" ${linha(1.8)}/>
    <path d="M10 42q0-16 14-16h70q10 0 12 16z" fill="#e23b3b" ${linha(3)}/>
    <path d="M22 34h76" stroke="#ffc933" stroke-width="3" stroke-linecap="round"/>`;
}

// Uma casinha da cidade, com a base em y = 0 e a chaminé à esquerda. Cabe em -30 -70 60 70.
export function casinha(parede: string, telhado: string) {
  return `<rect class="chamine" x="-20" y="-62" width="9" height="16" fill="#b94a3a" ${linha(2.2)}/>
    <rect x="-22" y="-64" width="13" height="5" rx="1" fill="#fff" ${linha(2)}/>
    <rect x="-24" y="-34" width="48" height="34" fill="${parede}" ${linha(2.4)}/>
    <path d="M-30 -32 0 -58 30 -32q-2 4-6 2l-24-20-24 20q-4 2-6-2z" fill="${telhado}" ${linha(2.4)}/>
    <path d="M-26 -34q8-6 13 0q6-6 13 0q6-6 13 0q6-6 13 0" fill="#fff" ${linha(1.6)}/>
    <rect class="janela" x="-18" y="-26" width="12" height="11" rx="1.5" ${linha(2)}/>
    <path d="M-12 -26v11M-18 -20.5h12" stroke="${TINTA}" stroke-width="1.6"/>
    <rect x="4" y="-22" width="12" height="22" rx="5" fill="#8a4b2a" ${linha(2.2)}/>
    <circle cx="13" cy="-10" r="1.3" fill="#ffc933"/>`;
}
