// Catálogo dos jogos, fonte única dos textos de cada um. É lido só no build, e não
// importe daqui no navegador: isso levaria os textos de todos para cada jogo.
// O id é a chave do progresso e o caminho da página: não mude depois de publicado.
type Jogo = {
  id: string;
  nome: string;
  cor: string;
  // Cartão da página inicial.
  frase: string;
  // Tela inicial do jogo.
  comoJogar: string;
  // Busca e compartilhamento.
  descricao: string;
  // Página dos responsáveis: só para adultos, nunca em texto que a criança lê.
  pratica: string;
};

export const JOGOS = [
  {
    id: "monstrinho",
    nome: "Monstrinho Guloso",
    cor: "#18b67e",
    frase: "Ele está morrendo de fome, mas é bem exigente. Dê a comida na medida certa!",
    comoJogar: "Toque na comida que cai do céu e encha a barriga dele na medida certa. Se passar, ele passa mal!",
    descricao: "Alimente o monstrinho guloso na medida certa. Jogo online grátis para crianças.",
    pratica:
      "Soma e cálculo mental. Para encher a barriga na medida exata, a criança soma de cabeça e calcula quanto falta, com a comida caindo e o tempo correndo.",
  },
  {
    id: "robo",
    nome: "Robô Turbo",
    cor: "#2f7bff",
    frase: "Corra pela rua, derrote os monstros e guarde seus golpes mais fortes para o chefão!",
    comoJogar:
      "Derrube a defesa dos monstros com seus poderes. Cada golpe gasta uma carga, e o que passar da defesa é desperdiçado. Guarde os golpes fortes para o chefão!",
    descricao:
      "Ajude o robozinho a derrotar os monstros guardando os golpes mais fortes para o chefão. Jogo online grátis para crianças.",
    pratica:
      "Soma, subtração e planejamento. Sem relógio, a criança olha os monstros que vêm aí, combina os golpes para gastar o mínimo e aprende a poupar agora para vencer depois.",
  },
  {
    id: "submarino",
    nome: "Submarino Caça-Tesouro",
    cor: "#0e8fb8",
    frase: "Monte a rota, aperte Vai! e veja se o submarino acha todos os tesouros do fundo do mar.",
    comoJogar:
      "Monte a rota com as cartas e aperte Vai! O submarino faz tudo sozinho: pegue todos os tesouros sem bater nas pedras. Deu errado? Conserte a rota e tente de novo.",
    descricao:
      "Monte a rota do submarino com cartas e ache todos os tesouros do fundo do mar. Jogo online grátis para crianças.",
    pratica:
      "Lógica e pensamento computacional. Sem relógio, a criança planeja uma sequência de passos, encontra e conserta o próprio erro e, nas fases seguintes, descobre repetições, sub-rotinas e condições, as mesmas ideias usadas em programação.",
  },
] as const satisfies readonly Jogo[];

export type JogoId = (typeof JOGOS)[number]["id"];
