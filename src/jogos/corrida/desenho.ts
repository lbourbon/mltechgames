// Desenhos em SVG, vistos de cima, como texto. Sem ids, para poderem se repetir na página.
// Os carros olham para a direita (ângulo zero), com o centro na origem.
import type { EquipamentoId, ModeloId } from "./carros";
import { ehNota, NOTA, RAIO_DA_MOEDA } from "./dinheiro";

const TINTA = "#2b2140";
const VIDRO = "#bfe9ff";
const BRILHO = `fill="#fff" opacity=".75"`;
const T = `stroke="${TINTA}" stroke-width="1.6" stroke-linejoin="round"`;
const FINO = `stroke="${TINTA}" stroke-width="1.1" stroke-linejoin="round"`;

const roda = (x: number, y: number, c = 8, l = 4.4) =>
  `<rect x="${x - c / 2}" y="${y - l / 2}" width="${c}" height="${l}" rx="1.6" fill="${TINTA}"/>`;
const rodas = (frente: number, tras: number, y: number, c?: number, l?: number) =>
  [roda(frente, -y, c, l), roda(frente, y, c, l), roda(tras, -y, c, l), roda(tras, y, c, l)].join("");

// Fogo do escapamento, que só aparece com o turbo ligado (.com-turbo em jogo.css).
const chama = (x: number, ys: number[]) =>
  `<g class="chama">${ys
    .map(
      (y) =>
        `<path d="M${x} ${y - 3}Q${x - 9} ${y} ${x} ${y + 3}Z" fill="#ff8a3d"/><path d="M${x} ${y - 1.6}Q${x - 5} ${y} ${x} ${y + 1.6}Z" fill="#ffe27a"/>`,
    )
    .join("")}</g>`;

const farois = (x: number, y: number, r = 1.8) =>
  `<circle cx="${x}" cy="${-y}" r="${r}" fill="#fff6b0" ${FINO}/><circle cx="${x}" cy="${y}" r="${r}" fill="#fff6b0" ${FINO}/>`;
const lanternas = (x: number, y: number) =>
  `<rect x="${x - 1}" y="${-y - 1.8}" width="2" height="3.6" rx="1" fill="#ff5a5f"/><rect x="${x - 1}" y="${y - 1.8}" width="2" height="3.6" rx="1" fill="#ff5a5f"/>`;

const DESENHOS: Record<ModeloId, (cor: string) => string> = {
  // Redondinho, com uma bolha de vidro em cima.
  bolinha: (cor) => `
    ${chama(-14, [0])}
    ${rodas(8, -8, 8.5, 7, 4)}
    <rect x="-15" y="-10" width="30" height="20" rx="10" fill="${cor}" ${T}/>
    <circle cx="-9.5" cy="-4.5" r="1.8" fill="#fff" opacity=".9"/><circle cx="-9.5" cy="4.5" r="1.8" fill="#fff" opacity=".9"/>
    <circle cx="-6" cy="0" r="1.3" fill="#fff" opacity=".9"/>
    <ellipse cx="2" cy="0" rx="7.5" ry="7.5" fill="${VIDRO}" ${T}/>
    <ellipse cx="4.5" cy="-3" rx="2.4" ry="1.4" ${BRILHO}/>
    ${farois(12.5, 5.2)}`,

  // Rodas grandes por fora, santantônio e estepe atrás.
  jipe: (cor) => `
    ${chama(-20, [-4])}
    ${rodas(9.5, -9.5, 10.5, 9.5, 5.4)}
    <circle cx="-17" cy="0" r="4.6" fill="${TINTA}"/><circle cx="-17" cy="0" r="1.8" fill="#8a8399"/>
    <rect x="-15.5" y="-9" width="31" height="18" rx="3" fill="${cor}" ${T}/>
    <rect x="14.5" y="-8.5" width="3.4" height="17" rx="1.2" fill="#4a4060" ${FINO}/>
    <rect x="-10" y="-7.5" width="12" height="15" rx="1.5" fill="#000" opacity=".16"/>
    <path d="M-10 -7.5V7.5M-6 -7.5V7.5M-2 -7.5V7.5M2 -7.5V7.5" stroke="${TINTA}" stroke-width="1.3"/>
    <rect x="3.5" y="-7.5" width="4" height="15" rx="1" fill="${VIDRO}" ${FINO}/>
    <path d="M9 -5.5H13M9 -2H13M9 2H13M9 5.5H13" stroke="${TINTA}" stroke-width=".9" opacity=".5"/>
    ${farois(16.2, 5.6, 2)}`,

  // Baixo e comprido, com faixas de corrida e aerofólio.
  esportivo: (cor) => `
    ${chama(-17, [-3.5, 3.5])}
    ${rodas(9.5, -9.5, 8.6, 7.5, 4.2)}
    <path d="M17.5 -4Q17.5 -8 12 -8.6L-12 -9Q-16 -9 -16 -5.5V5.5Q-16 9 -12 9L12 8.6Q17.5 8 17.5 4Z" fill="${cor}" ${T}/>
    <path d="M-16 -2.8H17.5M-16 2.8H17.5" stroke="#fff" stroke-width="2.2"/>
    <path d="M5.5 -6.4L10 -5.2V5.2L5.5 6.4Z" fill="${VIDRO}" ${FINO}/>
    <rect x="-5" y="-6.4" width="10.5" height="12.8" rx="2.5" fill="#000" opacity=".2"/>
    <path d="M-5 -6.4L-8 -5.4V5.4L-5 6.4Z" fill="${VIDRO}" ${FINO}/>
    <rect x="-19" y="-10" width="3.6" height="20" rx="1.2" fill="${TINTA}"/>
    <rect x="-18.2" y="-8.6" width="2" height="17.2" rx=".8" fill="${cor}"/>
    <path d="M16 -6.4L17.4 -4.2M16 6.4L17.4 4.2" stroke="#fff6b0" stroke-width="2" stroke-linecap="round"/>
    ${lanternas(-15.6, 6)}`,

  // Rodas de fora, asa na frente e atrás, e o capacete do piloto.
  formula: (cor) => `
    ${chama(-17, [0])}
    <path d="M8.5 -9.5L3 -3M8.5 9.5L3 3M-10 -10.5L-6 -4M-10 10.5L-6 4" stroke="${TINTA}" stroke-width="1.4"/>
    ${roda(9, -9.8, 7.5, 4.6)}${roda(9, 9.8, 7.5, 4.6)}${roda(-10, -10.6, 9, 5.8)}${roda(-10, 10.6, 9, 5.8)}
    <rect x="13.5" y="-12" width="4.2" height="24" rx="1.5" fill="${cor}" ${T}/>
    <path d="M18 -2L18 2L5 4.6L-6 6.8L-14 5.5L-14 -5.5L-6 -6.8L5 -4.6Z" fill="${cor}" ${T}/>
    <path d="M17 0H6" stroke="#fff" stroke-width="1.6"/>
    <ellipse cx="-2" cy="0" rx="5" ry="3.8" fill="${TINTA}"/>
    <circle cx="-1.5" cy="0" r="2.9" fill="#fff" ${FINO}/>
    <path d="M0 -2.2Q1.6 0 0 2.2" stroke="${cor}" stroke-width="1.6" fill="none"/>
    <rect x="-19" y="-11" width="4.6" height="22" rx="1.5" fill="${cor}" ${T}/>
    <path d="M-19 -6H-14.4M-19 6H-14.4" stroke="#fff" stroke-width="1.2"/>`,

  // Em cunha, com luz neon por baixo e asa grande.
  super: (cor) => `
    <ellipse cx="0" cy="0" rx="22" ry="13.5" fill="#5ff7ff" opacity=".3" class="neon"/>
    ${chama(-18, [-4, 4])}
    ${rodas(10, -10, 8.8, 7.5, 4.4)}
    <path d="M18.5 -2.5L14 -9.2L-14 -9.8L-17.5 -6.5V6.5L-14 9.8L14 9.2L18.5 2.5Z" fill="${cor}" ${T}/>
    <path d="M-8 -9.6L-3 -6.8L-12 -6.8ZM-8 9.6L-3 6.8L-12 6.8Z" fill="${TINTA}"/>
    <path d="M7.5 -5.8L11.5 0L7.5 5.8L-6 5.2L-6 -5.2Z" fill="#7fd3ff" ${FINO}/>
    <path d="M8.5 -3.2L10.4 0L8.5 3.2" stroke="#fff" stroke-width="1" fill="none" opacity=".8"/>
    <path d="M12 -2H16.5M12 2H16.5" stroke="${TINTA}" stroke-width="1" opacity=".55"/>
    <path d="M14.8 -8L17.4 -4M14.8 8L17.4 4" stroke="#5ff7ff" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M-14 -6V6" stroke="${TINTA}" stroke-width="1.2"/>
    <rect x="-21" y="-11.5" width="4.2" height="23" rx="1.4" fill="${TINTA}"/>
    <rect x="-20.2" y="-10" width="2.4" height="20" rx="1" fill="${cor}"/>
    ${lanternas(-16.6, 6.5)}`,

  // Sem rodas: asas, cabine de bolha e duas turbinas.
  voador: (cor) => `
    ${chama(-19, [-4.5, 4.5])}
    <path d="M4 -7L-6 -18.5L-11.5 -18.5L-8.5 -7ZM4 7L-6 18.5L-11.5 18.5L-8.5 7Z" fill="#f4f1ff" ${T}/>
    <path d="M-6 -18.5L-11.5 -18.5L-10.6 -15.5L-4 -15.5ZM-6 18.5L-11.5 18.5L-10.6 15.5L-4 15.5Z" fill="${cor}"/>
    <rect x="-19" y="-7.6" width="7" height="6" rx="2" fill="#8a8399" ${FINO}/>
    <rect x="-19" y="1.6" width="7" height="6" rx="2" fill="#8a8399" ${FINO}/>
    <rect x="-15" y="-8.5" width="32" height="17" rx="8.5" fill="${cor}" ${T}/>
    <path d="M-12 0H-4" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>
    <ellipse cx="4" cy="0" rx="7.5" ry="5.6" fill="${VIDRO}" ${T}/>
    <ellipse cx="6.5" cy="-2.2" rx="2.4" ry="1.3" ${BRILHO}/>
    <circle cx="15" cy="0" r="1.6" fill="#5ff7ff" class="pisca"/>`,

  // Disco com cúpula e anel de luzes que gira. A setinha mostra para onde ele vai.
  disco: (cor) => `
    <path d="M14 -4L20 0L14 4Z" fill="#5ff7ff" ${FINO}/>
    <circle r="15" fill="#d9dde6" ${T}/>
    <circle r="11.5" fill="${cor}" ${T}/>
    <g class="luzes">${Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      return `<circle cx="${(13.3 * Math.cos(a)).toFixed(1)}" cy="${(13.3 * Math.sin(a)).toFixed(1)}" r="1.3" fill="${i % 2 ? "#ffe27a" : "#fff"}"/>`;
    }).join("")}</g>
    <circle r="6.5" fill="${VIDRO}" ${T}/>
    <ellipse cx="1.5" cy="-2.6" rx="2.6" ry="1.4" ${BRILHO}/>`,
};

// Os voadores têm a sombra longe, no chão, e balançam no ar.
export function desenharCarro(modelo: ModeloId, cor: string, voa: boolean) {
  const sombra = voa
    ? `<ellipse cx="5" cy="11" rx="15" ry="9" fill="${TINTA}" opacity=".18"/>`
    : `<ellipse cx="1.5" cy="2.5" rx="17" ry="11" fill="${TINTA}" opacity=".2"/>`;
  return `${sombra}<g class="giro"><g class="${voa ? "flutua" : ""}">${DESENHOS[modelo](cor)}</g></g>`;
}

// Só o carro, para a garagem.
export const carroParado = (modelo: ModeloId, cor: string) => DESENHOS[modelo](cor);

const CORES_DA_MOEDA: Record<number, string> = { 5: "#d9895a", 10: "#f0c552", 25: "#e8b73c", 50: "#dfe2ea" };
const CORES_DA_NOTA: Record<number, string> = { 200: "#7fb6ee", 500: "#c39be3", 1000: "#ef8a73", 2000: "#f6c35a", 5000: "#d9a066" };

export function desenharPeca(valor: number) {
  if (ehNota(valor)) {
    const { largura: l, altura: a } = NOTA;
    return `<rect x="${-l / 2}" y="${-a / 2}" width="${l}" height="${a}" rx="2.5" fill="${CORES_DA_NOTA[valor]}" ${FINO}/>
      <circle cx="${-l / 2 + 6}" cy="0" r="4" fill="#fff" opacity=".45"/>
      <text x="3.5" y="4" text-anchor="middle" class="valor-nota">${valor / 100}</text>`;
  }
  const r = RAIO_DA_MOEDA[valor];
  // A de 1 real tem a borda dourada e o miolo prateado, como a de verdade.
  if (valor === 100)
    return `<circle r="${r}" fill="#f0c552" ${FINO}/><circle r="${r * 0.68}" fill="#dfe2ea" stroke="${TINTA}" stroke-width=".8"/>
      <text y="3" text-anchor="middle" class="valor-moeda valor-real">R$1</text>`;
  return `<circle r="${r}" fill="${CORES_DA_MOEDA[valor]}" ${FINO}/>
    <circle r="${r - 2.4}" fill="none" stroke="${TINTA}" stroke-width=".6" opacity=".35"/>
    <text y="3.6" text-anchor="middle" class="valor-moeda">${valor}</text>`;
}

// Obstáculos: no chão, cone, caixote e pneus; no céu, balão, passarinho e nuvem de chuva.
export function desenharObstaculo(tipo: number, voa: boolean) {
  if (voa) {
    if (tipo === 0)
      return `<path d="M0 8Q1 11 -1 14" stroke="${TINTA}" stroke-width="1" fill="none"/><circle r="8.5" fill="#ff5a5f" ${T}/><ellipse cx="-3" cy="-3" rx="2.4" ry="1.6" ${BRILHO}/>`;
    if (tipo === 1)
      return `<path d="M-10 -1Q-5 -8 0 -1Q5 -8 10 -1Q5 -3 0 3Q-5 -3 -10 -1Z" fill="#3a3350" ${T}/><circle cx="0" cy="1" r="2.6" fill="#ffc933"/>`;
    return `<g fill="#9aa3b8" ${T}><circle cx="-4" cy="1" r="5"/><circle cx="3" cy="-1" r="6"/><circle cx="6" cy="3" r="4"/></g><path d="M-4 8L-6 12M1 8L-1 12M6 8L4 12" stroke="#2f7bff" stroke-width="1.4" stroke-linecap="round"/>`;
  }
  if (tipo === 0)
    return `<rect x="-9" y="-9" width="18" height="18" rx="3" fill="#ff8a3d" ${T}/><circle r="6" fill="#fff" ${FINO}/><circle r="3.4" fill="#ff8a3d" ${FINO}/>`;
  if (tipo === 1)
    return `<rect x="-8.5" y="-8.5" width="17" height="17" rx="1.5" fill="#d29a5c" ${T}/><path d="M-8.5 -8.5L8.5 8.5M8.5 -8.5L-8.5 8.5" stroke="${TINTA}" stroke-width="1.3"/><rect x="-8.5" y="-8.5" width="17" height="17" rx="1.5" fill="none" stroke="#a8743f" stroke-width="2.4" transform="scale(.8)"/>`;
  return `<circle r="9" fill="${TINTA}"/><circle r="5.5" fill="#5d5470"/><circle r="3" fill="${TINTA}"/><path d="M0 -9V-6M0 9V6M-9 0H-6M9 0H6" stroke="#5d5470" stroke-width="1.2"/>`;
}

// Enfeites do cenário, fora da pista.
export function desenharEnfeite(tipo: number, voa: boolean) {
  if (voa) {
    if (tipo === 0)
      return `<g fill="#fff" stroke="#d6e6ff" stroke-width="1.5"><circle cx="-9" cy="2" r="7"/><circle cx="0" cy="-3" r="9"/><circle cx="10" cy="2" r="7"/><rect x="-14" y="2" width="28" height="7" rx="3.5" stroke="none"/></g>`;
    if (tipo === 1) return `<path d="M0 -6L1.8 -1.8L6 0L1.8 1.8L0 6L-1.8 1.8L-6 0L-1.8 -1.8Z" fill="#fff6b0"/>`;
    return `<g fill="#fff" opacity=".85"><circle cx="-5" cy="1" r="4.5"/><circle cx="2" cy="-1" r="5.5"/><circle cx="7" cy="2" r="3.5"/></g>`;
  }
  if (tipo === 0)
    return `<circle cx="2" cy="3" r="13" fill="${TINTA}" opacity=".15"/><circle r="12" fill="#3f9e4d" ${T}/><circle cx="-3" cy="-3" r="6" fill="#5cbf5f"/><circle cx="4" cy="2" r="4" fill="#5cbf5f"/>`;
  if (tipo === 1)
    return `<g fill="#58b85a" ${FINO}><circle cx="-5" cy="0" r="5.5"/><circle cx="4" cy="-1" r="6.5"/><circle cx="0" cy="4" r="5"/></g><circle cx="3" cy="-2" r="1.4" fill="#ff5a5f"/><circle cx="-4" cy="2" r="1.4" fill="#ff5a5f"/>`;
  return `<g>${[0, 72, 144, 216, 288].map((a) => `<circle cx="${(3.2 * Math.cos((a * Math.PI) / 180)).toFixed(1)}" cy="${(3.2 * Math.sin((a * Math.PI) / 180)).toFixed(1)}" r="2.6" fill="#fff"/>`).join("")}<circle r="2" fill="#ffc933"/></g>`;
}

// Ícones dos equipamentos na garagem, num quadro de -12 a 12.
export const ICONES: Record<EquipamentoId, string> = {
  turbo: `<path d="M-2 -11L-9 2H-1L-4 11L8 -3H0L4 -11Z" fill="#ffc933" ${T}/>`,
  pneus: `<circle r="10.5" fill="${TINTA}"/><circle r="6" fill="#8a8399" ${FINO}/><circle r="2.2" fill="${TINTA}"/>
    <path d="M0 -10.5V-7.5M0 10.5V7.5M-10.5 0H-7.5M10.5 0H7.5M-7.4 -7.4L-5.3 -5.3M7.4 7.4L5.3 5.3M7.4 -7.4L5.3 -5.3M-7.4 7.4L-5.3 5.3" stroke="#5d5470" stroke-width="1.6"/>`,
  ima: `<path d="M-8 -10V1A8 8 0 0 0 8 1V-10H3V1A3 3 0 0 1 -3 1V-10Z" fill="#ff5a5f" ${T}/>
    <path d="M-8 -10H-3V-5H-8ZM3 -10H8V-5H3Z" fill="#dfe2ea" ${T}/>`,
};
