# TODO

## Para colocar no ar

- [ ] Ativar o Google em Firebase Console > Authentication > Sign-in method.
- [ ] Rodar `npx wrangler login` e depois `npm run deploy` para publicar o site na Cloudflare.
- [ ] Adicionar o domínio publicado em Firebase Console > Authentication > Settings > Authorized domains.
- [ ] Rodar `npm run deploy:regras` para publicar as regras do Firestore.
- [ ] Testar o login Google real no site publicado.

## Pendências legais

- [ ] Preencher `CONTATO` em `src/lib/site.ts` com um e-mail público, para aparecer na página "Para responsáveis".
- [ ] Revisar com um advogado se a conta do adulto com perfis atende ao art. 24 do ECA Digital (Lei 15.211/2025).
- [ ] Revisar com um advogado se o site precisa de limite de tempo e relatório de uso para os pais (arts. 17 e 18). Essas obrigações variam com o porte do serviço.
