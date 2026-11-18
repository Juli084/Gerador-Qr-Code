import type { Campos, Tipo } from "../conteudo/montar.ts";
import { Campo, Opcoes } from "./Campo.tsx";

interface Props<T extends Tipo> {
  tipo: T;
  campos: Campos[T];
  erros: Record<string, string>;
  onMudar: (mudanca: Partial<Campos[T]>) => void;
}

export function FormularioDoConteudo<T extends Tipo>({ tipo, campos, erros, onMudar }: Props<T>) {
  // O switch abaixo estreita o tipo pelo valor de `tipo`; o cast só reflete isso para o TypeScript.
  const mudar = onMudar as (mudanca: Record<string, unknown>) => void;

  switch (tipo) {
    case "link": {
      const c = campos as Campos["link"];
      return (
        <Campo
          rotulo="Link"
          valor={c.url}
          onMudar={(url) => mudar({ url })}
          erro={erros.url}
          tipo="url"
          modoTeclado="url"
          placeholder="exemplo.com.br/cardapio"
          dica="Sem https://, eu completo."
        />
      );
    }
    case "texto": {
      const c = campos as Campos["texto"];
      return (
        <Campo rotulo="Texto" valor={c.texto} onMudar={(texto) => mudar({ texto })} multilinha maximo={1500} />
      );
    }
    case "whatsapp": {
      const c = campos as Campos["whatsapp"];
      return (
        <div className="space-y-4">
          <Campo
            rotulo="Número do WhatsApp"
            valor={c.telefone}
            onMudar={(telefone) => mudar({ telefone })}
            erro={erros.telefone}
            tipo="tel"
            modoTeclado="tel"
            placeholder="(15) 99999-0000"
          />
          <Campo
            rotulo="Mensagem pronta"
            opcional
            valor={c.mensagem}
            onMudar={(mensagem) => mudar({ mensagem })}
            multilinha
            maximo={500}
            dica="Aparece escrita na conversa; a pessoa só toca em enviar."
          />
        </div>
      );
    }
    case "wifi": {
      const c = campos as Campos["wifi"];
      return (
        <div className="space-y-4">
          <Campo rotulo="Nome da rede" valor={c.rede} onMudar={(rede) => mudar({ rede })} maximo={32} />
          <Opcoes
            rotulo="Segurança"
            valor={c.seguranca}
            onMudar={(seguranca) => mudar({ seguranca })}
            opcoes={[
              { valor: "WPA", nome: "WPA / WPA2 / WPA3" },
              { valor: "WEP", nome: "WEP" },
              { valor: "nopass", nome: "Sem senha" },
            ]}
          />
          {c.seguranca !== "nopass" ? (
            <Campo rotulo="Senha" valor={c.senha} onMudar={(senha) => mudar({ senha })} erro={erros.senha} maximo={63} />
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={c.oculta}
              onChange={(evento) => mudar({ oculta: evento.target.checked })}
              className="size-4 accent-destaque"
            />
            Rede oculta (não aparece na lista do celular)
          </label>
        </div>
      );
    }
    case "pix": {
      const c = campos as Campos["pix"];
      const exemplos: Record<Campos["pix"]["tipoChave"], string> = {
        "cpf-cnpj": "000.000.000-00",
        telefone: "(15) 99999-0000",
        email: "loja@exemplo.com.br",
        aleatoria: "1a2b3c4d-...",
      };
      return (
        <div className="space-y-4">
          <Opcoes
            rotulo="Tipo de chave"
            valor={c.tipoChave}
            onMudar={(tipoChave) => mudar({ tipoChave })}
            opcoes={[
              { valor: "cpf-cnpj", nome: "CPF ou CNPJ" },
              { valor: "telefone", nome: "Celular" },
              { valor: "email", nome: "E-mail" },
              { valor: "aleatoria", nome: "Aleatória" },
            ]}
          />
          <Campo
            rotulo="Chave Pix"
            valor={c.chave}
            onMudar={(chave) => mudar({ chave })}
            erro={erros.chave}
            placeholder={exemplos[c.tipoChave]}
            modoTeclado={c.tipoChave === "cpf-cnpj" ? "numeric" : c.tipoChave === "telefone" ? "tel" : "text"}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              rotulo="Nome de quem recebe"
              valor={c.recebedor}
              onMudar={(recebedor) => mudar({ recebedor })}
              erro={erros.recebedor}
              maximo={60}
            />
            <Campo rotulo="Cidade" valor={c.cidade} onMudar={(cidade) => mudar({ cidade })} erro={erros.cidade} maximo={40} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              rotulo="Valor"
              opcional
              valor={c.valor}
              onMudar={(valor) => mudar({ valor })}
              erro={erros.valor}
              modoTeclado="decimal"
              placeholder="25,90"
            />
            <Campo
              rotulo="Identificador"
              opcional
              valor={c.identificador}
              onMudar={(identificador) => mudar({ identificador })}
              erro={erros.identificador}
              maximo={25}
              placeholder="PEDIDO123"
              dica="Aparece no extrato, para saber de onde veio o pagamento."
            />
          </div>
        </div>
      );
    }
    case "contato": {
      const c = campos as Campos["contato"];
      return (
        <div className="space-y-4">
          <Campo rotulo="Nome completo" valor={c.nome} onMudar={(nome) => mudar({ nome })} maximo={80} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Empresa" opcional valor={c.empresa} onMudar={(empresa) => mudar({ empresa })} maximo={80} />
            <Campo rotulo="Cargo" opcional valor={c.cargo} onMudar={(cargo) => mudar({ cargo })} maximo={60} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              rotulo="Celular"
              valor={c.telefone}
              onMudar={(telefone) => mudar({ telefone })}
              erro={erros.telefone}
              tipo="tel"
              modoTeclado="tel"
              placeholder="(15) 99999-0000"
            />
            <Campo
              rotulo="E-mail"
              valor={c.email}
              onMudar={(email) => mudar({ email })}
              erro={erros.email}
              tipo="email"
              modoTeclado="email"
            />
          </div>
          <Campo rotulo="Site" opcional valor={c.site} onMudar={(site) => mudar({ site })} modoTeclado="url" />
        </div>
      );
    }
    case "email": {
      const c = campos as Campos["email"];
      return (
        <div className="space-y-4">
          <Campo
            rotulo="Para"
            valor={c.para}
            onMudar={(para) => mudar({ para })}
            erro={erros.para}
            tipo="email"
            modoTeclado="email"
          />
          <Campo rotulo="Assunto" opcional valor={c.assunto} onMudar={(assunto) => mudar({ assunto })} maximo={120} />
          <Campo rotulo="Mensagem" opcional valor={c.mensagem} onMudar={(mensagem) => mudar({ mensagem })} multilinha maximo={800} />
        </div>
      );
    }
  }
  return null;
}
