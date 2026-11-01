import { defineConfig } from "astro/config";

export default defineConfig({
  // O build de teste aponta para os emuladores: fica fora de dist/ para nunca ser publicado.
  outDir: process.env.PUBLIC_EMULADOR ? "./.dist-e2e" : "./dist",
  devToolbar: { enabled: false },
});
