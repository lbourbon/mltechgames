# TODO

## Revisão geral dos jogos: o que ficou para depois

A revisão de novembro de 2026 cuidou do que vale para todos os jogos: telas novas, caber na tela, erros e travamentos. O que ela não fez:

- [ ] Jogar cada jogo até as fases altas num celular de verdade, principalmente no Safari do iPhone: som, altura da tela com as barras do navegador e arrasto. Tudo foi conferido só no Chrome do computador, em tamanhos de celular.
- [ ] Rever o equilíbrio de cada jogo jogando. As fases e a pontuação não mudaram: continuam garantidas só pelos robôs dos testes unitários.
- [ ] Monstrinho Guloso é o jogo mais simples e o primeiro candidato a ganhar novidades nas fases altas.
- [ ] Robô Turbo: quando os golpes que sobraram já não derrubam os monstros, a criança ainda precisa gastar todos para a fase recomeçar. Avaliar encerrar antes, com uma explicação.
- [ ] Caminhãozinho: com três encomendas num celular pequeno o mapa fica com uns 300 px. Avaliar um pedido mais curto ou esconder a frase de baixo.
- [ ] As estrelas da fase só aparecem na tela de fase completa. Guardá-las pediria um campo novo no progresso e nas regras do Firestore.
- [ ] Se o site ganhar domínio próprio, trocar `site` em `astro.config.mjs`.
- [ ] Trocar a capa de um jogo ou o nome dele pede rodar `node scripts/imagens.mjs` de novo.

## Pendências legais

- [ ] Preencher `CONTATO` em `src/lib/site.ts` com um e-mail público, para aparecer na página "Para responsáveis".
- [ ] Revisar com um advogado se a conta do adulto com perfis atende ao art. 24 do ECA Digital (Lei 15.211/2025).
- [ ] Revisar com um advogado se o site precisa de limite de tempo e relatório de uso para os pais (arts. 17 e 18). Essas obrigações variam com o porte do serviço.
