// Países do jogo, sem DOM. O id é o código ISO de duas letras, que também dá nome ao arquivo da
// bandeira em public/img/bandeiras/. Só entram países grandes o bastante para um dedo no mapa.
export type Artigo = "o" | "a" | "os" | "as" | "";

type Pais = {
  nome: string;
  // Artigo do nome: "do Brasil", "da Argentina", "dos Estados Unidos", "de Portugal".
  artigo: Artigo;
  // Nome no mapa, quando o inteiro não cabe.
  curto?: string;
  // Sem capital, o país não aparece nos pedidos das fases de capitais: fica de fora quando a
  // capital é disputada ou dividida entre duas cidades.
  capital?: string;
  // Artigo da capital: "para o Cairo", "para a Cidade do México".
  artigoDaCapital?: "o" | "a";
};

export const PAISES = {
  // América do Sul
  br: { nome: "Brasil", artigo: "o", capital: "Brasília" },
  ar: { nome: "Argentina", artigo: "a", capital: "Buenos Aires" },
  uy: { nome: "Uruguai", artigo: "o", capital: "Montevidéu" },
  py: { nome: "Paraguai", artigo: "o", capital: "Assunção" },
  bo: { nome: "Bolívia", artigo: "a" },
  pe: { nome: "Peru", artigo: "o", capital: "Lima" },
  ec: { nome: "Equador", artigo: "o", capital: "Quito" },
  co: { nome: "Colômbia", artigo: "a", capital: "Bogotá" },
  ve: { nome: "Venezuela", artigo: "a", capital: "Caracas" },
  gy: { nome: "Guiana", artigo: "a", capital: "Georgetown" },
  sr: { nome: "Suriname", artigo: "o", capital: "Paramaribo" },
  cl: { nome: "Chile", artigo: "o", capital: "Santiago" },

  // América do Norte, Central e Caribe
  ca: { nome: "Canadá", artigo: "o", capital: "Ottawa" },
  us: { nome: "Estados Unidos", artigo: "os", capital: "Washington" },
  mx: { nome: "México", artigo: "o", capital: "Cidade do México", artigoDaCapital: "a" },
  gt: { nome: "Guatemala", artigo: "a", capital: "Cidade da Guatemala", artigoDaCapital: "a" },
  bz: { nome: "Belize", artigo: "", capital: "Belmopã" },
  sv: { nome: "El Salvador", artigo: "", capital: "San Salvador" },
  hn: { nome: "Honduras", artigo: "", capital: "Tegucigalpa" },
  ni: { nome: "Nicarágua", artigo: "a", capital: "Manágua" },
  cr: { nome: "Costa Rica", artigo: "a", capital: "San José" },
  pa: { nome: "Panamá", artigo: "o", capital: "Cidade do Panamá", artigoDaCapital: "a" },
  cu: { nome: "Cuba", artigo: "", capital: "Havana" },
  jm: { nome: "Jamaica", artigo: "a", capital: "Kingston" },
  ht: { nome: "Haiti", artigo: "o", capital: "Porto Príncipe" },
  do: { nome: "República Dominicana", artigo: "a", curto: "R. Dominicana", capital: "Santo Domingo" },
  bs: { nome: "Bahamas", artigo: "as", capital: "Nassau" },

  // Europa
  pt: { nome: "Portugal", artigo: "", capital: "Lisboa" },
  es: { nome: "Espanha", artigo: "a", capital: "Madri" },
  fr: { nome: "França", artigo: "a", capital: "Paris" },
  gb: { nome: "Reino Unido", artigo: "o", capital: "Londres" },
  ie: { nome: "Irlanda", artigo: "a", capital: "Dublin" },
  is: { nome: "Islândia", artigo: "a", capital: "Reykjavík" },
  be: { nome: "Bélgica", artigo: "a", capital: "Bruxelas" },
  nl: { nome: "Países Baixos", artigo: "os", capital: "Amsterdã" },
  lu: { nome: "Luxemburgo", artigo: "o", capital: "Luxemburgo" },
  de: { nome: "Alemanha", artigo: "a", capital: "Berlim" },
  ch: { nome: "Suíça", artigo: "a", capital: "Berna" },
  at: { nome: "Áustria", artigo: "a", capital: "Viena" },
  it: { nome: "Itália", artigo: "a", capital: "Roma" },
  dk: { nome: "Dinamarca", artigo: "a", capital: "Copenhague" },
  no: { nome: "Noruega", artigo: "a", capital: "Oslo" },
  se: { nome: "Suécia", artigo: "a", capital: "Estocolmo" },
  fi: { nome: "Finlândia", artigo: "a", capital: "Helsinque" },
  ee: { nome: "Estônia", artigo: "a", capital: "Tallinn" },
  lv: { nome: "Letônia", artigo: "a", capital: "Riga" },
  lt: { nome: "Lituânia", artigo: "a", capital: "Vilnius" },
  pl: { nome: "Polônia", artigo: "a", capital: "Varsóvia" },
  cz: { nome: "República Tcheca", artigo: "a", curto: "R. Tcheca", capital: "Praga" },
  sk: { nome: "Eslováquia", artigo: "a", capital: "Bratislava" },
  hu: { nome: "Hungria", artigo: "a", capital: "Budapeste" },
  si: { nome: "Eslovênia", artigo: "a", capital: "Liubliana" },
  hr: { nome: "Croácia", artigo: "a", capital: "Zagreb" },
  ba: { nome: "Bósnia e Herzegovina", artigo: "a", curto: "Bósnia", capital: "Sarajevo" },
  rs: { nome: "Sérvia", artigo: "a", capital: "Belgrado" },
  me: { nome: "Montenegro", artigo: "o", capital: "Podgorica" },
  al: { nome: "Albânia", artigo: "a", capital: "Tirana" },
  mk: { nome: "Macedônia do Norte", artigo: "a", curto: "Macedônia", capital: "Escópia" },
  gr: { nome: "Grécia", artigo: "a", capital: "Atenas" },
  bg: { nome: "Bulgária", artigo: "a", capital: "Sófia" },
  ro: { nome: "Romênia", artigo: "a", capital: "Bucareste" },
  md: { nome: "Moldávia", artigo: "a", capital: "Chisinau" },
  ua: { nome: "Ucrânia", artigo: "a", capital: "Kiev" },
  by: { nome: "Belarus", artigo: "", capital: "Minsk" },
  ru: { nome: "Rússia", artigo: "a", capital: "Moscou" },
  tr: { nome: "Turquia", artigo: "a", capital: "Ancara" },
  cy: { nome: "Chipre", artigo: "", capital: "Nicósia" },

  // África
  ma: { nome: "Marrocos", artigo: "o", capital: "Rabat" },
  dz: { nome: "Argélia", artigo: "a", capital: "Argel" },
  tn: { nome: "Tunísia", artigo: "a", capital: "Túnis" },
  ly: { nome: "Líbia", artigo: "a", capital: "Trípoli" },
  eg: { nome: "Egito", artigo: "o", capital: "Cairo", artigoDaCapital: "o" },
  sd: { nome: "Sudão", artigo: "o", capital: "Cartum" },
  ss: { nome: "Sudão do Sul", artigo: "o", capital: "Juba" },
  et: { nome: "Etiópia", artigo: "a", capital: "Adis Abeba" },
  er: { nome: "Eritreia", artigo: "a", capital: "Asmara" },
  dj: { nome: "Djibuti", artigo: "o" },
  so: { nome: "Somália", artigo: "a", capital: "Mogadíscio" },
  ke: { nome: "Quênia", artigo: "o", capital: "Nairóbi" },
  ug: { nome: "Uganda", artigo: "", capital: "Kampala" },
  rw: { nome: "Ruanda", artigo: "", capital: "Kigali" },
  bi: { nome: "Burundi", artigo: "o", capital: "Gitega" },
  tz: { nome: "Tanzânia", artigo: "a", capital: "Dodoma" },
  cd: { nome: "República Democrática do Congo", artigo: "a", curto: "R. D. do Congo", capital: "Kinshasa" },
  cg: { nome: "Congo", artigo: "o", capital: "Brazzaville" },
  ga: { nome: "Gabão", artigo: "o", capital: "Libreville" },
  gq: { nome: "Guiné Equatorial", artigo: "a" },
  cm: { nome: "Camarões", artigo: "", capital: "Iaundé" },
  cf: { nome: "República Centro-Africana", artigo: "a", curto: "R. Centro-Africana", capital: "Bangui" },
  td: { nome: "Chade", artigo: "o", capital: "N'Djamena" },
  ne: { nome: "Níger", artigo: "o", capital: "Niamey" },
  ng: { nome: "Nigéria", artigo: "a", capital: "Abuja" },
  bj: { nome: "Benin", artigo: "o", capital: "Porto Novo" },
  tg: { nome: "Togo", artigo: "o", capital: "Lomé" },
  gh: { nome: "Gana", artigo: "", capital: "Acra" },
  ci: { nome: "Costa do Marfim", artigo: "a", capital: "Yamoussoukro" },
  bf: { nome: "Burkina Faso", artigo: "", capital: "Uagadugu" },
  ml: { nome: "Mali", artigo: "o", capital: "Bamako" },
  mr: { nome: "Mauritânia", artigo: "a", capital: "Nouakchott" },
  sn: { nome: "Senegal", artigo: "o", capital: "Dacar" },
  gm: { nome: "Gâmbia", artigo: "a", capital: "Banjul" },
  gw: { nome: "Guiné-Bissau", artigo: "a", capital: "Bissau" },
  gn: { nome: "Guiné", artigo: "a", capital: "Conacri" },
  sl: { nome: "Serra Leoa", artigo: "a", capital: "Freetown" },
  lr: { nome: "Libéria", artigo: "a", capital: "Monróvia" },
  ao: { nome: "Angola", artigo: "", capital: "Luanda" },
  zm: { nome: "Zâmbia", artigo: "a", capital: "Lusaka" },
  mw: { nome: "Malawi", artigo: "o", capital: "Lilongwe" },
  mz: { nome: "Moçambique", artigo: "", capital: "Maputo" },
  zw: { nome: "Zimbábue", artigo: "o", capital: "Harare" },
  bw: { nome: "Botsuana", artigo: "", capital: "Gaborone" },
  na: { nome: "Namíbia", artigo: "a", capital: "Windhoek" },
  za: { nome: "África do Sul", artigo: "a" },
  ls: { nome: "Lesoto", artigo: "o", capital: "Maseru" },
  sz: { nome: "Essuatíni", artigo: "" },
  mg: { nome: "Madagascar", artigo: "", capital: "Antananarivo" },

  // Oriente Médio e Ásia Central
  sy: { nome: "Síria", artigo: "a", capital: "Damasco" },
  lb: { nome: "Líbano", artigo: "o", capital: "Beirute" },
  il: { nome: "Israel", artigo: "" },
  jo: { nome: "Jordânia", artigo: "a", capital: "Amã" },
  iq: { nome: "Iraque", artigo: "o", capital: "Bagdá" },
  sa: { nome: "Arábia Saudita", artigo: "a", capital: "Riad" },
  ye: { nome: "Iêmen", artigo: "o", capital: "Sanaa" },
  om: { nome: "Omã", artigo: "", capital: "Mascate" },
  ae: { nome: "Emirados Árabes Unidos", artigo: "os", curto: "Emirados", capital: "Abu Dhabi" },
  qa: { nome: "Catar", artigo: "o", capital: "Doha" },
  kw: { nome: "Kuwait", artigo: "o", capital: "Cidade do Kuwait", artigoDaCapital: "a" },
  ir: { nome: "Irã", artigo: "o", capital: "Teerã" },
  af: { nome: "Afeganistão", artigo: "o", capital: "Cabul" },
  pk: { nome: "Paquistão", artigo: "o", capital: "Islamabad" },
  tm: { nome: "Turcomenistão", artigo: "o", capital: "Asgabate" },
  uz: { nome: "Uzbequistão", artigo: "o", capital: "Tashkent" },
  kz: { nome: "Cazaquistão", artigo: "o", capital: "Astana" },
  kg: { nome: "Quirguistão", artigo: "o", capital: "Bishkek" },
  tj: { nome: "Tajiquistão", artigo: "o", capital: "Duchambé" },
  ge: { nome: "Geórgia", artigo: "a", capital: "Tbilisi" },
  am: { nome: "Armênia", artigo: "a", capital: "Erevan" },
  az: { nome: "Azerbaijão", artigo: "o", capital: "Baku" },

  // Ásia do Sul e do Leste
  in: { nome: "Índia", artigo: "a", capital: "Nova Délhi" },
  np: { nome: "Nepal", artigo: "o", capital: "Katmandu" },
  bt: { nome: "Butão", artigo: "o", capital: "Timphu" },
  bd: { nome: "Bangladesh", artigo: "o", capital: "Daca" },
  lk: { nome: "Sri Lanka", artigo: "o" },
  mm: { nome: "Mianmar", artigo: "o", capital: "Naypyidaw" },
  th: { nome: "Tailândia", artigo: "a", capital: "Bangkok" },
  la: { nome: "Laos", artigo: "o", capital: "Vientiane" },
  kh: { nome: "Camboja", artigo: "o", capital: "Phnom Penh" },
  vn: { nome: "Vietnã", artigo: "o", capital: "Hanói" },
  my: { nome: "Malásia", artigo: "a", capital: "Kuala Lumpur" },
  id: { nome: "Indonésia", artigo: "a", capital: "Jacarta" },
  ph: { nome: "Filipinas", artigo: "as", capital: "Manila" },
  bn: { nome: "Brunei", artigo: "", capital: "Bandar Seri Begawan" },
  cn: { nome: "China", artigo: "a", capital: "Pequim" },
  mn: { nome: "Mongólia", artigo: "a", capital: "Ulan Bator" },
  kp: { nome: "Coreia do Norte", artigo: "a", capital: "Pyongyang" },
  kr: { nome: "Coreia do Sul", artigo: "a", capital: "Seul" },
  jp: { nome: "Japão", artigo: "o", capital: "Tóquio" },

  // Oceania
  au: { nome: "Austrália", artigo: "a", capital: "Camberra" },
  nz: { nome: "Nova Zelândia", artigo: "a", capital: "Wellington" },
  pg: { nome: "Papua-Nova Guiné", artigo: "a", curto: "Papua-N. Guiné", capital: "Port Moresby" },
  tl: { nome: "Timor-Leste", artigo: "o", capital: "Díli" },
  sb: { nome: "Ilhas Salomão", artigo: "as", capital: "Honiara" },
  vu: { nome: "Vanuatu", artigo: "", capital: "Port Vila" },
  fj: { nome: "Fiji", artigo: "", capital: "Suva" },
} satisfies Record<string, Pais>;

export type Id = keyof typeof PAISES;
export const IDS = Object.keys(PAISES) as Id[];
const pais = (id: Id): Pais => PAISES[id];

const O = { o: "o ", a: "a ", os: "os ", as: "as ", "": "" } as const;
const DE = { o: "do", a: "da", os: "dos", as: "das", "": "de" } as const;
const PARA = { o: "para o", a: "para a", os: "para os", as: "para as", "": "para" } as const;
const EM = { o: "no", a: "na", os: "nos", as: "nas", "": "em" } as const;

export const nomeDe = (id: Id) => pais(id).nome;
export const nomeCurto = (id: Id) => pais(id).curto ?? pais(id).nome;
export const capitalDe = (id: Id) => pais(id).capital;
// "o Peru", "a Bolívia", "Portugal".
export const oPais = (id: Id) => `${O[pais(id).artigo]}${pais(id).nome}`;
export const doPais = (id: Id) => `${DE[pais(id).artigo]} ${pais(id).nome}`;
export const paraOPais = (id: Id) => `${PARA[pais(id).artigo]} ${pais(id).nome}`;
export const noPais = (id: Id) => `${EM[pais(id).artigo]} ${pais(id).nome}`;
export const daCapital = (id: Id) => `${DE[pais(id).artigoDaCapital ?? ""]} ${pais(id).capital}`;
export const paraACapital = (id: Id) => `${PARA[pais(id).artigoDaCapital ?? ""]} ${pais(id).capital}`;
