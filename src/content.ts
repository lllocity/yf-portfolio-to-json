interface NumberWithDate {
  value: number | null;
  date: string | null;
}

interface Holding {
  code: string;
  market: string;
  name: string;
  currentPrice: NumberWithDate;
  dividendYield: NumberWithDate;
  dividendPerShare: NumberWithDate;
  marketCap: NumberWithDate;
  pbr: NumberWithDate;
  per: NumberWithDate;
  eps: NumberWithDate;
  roe: number | null;
  equityRatio: number | null;
  operatingProfit: NumberWithDate;
  netIncome: NumberWithDate;
  interestBearingDebt: NumberWithDate;
  memo: string | null;
}

const HEADER_MAP = {
  NAME_CODE:             'コード・市場・名称',
  CURRENT_PRICE:         '現在値',
  DIVIDEND_YIELD:        '配当利回り',
  DIVIDEND_PER_SHARE:    '1株配当',
  MARKET_CAP:            '時価総額',
  PBR:                   'PBR',
  PER:                   'PER',
  EQUITY_RATIO:          '自己資本比率',
  ROE:                   'ROE',
  EPS:                   'EPS',
  OPERATING_PROFIT:      '営業利益',
  NET_INCOME:            '当期利益',
  INTEREST_BEARING_DEBT: '有利子負債',
  MEMO:                  'メモ',
} as const;

function findPortfolioTable(): HTMLTableElement | null {
  const tables = Array.from(document.querySelectorAll<HTMLTableElement>('table'));
  for (const table of tables) {
    if ((table.querySelector('thead, tr')?.textContent ?? '').includes('コード・市場・名称')) {
      return table;
    }
  }
  console.warn('[yf-portfolio] ポートフォリオテーブルが見つかりません');
  return tables[0] ?? null;
}

function buildColIndexMap(table: HTMLTableElement): Map<string, number> {
  const headerRow = table.querySelector('thead tr') ?? table.querySelector('tr');
  if (!headerRow) {
    console.warn('[yf-portfolio] ヘッダ行が見つかりません');
    return new Map();
  }
  const cells = Array.from(headerRow.querySelectorAll('th, td'));
  return new Map(cells.map((cell, i) => [cell.textContent?.trim() ?? '', i]));
}

function parseNumber(raw: string): number | null {
  const cleaned = raw
    // セル内の更新時刻 (09:41)・日付 (4/17)・決算期 (2027/03) は値の後ろに連結されるため先に除去
    .replace(/\d{1,2}:\d{2}.*$/, '')
    .replace(/\d{4}\/\d{2}.*$/, '')
    .replace(/\d{1,2}\/\d{1,2}.*$/, '')
    .replace(/\(連\)|\(単\)/g, '')
    .replace(/[倍円株%]/g, '')
    .replace(/百万/g, '')
    .replace(/[,\s¥+]/g, '')
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .trim();
  if (cleaned === '' || cleaned === '-' || cleaned === '--') return null;
  const value = parseFloat(cleaned);
  return isNaN(value) ? null : value;
}

// 「(連) 186,081 百万円」「44,138百万円」のような金額表記を円換算する
function parseLargeAmount(raw: string): number | null {
  const text = raw
    .replace(/\d{1,2}:\d{2}.*$/, '')
    .replace(/\d{4}\/\d{2}.*$/, '')
    .replace(/\d{1,2}\/\d{1,2}.*$/, '')
    .replace(/\(連\)|\(単\)/g, '')
    .replace(/[,\s]/g, '')
    .trim();
  if (!text || text === '-' || text === '--' || text === '―') return null;

  const chouMatch = text.match(/([\d.]+)兆/);
  if (chouMatch) return Math.round(parseFloat(chouMatch[1]) * 1e12);

  const okuMatch = text.match(/([\d.]+)億/);
  if (okuMatch) return Math.round(parseFloat(okuMatch[1]) * 1e8);

  const hyakumanMatch = text.match(/([\d.]+)百万/);
  if (hyakumanMatch) return Math.round(parseFloat(hyakumanMatch[1]) * 1e6);

  const manMatch = text.match(/([\d.]+)万/);
  if (manMatch) return Math.round(parseFloat(manMatch[1]) * 1e4);

  const valMatch = text.match(/^([+-]?[\d.]+)円?$/);
  if (!valMatch) return null;
  const val = parseFloat(valMatch[1]);
  return isNaN(val) ? null : val;
}


function getPrimaryText(cell: Element): string {
  // textContent を直接使うと "3,7506/16" のようにセカンダリ日付が連結されてしまうため
  // --medium クラスを持つプライマリ要素のみを対象にする
  const primary = cell.querySelector<HTMLElement>('[class*="--medium"]');
  if (primary) return primary.textContent?.trim() ?? '';
  const text = cell.textContent ?? '';
  return text.split('\n').map(s => s.trim()).find(s => s.length > 0) ?? '';
}

// セカンダリ行（更新日・決算期）の文字列を取得する
// M/D 形式の場合は実行時の年を補完して Y/M/D に統一する
function getCellDate(cell: Element): string | null {
  const el = cell.querySelector('[class*="--secondary"]');
  if (!el) return null;
  const text = el.textContent?.trim() ?? '';
  if (!text) return null;
  if (/^\d{1,2}\/\d{1,2}$/.test(text)) {
    return `${new Date().getFullYear()}/${text}`;
  }
  return text;
}

function getOptionalText(row: HTMLTableRowElement, colIndex: number | undefined): string | null {
  if (colIndex === undefined) return null;
  const cell = row.cells[colIndex];
  if (!cell) return null;
  const text = getPrimaryText(cell);
  return text.length > 0 ? text : null;
}

function getOptionalNumber(row: HTMLTableRowElement, colIndex: number | undefined): number | null {
  const text = getOptionalText(row, colIndex);
  return text !== null ? parseNumber(text) : null;
}

function getOptionalNumberWithDate(row: HTMLTableRowElement, colIndex: number | undefined): NumberWithDate {
  if (colIndex === undefined) return { value: null, date: null };
  const cell = row.cells[colIndex];
  if (!cell) return { value: null, date: null };
  const text = getPrimaryText(cell);
  return {
    value: text.length > 0 ? parseNumber(text) : null,
    date: getCellDate(cell),
  };
}

function getOptionalLargeAmountWithDate(row: HTMLTableRowElement, colIndex: number | undefined): NumberWithDate {
  if (colIndex === undefined) return { value: null, date: null };
  const cell = row.cells[colIndex];
  if (!cell) return { value: null, date: null };
  const text = (cell.textContent ?? '').trim();
  return {
    value: text.length > 0 ? parseLargeAmount(text) : null,
    date: getCellDate(cell),
  };
}

function parseNameCodeCell(cell: Element): Pick<Holding, 'code' | 'market' | 'name'> {
  const fullText = cell.textContent ?? '';

  // 4-5桁の純数字コード、または3桁数字＋英字1文字 (例: 464A) に対応
  const codeMatch = fullText.match(/(\d{4,5}|\d{3}[A-Z])/);
  const code = codeMatch?.[1] ?? '';

  // 銘柄名は数字で始まらない <a> リンクから取得
  let name = '';
  for (const link of Array.from(cell.querySelectorAll('a'))) {
    const linkText = link.textContent?.trim() ?? '';
    if (linkText && !/^\d/.test(linkText)) {
      name = linkText;
      break;
    }
  }
  if (!name) {
    const lines = fullText.split(/[\n\r]/).map(s => s.trim()).filter(Boolean);
    name = lines.find(l => !/^\d{4,5}/.test(l)) ?? '';
  }

  const afterCode = fullText.slice((codeMatch?.index ?? 0) + code.length);
  const market = afterCode.replace(name, '').replace(/[\s\n\r]+/g, ' ').trim();

  return { code, market, name };
}

function extractHoldings(): Holding[] {
  const table = findPortfolioTable();
  if (!table) return [];

  const colIdx = buildColIndexMap(table);
  const idx = (key: keyof typeof HEADER_MAP): number | undefined => colIdx.get(HEADER_MAP[key]);

  const nameCodeColIdx = idx('NAME_CODE');
  if (nameCodeColIdx === undefined) {
    console.warn('[yf-portfolio] "コード・市場・名称" 列が見つかりません');
    return [];
  }

  const holdings: Holding[] = [];

  for (const row of Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr'))) {
    try {
      const nameCodeCell = row.cells[nameCodeColIdx];
      if (!nameCodeCell) continue;

      const { code, market, name } = parseNameCodeCell(nameCodeCell);
      if (!/^(\d{4,5}|\d{3}[A-Z])$/.test(code)) continue;

      holdings.push({
        code,
        market,
        name,
        currentPrice:        getOptionalNumberWithDate(row, idx('CURRENT_PRICE')),
        dividendYield:       getOptionalNumberWithDate(row, idx('DIVIDEND_YIELD')),
        dividendPerShare:    getOptionalNumberWithDate(row, idx('DIVIDEND_PER_SHARE')),
        marketCap:           getOptionalLargeAmountWithDate(row, idx('MARKET_CAP')),
        pbr:                 getOptionalNumberWithDate(row, idx('PBR')),
        per:                 getOptionalNumberWithDate(row, idx('PER')),
        eps:                 getOptionalNumberWithDate(row, idx('EPS')),
        roe:                 getOptionalNumber(row, idx('ROE')),
        equityRatio:         getOptionalNumber(row, idx('EQUITY_RATIO')),
        operatingProfit:     getOptionalLargeAmountWithDate(row, idx('OPERATING_PROFIT')),
        netIncome:           getOptionalLargeAmountWithDate(row, idx('NET_INCOME')),
        interestBearingDebt: getOptionalLargeAmountWithDate(row, idx('INTEREST_BEARING_DEBT')),
        memo:                getOptionalText(row, idx('MEMO')),
      });
    } catch (err) {
      console.warn('[yf-portfolio] 行スキップ:', err);
    }
  }

  return holdings;
}

function injectCopyButton(): void {
  document.getElementById('yf-portfolio-copy-btn')?.remove();

  const btn = document.createElement('button');
  btn.id = 'yf-portfolio-copy-btn';
  btn.textContent = 'JSONコピー';

  Object.assign(btn.style, {
    position:     'fixed',
    bottom:       '24px',
    right:        '24px',
    zIndex:       '2147483647',
    padding:      '10px 20px',
    background:   '#2a7a2a',
    color:        '#fff',
    border:       'none',
    borderRadius: '6px',
    fontSize:     '13px',
    fontWeight:   'bold',
    cursor:       'pointer',
    boxShadow:    '0 2px 8px rgba(0,0,0,0.3)',
    transition:   'background 0.15s',
  });

  btn.addEventListener('mouseenter', () => { btn.style.background = '#1f5e1f'; });
  btn.addEventListener('mouseleave', () => { btn.style.background = '#2a7a2a'; });

  btn.addEventListener('click', async () => {
    const holdings = extractHoldings();
    try {
      await navigator.clipboard.writeText(JSON.stringify(holdings, null, 2));
      btn.textContent = `✓ ${holdings.length}件コピー完了`;
      btn.style.background = '#1f5e1f';
    } catch {
      console.error('[yf-portfolio] クリップボードへのコピーに失敗しました');
      btn.textContent = 'コピー失敗';
      btn.style.background = '#888';
    }
    setTimeout(() => {
      btn.textContent = 'JSONコピー';
      btn.style.background = '#2a7a2a';
    }, 2500);
  });

  document.body.appendChild(btn);
}

(function main() {
  injectCopyButton();
})();
