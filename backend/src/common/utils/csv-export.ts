import { Response } from 'express';

export interface CsvColumn {
  header: string;
  key: string;
  transform?: (value: any, row: any) => string;
}

function escapeCsvValue(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCsv(columns: CsvColumn[], data: any[]): string {
  const header = columns.map(c => escapeCsvValue(c.header)).join(',');
  const rows = data.map(row =>
    columns.map(col => {
      const val = col.key.split('.').reduce((o, k) => o?.[k], row);
      const final = col.transform ? col.transform(val, row) : val;
      return escapeCsvValue(final);
    }).join(','),
  );
  return [header, ...rows].join('\r\n');
}

export function sendCsvResponse(res: Response, filename: string, csv: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}
