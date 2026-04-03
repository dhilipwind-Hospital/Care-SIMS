import api from './api';

/** Download CSV from a backend export endpoint */
export async function downloadCsv(endpoint: string, params: Record<string, any> = {}, filename: string) {
  const response = await api.get(endpoint, {
    params,
    responseType: 'blob',
  });
  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

/** Generate CSV client-side from table data */
export function exportTableToCsv(
  columns: { header: string; key: string; transform?: (val: any, row: any) => string }[],
  data: any[],
  filename: string,
) {
  const escape = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.map(c => escape(c.header)).join(',');
  const rows = data.map(row =>
    columns.map(col => {
      const val = col.key.split('.').reduce((o: any, k) => o?.[k], row);
      const final = col.transform ? col.transform(val, row) : val;
      return escape(final);
    }).join(','),
  );

  const csv = [header, ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
