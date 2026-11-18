import { describe, expect, it } from "vitest";
import { cnpjValido, cpfValido, lerValor, telefoneBrasileiro } from "../src/conteudo/documentos.ts";
import {
  CAMPOS_INICIAIS,
  escaparVcard,
  escaparWifi,
  montarContato,
  montarEmail,
  montarLink,
  montarPix,
  montarTexto,
  montarWhatsApp,
  montarWifi,
} from "../src/conteudo/montar.ts";
import { crc16 } from "../src/conteudo/pix.ts";

describe("documentos", () => {
  it("valida os dígitos de CPF e CNPJ", () => {
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("529.982.247-24")).toBe(false);
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cnpjValido("11.222.333/0001-81")).toBe(true);
    expect(cnpjValido("11.222.333/0001-82")).toBe(false);
    expect(cnpjValido("00000000000000")).toBe(false);
  });

  it("normaliza telefone brasileiro com ou sem 55", () => {
    expect(telefoneBrasileiro("(15) 99999-0000")).toBe("5515999990000");
    expect(telefoneBrasileiro("+55 15 3333-0000")).toBe("551533330000");
    expect(telefoneBrasileiro("015 99999-0000")).toBe("5515999990000");
    expect(telefoneBrasileiro("99999-0000")).toBeNull();
    expect(telefoneBrasileiro("(10) 99999-0000")).toBeNull();
  });

  it("lê valores em reais", () => {
    expect(lerValor("25")).toBe(2500);
    expect(lerValor("25,9")).toBe(2590);
    expect(lerValor("1.234,56")).toBe(123456);
    expect(lerValor("25.90")).toBe(2590);
    expect(lerValor("abc")).toBeNull();
  });
});

describe("link", () => {
  it("completa https quando falta", () => {
    expect(montarLink({ url: "exemplo.com.br/cardapio" }).conteudo).toBe("https://exemplo.com.br/cardapio");
    expect(montarLink({ url: " https://exemplo.com " }).conteudo).toBe("https://exemplo.com");
  });

  it("recusa o que não é link e avisa sobre http", () => {
    expect(montarLink({ url: "javascript:alert(1)" }).erros.url).toBeDefined();
    expect(montarLink({ url: "palavra" }).erros.url).toBeDefined();
    expect(montarLink({ url: "http://exemplo.com" }).avisos[0]).toMatch(/HTTPS/);
  });

  it("não gera nada com o campo vazio, sem mostrar erro", () => {
    expect(montarLink({ url: "  " })).toEqual({ conteudo: null, erros: {}, avisos: [] });
    expect(montarTexto({ texto: "" }).conteudo).toBeNull();
  });
});

describe("WhatsApp", () => {
  it("monta o wa.me com DDI e mensagem codificada", () => {
    expect(montarWhatsApp({ telefone: "(15) 99999-0000", mensagem: "Quero o cardápio & preços" }).conteudo).toBe(
      "https://wa.me/5515999990000?text=Quero%20o%20card%C3%A1pio%20%26%20pre%C3%A7os",
    );
    expect(montarWhatsApp({ telefone: "15 99999-0000", mensagem: "" }).conteudo).toBe("https://wa.me/5515999990000");
  });

  it("pede o DDD", () => {
    expect(montarWhatsApp({ telefone: "99999-0000", mensagem: "" }).erros.telefone).toBeDefined();
  });
});

describe("Wi-Fi", () => {
  it("escapa os caracteres especiais do formato", () => {
    expect(escaparWifi('a;b,c:d\\e"f')).toBe('a\\;b\\,c\\:d\\\\e\\"f');
  });

  it("monta a rede com senha, sem senha e oculta", () => {
    expect(montarWifi({ rede: "Café; 2.4", seguranca: "WPA", senha: "senha:forte", oculta: false }).conteudo).toBe(
      "WIFI:T:WPA;S:Café\\; 2.4;P:senha\\:forte;;",
    );
    expect(montarWifi({ rede: "Visitantes", seguranca: "nopass", senha: "ignorada", oculta: true }).conteudo).toBe(
      "WIFI:T:nopass;S:Visitantes;H:true;;",
    );
  });

  it("confere o tamanho da senha WPA e avisa sobre WEP", () => {
    expect(montarWifi({ rede: "Casa", seguranca: "WPA", senha: "curta", oculta: false }).erros.senha).toBeDefined();
    expect(montarWifi({ rede: "Casa", seguranca: "WEP", senha: "12345", oculta: false }).avisos.join(" ")).toMatch(/WEP/);
  });
});

describe("Pix", () => {
  const base = { ...CAMPOS_INICIAIS.pix, recebedor: "Maria da Silva", cidade: "Sorocaba" };

  it("normaliza cada tipo de chave", () => {
    const cpf = montarPix({ ...base, tipoChave: "cpf-cnpj", chave: "529.982.247-25" }).conteudo ?? "";
    expect(cpf).toContain("011152998224725");
    const telefone = montarPix({ ...base, tipoChave: "telefone", chave: "(15) 99999-0000" }).conteudo ?? "";
    expect(telefone).toContain("0114+5515999990000");
    const email = montarPix({ ...base, tipoChave: "email", chave: "Loja@Exemplo.com.BR" }).conteudo ?? "";
    expect(email).toContain("0119loja@exemplo.com.br");
  });

  it("recusa CPF com dígito errado e identificador com espaço", () => {
    const resultado = montarPix({ ...base, chave: "529.982.247-24", identificador: "pedido 1" });
    expect(resultado.conteudo).toBeNull();
    expect(Object.keys(resultado.erros).sort()).toEqual(["chave", "identificador"]);
  });

  it("põe valor e identificador e mantém o CRC certo", () => {
    const codigo =
      montarPix({ ...base, chave: "11.222.333/0001-81", valor: "49,90", identificador: "MESA12" }).conteudo ?? "";
    expect(codigo).toContain("540549.90");
    expect(codigo).toContain("0506MESA12");
    expect(crc16(codigo.slice(0, -4))).toBe(codigo.slice(-4));
  });
});

describe("contato", () => {
  it("escapa vírgula, ponto e vírgula e quebra de linha", () => {
    expect(escaparVcard("Silva; Souza, Ltda\nMatriz")).toBe("Silva\\; Souza\\, Ltda\\nMatriz");
  });

  it("monta um vCard 3.0 com nome separado e telefone internacional", () => {
    const vcard = montarContato({
      nome: "Ana Maria Souza",
      empresa: "iTech",
      cargo: "",
      telefone: "(15) 99999-0000",
      email: "ana@exemplo.com",
      site: "exemplo.com",
    }).conteudo;
    expect(vcard?.split("\r\n")).toEqual([
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:Souza;Ana Maria;;;",
      "FN:Ana Maria Souza",
      "ORG:iTech",
      "TEL;TYPE=CELL:+5515999990000",
      "EMAIL:ana@exemplo.com",
      "URL:https://exemplo.com",
      "END:VCARD",
    ]);
  });

  it("exige telefone ou e-mail", () => {
    expect(montarContato({ ...CAMPOS_INICIAIS.contato, nome: "Ana" }).erros.telefone).toBeDefined();
  });
});

describe("e-mail", () => {
  it("monta o mailto com assunto e corpo codificados", () => {
    expect(montarEmail({ para: "loja@exemplo.com", assunto: "Orçamento", mensagem: "Olá & tudo bem?" }).conteudo).toBe(
      "mailto:loja@exemplo.com?subject=Or%C3%A7amento&body=Ol%C3%A1%20%26%20tudo%20bem%3F",
    );
    expect(montarEmail({ para: "loja@exemplo.com", assunto: "", mensagem: "" }).conteudo).toBe("mailto:loja@exemplo.com");
  });
});
