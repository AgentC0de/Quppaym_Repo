import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ColumnDef<T> = { header: string; render: (row: T) => string };

export function exportTableToPdf<T>(title: string, columns: ColumnDef<T>[], rows: T[]) {
  const styles = `
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial; color: #111; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { padding: 8px 10px; border-bottom: 1px solid #e6e6e6; text-align: left; }
    th { background: #fafafa; font-weight: 600; }
    h1 { font-size: 18px; margin: 0; }
  `;

  const headerHtml = columns.map((c) => `<th>${c.header}</th>`).join("\n");
  const rowsHtml = rows
    .map((r) =>
      `<tr>${columns.map((c) => `<td>${c.render(r)}</td>`).join("")}</tr>`
    )
    .join("\n");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${styles}</style></head><body><h1>${title}</h1><table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  // give browser a tick to render
  setTimeout(() => {
    try {
      w.print();
    } catch (e) {
      // ignore
    }
  }, 250);
}
