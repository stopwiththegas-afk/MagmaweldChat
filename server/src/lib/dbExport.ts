import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  HeadingLevel,
} from 'docx';
import PDFDocument from 'pdfkit';

export interface DbExportData {
  exportedAt: string;
  users: Array<Record<string, unknown>>;
  dailyCodes: Array<Record<string, unknown>>;
  phoneVerifications: Array<Record<string, unknown>>;
  chats: Array<Record<string, unknown>>;
  participants: Array<Record<string, unknown>>;
  messages: Array<Record<string, unknown>>;
}

function objToRow(obj: Record<string, unknown>, keys: string[]): string[] {
  return keys.map((k) => {
    const v = obj[k];
    if (v == null) return '—';
    if (v instanceof Date) return v.toISOString();
    return String(v);
  });
}

/** Generate PDF buffer from export data */
export function buildPdfBuffer(data: DbExportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const fontSize = 9;
    doc.fontSize(12).text('Magmaweld DB Export', { underline: true }).moveDown(0.5);
    doc.fontSize(fontSize).text(`Выгружено: ${data.exportedAt}`).moveDown(1);

    function section(title: string, rows: Record<string, unknown>[], columns: string[]) {
      if (rows.length === 0) return;
      doc.fontSize(10).text(title, { underline: true }).moveDown(0.3);
      doc.fontSize(fontSize);
      doc.text(columns.join(' | ')).moveDown(0.2);
      for (const row of rows.slice(0, 500)) {
        doc.text(objToRow(row, columns).join(' | '));
      }
      doc.moveDown(0.5);
    }

    section('Users', data.users, ['id', 'phone', 'username', 'displayName', 'role', 'createdAt']);
    section('Daily codes', data.dailyCodes, ['date', 'code']);
    section('Phone verifications', data.phoneVerifications, ['phone', 'code', 'used', 'expiresAt']);
    section('Chats', data.chats, ['id', 'createdAt']);
    section('Participants', data.participants, ['chatId', 'userId']);
    section('Messages', data.messages, ['id', 'chatId', 'senderId', 'text', 'createdAt']);

    doc.end();
  });
}

/** Generate DOCX buffer from export data */
export async function buildDocxBuffer(data: DbExportData): Promise<Buffer> {
  function tableSection(title: string, rows: Record<string, unknown>[], columns: string[]) {
    const tableRows = [
      new TableRow({
        children: columns.map((c) => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: c, bold: true })] })],
        })),
      }),
      ...rows.slice(0, 300).map((row) => new TableRow({
        children: objToRow(row, columns).map((cell) => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: cell })] })],
        })),
      })),
    ];
    return [
      new Paragraph({ text: title, heading: HeadingLevel.HEADING_2 }),
      new Table({ rows: tableRows, width: { size: 100, type: 'pct' } }),
      new Paragraph({ text: '' }),
    ];
  }

  const children: (Paragraph | Table)[] = [
    new Paragraph({ text: 'Magmaweld DB Export', heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: `Выгружено: ${data.exportedAt}` }),
    new Paragraph({ text: '' }),
  ];

  if (data.users.length) children.push(...tableSection('Users', data.users, ['id', 'phone', 'username', 'displayName', 'role', 'createdAt']));
  if (data.dailyCodes.length) children.push(...tableSection('Daily codes', data.dailyCodes, ['date', 'code']));
  if (data.phoneVerifications.length) children.push(...tableSection('Phone verifications', data.phoneVerifications, ['phone', 'code', 'used', 'expiresAt']));
  if (data.chats.length) children.push(...tableSection('Chats', data.chats, ['id', 'createdAt']));
  if (data.participants.length) children.push(...tableSection('Participants', data.participants, ['chatId', 'userId']));
  if (data.messages.length) children.push(...tableSection('Messages', data.messages, ['id', 'chatId', 'senderId', 'text', 'createdAt']));

  const doc = new Document({
    sections: [{ children }],
  });
  return Packer.toBuffer(doc);
}
