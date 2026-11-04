// Estados do Brasil para o jogo, sem DOM. Os vizinhos foram tirados das fronteiras da malha do
// IBGE (contornos.ts), e um teste confere que a lista é simétrica.
export const SIGLAS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export type Sigla = (typeof SIGLAS)[number];
export type Regiao = "norte" | "nordeste" | "centro-oeste" | "sudeste" | "sul";

type Estado = {
  nome: string;
  // Artigo do nome: "do Pará", "da Bahia", "de Goiás".
  artigo: "o" | "a" | "";
  regiao: Regiao;
  capital: string;
  // Centro do estado no SVG, onde o caminhão para.
  centro: [number, number];
  // Onde fica a sigla, quando o centro não tem espaço.
  rotulo?: [number, number];
  vizinhos: Sigla[];
};

export const ESTADOS: Record<Sigla, Estado> = {
  AC: { nome: "Acre", artigo: "o", regiao: "norte", capital: "Rio Branco", centro: [90, 381], vizinhos: ["AM", "RO"] },
  AL: { nome: "Alagoas", artigo: "", regiao: "nordeste", capital: "Maceió", centro: [954, 389], rotulo: [1032, 398], vizinhos: ["PE", "SE", "BA"] },
  AP: { nome: "Amapá", artigo: "o", regiao: "norte", capital: "Macapá", centro: [562, 101], vizinhos: ["PA"] },
  AM: { nome: "Amazonas", artigo: "o", regiao: "norte", capital: "Manaus", centro: [238, 248], vizinhos: ["AC", "RO", "MT", "PA", "RR"] },
  BA: { nome: "Bahia", artigo: "a", regiao: "nordeste", capital: "Salvador", centro: [823, 467], vizinhos: ["SE", "AL", "PE", "PI", "TO", "GO", "MG", "ES"] },
  CE: { nome: "Ceará", artigo: "o", regiao: "nordeste", capital: "Fortaleza", centro: [877, 273], vizinhos: ["PI", "PE", "PB", "RN"] },
  DF: { nome: "Distrito Federal", artigo: "o", regiao: "centro-oeste", capital: "Brasília", centro: [668, 554], rotulo: [700, 528], vizinhos: ["GO", "MG"] },
  ES: { nome: "Espírito Santo", artigo: "o", regiao: "sudeste", capital: "Vitória", centro: [850, 654], rotulo: [905, 660], vizinhos: ["BA", "MG", "RJ"] },
  GO: { nome: "Goiás", artigo: "", regiao: "centro-oeste", capital: "Goiânia", centro: [622, 561], rotulo: [606, 592], vizinhos: ["TO", "BA", "MG", "MS", "MT", "DF"] },
  MA: { nome: "Maranhão", artigo: "o", regiao: "nordeste", capital: "São Luís", centro: [732, 272], vizinhos: ["PA", "TO", "PI"] },
  MT: { nome: "Mato Grosso", artigo: "", regiao: "centro-oeste", capital: "Cuiabá", centro: [461, 479], vizinhos: ["RO", "AM", "PA", "TO", "GO", "MS"] },
  MS: { nome: "Mato Grosso do Sul", artigo: "", regiao: "centro-oeste", capital: "Campo Grande", centro: [488, 673], vizinhos: ["MT", "GO", "MG", "SP", "PR"] },
  MG: { nome: "Minas Gerais", artigo: "", regiao: "sudeste", capital: "Belo Horizonte", centro: [748, 624], vizinhos: ["BA", "ES", "RJ", "SP", "MS", "GO", "DF"] },
  PA: { nome: "Pará", artigo: "o", regiao: "norte", capital: "Belém", centro: [534, 243], vizinhos: ["AP", "RR", "AM", "MT", "TO", "MA"] },
  PB: { nome: "Paraíba", artigo: "a", regiao: "nordeste", capital: "João Pessoa", centro: [948, 326], rotulo: [1032, 330], vizinhos: ["RN", "CE", "PE"] },
  PR: { nome: "Paraná", artigo: "o", regiao: "sul", capital: "Curitiba", centro: [571, 787], vizinhos: ["SP", "MS", "SC"] },
  PE: { nome: "Pernambuco", artigo: "", regiao: "nordeste", capital: "Recife", centro: [918, 358], rotulo: [1032, 364], vizinhos: ["PB", "CE", "PI", "BA", "AL"] },
  PI: { nome: "Piauí", artigo: "o", regiao: "nordeste", capital: "Teresina", centro: [792, 333], vizinhos: ["MA", "TO", "BA", "PE", "CE"] },
  RJ: { nome: "Rio de Janeiro", artigo: "o", regiao: "sudeste", capital: "Rio de Janeiro", centro: [799, 722], rotulo: [842, 758], vizinhos: ["ES", "MG", "SP"] },
  RN: { nome: "Rio Grande do Norte", artigo: "o", regiao: "nordeste", capital: "Natal", centro: [952, 292], rotulo: [1032, 290], vizinhos: ["CE", "PB"] },
  RS: { nome: "Rio Grande do Sul", artigo: "o", regiao: "sul", capital: "Porto Alegre", centro: [527, 920], vizinhos: ["SC"] },
  RO: { nome: "Rondônia", artigo: "", regiao: "norte", capital: "Porto Velho", centro: [284, 426], vizinhos: ["AC", "AM", "MT"] },
  RR: { nome: "Roraima", artigo: "", regiao: "norte", capital: "Boa Vista", centro: [321, 84], vizinhos: ["AM", "PA"] },
  SC: { nome: "Santa Catarina", artigo: "", regiao: "sul", capital: "Florianópolis", centro: [600, 855], vizinhos: ["PR", "RS"] },
  SP: { nome: "São Paulo", artigo: "", regiao: "sudeste", capital: "São Paulo", centro: [644, 724], vizinhos: ["MG", "RJ", "PR", "MS"] },
  SE: { nome: "Sergipe", artigo: "", regiao: "nordeste", capital: "Aracaju", centro: [933, 417], rotulo: [1000, 436], vizinhos: ["AL", "BA"] },
  TO: { nome: "Tocantins", artigo: "o", regiao: "norte", capital: "Palmas", centro: [655, 406], vizinhos: ["PA", "MA", "PI", "BA", "GO", "MT"] },
};

const CONTRACAO = { o: "do", a: "da", "": "de" } as const;
const PARA = { o: "para o", a: "para a", "": "para" } as const;

export const doEstado = (sigla: Sigla) => `${CONTRACAO[ESTADOS[sigla].artigo]} ${ESTADOS[sigla].nome}`;
export const paraOEstado = (sigla: Sigla) => `${PARA[ESTADOS[sigla].artigo]} ${ESTADOS[sigla].nome}`;
// Cidades vão sem artigo, menos o Rio de Janeiro.
export const paraACapital = (sigla: Sigla) => `para ${sigla === "RJ" ? "o " : ""}${ESTADOS[sigla].capital}`;

// O que sai de cada lugar. Só entram estados conhecidos por aquilo, e emojis antigos o bastante
// para todo aparelho desenhar.
export const CARGAS: { emoji: string; nome: string; de: Sigla }[] = [
  { emoji: "🧀", nome: "queijo", de: "MG" },
  { emoji: "🧉", nome: "erva-mate", de: "RS" },
  { emoji: "🌰", nome: "castanha", de: "PA" },
  { emoji: "🍫", nome: "cacau", de: "BA" },
  { emoji: "☕", nome: "café", de: "ES" },
  { emoji: "🍎", nome: "maçã", de: "SC" },
  { emoji: "🍍", nome: "abacaxi", de: "PB" },
  { emoji: "🐟", nome: "peixe", de: "AM" },
  { emoji: "🐄", nome: "boi", de: "MS" },
  { emoji: "🌽", nome: "milho", de: "MT" },
  { emoji: "🍯", nome: "mel", de: "PI" },
  { emoji: "🥥", nome: "coco babaçu", de: "MA" },
  { emoji: "🍊", nome: "laranja", de: "SP" },
  { emoji: "🍈", nome: "melão", de: "RN" },
  { emoji: "🍇", nome: "uva", de: "PE" },
  { emoji: "🌲", nome: "pinhão", de: "PR" },
];
