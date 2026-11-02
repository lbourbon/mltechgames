// Tudo o que os monstrinhos sabem pedir, sem DOM. A fase é a primeira em que a palavra
// aparece, e é dela que sai o painel de novidades da cozinha.
export const CORES = { red: "#ff5a5f", blue: "#2f7bff", yellow: "#ffc933", green: "#18b67e" };
export const FORMAS = ["balloon", "shirt", "cup"] as const;

export type Cor = keyof typeof CORES;
export type Forma = (typeof FORMAS)[number];
export type Grupo = "fruta" | "comida" | "bebida" | "roupa" | "mesa" | "brinquedo" | "casa" | "cor" | "natureza";
export type Item = {
  id: string;
  en: string;
  // Sem plural, a palavra não se conta: pede "some", nunca "two".
  plural?: string;
  artigo: "a" | "an" | "some";
  fase: number;
  grupo: Grupo;
  emoji?: string;
  forma?: Forma;
  cor?: Cor;
};
// Quando o monstrinho só conta o que está acontecendo, ou descreve o que quer.
export type Charada = { frase: string; aceita: string[] };

const conta = (en: string, emoji: string, fase: number, grupo: Grupo, plural = `${en}s`): Item => ({
  id: en,
  en,
  plural,
  artigo: /^[aeiou]/.test(en) ? "an" : "a",
  fase,
  grupo,
  emoji,
});

const massa = (en: string, emoji: string, fase: number, grupo: Grupo): Item => ({
  id: en,
  en,
  artigo: "some",
  fase,
  grupo,
  emoji,
});

const FASE_DAS_CORES = 5;

const colorido = (cor: Cor, forma: Forma): Item => ({
  ...conta(`${cor} ${forma}`, "", FASE_DAS_CORES, "cor"),
  emoji: undefined,
  forma,
  cor,
});

export const ITENS: Item[] = [
  conta("apple", "🍎", 1, "fruta"),
  conta("banana", "🍌", 1, "fruta"),
  conta("pizza", "🍕", 1, "comida"),
  conta("cake", "🍰", 1, "comida"),
  conta("egg", "🥚", 1, "comida"),
  massa("milk", "🥛", 1, "bebida"),

  massa("water", "💧", 2, "bebida"),
  massa("juice", "🧃", 2, "bebida"),
  massa("bread", "🍞", 2, "comida"),
  massa("cheese", "🧀", 2, "comida"),

  conta("sock", "🧦", 3, "roupa"),
  conta("hat", "🎩", 3, "roupa"),
  conta("shoe", "👟", 3, "roupa"),
  conta("ball", "⚽", 3, "brinquedo"),
  conta("spoon", "🥄", 3, "mesa"),
  conta("fork", "🍴", 3, "mesa"),

  conta("cookie", "🍪", 4, "comida"),
  conta("carrot", "🥕", 4, "fruta"),
  conta("tomato", "🍅", 4, "fruta", "tomatoes"),
  conta("strawberry", "🍓", 4, "fruta", "strawberries"),

  ...(Object.keys(CORES) as Cor[]).flatMap((cor) => FORMAS.map((forma) => colorido(cor, forma))),

  massa("soup", "🍲", 6, "comida"),
  massa("rice", "🍚", 6, "comida"),
  massa("chicken", "🍗", 6, "comida"),
  conta("ice cream", "🍦", 6, "comida"),
  conta("burger", "🍔", 6, "comida"),

  conta("orange", "🍊", 7, "fruta"),
  conta("lemon", "🍋", 7, "fruta"),
  conta("pear", "🍐", 7, "fruta"),
  conta("watermelon", "🍉", 7, "fruta"),

  conta("book", "📖", 8, "casa"),
  conta("pencil", "✏️", 8, "casa"),
  conta("key", "🔑", 8, "casa"),
  conta("clock", "⏰", 8, "casa"),

  conta("umbrella", "☂️", 9, "casa"),
  conta("coat", "🧥", 9, "roupa"),
  conta("flashlight", "🔦", 9, "casa"),
  massa("soap", "🧼", 9, "casa"),

  conta("bed", "🛏️", 10, "casa"),
  conta("teddy bear", "🧸", 10, "brinquedo"),
  conta("guitar", "🎸", 10, "brinquedo"),

  conta("peach", "🍑", 11, "fruta", "peaches"),
  conta("donut", "🍩", 11, "comida"),
  massa("popcorn", "🍿", 11, "comida"),

  conta("camera", "📷", 12, "casa"),
  conta("phone", "📱", 12, "casa"),
  conta("robot", "🤖", 12, "brinquedo"),

  conta("pineapple", "🍍", 13, "fruta"),
  conta("mushroom", "🍄", 13, "comida"),
  massa("honey", "🍯", 13, "comida"),

  conta("crown", "👑", 14, "roupa"),
  conta("backpack", "🎒", 14, "roupa"),
  conta("drum", "🥁", 14, "brinquedo"),

  conta("flower", "🌸", 15, "natureza"),
  conta("tree", "🌳", 15, "natureza"),
  conta("star", "⭐", 15, "natureza"),

  conta("car", "🚗", 16, "brinquedo"),
  conta("bicycle", "🚲", 16, "brinquedo"),
  conta("moon", "🌙", 16, "natureza"),
];

export const ITEM: Record<string, Item> = Object.fromEntries(ITENS.map((item) => [item.id, item]));

export const NECESSIDADES: Charada[] = [
  { frase: "I'm thirsty!", aceita: ["water", "juice", "milk"] },
  { frase: "It's raining!", aceita: ["umbrella"] },
  { frase: "I'm cold!", aceita: ["coat"] },
  { frase: "It's so dark in here!", aceita: ["flashlight"] },
  { frase: "My hands are dirty!", aceita: ["soap"] },
  { frase: "I'm so sleepy...", aceita: ["bed", "teddy bear"] },
  { frase: "The door is locked!", aceita: ["key"] },
  { frase: "I want to write a letter.", aceita: ["pencil"] },
  { frase: "I want to read a story.", aceita: ["book"] },
  { frase: "It's my birthday!", aceita: ["cake"] },
  { frase: "My feet are cold!", aceita: ["sock"] },
  { frase: "I have soup, but I can't eat it!", aceita: ["spoon"] },
  { frase: "What time is it?", aceita: ["clock"] },
  { frase: "It's very hot today!", aceita: ["ice cream", "water"] },
];

export const ADIVINHAS: Charada[] = [
  { frase: "It's yellow and long. Monkeys love it.", aceita: ["banana"] },
  { frase: "It's round and you kick it.", aceita: ["ball"] },
  { frase: "It's cold and sweet.", aceita: ["ice cream"] },
  { frase: "It's white and it comes from a cow.", aceita: ["milk"] },
  { frase: "You wear it on your head.", aceita: ["hat"] },
  { frase: "You wear it on your foot.", aceita: ["sock", "shoe"] },
  { frase: "It's orange and rabbits love it.", aceita: ["carrot"] },
  { frase: "It's green outside and red inside.", aceita: ["watermelon"] },
  { frase: "You eat soup with it.", aceita: ["spoon"] },
  { frase: "It's red and it grows on a tree.", aceita: ["apple"] },
  { frase: "It opens a door.", aceita: ["key"] },
  { frase: "It tells you the time.", aceita: ["clock"] },
  { frase: "It comes from a chicken.", aceita: ["egg"] },
  { frase: "You read it.", aceita: ["book"] },
  { frase: "You write with it.", aceita: ["pencil"] },
  { frase: "It's hot and it has cheese on top.", aceita: ["pizza"] },
];
