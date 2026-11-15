// A oficina dos duendes: trenós, melhorias e pinturas, compradas com as moedas das entregas.
// Velocidades em unidades da cena por segundo (a cena tem 100 de altura).

export type Treno = {
  nome: string;
  preco: number;
  // Quanto o trenó anda sozinho, sem nenhuma rena.
  base: number;
  cor: string;
};

const LISTA = {
  madeira: { nome: "Trenó de Madeira", preco: 0, base: 5.5, cor: "#c98a4b" },
  classico: { nome: "Trenó Clássico", preco: 150, base: 7, cor: "#e23b3b" },
  dourado: { nome: "Trenó Dourado", preco: 400, base: 8.5, cor: "#f2b632" },
  foguete: { nome: "Trenó Foguete", preco: 900, base: 10.5, cor: "#4fa3e8" },
} satisfies Record<string, Treno>;

export type TrenoId = keyof typeof LISTA;
export const TRENOS: Record<TrenoId, Treno> = LISTA;
export const MODELOS = Object.keys(TRENOS) as TrenoId[];

export type Melhoria = { nome: string; texto: string; precos: number[] };

export const MELHORIAS = {
  saco: { nome: "Saco maior", texto: "Cabem mais presentes.", precos: [100, 250, 500] },
  renas: { nome: "Renas fortes", texto: "As renas crescem e puxam mais rápido.", precos: [120, 300, 600] },
} satisfies Record<string, Melhoria>;

export type MelhoriaId = keyof typeof MELHORIAS;
export const MELHORIAS_IDS = Object.keys(MELHORIAS) as MelhoriaId[];

// Por nível da melhoria, do 0 ao último.
export const PRESENTES_NO_SACO = [14, 18, 23, 30];
// Quanto cada rena soma à velocidade, e o tamanho dela no desenho.
export const FORCA_DA_RENA = [1, 1.2, 1.4, 1.6];
export const TAMANHO_DA_RENA = [1, 1.1, 1.2, 1.3];

// Pintar é de graça: é só para o trenó ficar com a cara de quem joga.
export const PINTURAS = ["#e23b3b", "#c98a4b", "#f2b632", "#4fa3e8", "#18b67e", "#a45cff", "#ff8ac2", "#f4f1ff", "#3a3350"];
