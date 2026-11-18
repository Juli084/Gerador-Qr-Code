import { desenharNoCanvas, type Aparencia, type Matriz } from "./qr.ts";

export type ResultadoDaLeitura = "conferido" | "diferente" | "ilegivel";

/**
 * Lê de volta o código desenhado, como uma câmera faria, e compara com o conteúdo. Pega
 * o que o cálculo não pega: logo grande demais, cores com pouco contraste, margem curta.
 * O leitor (jsQR) só é baixado na primeira conferência.
 */
export async function conferirLeitura(
  conteudo: string,
  matriz: Matriz,
  aparencia: Aparencia,
): Promise<ResultadoDaLeitura> {
  const { default: jsQR } = await import("jsqr");
  const canvas = document.createElement("canvas");
  await desenharNoCanvas(canvas, matriz, aparencia, Math.max(320, matriz.tamanho * 8), true);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "ilegivel";
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const lido = jsQR(data, width, height, { inversionAttempts: "attemptBoth" });
  if (!lido) return "ilegivel";
  const comoUtf8 = new TextDecoder().decode(Uint8Array.from(lido.binaryData));
  return lido.data === conteudo || comoUtf8 === conteudo ? "conferido" : "diferente";
}
