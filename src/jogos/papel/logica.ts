// Regras do jogo, sem DOM, para serem testadas com Vitest.
import { embaralhar, sortear, type Rng } from "../kit/sorteio";

export const VIDAS_INICIAIS = 3;
// Até aqui abrir um papel diferente do molde não custa coração.
export const ULTIMA_FASE_MANSA = 2;

// O papel é quadrado, com lado × lado casinhas. Cada dobra é um espelho:
// V dobra a metade da direita sobre a da esquerda, H dobra a de baixo sobre a de cima e D
// dobra o triângulo de cima, à direita da diagonal, sobre o de baixo.
export type Dobra = "V" | "H" | "D";
export type Casa = { x: number; y: number };

export const espelhar = (dobra: Dobra, { x, y }: Casa, lado: number): Casa =>
  dobra === "V" ? { x: lado - 1 - x, y } : dobra === "H" ? { x, y: lado - 1 - y } : { x: y, y: x };

export const indice = ({ x, y }: Casa, lado: number) => y * lado + x;
export const casaDe = (i: number, lado: number): Casa => ({ x: i % lado, y: Math.floor(i / lado) });

// A diagonal só dobra um papel quadrado: o inteiro, ou o quarto que sobra depois de V e H.
// Depois dela o papel vira triângulo e não dobra mais.
export function podeDobrar(dobras: Dobra[], dobra: Dobra) {
  if (dobras.includes(dobra) || dobras.includes("D")) return false;
  if (dobra === "D") return dobras.length === 0 || (dobras.includes("V") && dobras.includes("H"));
  return true;
}

// As casas que ficam à vista depois das dobras: é onde a tesoura corta.
export const naDobradura = (dobras: Dobra[], { x, y }: Casa, lado: number) =>
  (!dobras.includes("V") || x < lado / 2) && (!dobras.includes("H") || y < lado / 2) && (!dobras.includes("D") || x <= y);

// Um corte atravessa todas as camadas: o furo aparece em cada espelho da casa.
export function espelhos(dobras: Dobra[], casa: Casa, lado: number) {
  const achadas = new Set([indice(casa, lado)]);
  const fila = [casa];
  while (fila.length) {
    const atual = fila.pop()!;
    for (const dobra of dobras) {
      const outra = espelhar(dobra, atual, lado);
      const i = indice(outra, lado);
      if (!achadas.has(i)) {
        achadas.add(i);
        fila.push(outra);
      }
    }
  }
  return [...achadas];
}

// Os furos do papel aberto, a partir das casas cortadas na dobradura.
export function abrir(dobras: Dobra[], cortes: number[], lado: number) {
  const furos = new Set<number>();
  for (const corte of cortes) for (const i of espelhos(dobras, casaDe(corte, lado), lado)) furos.add(i);
  return [...furos].sort((a, b) => a - b);
}

// Os grupos de dobras que dá para fazer, do jeito que podeDobrar deixa.
export const GRUPOS = ["", "V", "H", "VH", "D", "VHD"] as const;
export type Grupo = (typeof GRUPOS)[number];
export const dobrasDo = (grupo: Grupo) => [...grupo] as Dobra[];

// Os espelhos que o desenho aceita, e o maior grupo de dobras que cabe neles. É esse grupo que
// recorta o molde com menos tesouradas: dobrar menos gasta mais, dobrar errado fura demais.
export function simetriaDe(furos: number[], lado: number): Grupo {
  const conjunto = new Set(furos);
  const aceita = (dobra: Dobra) =>
    furos.every((i) => conjunto.has(indice(espelhar(dobra, casaDe(i, lado), lado), lado)));
  const [v, h, d] = (["V", "H", "D"] as const).map(aceita);
  if (v && h && d) return "VHD";
  if (v && h) return "VH";
  if (d) return "D";
  if (v) return "V";
  if (h) return "H";
  return "";
}

// Tesouradas que bastam para recortar os furos com essas dobras: uma por grupo de espelhos.
export function tesouradas(furos: number[], dobras: Dobra[], lado: number) {
  const restam = new Set(furos);
  let cortes = 0;
  for (const i of furos) {
    if (!restam.has(i)) continue;
    cortes++;
    for (const j of espelhos(dobras, casaDe(i, lado), lado)) restam.delete(j);
  }
  return cortes;
}

// Os cortes que recortam o molde: uma casa de cada grupo, dentro da dobradura.
export function cortesDoMolde(furos: number[], dobras: Dobra[], lado: number) {
  const restam = new Set(furos);
  const cortes: number[] = [];
  for (const i of furos) {
    if (!restam.has(i)) continue;
    const grupo = espelhos(dobras, casaDe(i, lado), lado);
    cortes.push(grupo.find((j) => naDobradura(dobras, casaDe(j, lado), lado))!);
    for (const j of grupo) restam.delete(j);
  }
  return cortes;
}

// O que sobra do papel precisa ficar inteiro, senão um pedaço cairia ao abrir.
export function inteiro(furos: number[], lado: number) {
  const furado = new Set(furos);
  const sobra = lado * lado - furado.size;
  const inicio = Array.from({ length: lado * lado }, (_, i) => i).find((i) => !furado.has(i));
  if (inicio === undefined) return false;
  const vistas = new Set([inicio]);
  const fila = [inicio];
  while (fila.length) {
    const { x, y } = casaDe(fila.pop()!, lado);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const vizinha = { x: x + dx, y: y + dy };
      if (vizinha.x < 0 || vizinha.y < 0 || vizinha.x >= lado || vizinha.y >= lado) continue;
      const i = indice(vizinha, lado);
      if (!furado.has(i) && !vistas.has(i)) {
        vistas.add(i);
        fila.push(i);
      }
    }
  }
  return vistas.size === sobra;
}

const SUBGRUPOS: Record<Grupo, Grupo[]> = {
  "": [],
  V: [""],
  H: [""],
  VH: ["", "V", "H"],
  D: [""],
  VHD: ["", "V", "H", "VH", "D"],
};

type Faixa = [number, number];
type Config = {
  lado: number;
  grupos: Grupo[];
  // Grupos de espelhos cortados: é o número de tesouradas com as dobras certas.
  cortes: Faixa;
  // Tesouradas além do necessário. Sem folga, só as dobras certas dão conta.
  folga: number;
  papeis: number;
};

const FASES: Config[] = [
  { lado: 6, grupos: ["V"], cortes: [2, 3], folga: 1, papeis: 2 },
  { lado: 6, grupos: ["V", "H"], cortes: [3, 3], folga: 1, papeis: 3 },
  { lado: 6, grupos: ["VH"], cortes: [2, 3], folga: 0, papeis: 3 },
  { lado: 6, grupos: ["V", "H", "VH"], cortes: [3, 4], folga: 0, papeis: 3 },
  { lado: 6, grupos: ["D"], cortes: [3, 4], folga: 0, papeis: 3 },
  { lado: 8, grupos: ["V", "H", "VH", "D"], cortes: [4, 5], folga: 0, papeis: 3 },
  { lado: 8, grupos: ["VHD"], cortes: [3, 4], folga: 0, papeis: 3 },
  { lado: 8, grupos: ["V", "H", "VH", "D", "VHD"], cortes: [4, 6], folga: 0, papeis: 4 },
];

export const configDaFase = (fase: number) => FASES[Math.min(fase, FASES.length) - 1];

// A primeira fase que pede cada dobra nova, para a tela apresentar.
export const faseQueApresenta = (grupo: Grupo) => FASES.findIndex((config) => config.grupos.includes(grupo)) + 1;

export type Molde = { lado: number; furos: number[]; grupo: Grupo; limite: number };

// O molde nasce cortando a dobradura de um grupo. O verificador exige que o desenho não aceite
// espelho além dos do grupo, que dobrar menos estoure as tesouradas e que o papel fique inteiro.
export function gerarMolde(fase: number, rng: Rng = Math.random, evitar: Grupo | null = null): Molde {
  const { lado, grupos, cortes, folga } = configDaFase(fase);
  const opcoes = grupos.length > 1 && evitar ? grupos.filter((grupo) => grupo !== evitar) : grupos;
  for (;;) {
    const grupo = opcoes[sortear(0, opcoes.length - 1, rng)];
    const dobras = dobrasDo(grupo);
    const dobradura = Array.from({ length: lado * lado }, (_, i) => i).filter((i) => naDobradura(dobras, casaDe(i, lado), lado));
    const escolhidas = embaralhar(dobradura, rng).slice(0, sortear(cortes[0], cortes[1], rng));
    const furos = abrir(dobras, escolhidas, lado);
    if (simetriaDe(furos, lado) !== grupo) continue;
    const limite = escolhidas.length + folga;
    if (SUBGRUPOS[grupo].some((menor) => tesouradas(furos, dobrasDo(menor), lado) <= limite)) continue;
    // Um furo só, ou quase tudo furado, não parece um recorte.
    if (furos.length > (lado * lado) / 3) continue;
    if (!inteiro(furos, lado)) continue;
    return { lado, furos, grupo, limite };
  }
}

export type Estado = {
  fase: number;
  vidas: number;
  pontos: number;
  molde: Molde;
  // Papéis já pendurados no varal nesta fase.
  feitos: number;
  dobras: Dobra[];
  cortes: number[];
  // Sem papel errado nem dica, vale o bônus.
  limpa: boolean;
};

export function novaFase(fase: number, vidas: number, pontos: number, rng: Rng = Math.random): Estado {
  return { fase, vidas, pontos, molde: gerarMolde(fase, rng), feitos: 0, dobras: [], cortes: [], limpa: true };
}

export const novoJogo = (fase = 1, rng: Rng = Math.random) => novaFase(fase, VIDAS_INICIAIS, 0, rng);

export const restantes = ({ molde, cortes }: Estado) => molde.limite - cortes.length;

export const papelNovo = (estado: Estado): Estado => ({ ...estado, dobras: [], cortes: [] });

export function dobrar(estado: Estado, dobra: Dobra): Estado {
  if (estado.cortes.length > 0 || !podeDobrar(estado.dobras, dobra)) return estado;
  return { ...estado, dobras: [...estado.dobras, dobra] };
}

// A casa precisa estar na dobradura, ainda inteira, e a tesoura precisa ter corte sobrando.
export function cortar(estado: Estado, casa: number): Estado {
  const { molde, dobras, cortes } = estado;
  if (restantes(estado) <= 0 || cortes.includes(casa)) return estado;
  if (!naDobradura(dobras, casaDe(casa, molde.lado), molde.lado)) return estado;
  return { ...estado, cortes: [...cortes, casa] };
}

export type Conferencia = { sobram: number[]; faltam: number[] };

// Furos a mais e furos que faltaram no papel aberto, comparado com o molde.
export function conferir({ molde, dobras, cortes }: Estado): Conferencia {
  const furos = abrir(dobras, cortes, molde.lado);
  const doMolde = new Set(molde.furos);
  const feitos = new Set(furos);
  return { sobram: furos.filter((i) => !doMolde.has(i)), faltam: molde.furos.filter((i) => !feitos.has(i)) };
}

export type Resultado = "igual" | "fase" | "diferente" | "fim";
export type Abertura = { estado: Estado; resultado: Resultado; conferencia: Conferencia };

export const pontosDoPapel = (fase: number) => 10 + fase * 5;

export function abrirPapel(estado: Estado, rng: Rng = Math.random): Abertura {
  const conferencia = conferir(estado);
  const certo = conferencia.sobram.length === 0 && conferencia.faltam.length === 0;
  if (!certo) {
    const perde = estado.fase > ULTIMA_FASE_MANSA ? 1 : 0;
    const vidas = estado.vidas - perde;
    const depois = { ...papelNovo(estado), vidas, limpa: false };
    return { estado: depois, resultado: vidas <= 0 ? "fim" : "diferente", conferencia };
  }
  const pontos = estado.pontos + pontosDoPapel(estado.fase);
  const feitos = estado.feitos + 1;
  if (feitos < configDaFase(estado.fase).papeis) {
    const molde = gerarMolde(estado.fase, rng, estado.molde.grupo);
    return { estado: { ...estado, pontos, feitos, molde, dobras: [], cortes: [] }, resultado: "igual", conferencia };
  }
  const bonus = estado.limpa ? estado.fase * 10 : 0;
  const vidas = Math.min(estado.vidas + 1, VIDAS_INICIAIS);
  return { estado: novaFase(estado.fase + 1, vidas, pontos + bonus, rng), resultado: "fase", conferencia };
}

// Faz a próxima coisa certa: desfaz dobras erradas, dobra o que falta, ou corta uma casa.
// Custa só o bônus.
export function dica(estado: Estado): Estado {
  const { molde } = estado;
  const certas = dobrasDo(molde.grupo);
  const lado = molde.lado;
  const faltam = certas.filter((dobra) => !estado.dobras.includes(dobra));
  const dobrasCertas =
    estado.dobras.every((dobra) => certas.includes(dobra)) &&
    faltam.every((dobra, i) => podeDobrar([...estado.dobras, ...faltam.slice(0, i)], dobra));
  // Cortar antes de terminar as dobras também estraga o papel: depois do corte não se dobra mais.
  const cortesCertos =
    estado.cortes.every((corte) => molde.furos.includes(corte)) && (estado.cortes.length === 0 || faltam.length === 0);
  if (!dobrasCertas || !cortesCertos) return { ...papelNovo(estado), limpa: false };
  if (faltam.length) return { ...dobrar(estado, faltam[0]), limpa: false };
  const proximo = cortesDoMolde(molde.furos, certas, lado).find(
    (corte) => !estado.cortes.some((feito) => espelhos(certas, casaDe(feito, lado), lado).includes(corte)),
  );
  if (proximo === undefined) return { ...estado, limpa: false };
  return { ...cortar(estado, proximo), limpa: false };
}
