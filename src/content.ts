interface Holding {
  code: string;
  market: string;
  name: string;
  currentPrice: number | null;
  earningsDate: string | null;   // 決算発表日
  dividendYield: number | null;  // 配当利回り（%）
  profitLoss: number | null;     // 損益（円）
  profitLossRate: number | null; // 損益率（%）
  marketCap: number | null;      // 時価総額（円）
  pbr: number | null;
  per: number | null;
  marginBuy: number | null;
  marginSell: number | null;
  memo: string | null;
}

const HEADER_MAP = {
  NAME_CODE:      'コード・市場・名称',
  CURRENT_PRICE:  '現在値',
  EARNINGS_DATE:  '決算発表日',
  DIVIDEND_YIELD: '配当利回り',
  PROFIT_LOSS:    '損益',
  MARKET_CAP:     '時価総額',
  PBR:            'PBR',
  PER:            'PER',
  MARGIN_BUY:     '信用買残',
  MARGIN_SELL:    '信用売残',
  MEMO:           'メモ',
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
    // セル内の更新時刻 (09:41) や日付 (4/17) は値の後ろに連結されるため先に除去
    .replace(/\d{1,2}:\d{2}.*$/, '')
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

function parseProfitLossCell(raw: string): { profitLoss: number | null; profitLossRate: number | null } {
  const text = raw
    .replace(/\d{1,2}:\d{2}.*$/, '')
    .replace(/\d{1,2}\/\d{1,2}.*$/, '');

  // 割合: "%" で終わる数値を抽出
  const rateMatch = text.match(/([-+]?\d[\d,]*\.?\d*)%/);
  const profitLossRate = rateMatch ? parseFloat(rateMatch[1]) : null;

  // 金額: 割合部分より前のテキスト
  const amountText = rateMatch ? text.slice(0, text.lastIndexOf(rateMatch[0])) : text;
  const profitLoss = parseNumber(amountText);

  return { profitLoss, profitLossRate };
}

function getPrimaryText(cell: Element): string {
  const text = cell.textContent ?? '';
  return text.split('\n').map(s => s.trim()).find(s => s.length > 0) ?? '';
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

function parseNameCodeCell(cell: Element): Pick<Holding, 'code' | 'market' | 'name'> {
  const fullText = cell.textContent ?? '';

  const codeMatch = fullText.match(/(\d{4,5})/);
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
      if (!/^\d{4,5}$/.test(code)) continue;

      const earningsRaw = getOptionalText(row, idx('EARNINGS_DATE'));
      const plRaw = row.cells[idx('PROFIT_LOSS') ?? -1]?.textContent ?? '';
      const { profitLoss, profitLossRate } = parseProfitLossCell(plRaw);
      const rawMarketCap = getOptionalNumber(row, idx('MARKET_CAP'));

      holdings.push({
        code,
        market,
        name,
        currentPrice:  getOptionalNumber(row, idx('CURRENT_PRICE')),
        earningsDate:  earningsRaw?.replace(/\(連\)|\(単\)/g, '').trim() ?? null,
        dividendYield: getOptionalNumber(row, idx('DIVIDEND_YIELD')),
        profitLoss,
        profitLossRate,
        marketCap:     rawMarketCap !== null ? rawMarketCap * 1_000_000 : null,
        pbr:           getOptionalNumber(row, idx('PBR')),
        per:           getOptionalNumber(row, idx('PER')),
        marginBuy:     getOptionalNumber(row, idx('MARGIN_BUY')),
        marginSell:    getOptionalNumber(row, idx('MARGIN_SELL')),
        memo:          getOptionalText(row, idx('MEMO')),
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
