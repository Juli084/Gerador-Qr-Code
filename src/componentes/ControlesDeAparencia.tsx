import { ImagePlus, X } from "lucide-react";
import { useId, useState } from "react";
import { corValida } from "../desenho/contraste.ts";
import { LEGENDA_MAXIMA, type Aparencia, type Correcao } from "../desenho/qr.ts";
import { ESTILO_CAMPO, Opcoes } from "./Campo.tsx";

const LOGO_MAXIMO = 2 * 1024 * 1024;

function lerLogo(arquivo: File): Promise<NonNullable<Aparencia["logo"]>> {
  return new Promise((resolver, rejeitar) => {
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(arquivo.type)) {
      rejeitar(new Error("Use uma imagem PNG, JPG, WebP ou SVG."));
      return;
    }
    if (arquivo.size > LOGO_MAXIMO) {
      rejeitar(new Error("A imagem passa de 2 MB. Use uma versão menor do logo."));
      return;
    }
    const leitor = new FileReader();
    leitor.onerror = () => rejeitar(new Error("Não deu para ler o arquivo."));
    leitor.onload = () => {
      const src = String(leitor.result);
      const imagem = new Image();
      imagem.onload = () => resolver({ src, largura: imagem.naturalWidth || 100, altura: imagem.naturalHeight || 100 });
      imagem.onerror = () => rejeitar(new Error("O arquivo não abriu como imagem."));
      imagem.src = src;
    };
    leitor.readAsDataURL(arquivo);
  });
}

function Cor({ rotulo, valor, onMudar, desativado = false }: { rotulo: string; valor: string; onMudar: (cor: string) => void; desativado?: boolean }) {
  const id = useId();
  const [texto, setTexto] = useState(valor);
  const [anterior, setAnterior] = useState(valor);
  if (valor !== anterior) {
    setAnterior(valor);
    setTexto(valor);
  }
  return (
    <div className={desativado ? "opacity-50" : undefined}>
      <label htmlFor={id} className="text-sm font-semibold">
        {rotulo}
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="color"
          value={valor}
          disabled={desativado}
          onChange={(evento) => onMudar(evento.target.value)}
          aria-label={`${rotulo}: seletor`}
          className="size-11 shrink-0 cursor-pointer"
        />
        <input
          id={id}
          value={texto}
          disabled={desativado}
          maxLength={7}
          spellCheck={false}
          onChange={(evento) => {
            const novo = evento.target.value.trim();
            setTexto(novo);
            const comCerquilha = novo.startsWith("#") ? novo : `#${novo}`;
            if (corValida(comCerquilha)) onMudar(comCerquilha.toLowerCase());
          }}
          className={`${ESTILO_CAMPO} mt-0 border-linha font-mono uppercase`}
        />
      </div>
    </div>
  );
}

interface Props {
  aparencia: Aparencia;
  onMudar: (mudanca: Partial<Aparencia>) => void;
}

export function ControlesDeAparencia({ aparencia, onMudar }: Props) {
  const [erroLogo, setErroLogo] = useState("");
  const idMargem = useId();
  const idLogo = useId();
  const idLegenda = useId();
  const idTamanhoLogo = useId();

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Cor rotulo="Cor do código" valor={aparencia.corCodigo} onMudar={(corCodigo) => onMudar({ corCodigo })} />
        <Cor
          rotulo="Cor do fundo"
          valor={aparencia.corFundo}
          onMudar={(corFundo) => onMudar({ corFundo })}
          desativado={aparencia.fundoTransparente}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={aparencia.fundoTransparente}
          onChange={(evento) => onMudar({ fundoTransparente: evento.target.checked })}
          className="size-4 accent-destaque"
        />
        Fundo transparente (para aplicar sobre arte própria)
      </label>

      <div>
        <label htmlFor={idLegenda} className="text-sm font-semibold">
          Texto abaixo do código <span className="font-normal text-suave">(opcional)</span>
        </label>
        <input
          id={idLegenda}
          value={aparencia.legenda}
          maxLength={LEGENDA_MAXIMA}
          placeholder="Aponte a câmera para ver o cardápio"
          onChange={(evento) => onMudar({ legenda: evento.target.value })}
          className={`${ESTILO_CAMPO} border-linha`}
        />
      </div>

      <div>
        <span id={idLogo} className="text-sm font-semibold">
          Logo no centro <span className="font-normal text-suave">(opcional)</span>
        </span>
        {aparencia.logo ? (
          <div className="mt-1.5 flex items-center gap-3">
            <img src={aparencia.logo.src} alt="Logo escolhido" className="size-12 rounded-lg border border-linha object-contain" />
            <div className="flex-1">
              <label htmlFor={idTamanhoLogo} className="text-sm">
                Tamanho: {Math.round(aparencia.tamanhoLogo * 100)}% da largura
              </label>
              <input
                id={idTamanhoLogo}
                type="range"
                min={0.15}
                max={0.25}
                step={0.01}
                value={aparencia.tamanhoLogo}
                onChange={(evento) => onMudar({ tamanhoLogo: Number(evento.target.value) })}
                className="block w-full accent-destaque"
              />
            </div>
            <button
              type="button"
              onClick={() => onMudar({ logo: null })}
              className="grid size-10 place-items-center rounded-full text-suave hover:bg-papel"
              aria-label="Remover logo"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <label className="mt-1.5 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-suave/50 bg-cartao px-3 py-3 text-sm text-suave hover:border-destaque hover:text-destaque has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-destaque">
            <ImagePlus size={18} aria-hidden="true" />
            Escolher imagem (PNG, JPG, WebP ou SVG)
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              aria-labelledby={idLogo}
              className="sr-only"
              onChange={async (evento) => {
                const arquivo = evento.target.files?.[0];
                evento.target.value = "";
                if (!arquivo) return;
                try {
                  onMudar({ logo: await lerLogo(arquivo) });
                  setErroLogo("");
                } catch (erro) {
                  setErroLogo(erro instanceof Error ? erro.message : "Não deu para usar essa imagem.");
                }
              }}
            />
          </label>
        )}
        {erroLogo ? <p className="mt-1 text-sm text-risco">{erroLogo}</p> : null}
        <p className="mt-1 text-sm text-suave">A imagem fica só neste navegador. Com logo, a correção de erro vai para o nível máximo.</p>
      </div>

      <details className="rounded-xl border border-linha bg-cartao px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold">Ajustes técnicos</summary>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor={idMargem} className="text-sm font-semibold">
              Margem: {aparencia.margem} {aparencia.margem === 1 ? "módulo" : "módulos"}
            </label>
            <input
              id={idMargem}
              type="range"
              min={0}
              max={8}
              step={1}
              value={aparencia.margem}
              onChange={(evento) => onMudar({ margem: Number(evento.target.value) })}
              className="block w-full accent-destaque"
            />
            <p className="text-sm text-suave">A norma do QR Code pede 4 módulos de espaço livre em volta.</p>
          </div>
          <fieldset disabled={Boolean(aparencia.logo)} className={aparencia.logo ? "opacity-50" : undefined}>
            <Opcoes<Correcao>
              rotulo="Correção de erro"
              valor={aparencia.logo ? "H" : aparencia.correcao}
              onMudar={(correcao) => onMudar({ correcao })}
              opcoes={[
                { valor: "L", nome: "L · 7%" },
                { valor: "M", nome: "M · 15%" },
                { valor: "Q", nome: "Q · 25%" },
                { valor: "H", nome: "H · 30%" },
              ]}
            />
            <p className="mt-1 text-sm text-suave">
              Quanto do código pode estar sujo ou rasgado e ainda ler. Mais correção deixa o desenho mais denso.
            </p>
          </fieldset>
        </div>
      </details>
    </div>
  );
}
