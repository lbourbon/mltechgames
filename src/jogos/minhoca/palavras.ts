// Tudo o que a minhoca sabe escrever, sem DOM. A pista é sempre o desenho, então cada palavra
// precisa de um emoji que a criança nomeie de um jeito só, e de Unicode 12 ou anterior, que
// aparece até em celular antigo.
//
// Os colchetes marcam uma armadilha: [certo|isca]. O certo vale uma casa só, mesmo com duas
// letras, e a isca aparece no jardim junto com ele. Assim CH e X ocupam o mesmo espaço, e
// contar as casas não entrega a resposta.
export type Palavra = {
  desenho: string;
  texto: string;
  pedacos: string[];
  // Uma entrada por pedaço: a isca dele, se for uma armadilha.
  iscas: (string | null)[];
};

function palavra(desenho: string, escrita: string): Palavra {
  const pedacos: string[] = [];
  const iscas: (string | null)[] = [];
  for (const [, certo, isca, letra] of escrita.matchAll(/\[(.+?)\|(.+?)\]|(.)/gu)) {
    pedacos.push(certo ?? letra);
    iscas.push(isca ?? null);
  }
  return { desenho, texto: pedacos.join(""), pedacos, iscas };
}

const grupo = (...entradas: string[]) =>
  entradas.map((entrada) => {
    const [desenho, escrita] = entrada.split(" ");
    return palavra(desenho, escrita);
  });

export const CURTAS = grupo(
  "⚽ BOLA",
  "🐱 GATO",
  "🦆 PATO",
  "🐸 SAPO",
  "🍇 UVA",
  "🐮 VACA",
  "🌙 LUA",
  "🎲 DADO",
  "🎂 BOLO",
  "🐭 RATO",
  "🥥 COCO",
  "🔔 SINO",
  "🔥 FOGO",
  "👄 BOCA",
  "🍐 PERA",
  "🏍️ MOTO",
  "🥚 OVO",
  "💧 GOTA",
  "🪁 PIPA",
  "🧳 MALA",
);

export const LONGAS = grupo(
  "🍌 BANANA",
  "🐵 MACACO",
  "🐴 CAVALO",
  "🍅 TOMATE",
  "👞 SAPATO",
  "🍿 PIPOCA",
  "🥑 ABACATE",
  "🥔 BATATA",
  "🐳 BALEIA",
  "👑 COROA",
  "🐫 CAMELO",
  "🖊️ CANETA",
  "🔌 TOMADA",
  "🔒 CADEADO",
  "🍭 PIRULITO",
  "☎️ TELEFONE",
);

export const NH_LH = grupo(
  "🕷️ ARANHA",
  "🐔 GALINHA",
  "🐝 ABELHA",
  "🐑 OVELHA",
  "🐰 COELHO",
  "🍃 FOLHA",
  "🐬 GOLFINHO",
  "👸 RAINHA",
  "⛰️ MONTANHA",
  "👂 ORELHA",
);

export const ENCONTROS = grupo(
  "⭐ ESTRELA",
  "📖 LIVRO",
  "🌸 FLOR",
  "🚂 TREM",
  "🚗 CARRO",
  "🚲 BICICLETA",
  "🐍 COBRA",
  "🐯 TIGRE",
  "🪐 PLANETA",
  "🐷 PORCO",
  "⛵ BARCO",
  "🦷 DENTE",
  "🐧 PINGUIM",
  "🐘 ELEFANTE",
  "🥁 TAMBOR",
);

export const S_Z = grupo(
  "🏠 CA[S|Z]A",
  "🌹 RO[S|Z]A",
  "🏺 VA[S|Z]O",
  "👕 CAMI[S|Z]A",
  "✂️ TE[S|Z]OURA",
  "👚 BLU[S|Z]A",
  "🦊 RAPO[S|Z]A",
  "🦓 [Z|S]EBRA",
  "🍚 ARRO[Z|S]",
  "👃 NARI[Z|S]",
  "🔵 A[Z|S]UL",
  "🔟 DE[Z|S]",
);

export const X_CH = grupo(
  "🍍 ABACA[X|CH]I",
  "🐟 PEI[X|CH]E",
  "📦 CAI[X|CH]A",
  "🗑️ LI[X|CH]O",
  "🟣 RO[X|CH]O",
  "♟️ [X|CH]ADREZ",
  "🔑 [CH|X]AVE",
  "🌧️ [CH|X]UVA",
  "🎩 [CH|X]APEU",
  "🍫 [CH|X]OCOLATE",
  "🐶 CA[CH|X]ORRO",
  "🎒 MO[CH|X]ILA",
  "🍪 BOLA[CH|X]A",
  "🚤 LAN[CH|X]A",
  "🪓 MA[CH|X]ADO",
);

export const C_SS = grupo(
  "🤡 PALHA[Ç|SS]O",
  "🎀 LA[Ç|SS]O",
  "💪 BRA[Ç|SS]O",
  "🏆 TA[Ç|SS]A",
  "🐆 ON[Ç|S]A",
  "👖 CAL[Ç|S]A",
  "⚖️ BALAN[Ç|S]A",
  "🐦 PA[SS|Ç]ARO",
  "🦴 O[SS|Ç]O",
  "🧹 VA[SS|Ç]OURA",
  "🍝 MA[SS|Ç]A",
  "🍑 PE[SS|Ç]EGO",
  "🧭 BU[SS|Ç]OLA",
  "🌻 GIRA[SS|Ç]OL",
  "🦕 DINO[SS|Ç]AURO",
);

// Antes de E e I, G e J soam igual. As outras ficam para a criança não concluir que é sempre G.
export const G_J = grupo(
  "🦒 [G|J]IRAFA",
  "🧊 [G|J]ELO",
  "🥣 TI[G|J]ELA",
  "⏰ RELO[G|J]IO",
  "🚙 [J|G]IPE",
  "🍆 BERIN[J|G]ELA",
  "🍊 LARAN[J|G]A",
  "🧀 QUEI[J|G]O",
  "🐊 [J|G]ACARE",
  "🐞 [J|G]OANINHA",
  "🧱 TI[J|G]OLO",
  "💎 [J|G]OIA",
);

export const TIL = grupo(
  "✋ M[Ã|A]O",
  "🦁 LE[Ã|A]O",
  "✈️ AVI[Ã|A]O",
  "🚚 CAMINH[Ã|A]O",
  "🎈 BAL[Ã|A]O",
  "🍋 LIM[Ã|A]O",
  "🍈 MEL[Ã|A]O",
  "🌋 VULC[Ã|A]O",
  "🐉 DRAG[Ã|A]O",
  "❤️ CORA[Ç|SS][Ã|A]O",
  "🍎 MA[Ç|SS]Ã",
);

export const TODAS = [...CURTAS, ...LONGAS, ...NH_LH, ...ENCONTROS, ...S_Z, ...X_CH, ...C_SS, ...G_J, ...TIL];
