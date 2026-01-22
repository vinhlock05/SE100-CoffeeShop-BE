import * as ExcelJS from 'exceljs';
import { Response } from 'express';

export class ExportImportService {
  
  // -- GENERIC EXPORT --
  async exportToExcel<T>(
    data: T[],
    columns: { header: string; key: keyof T; width?: number }[],
    sheetName: string,
    res: Response,
    fileName: string
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = columns as any;

    // Add Data
    worksheet.addRows(data);

    // Style Header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${fileName}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  // -- GENERIC TEMPLATE GENERATOR --
  async generateTemplate(
    columns: { header: string; key: string; width?: number; note?: string }[],
    sheetName: string,
    res: Response,
    fileName: string,
    extraSheets?: { name: string; columns: { header: string; key: string; width?: number }[]; data: any[] }[]
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = columns.map(c => ({
        header: c.header,
        key: c.key,
        width: c.width || 20
    }));

    // Style Header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF00' } // Yellow for template headers
    };

    // Add Note row (optional)
    if (columns.some(c => c.note)) {
        const noteRow = worksheet.addRow(columns.map(c => c.note || ""));
        noteRow.font = { italic: true, color: { argb: 'FF808080' } };
    }

    // Add Extra Sheets (References)
    if (extraSheets && extraSheets.length > 0) {
        for (const sheet of extraSheets) {
            const extraWs = workbook.addWorksheet(sheet.name);
            extraWs.columns = sheet.columns.map(c => ({
                header: c.header,
                key: c.key,
                width: c.width || 20
            }));
            
            // Style Header
            const refHeaderRow = extraWs.getRow(1);
            refHeaderRow.font = { bold: true };
            refHeaderRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };

            extraWs.addRows(sheet.data);
        }
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${fileName}_template.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  // -- GENERIC PARSER --
  async parseExcel<T>(buffer: any, mapRow: (row: ExcelJS.Row) => T | null): Promise<T[]> {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0]; // Assume first sheet

      const results: T[] = [];
      
      // Skip header row (1)
      worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Skip header
          // Optional: Skip note row if present (logic depends on specific template)

          const parsed = mapRow(row);
          if (parsed) results.push(parsed);
      });

      return results;
  }
}
