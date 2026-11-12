import { defineConfig } from "astro/config";

export default defineConfig({
  // Endereço público, para os links absolutos que o compartilhamento e o sitemap exigem.
  site: "https://mltechgames.mltechgames.workers.dev",
  // O build de teste aponta para os emuladores: fica fora de dist/ para nunca ser publicado.
  outDir: process.env.PUBLIC_EMULADOR ? "./.dist-e2e" : "./dist",
  devToolbar: { enabled: false },
});
