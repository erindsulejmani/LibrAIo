import ExcelJS from "exceljs";
import { db } from "./db.ts";

const COLUMNS = [
  { header: "Titolo", key: "title", width: 40 },
  { header: "Autori", key: "authors", width: 30 },
  { header: "Editore", key: "publisher", width: 20 },
  { header: "Anno", key: "year", width: 8 },
  { header: "ISBN", key: "isbn", width: 16 },
  { header: "Lingua", key: "language", width: 8 },
  { header: "Generi", key: "genres", width: 25 },
  { header: "Riassunto", key: "description", width: 60 },
  { header: "Fonte riassunto", key: "description_source", width: 16 },
  { header: "Inserito con", key: "input_method", width: 14 },
  { header: "Data inserimento", key: "created_at", width: 18 },
];

export async function catalogWorkbook(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Catalogo");
  ws.columns = COLUMNS;
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: "A1", to: { row: 1, column: COLUMNS.length } };
  ws.addRows(db.prepare("SELECT * FROM books ORDER BY title COLLATE NOCASE").all());
  return Buffer.from(await wb.xlsx.writeBuffer());
}
