import { Banknote, Contact, Link2, Lock, Mail, MessageCircle, Type, Wifi, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ControlesDeAparencia } from "./componentes/ControlesDeAparencia.tsx";
import { FormularioDoConteudo } from "./componentes/FormularioDoConteudo.tsx";
import { Previa } from "./componentes/Previa.tsx";
import { CAMPOS_INICIAIS, montar, type Campos, type Tipo } from "./conteudo/montar.ts";
import { avisosDeAparencia } from "./desenho/contraste.ts";
import { conferirLeitura, type ResultadoDaLeitura } from "./desenho/leitura.ts";
import {
  APARENCIA_INICIAL,
  ConteudoGrandeDemais,
  correcaoEfetiva,
  gerarMatriz,
  type Aparencia,
  type Matriz,
} from "./desenho/qr.ts";

const TIPOS: { tipo: Tipo; nome: string; icone: LucideIcon }[] = [
  { tipo: "link", nome: "Link", icone: Link2 },
  { tipo: "whatsapp", nome: "WhatsApp", icone: MessageCircle },
  { tipo: "wifi", nome: "Wi-Fi", icone: Wifi },
  { tipo: "pix", nome: "Pix", icone: Banknote },
  { tipo: "contato", nome: "Contato", icone: Contact },
  { tipo: "email", nome: "E-mail", icone: Mail },
  { tipo: "texto", nome: "Texto", icone: Type },
];

export function App() {
  const [tipo, setTipo] = useState<Tipo>("link");
  const [campos, setCampos] = useState<Campos>(CAMPOS_INICIAIS);
  const [aparencia, setAparencia] = useState<Aparencia>(APARENCIA_INICIAL);
  const [leituraPronta, setLeituraPronta] = useState<{ alvo: object; resultado: ResultadoDaLeitura } | null>(null);

  const montado = useMemo(() => montar(tipo, campos[tipo]), [tipo, campos]);
  const correcao = correcaoEfetiva(aparencia);

  const { matriz, grandeDemais } = useMemo((): { matriz: Matriz | null; grandeDemais: boolean } => {
    if (!montado.conteudo) return { matriz: null, grandeDemais: false };
    try {
      return { matriz: gerarMatriz(montado.conteudo, correcao), grandeDemais: false };
    } catch (erro) {
      if (erro instanceof ConteudoGrandeDemais) return { matriz: null, grandeDemais: true };
      throw erro;
    }
  }, [montado.conteudo, correcao]);

  // Cada combinação de conteúdo e aparência é um "alvo"; a leitura só vale para o alvo em
  // que foi feita. Enquanto o alvo atual não tem resultado, a tela mostra "conferindo".
  const alvo = useMemo(() => ({ conteudo: montado.conteudo, matriz, aparencia }), [montado.conteudo, matriz, aparencia]);
  const leitura: ResultadoDaLeitura | "conferindo" | null = !matriz
    ? null
    : leituraPronta?.alvo === alvo
      ? leituraPronta.resultado
      : "conferindo";

  // A conferência espera a pessoa parar de digitar por um instante.
  useEffect(() => {
    const { conteudo, matriz: matrizAtual, aparencia: aparenciaAtual } = alvo;
    if (!matrizAtual || !conteudo) return;
    let cancelado = false;
    const espera = setTimeout(() => {
      conferirLeitura(conteudo, matrizAtual, aparenciaAtual)
        .then((resultado) => {
          if (!cancelado) setLeituraPronta({ alvo, resultado });
        })
        .catch(() => {
          if (!cancelado) setLeituraPronta({ alvo, resultado: "ilegivel" });
        });
    }, 300);
    return () => {
      cancelado = true;
      clearTimeout(espera);
    };
  }, [alvo]);

  const avisosVisuais = avisosDeAparencia(aparencia);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <header className="pt-8 pb-6 sm:pt-12">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Gerador de QR Code</h1>
        <p className="mt-2 max-w-2xl text-suave">
          Link, WhatsApp, Wi-Fi, Pix, contato e e-mail, com a cor, o logo e o texto da sua marca. Cada código é lido
          de volta antes do download para conferir que funciona.
        </p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-destaque-claro px-3 py-1.5 text-sm text-destaque">
          <Lock size={14} aria-hidden="true" />
          Tudo acontece no seu navegador: senha de Wi-Fi, chave Pix e logo não são enviados a lugar nenhum.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="space-y-6">
          <section aria-labelledby="titulo-conteudo" className="rounded-2xl border border-linha bg-cartao p-4 sm:p-6">
            <h2 id="titulo-conteudo" className="text-lg font-bold">
              1. O que o código abre
            </h2>
            <fieldset className="mt-4">
              <legend className="sr-only">Tipo de QR Code</legend>
              <div className="flex flex-wrap gap-2">
                {TIPOS.map(({ tipo: valor, nome, icone: Icone }) => (
                  <label
                    key={valor}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-destaque ${
                      tipo === valor ? "border-tinta bg-tinta text-papel" : "border-linha hover:border-suave"
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipo"
                      value={valor}
                      checked={tipo === valor}
                      onChange={() => setTipo(valor)}
                      className="sr-only"
                    />
                    <Icone size={17} aria-hidden="true" />
                    {nome}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mt-6">
              <FormularioDoConteudo
                key={tipo}
                tipo={tipo}
                campos={campos[tipo]}
                erros={montado.erros}
                onMudar={(mudanca) =>
                  setCampos((anteriores) => ({ ...anteriores, [tipo]: { ...anteriores[tipo], ...mudanca } }))
                }
              />
            </div>
          </section>

          <section aria-labelledby="titulo-aparencia" className="rounded-2xl border border-linha bg-cartao p-4 sm:p-6">
            <h2 id="titulo-aparencia" className="text-lg font-bold">
              2. Aparência
            </h2>
            <div className="mt-4">
              <ControlesDeAparencia
                aparencia={aparencia}
                onMudar={(mudanca) => setAparencia((anterior) => ({ ...anterior, ...mudanca }))}
              />
            </div>
          </section>
        </div>

        <section
          aria-labelledby="titulo-previa"
          className="rounded-2xl border border-linha bg-cartao p-4 sm:p-6 lg:sticky lg:top-6"
        >
          <h2 id="titulo-previa" className="mb-4 text-lg font-bold">
            3. Baixar
          </h2>
          <Previa
            conteudo={montado.conteudo}
            matriz={matriz}
            aparencia={aparencia}
            erroDeTamanho={grandeDemais}
            leitura={leitura}
            avisos={montado.avisos}
            avisosDeAparencia={avisosVisuais}
            nomeDoArquivo={`qrcode-${tipo}`}
          />
        </section>
      </div>
    </div>
  );
}
