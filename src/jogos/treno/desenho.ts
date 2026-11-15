// Desenhos do Trenó de Natal, em SVG e nas unidades da cena (100 de altura). Só montam texto,
// sem DOM: a capa do jogo também é feita com eles.
import type { TrenoId } from "./oficina";

const TINTA = "#2b2140";

// Cada rena tem seu jeito: pelagem, enfeite e cor do enfeite.
type Jeito = { pelo: string; barriga: string; nariz: string; enfeite: "cachecol" | "gorro" | "laco" | "sinos" | "estrela"; cor: string };

export const JEITOS: Jeito[] = [
  { pelo: "#a0673a", barriga: "#e9c9a0", nariz: "#3a2418", enfeite: "cachecol", cor: "#e23b3b" },
  { pelo: "#c98f55", barriga: "#f3dcb8", nariz: "#4a2c1a", enfeite: "gorro", cor: "#e23b3b" },
  { pelo: "#7a4b2a", barriga: "#d9b48a", nariz: "#2b1a10", enfeite: "laco", cor: "#2f7bff" },
  { pelo: "#9a96a8", barriga: "#e6e3ee", nariz: "#3a3350", enfeite: "cachecol", cor: "#18b67e" },
  { pelo: "#efe7da", barriga: "#ffffff", nariz: "#d9878f", enfeite: "sinos", cor: "#ffc933" },
  { pelo: "#d9a441", barriga: "#f7e2b0", nariz: "#5a3a12", enfeite: "estrela", cor: "#ffc933" },
  { pelo: "#8b5a3c", barriga: "#e2bf98", nariz: "#2b1a10", enfeite: "gorro", cor: "#18b67e" },
  { pelo: "#b97a4a", barriga: "#f0d3ad", nariz: "#3a2418", enfeite: "laco", cor: "#ff8ac2" },
];

const ESCALA_DA_RENA = 0.4;

function enfeite({ enfeite: tipo, cor }: Jeito) {
  switch (tipo) {
    case "cachecol":
      return `<path d="M5 -4.2Q8 -2.6 11 -5.8" fill="none" stroke="${TINTA}" stroke-width="3.6" stroke-linecap="round"/>
        <path d="M5 -4.2Q8 -2.6 11 -5.8" fill="none" stroke="${cor}" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M6.6 -3.6 5.6 0.6" stroke="${TINTA}" stroke-width="3" stroke-linecap="round"/>
        <path d="M6.6 -3.6 5.6 0.6" stroke="${cor}" stroke-width="1.7" stroke-linecap="round"/>`;
    case "gorro":
      return `<path d="M7.4 -11.4Q8.6 -17.6 4.6 -17.4Q10 -16.2 13.4 -11.6Z" fill="${cor}" stroke="${TINTA}" stroke-width="1" stroke-linejoin="round"/>
        <rect x="6.8" y="-12.6" width="7.2" height="2.2" rx="1.1" fill="#fff" stroke="${TINTA}" stroke-width=".8"/>
        <circle cx="4.6" cy="-17.4" r="1.5" fill="#fff" stroke="${TINTA}" stroke-width=".8"/>`;
    case "laco":
      return `<path d="M7.5 -4 4.5 -6.2V-1.8ZM7.5 -4 10.5 -6.2V-1.8Z" fill="${cor}" stroke="${TINTA}" stroke-width=".8" stroke-linejoin="round"/>
        <circle cx="7.5" cy="-4" r="1" fill="${cor}" stroke="${TINTA}" stroke-width=".8"/>`;
    case "sinos":
      return `<path d="M5 -4.4Q8 -2.8 11 -6" fill="none" stroke="#c0392b" stroke-width="1.6"/>
        ${[6, 8, 10].map((x, i) => `<circle cx="${x}" cy="${-3.4 - i * 0.7}" r="1.1" fill="${cor}" stroke="${TINTA}" stroke-width=".6"/>`).join("")}`;
    case "estrela":
      return `<path d="M5 -4.4Q8 -2.8 11 -6" fill="none" stroke="#c0392b" stroke-width="1.6"/>
        <path d="M13.5 -18.5l.8 1.7 1.8.2-1.4 1.2.4 1.8-1.6-.9-1.6.9.4-1.8-1.4-1.2 1.8-.2z" fill="${cor}" stroke="${TINTA}" stroke-width=".6" stroke-linejoin="round"/>`;
  }
}

// A rena de lado, olhando para a frente, com o centro do corpo na origem.
export function desenharRena(jeito: number, tamanho = 1) {
  const j = JEITOS[jeito % JEITOS.length];
  const contorno = `stroke="${TINTA}" stroke-width="1" stroke-linejoin="round"`;
  const perna = (d: string, cor: string) =>
    `<path d="${d}" stroke="${TINTA}" stroke-width="3.2" stroke-linecap="round"/><path d="${d}" stroke="${cor}" stroke-width="1.8" stroke-linecap="round"/>`;
  return `<g transform="scale(${(ESCALA_DA_RENA * tamanho).toFixed(3)})">
    <g class="pernas">
      ${perna("M-5 2 -10.5 5.5", j.pelo)}${perna("M4.5 2 10 5", j.pelo)}
    </g>
    <path d="M-12.8 -4.8Q-10.6 -0.2 -8 -2.4" fill="#fff" ${contorno}/>
    <ellipse cx="0" cy="0" rx="9" ry="5" fill="${j.pelo}" ${contorno}/>
    <ellipse cx="1" cy="2.3" rx="6" ry="2.1" fill="${j.barriga}"/>
    <g class="pernas">
      ${perna("M-6.5 2.5 -9 7.5", j.pelo)}${perna("M6 2.5 7.6 7.6", j.pelo)}
    </g>
    <path d="M3.6 -3.4 7.6 -10 11.6 -7.8 8.4 -0.6Z" fill="${j.pelo}" ${contorno}/>
    <path d="M9.2 -12Q8.2 -16 5.8 -18.2M8.6 -15.2Q6.4 -15.6 5 -17.4M10.8 -12Q12.2 -16 14.4 -17.6M11.9 -14.8Q13.8 -14.2 15.2 -15.2" fill="none" stroke="${TINTA}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M9.2 -12Q8.2 -16 5.8 -18.2M8.6 -15.2Q6.4 -15.6 5 -17.4M10.8 -12Q12.2 -16 14.4 -17.6M11.9 -14.8Q13.8 -14.2 15.2 -15.2" fill="none" stroke="#e8c690" stroke-width="1.2" stroke-linecap="round"/>
    <ellipse cx="7.4" cy="-11" rx="2" ry="1" transform="rotate(-28 7.4 -11)" fill="${j.pelo}" ${contorno}/>
    <ellipse cx="10.2" cy="-9" rx="3.6" ry="3.1" fill="${j.pelo}" ${contorno}/>
    <ellipse cx="13.4" cy="-8" rx="2.5" ry="1.9" fill="${j.barriga}" ${contorno}/>
    <ellipse cx="15.6" cy="-8.5" rx="1.15" ry=".95" fill="${j.nariz}"/>
    <circle cx="10.9" cy="-10" r=".95" fill="${TINTA}"/><circle cx="11.2" cy="-10.3" r=".32" fill="#fff"/>
    <ellipse cx="11.2" cy="-7.6" rx=".9" ry=".5" fill="#ff8a9a" opacity=".7"/>
    ${enfeite(j)}
  </g>`;
}

// O sino com o número, pendurado no peito da rena. É o que a criança lê: grande e claro.
export function desenharSino(valor: number | null, tamanho = 1) {
  const texto = valor === null ? "?" : String(valor);
  const fonte = texto.length >= 3 ? 3.1 : 3.9;
  const vazio = valor === null;
  return `<g class="sino${vazio ? " sino-vazio" : ""}" transform="translate(${(3 * tamanho).toFixed(2)} ${(2 * tamanho).toFixed(2)}) scale(1.1)">
    <path d="M-3.5 2.3Q-3.6 -3.6 0 -3.8Q3.6 -3.6 3.5 2.3L4.4 3.4H-4.4Z" fill="${vazio ? "#fff" : "#ffc933"}" stroke="${TINTA}" stroke-width=".55" stroke-linejoin="round" ${vazio ? 'stroke-dasharray="1 .7"' : ""}/>
    <circle cx="0" cy="3.9" r=".8" fill="${vazio ? "#fff" : "#e09a1a"}" stroke="${TINTA}" stroke-width=".45"/>
    <text x="0" y="${(0.3 + fonte * 0.36).toFixed(2)}" font-size="${fonte}" class="sino-numero">${texto}</text>
  </g>`;
}

const PELE = ["#ffd7b5", "#e8b48a", "#c68642", "#8d5524"];

function papaiNoel() {
  return `<g class="noel">
    <path d="M-7.6 -1.2Q-7.6 -6.4 -4.4 -6.4Q-1.4 -6.4 -1.2 -1.2Z" fill="#e23b3b" stroke="${TINTA}" stroke-width=".55" stroke-linejoin="round"/>
    <path d="M-4.4 -6.2V-1.2" stroke="#fff" stroke-width="1.1"/>
    <path d="M-2.6 -4.2Q-0.4 -3.6 1 -2.6" fill="none" stroke="${TINTA}" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M-2.6 -4.2Q-0.4 -3.6 1 -2.6" fill="none" stroke="#e23b3b" stroke-width=".9" stroke-linecap="round"/>
    <circle cx="1.1" cy="-2.6" r=".75" fill="#fff" stroke="${TINTA}" stroke-width=".4"/>
    <circle cx="-4.1" cy="-8.6" r="2.3" fill="${PELE[0]}" stroke="${TINTA}" stroke-width=".55"/>
    <path d="M-6.2 -8.2Q-6.6 -4.4 -3.8 -4.6Q-1.4 -4.8 -1.9 -8.2Q-3 -7.3 -4.1 -7.6Q-5.2 -7.3 -6.2 -8.2Z" fill="#fff" stroke="${TINTA}" stroke-width=".5" stroke-linejoin="round"/>
    <circle cx="-3.1" cy="-8.1" r=".55" fill="#ff8a9a"/>
    <circle cx="-3.3" cy="-9.3" r=".38" fill="${TINTA}"/>
    <path d="M-6.6 -9.9Q-5.6 -14.2 -9.2 -13.4Q-6 -12.6 -6.4 -10.6Z" fill="#e23b3b" stroke="${TINTA}" stroke-width=".5" stroke-linejoin="round"/>
    <path d="M-6.6 -9.9Q-4.6 -14 -2 -10.2Z" fill="#e23b3b" stroke="${TINTA}" stroke-width=".5" stroke-linejoin="round"/>
    <rect x="-6.9" y="-11" width="5.4" height="1.5" rx=".75" fill="#fff" stroke="${TINTA}" stroke-width=".45"/>
    <circle cx="-9.2" cy="-13.4" r=".9" fill="#fff" stroke="${TINTA}" stroke-width=".45"/>
  </g>`;
}

// O saco de presentes cresce com a melhoria.
function saco(nivel: number) {
  const s = 1 + nivel * 0.12;
  return `<g transform="translate(-10 -1.4) scale(${s.toFixed(2)})">
    <rect x="-2.4" y="-6.6" width="2.4" height="2.4" fill="#18b67e" stroke="${TINTA}" stroke-width=".4" transform="rotate(-12 -1.2 -5.4)"/>
    <rect x=".2" y="-7.2" width="2.2" height="2.6" fill="#2f7bff" stroke="${TINTA}" stroke-width=".4" transform="rotate(10 1.3 -5.9)"/>
    <path d="M-3.6 0Q-4.4 -5.6 -1.6 -5.4Q0 -4.6 1.6 -5.4Q4.2 -5.6 3.4 0Q0 1.2 -3.6 0Z" fill="#b5713d" stroke="${TINTA}" stroke-width=".55" stroke-linejoin="round"/>
    <path d="M-1.8 -4.6Q0 -3.8 1.6 -4.6" fill="none" stroke="#ffc933" stroke-width=".7"/>
  </g>`;
}

// O trenó de lado, com a frente na origem e a altura do time no zero.
export function desenharTreno(modelo: TrenoId, cor: string, nivelDoSaco = 0) {
  const linha = `stroke="${TINTA}" stroke-width=".6" stroke-linejoin="round"`;
  let corpo = "";
  let esqui = `<path d="M-14 4.6H-0.5Q2.2 4.6 2.2 2.6Q2.2 1.2 .8 1.4" fill="none" stroke="${TINTA}" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M-14 4.6H-0.5Q2.2 4.6 2.2 2.6Q2.2 1.2 .8 1.4" fill="none" stroke="#ffc933" stroke-width=".6" stroke-linecap="round"/>
    <path d="M-11 2.6V4.6M-4 2.6V4.6" stroke="${TINTA}" stroke-width=".8"/>`;
  let fogo = "";
  if (modelo === "madeira") {
    corpo = `<path d="M-14 -2H-1Q.6 -2 .6 0V2.8H-14Z" fill="${cor}" ${linha}/>
      <path d="M-14 0.4H.6M-9.6 -2V2.8M-5.2 -2V2.8" stroke="${TINTA}" stroke-width=".35" opacity=".5"/>`;
    esqui = `<path d="M-14 4.6H-.5Q2 4.6 2 2.8" fill="none" stroke="${TINTA}" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M-14 4.6H-.5Q2 4.6 2 2.8" fill="none" stroke="#8a5a32" stroke-width=".6" stroke-linecap="round"/>
      <path d="M-11 2.8V4.6M-4 2.8V4.6" stroke="${TINTA}" stroke-width=".8"/>`;
  }
  if (modelo === "classico" || modelo === "dourado") {
    corpo = `<path d="M-14.6 -3.4Q-13.4 -1.6 -12 -2H-2Q1.2 -2 1.6 -4.6Q2 -6.8 3.6 -6Q4.6 -5.2 3.4 -4.4" fill="${cor}" ${linha}/>
      <path d="M-14.6 -3.4Q-15 1 -12.6 2.8H-1Q1.8 2.8 1.6 -4.6" fill="${cor}" ${linha}/>
      <path d="M-13 0.8H0" stroke="#ffc933" stroke-width=".7"/>
      <circle cx="-8.6" cy="0.8" r=".9" fill="#ffc933" stroke="${TINTA}" stroke-width=".35"/>`;
    if (modelo === "dourado") {
      corpo += `<circle cx="-12" cy="0.8" r=".7" fill="#ff5a5f" stroke="${TINTA}" stroke-width=".3"/>
        <circle cx="-5.2" cy="0.8" r=".7" fill="#2f7bff" stroke="${TINTA}" stroke-width=".3"/>
        <path class="brilho" d="M-1.6 -0.6l.4 1 1 .4-1 .4-.4 1-.4-1-1-.4 1-.4z" fill="#fff"/>`;
    }
  }
  if (modelo === "foguete") {
    fogo = `<g class="fogo"><path d="M-15 -1.2Q-21 0.4 -15 2" fill="#ff8a3d"/><path d="M-15 -.4Q-18.4 .4 -15 1.2" fill="#ffe27a"/></g>`;
    corpo = `<path d="M-15 -2.2H-1.6Q2.6 -2.2 2.6 .4Q2.6 3 -1.6 3H-15Z" fill="${cor}" ${linha}/>
      <path d="M-15 -2.2-17 -4.6H-13.4L-11.8 -2.2ZM-15 3-17 5.2H-13.4L-11.8 3Z" fill="#ff5a5f" ${linha}/>
      <circle cx="-1" cy=".4" r="1.3" fill="#bfe9ff" stroke="${TINTA}" stroke-width=".45"/>
      <path d="M-15 .4H-3" stroke="#fff" stroke-width=".7" opacity=".7"/>`;
  }
  return `${fogo}${saco(nivelDoSaco)}${papaiNoel()}${esqui}${corpo}`;
}

// Casa vista de frente, nas coordenadas do mundo. Quem ganha presente acende a janela, e a
// criança da casa sai pulando na neve, ao lado da porta.
const PAREDES = ["#f4d6a0", "#c9e4f2", "#f6c1c9", "#d8f0c4", "#e9d8ff", "#ffe7a8"];
const TELHADOS = ["#c0392b", "#2e6fb8", "#7a4b2a", "#2e8b57", "#8e44ad", "#d35400"];
const LUZES = ["#ff5a5f", "#ffc933", "#18b67e", "#2f7bff"];

type CasaParaDesenhar = { x: number; largura: number; parede: number; chamine: number; topoDaChamine: number; jeito: number };

export function desenharCasa(casa: CasaParaDesenhar, chao: number) {
  const { x, largura, parede, chamine, topoDaChamine, jeito } = casa;
  const meio = x + largura / 2;
  const cumeeira = parede - largura * 0.36;
  const linha = `stroke="${TINTA}" stroke-width=".6" stroke-linejoin="round"`;
  // Onde a chaminé encontra o telhado, para ela não flutuar.
  const lado = chamine < meio ? -1 : 1;
  const borda = lado < 0 ? x - 1.5 : x + largura + 1.5;
  const baseDaChamine = parede - ((parede - cumeeira) * Math.abs(borda - chamine)) / Math.abs(borda - meio) + 1;
  const luzes =
    jeito % 2 === 0
      ? Array.from({ length: Math.floor(largura / 3) }, (_, i) => {
          const lx = x + 1.5 + i * 3;
          return `<circle cx="${lx.toFixed(1)}" cy="${(parede + 0.9).toFixed(1)}" r=".7" fill="${LUZES[i % LUZES.length]}" class="pisca" style="animation-delay:${(i % 4) * 0.3}s"/>`;
        }).join("")
      : "";
  const janela = { x: meio - 4, y: parede + 3, l: 8, a: 6.5 };
  const porta = jeito % 3 === 1 ? x + largura - 7 : x + 2.5;
  const janelaLado = porta < meio ? x + largura - 6.5 : x + 2;
  const crianca = porta < meio ? porta + 8 : porta - 3.4;
  return `<rect x="${chamine - 3}" y="${topoDaChamine}" width="6" height="${(baseDaChamine - topoDaChamine).toFixed(1)}" fill="#b5523b" ${linha}/>
    <path d="M${chamine - 3} ${topoDaChamine + 2.6}h6M${chamine} ${topoDaChamine + 2.6}v2.6" stroke="${TINTA}" stroke-width=".3" opacity=".5"/>
    <rect x="${chamine - 3.6}" y="${topoDaChamine - 1.4}" width="7.2" height="2" rx="1" fill="#fff" ${linha}/>
    <rect x="${x}" y="${parede}" width="${largura}" height="${chao - parede}" fill="${PAREDES[jeito % PAREDES.length]}" ${linha}/>
    <path d="M${x - 1.5} ${parede + 0.4}L${meio} ${cumeeira.toFixed(1)}L${x + largura + 1.5} ${parede + 0.4}Z" fill="${TELHADOS[jeito % TELHADOS.length]}" ${linha}/>
    <path d="M${x - 1.5} ${parede + 0.4}L${meio} ${cumeeira.toFixed(1)}L${x + largura + 1.5} ${parede + 0.4}L${x + largura - 1} ${parede - 1}Q${meio} ${(cumeeira + 3).toFixed(1)} ${x + 1} ${parede - 1}Z" fill="#fff" ${linha}/>
    ${luzes}
    <g class="janela-casa">
      <rect x="${janela.x}" y="${janela.y}" width="${janela.l}" height="${janela.a}" rx=".6" class="vidro" ${linha}/>
      <path d="M${meio} ${janela.y}v${janela.a}M${janela.x} ${janela.y + janela.a / 2}h${janela.l}" stroke="${TINTA}" stroke-width=".5" class="caixilho"/>
    </g>
    <rect x="${janelaLado}" y="${parede + 4}" width="4.5" height="4.5" rx=".5" fill="#334a7d" ${linha}/>
    <rect x="${porta}" y="${chao - 8}" width="4.6" height="8" rx="1.4" fill="${TELHADOS[(jeito + 2) % TELHADOS.length]}" ${linha}/>
    <circle cx="${porta + 2.3}" cy="${chao - 5.6}" r="1.5" fill="none" stroke="#18b67e" stroke-width=".9"/>
    <g class="crianca" transform="translate(${crianca} ${chao + 0.4})"></g>`;
}

// A criança que ganhou o presente: pequena, de olhos fechados de alegria, segurando a caixa
// acima da cabeça. A origem fica nos pés, e o jogo a faz pular (.pulando em jogo.css).
const CABELOS = ["#3a2418", "#f2c14e", "#7a4b2a", "#1c1424", "#c0582b"];
const PIJAMAS = ["#ff8ac2", "#7fc8ff", "#9be38a", "#ffd166", "#c9a6ff"];

// O que fica atrás da cabeça e o que fica na frente dela.
function cabelo(estilo: number, cor: string): [string, string] {
  const linha = `stroke="${TINTA}" stroke-width=".35" stroke-linejoin="round"`;
  const topo = `<path d="M-1.95 -5.9Q-2.1 -8.1 0 -8.1Q2.1 -8.1 1.95 -5.9Q1.2 -7 0 -6.9Q-1.2 -7 -1.95 -5.9Z" fill="${cor}" ${linha}/>`;
  switch (estilo % 4) {
    case 1:
      // Maria-chiquinha.
      return [`<circle cx="-2.3" cy="-6.6" r=".8" fill="${cor}" ${linha}/><circle cx="2.3" cy="-6.6" r=".8" fill="${cor}" ${linha}/>`, topo];
    case 2:
      // Cachinhos.
      return [`<g fill="${cor}" ${linha}>${[-1.5, -0.5, 0.5, 1.5].map((cx, i) => `<circle cx="${cx}" cy="${-7.5 + (i % 2) * 0.25}" r=".75"/>`).join("")}</g>`, topo];
    case 3:
      // Gorro de Natal.
      return [
        "",
        `<path d="M-1.9 -7.3Q-1.5 -9.5 .6 -9.3Q2.5 -9.1 3.1 -7.4Z" fill="#e23b3b" ${linha}/>
        <rect x="-2.1" y="-7.9" width="4.2" height=".95" rx=".47" fill="#fff" ${linha}/>
        <circle cx="3.2" cy="-7.4" r=".55" fill="#fff" ${linha}/>`,
      ];
    default:
      return ["", topo];
  }
}

export function desenharCrianca(jeito: number) {
  const pele = PELE[jeito % PELE.length];
  const roupa = PIJAMAS[(jeito >> 1) % PIJAMAS.length];
  const [atras, frente] = cabelo(jeito, CABELOS[jeito % CABELOS.length]);
  const contorno = `stroke="${TINTA}" stroke-width=".35" stroke-linejoin="round"`;
  const braco = (lado: number) =>
    `<path d="M${lado * 1.2} -3.7Q${lado * 2.4} -5.4 ${lado * 1.8} -8.4" fill="none" stroke="${TINTA}" stroke-width="1.15" stroke-linecap="round"/>
     <path d="M${lado * 1.2} -3.7Q${lado * 2.4} -5.4 ${lado * 1.8} -8.4" fill="none" stroke="${roupa}" stroke-width=".6" stroke-linecap="round"/>
     <circle cx="${lado * 1.8}" cy="-8.6" r=".55" fill="${pele}" ${contorno}/>`;
  return `<ellipse class="sombra-crianca" cx="0" cy="0" rx="1.8" ry=".4" fill="${TINTA}" opacity=".18"/>
    <g class="pulando" style="animation-delay:${((jeito % 3) * 0.08).toFixed(2)}s">
      <path d="M-.7 -1.8V-.4M.7 -1.8V-.4" stroke="${TINTA}" stroke-width="1" stroke-linecap="round"/>
      <path d="M-.7 -1.8V-.6M.7 -1.8V-.6" stroke="${roupa}" stroke-width=".5" stroke-linecap="round"/>
      <ellipse cx="-.8" cy="-.3" rx=".65" ry=".35" fill="${TINTA}"/><ellipse cx=".8" cy="-.3" rx=".65" ry=".35" fill="${TINTA}"/>
      <path d="M-1.6 -1.4Q-1.9 -4.4 0 -4.5Q1.9 -4.4 1.6 -1.4Z" fill="${roupa}" ${contorno}/>
      <circle cx="0" cy="-3.4" r=".22" fill="#fff"/><circle cx="0" cy="-2.4" r=".22" fill="#fff"/>
      ${braco(-1)}${braco(1)}
      <g transform="translate(0 -9.9) rotate(-6)">${desenharPresente(jeito, 0.75)}</g>
      ${atras}
      <circle cx="0" cy="-5.9" r="1.95" fill="${pele}" ${contorno}/>
      ${frente}
      <path d="M-1.15 -6Q-.8 -6.55 -.45 -6M.45 -6Q.8 -6.55 1.15 -6" fill="none" stroke="${TINTA}" stroke-width=".3" stroke-linecap="round"/>
      <circle cx="-1.25" cy="-5.3" r=".4" fill="#ff8a9a" opacity=".8"/><circle cx="1.25" cy="-5.3" r=".4" fill="#ff8a9a" opacity=".8"/>
      <path d="M-.6 -5.2Q0 -4.1 .6 -5.2Z" fill="#8a2a3c" stroke="${TINTA}" stroke-width=".22" stroke-linejoin="round"/>
    </g>`;
}

const CORES_DOS_PRESENTES = [
  ["#ff5a5f", "#ffc933"],
  ["#2f7bff", "#fff"],
  ["#18b67e", "#ff5a5f"],
  ["#a45cff", "#ffc933"],
];

export function desenharPresente(jeito: number, escala = 1) {
  const [caixa, fita] = CORES_DOS_PRESENTES[jeito % CORES_DOS_PRESENTES.length];
  if (escala !== 1) return `<g transform="scale(${escala})">${desenharPresente(jeito)}</g>`;
  return `<rect x="-1.7" y="-1.7" width="3.4" height="3.4" rx=".4" fill="${caixa}" stroke="${TINTA}" stroke-width=".45"/>
    <path d="M0 -1.7V1.7M-1.7 0H1.7" stroke="${fita}" stroke-width=".8"/>
    <path d="M0 -1.7Q-1.4 -3 -1.6 -2Q-1.4 -1.6 0 -1.7Q1.4 -3 1.6 -2Q1.4 -1.6 0 -1.7" fill="${fita}" stroke="${TINTA}" stroke-width=".3"/>`;
}

export function desenharPinheiro(x: number, chao: number, altura: number) {
  const a = altura;
  const camada = (base: number, meia: number, topo: number) =>
    `<path d="M${(x - meia).toFixed(1)} ${base.toFixed(1)}L${x} ${topo.toFixed(1)}L${(x + meia).toFixed(1)} ${base.toFixed(1)}Z" fill="#2e8b57" stroke="${TINTA}" stroke-width=".5" stroke-linejoin="round"/>
     <path d="M${(x - meia * 0.45).toFixed(1)} ${(topo + (base - topo) * 0.45).toFixed(1)}L${x} ${topo.toFixed(1)}L${(x + meia * 0.45).toFixed(1)} ${(topo + (base - topo) * 0.45).toFixed(1)}Z" fill="#fff"/>`;
  return `<rect x="${x - 0.9}" y="${chao - 2.5}" width="1.8" height="2.5" fill="#7a4b2a"/>
    ${camada(chao - 2, a * 0.36, chao - a * 0.55)}${camada(chao - a * 0.4, a * 0.28, chao - a * 0.85)}${camada(chao - a * 0.68, a * 0.2, chao - a * 1.08)}
    <path d="M${x} ${chao - a * 1.08 - 1.6}l.5 1 1.1.1-.8.7.2 1.1-1-.5-1 .5.2-1.1-.8-.7 1.1-.1z" fill="#ffc933" stroke="${TINTA}" stroke-width=".3"/>`;
}

// Ícones da oficina, num quadrado de -12 a 12.
export const ICONES = {
  saco: `<path d="M-8 9Q-10 -4 -3 -4Q0 -2 3 -4Q10 -4 8 9Q0 11 -8 9Z" fill="#b5713d" stroke="${TINTA}" stroke-width="1.6" stroke-linejoin="round"/>
    <rect x="-5" y="-11" width="5" height="5" fill="#ff5a5f" stroke="${TINTA}" stroke-width="1.2"/>
    <rect x="1" y="-10" width="5" height="5" fill="#2f7bff" stroke="${TINTA}" stroke-width="1.2"/>
    <path d="M-4 -2Q0 0 4 -2" fill="none" stroke="#ffc933" stroke-width="1.6"/>`,
  renas: `<g transform="translate(-2 3) scale(2)">${desenharRena(1)}</g>`,
};
