// Lista das páginas para os buscadores, gerada do catálogo no build.
import type { APIRoute } from "astro";
import { JOGOS } from "../lib/jogos";

export const GET: APIRoute = ({ site }) => {
  const caminhos = ["/", "/responsaveis/", ...JOGOS.map(({ id }) => `/jogos/${id}/`)];
  const enderecos = caminhos.map((caminho) => `  <url><loc>${new URL(caminho, site)}</loc></url>`).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${enderecos}
</urlset>
`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
