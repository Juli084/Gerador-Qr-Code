import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

function vigiar(page: Page) {
  const problemas: string[] = [];
  page.on("pageerror", (erro) => problemas.push(erro.message));
  page.on("console", (mensagem) => {
    if (mensagem.type() === "error") problemas.push(mensagem.text());
  });
  page.on("request", (requisicao) => {
    const url = requisicao.url();
    if (!url.startsWith("http://localhost") && !url.startsWith("blob:") && !url.startsWith("data:")) {
      problemas.push(`requisição externa: ${url}`);
    }
  });
  return problemas;
}

const conferido = /Leitura conferida/;

test("gera, confere e baixa um QR Code de link", async ({ page }) => {
  const problemas = vigiar(page);
  await page.goto("/");
  await page.getByRole("textbox", { name: "Link" }).fill("exemplo.com.br/cardapio");
  await expect(page.getByRole("img", { name: "Prévia do QR Code" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText(conferido);
  await page.getByText(/Conteúdo gravado no código/).click();
  await expect(page.locator("pre")).toHaveText("https://exemplo.com.br/cardapio");

  const [svg] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /SVG/ }).click()]);
  expect(svg.suggestedFilename()).toBe("qrcode-link.svg");
  expect(await readFile(await svg.path(), "utf-8")).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);

  const [png] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "PNG" }).click()]);
  const bytes = await readFile(await png.path());
  expect(bytes.subarray(1, 4).toString()).toBe("PNG");
  // Largura do PNG no cabeçalho IHDR: 1024 px, o tamanho padrão.
  expect(bytes.readUInt32BE(16)).toBe(1024);

  expect(problemas).toEqual([]);
});

test("monta o Wi-Fi com caracteres escapados e confere a leitura", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Wi-Fi", { exact: true }).click();
  await page.getByLabel("Nome da rede").fill("Café; Visitantes");
  await page.getByRole("textbox", { name: "Senha" }).fill("curta");
  await expect(page.getByText("Senha de WPA/WPA2/WPA3 tem de 8 a 63 caracteres.")).toBeVisible();
  await page.getByRole("textbox", { name: "Senha" }).fill("senha:segura");
  await expect(page.getByRole("status")).toHaveText(conferido);
  await page.getByText(/Conteúdo gravado no código/).click();
  await expect(page.locator("pre")).toHaveText("WIFI:T:WPA;S:Café\\; Visitantes;P:senha\\:segura;;");
});

test("recusa CPF inválido e gera o Pix com valor", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Pix", { exact: true }).click();
  await page.getByLabel("Chave Pix").fill("529.982.247-24");
  await page.getByLabel("Nome de quem recebe").fill("Maria da Silva");
  await page.getByLabel("Cidade").fill("Sorocaba");
  await expect(page.getByText("CPF inválido: confira os números.")).toBeVisible();
  await page.getByLabel("Chave Pix").fill("529.982.247-25");
  await page.getByLabel(/Valor/).fill("49,90");
  await expect(page.getByRole("status")).toHaveText(conferido);
  await page.getByText(/Conteúdo gravado no código/).click();
  await expect(page.locator("pre")).toContainText("br.gov.bcb.pix011152998224725");
  await expect(page.locator("pre")).toContainText("540549.90");
});

test("com logo, sobe a correção para H e o código continua lendo", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Link" }).fill("https://exemplo.com.br");
  await page.getByLabel(/Logo no centro/).setInputFiles("public/favicon.svg");
  await expect(page.getByRole("img", { name: "Logo escolhido" })).toBeVisible();
  await expect(page.getByLabel("H · 30%")).toBeChecked();
  await expect(page.getByRole("status")).toHaveText(conferido);
  await page.getByLabel("Texto abaixo do código").fill("Aponte a câmera");
  await expect(page.getByRole("status")).toHaveText(conferido);
});

test("avisa sobre contraste baixo", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Link" }).fill("https://exemplo.com.br");
  await page.getByLabel("Cor do código", { exact: true }).fill("#e0e0e0");
  await expect(page.getByText(/Contraste baixo/)).toBeVisible();
});

test("cabe na tela do celular sem rolagem lateral", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Contato", { exact: true }).click();
  const sobra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(sobra).toBeLessThanOrEqual(0);
});
