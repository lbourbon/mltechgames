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
  {
    id: "boiada",
    nome: "Boiada do Xerife",
    cor: "#d9772b",
    frase: "A carroça atolou! Escolha as porteiras certas e junte uma boiada forte para tirá-la do barro.",
    comoJogar:
      "A carroça atolou no fim da estrada. Toque em uma porteira para a boiada seguir por ali. A porteira que você não escolher continua no caminho, então a ordem faz diferença!",
    descricao:
      "Escolha as porteiras e junte uma boiada grande para tirar a carroça do barro. Jogo online grátis para crianças.",
    pratica:
      "Multiplicação, divisão e cálculo mental. Sem relógio, a criança compara o que cada porteira rende e descobre que a ordem muda o resultado: somar antes de multiplicar dá mais, a ideia por trás da ordem das operações.",
  },
  {
    id: "salto",
    nome: "Salto Lunar",
    cor: "#5b4bc4",
    frase: "As pedras da Lua se escondem no escuro. Estique o elástico e pule bem em cima delas!",
    comoJogar:
      "As pedras se escondem no escuro, e a régua só mostra as pontas. Veja o número da pedra, arraste o dedo para esticar o elástico e solte onde você acha que ela está. Longe demais, é cratera!",
    descricao:
      "Ajude o astronauta a pular nas pedras escondidas da régua da Lua. Jogo online grátis para crianças.",
    pratica:
      "Reta numérica, estimativa e noção de grandeza. Sem relógio, a criança vê um número e decide onde ele fica entre as pontas da régua, usando as pedras que já alcançou como referência. A sombra mostra o pouso exato, então o desafio é saber onde fica o número, e não acertar a força. As fases seguintes trazem régua até 1000, frações, decimais e números negativos.",
  },
  {
    id: "garcom",
    nome: "Garçom dos Monstrinhos",
    cor: "#e8603c",
    frase: "Os monstrinhos chegaram com fome e só falam inglês! Entenda o pedido e sirva a mesa.",
    comoJogar:
      "Os monstrinhos só falam inglês, e comem de tudo! Leia o pedido, toque no que ele quer para pôr na bandeja e aperte o sino para servir. Serviu errado? Ele cospe!",
    descricao:
      "Entenda os pedidos em inglês e sirva os monstrinhos famintos do restaurante. Jogo online grátis para crianças.",
    pratica:
      "Inglês: vocabulário e leitura. Sem relógio, a criança lê o pedido e monta a bandeja. As fases vão de palavras soltas a quantidades, cores, negação, ordem, pedidos que mudam no meio e frases em que é preciso entender a situação, como descobrir que It's raining! pede um guarda-chuva. As palavras novas aparecem com desenho no começo da fase, e depois a criança precisa reconhecê-las sozinha. Precisa de quem já lê.",
  },
  {
    id: "minhoca",
    nome: "Minhoca Letrada",
    cor: "#d4547a",
    frase: "A minhoca está com fome de letras! Veja o desenho e coma a palavra inteira, na ordem certa.",
    comoJogar:
      "Olhe o desenho, pense na palavra e toque nas letras para a minhoca comer, uma de cada vez e na ordem certa. Arraste o dedo para guiar a minhoca pelo jardim!",
    descricao:
      "Guie a minhoca pelo jardim e coma as letras na ordem certa para formar a palavra do desenho. Jogo online grátis para crianças.",
    pratica:
      "Alfabetização e ortografia. Sem relógio e sem narração, a criança vê um desenho, pensa na palavra e procura as letras na ordem. As fases vão de palavras curtas com a escrita à vista até as armadilhas do português: S ou Z, X ou CH, Ç ou SS, G ou J e o til. Depois de um erro, a letra certa aparece, e a palavra volta na fase seguinte. Precisa de quem já conhece as letras.",
  },
  {
    id: "cerca",
    nome: "Cerca na Medida",
    cor: "#4f9e4a",
    frase: "Os bichos escaparam e o pasto virou bagunça! Cerque cada um no tamanho que a plaquinha pede.",
    comoJogar:
      "Cada bicho tem uma plaquinha dizendo de quantos quadradinhos precisa. Arraste o dedo pelo pasto para cercar cada um na medida, até não sobrar pasto. Cercou no lugar errado? Toque na cerca para abrir.",
    descricao:
      "Cerque cada bicho no tamanho exato até organizar o pasto inteiro. Jogo online grátis para crianças.",
    pratica:
      "Multiplicação como área, divisores e decomposição. Sem relógio, a criança vê que 12 pode ser 3 × 4, 2 × 6 ou 1 × 12 e deduz qual desses formatos cabe em cada lugar. Enquanto arrasta, a tela mostra só os lados da cerca, então é ela quem faz a conta. Toda fase se resolve pensando, sem precisar chutar.",
  },
  {
    id: "luz",
    nome: "Liga a Luz",
    cor: "#3d3a9e",
    frase: "Apagão na vila! Gire os fios, ligue a usina a todas as casas e veja tudo acender.",
    comoJogar:
      "A vila está no escuro. Toque nos fios para girar e ligue a usina a todas as casas. Quando o caminho fechar, a corrente corre e as janelas acendem!",
    descricao:
      "Gire os fios e leve a energia da usina a todas as casas da vila. Jogo online grátis para crianças.",
    pratica:
      "Circuitos, raciocínio espacial e planejamento. Sem relógio, a criança imagina para onde cada peça vai apontar antes de girar, porque os toques são contados depois das primeiras fases. Mais adiante entram a fábrica, que só liga com dois fios ao mesmo tempo, e a bateria, que aguenta um número certo de casas.",
  },
  {
    id: "pizza",
    nome: "Pizzaria Maluca",
    cor: "#d8402b",
    frase: "Os clientes pedem pizzas malucas! Corte, cubra as fatias com os sabores certos e toque o sino.",
    comoJogar:
      "Leia o pedido, corte a pizza, escolha o sabor e passe o dedo nas fatias. Se o cliente pediu 1/2 verde, metade da pizza precisa ser verde! Depois toque o sino para servir.",
    descricao:
      "Corte a pizza e cubra as fatias na medida exata do pedido de cada cliente. Jogo online grátis para crianças.",
    pratica:
      "Frações. Sem relógio, a criança lê um pedido como 1/2 verde + 1/4 vermelha, corta a pizza e cobre as fatias. O número de baixo vira o corte, e o de cima, as fatias cobertas. Para duas frações na mesma pizza, ela procura um corte que sirva para as duas, a ideia por trás do denominador comum. Depois vêm o resto da pizza, frações equivalentes, como 4/8 e 1/2, e pedidos com três sabores. Precisa de quem já lê.",
  },
  {
    id: "torta",
    nome: "O Sumiço da Torta",
    cor: "#b5487a",
    frase: "Alguém comeu a torta da cidade! Leia as pistas do xerife e descubra quem foi.",
    comoJogar:
      "Alguém comeu a torta! Leia a pista do xerife e toque em quem ela livra para tirar da fila. Cuidado: soltar alguém que as pistas ainda não livram dá confusão!",
    descricao: "Leia as pistas do xerife e descubra quem comeu a torta. Jogo online grátis para crianças.",
    pratica:
      "Interpretação de texto e dedução. Sem relógio, a criança lê cada pista e decide quem ela deixa de fora, com atenção a palavras como não, e, mas, ou e ao lado. Soltar alguém que as pistas ainda não livram custa um coração, então chutar não funciona. Mais adiante, várias pistas chegam juntas e é preciso conferir cada suspeito com todas. Precisa de quem já lê.",
  },
  {
    id: "passarinhos",
    nome: "Passarinhos no Fio",
    cor: "#2a9d8f",
    frase: "Ouça a canção do bando e pouse cada passarinho no fio certo para cantar igualzinho.",
    comoJogar:
      "Toque em Ouvir para escutar a canção. Depois toque nos fios para pousar os passarinhos: quanto mais alto o fio, mais fina a nota. Quando achar que ficou igual, toque em Cantar!",
    descricao: "Ouça a canção e pouse os passarinhos nos fios para cantar igual. Jogo online grátis para crianças.",
    pratica:
      "Percepção musical e memória auditiva. Sem relógio, a criança ouve uma melodia curta e compara cada nota com a primeira, que já vem pousada, para decidir se a próxima sobe, desce ou repete. Os fios funcionam como uma pauta: quanto mais alto o fio, mais aguda a nota, o primeiro passo para ler música. Depois entram notas mais próximas, canções mais longas e pausas. Precisa do som ligado.",
  },
  {
    id: "carteiro",
    nome: "Carteiro Espacial",
    cor: "#24305e",
    frase: "Mire e solte! A gravidade dos planetas entorta o caminho dos pacotes pelo espaço.",
    comoJogar:
      "Arraste o dedo para mirar e solte para lançar o pacote. Quanto mais longe o dedo, mais forte. Os planetas puxam o pacote pelo caminho, e o rastro fica na tela para você acertar na próxima.",
    descricao: "Entregue pacotes pelo Sistema Solar usando a gravidade dos planetas. Jogo online grátis para crianças.",
    pratica:
      "Gravidade, trajetórias e Sistema Solar. Sem relógio, a criança mira, vê o caminho que o pacote fez e ajusta a próxima tentativa. Ela descobre que os planetas maiores puxam mais e que dá para usar esse puxão para fazer curvas. Cada planeta novo chega com um fato real sobre ele.",
  },
  {
    id: "caminhao",
    nome: "Caminhãozinho do Brasil",
    cor: "#d08a00",
    frase: "Leve as encomendas de estado em estado pelo mapa do Brasil, sem deixar o combustível acabar.",
    comoJogar:
      "Toque em um estado vizinho para o caminhão andar até ele. Pegue as encomendas e entregue no destino antes de o combustível acabar: cada estado gasta um tanque!",
    descricao:
      "Dirija o caminhão pelo mapa do Brasil e entregue as encomendas de cada estado. Jogo online grátis para crianças.",
    pratica:
      "Geografia do Brasil: estados, siglas, vizinhos, regiões e capitais. Sem relógio, a criança planeja o caminho mais curto de vizinho em vizinho, porque o combustível é contado. Nas primeiras fases os estados aparecem com a sigla. Depois as siglas somem e os pedidos passam a citar capitais, então é preciso saber onde cada lugar fica. Precisa de quem já lê.",
  },
] as const satisfies readonly Jogo[];

export type JogoId = (typeof JOGOS)[number]["id"];
