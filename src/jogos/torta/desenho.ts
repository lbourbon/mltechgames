// Desenho de cada suspeito, montado a partir das características. Tudo no mesmo SVG, sem ids,
// para vários suspeitos caberem na página sem colidir.
import type { Suspeito } from "./logica";

const CABECA: Record<Suspeito["bicho"], string> = {
  gato: "#f2a24b",
  cachorro: "#d9a273",
  coelho: "#ece8f4",
  urso: "#a0704a",
};

const ORELHAS: Record<Suspeito["bicho"], string> = {
  gato: `<path class="pele" d="M27 52 L28 22 L48 38 Z M73 52 L72 22 L52 38 Z"/>
    <path class="miolo" d="M31 44 L32 30 L42 39 Z M69 44 L68 30 L58 39 Z"/>`,
  cachorro: "",
  coelho: `<ellipse class="pele" cx="39" cy="20" rx="8" ry="22"/><ellipse class="pele" cx="61" cy="20" rx="8" ry="22"/>
    <ellipse class="miolo" cx="39" cy="21" rx="3.5" ry="15"/><ellipse class="miolo" cx="61" cy="21" rx="3.5" ry="15"/>`,
  urso: `<circle class="pele" cx="28" cy="40" r="11"/><circle class="pele" cx="72" cy="40" r="11"/>
    <circle class="miolo-urso" cx="28" cy="40" r="5"/><circle class="miolo-urso" cx="72" cy="40" r="5"/>`,
};

// Por cima da cabeça: as orelhas do cachorro caem dos lados.
const ROSTO: Record<Suspeito["bicho"], string> = {
  gato: `<path class="nariz-rosa" d="M46 68 H54 L50 73 Z"/>
    <path class="bigode-gato" d="M36 70 L22 67 M36 74 L22 76 M64 70 L78 67 M64 74 L78 76"/>`,
  cachorro: `<ellipse class="orelha-cachorro" cx="25" cy="64" rx="9" ry="19" transform="rotate(14 25 64)"/>
    <ellipse class="orelha-cachorro" cx="75" cy="64" rx="9" ry="19" transform="rotate(-14 75 64)"/>
    <ellipse class="focinho" cx="50" cy="74" rx="13" ry="9"/>
    <ellipse class="nariz" cx="50" cy="69" rx="6" ry="4.5"/>`,
  coelho: `<path class="nariz-rosa" d="M46 67 H54 L50 71 Z"/>
    <path class="dentes" d="M46 75 H54 V81 H46 Z M50 75 V81"/>`,
  urso: `<ellipse class="focinho" cx="50" cy="73" rx="13" ry="10"/>
    <ellipse class="nariz" cx="50" cy="68" rx="5.5" ry="4"/>`,
};

const CHAPEU = `<g class="chapeu">
  <path d="M34 36 Q33 14 42 14 Q50 20 58 14 Q67 14 66 36 Z"/>
  <ellipse cx="50" cy="37" rx="34" ry="7"/>
  <path class="chapeu-fita" d="M34 31 Q50 35 66 31"/>
</g>`;

const OCULOS = `<g class="oculos">
  <circle cx="39" cy="58" r="9"/><circle cx="61" cy="58" r="9"/>
  <path d="M48 58 H52 M30 56 L24 53 M70 56 L76 53"/>
</g>`;

const LENCO = `<g class="lenco">
  <path d="M30 92 H70 L50 114 Z"/>
  <circle cx="44" cy="98" r="2.2"/><circle cx="56" cy="98" r="2.2"/><circle cx="50" cy="106" r="2.2"/>
</g>`;

// A torta lambuzada só aparece no culpado, no flagra.
const TORTA = `<g class="lambuzado">
  <path d="M33 78 Q37 70 44 76 Q50 70 56 76 Q63 70 67 78 Q66 86 58 84 Q50 90 42 84 Q34 86 33 78 Z"/>
  <circle class="migalha" cx="30" cy="66" r="2.5"/><circle class="migalha" cx="72" cy="70" r="2"/>
  <circle class="migalha" cx="62" cy="88" r="2.2"/>
</g>`;

const ROUPA: Record<Suspeito["roupa"], string> = {
  vermelha: "#e5484d",
  azul: "#2f7bff",
  amarela: "#ffc933",
  verde: "#18b67e",
};

const NOME_DO_BICHO: Record<Suspeito["bicho"], string> = {
  gato: "Gato",
  cachorro: "Cachorro",
  coelho: "Coelho",
  urso: "Urso",
};

export function descrever(s: Suspeito) {
  const com = [s.chapeu && "chapéu", s.oculos && "óculos", s.lenco && "lenço"].filter(Boolean) as string[];
  const lista = com.length > 1 ? `${com.slice(0, -1).join(", ")} e ${com.at(-1)}` : com[0];
  return `${NOME_DO_BICHO[s.bicho]} ${s.alto ? "alto" : "baixinho"} de roupa ${s.roupa}${lista ? `, com ${lista}` : ""}`;
}

// O baixinho encolhe a partir dos pés, que ficam no chão.
const ESCALA_DO_BAIXINHO = 0.78;

export function desenharSuspeito(s: Suspeito) {
  const escala = s.alto ? 1 : ESCALA_DO_BAIXINHO;
  const encolhe = `translate(${50 * (1 - escala)} ${172 * (1 - escala)}) scale(${escala})`;
  return `<svg viewBox="0 0 100 172" aria-hidden="true" style="--pele:${CABECA[s.bicho]};--roupa:${ROUPA[s.roupa]}">
    <ellipse class="sombra" cx="50" cy="168" rx="30" ry="4"/>
    <g transform="${encolhe}">
      <g class="corpo">
        <rect class="perna" x="35" y="138" width="11" height="31" rx="5"/>
        <rect class="perna" x="54" y="138" width="11" height="31" rx="5"/>
        <rect class="braco" x="17" y="96" width="14" height="38" rx="7" transform="rotate(10 24 96)"/>
        <rect class="braco" x="69" y="96" width="14" height="38" rx="7" transform="rotate(-10 76 96)"/>
        <rect class="roupa" x="26" y="88" width="48" height="58" rx="16"/>
      </g>
      ${ORELHAS[s.bicho]}
      <circle class="pele" cx="50" cy="62" r="27"/>
      <circle class="olho" cx="39" cy="58" r="4"/><circle class="olho" cx="61" cy="58" r="4"/>
      ${ROSTO[s.bicho]}
      <path class="boca" d="M44 80 Q50 85 56 80"/>
      ${TORTA}
      ${s.oculos ? OCULOS : ""}
      ${s.lenco ? LENCO : ""}
      ${s.chapeu ? CHAPEU : ""}
    </g>
  </svg>`;
}
