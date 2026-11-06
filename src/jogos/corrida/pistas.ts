// Pistas desenhadas como polígonos de cantos arredondados, numa área fixa que o SVG escala
// para a tela. Sem DOM: a lógica e os testes medem tudo em unidades desta área.
export const LARGURA = 360;
export const ALTURA = 440;
export const MEIA_PISTA = 28;
// O muro fica até esta distância do meio da pista, com grama entre ele e o asfalto.
const MURO_DESEJADO = 50;
// Entre trechos longe na volta sempre sobra um vão entre os muros: o carro nunca pula de um
// para o outro. Trechos mais perto que isto podem dividir a grama, porque cortar entre eles
// encurta pouco e a volta continua contando (SALTO_MAXIMO em logica.ts).
const VAO_ENTRE_MUROS = 10;
export const LONGE_NA_VOLTA = 160;
const PASSO_DESEJADO = 4;
const PASSO_FINO = 0.5;
const SALTO_DA_BUSCA = 4;

export type Ponto = { x: number; y: number };
// Canto [x, y, raio]. As retas ligam um canto ao próximo, e a largada fica no meio da primeira.
type Canto = [number, number, number];
type Molde = { cantos: Canto[]; montes: number[] };

export type Pista = {
  // Amostras da linha do meio, igualmente espaçadas, na ordem em que se corre.
  pontos: Ponto[];
  tangentes: Ponto[];
  // Quanto a pista curva em cada amostra, em radianos por unidade.
  curvas: number[];
  n: number;
  passo: number;
  comprimento: number;
  // Amostra do meio de cada reta que recebe um par de montes de dinheiro.
  montes: number[];
  // Distância do meio da pista até o muro, a mesma em toda a volta.
  muro: number;
};

// Os montes só vão em retas longas, com espaço dos dois lados.
const MOLDES: Molde[] = [
  // Oval
  {
    cantos: [
      [62, 62, 56],
      [298, 62, 56],
      [298, 378, 56],
      [62, 378, 56],
    ],
    montes: [1, 3],
  },
  // Feijão: a direita entra para dentro.
  {
    cantos: [
      [62, 62, 56],
      [298, 62, 50],
      [298, 165, 36],
      [215, 165, 36],
      [215, 275, 36],
      [298, 275, 36],
      [298, 378, 50],
      [62, 378, 56],
    ],
    montes: [6, 7],
  },
  // Serpente
  {
    cantos: [
      [62, 62, 50],
      [298, 62, 44],
      [298, 160, 40],
      [170, 160, 40],
      [170, 280, 40],
      [298, 280, 40],
      [298, 378, 44],
      [62, 378, 50],
    ],
    montes: [6, 7],
  },
  // Diamante
  {
    cantos: [
      [130, 62, 50],
      [298, 62, 50],
      [298, 300, 60],
      [220, 378, 50],
      [62, 378, 50],
      [62, 140, 60],
    ],
    montes: [1, 4],
  },
  // Bota: um L de cabeça para baixo.
  {
    cantos: [
      [62, 62, 56],
      [200, 62, 50],
      [200, 220, 40],
      [298, 220, 40],
      [298, 378, 50],
      [62, 378, 50],
    ],
    montes: [4, 5],
  },
];

export const QUANTAS_PISTAS = MOLDES.length;

const sub = (a: Ponto, b: Ponto) => ({ x: a.x - b.x, y: a.y - b.y });
const soma = (a: Ponto, b: Ponto, k = 1) => ({ x: a.x + b.x * k, y: a.y + b.y * k });
const comprimentoDe = (a: Ponto) => Math.hypot(a.x, a.y);
const unitario = (a: Ponto) => {
  const c = comprimentoDe(a) || 1;
  return { x: a.x / c, y: a.y / c };
};
export const distancia = (a: Ponto, b: Ponto) => Math.hypot(a.x - b.x, a.y - b.y);

function reta(de: Ponto, ate: Ponto, saida: Ponto[]) {
  const passos = Math.max(1, Math.ceil(distancia(de, ate) / PASSO_FINO));
  for (let i = 0; i < passos; i++) saida.push(soma(de, sub(ate, de), i / passos));
}

// Desenha o caminho fino: de uma reta à outra, cada canto vira um arco do seu raio.
function caminhoFino(cantos: Canto[]) {
  const vertices = cantos.map(([x, y]) => ({ x, y }));
  const k = vertices.length;
  const arcos = vertices.map((v, i) => {
    const anterior = vertices[(i - 1 + k) % k];
    const proximo = vertices[(i + 1) % k];
    const d1 = unitario(sub(v, anterior));
    const d2 = unitario(sub(proximo, v));
    const giro = Math.atan2(d1.x * d2.y - d1.y * d2.x, d1.x * d2.x + d1.y * d2.y);
    const raio = cantos[i][2];
    const recuo = raio * Math.tan(Math.abs(giro) / 2);
    const inicio = soma(v, d1, -recuo);
    // Com y para baixo, giro positivo é curva para a direita, e o centro fica desse lado.
    const lado = giro > 0 ? { x: -d1.y, y: d1.x } : { x: d1.y, y: -d1.x };
    const centro = soma(inicio, lado, raio);
    return { inicio, fim: soma(v, d2, recuo), centro, raio, giro };
  });

  const fino: Ponto[] = [];
  // Cada reta termina onde começa o arco do canto seguinte, que vem logo depois dela.
  const largada = soma(vertices[0], sub(vertices[1], vertices[0]), 0.5);
  const meios: number[] = [];
  for (let i = 0; i < k; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % k];
    const de = i === 0 ? largada : arcos[i].fim;
    const ate = arcos[(i + 1) % k].inicio;
    const meio = soma(a, sub(b, a), 0.5);
    meios.push(fino.length + Math.round(distancia(de, meio) / PASSO_FINO));
    reta(de, ate, fino);
    const { centro, raio, giro, inicio } = arcos[(i + 1) % k];
    const angulo0 = Math.atan2(inicio.y - centro.y, inicio.x - centro.x);
    const passos = Math.max(1, Math.ceil((raio * Math.abs(giro)) / PASSO_FINO));
    for (let j = 0; j < passos; j++) {
      const angulo = angulo0 + (giro * j) / passos;
      fino.push({ x: centro.x + raio * Math.cos(angulo), y: centro.y + raio * Math.sin(angulo) });
    }
  }
  // A primeira reta começou no meio: falta a metade de antes da largada.
  meios[0] = 0;
  reta(arcos[0].fim, largada, fino);
  return { fino, meios };
}

export function montarPista(numero: number, espelhada = false): Pista {
  const molde = MOLDES[numero % MOLDES.length];
  // Espelhar inverte o sentido da corrida, e a pista parece outra.
  const cantos = molde.cantos.map(([x, y, r]): Canto => [espelhada ? LARGURA - x : x, y, r]);
  const { fino, meios } = caminhoFino(cantos);

  const acumulado = [0];
  for (let i = 1; i <= fino.length; i++) {
    acumulado.push(acumulado[i - 1] + distancia(fino[i - 1], fino[i % fino.length]));
  }
  const comprimento = acumulado[fino.length];
  const n = Math.round(comprimento / PASSO_DESEJADO);
  const passo = comprimento / n;

  const pontos: Ponto[] = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const alvo = i * passo;
    while (acumulado[j + 1] < alvo) j++;
    const parte = (alvo - acumulado[j]) / (acumulado[j + 1] - acumulado[j] || 1);
    pontos.push(soma(fino[j], sub(fino[(j + 1) % fino.length], fino[j]), parte));
  }

  const tangentes = pontos.map((_, i) => unitario(sub(pontos[(i + 1) % n], pontos[(i - 1 + n) % n])));
  const curvas = tangentes.map((_, i) => {
    const a = tangentes[(i - 1 + n) % n];
    const b = tangentes[(i + 1) % n];
    return Math.abs(Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y)) / (2 * passo);
  });
  const montes = molde.montes.map((reta) => Math.round(acumulado[meios[reta]] / passo) % n);
  return { pontos, tangentes, curvas, n, passo, comprimento, montes, muro: medirMuro(pontos, passo) };
}

// O muro vai o mais longe possível sem encostar no muro de outro trecho da pista.
function medirMuro(pontos: Ponto[], passo: number) {
  const n = pontos.length;
  let menor = Infinity;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.min(j - i, n - (j - i)) * passo < LONGE_NA_VOLTA) continue;
      menor = Math.min(menor, distancia(pontos[i], pontos[j]));
    }
  }
  return Math.min(MURO_DESEJADO, Math.floor((menor - VAO_ENTRE_MUROS) / 2));
}

// Lado direito de quem corre: com y para baixo, é a tangente girada 90° no sentido horário.
export const normal = (pista: Pista, i: number): Ponto => {
  const t = pista.tangentes[indice(pista, i)];
  return { x: -t.y, y: t.x };
};

export const indice = (pista: Pista, i: number) => ((Math.round(i) % pista.n) + pista.n) % pista.n;

// Ponto da pista na amostra i (pode ser fracionária), deslocado para o lado.
export function pontoNaPista(pista: Pista, i: number, lado = 0): Ponto {
  const { n, pontos } = pista;
  const base = Math.floor(i);
  const parte = i - base;
  const a = pontos[((base % n) + n) % n];
  const b = pontos[(((base + 1) % n) + n) % n];
  const meio = soma(a, sub(b, a), parte);
  return soma(meio, normal(pista, i), lado);
}

// Procura de 4 em 4 amostras e depois afina em volta da melhor: roda a cada quadro.
export function maisProximo(pista: Pista, ponto: Ponto) {
  const { pontos, n } = pista;
  const longe = (i: number) => (pontos[i].x - ponto.x) ** 2 + (pontos[i].y - ponto.y) ** 2;
  let melhor = 0;
  let menor = Infinity;
  for (let i = 0; i < n; i += SALTO_DA_BUSCA) {
    const d = longe(i);
    if (d < menor) [menor, melhor] = [d, i];
  }
  const grosso = melhor;
  for (let d = 1 - SALTO_DA_BUSCA; d < SALTO_DA_BUSCA; d++) {
    const i = (grosso + d + n) % n;
    const distancia = longe(i);
    if (distancia < menor) [menor, melhor] = [distancia, i];
  }
  return { indice: melhor, distancia: Math.sqrt(menor) };
}

// Caminho SVG da linha do meio, para desenhar a pista.
export const caminhoSvg = (pista: Pista) =>
  `M${pista.pontos.map(({ x, y }) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
