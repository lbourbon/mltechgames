// Regiões do mapa, sem DOM. Gerado com os contornos de mapas.ts: o centro de cada país é onde o
// avião entrega, no ponto mais longe da borda, e km é quanto vale uma unidade do mapa.
import type { Id } from "./paises";

type Regiao = {
  nome: string;
  paises: Id[];
  km: number;
  centros: Partial<Record<Id, [number, number]>>;
};

export const REGIOES = {
  "america-do-sul": {
    nome: "América do Sul",
    paises: ["br","ar","uy","py","bo","pe","ec","co","ve","gy","sr","cl"],
    km: 5.516,
    centros: { br: [665,509], ar: [382,865], uy: [518,918], py: [447,690], bo: [361,589], pe: [194,524], ec: [77,293], co: [177,195], ve: [364,114], gy: [477,200], sr: [533,174], cl: [282,730] },
  },
  "america-do-norte": {
    nome: "América do Norte e Central",
    paises: ["ca","us","mx","gt","bz","sv","hn","ni","cr","pa","cu","jm","ht","do","bs"],
    km: 7.573,
    centros: { ca: [386,126], us: [449,381], mx: [394,608], gt: [550,734], bz: [575,698], sv: [569,749], hn: [599,735], ni: [629,765], cr: [649,799], pa: [695,818], cu: [741,632], jm: [732,670], ht: [801,641], do: [820,639], bs: [712,576] },
  },
  "europa": {
    nome: "Europa",
    paises: ["pt","es","fr","gb","ie","is","be","nl","lu","de","ch","at","it","dk","no","se","fi","ee","lv","lt","pl","cz","sk","hu","si","hr","ba","rs","me","al","mk","gr","bg","ro","md","ua","by","ru","tr","cy"],
    km: 6.11,
    centros: { pt: [256,571], es: [307,606], fr: [412,482], gb: [389,388], ie: [323,352], is: [309,116], be: [448,422], nl: [462,393], lu: [462,443], de: [509,412], ch: [480,495], at: [562,486], it: [511,530], dk: [505,331], no: [518,227], se: [583,173], fi: [657,206], ee: [666,274], lv: [676,309], lt: [661,339], pl: [617,401], cz: [558,445], sk: [615,464], hu: [629,492], si: [558,515], hr: [586,519], ba: [605,547], rs: [644,546], me: [623,571], al: [639,609], mk: [663,587], gr: [662,624], bg: [703,566], ro: [693,509], md: [729,470], ua: [769,427], by: [709,366], ru: [834,249], tr: [832,599], cy: [834,682] },
  },
  "africa": {
    nome: "África",
    paises: ["ma","dz","tn","ly","eg","sd","ss","et","er","dj","so","ke","ug","rw","bi","tz","cd","cg","ga","gq","cm","cf","td","ne","ng","bj","tg","gh","ci","bf","ml","mr","sn","gm","gw","gn","sl","lr","ao","zm","mw","mz","zw","bw","na","za","ls","sz","mg"],
    km: 7.662,
    centros: { ma: [200,88], dz: [315,161], tn: [403,77], ly: [545,178], eg: [664,177], sd: [675,312], ss: [694,451], et: [806,427], er: [794,318], dj: [861,375], so: [875,514], ke: [801,548], ug: [731,525], rw: [692,581], bi: [686,604], tz: [747,635], cd: [591,581], cg: [485,554], ga: [420,564], gq: [403,532], cm: [434,489], cf: [567,454], td: [535,303], ne: [408,300], ng: [361,417], bj: [292,402], tg: [272,424], gh: [238,451], ci: [178,442], bf: [246,366], ml: [239,281], mr: [133,268], sn: [56,323], gm: [62,350], gw: [57,369], gn: [117,393], sl: [91,420], lr: [121,456], ao: [511,744], zm: [631,767], mw: [738,750], mz: [799,759], zw: [679,830], bw: [599,872], na: [501,851], za: [601,982], ls: [650,978], sz: [693,939], mg: [910,824] },
  },
  "oriente-medio": {
    nome: "Oriente Médio e Ásia Central",
    paises: ["tr","cy","eg","sy","lb","il","jo","iq","sa","ye","om","ae","qa","kw","ir","af","pk","tm","uz","kz","kg","tj","ge","am","az"],
    km: 5.688,
    centros: { tr: [228,284], cy: [194,367], eg: [108,531], sy: [283,378], lb: [243,392], il: [214,450], jo: [239,459], iq: [354,425], sa: [370,611], ye: [366,774], om: [598,643], ae: [545,619], qa: [486,587], kw: [420,501], ir: [551,448], af: [733,395], pk: [760,517], tm: [604,299], uz: [671,248], kz: [732,123], kg: [829,224], tj: [814,297], ge: [365,244], am: [389,280], az: [428,288] },
  },
  "asia": {
    nome: "Ásia",
    paises: ["in","pk","np","bt","bd","lk","mm","th","la","kh","vn","my","id","ph","bn","cn","mn","kp","kr","jp","ru","kz"],
    km: 8.859,
    centros: { in: [191,409], pk: [73,307], np: [234,332], bt: [315,363], bd: [310,403], lk: [180,605], mm: [377,443], th: [438,523], la: [453,471], kh: [475,560], vn: [486,446], my: [594,683], id: [599,726], ph: [678,495], bn: [603,659], cn: [517,311], mn: [481,143], kp: [690,200], kr: [716,244], jp: [819,221], ru: [531,60], kz: [227,80] },
  },
  "oceania": {
    nome: "Oceania",
    paises: ["au","nz","pg","id","tl","sb","vu","fj"],
    km: 8.244,
    centros: { au: [345,347], nz: [744,649], pg: [471,100], id: [80,80], tl: [239,164], sb: [702,161], vu: [784,246], fj: [918,301] },
  },
} satisfies Record<string, Regiao>;

export type RegiaoId = keyof typeof REGIOES;
