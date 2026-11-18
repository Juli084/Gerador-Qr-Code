import { AlertTriangle, Check, Copy, Download, Loader2, ScanLine } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import type { AvisoDeAparencia } from "../desenho/contraste.ts";
import type { ResultadoDaLeitura } from "../desenho/leitura.ts";
import { desenharNoCanvas, montarSvg, type Aparencia, type Matriz } from "../desenho/qr.ts";

interface Props {
  conteudo: string | null;
  matriz: Matriz | null;
  aparencia: Aparencia;
  erroDeTamanho: boolean;
  leitura: ResultadoDaLeitura | "conferindo" | null;
  avisos: string[];
  avisosDeAparencia: AvisoDeAparencia[];
  nomeDoArquivo: string;
}

const TAMANHOS = [512, 1024, 2048] as const;

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function gerarPng(matriz: Matriz, aparencia: Aparencia, largura: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  await desenharNoCanvas(canvas, matriz, aparencia, largura);
  return new Promise((resolver, rejeitar) =>
    canvas.toBlob((blob) => (blob ? resolver(blob) : rejeitar(new Error("PNG não gerado"))), "image/png"),
  );
}

function StatusDaLeitura({ leitura }: { leitura: Props["leitura"] }) {
  if (leitura === null) return null;
  const estados = {
    conferindo: { icone: <Loader2 size={16} className="animate-spin" aria-hidden="true" />, texto: "Conferindo a leitura...", classe: "text-suave" },
    conferido: { icone: <Check size={16} aria-hidden="true" />, texto: "Leitura conferida: o código devolve exatamente o conteúdo.", classe: "text-destaque" },
    diferente: { icone: <AlertTriangle size={16} aria-hidden="true" />, texto: "O código foi lido, mas com conteúdo diferente. Tente outra combinação.", classe: "text-risco" },
    ilegivel: {
      icone: <AlertTriangle size={16} aria-hidden="true" />,
      texto: "Não consegui ler este código. Aumente o contraste, diminua o logo ou aumente a margem.",
      classe: "text-risco",
    },
  } as const;
  const { icone, texto, classe } = estados[leitura];
  return (
    <p className={`flex items-start gap-2 text-sm ${classe}`} role="status">
      <span className="mt-0.5 shrink-0">{icone}</span>
      {texto}
    </p>
  );
}

export function Previa({ conteudo, matriz, aparencia, erroDeTamanho, leitura, avisos, avisosDeAparencia, nomeDoArquivo }: Props) {
  const [tamanho, setTamanho] = useState<(typeof TAMANHOS)[number]>(1024);
  // Guarda qual SVG foi copiado: mudou o código, o botão volta a "Copiar imagem".
  const [copiadoDe, setCopiadoDe] = useState<string | null>(null);
  const [falha, setFalha] = useState("");
  const idTamanho = useId();
  const podeCopiar = typeof ClipboardItem !== "undefined" && Boolean(navigator.clipboard?.write);

  const svg = useMemo(() => (matriz ? montarSvg(matriz, aparencia) : null), [matriz, aparencia]);
  const urlDaPrevia = useMemo(() => (svg ? URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })) : null), [svg]);
  useEffect(() => () => {
    if (urlDaPrevia) URL.revokeObjectURL(urlDaPrevia);
  }, [urlDaPrevia]);

  async function acao(fazer: () => Promise<void>) {
    try {
      setFalha("");
      await fazer();
    } catch {
      setFalha("Não deu para gerar o arquivo neste navegador.");
    }
  }

  const pronto = Boolean(matriz && svg && urlDaPrevia && conteudo);
  const copiado = copiadoDe !== null && copiadoDe === svg;

  return (
    <div className="space-y-4">
      <div
        className={`grid aspect-square place-items-center overflow-hidden rounded-2xl border border-linha p-4 ${
          aparencia.fundoTransparente ? "xadrez" : "bg-cartao"
        }`}
      >
        {pronto && urlDaPrevia ? (
          <img src={urlDaPrevia} alt="Prévia do QR Code" className="size-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 text-center text-suave">
            <ScanLine size={40} aria-hidden="true" />
            <p className="text-sm">
              {erroDeTamanho
                ? "Conteúdo grande demais para um QR Code. Encurte o texto ou use um link."
                : "Preencha os campos e o código aparece aqui."}
            </p>
          </div>
        )}
      </div>

      {pronto ? <StatusDaLeitura leitura={leitura} /> : null}

      {pronto && (avisosDeAparencia.length > 0 || avisos.length > 0) ? (
        <ul className="space-y-1.5 text-sm">
          {avisosDeAparencia.map((aviso) => (
            <li key={aviso.texto} className={aviso.nivel === "risco" ? "text-risco" : "text-atencao"}>
              {aviso.texto}
            </li>
          ))}
          {avisos.map((aviso) => (
            <li key={aviso} className="text-suave">
              {aviso}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor={idTamanho} className="text-sm font-semibold">
            Tamanho do PNG
          </label>
          <select
            id={idTamanho}
            value={tamanho}
            onChange={(evento) => setTamanho(Number(evento.target.value) as (typeof TAMANHOS)[number])}
            className="mt-1.5 block h-11 w-full rounded-xl border border-linha bg-cartao px-3"
          >
            {TAMANHOS.map((valor) => (
              <option key={valor} value={valor}>
                {valor} px{valor === 2048 ? " (impressão)" : ""}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={!pronto}
          onClick={() => acao(async () => baixar(await gerarPng(matriz!, aparencia, tamanho), `${nomeDoArquivo}.png`))}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-tinta px-4 font-semibold text-papel disabled:opacity-40"
        >
          <Download size={18} aria-hidden="true" />
          PNG
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!pronto}
          onClick={() => acao(async () => baixar(new Blob([svg!], { type: "image/svg+xml" }), `${nomeDoArquivo}.svg`))}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-tinta font-semibold disabled:opacity-40"
        >
          <Download size={18} aria-hidden="true" />
          SVG (vetor)
        </button>
        {podeCopiar ? (
          <button
            type="button"
            disabled={!pronto}
            onClick={() =>
              acao(async () => {
                const blob = await gerarPng(matriz!, aparencia, 1024);
                await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
                setCopiadoDe(svg);
              })
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-linha bg-cartao font-semibold disabled:opacity-40"
          >
            {copiado ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
            {copiado ? "Copiado" : "Copiar imagem"}
          </button>
        ) : null}
      </div>
      {falha ? <p className="text-sm text-risco">{falha}</p> : null}

      {pronto && conteudo ? (
        <details className="text-sm">
          <summary className="cursor-pointer text-suave">
            Conteúdo gravado no código ({conteudo.length} caracteres, versão {matriz?.versao})
          </summary>
          <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-papel p-3 font-mono text-xs break-all whitespace-pre-wrap">
            {conteudo}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
