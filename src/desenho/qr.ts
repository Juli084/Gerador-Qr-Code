import QRCode from "qrcode";

/*
 * O QR Code vira uma matriz de módulos (quadradinhos) e um layout em "unidades de módulo".
 * O SVG e o PNG são desenhados a partir do mesmo layout, então os dois arquivos saem iguais.
 */

export type Correcao = "L" | "M" | "Q" | "H";

export interface Matriz {
  /** Módulos por lado, sem a margem. */
  tamanho: number;
  versao: number;
  escuro: (linha: number, coluna: number) => boolean;
}

export interface Logo {
  /** data: URL da imagem escolhida; nunca sai do navegador. */
  src: string;
  largura: number;
  altura: number;
}

export interface Aparencia {
  corCodigo: string;
  corFundo: string;
  fundoTransparente: boolean;
  /** Zona de silêncio, em módulos. A norma pede 4. */
  margem: number;
  correcao: Correcao;
  logo: Logo | null;
  /** Fração da largura do código ocupada pelo logo (0,15 a 0,25). */
  tamanhoLogo: number;
  legenda: string;
}

export const APARENCIA_INICIAL: Aparencia = {
  corCodigo: "#111111",
  corFundo: "#ffffff",
  fundoTransparente: false,
  margem: 4,
  correcao: "M",
  logo: null,
  tamanhoLogo: 0.2,
  legenda: "",
};

export const LEGENDA_MAXIMA = 48;

export class ConteudoGrandeDemais extends Error {}

/** Com logo, a correção sobe para H: o logo cobre módulos, e o H recupera até 30% do código. */
export function correcaoEfetiva(aparencia: Aparencia): Correcao {
  return aparencia.logo ? "H" : aparencia.correcao;
}

export function gerarMatriz(conteudo: string, correcao: Correcao): Matriz {
  let qr: QRCode.QRCode;
  try {
    qr = QRCode.create(conteudo, { errorCorrectionLevel: correcao });
  } catch {
    throw new ConteudoGrandeDemais("Conteúdo grande demais para um QR Code");
  }
  const { size, data } = qr.modules;
  return { tamanho: size, versao: qr.version, escuro: (linha, coluna) => data[linha * size + coluna] === 1 };
}

export interface Layout {
  /** Largura total em módulos, com margem. */
  largura: number;
  /** Altura total em módulos, com a faixa da legenda. */
  altura: number;
  margem: number;
  logo: { x: number; y: number; lado: number; respiro: number } | null;
  legenda: { texto: string; y: number; fonte: number } | null;
}

export function calcularLayout(matriz: Matriz, aparencia: Aparencia): Layout {
  const margem = Math.max(0, Math.min(8, Math.round(aparencia.margem)));
  const largura = matriz.tamanho + 2 * margem;

  let logo: Layout["logo"] = null;
  if (aparencia.logo) {
    const proporcao = Math.max(0.15, Math.min(0.25, aparencia.tamanhoLogo));
    const lado = matriz.tamanho * proporcao;
    logo = { x: (largura - lado) / 2, y: (largura - lado) / 2, lado, respiro: Math.max(0.6, lado * 0.08) };
  }

  const texto = aparencia.legenda.trim().slice(0, LEGENDA_MAXIMA);
  let legenda: Layout["legenda"] = null;
  let altura = largura;
  if (texto) {
    // Fonte proporcional ao código, reduzida para caber numa linha. 0,56 é a largura média
    // de um caractere de fonte sem serifa em relação ao tamanho da fonte.
    const fonte = Math.min(largura * 0.075, (largura * 0.88) / (texto.length * 0.56));
    // A linha de base fica logo abaixo do código, aproveitando parte da margem inferior.
    const y = largura - margem * 0.35 + fonte * 0.95;
    altura = y + fonte * 0.35 + Math.max(1, margem * 0.6);
    legenda = { texto, y, fonte };
  }
  return { largura, altura, margem, logo, legenda };
}

/** Faixas horizontais de módulos escuros: deixa o SVG bem menor que um quadrado por módulo. */
export function faixasEscuras(matriz: Matriz): { linha: number; coluna: number; comprimento: number }[] {
  const faixas: { linha: number; coluna: number; comprimento: number }[] = [];
  for (let linha = 0; linha < matriz.tamanho; linha++) {
    let coluna = 0;
    while (coluna < matriz.tamanho) {
      if (!matriz.escuro(linha, coluna)) {
        coluna++;
        continue;
      }
      const inicio = coluna;
      while (coluna < matriz.tamanho && matriz.escuro(linha, coluna)) coluna++;
      faixas.push({ linha, coluna: inicio, comprimento: coluna - inicio });
    }
  }
  return faixas;
}

function escaparXml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function numero(valor: number): string {
  return Number(valor.toFixed(3)).toString();
}

const FONTE = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

export function montarSvg(matriz: Matriz, aparencia: Aparencia): string {
  const layout = calcularLayout(matriz, aparencia);
  const { margem } = layout;
  const caminho = faixasEscuras(matriz)
    .map(({ linha, coluna, comprimento }) => `M${coluna + margem} ${linha + margem}h${comprimento}v1h-${comprimento}z`)
    .join("");
  const partes = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${numero(layout.largura)} ${numero(layout.altura)}" shape-rendering="crispEdges">`,
  ];
  if (!aparencia.fundoTransparente) {
    partes.push(`<rect width="100%" height="100%" fill="${escaparXml(aparencia.corFundo)}"/>`);
  }
  partes.push(`<path d="${caminho}" fill="${escaparXml(aparencia.corCodigo)}"/>`);
  if (layout.logo && aparencia.logo) {
    const { x, y, lado, respiro } = layout.logo;
    partes.push(
      `<rect x="${numero(x - respiro)}" y="${numero(y - respiro)}" width="${numero(lado + 2 * respiro)}" height="${numero(lado + 2 * respiro)}" rx="${numero(respiro * 1.5)}" fill="${escaparXml(aparencia.fundoTransparente ? "#ffffff" : aparencia.corFundo)}" shape-rendering="geometricPrecision"/>`,
      `<image href="${escaparXml(aparencia.logo.src)}" x="${numero(x)}" y="${numero(y)}" width="${numero(lado)}" height="${numero(lado)}" preserveAspectRatio="xMidYMid meet"/>`,
    );
  }
  if (layout.legenda) {
    const { texto, y, fonte } = layout.legenda;
    partes.push(
      `<text x="${numero(layout.largura / 2)}" y="${numero(y)}" font-family="${escaparXml(FONTE)}" font-size="${numero(fonte)}" font-weight="600" text-anchor="middle" fill="${escaparXml(aparencia.corCodigo)}" shape-rendering="geometricPrecision">${escaparXml(texto)}</text>`,
    );
  }
  partes.push("</svg>");
  return partes.join("");
}

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolver, rejeitar) => {
    const imagem = new Image();
    imagem.onload = () => resolver(imagem);
    imagem.onerror = () => rejeitar(new Error("Não deu para abrir a imagem do logo"));
    imagem.src = src;
  });
}

/**
 * Desenha no canvas com o mesmo layout do SVG. Cada módulo vai para pixels inteiros, para
 * não aparecer linha clara entre quadrados vizinhos por causa do antisserrilhado.
 */
export async function desenharNoCanvas(
  canvas: HTMLCanvasElement,
  matriz: Matriz,
  aparencia: Aparencia,
  larguraPx: number,
  forcarFundoBranco = false,
): Promise<void> {
  const layout = calcularLayout(matriz, aparencia);
  const escala = larguraPx / layout.largura;
  canvas.width = Math.round(larguraPx);
  canvas.height = Math.round(layout.altura * escala);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const fundo = aparencia.fundoTransparente ? (forcarFundoBranco ? "#ffffff" : null) : aparencia.corFundo;
  if (fundo) {
    ctx.fillStyle = fundo;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const px = (unidade: number) => Math.round(unidade * escala);
  ctx.fillStyle = aparencia.corCodigo;
  for (const { linha, coluna, comprimento } of faixasEscuras(matriz)) {
    const x = px(coluna + layout.margem);
    const y = px(linha + layout.margem);
    ctx.fillRect(x, y, px(coluna + layout.margem + comprimento) - x, px(linha + layout.margem + 1) - y);
  }

  if (layout.logo && aparencia.logo) {
    const { x, y, lado, respiro } = layout.logo;
    ctx.fillStyle = aparencia.fundoTransparente ? "#ffffff" : aparencia.corFundo;
    ctx.beginPath();
    ctx.roundRect((x - respiro) * escala, (y - respiro) * escala, (lado + 2 * respiro) * escala, (lado + 2 * respiro) * escala, respiro * 1.5 * escala);
    ctx.fill();
    const imagem = await carregarImagem(aparencia.logo.src);
    const proporcao = Math.min(lado / imagem.naturalWidth, lado / imagem.naturalHeight);
    const largura = imagem.naturalWidth * proporcao;
    const altura = imagem.naturalHeight * proporcao;
    ctx.drawImage(imagem, (x + (lado - largura) / 2) * escala, (y + (lado - altura) / 2) * escala, largura * escala, altura * escala);
  }

  if (layout.legenda) {
    const { texto, y, fonte } = layout.legenda;
    ctx.fillStyle = aparencia.corCodigo;
    ctx.font = `600 ${fonte * escala}px ${FONTE}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(texto, (layout.largura / 2) * escala, y * escala);
  }
}
