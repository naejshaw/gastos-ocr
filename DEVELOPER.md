# Decisões do gastos-ocr

Anotadas para não perder o "porquê" de cada escolha.

## Stack
- Vite + TypeScript puro (sem framework). Uma página, bundle enxuto (~20 kB gz), fácil de servir estático.
- `tesseract.js` v7 no navegador: OCR roda no Web Worker do usuário. Não há backend, conta ou API key. A primeira execução busca o core + idioma `por` de uma CDN e cacheia em IndexedDB; o worker é criado uma vez e reutilizado entre fotos.

## Lei de lançamento (economia de falsos positivos)
- Todo e qualquer `R$` no texto vira uma linha editável; texto sem `R$` (datas, quantidades) não vira lançamento.
- O campo de texto é editável: digite `R$ 5,00` onde o OCR errou e clique em **Ler os valores do texto**.
- Cada linha tem checkbox (incluir no total) e valor editável; o total soma só as marcadas.

## Dinheiro em centavos
- Soma feita em inteiros de centavos, evitando erro de ponto flutuante (`0.1 + 0.2`).
- `parseAmount`: com vírgula → decimal virgular; sem vírgula → inteiro × 100.

## Publicação
- `vite.config.ts` com `base: './'` para funcionar em subpath do GitHub Pages.
- Pages legado na branch `main` servindo `/docs`: rodar `pnpm site` gera o site pronto (cópia de `dist/`) e o commit leva o deploy junto. Simples e sem Action.
- `docs/` é gerado e vai ao git de propósito; `dist/` e `node_modules` são ignorados.

## Dependências
- `pnpm-workspace.yaml` autoriza build scripts só de `esbuild` e `tesseract.js` (`onlyBuiltDependencies`).

## Nota de teste
- `public/sample-receipt.png` é uma nota renderizada (HTML + headless Chrome, 2× scale) para demonstração off-line e testes. Reproduzir: `scripts/generate-sample-receipt.sh`.

## Limites conhecidos
- OCR impreciso depende de luz/ângulo/fonte; sem pré-processamento da imagem.
- Sem persistência de lançamentos, categorias ou relatório — próximos passos naturais.