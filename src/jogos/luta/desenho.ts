// Desenhos da Luta Épica, em SVG. Só montam texto, sem DOM: a página e a capa do jogo também
// usam estas funções. Os lutadores não têm ids, para vários morarem na mesma página.
import { itemDe, type Item } from "./loja";

const TINTA = "#2b2140";
const linha = (largura = 2.4) => `stroke="${TINTA}" stroke-width="${largura}" stroke-linejoin="round" stroke-linecap="round"`;

type Cabelo = "careca" | "curto" | "topete" | "espetado" | "moicano" | "rabo" | "coque" | "trancas" | "longo";

export type Jeito = {
  pele: string;
  cabelo: string;
  estilo: Cabelo;
  barba?: boolean;
  bigode?: boolean;
  testeira?: string;
  camisa: string;
  calcao: string;
  estampa?: string;
  luvas: string;
  brilho?: string;
  faixa?: string;
  // Tamanho do lutador: os brutamontes são maiores.
  porte: number;
};

const PELES = { clara: "#ffe0c4", media: "#f1c08f", morena: "#c68642", escura: "#8d5524", retinta: "#5f3a1d" };

// Os adversários, na ordem dos jeitos de logica.ts.
export const JEITOS: Jeito[] = [
  { pele: PELES.media, cabelo: "#e0662a", estilo: "moicano", camisa: "#ff9a2e", calcao: "#3a3350", estampa: "#ff9a2e", luvas: "#ff9a2e", porte: 1 },
  { pele: PELES.clara, cabelo: "#c0392b", estilo: "rabo", camisa: "#e23b3b", calcao: "#e23b3b", luvas: "#ffffff", porte: 0.95 },
  { pele: PELES.escura, cabelo: "#1d1410", estilo: "careca", barba: true, camisa: "#3a3350", calcao: "#18b67e", luvas: "#18b67e", porte: 1.14 },
  { pele: PELES.morena, cabelo: "#2b1a10", estilo: "coque", camisa: "#a45cff", calcao: "#3a3350", luvas: "#a45cff", porte: 1.1 },
  { pele: PELES.clara, cabelo: "#f2c94c", estilo: "espetado", camisa: "#ffc933", calcao: "#2f7bff", luvas: "#ffc933", porte: 0.9 },
  { pele: PELES.retinta, cabelo: "#1d1410", estilo: "trancas", camisa: "#18b67e", calcao: "#ffc933", luvas: "#ffc933", porte: 0.9 },
  { pele: PELES.media, cabelo: "#5a3418", estilo: "curto", barba: true, camisa: "#7a8699", calcao: "#3a3350", luvas: "#7a8699", porte: 1.14 },
  { pele: PELES.retinta, cabelo: "#1d1410", estilo: "curto", camisa: "#e0662a", calcao: "#1d2f66", luvas: "#e0662a", porte: 1.08 },
  { pele: PELES.clara, cabelo: "#d9d9e0", estilo: "coque", bigode: true, testeira: "#e23b3b", camisa: "#ffffff", calcao: "#ffffff", luvas: "#e23b3b", porte: 0.95 },
  { pele: PELES.media, cabelo: "#1d1410", estilo: "rabo", testeira: "#ff6fae", camisa: "#2b2140", calcao: "#2b2140", luvas: "#ff6fae", porte: 0.92 },
  { pele: PELES.morena, cabelo: "#2b1a10", estilo: "longo", barba: true, camisa: "#ffc933", calcao: "#e23b3b", estampa: "#ffc933", luvas: "#ffc933", brilho: "#fff3b0", porte: 1.2 },
];

// O lutador da criança, que veste o que ela comprou no vestiário.
export function jeitoDaCrianca(vestiario: { luvas: string; roupa: string; faixa: string }): Jeito {
  const roupa = itemDe("roupa", vestiario.roupa);
  const luvas = itemDe("luvas", vestiario.luvas);
  return {
    pele: PELES.media,
    cabelo: "#5a3418",
    estilo: "topete",
    camisa: roupa.cor,
    calcao: roupa.cor,
    estampa: roupa.cor2,
    luvas: luvas.cor,
    brilho: luvas.cor2,
    faixa: itemDe("faixa", vestiario.faixa).cor,
    porte: 1,
  };
}

// Cabelo atrás da cabeça, desenhado antes dela. Cabeça em (3, -76), raio 16.
function cabeloAtras(j: Jeito) {
  const c = j.cabelo;
  switch (j.estilo) {
    case "rabo":
      return `<path d="M-10 -84q-14 2-16 14q-1 10 4 16q0-10 6-14q4-4 8-6z" fill="${c}" ${linha(2)}/>`;
    case "coque":
      return `<circle cx="-8" cy="-92" r="7" fill="${c}" ${linha(2)}/>`;
    case "trancas":
      return `<path d="M-10 -78q-6 10-4 24M-6 -74q-4 10-1 22" fill="none" stroke="${TINTA}" stroke-width="7" stroke-linecap="round"/>
        <path d="M-10 -78q-6 10-4 24M-6 -74q-4 10-1 22" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" stroke-dasharray="3 1.6"/>`;
    case "longo":
      return `<path d="M-12 -86q-6 14-4 34q8 4 14 0q-2-14 2-28z" fill="${c}" ${linha(2)}/>`;
    default:
      return "";
  }
}

// Cabelo por cima da cabeça.
function cabeloFrente(j: Jeito) {
  const c = j.cabelo;
  switch (j.estilo) {
    case "careca":
      return `<path d="M-4 -88q4-3 9-3" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>`;
    case "curto":
      return `<path d="M-12 -74q-2-17 14-18q15 0 17 12q-6-4-12-4q-8 0-12 6q-3 2-7 4z" fill="${c}" ${linha(2)}/>`;
    case "topete":
      return `<path d="M-12 -73q-3-16 10-19q4-8 14-6q-4 2-3 5q8 1 10 10q-7-4-14-3q-6 1-10 7q-3 3-7 6z" fill="${c}" ${linha(2)}/>`;
    case "espetado":
      return `<path d="M-12 -72l-4-12 7 2-1-12 8 7 3-11 6 9 6-8v11l8-3-4 9q-8-5-16-3q-6 2-9 8z" fill="${c}" ${linha(2)}/>`;
    case "moicano":
      return `<path d="M-6 -88q2-12 8-14l2 6 4-7 3 8 5-5-1 9q-10-1-21 3z" fill="${c}" ${linha(2)}/>
        <path d="M-10 -80q2-6 8-8" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" opacity=".5"/>`;
    case "rabo":
    case "coque":
      return `<path d="M-12 -73q-3-17 13-19q16-1 18 13q-8-6-17-4q-8 2-14 10z" fill="${c}" ${linha(2)}/>`;
    case "trancas":
      return `<path d="M-12 -72q-3-18 13-20q16-1 18 13q-6-3-10-3l-2-5-3 5q-7 0-16 10z" fill="${c}" ${linha(2)}/>`;
    case "longo":
      return `<path d="M-13 -70q-4-20 14-22q17-1 19 14q-9-6-18-4q-8 2-15 12z" fill="${c}" ${linha(2)}/>`;
  }
}

function cabeca(j: Jeito) {
  const barba = j.barba
    ? `<path d="M-6 -70q2 12 12 13q10 0 12-10q-4 3-8 2q-4 4-10 0q-4 0-6-5z" fill="${j.cabelo}" ${linha(2)}/>`
    : "";
  const bigode = j.bigode ? `<path d="M8 -70q4-3 6 0q2-3 6 0q-3 4-6 1q-3 3-6-1z" fill="${j.cabelo}" ${linha(1.4)}/>` : "";
  const testeira = j.testeira
    ? `<path d="M-13 -82q16-6 32-2l-1 5q-15-4-31 2z" fill="${j.testeira}" ${linha(1.6)}/>
       <path d="M-12 -80q-8 0-11 6M-12 -79q-6 4-6 10" fill="none" stroke="${j.testeira}" stroke-width="3" stroke-linecap="round"/>`
    : "";
  return `${cabeloAtras(j)}
    <circle cx="3" cy="-76" r="16" fill="${j.pele}" ${linha(2.6)}/>
    <ellipse cx="-5" cy="-75" rx="3.4" ry="4.4" fill="${j.pele}" ${linha(2)}/>
    ${barba}
    <path d="M5 -84l6 1.6M14 -83.4l5 -1.4" stroke="${TINTA}" stroke-width="2.2" stroke-linecap="round"/>
    <ellipse cx="9" cy="-78" rx="2.3" ry="3" fill="${TINTA}"/><circle cx="9.8" cy="-79.2" r=".9" fill="#fff"/>
    <ellipse cx="16" cy="-78" rx="2" ry="2.8" fill="${TINTA}"/><circle cx="16.7" cy="-79.2" r=".8" fill="#fff"/>
    <ellipse cx="6" cy="-71.5" rx="3" ry="1.8" fill="#ff8a9a" opacity=".7"/>
    <path d="M18 -75q2 2 0 3" fill="none" stroke="${TINTA}" stroke-width="1.6" stroke-linecap="round"/>
    <path class="boca" d="M10 -68q4 3 8 0" fill="none" stroke="${TINTA}" stroke-width="2" stroke-linecap="round"/>
    ${bigode}${cabeloFrente(j)}${testeira}`;
}

// Um braço do ombro à luva, passando pelo cotovelo.
function braco(j: Jeito, d: string, luva: [number, number], raio: number) {
  const [x, y] = luva;
  const brilho = j.brilho ? `<path d="M${x - raio * 0.45} ${y - raio * 0.4}q${raio * 0.4} -${raio * 0.4} ${raio * 0.8} 0" fill="none" stroke="${j.brilho}" stroke-width="1.8" stroke-linecap="round"/>` : "";
  return `<path d="${d}" fill="none" stroke="${TINTA}" stroke-width="9.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="${j.pele}" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${x}" cy="${y}" r="${raio}" fill="${j.luvas}" ${linha(2.4)}/>
    <path d="M${x - raio * 0.9} ${y + raio * 0.35}q${raio * 0.9} ${raio * 0.7} ${raio * 1.6} -${raio * 0.1}" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/>
    ${brilho}`;
}

// Cada braço tem quadros: guarda, soco esticado, defesa e para cima (levantando peso). O CSS
// mostra um de cada vez, como num desenho animado.
function bracos(j: Jeito, qual: "tras" | "frente") {
  const tras = qual === "tras";
  const quadros = tras
    ? {
        guarda: braco(j, "M-3 -58q3 10 10 9q6-2 8-14", [15, -66], 7.5),
        soco: braco(j, "M-3 -58q12 2 28 -2q8 -2 12 -4", [40, -66], 8),
        defesa: braco(j, "M-3 -58q4 10 11 6q4-4 7-18", [16, -78], 8),
        cima: braco(j, "M-3 -58q-4-12-2-24q1-8 2-14", [-2, -98], 7.5),
      }
    : {
        guarda: braco(j, "M7 -57q4 10 12 8q6-2 7-12", [25, -63], 8.5),
        soco: braco(j, "M7 -57q14 4 30 0q8-2 11-4", [50, -63], 9),
        defesa: braco(j, "M7 -57q6 10 13 5q4-4 5-18", [24, -74], 9),
        cima: braco(j, "M7 -57q4-12 4-24q0-8 1-14", [12, -98], 8.5),
      };
  return `<g class="braco-${qual}">${Object.entries(quadros)
    .map(([nome, desenho]) => `<g class="quadro quadro-${nome}">${desenho}</g>`)
    .join("")}</g>`;
}

function perna(j: Jeito, d: string, pe: [number, number], classe: string) {
  const [x, y] = pe;
  return `<g class="${classe}">
    <path d="${d}" fill="none" stroke="${TINTA}" stroke-width="12" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="${j.pele}" stroke-width="7.6" stroke-linecap="round"/>
    <ellipse cx="${x}" cy="${y}" rx="6.6" ry="3.4" fill="${j.pele}" ${linha(2.2)}/>
  </g>`;
}

function estampa(j: Jeito) {
  if (!j.estampa || j.estampa === j.calcao) return "";
  if (j.calcao === "#1d2f66")
    return `<path d="M-8 -36l1 2 2 .3-1.5 1.4.4 2-1.9-1-1.9 1 .4-2-1.5-1.4 2-.3zM6 -33l1 2 2 .3-1.5 1.4.4 2-1.9-1-1.9 1 .4-2-1.5-1.4 2-.3z" fill="${j.estampa}"/>`;
  if (j.calcao === "#a45cff") return `<path d="M2 -40l-6 7h5l-4 8 9-10h-5l4-5z" fill="${j.estampa}" ${linha(1)}/>`;
  return `<path d="M-10 -40l3 5M-3 -40l2 6M5 -40l1 5M11 -39l-2 5" stroke="${j.estampa}" stroke-width="2.6" stroke-linecap="round"/>`;
}

// O lutador de lado, virado para a direita, com os pés na origem. Cabe em -30 -110 85 112.
export function lutador(j: Jeito) {
  const faixa = j.faixa
    ? `<rect x="-15" y="-44" width="30" height="5.6" rx="1.4" fill="${j.faixa}" ${linha(1.8)}/>
       <path d="M6 -42l-3 9M8 -42l4 8" stroke="${TINTA}" stroke-width="5" stroke-linecap="round"/>
       <path d="M6 -42l-3 9M8 -42l4 8" stroke="${j.faixa}" stroke-width="2.6" stroke-linecap="round"/>
       <circle cx="7" cy="-41.4" r="2.8" fill="${j.faixa}" ${linha(1.6)}/>`
    : "";
  return `<g class="lutador-porte" transform="scale(${j.porte})"><g class="lutador-corpo">
    <ellipse class="sombra" cx="0" cy="0" rx="22" ry="4" fill="${TINTA}" opacity=".25"/>
    ${bracos(j, "tras")}
    ${perna(j, "M-6 -30q-4 12-10 26", [-15, -2], "perna-tras")}
    ${perna(j, "M6 -30q6 12 8 26", [16, -2], "perna-frente")}
    <path d="M-15 -42h30l1 14q-7 2-13 0l-2-5-2 5q-7 2-14 0z" fill="${j.calcao}" ${linha(2.4)}/>
    ${estampa(j)}
    <path d="M-12 -40q-3-16 4-22q6-3 12-3q8 0 11 4q4 6 0 21z" fill="${j.pele}" ${linha(2.6)}/>
    <path d="M-12 -40q-2-10 1-16l4-1q4 6 9 6q4 0 6-6l3 1q4 6 1 16z" fill="${j.camisa}" ${linha(2.2)}/>
    ${faixa}
    <g class="cabeca">${cabeca(j)}</g>
    ${bracos(j, "frente")}
    <g class="gelo-bloco"><rect x="-24" y="-100" width="52" height="102" rx="8" fill="#bfe8ff" fill-opacity=".62" stroke="#7cc7f2" stroke-width="2.4"/>
      <path d="M-16 -90l8 -6M-16 -80l14 -10M16 -30l6 -4" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></g>
    <g class="estrelinhas"><g class="giro">
      <path d="M-14 -96l2 4 4 .6-3 2.8.8 4.2-3.8-2-3.8 2 .8-4.2-3-2.8 4-.6z" fill="#ffc933" ${linha(1.2)}/>
      <path d="M18 -100l2 4 4 .6-3 2.8.8 4.2-3.8-2-3.8 2 .8-4.2-3-2.8 4-.6z" fill="#ffc933" ${linha(1.2)}/>
      <path d="M4 -106l1.6 3.2 3.2.5-2.4 2.2.6 3.4-3-1.6-3 1.6.6-3.4-2.4-2.2 3.2-.5z" fill="#fff" ${linha(1.2)}/>
    </g></g>
  </g></g>`;
}

// Só o rosto e o peito, para a ficha do adversário. Cabe em -24 -100 50 62.
export function retrato(j: Jeito) {
  return `<path d="M-20 -38q-2-18 8-24q8-4 16-4q10 0 16 5q8 6 6 23z" fill="${j.pele}" ${linha(2.6)}/>
    <path d="M-20 -38q-1-12 3-18l5-2q6 6 13 6q6 0 9-6l5 2q5 7 4 18z" fill="${j.camisa}" ${linha(2.2)}/>
    ${cabeca(j)}`;
}

export const svgRetrato = (j: Jeito, classe = "retrato") =>
  `<svg class="${classe}" viewBox="-26 -104 52 68" aria-hidden="true">${retrato(j)}</svg>`;

export const svgLutador = (j: Jeito, classe = "foto-lutador") =>
  `<svg class="${classe}" viewBox="-32 -112 92 116" aria-hidden="true">${lutador(j)}</svg>`;

// A amostra de uma peça do vestiário: luva, calção ou faixa.
export function amostra(peca: "luvas" | "roupa" | "faixa", item: Item) {
  if (peca === "luvas")
    return `<circle cx="0" cy="-2" r="11" fill="${item.cor}" ${linha(2.4)}/>
      <path d="M-9 2q8 6 17 0" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>
      <rect x="-7" y="8" width="14" height="6" rx="2" fill="#fff" ${linha(2)}/>`;
  if (peca === "faixa")
    return `<rect x="-14" y="-4" width="28" height="7" rx="2" fill="${item.cor}" ${linha(2)}/>
      <path d="M0 0l-4 12M2 0l5 11" stroke="${TINTA}" stroke-width="5.4" stroke-linecap="round"/>
      <path d="M0 0l-4 12M2 0l5 11" stroke="${item.cor}" stroke-width="2.8" stroke-linecap="round"/>
      <circle cx="1" cy="0" r="3.4" fill="${item.cor}" ${linha(1.6)}/>`;
  const j = { calcao: item.cor, estampa: item.cor2 } as Jeito;
  return `<g transform="translate(0 30) scale(.9)"><path d="M-15 -42h30l1 14q-7 2-13 0l-2-5-2 5q-7 2-14 0z" fill="${item.cor}" ${linha(2.4)}/>${estampa(j)}</g>`;
}

// O octógono visto de lado: a tela no fundo, a lona e a grade da frente. Coordenadas da cena:
// 240 de largura e 180 de altura, com a lona em CHAO.
export const LARGURA = 240;
export const ALTURA = 180;
export const CHAO = 150;

export function octogono() {
  const postes = [16, 72, 168, 224];
  const torcida = Array.from({ length: 26 }, (_, i) => {
    const x = i * 9.6 + ((i * 7) % 5);
    const y = 92 + ((i * 13) % 6);
    return `<circle cx="${x.toFixed(1)}" cy="${y}" r="5.2"/><rect x="${(x - 6).toFixed(1)}" y="${y + 3}" width="12" height="14" rx="5"/>`;
  }).join("");
  return `<defs>
      <linearGradient id="arena-fundo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140e26"/><stop offset="1" stop-color="#3a2c5c"/></linearGradient>
      <linearGradient id="luz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c9" stop-opacity=".55"/><stop offset="1" stop-color="#fff6c9" stop-opacity="0"/></linearGradient>
      <pattern id="tela" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M0 3.5L3.5 0 7 3.5 3.5 7Z" fill="none" stroke="#c7c2d6" stroke-width=".7"/></pattern>
      <pattern id="tela-frente" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 6L6 0 12 6 6 12Z" fill="none" stroke="#2b2140" stroke-width="1.1"/></pattern>
    </defs>
    <rect width="${LARGURA}" height="${ALTURA}" fill="url(#arena-fundo)"/>
    <g class="refletores">
      <path d="M40 0L8 ${CHAO}H92Z" fill="url(#luz)"/><path d="M200 0L148 ${CHAO}H232Z" fill="url(#luz)"/><path d="M120 0L92 ${CHAO}H148Z" fill="url(#luz)" opacity=".7"/>
    </g>
    <g class="torcida" fill="#241a3e">${torcida}</g>
    <path d="M0 58H${LARGURA}V128H0Z" fill="url(#tela)" opacity=".75"/>
    <path d="M0 56H${LARGURA}" stroke="#2b2140" stroke-width="5"/>
    <path d="M0 56H${LARGURA}" stroke="#e23b3b" stroke-width="2.4"/>
    ${postes.map((x) => `<rect x="${x - 3}" y="52" width="6" height="78" rx="3" fill="#2b2140"/><rect x="${x - 2}" y="74" width="4" height="22" rx="2" fill="#e23b3b"/>`).join("")}
    <path d="M-10 128H250L262 ${ALTURA + 2}H-22Z" fill="#ece7dc" stroke="${TINTA}" stroke-width="2.4"/>
    <ellipse cx="120" cy="155" rx="62" ry="14" fill="none" stroke="#e23b3b" stroke-width="2.4" opacity=".55"/>
    <text x="120" y="160" text-anchor="middle" class="lona-texto">LUTA ÉPICA</text>`;
}

// A grade da frente fica por cima dos lutadores, bem transparente.
export function gradeDaFrente() {
  return `<path d="M0 ${CHAO + 8}H${LARGURA}V${ALTURA}H0Z" fill="url(#tela-frente)" opacity=".28"/>
    <path d="M0 ${CHAO + 8}H${LARGURA}" stroke="#2b2140" stroke-width="3.6" opacity=".7"/>
    <rect x="-2" y="${CHAO - 2}" width="7" height="40" rx="3" fill="#2b2140"/><rect x="${LARGURA - 5}" y="${CHAO - 2}" width="7" height="40" rx="3" fill="#2b2140"/>`;
}

// A academia: parede de tijolo, piso de madeira e os quatro aparelhos ao fundo.
export function academia() {
  const tijolos = Array.from({ length: 9 }, (_, linhaN) =>
    Array.from({ length: 11 }, (_, k) => {
      const x = k * 24 - (linhaN % 2) * 12;
      return `<rect x="${x}" y="${linhaN * 12}" width="22" height="10" rx="1.6"/>`;
    }).join(""),
  ).join("");
  const tabuas = Array.from({ length: 10 }, (_, k) => `<path d="M${k * 26} 118V${ALTURA}"/>`).join("");
  return `<rect width="${LARGURA}" height="${ALTURA}" fill="#f6d9b8"/>
    <g fill="#ecc49c">${tijolos}</g>
    <rect x="96" y="14" width="48" height="34" rx="3" fill="#a8dcff" ${linha(2.4)}/>
    <path d="M120 14v34M96 31h48" stroke="${TINTA}" stroke-width="2"/>
    <path d="M100 20l10-4M100 26l16-8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
    <rect x="164" y="18" width="30" height="24" rx="2" fill="#ffc933" ${linha(2)}/>
    <path d="M172 34l7-10 7 10z" fill="#e23b3b" ${linha(1.4)}/>
    <rect x="0" y="108" width="${LARGURA}" height="12" fill="#2f7bff" stroke="${TINTA}" stroke-width="2.4"/>
    <rect x="0" y="118" width="${LARGURA}" height="${ALTURA - 118}" fill="#d49a5f"/>
    <g stroke="#b57c45" stroke-width="1.6">${tabuas}</g>
    <path d="M0 118H${LARGURA}" stroke="${TINTA}" stroke-width="2.4"/>
    <g transform="translate(26 0)">
      <rect x="-16" y="72" width="32" height="40" rx="2" fill="#7a8699" ${linha(2)}/>
      <path d="M-16 84h32M-16 98h32" stroke="${TINTA}" stroke-width="2"/>
      ${[-8, 2, 10].map((x, i) => `<rect x="${x - 3}" y="${78 + i * 0}" width="6" height="5" rx="1.4" fill="#3a3350"/>`).join("")}
      ${[-10, 0, 10].map((x) => `<g transform="translate(${x} 92)"><rect x="-4" y="-3" width="8" height="6" rx="1.6" fill="#3a3350"/></g>`).join("")}
    </g>
    <g transform="translate(212 0)">
      <path d="M0 0v18" stroke="${TINTA}" stroke-width="2.4"/>
      <rect x="-11" y="18" width="22" height="50" rx="9" fill="#e23b3b" ${linha(2.4)}/>
      <path d="M-11 30h22M-11 56h22" stroke="${TINTA}" stroke-width="2"/>
    </g>`;
}

// Os objetos do exercício, que aparecem com o lutador no meio da academia. Pés na origem.
export function aparelhos() {
  return `<g class="aparelho aparelho-forca">
      <path d="M-26 -98H40" stroke="${TINTA}" stroke-width="5.4" stroke-linecap="round"/>
      <path d="M-26 -98H40" stroke="#c9c9d6" stroke-width="2.6" stroke-linecap="round"/>
      <rect x="-34" y="-110" width="9" height="24" rx="2" fill="#3a3350" ${linha(2)}/><rect x="39" y="-110" width="9" height="24" rx="2" fill="#3a3350" ${linha(2)}/>
      <rect x="-40" y="-106" width="6" height="16" rx="2" fill="#e23b3b" ${linha(1.8)}/><rect x="48" y="-106" width="6" height="16" rx="2" fill="#e23b3b" ${linha(1.8)}/>
    </g>
    <g class="aparelho aparelho-velocidade"><g class="corda">
      <path d="M-20 -60Q-34 -40 -20 4Q4 18 30 4Q44 -40 30 -60" fill="none" stroke="${TINTA}" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M-20 -60Q-34 -40 -20 4Q4 18 30 4Q44 -40 30 -60" fill="none" stroke="#ffc933" stroke-width="1.6" stroke-linecap="round"/>
    </g></g>
    <g class="aparelho aparelho-tecnica"><g class="saco">
      <path d="M58 -150V-104" stroke="${TINTA}" stroke-width="2.4"/>
      <rect x="44" y="-104" width="28" height="70" rx="12" fill="#e23b3b" ${linha(2.6)}/>
      <path d="M44 -88h28M44 -50h28" stroke="${TINTA}" stroke-width="2"/>
      <path d="M50 -98q4-3 8-3" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".6" fill="none"/>
    </g></g>
    <g class="aparelho aparelho-resistencia">
      <path d="M-34 2H40l6-8H-30z" fill="#3a3350" ${linha(2.2)}/>
      <g class="esteira-faixa"><path d="M-30 -2H40" stroke="#7a8699" stroke-width="2.4" stroke-dasharray="6 5"/></g>
      <path d="M40 -6L52 -56" stroke="${TINTA}" stroke-width="4" stroke-linecap="round"/>
      <rect x="44" y="-64" width="20" height="10" rx="2" fill="#2f7bff" ${linha(2)}/>
      <circle cx="49" cy="-59" r="1.6" fill="#ffc933"/><circle cx="55" cy="-59" r="1.6" fill="#18b67e"/>
    </g>`;
}
