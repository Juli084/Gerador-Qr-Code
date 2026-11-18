/** Só os dígitos de um texto. */
export function digitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

function todosIguais(numero: string): boolean {
  return /^(\d)\1+$/.test(numero);
}

/** Confere os dois dígitos verificadores do CPF. Pega a maior parte dos erros de digitação. */
export function cpfValido(cpf: string): boolean {
  const numero = digitos(cpf);
  if (numero.length !== 11 || todosIguais(numero)) return false;
  for (const tamanho of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(numero[i]) * (tamanho + 1 - i);
    const digito = ((soma * 10) % 11) % 10;
    if (digito !== Number(numero[tamanho])) return false;
  }
  return true;
}

/** Confere os dois dígitos verificadores do CNPJ numérico. */
export function cnpjValido(cnpj: string): boolean {
  const numero = digitos(cnpj);
  if (numero.length !== 14 || todosIguais(numero)) return false;
  for (const tamanho of [12, 13]) {
    const pesos = tamanho === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce((total, peso, i) => total + peso * Number(numero[i]), 0);
    const resto = soma % 11;
    const digito = resto < 2 ? 0 : 11 - resto;
    if (digito !== Number(numero[tamanho])) return false;
  }
  return true;
}

/**
 * Celular ou fixo brasileiro com DDD, com ou sem o 55 na frente. Devolve só dígitos com o
 * 55 (formato do wa.me e da chave Pix sem o "+"), ou null quando não parece um telefone.
 */
export function telefoneBrasileiro(texto: string): string | null {
  let numero = digitos(texto).replace(/^0+/, "");
  if (numero.length === 10 || numero.length === 11) numero = `55${numero}`;
  // DDD vai de 11 a 99 e nenhum termina em 0.
  if (!/^55[1-9][1-9]\d{8,9}$/.test(numero)) return null;
  return numero;
}

export function emailValido(texto: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(texto.trim());
}

/**
 * Converte "100", "12,50", "1.000,00" ou "R$ 12,50" em centavos. Com vírgula, os pontos são
 * separador de milhar; sem vírgula, um ponto seguido de 1 ou 2 dígitos é o decimal.
 */
export function lerValor(texto: string): number | null {
  let limpo = texto.replace(/[R$\s]/g, "");
  if (limpo.includes(",")) limpo = limpo.replace(/\./g, "").replace(",", ".");
  else if (!/^\d+\.\d{1,2}$/.test(limpo)) limpo = limpo.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  return Math.round(Number(limpo) * 100);
}
