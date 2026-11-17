# Gerador de QR Code

Gera QR Code a partir de um texto ou link, com cor e tamanho ajustáveis, e baixa o resultado em PNG.
Tudo acontece no navegador: nada do que é digitado sai da página.

## Como funciona

- O QR Code é gerado pela biblioteca [`qrcode`](https://github.com/soldair/node-qrcode) como PNG. A
  mesma imagem aparece na tela e é baixada, então o arquivo é exatamente o que se vê.
- O tamanho vai de 128 a 1024 px. Na tela a imagem fica limitada a 300 px; o download sai no tamanho
  escolhido.
- Se o texto passar do limite que um QR Code comporta, a página avisa em vez de falhar em silêncio.

## Rodando localmente

Requer Node 20.19 ou 22.12 em diante.

```bash
npm install
npm run dev
```

```bash
npm run lint
npm run build
```

## Stack

React 19 e Vite. O projeto começou em 2022 com Create React App e foi migrado para Vite quando o CRA
deixou de ser mantido.
