# gastos-ocr

Foto de nota → texto reconhecido + valores em R$ no navegador. Sem servidor, sem contas, sem chaves de API.

**Demo:** https://naejshaw.github.io/gastos-ocr/

## O que faz
1. Você escolhe uma foto da nota (ou usa a câmera do celular).
2. O OCR roda no próprio navegador (tesseract.js, idioma `por`) e cola o texto num campo editável.
3. Valores com `R$` viram linhas conferíveis — desmarque o que não é gasto, edite à mão se quiser.
4. O total soma em centavos e dá para exportar texto, CSV ou JSON.

## Como rodar
```sh
pnpm install
pnpm dev        # desenvolvimento
pnpm build      # checa tipos + gera dist/
pnpm site       # gera docs/ (site estático para o GitHub Pages)
pnpm preview    # serve o build localmente
```

A primeira execução do OCR baixa o idioma `por` (alguns MB) de uma CDN e guarda em IndexedDB.

## Estado honesto
É um MVP para aprender o caminho completo (repo + app + publicação). Já funciona de ponta a ponta, mas ainda é simples:

- A acurácia depende da foto — luz, ângulo e fonte da nota mudam o resultado. Confira o texto antes de exportar.
- Só valores escritos com `R$` são lidos (escolha para evitar falsos positivos).
- Não guarda despesas, não cria categorias, não gera relatório.

Detalhes de decisão: ver [`DEVELOPER.md`](./DEVELOPER.md).