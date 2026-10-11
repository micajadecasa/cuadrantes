import React, { useState, useEffect } from 'react';
import {
  FileText,
  Calendar,
  CalendarRange,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Download,
  Layers,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import {
  ConvenioSettings,
  Employee,
  ShiftType,
} from '../types/quadrant';
import {
  getDaysInMonth,
  calculateAnnualHoursForEmployee,
  calculateDailyCoverage,
  calculateEmployeeStats,
} from '../services/calculationService';
import {
  exportQuadrantToPDF,
  exportAnnualQuadrantToPDF,
} from '../services/exportService';

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentYear: number;
  currentMonth: number;
  serviceName: string;
  employees: Employee[];
  shifts: ShiftType[];
  convenio: ConvenioSettings;
  customHolidays: Record<string, string>;
  yearAssignmentsMap: Record<number, Record<number, Record<string, Record<number, string>>>>;
}

export const ExportPdfModal: React.FC<ExportPdfModalProps> = ({
  isOpen,
  onClose,
  currentYear,
  currentMonth,
  serviceName,
  employees,
  shifts,
  convenio,
  customHolidays,
  yearAssignmentsMap,
}) => {
  const [exportType, setExportType] = useState<'month' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [includeSummaryPage, setIncludeSummaryPage] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    message: string;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Sincronizar mes actual cuando se abra el modal
  useEffect(() => {
    if (isOpen) {
      setSelectedMonth(currentMonth);
      setStatusMessage(null);
      setProgress(null);
      setIsGenerating(false);
    }
  }, [isOpen, currentMonth]);

  if (!isOpen) return null;

  const handleExecuteExport = async () => {
    setIsGenerating(true);
    setStatusMessage(null);

    try {
      if (exportType === 'month') {
        setProgress({
          current: 1,
          total: 1,
          message: `Preparando cuadrante de ${MONTH_NAMES_ES[selectedMonth - 1]} ${currentYear}...`,
        });

        // Cálculos para el mes elegido
        const monthDays = getDaysInMonth(currentYear, selectedMonth, customHolidays);
        const monthAssignments = yearAssignmentsMap[currentYear]?.[selectedMonth] || {};

        const monthStatsMap = new Map();
        employees.forEach(emp => {
          const empAssigns = monthAssignments[emp.id];
          const annualHours = calculateAnnualHoursForEmployee(
            emp.id,
            currentYear,
            yearAssignmentsMap[currentYear],
            shifts
          );
          const stats = calculateEmployeeStats(
            emp,
            empAssigns,
            monthDays,
            shifts,
            convenio,
            annualHours,
            customHolidays
          );
          monthStatsMap.set(emp.id, stats);
        });

        const coverage = calculateDailyCoverage(
          monthDays,
          employees,
          monthAssignments,
          shifts
        );

        await exportQuadrantToPDF(
          currentYear,
          selectedMonth,
          serviceName,
          monthDays,
          employees,
          monthAssignments,
          monthStatsMap,
          coverage,
          shifts,
          convenio
        );

        setStatusMessage({
          type: 'success',
          text: `¡PDF de ${MONTH_NAMES_ES[selectedMonth - 1]} ${currentYear} generado y descargado correctamente!`,
        });

        setTimeout(() => {
          setIsGenerating(false);
          onClose();
        }, 1200);
      } else {
        // Exportación de TODO el año
        const totalPages = 12 + (includeSummaryPage ? 1 : 0);
        setProgress({
          current: 1,
          total: totalPages,
          message: 'Iniciando generación del año completo...',
        });

        await exportAnnualQuadrantToPDF(
          currentYear,
          serviceName,
          employees,
          yearAssignmentsMap,
          shifts,
          convenio,
          customHolidays,
          includeSummaryPage,
          (curr, tot, msg) => {
            setProgress({ current: curr, total: tot, message: msg });
          },
          getDaysInMonth,
          calculateAnnualHoursForEmployee,
          calculateEmployeeStats,
          calculateDailyCoverage
        );

        setStatusMessage({
          type: 'success',
          text: `¡Cuadrante Anual ${currentYear} (${totalPages} páginas) generado y descargado correctamente!`,
        });

        setTimeout(() => {
          setIsGenerating(false);
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      console.error('Error al exportar PDF:', err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Ocurrió un error al generar el documento PDF.',
      });
      setIsGenerating(false);
    }
  };

  const percent = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Exportar Cuadrante a PDF
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-300 border border-rose-400/30">
                  A4 Apaisado
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Selecciona si deseas guardar un mes específico o todo el año {currentYear}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer disabled:opacity-40"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Main Question Label */}
          <div className="text-sm font-bold text-slate-800">
            ¿Qué deseas guardar en el archivo PDF?
          </div>

          {/* Option 1: Mes en concreto */}
          <div
            onClick={() => !isGenerating && setExportType('month')}
            className={`p-4 rounded-xl border-2 transition cursor-pointer ${
              exportType === 'month'
                ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/20 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 p-2 rounded-lg ${
                    exportType === 'month'
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      Cuadrante de un mes en concreto
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      1 página
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Genera el cuadrante oficial mensual con turnos diarios, leyenda, estadísticas y coberturas.
                  </p>
                </div>
              </div>

              <input
                type="radio"
                name="exportType"
                checked={exportType === 'month'}
                onChange={() => setExportType('month')}
                disabled={isGenerating}
                className="mt-1 w-4 h-4 text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
            </div>

            {/* Month Selector when 'month' is selected */}
            {exportType === 'month' && (
              <div className="mt-3 pt-3 border-t border-rose-200/60">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Selecciona el mes a exportar ({currentYear}):
                  </label>
                  {selectedMonth !== currentMonth && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedMonth(currentMonth);
                      }}
                      className="text-[11px] text-rose-600 font-semibold hover:underline cursor-pointer"
                    >
                      Volver a {MONTH_NAMES_ES[currentMonth - 1]} (actual)
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                  {MONTH_NAMES_ES.map((name, idx) => {
                    const mNum = idx + 1;
                    const isSelected = selectedMonth === mNum;
                    const isCurrent = currentMonth === mNum;
                    return (
                      <button
                        key={mNum}
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          if (!isGenerating) setSelectedMonth(mNum);
                        }}
                        className={`px-2 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer text-center relative ${
                          isSelected
                            ? 'bg-rose-600 text-white font-bold shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {name.substring(0, 3)}
                        {isCurrent && (
                          <span
                            className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${
                              isSelected ? 'bg-amber-300' : 'bg-rose-500'
                            }`}
                            title="Mes actual en pantalla"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-1.5">
                  <span className="font-semibold text-rose-700">Mes seleccionado:</span>
                  <span className="font-bold text-slate-800">
                    {MONTH_NAMES_ES[selectedMonth - 1]} de {currentYear}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Option 2: Todo el año en curso */}
          <div
            onClick={() => !isGenerating && setExportType('year')}
            className={`p-4 rounded-xl border-2 transition cursor-pointer ${
              exportType === 'year'
                ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 p-2 rounded-lg ${
                    exportType === 'year'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <CalendarRange className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      Guardar todo el año en curso ({currentYear})
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                      {includeSummaryPage ? '13 páginas' : '12 páginas'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Genera un documento PDF consolidado con las 12 páginas mensuales correlativas (Enero a Diciembre) de {currentYear}.
                  </p>
                </div>
              </div>

              <input
                type="radio"
                name="exportType"
                checked={exportType === 'year'}
                onChange={() => setExportType('year')}
                disabled={isGenerating}
                className="mt-1 w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Options when 'year' is selected */}
            {exportType === 'year' && (
              <div className="mt-3 pt-3 border-t border-indigo-200/60 space-y-2.5">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeSummaryPage}
                    onChange={e => setIncludeSummaryPage(e.target.checked)}
                    disabled={isGenerating}
                    className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      Incluir página final de Balance y Resumen Anual
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Añade la página 13 con la tabla de horas de todos los meses, horas nocturnas, festivas y saldo respecto al convenio ({convenio.annualStandardHours}h) por vigilante.
                    </p>
                  </div>
                </label>

                <div className="bg-indigo-100/60 border border-indigo-200/80 rounded-lg p-2.5 text-[11px] text-indigo-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    El documento incluirá automáticamente los 12 meses de {currentYear} y los {employees.length} vigilantes dados de alta en el servicio.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Progress Indicator */}
          {isGenerating && progress && (
            <div className="bg-slate-900 text-white p-3.5 rounded-xl space-y-2 border border-slate-800">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-2 text-rose-400">
                  <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                  {progress.message}
                </span>
                <span className="text-slate-300 font-mono">
                  {progress.current} / {progress.total} ({percent}%)
                </span>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-rose-500 to-indigo-500 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 font-medium ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleExecuteExport}
            disabled={isGenerating}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition cursor-pointer disabled:opacity-50 ${
              exportType === 'year'
                ? 'bg-indigo-600 hover:bg-indigo-500'
                : 'bg-rose-600 hover:bg-rose-500'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generando Documento...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>
                  {exportType === 'month'
                    ? `Guardar PDF de ${MONTH_NAMES_ES[selectedMonth - 1]} ${currentYear}`
                    : `Guardar Todo el Año ${currentYear} en PDF`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
