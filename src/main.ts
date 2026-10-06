import { createWorker, type Worker } from 'tesseract.js';

interface DetectedAmount {
  id: number;
  cents: number;
  context: string;
  include: boolean;
}

const q = <T extends HTMLElement>(selector: string): T => {
  const el = document.querySelector<T>(selector);
  if (el == null) throw new Error(`missing element: ${selector}`);
  return el;
};

const fileInput = q<HTMLInputElement>('#file');
const sampleButton = q<HTMLButtonElement>('#sample');
const preview = q<HTMLImageElement>('#preview');
const progressEl = q<HTMLProgressElement>('#progress');
const statusEl = q<HTMLParagraphElement>('#status');
const rawEl = q<HTMLTextAreaElement>('#raw');
const rescanButton = q<HTMLButtonElement>('#rescan');
const totalEl = q<HTMLSpanElement>('#total');
const amountsEl = q<HTMLUListElement>('#amounts');
const copyButton = q<HTMLButtonElement>('#copy');
const csvButton = q<HTMLButtonElement>('#csv');
const jsonButton = q<HTMLButtonElement>('#json');

const SAMPLE_SRC = './sample-receipt.png';
const AMOUNT_RE = /R\$\s*((?:[0-9]{1,3}(?:\.[0-9]{3})+|[0-9]+)(?:,[0-9]{2})?)/g;

let worker: Worker | null = null;
let amounts: DetectedAmount[] = [];
let nextId = 0;
let busy = false;

const formatCents = (cents: number): string => {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const integer = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, '0');
  const withDots = integer.toLocaleString('pt-BR');
  return `${sign}${withDots},${fraction}`;
};

const parseAmount = (match: string): number => {
  const cleaned = match.replace(/\s/g, '').replace('R$', '').replace(/^0+/, '');
  if (cleaned.includes(',')) {
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    return Math.round(Number.parseFloat(normalized) * 100);
  }
  const normalized = cleaned.replace(/\./g, '');
  return Number.parseInt(normalized, 10) * 100;
};

const contextAround = (text: string, indexStart: number, indexEnd: number): string => {
  return text.slice(Math.max(0, indexStart - 34), indexEnd + 22).replace(/[ \t]+/g, ' ').trim();
};

const scan = (): void => {
  const text = rawEl.value;
  const found: DetectedAmount[] = [];
  let sequence = 0;
  for (const match of text.matchAll(AMOUNT_RE)) {
    const raw = match[0];
    const index = match.index ?? 0;
    found.push({
      id: nextId++,
      cents: parseAmount(raw),
      context: contextAround(text, index, index + raw.length),
      include: true,
    });
    sequence += 1;
  }
  amounts = found;
  render();
};

const render = (): void => {
  amountsEl.replaceChildren(...amounts.map((amount) => {
    const li = document.createElement('li');

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = amount.include;
    toggle.setAttribute('data-testid', 'amount-toggle');
    toggle.addEventListener('change', () => {
      amount.include = toggle.checked;
      updateTotal();
    });

    const value = document.createElement('input');
    value.type = 'number';
    value.step = '0.01';
    value.value = (amount.cents / 100).toFixed(2);
    value.setAttribute('data-testid', 'amount-value');
    value.addEventListener('input', () => {
      const parsed = Number.parseFloat(value.value.replace(',', '.'));
      amount.cents = Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
      updateTotal();
    });

    const ctx = document.createElement('span');
    ctx.className = 'ctx';
    ctx.textContent = amount.context;

    li.append(toggle, value, ctx);
    return li;
  }));
  updateTotal();
};

const updateTotal = (): void => {
  const total = amounts.filter((a) => a.include).reduce((sum, a) => sum + a.cents, 0);
  totalEl.textContent = `R$ ${formatCents(total)}`;
  totalEl.setAttribute('data-testid', 'total');
  const any = amounts.length > 0;
  copyButton.disabled = !any;
  csvButton.disabled = !any;
  jsonButton.disabled = !any;
};

const setStatus = (message: string, isError = false): void => {
  statusEl.textContent = message;
  statusEl.classList.toggle('status--error', isError);
};

const setProgress = (value: number, visible: boolean): void => {
  progressEl.value = value;
  progressEl.hidden = !visible;
};

const getWorker = async (): Promise<Worker> => {
  if (worker != null) return worker;
  setStatus('Preparando o motor de OCR (primeira vez baixa o idioma por).');
  setProgress(0, true);
  worker = await createWorker('por', 1, {
    logger: (m) => {
      if (m.status === 'loading tesseract core' || m.status === 'initializing api') {
        setProgress(m.progress, true);
      }
    },
  });
  setProgress(0, false);
  return worker;
};

const recognizeImage = async (image: File | string): Promise<void> => {
  if (busy) return;
  busy = true;
  rescanButton.disabled = true;
  sampleButton.disabled = true;
  fileInput.disabled = true;

  if (typeof image === 'string') {
    const img = new Image();
    img.src = image;
    await img.decode().catch(() => undefined);
  }

  try {
    const engine = await getWorker();
    setStatus('Lendo a nota… (valores podem variar com a qualidade da foto)');
    setProgress(0, true);
    const { data } = await engine.recognize(image, {}, { text: true });
    setProgress(0, false);
    rawEl.value = data.text.trim();
    scan();
    setStatus('Pronto. Confira o texto e desmarque o que não for gasto.');
  } catch (error) {
    console.error(error);
    setStatus('Falha ao reconhecer. Tente outra foto com mais luz e contraste.', true);
  } finally {
    busy = false;
    rescanButton.disabled = false;
    sampleButton.disabled = false;
    fileInput.disabled = false;
  }
};

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (file == null) return;
  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
  void recognizeImage(file);
});

sampleButton.addEventListener('click', () => {
  preview.src = SAMPLE_SRC;
  preview.hidden = false;
  void recognizeImage(SAMPLE_SRC);
});

rescanButton.addEventListener('click', scan);

copyButton.addEventListener('click', () => {
  const text = rawEl.value.trim();
  const values = amounts
    .filter((a) => a.include)
    .map((a) => `R$ ${formatCents(a.cents)} — ${a.context}`)
    .join('\n');
  void navigator.clipboard?.writeText(`${text}\n\n${values}`).then(() => setStatus('Copiado.'));
});

csvButton.addEventListener('click', () => {
  const rows = amounts
    .filter((a) => a.include)
    .map((a) => `${formatCents(a.cents)},${a.context.replace(/"/g, '""')}`)
    .join('\n');
  download('gastos-ocr.csv', `valor,contexto\n${rows}\n`);
});

jsonButton.addEventListener('click', () => {
  const data = {
    valores: amounts
      .filter((a) => a.include)
      .map((a) => ({ valor: `R$ ${formatCents(a.cents)}`, contexto: a.context })),
    total: `R$ ${formatCents(amounts.filter((a) => a.include).reduce((sum, a) => sum + a.cents, 0))}`,
  };
  download('gastos-ocr.json', JSON.stringify(data, null, 2));
});

const download = (name: string, content: string): void => {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};

updateTotal();