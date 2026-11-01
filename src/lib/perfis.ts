// Lista fechada: os ids precisam ser iguais aos de perfilValido em firestore.rules.
export const AVATARES = [
  { id: "raposa", emoji: "🦊", nome: "Raposa" },
  { id: "panda", emoji: "🐼", nome: "Panda" },
  { id: "sapo", emoji: "🐸", nome: "Sapo" },
  { id: "polvo", emoji: "🐙", nome: "Polvo" },
  { id: "leao", emoji: "🦁", nome: "Leão" },
  { id: "coala", emoji: "🐨", nome: "Coala" },
  { id: "pinguim", emoji: "🐧", nome: "Pinguim" },
  { id: "tigre", emoji: "🐯", nome: "Tigre" },
];

export const MAX_PERFIS = 6;

export const avatarDe = (id: string) => AVATARES.find((avatar) => avatar.id === id) ?? AVATARES[0];
