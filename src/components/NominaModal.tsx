import React, { useState, useMemo, useEffect } from 'react';
import {
  Employee,
  DayInfo,
  ShiftType,
  ConvenioSettings,
  EmployeeMonthStats,
} from '../types/quadrant';
import {
  CompanyData,
  DangerBonusType,
  PayrollParameters,
  WorkerPayrollProfile,
} from '../types/payroll';
import {
  calculateSecurityGuardPayroll,
  GASTEIZ_COMPANY_DEFAULT,
  SAMPLE_PDF_WORKER_2026,
  getConvenioYearTable,
  estimateAlavaIRPFRate,
} from '../services/payrollCalculator';
import { OfficialPayslip } from './OfficialPayslip';
import {
  Printer,
  FileText,
  Sliders,
  RotateCcw,
  User,
  Calendar,
  Euro,
  ShieldCheck,
  Check,
  HelpCircle,
  Building2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface NominaModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
  employees: Employee[];
  statsMap?: Map<string, EmployeeMonthStats>;
  convenio: ConvenioSettings;
}

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const NominaModal: React.FC<NominaModalProps> = ({
  isOpen,
  onClose,
  year: initialYear,
  month: initialMonth,
  employees,
  statsMap,
  convenio,
}) => {
  // Navigation tabs: 'preview' (Official Payslip view) or 'controls' (Selectors and parameters)
  const [activeTab, setActiveTab] = useState<'preview' | 'controls'>('preview');

  // Selected employee ID
  const [selectedEmpId, setSelectedEmpId] = useState<string>(() => {
    return employees[0]?.id || 'sample_pdf';
  });

  // Current year & month for calculation
  const [calcYear, setCalcYear] = useState<number>(initialYear);
  const [calcMonth, setCalcMonth] = useState<number>(initialMonth);

  // Sync with initialYear/Month when modal opens
  useEffect(() => {
    if (isOpen) {
      setCalcYear(initialYear);
      setCalcMonth(initialMonth);
    }
  }, [isOpen, initialYear, initialMonth]);

  // Company details
  const [company, setCompany] = useState<CompanyData>(GASTEIZ_COMPANY_DEFAULT);

  // Per-worker profile state map
  const [profiles, setProfiles] = useState<Record<string, WorkerPayrollProfile>>(() => {
    const initialProfiles: Record<string, WorkerPayrollProfile> = {};
    
    // Sample worker from PDF
    initialProfiles['sample_pdf'] = { ...SAMPLE_PDF_WORKER_2026.worker };

    // Initialize from employees list
    employees.forEach((emp, index) => {
      // If employee is Gabriel or VS4 or Amador, assign realistic data
      const isGabriel = emp.name.toLowerCase().includes('gabriel');
      initialProfiles[emp.id] = {
        codigoTrabajador: isGabriel ? '01-1840-1' : `01-${1840 + index}-1`,
        nif: isGabriel ? '16303460W' : emp.dni || `163034${60 + index}W`,
        nombreCompleto: isGabriel ? 'JOSE ANGEL GABRIEL JIMENEZ' : emp.name.toUpperCase(),
        numAfiliacionSS: isGabriel ? '01 / 10036608 / 02' : `01 / 100366${10 + index} / 02`,
        fechaAntiguedad: isGabriel ? '30/05/2005' : '15/03/2012',
        fechaAltaEmpresa: isGabriel ? '01/07/2007' : '01/09/2014',
        categoria: 'VIGILANTE SEGURIDAD',
        grupoCotizacion: 6,
        puestoTrabajo: emp.assignedPost || 'PUESTO PRINCIPAL 24H',
        contrato: '100',
        proceso: '0',
        iban: isGabriel ? 'ES12-2100-5849-4802-0003-XXXX' : 'ES76-2095-0283-4901-0002-XXXX',
      };
    });

    return initialProfiles;
  });

  // Per-worker payroll parameters map
  const [parameters, setParameters] = useState<Record<string, PayrollParameters>>(() => {
    const initialParams: Record<string, PayrollParameters> = {};
    
    // Sample worker parameters (Abril 2026 PDF)
    initialParams['sample_pdf'] = { ...SAMPLE_PDF_WORKER_2026.params };

    // Default for each employee
    employees.forEach(emp => {
      const isGabriel = emp.name.toLowerCase().includes('gabriel');
      const table = getConvenioYearTable(initialYear);
      initialParams[emp.id] = {
        year: initialYear,
        month: initialMonth,
        diasLiquidacion: 30,
        quinquenios: isGabriel ? 1 : 1,
        trienios: 0,
        peligrosidadType: 'sin_arma',
        horasNocturnas: isGabriel ? 96 : 80,
        horasFestivas: isGabriel ? 87 : 48,
        horasExtras: 0,
        horasExtrasEstructurales: 0,
        plusTransporte: true,
        plusVestuario: true,
        incluirPagaBeneficios: true,
        pagaBeneficiosImporte: table.pagaBeneficiosDefecto,
        prorrataPagasExtrasSS: table.prorrataPagasExtrasDefecto,
        irpfPorcentaje: 11.0,
        situacionFamiliar: 'soltero',
        hijosACargo: 0,
        discapacidad: 0,
        usarCalculoAutomaticoIRPF: false,
      };
    });

    return initialParams;
  });

  // Current active worker profile and params
  const activeProfile = useMemo(() => {
    return profiles[selectedEmpId] || SAMPLE_PDF_WORKER_2026.worker;
  }, [profiles, selectedEmpId]);

  const activeParams = useMemo(() => {
    const p = parameters[selectedEmpId] || SAMPLE_PDF_WORKER_2026.params;
    return {
      ...p,
      year: calcYear,
      month: calcMonth,
    };
  }, [parameters, selectedEmpId, calcYear, calcMonth]);

  // Update a field in the active profile
  const handleProfileChange = (field: keyof WorkerPayrollProfile, value: any) => {
    setProfiles(prev => ({
      ...prev,
      [selectedEmpId]: {
        ...(prev[selectedEmpId] || activeProfile),
        [field]: value,
      },
    }));
  };

  // Update a field in the active parameters
  const handleParamChange = (field: keyof PayrollParameters, value: any) => {
    setParameters(prev => {
      const current = prev[selectedEmpId] || activeParams;
      const updated = {
        ...current,
        [field]: value,
      };

      // If year changed, update default benefits/SS prorrata if user hasn't overridden
      if (field === 'year') {
        const table = getConvenioYearTable(value);
        updated.pagaBeneficiosImporte = table.pagaBeneficiosDefecto;
        updated.prorrataPagasExtrasSS = table.prorrataPagasExtrasDefecto;
      }

      return {
        ...prev,
        [selectedEmpId]: updated,
      };
    });
  };

  // Synchronize hours with the current quadrant month stats
  const handleSyncFromQuadrant = () => {
    if (!statsMap) return;
    const st = statsMap.get(selectedEmpId);
    if (st) {
      handleParamChange('horasNocturnas', st.nightHours);
      handleParamChange('horasFestivas', st.holidayHours);
      handleParamChange('horasExtras', st.overtimeHours);
    }
  };

  // Load the exact PDF sample (Abril 2026 - Jose Angel Gabriel Jimenez)
  const handleLoadExactPDFSample = () => {
    setSelectedEmpId('sample_pdf');
    setCalcYear(2026);
    setCalcMonth(4);
    setProfiles(prev => ({
      ...prev,
      sample_pdf: { ...SAMPLE_PDF_WORKER_2026.worker },
    }));
    setParameters(prev => ({
      ...prev,
      sample_pdf: { ...SAMPLE_PDF_WORKER_2026.params },
    }));
    setActiveTab('preview');
  };

  // Calculated payroll result
  const calculatedPayroll = useMemo(() => {
    return calculateSecurityGuardPayroll(activeProfile, activeParams, company);
  }, [activeProfile, activeParams, company]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[96vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* ================= MODAL TOP BAR (Hidden on Print) ================= */}
        <div className="bg-slate-900 text-white p-4 rounded-t-2xl flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 font-black text-sm">
              GV
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                  NÓMINAS OFICIALES • VIGILANCIA Y SEGURIDAD PRIVADA
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Convenio Colectivo & Álava
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cálculo del sueldo neto mensual, cotizaciones a la Seguridad Social (MEI {getConvenioYearTable(calcYear).meiTrabajadorPct}%), IRPF Álava y modelo oficial idéntico al PDF.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadExactPDFSample}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-xs cursor-pointer"
              title="Cargar la nómina exacta del PDF Abril 2026 para verificación instantánea"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Cargar Modelo PDF (Abril 2026)</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs cursor-pointer"
              title="Imprimir nómina oficial en A4 o guardar como PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-lg font-bold p-1 ml-2 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ================= CONTROLS & SELECTORS HEADER (Hidden on Print) ================= */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 py-3 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            {/* 1. Selector de Vigilante */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-blue-600" />
                Vigilante:
              </span>
              <select
                value={selectedEmpId}
                onChange={e => setSelectedEmpId(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 shadow-xs focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="sample_pdf">
                  ⭐ 01-1840-1 JOSE ANGEL GABRIEL JIMENEZ (Muestra PDF Abril 2026)
                </option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.dni ? `(${emp.dni})` : ''} - {emp.assignedPost || 'Vigilante'}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Selector de Año y Mes */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 shadow-xs">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs text-slate-500 font-semibold">Periodo:</span>
                <select
                  value={calcMonth}
                  onChange={e => setCalcMonth(Number(e.target.value))}
                  className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                >
                  {MONTH_NAMES_ES.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>

                <select
                  value={calcYear}
                  onChange={e => {
                    const y = Number(e.target.value);
                    setCalcYear(y);
                    handleParamChange('year', y);
                  }}
                  className="text-xs font-bold text-blue-700 bg-transparent focus:outline-none cursor-pointer ml-1"
                >
                  {[2024, 2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botón sincronizar con cuadrante */}
              {selectedEmpId !== 'sample_pdf' && statsMap && (
                <button
                  onClick={handleSyncFromQuadrant}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition"
                  title="Cargar automáticamente las horas nocturnas y festivas del cuadrante"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Sincronizar Horas</span>
                </button>
              )}
            </div>

            {/* Navigation Tabs (Preview vs Recuadros de Selección) */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300 text-xs font-bold">
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1 px-3 py-1 rounded-md transition ${
                  activeTab === 'preview'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Nómina Modelo PDF</span>
              </button>
              <button
                onClick={() => setActiveTab('controls')}
                className={`flex items-center gap-1 px-3 py-1 rounded-md transition ${
                  activeTab === 'controls'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                <span>Recuadros de Selección</span>
              </button>
            </div>

          </div>
        </div>

        {/* ================= MODAL BODY ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 print:bg-white print:p-0">
          
          {/* TAB 1: MODELO OFICIAL PDF */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              
              {/* Quick summary bar for the manager */}
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden text-xs">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Vigilante:</span>
                    <strong className="text-slate-900">{activeProfile.nombreCompleto}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Periodo:</span>
                    <strong className="text-slate-900">{MONTH_NAMES_ES[calcMonth - 1]} {calcYear}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Bruto Devengado:</span>
                    <strong className="text-slate-900 font-mono">{calculatedPayroll.totales.totalDevengadoA.toFixed(2)} €</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Seguridad Social (Trab.):</span>
                    <strong className="text-rose-700 font-mono">-{calculatedPayroll.trabajador.totalAportaciones.toFixed(2)} €</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">IRPF ({calculatedPayroll.retenciones.porcentajeIRPF}%):</span>
                    <strong className="text-amber-700 font-mono">-{calculatedPayroll.retenciones.totalRetenciones.toFixed(2)} €</strong>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 text-right">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Líquido a Percibir</span>
                  <span className="text-lg font-black text-emerald-800 font-mono">
                    {calculatedPayroll.totales.liquidoPercibir.toFixed(2)} €
                  </span>
                </div>
              </div>

              {/* Exact Payslip Document (replicates attached PDF) */}
              <OfficialPayslip
                company={company}
                worker={activeProfile}
                payroll={calculatedPayroll}
              />

              {/* Extra Summary: Employer Total Cost Breakdown (Patronal) */}
              <div className="max-w-[850px] mx-auto bg-slate-900 text-white rounded-xl p-4 border border-slate-800 shadow-md print:hidden text-xs">
                <div className="flex flex-wrap items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Coste Laboral Total de la Empresa (Gasteiz de Vigilancia)
                  </span>
                  <span className="text-sm font-black text-emerald-400 font-mono">
                    {calculatedPayroll.totales.costeTotalEmpresa.toFixed(2)} € / mes
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Sueldo Bruto (Devengos):</span>
                    <span className="font-bold font-mono text-slate-200">{calculatedPayroll.totales.totalDevengadoA.toFixed(2)} €</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Cuotas Patronales SS:</span>
                    <span className="font-bold font-mono text-blue-300">+{calculatedPayroll.empresa.cuotaTotalEmpresarial.toFixed(2)} €</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">MEI Empresa ({getConvenioYearTable(calcYear).meiEmpresaPct}%):</span>
                    <span className="font-bold font-mono text-amber-300">{calculatedPayroll.empresa.mei.cuota.toFixed(2)} €</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Accidentes (AT/EP 3.60%):</span>
                    <span className="font-bold font-mono text-slate-200">{calculatedPayroll.empresa.cIltIms.cuota.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: RECUADROS DE SELECCIÓN PARA CADA VIGILANTE */}
          {activeTab === 'controls' && (
            <div className="max-w-4xl mx-auto space-y-5">
              
              {/* RECUADRO 1: DATOS PERSONALES Y LABORALES DEL VIGILANTE */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                  <h4 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    1. Datos Identificativos y Contractuales del Vigilante
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">Código: {activeProfile.codigoTrabajador}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Nombre Completo</label>
                    <input
                      type="text"
                      value={activeProfile.nombreCompleto}
                      onChange={e => handleProfileChange('nombreCompleto', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">N.I.F. / DNI</label>
                    <input
                      type="text"
                      value={activeProfile.nif}
                      onChange={e => handleProfileChange('nif', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Nº Afiliación S.S.</label>
                    <input
                      type="text"
                      value={activeProfile.numAfiliacionSS}
                      onChange={e => handleProfileChange('numAfiliacionSS', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Categoría Laboral</label>
                    <input
                      type="text"
                      value={activeProfile.categoria}
                      onChange={e => handleProfileChange('categoria', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Puesto de Trabajo</label>
                    <input
                      type="text"
                      value={activeProfile.puestoTrabajo}
                      onChange={e => handleProfileChange('puestoTrabajo', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none"
                      placeholder="e.g. PUESTO PRINCIPAL 24H"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Tipo de Contrato</label>
                    <select
                      value={activeProfile.contrato}
                      onChange={e => handleProfileChange('contrato', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-semibold focus:bg-white focus:outline-none"
                    >
                      <option value="100">100 - Indefinido Ordinario T. Completo</option>
                      <option value="200">200 - Indefinido Tiempo Parcial</option>
                      <option value="401">401 - Por Obra o Servicio</option>
                      <option value="501">501 - Interinidad</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Fecha Antigüedad</label>
                    <input
                      type="text"
                      value={activeProfile.fechaAntiguedad}
                      onChange={e => handleProfileChange('fechaAntiguedad', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900 focus:bg-white focus:outline-none"
                      placeholder="DD/MM/AAAA"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Fecha Alta Empresa</label>
                    <input
                      type="text"
                      value={activeProfile.fechaAltaEmpresa}
                      onChange={e => handleProfileChange('fechaAltaEmpresa', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900 focus:bg-white focus:outline-none"
                      placeholder="DD/MM/AAAA"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">IBAN de Cobro</label>
                    <input
                      type="text"
                      value={activeProfile.iban}
                      onChange={e => handleProfileChange('iban', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900 focus:bg-white focus:outline-none"
                      placeholder="ESXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                    />
                  </div>
                </div>
              </div>

              {/* RECUADRO 2: PLUSES DE CONVENIO Y HORAS VARIABLES */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                  <h4 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                    <Euro className="w-4 h-4 text-emerald-600" />
                    2. Conceptos Variables, Horas y Pluses del Convenio ({calcYear})
                  </h4>
                  <span className="text-[11px] text-emerald-700 font-bold">
                    Salario Base: {getConvenioYearTable(calcYear).baseDaily.toFixed(4)} €/día
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  
                  {/* Horas Nocturnas */}
                  <div className="bg-purple-50/60 p-3 rounded-lg border border-purple-200">
                    <label className="block font-bold text-purple-900 mb-1">
                      162 Nocturnidad (Mes Anterior)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={activeParams.horasNocturnas}
                        onChange={e => handleParamChange('horasNocturnas', Number(e.target.value))}
                        className="w-24 bg-white border border-purple-300 rounded px-2 py-1 font-bold text-purple-950 font-mono"
                      />
                      <span className="text-[11px] text-purple-700">
                        horas x {getConvenioYearTable(calcYear).precioHoraNocturna.toFixed(4)} €/h
                      </span>
                    </div>
                    <span className="text-[10px] text-purple-600 block mt-1">
                      Importe: +{(activeParams.horasNocturnas * getConvenioYearTable(calcYear).precioHoraNocturna).toFixed(2)} €
                    </span>
                  </div>

                  {/* Horas Festivas */}
                  <div className="bg-orange-50/60 p-3 rounded-lg border border-orange-200">
                    <label className="block font-bold text-orange-900 mb-1">
                      172 Festividad (Mes Anterior)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={activeParams.horasFestivas}
                        onChange={e => handleParamChange('horasFestivas', Number(e.target.value))}
                        className="w-24 bg-white border border-orange-300 rounded px-2 py-1 font-bold text-orange-950 font-mono"
                      />
                      <span className="text-[11px] text-orange-700">
                        horas x {getConvenioYearTable(calcYear).precioHoraFestiva.toFixed(4)} €/h
                      </span>
                    </div>
                    <span className="text-[10px] text-orange-600 block mt-1">
                      Importe: +{(activeParams.horasFestivas * getConvenioYearTable(calcYear).precioHoraFestiva).toFixed(2)} €
                    </span>
                  </div>

                  {/* Horas Extras */}
                  <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200">
                    <label className="block font-bold text-amber-900 mb-1">
                      180 Horas Extraordinarias
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={activeParams.horasExtras}
                        onChange={e => handleParamChange('horasExtras', Number(e.target.value))}
                        className="w-24 bg-white border border-amber-300 rounded px-2 py-1 font-bold text-amber-950 font-mono"
                      />
                      <span className="text-[11px] text-amber-700">
                        horas x {getConvenioYearTable(calcYear).precioHoraExtra.toFixed(2)} €/h
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-600 block mt-1">
                      Importe: +{(activeParams.horasExtras * getConvenioYearTable(calcYear).precioHoraExtra).toFixed(2)} €
                    </span>
                  </div>

                  {/* Antigüedad Quinquenios */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      110 Antigüedad (Quinquenios)
                    </label>
                    <select
                      value={activeParams.quinquenios}
                      onChange={e => handleParamChange('quinquenios', Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-bold text-slate-800"
                    >
                      <option value="0">0 quinquenios (0,00 €)</option>
                      <option value="1">1 quinquenio (+183,44 €/mes)</option>
                      <option value="2">2 quinquenios (+366,88 €/mes)</option>
                      <option value="3">3 quinquenios (+550,32 €/mes)</option>
                      <option value="4">4 quinquenios (+733,76 €/mes)</option>
                    </select>
                  </div>

                  {/* Plus Peligrosidad */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      140 Plus de Peligrosidad
                    </label>
                    <select
                      value={activeParams.peligrosidadType}
                      onChange={e => handleParamChange('peligrosidadType', e.target.value as DangerBonusType)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-bold text-slate-800"
                    >
                      <option value="sin_arma">Vigilante Sin Arma (179,90 €/mes)</option>
                      <option value="con_arma">Vigilante Con Arma (+195,50 €/mes)</option>
                      <option value="transporte_fondos">Transporte de Fondos (+215,00 €/mes)</option>
                      <option value="ninguno">Sin Plus de Peligrosidad (0 €)</option>
                    </select>
                  </div>

                  {/* Días de liquidación */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Días Liquidados del Mes
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={activeParams.diasLiquidacion}
                      onChange={e => handleParamChange('diasLiquidacion', Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-bold font-mono text-slate-800"
                    />
                    <span className="text-[10px] text-slate-500">Estándar mensual grupo 6: 30 días</span>
                  </div>

                  {/* Checkbox Plus Transporte */}
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="chk_transporte"
                      checked={activeParams.plusTransporte}
                      onChange={e => handleParamChange('plusTransporte', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                    <label htmlFor="chk_transporte" className="font-semibold text-slate-800 cursor-pointer">
                      230 Distancia y Transporte ({getConvenioYearTable(calcYear).transporteDaily.toFixed(4)} €/día = 137,81 €)
                    </label>
                  </div>

                  {/* Checkbox Plus Vestuario */}
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="chk_vestuario"
                      checked={activeParams.plusVestuario}
                      onChange={e => handleParamChange('plusVestuario', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                    <label htmlFor="chk_vestuario" className="font-semibold text-slate-800 cursor-pointer">
                      240 Mantenimiento Vestuario ({getConvenioYearTable(calcYear).vestuarioDaily.toFixed(4)} €/día = 112,27 €)
                    </label>
                  </div>

                  {/* Checkbox Paga de Beneficios */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="chk_beneficios"
                        checked={activeParams.incluirPagaBeneficios}
                        onChange={e => handleParamChange('incluirPagaBeneficios', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                      <label htmlFor="chk_beneficios" className="font-semibold text-slate-800 cursor-pointer">
                        400 Paga Extra Beneficios (€)
                      </label>
                    </div>
                    {activeParams.incluirPagaBeneficios && (
                      <input
                        type="number"
                        step="0.01"
                        value={activeParams.pagaBeneficiosImporte}
                        onChange={e => handleParamChange('pagaBeneficiosImporte', Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono text-xs font-bold"
                      />
                    )}
                  </div>

                </div>
              </div>

              {/* RECUADRO 3: FISCALIDAD (IRPF ÁLAVA) Y SEGURIDAD SOCIAL */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                  <h4 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    3. Retención de IRPF (Hacienda Foral de Álava) y Cotizaciones SS
                  </h4>
                  <span className="text-[11px] text-indigo-700 font-bold">
                    Normativa Foral de Álava / Clave A
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  
                  {/* Selector % IRPF Directo */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <label className="block font-bold text-slate-800 mb-1">
                      Porcentaje Retención IRPF (%)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.5"
                        min="2"
                        max="45"
                        value={activeParams.irpfPorcentaje}
                        onChange={e => handleParamChange('irpfPorcentaje', Number(e.target.value))}
                        className="w-20 bg-white border border-slate-300 rounded px-2.5 py-1 font-black text-slate-900 font-mono text-sm"
                      />
                      <span className="font-bold text-slate-600">%</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      En el modelo PDF oficial: 11,00%
                    </span>
                  </div>

                  {/* Situación Familiar Álava */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Situación Familiar</label>
                    <select
                      value={activeParams.situacionFamiliar}
                      onChange={e => handleParamChange('situacionFamiliar', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-semibold"
                    >
                      <option value="soltero">Soltero / Sin cónyuge a cargo</option>
                      <option value="casado">Casado (cónyuge no percibe rentas)</option>
                      <option value="separado">Separado / Divorciado</option>
                    </select>
                  </div>

                  {/* Hijos a cargo */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Hijos / Descendientes</label>
                    <select
                      value={activeParams.hijosACargo}
                      onChange={e => handleParamChange('hijosACargo', Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-semibold"
                    >
                      <option value="0">0 hijos a cargo</option>
                      <option value="1">1 hijo</option>
                      <option value="2">2 hijos</option>
                      <option value="3">3 o más hijos</option>
                    </select>
                  </div>

                  {/* MEI según año en curso */}
                  <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200">
                    <span className="block font-bold text-amber-900 text-[11px] mb-0.5">
                      Mecanismo MEI ({calcYear})
                    </span>
                    <span className="block text-slate-700 text-[11px]">
                      Trabajador: <strong>{getConvenioYearTable(calcYear).meiTrabajadorPct}%</strong>
                    </span>
                    <span className="block text-slate-700 text-[11px]">
                      Empresa: <strong>{getConvenioYearTable(calcYear).meiEmpresaPct}%</strong>
                    </span>
                    <span className="block text-[10px] text-amber-700 font-semibold mt-1">
                      Total MEI: {(getConvenioYearTable(calcYear).meiTrabajadorPct + getConvenioYearTable(calcYear).meiEmpresaPct).toFixed(2)}%
                    </span>
                  </div>

                </div>

                {/* Prorrata pagas extras para BCCC */}
                <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">Prorrata Pagas Extraordinarias (Base SS):</span>
                    <input
                      type="number"
                      step="0.01"
                      value={activeParams.prorrataPagasExtrasSS}
                      onChange={e => handleParamChange('prorrataPagasExtrasSS', Number(e.target.value))}
                      className="w-28 bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-900"
                    />
                    <span className="text-slate-500 text-[11px]">€/mes (en PDF: 254,10 €)</span>
                  </div>

                  <button
                    onClick={() => setActiveTab('preview')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition shadow-xs"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Aplicar y Ver Nómina Oficial</span>
                  </button>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* ================= MODAL FOOTER (Hidden on Print) ================= */}
        <div className="bg-white border-t border-slate-200 px-6 py-3 rounded-b-2xl flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span>Gasteiz de Vigilancia S.L.U. • CIF B01412840 • Vitoria-Gasteiz (Álava)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Nómina</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
