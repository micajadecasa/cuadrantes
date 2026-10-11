import { jsPDF } from 'jspdf';
import {
  ConvenioSettings,
  DayInfo,
  Employee,
  EmployeeMonthStats,
  ShiftType,
} from '../types/quadrant';
import { GASTEIZ_LOGO_DATA_URL } from '../constants/logo';

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Convierte el SVG corporativo en imagen PNG para incrustar en el PDF con máxima fidelidad
 */
async function getLogoPng(): Promise<string> {
  return new Promise(resolve => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 400;
          canvas.height = 400;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, 400, 400);
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve('');
          }
        } catch {
          resolve('');
        }
      };
      img.onerror = () => resolve('');
      img.src = GASTEIZ_LOGO_DATA_URL;
    } catch {
      resolve('');
    }
  });
}

export function exportQuadrantToCSV(
  year: number,
  month: number,
  serviceName: string,
  days: DayInfo[],
  employees: Employee[],
  assignments: Record<string, Record<number, string>>,
  statsMap: Map<string, EmployeeMonthStats>,
  coverage: Record<number, number>,
  shifts: ShiftType[]
) {
  const monthName = MONTH_NAMES_ES[month - 1];
  const rows: string[][] = [];

  // Header rows with official corporate header
  rows.push([`GASTEIZ DE VIGILANCIA - CUADRANTE OFICIAL DE SERVICIO`]);
  rows.push([`Puesto / Servicio: ${serviceName.toUpperCase()}`]);
  rows.push([`Mes: ${monthName} ${year}`]);
  rows.push([]);

  // Legend
  const legendParts = shifts
    .filter(s => !s.isOffDay)
    .map(s => `${s.code}= ${s.startTime} - ${s.endTime} (${s.totalHours}h)`);
  rows.push([`LEYENDA DE TURNOS: ${legendParts.join(' | ')}`]);
  rows.push([]);

  // Table header 1: Día del mes
  const headerDays: string[] = ['Empleado', 'Puesto / TIP'];
  days.forEach(d => headerDays.push(String(d.dayOfMonth)));
  headerDays.push('Días Trab.', 'Horas Totales', 'Horas Festivas*', 'Horas Nocturnas', 'Horas Extras', 'Acum. Anual (1 Ene - 31 Dic)');
  rows.push(headerDays);

  // Table header 2: Día semana
  const headerWeekdays: string[] = ['', ''];
  days.forEach(d => {
    let tag = d.dayOfWeekName;
    if (d.isHoliday || d.isSunday || d.isSaturday) tag += '*';
    headerWeekdays.push(tag);
  });
  headerWeekdays.push('', '', '', '', '', '');
  rows.push(headerWeekdays);

  // Employee rows
  employees.forEach(emp => {
    const empAssigns = assignments[emp.id] || {};
    const empStats = statsMap.get(emp.id);

    const empRow: string[] = [
      emp.name,
      emp.tip ? `TIP: ${emp.tip}` : emp.assignedPost || '',
    ];

    days.forEach(d => {
      empRow.push(empAssigns[d.dayOfMonth] || '');
    });

    empRow.push(
      String(empStats?.workedDays ?? 0),
      String(empStats?.totalHours ?? 0),
      String(empStats?.holidayHours ?? 0),
      String(empStats?.nightHours ?? 0),
      String(empStats?.overtimeHours ?? 0),
      String(empStats?.annualTotalHours ?? 0)
    );

    rows.push(empRow);
  });

  // Daily coverage row
  const coverageRow: string[] = ['COBERTURA HORAS / DÍA', ''];
  let totalCoverageMonth = 0;
  days.forEach(d => {
    const cov = coverage[d.dayOfMonth] || 0;
    totalCoverageMonth += cov;
    coverageRow.push(String(cov));
  });
  coverageRow.push('', String(totalCoverageMonth), '', '', '', '');
  rows.push(coverageRow);

  // Format to CSV string with semicolons and UTF-8 BOM
  const csvContent =
    '\uFEFF' +
    rows
      .map(row =>
        row
          .map(cell => {
            const str = String(cell ?? '');
            if (str.includes(';') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(';')
      )
      .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Cuadrante_Gasteiz_Vigilancia_${monthName}_${year}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface MonthQuadrantRenderData {
  year: number;
  month: number;
  serviceName: string;
  days: DayInfo[];
  employees: Employee[];
  assignments: Record<string, Record<number, string>>;
  statsMap: Map<string, EmployeeMonthStats>;
  coverage: Record<number, number>;
  shifts: ShiftType[];
  convenio: ConvenioSettings;
}

export interface AnnualSummaryRenderData {
  year: number;
  serviceName: string;
  employees: Employee[];
  yearAssignmentsMap: Record<number, Record<number, Record<string, Record<number, string>>>>;
  shifts: ShiftType[];
  convenio: ConvenioSettings;
  customHolidays?: Record<string, string>;
}

/**
 * Renderiza la página completa de un mes en el documento jsPDF especificado.
 */
export function renderQuadrantMonthPage(
  doc: jsPDF,
  data: MonthQuadrantRenderData,
  logoPng: string,
  pageNumber?: number,
  totalPages?: number
) {
  const {
    year,
    month,
    serviceName,
    days,
    employees,
    assignments,
    statsMap,
    coverage,
    shifts,
    convenio,
  } = data;

  const monthName = MONTH_NAMES_ES[month - 1];
  const pageWidth = 297;
  const marginX = 8;
  const startY = 8;

  // Header Banner with Gasteiz de Vigilancia branding
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(marginX, startY, pageWidth - marginX * 2, 17, 'F');

  // GV Shield Logo from image.png
  const logoX = marginX + 3;
  const logoY = startY + 2;
  const logoSize = 13;

  if (logoPng) {
    try {
      doc.addImage(logoPng, 'PNG', logoX, logoY, logoSize, logoSize);
    } catch {
      drawFallbackLogo(doc, logoX, logoY, logoSize);
    }
  } else {
    drawFallbackLogo(doc, logoX, logoY, logoSize);
  }

  // Main Title: CUADRANTE DE GASTEIZ DE VIGILANCIA
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13.5);
  doc.setFont('helvetica', 'bold');
  doc.text('CUADRANTE DE GASTEIZ DE VIGILANCIA', logoX + 16, startY + 7);

  // Subtitle with Service Name and Month/Year
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Servicio: ${serviceName.toUpperCase()}  |  Mes: ${monthName.toUpperCase()} ${year}  |  Cómputo Anual: 1 Ene - 31 Dic`,
    logoX + 16,
    startY + 12.5
  );

  const datePrinted = new Date().toLocaleDateString('es-ES');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Emisión: ${datePrinted}`, pageWidth - marginX - 35, startY + 10);

  // Legend row
  let currentY = startY + 20;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('LEYENDA DE TURNOS:', marginX, currentY);

  doc.setFont('helvetica', 'normal');
  const legendText = shifts
    .filter(s => !s.isOffDay)
    .map(s => `[${s.code}]: ${s.startTime}-${s.endTime} (${s.totalHours}h | ${s.nightHours}h noche)`)
    .join('    ');
  doc.text(legendText, marginX + 36, currentY);

  currentY += 4.5;

  // Table calculations
  const numDays = days.length;
  const nameColWidth = 32;
  const statsColWidth = 9;
  const numStatsCols = 5; // Días, Total Horas, Festivos (incl. sáb/dom), Noches, Anual (1 Ene - 31 Dic)
  const availableWidthForDays =
    pageWidth - marginX * 2 - nameColWidth - statsColWidth * numStatsCols;
  const dayColWidth = availableWidthForDays / numDays;
  const cellHeight = 7;

  // Reset colors explicitly
  doc.setDrawColor(203, 213, 225); // Slate-300 lines
  doc.setLineWidth(0.2);

  // Header 1: Left Top corner for "Vigilante / Día"
  let curX = marginX;
  doc.setFillColor(241, 245, 249);
  doc.rect(curX, currentY, nameColWidth, cellHeight * 2, 'F');
  doc.rect(curX, currentY, nameColWidth, cellHeight * 2, 'S');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Vigilante / Día', curX + 2, currentY + 7);

  curX += nameColWidth;

  // Day columns (Row 1: Day Number, Row 2: Day Weekday Name)
  days.forEach(d => {
    const isFestive =
      d.isHoliday || d.isSunday || (convenio.saturdaysCountAsHoliday && d.isSaturday);

    // Row 1: Day number cell
    if (isFestive) {
      doc.setFillColor(220, 38, 38); // Red-600 for festives/weekends
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setFillColor(241, 245, 249); // Slate-100
      doc.setTextColor(15, 23, 42);
    }
    doc.rect(curX, currentY, dayColWidth, cellHeight, 'F');
    doc.rect(curX, currentY, dayColWidth, cellHeight, 'S');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(String(d.dayOfMonth), curX + dayColWidth / 2, currentY + 4.8, { align: 'center' });

    // Row 2: Weekday name cell
    if (isFestive) {
      doc.setFillColor(254, 226, 226); // Red-100
      doc.setTextColor(185, 28, 28); // Dark Red
    } else {
      doc.setFillColor(248, 250, 252); // Slate-50
      doc.setTextColor(71, 85, 105); // Slate-600
    }
    doc.rect(curX, currentY + cellHeight, dayColWidth, cellHeight, 'F');
    doc.rect(curX, currentY + cellHeight, dayColWidth, cellHeight, 'S');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', isFestive ? 'bold' : 'normal');
    doc.text(d.dayOfWeekName, curX + dayColWidth / 2, currentY + cellHeight + 4.8, {
      align: 'center',
    });

    curX += dayColWidth;
  });

  // Stats columns headers
  const statHeaders = ['Días', 'Horas', 'Fest.*', 'Noche', 'Anual'];
  statHeaders.forEach(sh => {
    doc.setFillColor(226, 232, 240);
    doc.rect(curX, currentY, statsColWidth, cellHeight * 2, 'F');
    doc.rect(curX, currentY, statsColWidth, cellHeight * 2, 'S');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(sh, curX + statsColWidth / 2, currentY + 7.5, { align: 'center' });
    curX += statsColWidth;
  });

  currentY += cellHeight * 2;

  // Employee rows
  employees.forEach((emp, empIdx) => {
    let rowX = marginX;
    const isAlt = empIdx % 2 === 1;

    // Name cell
    if (isAlt) {
      doc.setFillColor(248, 250, 252);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(rowX, currentY, nameColWidth, cellHeight, 'F');
    doc.rect(rowX, currentY, nameColWidth, cellHeight, 'S');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(emp.name, rowX + 2, currentY + 4.8);

    rowX += nameColWidth;

    const empAssigns = assignments[emp.id] || {};
    const empStats = statsMap.get(emp.id);

    // Day cells
    days.forEach(d => {
      const code = empAssigns[d.dayOfMonth] || '';
      const isFestive =
        d.isHoliday || d.isSunday || (convenio.saturdaysCountAsHoliday && d.isSaturday);

      if (isFestive) {
        doc.setFillColor(254, 242, 242); // Subtle red tint
      } else if (isAlt) {
        doc.setFillColor(248, 250, 252);
      } else {
        doc.setFillColor(255, 255, 255);
      }

      doc.rect(rowX, currentY, dayColWidth, cellHeight, 'F');
      doc.rect(rowX, currentY, dayColWidth, cellHeight, 'S');

      if (code) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        if (code === 'A') doc.setTextColor(37, 99, 235);
        else if (code === 'B') doc.setTextColor(5, 150, 105);
        else if (code === 'C') doc.setTextColor(124, 58, 237);
        else doc.setTextColor(30, 41, 59);

        doc.text(code, rowX + dayColWidth / 2, currentY + 5, { align: 'center' });
      }

      rowX += dayColWidth;
    });

    // Employee Totals cells
    const statValues = [
      empStats?.workedDays ?? 0,
      empStats?.totalHours ?? 0,
      empStats?.holidayHours ?? 0,
      empStats?.nightHours ?? 0,
      empStats?.annualTotalHours ?? 0,
    ];

    statValues.forEach(val => {
      if (isAlt) {
        doc.setFillColor(241, 245, 249);
      } else {
        doc.setFillColor(248, 250, 252);
      }
      doc.rect(rowX, currentY, statsColWidth, cellHeight, 'F');
      doc.rect(rowX, currentY, statsColWidth, cellHeight, 'S');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(String(val), rowX + statsColWidth / 2, currentY + 4.8, { align: 'center' });
      rowX += statsColWidth;
    });

    currentY += cellHeight;
  });

  // Daily Coverage Row
  let covX = marginX;
  doc.setFillColor(254, 226, 226); // Light red
  doc.rect(covX, currentY, nameColWidth, cellHeight, 'F');
  doc.rect(covX, currentY, nameColWidth, cellHeight, 'S');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(153, 27, 27);
  doc.text('COBERTURA (H)', covX + 2, currentY + 4.8);

  covX += nameColWidth;

  let totalCov = 0;
  days.forEach(d => {
    const hours = coverage[d.dayOfMonth] || 0;
    totalCov += hours;
    if (hours >= 24) {
      doc.setFillColor(220, 252, 231);
    } else if (hours > 0) {
      doc.setFillColor(254, 243, 199);
    } else {
      doc.setFillColor(254, 226, 226);
    }
    doc.rect(covX, currentY, dayColWidth, cellHeight, 'F');
    doc.rect(covX, currentY, dayColWidth, cellHeight, 'S');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(String(hours), covX + dayColWidth / 2, currentY + 4.8, { align: 'center' });
    covX += dayColWidth;
  });

  // Total coverage stat
  doc.setFillColor(226, 232, 240);
  doc.rect(covX, currentY, statsColWidth * numStatsCols, cellHeight, 'F');
  doc.rect(covX, currentY, statsColWidth * numStatsCols, cellHeight, 'S');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Total: ${totalCov} h`,
    covX + (statsColWidth * numStatsCols) / 2,
    currentY + 4.8,
    { align: 'center' }
  );

  currentY += cellHeight + 6;

  // Signatures Section: Gasteiz de Vigilancia
  const signBoxWidth = 75;
  const signBoxHeight = 22;

  doc.setDrawColor(203, 213, 225);
  doc.rect(marginX + 15, currentY, signBoxWidth, signBoxHeight);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Firma y Sello de Gasteiz de Vigilancia', marginX + 18, currentY + 5);

  doc.rect(pageWidth - marginX - signBoxWidth - 15, currentY, signBoxWidth, signBoxHeight);
  doc.text(
    'Firma y Conformidad de los Vigilantes de Seguridad',
    pageWidth - marginX - signBoxWidth - 12,
    currentY + 5
  );

  // Page numbering in footer if multi-page
  if (pageNumber && totalPages) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Página ${pageNumber} de ${totalPages} — Cuadrante Oficial Gasteiz de Vigilancia (${monthName} ${year})`,
      pageWidth / 2,
      204,
      { align: 'center' }
    );
  }
}

/**
 * Renderiza la página de balance y resumen anual con desglose mes a mes por vigilante
 */
export function renderAnnualSummaryPage(
  doc: jsPDF,
  data: AnnualSummaryRenderData,
  logoPng: string,
  pageNumber?: number,
  totalPages?: number
) {
  const { year, serviceName, employees, yearAssignmentsMap, shifts, convenio } = data;
  const pageWidth = 297;
  const marginX = 8;
  const startY = 8;

  // Header Banner
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(marginX, startY, pageWidth - marginX * 2, 17, 'F');

  const logoX = marginX + 3;
  const logoY = startY + 2;
  const logoSize = 13;

  if (logoPng) {
    try {
      doc.addImage(logoPng, 'PNG', logoX, logoY, logoSize, logoSize);
    } catch {
      drawFallbackLogo(doc, logoX, logoY, logoSize);
    }
  } else {
    drawFallbackLogo(doc, logoX, logoY, logoSize);
  }

  // Title & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13.5);
  doc.setFont('helvetica', 'bold');
  doc.text('GASTEIZ DE VIGILANCIA — BALANCE ANUAL DE HORAS', logoX + 16, startY + 7);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Servicio: ${serviceName.toUpperCase()}  |  Año Completo: ${year}  |  Jornada Anual Convenio: ${convenio.annualStandardHours} h`,
    logoX + 16,
    startY + 12.5
  );

  const datePrinted = new Date().toLocaleDateString('es-ES');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Emisión: ${datePrinted}`, pageWidth - marginX - 35, startY + 10);

  // Explanatory note
  let currentY = startY + 21;
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('DESGLOSE DE HORAS POR MES Y REGULARIZACIÓN ANUAL (1 ENERO - 31 DICIEMBRE):', marginX, currentY);
  currentY += 4.5;

  // Column metrics
  const nameColWidth = 42;
  const monthColWidth = 13; // 12 * 13 = 156
  const totalColWidth = 19;
  const extraColWidth = 17;
  const saldoColWidth = 22; // Diferencia vs 1782h
  const cellHeight = 7.5;

  const monthShorts = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);

  // Table Header
  let curX = marginX;
  doc.setFillColor(241, 245, 249);
  doc.rect(curX, currentY, nameColWidth, cellHeight, 'F');
  doc.rect(curX, currentY, nameColWidth, cellHeight, 'S');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Vigilante / Empleado', curX + 2, currentY + 5);
  curX += nameColWidth;

  monthShorts.forEach(mName => {
    doc.setFillColor(241, 245, 249);
    doc.rect(curX, currentY, monthColWidth, cellHeight, 'F');
    doc.rect(curX, currentY, monthColWidth, cellHeight, 'S');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(mName, curX + monthColWidth / 2, currentY + 5, { align: 'center' });
    curX += monthColWidth;
  });

  const summaryHeaders = ['TOTAL H.', 'H. FEST.', 'H. NOCHE', 'SALDO CONVENIO'];
  const summaryWidths = [totalColWidth, extraColWidth, extraColWidth, saldoColWidth];

  summaryHeaders.forEach((sh, idx) => {
    doc.setFillColor(226, 232, 240);
    doc.rect(curX, currentY, summaryWidths[idx], cellHeight, 'F');
    doc.rect(curX, currentY, summaryWidths[idx], cellHeight, 'S');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(sh, curX + summaryWidths[idx] / 2, currentY + 5, { align: 'center' });
    curX += summaryWidths[idx];
  });

  currentY += cellHeight;

  // Track monthly totals across all employees
  const monthlyTotalHours = new Array(12).fill(0);
  let grandAnnualHours = 0;
  let grandHolidayHours = 0;
  let grandNightHours = 0;

  const shiftMap = new Map<string, ShiftType>();
  shifts.forEach(s => shiftMap.set(s.code, s));

  // Employee rows
  employees.forEach((emp, empIdx) => {
    let rowX = marginX;
    const isAlt = empIdx % 2 === 1;

    // Name cell
    doc.setFillColor(isAlt ? 248 : 255, isAlt ? 250 : 255, isAlt ? 252 : 255);
    doc.rect(rowX, currentY, nameColWidth, cellHeight, 'F');
    doc.rect(rowX, currentY, nameColWidth, cellHeight, 'S');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const label = emp.tip ? `${emp.name} (${emp.tip})` : emp.name;
    doc.text(label.length > 25 ? label.substring(0, 24) + '…' : label, rowX + 2, currentY + 5);

    rowX += nameColWidth;

    let empAnnualHours = 0;
    let empHolidayHours = 0;
    let empNightHours = 0;

    // Months 1 to 12
    for (let m = 1; m <= 12; m++) {
      const mAssigns = yearAssignmentsMap[year]?.[m]?.[emp.id] || {};
      let mHours = 0;

      Object.entries(mAssigns).forEach(([_, code]) => {
        if (!code) return;
        const shift = shiftMap.get(code);
        if (shift && shift.totalHours > 0) {
          if (!shift.isOffDay || shift.code === 'V') {
            mHours += shift.totalHours;
          }
          empNightHours += shift.nightHours;
        }
      });

      empAnnualHours += mHours;
      monthlyTotalHours[m - 1] += mHours;

      doc.setFillColor(isAlt ? 248 : 255, isAlt ? 250 : 255, isAlt ? 252 : 255);
      doc.rect(rowX, currentY, monthColWidth, cellHeight, 'F');
      doc.rect(rowX, currentY, monthColWidth, cellHeight, 'S');

      doc.setFontSize(7);
      doc.setFont('helvetica', mHours > 0 ? 'bold' : 'normal');
      doc.setTextColor(mHours > 0 ? 30 : 148, mHours > 0 ? 41 : 163, mHours > 0 ? 59 : 184);
      doc.text(mHours > 0 ? `${mHours}` : '—', rowX + monthColWidth / 2, currentY + 5, {
        align: 'center',
      });

      rowX += monthColWidth;
    }

    grandAnnualHours += empAnnualHours;
    grandNightHours += empNightHours;

    // Approximate holiday hours from assignments for the year
    for (let m = 1; m <= 12; m++) {
      const daysInM = new Date(year, m, 0).getDate();
      const mAssigns = yearAssignmentsMap[year]?.[m]?.[emp.id] || {};
      for (let d = 1; d <= daysInM; d++) {
        const code = mAssigns[d];
        if (code) {
          const shift = shiftMap.get(code);
          const dt = new Date(year, m - 1, d);
          const isSun = dt.getDay() === 0;
          const isSat = dt.getDay() === 6;
          const isFest = isSun || (convenio.saturdaysCountAsHoliday && isSat);
          if (isFest && shift && shift.totalHours > 0 && !shift.isOffDay && shift.code !== 'V') {
            empHolidayHours += shift.totalHours;
          }
        }
      }
    }
    grandHolidayHours += empHolidayHours;

    // Totals columns
    // Total Hours
    doc.setFillColor(241, 245, 249);
    doc.rect(rowX, currentY, totalColWidth, cellHeight, 'F');
    doc.rect(rowX, currentY, totalColWidth, cellHeight, 'S');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${Math.round(empAnnualHours * 10) / 10} h`, rowX + totalColWidth / 2, currentY + 5, {
      align: 'center',
    });
    rowX += totalColWidth;

    // Holiday Hours
    doc.setFillColor(isAlt ? 248 : 255, isAlt ? 250 : 255, isAlt ? 252 : 255);
    doc.rect(rowX, currentY, extraColWidth, cellHeight, 'F');
    doc.rect(rowX, currentY, extraColWidth, cellHeight, 'S');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(220, 38, 38);
    doc.text(`${Math.round(empHolidayHours)} h`, rowX + extraColWidth / 2, currentY + 5, {
      align: 'center',
    });
    rowX += extraColWidth;

    // Night Hours
    doc.setFillColor(isAlt ? 248 : 255, isAlt ? 250 : 255, isAlt ? 252 : 255);
    doc.rect(rowX, currentY, extraColWidth, cellHeight, 'F');
    doc.rect(rowX, currentY, extraColWidth, cellHeight, 'S');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(79, 70, 229);
    doc.text(`${Math.round(empNightHours)} h`, rowX + extraColWidth / 2, currentY + 5, {
      align: 'center',
    });
    rowX += extraColWidth;

    // Saldo vs Convenio
    const diff = Math.round((empAnnualHours - convenio.annualStandardHours) * 10) / 10;
    doc.setFillColor(diff > 0 ? 254 : 240, diff > 0 ? 243 : 253, diff > 0 ? 199 : 244);
    doc.rect(rowX, currentY, saldoColWidth, cellHeight, 'F');
    doc.rect(rowX, currentY, saldoColWidth, cellHeight, 'S');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    if (diff > 0) {
      doc.setTextColor(180, 83, 9); // Amber-700
      doc.text(`+${diff} h (Extra)`, rowX + saldoColWidth / 2, currentY + 5, { align: 'center' });
    } else if (diff < 0) {
      doc.setTextColor(71, 85, 105);
      doc.text(`${diff} h`, rowX + saldoColWidth / 2, currentY + 5, { align: 'center' });
    } else {
      doc.setTextColor(22, 101, 52); // Green
      doc.text(`0 h (Exacto)`, rowX + saldoColWidth / 2, currentY + 5, { align: 'center' });
    }

    currentY += cellHeight;
  });

  // Summary Row (Totales del Servicio)
  let sumX = marginX;
  doc.setFillColor(226, 232, 240);
  doc.rect(sumX, currentY, nameColWidth, cellHeight, 'F');
  doc.rect(sumX, currentY, nameColWidth, cellHeight, 'S');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TOTALES SERVICIO', sumX + 2, currentY + 5);
  sumX += nameColWidth;

  monthlyTotalHours.forEach(mTot => {
    doc.setFillColor(226, 232, 240);
    doc.rect(sumX, currentY, monthColWidth, cellHeight, 'F');
    doc.rect(sumX, currentY, monthColWidth, cellHeight, 'S');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(mTot > 0 ? `${Math.round(mTot)}` : '0', sumX + monthColWidth / 2, currentY + 5, {
      align: 'center',
    });
    sumX += monthColWidth;
  });

  // Grand totals
  doc.setFillColor(203, 213, 225);
  doc.rect(sumX, currentY, totalColWidth, cellHeight, 'F');
  doc.rect(sumX, currentY, totalColWidth, cellHeight, 'S');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${Math.round(grandAnnualHours)} h`, sumX + totalColWidth / 2, currentY + 5, {
    align: 'center',
  });
  sumX += totalColWidth;

  doc.rect(sumX, currentY, extraColWidth, cellHeight, 'F');
  doc.rect(sumX, currentY, extraColWidth, cellHeight, 'S');
  doc.text(`${Math.round(grandHolidayHours)} h`, sumX + extraColWidth / 2, currentY + 5, {
    align: 'center',
  });
  sumX += extraColWidth;

  doc.rect(sumX, currentY, extraColWidth, cellHeight, 'F');
  doc.rect(sumX, currentY, extraColWidth, cellHeight, 'S');
  doc.text(`${Math.round(grandNightHours)} h`, sumX + extraColWidth / 2, currentY + 5, {
    align: 'center',
  });
  sumX += extraColWidth;

  const totalEmployeesLimit = employees.length * convenio.annualStandardHours;
  const grandDiff = Math.round((grandAnnualHours - totalEmployeesLimit) * 10) / 10;
  doc.rect(sumX, currentY, saldoColWidth, cellHeight, 'F');
  doc.rect(sumX, currentY, saldoColWidth, cellHeight, 'S');
  doc.setFontSize(7);
  doc.text(
    grandDiff > 0 ? `+${grandDiff} h` : `${grandDiff} h`,
    sumX + saldoColWidth / 2,
    currentY + 5,
    { align: 'center' }
  );

  currentY += cellHeight + 8;

  // Signatures Section
  const signBoxWidth = 85;
  const signBoxHeight = 24;

  doc.setDrawColor(203, 213, 225);
  doc.rect(marginX + 20, currentY, signBoxWidth, signBoxHeight);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Firma y Sello Oficial — Gasteiz de Vigilancia S.A.', marginX + 24, currentY + 5);

  doc.rect(pageWidth - marginX - signBoxWidth - 20, currentY, signBoxWidth, signBoxHeight);
  doc.text(
    'Firma y Conformidad de la Representación de los Trabajadores',
    pageWidth - marginX - signBoxWidth - 16,
    currentY + 5
  );

  // Footer page number
  if (pageNumber && totalPages) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Página ${pageNumber} de ${totalPages} — Cuadrante Oficial Gasteiz de Vigilancia (Balance Anual ${year})`,
      pageWidth / 2,
      204,
      { align: 'center' }
    );
  }
}

/**
 * Exporta el cuadrante de un único mes seleccionado a PDF
 */
export async function exportQuadrantToPDF(
  year: number,
  month: number,
  serviceName: string,
  days: DayInfo[],
  employees: Employee[],
  assignments: Record<string, Record<number, string>>,
  statsMap: Map<string, EmployeeMonthStats>,
  coverage: Record<number, number>,
  shifts: ShiftType[],
  convenio: ConvenioSettings
) {
  const monthName = MONTH_NAMES_ES[month - 1];
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const logoPng = await getLogoPng();

  renderQuadrantMonthPage(
    doc,
    {
      year,
      month,
      serviceName,
      days,
      employees,
      assignments,
      statsMap,
      coverage,
      shifts,
      convenio,
    },
    logoPng,
    1,
    1
  );

  doc.save(`Cuadrante_Gasteiz_Vigilancia_${monthName}_${year}.pdf`);
}

/**
 * Exporta el cuadrante completo de TODO el año (12 meses + Resumen Anual consolidado)
 */
export async function exportAnnualQuadrantToPDF(
  year: number,
  serviceName: string,
  employees: Employee[],
  yearAssignmentsMap: Record<number, Record<number, Record<string, Record<number, string>>>>,
  shifts: ShiftType[],
  convenio: ConvenioSettings,
  customHolidays: Record<string, string>,
  includeSummaryPage: boolean = true,
  onProgress?: (current: number, total: number, message: string) => void,
  getDaysInMonthFn?: (y: number, m: number, holidays?: Record<string, string>) => DayInfo[],
  calcAnnualHoursFn?: (
    empId: string,
    y: number,
    data: any,
    s: ShiftType[]
  ) => number,
  calcEmployeeStatsFn?: (
    emp: Employee,
    assigns: any,
    days: DayInfo[],
    s: ShiftType[],
    conv: ConvenioSettings,
    annHours: number,
    holidays: any
  ) => EmployeeMonthStats,
  calcCoverageFn?: (
    days: DayInfo[],
    emps: Employee[],
    assigns: any,
    s: ShiftType[]
  ) => Record<number, number>
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const logoPng = await getLogoPng();
  const totalPages = 12 + (includeSummaryPage ? 1 : 0);

  // Recorrer los 12 meses
  for (let m = 1; m <= 12; m++) {
    const monthName = MONTH_NAMES_ES[m - 1];
    onProgress?.(m, totalPages, `Generando ${monthName}...`);

    const days = getDaysInMonthFn
      ? getDaysInMonthFn(year, m, customHolidays)
      : [];

    const monthAssignments = yearAssignmentsMap[year]?.[m] || {};

    const monthStatsMap = new Map<string, EmployeeMonthStats>();
    employees.forEach(emp => {
      const empAssigns = monthAssignments[emp.id];
      const annualHours = calcAnnualHoursFn
        ? calcAnnualHoursFn(emp.id, year, yearAssignmentsMap[year], shifts)
        : 0;

      const stats = calcEmployeeStatsFn
        ? calcEmployeeStatsFn(
            emp,
            empAssigns,
            days,
            shifts,
            convenio,
            annualHours,
            customHolidays
          )
        : ({} as EmployeeMonthStats);

      monthStatsMap.set(emp.id, stats);
    });

    const coverage = calcCoverageFn
      ? calcCoverageFn(days, employees, monthAssignments, shifts)
      : {};

    if (m > 1) {
      doc.addPage('a4', 'landscape');
    }

    renderQuadrantMonthPage(
      doc,
      {
        year,
        month: m,
        serviceName,
        days,
        employees,
        assignments: monthAssignments,
        statsMap: monthStatsMap,
        coverage,
        shifts,
        convenio,
      },
      logoPng,
      m,
      totalPages
    );

    // Pequeño retardo asíncrono para mantener la interfaz fluida durante la generación
    await new Promise(resolve => setTimeout(resolve, 25));
  }

  // Página 13: Resumen y Balance Anual Consolidado
  if (includeSummaryPage) {
    onProgress?.(13, totalPages, 'Generando Balance y Resumen Anual...');
    doc.addPage('a4', 'landscape');

    renderAnnualSummaryPage(
      doc,
      {
        year,
        serviceName,
        employees,
        yearAssignmentsMap,
        shifts,
        convenio,
        customHolidays,
      },
      logoPng,
      13,
      totalPages
    );
  }

  onProgress?.(totalPages, totalPages, 'Finalizando documento PDF...');
  doc.save(`Cuadrante_Gasteiz_Vigilancia_Anual_${year}.pdf`);
}

function drawFallbackLogo(doc: jsPDF, x: number, y: number, size: number) {
  // Outer green shield border
  doc.setFillColor(0, 168, 89); // Green
  doc.roundedRect(x, y, size, size, 2, 2, 'F');

  // Inner black background
  doc.setFillColor(18, 18, 18);
  doc.roundedRect(x + 0.8, y + 0.8, size - 1.6, size - 1.6, 1.5, 1.5, 'F');

  // Red inner shield
  doc.setFillColor(220, 38, 38);
  doc.roundedRect(x + 2, y + 2.5, size - 4, size - 5, 1, 1, 'F');

  // GV text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('GV', x + size / 2, y + size / 2 + 1.5, { align: 'center' });
}
