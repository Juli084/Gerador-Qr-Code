import { useId, type ReactNode } from "react";

export const ESTILO_CAMPO =
  "mt-1.5 block w-full rounded-xl border bg-cartao px-3 py-2.5 text-base placeholder:text-suave/60 focus:border-destaque focus:outline-none focus:ring-2 focus:ring-destaque/20";

interface Props {
  rotulo: string;
  valor: string;
  onMudar: (valor: string) => void;
  erro?: string | undefined;
  dica?: ReactNode;
  opcional?: boolean;
  multilinha?: boolean;
  tipo?: "text" | "email" | "tel" | "url" | "password";
  modoTeclado?: "text" | "numeric" | "decimal" | "tel" | "email" | "url";
  autoComplete?: string;
  placeholder?: string;
  maximo?: number;
}

export function Campo({
  rotulo,
  valor,
  onMudar,
  erro,
  dica,
  opcional = false,
  multilinha = false,
  tipo = "text",
  modoTeclado,
  autoComplete = "off",
  placeholder,
  maximo,
}: Props) {
  const id = useId();
  const descricao = erro ? `${id}-erro` : dica ? `${id}-dica` : undefined;
  const comum = {
    id,
    value: valor,
    placeholder,
    maxLength: maximo,
    autoComplete,
    "aria-invalid": erro ? true : undefined,
    "aria-describedby": descricao,
    className: `${ESTILO_CAMPO} ${erro ? "border-risco" : "border-linha"}`,
  };
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">
        {rotulo} {opcional ? <span className="font-normal text-suave">(opcional)</span> : null}
      </label>
      {multilinha ? (
        <textarea {...comum} rows={3} onChange={(evento) => onMudar(evento.target.value)} />
      ) : (
        <input {...comum} type={tipo} inputMode={modoTeclado} onChange={(evento) => onMudar(evento.target.value)} />
      )}
      {erro ? (
        <p id={`${id}-erro`} className="mt-1 text-sm text-risco">
          {erro}
        </p>
      ) : dica ? (
        <p id={`${id}-dica`} className="mt-1 text-sm text-suave">
          {dica}
        </p>
      ) : null}
    </div>
  );
}

interface OpcoesProps<T extends string> {
  rotulo: string;
  valor: T;
  opcoes: readonly { valor: T; nome: string }[];
  onMudar: (valor: T) => void;
}

export function Opcoes<T extends string>({ rotulo, valor, opcoes, onMudar }: OpcoesProps<T>) {
  const nome = useId();
  return (
    <fieldset>
      <legend className="text-sm font-semibold">{rotulo}</legend>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {opcoes.map((opcao) => (
          <label
            key={opcao.valor}
            className={`cursor-pointer rounded-full border px-3.5 py-2 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-destaque ${
              valor === opcao.valor ? "border-tinta bg-tinta text-papel" : "border-linha bg-cartao hover:border-suave"
            }`}
          >
            <input
              type="radio"
              name={nome}
              value={opcao.valor}
              checked={valor === opcao.valor}
              onChange={() => onMudar(opcao.valor)}
              className="sr-only"
            />
            {opcao.nome}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
