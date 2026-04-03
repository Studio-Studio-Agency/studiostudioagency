import jsPDF from "jspdf";
import { KATEGORIEN } from "@/components/ListItemRow";
import { getCategorySortIndex } from "@/lib/categoryOrder";

interface PdfItem {
  name: string;
  is_checked: boolean;
  kategorie?: string | null;
  menge?: number | null;
  einheit?: string | null;
  preis?: number | null;
}

export function generateListPdf(listName: string, items: PdfItem[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const usable = pageWidth - margin * 2;
  let y = 20;

  const checkPage = (needed: number) => {
    if (y + needed > 277) {
      doc.addPage();
      y = 20;
    }
  };

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(listName, margin, y);
  y += 6;

  // Date
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(130, 130, 130);
  doc.text(new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" }), margin, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  const unchecked = items.filter(i => !i.is_checked);
  const checked = items.filter(i => i.is_checked);

  // Group unchecked by category
  const grouped: Record<string, PdfItem[]> = {};
  unchecked.forEach(item => {
    const cat = item.kategorie || "Sonstiges";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });
  const sortedCats = Object.keys(grouped).sort((a, b) => getCategorySortIndex(a) - getCategorySortIndex(b));

  const renderItem = (item: PdfItem, struck: boolean) => {
    checkPage(7);
    const boxSize = 3.5;
    const boxY = y - boxSize + 0.5;

    // Checkbox
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    if (struck) {
      doc.setFillColor(180, 180, 180);
      doc.rect(margin, boxY, boxSize, boxSize, "FD");
      // checkmark
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.5);
      doc.line(margin + 0.7, boxY + 1.8, margin + 1.4, boxY + 2.8);
      doc.line(margin + 1.4, boxY + 2.8, margin + 2.8, boxY + 0.8);
      doc.setDrawColor(180, 180, 180);
    } else {
      doc.rect(margin, boxY, boxSize, boxSize);
    }

    // Item text
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    if (struck) doc.setTextColor(160, 160, 160);
    else doc.setTextColor(0, 0, 0);

    let label = item.name;
    if (item.menge) {
      label += ` (${item.menge}${item.einheit ? " " + item.einheit : ""})`;
    }
    doc.text(label, margin + boxSize + 3, y);

    // Price on the right
    if (item.preis != null) {
      const priceStr = `€ ${item.preis.toFixed(2)}`;
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      const pw = doc.getTextWidth(priceStr);
      doc.text(priceStr, margin + usable - pw, y);
    }

    doc.setTextColor(0, 0, 0);
    y += 6.5;
  };

  // Render unchecked
  if (sortedCats.length > 0) {
    sortedCats.forEach(cat => {
      checkPage(12);
      const emoji = KATEGORIEN[cat] || "📦";
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text(`${emoji}  ${cat}`, margin, y);
      doc.setTextColor(0, 0, 0);
      y += 5;
      // line
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(margin, y - 2, margin + usable, y - 2);

      grouped[cat].forEach(item => renderItem(item, false));
      y += 2;
    });
  }

  // Render checked
  if (checked.length > 0) {
    checkPage(12);
    y += 4;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + usable, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(130, 130, 130);
    doc.text(`Gekauft (${checked.length})`, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 6;
    checked.forEach(item => renderItem(item, true));
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(170, 170, 170);
    doc.text("goodgoods.app", margin, 290);
    doc.text(`${i}/${totalPages}`, pageWidth - margin - 8, 290);
  }

  doc.save(`${listName.replace(/[^a-zA-Z0-9äöüÄÖÜß ]/g, "")}.pdf`);
}

/** Generate PDF and return as Blob (for upload/email) */
export function generateListPdfBlob(listName: string, items: PdfItem[]): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const usable = pageWidth - margin * 2;
  let y = 20;

  const checkPage = (needed: number) => {
    if (y + needed > 277) { doc.addPage(); y = 20; }
  };

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(listName, margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(130, 130, 130);
  doc.text(new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" }), margin, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  const unchecked = items.filter(i => !i.is_checked);
  const checked = items.filter(i => i.is_checked);

  const grouped: Record<string, PdfItem[]> = {};
  unchecked.forEach(item => {
    const cat = item.kategorie || "Sonstiges";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });
  const sortedCats = Object.keys(grouped).sort((a, b) => getCategorySortIndex(a) - getCategorySortIndex(b));

  const renderItem = (item: PdfItem, struck: boolean) => {
    checkPage(7);
    const boxSize = 3.5;
    const boxY = y - boxSize + 0.5;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    if (struck) {
      doc.setFillColor(180, 180, 180);
      doc.rect(margin, boxY, boxSize, boxSize, "FD");
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.5);
      doc.line(margin + 0.7, boxY + 1.8, margin + 1.4, boxY + 2.8);
      doc.line(margin + 1.4, boxY + 2.8, margin + 2.8, boxY + 0.8);
      doc.setDrawColor(180, 180, 180);
    } else {
      doc.rect(margin, boxY, boxSize, boxSize);
    }
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    if (struck) doc.setTextColor(160, 160, 160);
    else doc.setTextColor(0, 0, 0);
    let label = item.name;
    if (item.menge) label += ` (${item.menge}${item.einheit ? " " + item.einheit : ""})`;
    doc.text(label, margin + boxSize + 3, y);
    if (item.preis != null) {
      const priceStr = `€ ${item.preis.toFixed(2)}`;
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      const pw = doc.getTextWidth(priceStr);
      doc.text(priceStr, margin + usable - pw, y);
    }
    doc.setTextColor(0, 0, 0);
    y += 6.5;
  };

  if (sortedCats.length > 0) {
    sortedCats.forEach(cat => {
      checkPage(12);
      const emoji = KATEGORIEN[cat] || "📦";
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text(`${emoji}  ${cat}`, margin, y);
      doc.setTextColor(0, 0, 0);
      y += 5;
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(margin, y - 2, margin + usable, y - 2);
      grouped[cat].forEach(item => renderItem(item, false));
      y += 2;
    });
  }

  if (checked.length > 0) {
    checkPage(12);
    y += 4;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + usable, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(130, 130, 130);
    doc.text(`Gekauft (${checked.length})`, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 6;
    checked.forEach(item => renderItem(item, true));
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(170, 170, 170);
    doc.text("goodgoods.app", margin, 290);
    doc.text(`${i}/${totalPages}`, pageWidth - margin - 8, 290);
  }

  return doc.output("blob") as unknown as Blob;
}
