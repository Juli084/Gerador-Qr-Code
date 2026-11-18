/** Luminância relativa de uma cor #rrggbb, como na WCAG. */
export function luminancia(hex: string): number {
  const valor = hex.replace("#", "");
  const canais = [0, 2, 4].map((i) => parseInt(valor.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canais.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

export function razaoDeContraste(a: string, b: string): number {
  const [clara, escura] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return ((clara ?? 0) + 0.05) / ((escura ?? 0) + 0.05);
}

export function corValida(hex: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(hex);
}

export interface AvisoDeAparencia {
  nivel: "atencao" | "risco";
  texto: string;
}

/**
 * Avisos sobre escolhas que atrapalham a leitura. Não bloqueiam nada: a conferência real é
 * a leitura do código gerado, feita logo depois.
 */
export function avisosDeAparencia(opcoes: {
  corCodigo: string;
  corFundo: string;
  fundoTransparente: boolean;
  margem: number;
}): AvisoDeAparencia[] {
  const avisos: AvisoDeAparencia[] = [];
  if (opcoes.fundoTransparente) {
    avisos.push({
      nivel: "atencao",
      texto: "Fundo transparente: a leitura depende da cor de onde o código for aplicado.",
    });
  } else {
    const contraste = razaoDeContraste(opcoes.corCodigo, opcoes.corFundo);
    if (contraste < 3) {
      avisos.push({ nivel: "risco", texto: `Contraste baixo (${contraste.toFixed(1)}:1). Use cores bem diferentes.` });
    }
    if (luminancia(opcoes.corCodigo) > luminancia(opcoes.corFundo)) {
      avisos.push({
        nivel: "atencao",
        texto: "Código claro em fundo escuro: alguns leitores, principalmente os mais antigos, não leem.",
      });
    }
  }
  if (opcoes.margem < 2) {
    avisos.push({ nivel: "atencao", texto: "Margem pequena: imprima com espaço livre em volta do código." });
  }
  return avisos;
}
