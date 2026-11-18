import { describe, expect, it } from "vitest";
import { avisosDeAparencia, razaoDeContraste } from "../src/desenho/contraste.ts";
import {
  APARENCIA_INICIAL,
  ConteudoGrandeDemais,
  calcularLayout,
  correcaoEfetiva,
  faixasEscuras,
  gerarMatriz,
  montarSvg,
} from "../src/desenho/qr.ts";

const LOGO = { src: "data:,", largura: 1, altura: 1 };

describe("matriz e faixas", () => {
  it("as faixas reconstroem exatamente os módulos escuros", () => {
    const matriz = gerarMatriz("https://exemplo.com.br", "M");
    const reconstruida = new Set<string>();
    for (const { linha, coluna, comprimento } of faixasEscuras(matriz)) {
      for (let i = 0; i < comprimento; i++) reconstruida.add(`${linha},${coluna + i}`);
    }
    for (let linha = 0; linha < matriz.tamanho; linha++) {
      for (let coluna = 0; coluna < matriz.tamanho; coluna++) {
        expect(reconstruida.has(`${linha},${coluna}`)).toBe(matriz.escuro(linha, coluna));
      }
    }
  });

  it("avisa quando o conteúdo não cabe", () => {
    expect(() => gerarMatriz("a".repeat(4000), "H")).toThrow(ConteudoGrandeDemais);
  });

  it("sobe a correção para H quando há logo", () => {
    expect(correcaoEfetiva({ ...APARENCIA_INICIAL, correcao: "L" })).toBe("L");
    expect(correcaoEfetiva({ ...APARENCIA_INICIAL, correcao: "L", logo: LOGO })).toBe("H");
  });
});

describe("layout e SVG", () => {
  const matriz = gerarMatriz("teste", "M");

  it("soma a margem dos dois lados e limita logo e margem", () => {
    const layout = calcularLayout(matriz, { ...APARENCIA_INICIAL, margem: 20, tamanhoLogo: 0.9, logo: LOGO });
    expect(layout.margem).toBe(8);
    expect(layout.largura).toBe(matriz.tamanho + 16);
    expect(layout.logo?.lado).toBeCloseTo(matriz.tamanho * 0.25);
  });

  it("aumenta a altura só quando há legenda", () => {
    expect(calcularLayout(matriz, APARENCIA_INICIAL).altura).toBe(matriz.tamanho + 8);
    expect(calcularLayout(matriz, { ...APARENCIA_INICIAL, legenda: "Escaneie" }).altura).toBeGreaterThan(
      matriz.tamanho + 8,
    );
  });

  it("escapa a legenda no SVG", () => {
    const svg = montarSvg(matriz, { ...APARENCIA_INICIAL, legenda: '<script>"x" & y</script>' });
    expect(svg).toContain("&lt;script&gt;&quot;x&quot; &amp; y&lt;/script&gt;");
    expect(svg).not.toContain("<script>");
  });

  it("omite o fundo quando é transparente", () => {
    expect(montarSvg(matriz, APARENCIA_INICIAL)).toContain('<rect width="100%" height="100%" fill="#ffffff"/>');
    expect(montarSvg(matriz, { ...APARENCIA_INICIAL, fundoTransparente: true })).not.toContain('height="100%"');
  });
});

describe("contraste", () => {
  it("calcula a razão da WCAG", () => {
    expect(razaoDeContraste("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(razaoDeContraste("#777777", "#888888")).toBeLessThan(1.5);
  });

  it("avisa contraste baixo, cores invertidas e margem curta", () => {
    const textos = avisosDeAparencia({
      corCodigo: "#ffffff",
      corFundo: "#eeeeee",
      fundoTransparente: false,
      margem: 1,
    }).map((aviso) => aviso.texto);
    expect(textos.some((texto) => texto.startsWith("Contraste baixo"))).toBe(true);
    expect(textos.some((texto) => texto.startsWith("Código claro"))).toBe(true);
    expect(textos.some((texto) => texto.startsWith("Margem pequena"))).toBe(true);
    expect(
      avisosDeAparencia({ corCodigo: "#111111", corFundo: "#ffffff", fundoTransparente: false, margem: 4 }),
    ).toEqual([]);
  });
});
