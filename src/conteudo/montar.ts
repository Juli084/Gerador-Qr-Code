import { cnpjValido, cpfValido, digitos, emailValido, lerValor, telefoneBrasileiro } from "./documentos.ts";
import { payloadPix, textoPix } from "./pix.ts";

/*
 * Cada tipo de QR Code é um texto num formato que o celular reconhece: um link, o
 * "WIFI:..." que conecta na rede, o vCard que salva o contato, o BR Code do Pix. Aqui fica
 * a montagem desses textos e a validação dos campos, sem nada de interface.
 */

export type Tipo = "link" | "texto" | "whatsapp" | "wifi" | "pix" | "contato" | "email";

export interface Campos {
  link: { url: string };
  texto: { texto: string };
  whatsapp: { telefone: string; mensagem: string };
  wifi: { rede: string; seguranca: "WPA" | "WEP" | "nopass"; senha: string; oculta: boolean };
  pix: {
    tipoChave: "cpf-cnpj" | "telefone" | "email" | "aleatoria";
    chave: string;
    recebedor: string;
    cidade: string;
    valor: string;
    identificador: string;
  };
  contato: { nome: string; empresa: string; cargo: string; telefone: string; email: string; site: string };
  email: { para: string; assunto: string; mensagem: string };
}

export const CAMPOS_INICIAIS: Campos = {
  link: { url: "" },
  texto: { texto: "" },
  whatsapp: { telefone: "", mensagem: "" },
  wifi: { rede: "", seguranca: "WPA", senha: "", oculta: false },
  pix: { tipoChave: "cpf-cnpj", chave: "", recebedor: "", cidade: "", valor: "", identificador: "" },
  contato: { nome: "", empresa: "", cargo: "", telefone: "", email: "", site: "" },
  email: { para: "", assunto: "", mensagem: "" },
};

export interface Montado {
  /** null quando falta algo obrigatório ou há erro. */
  conteudo: string | null;
  /** Mensagens por campo, para mostrar ao lado de cada um. */
  erros: Record<string, string>;
  /** Observações que não impedem gerar o código. */
  avisos: string[];
}

function resultado(conteudo: string | null, erros: Record<string, string> = {}, avisos: string[] = []): Montado {
  return { conteudo: Object.keys(erros).length > 0 ? null : conteudo, erros, avisos };
}

function vazio(texto: string): boolean {
  return texto.trim() === "";
}

export function montarLink({ url }: Campos["link"]): Montado {
  const texto = url.trim();
  if (texto === "") return resultado(null);
  const comEsquema = /^[a-z][a-z0-9+.-]*:/i.test(texto) ? texto : `https://${texto}`;
  let endereco: URL;
  try {
    endereco = new URL(comEsquema);
  } catch {
    return resultado(null, { url: "Esse endereço não parece um link." });
  }
  if (endereco.protocol !== "https:" && endereco.protocol !== "http:") {
    return resultado(null, { url: "Use um link que comece com http:// ou https://." });
  }
  if (!endereco.hostname.includes(".") && endereco.hostname !== "localhost") {
    return resultado(null, { url: "Falta o domínio, como exemplo.com.br." });
  }
  const avisos = endereco.protocol === "http:" ? ["Link sem HTTPS: o celular pode avisar que o site não é seguro."] : [];
  return resultado(comEsquema, {}, avisos);
}

export function montarTexto({ texto }: Campos["texto"]): Montado {
  return resultado(vazio(texto) ? null : texto);
}

export function montarWhatsApp({ telefone, mensagem }: Campos["whatsapp"]): Montado {
  if (vazio(telefone)) return resultado(null);
  const numero = telefoneBrasileiro(telefone);
  if (!numero) return resultado(null, { telefone: "Digite o número com DDD, como (15) 99999-0000." });
  const texto = mensagem.trim();
  return resultado(`https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`);
}

/** No formato WIFI:, barra invertida, ponto e vírgula, vírgula, dois-pontos e aspas são escapados. */
export function escaparWifi(texto: string): string {
  return texto.replace(/([\\;,:"])/g, "\\$1");
}

export function montarWifi({ rede, seguranca, senha, oculta }: Campos["wifi"]): Montado {
  if (vazio(rede)) return resultado(null);
  const erros: Record<string, string> = {};
  if (seguranca === "WPA" && (senha.length < 8 || senha.length > 63)) {
    erros.senha = "Senha de WPA/WPA2/WPA3 tem de 8 a 63 caracteres.";
  }
  if (seguranca === "WEP" && senha === "") erros.senha = "Digite a senha da rede.";
  const partes = [`T:${seguranca}`, `S:${escaparWifi(rede)}`];
  if (seguranca !== "nopass") partes.push(`P:${escaparWifi(senha)}`);
  if (oculta) partes.push("H:true");
  const avisos = ["A senha fica gravada no código: quem fotografar o QR Code consegue lê-la."];
  if (seguranca === "WEP") avisos.push("WEP é uma proteção antiga e fácil de quebrar. Se o roteador permitir, use WPA2 ou WPA3.");
  return resultado(`WIFI:${partes.join(";")};;`, erros, avisos);
}

function chavePix(tipo: Campos["pix"]["tipoChave"], chave: string): { chave: string } | { erro: string } {
  const texto = chave.trim();
  switch (tipo) {
    case "cpf-cnpj": {
      const numero = digitos(texto);
      if (numero.length === 11) return cpfValido(numero) ? { chave: numero } : { erro: "CPF inválido: confira os números." };
      if (numero.length === 14) return cnpjValido(numero) ? { chave: numero } : { erro: "CNPJ inválido: confira os números." };
      return { erro: "CPF tem 11 dígitos e CNPJ tem 14." };
    }
    case "telefone": {
      const numero = telefoneBrasileiro(texto);
      return numero ? { chave: `+${numero}` } : { erro: "Digite o celular com DDD, como (15) 99999-0000." };
    }
    case "email":
      return emailValido(texto) ? { chave: texto.toLowerCase() } : { erro: "E-mail inválido." };
    case "aleatoria": {
      const minusculo = texto.toLowerCase();
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(minusculo)
        ? { chave: minusculo }
        : { erro: "A chave aleatória tem 36 caracteres, no formato do banco (com hifens)." };
    }
  }
}

export function montarPix(campos: Campos["pix"]): Montado {
  if (vazio(campos.chave)) return resultado(null);
  const erros: Record<string, string> = {};
  const chave = chavePix(campos.tipoChave, campos.chave);
  if ("erro" in chave) erros.chave = chave.erro;
  if (textoPix(campos.recebedor, 25) === "") erros.recebedor = "Digite o nome de quem recebe.";
  if (textoPix(campos.cidade, 15) === "") erros.cidade = "Digite a cidade de quem recebe.";
  let valor: number | undefined;
  if (!vazio(campos.valor)) {
    const lido = lerValor(campos.valor);
    if (lido === null || lido <= 0) erros.valor = "Digite um valor como 25 ou 25,90, ou deixe em branco.";
    else valor = lido;
  }
  const identificador = campos.identificador.trim();
  if (identificador !== "" && !/^[A-Za-z0-9]{1,25}$/.test(identificador)) {
    erros.identificador = "Até 25 letras e números, sem espaço nem acento.";
  }
  if (Object.keys(erros).length > 0 || "erro" in chave) return resultado(null, erros);

  const avisos = ["O código não confere se a chave existe. Antes de imprimir, faça um Pix de teste lendo o QR Code."];
  if (campos.recebedor.trim().length > 25) avisos.push("O nome passa de 25 caracteres e foi cortado no código.");
  if (valor === undefined) avisos.push("Sem valor: quem pagar digita o valor no banco.");
  return resultado(
    payloadPix({
      chave: chave.chave,
      recebedor: campos.recebedor,
      cidade: campos.cidade,
      ...(valor === undefined ? {} : { valor }),
      ...(identificador ? { txid: identificador } : {}),
    }),
    {},
    avisos,
  );
}

/** Em vCard, barra invertida, vírgula, ponto e vírgula e quebra de linha são escapados. */
export function escaparVcard(texto: string): string {
  return texto.trim().replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\r?\n/g, "\\n");
}

export function montarContato(campos: Campos["contato"]): Montado {
  if (vazio(campos.nome)) return resultado(null);
  const erros: Record<string, string> = {};
  const telefone = vazio(campos.telefone) ? null : telefoneBrasileiro(campos.telefone);
  if (!vazio(campos.telefone) && !telefone) erros.telefone = "Digite o número com DDD.";
  if (!vazio(campos.email) && !emailValido(campos.email)) erros.email = "E-mail inválido.";
  if (vazio(campos.telefone) && vazio(campos.email)) erros.telefone = "Informe ao menos um telefone ou e-mail.";
  const site = campos.site.trim();
  const siteCompleto = site === "" ? "" : /^https?:\/\//i.test(site) ? site : `https://${site}`;

  const partes = campos.nome.trim().split(/\s+/);
  const sobrenome = partes.length > 1 ? (partes.pop() ?? "") : "";
  const nome = partes.join(" ");
  const linhas = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escaparVcard(sobrenome)};${escaparVcard(nome)};;;`,
    `FN:${escaparVcard(campos.nome)}`,
  ];
  if (!vazio(campos.empresa)) linhas.push(`ORG:${escaparVcard(campos.empresa)}`);
  if (!vazio(campos.cargo)) linhas.push(`TITLE:${escaparVcard(campos.cargo)}`);
  if (telefone) linhas.push(`TEL;TYPE=CELL:+${telefone}`);
  if (!vazio(campos.email)) linhas.push(`EMAIL:${escaparVcard(campos.email)}`);
  if (siteCompleto) linhas.push(`URL:${escaparVcard(siteCompleto)}`);
  linhas.push("END:VCARD");
  return resultado(linhas.join("\r\n"), erros);
}

export function montarEmail({ para, assunto, mensagem }: Campos["email"]): Montado {
  if (vazio(para)) return resultado(null);
  if (!emailValido(para)) return resultado(null, { para: "E-mail inválido." });
  const parametros = [
    assunto.trim() ? `subject=${encodeURIComponent(assunto.trim())}` : "",
    mensagem.trim() ? `body=${encodeURIComponent(mensagem.trim())}` : "",
  ].filter(Boolean);
  return resultado(`mailto:${para.trim()}${parametros.length ? `?${parametros.join("&")}` : ""}`);
}

export function montar<T extends Tipo>(tipo: T, campos: Campos[T]): Montado {
  switch (tipo) {
    case "link":
      return montarLink(campos as Campos["link"]);
    case "texto":
      return montarTexto(campos as Campos["texto"]);
    case "whatsapp":
      return montarWhatsApp(campos as Campos["whatsapp"]);
    case "wifi":
      return montarWifi(campos as Campos["wifi"]);
    case "pix":
      return montarPix(campos as Campos["pix"]);
    case "contato":
      return montarContato(campos as Campos["contato"]);
    case "email":
      return montarEmail(campos as Campos["email"]);
  }
  return resultado(null);
}
