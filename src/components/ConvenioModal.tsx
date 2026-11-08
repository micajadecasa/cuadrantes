import React, { useState, useEffect } from 'react';
import { ConvenioSettings, EconomicRateConcept } from '../types/quadrant';
import { ConvenioYearTable } from '../types/payroll';
import {
  BOE_OFFICIAL_REFERENCE,
  BOE_OFFICIAL_URL,
  BOE_RESOLUCION_TITLE,
  getStoredConvenioYearTable,
  saveStoredConvenioYearTable,
  resetStoredConvenioYearTable,
  getConvenioYearTable,
} from '../services/payrollCalculator';
import {
  Sliders,
  Plus,
  Trash2,
  ShieldCheck,
  Check,
  Calendar,
  Euro,
  ExternalLink,
  RotateCcw,
  BookOpen,
  Info,
  Scale,
  Sparkles,
  Lock,
} from 'lucide-react';

interface ConvenioModalProps {
  isOpen: boolean;
  onClose: () => void;
  convenio: ConvenioSettings;
  onSaveConvenio: (newConvenio: ConvenioSettings) => void;
  customHolidays: Record<string, string>;
  onUpdateHolidays: (holidays: Record<string, string>) => void;
  currentUserRole?: 'admin' | 'user' | null;
  currentYear?: number;
}

export const ConvenioModal: React.FC<ConvenioModalProps> = ({
  isOpen,
  onClose,
  convenio,
  onSaveConvenio,
  customHolidays,
  onUpdateHolidays,
  currentUserRole = 'admin',
  currentYear = 2026,
}) => {
  const isAdmin = currentUserRole === 'admin';
  const [activeTab, setActiveTab] = useState<'boe' | 'general' | 'holidays'>('boe');

  // General settings state
  const [formData, setFormData] = useState<ConvenioSettings>({ ...convenio });
  const [holidays, setHolidays] = useState<Record<string, string>>({
    ...customHolidays,
  });

  // Selected year for BOE tables
  const [boeYear, setBoeYear] = useState<number>(currentYear || 2026);

  // BOE Official Table state (loaded from custom storage or defaults)
  const [boeTable, setBoeTable] = useState<ConvenioYearTable>(() => {
    return getStoredConvenioYearTable(currentYear || 2026);
  });

  const [savedSuccessMsg, setSavedSuccessMsg] = useState(false);

  // Holiday add form
  const [newHolidayDate, setNewHolidayDate] = useState('2027-05-15');
  const [newHolidayName, setNewHolidayName] = useState('Fiesta Local / Patrón');

  // Custom Rate add form
  const [newRateName, setNewRateName] = useState('');
  const [newRateAmount, setNewRateAmount] = useState<number>(50);
  const [newRateType, setNewRateType] = useState<EconomicRateConcept['type']>('monthly_fixed');

  // Reload BOE table when boeYear changes
  useEffect(() => {
    setBoeTable(getStoredConvenioYearTable(boeYear));
  }, [boeYear]);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({ ...convenio });
      setHolidays({ ...customHolidays });
      setBoeTable(getStoredConvenioYearTable(boeYear));
    }
  }, [isOpen, convenio, customHolidays, boeYear]);

  if (!isOpen) return null;

  const handleBoeFieldChange = (field: keyof ConvenioYearTable, value: any) => {
    if (!isAdmin) return;
    setBoeTable(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePeligroFieldChange = (key: 'sin_arma' | 'con_arma' | 'transporte_fondos' | 'ninguno', val: number) => {
    if (!isAdmin) return;
    setBoeTable(prev => ({
      ...prev,
      peligrosidadDaily: {
        ...prev.peligrosidadDaily,
        [key]: val,
      },
    }));
  };

  const handleResetToStatutoryBoe = () => {
    if (!isAdmin) return;
    if (window.confirm(`¿Restablecer la tabla de ${boeYear} a los valores oficiales exactos del BOE-A-2026-8569?`)) {
      const resetTable = resetStoredConvenioYearTable(boeYear);
      setBoeTable({ ...resetTable });
      setSavedSuccessMsg(true);
      setTimeout(() => setSavedSuccessMsg(false), 2500);
    }
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin) {
      // 1. Save BOE table to localStorage
      saveStoredConvenioYearTable(boeTable);

      // 2. Synchronize main convenio settings with the updated BOE table
      const updatedConvenio: ConvenioSettings = {
        ...formData,
        annualStandardHours: boeTable.jornadaAnual || 1782,
        monthlyStandardHours: boeTable.jornadaMensual || 162,
        nightBonusHourly: boeTable.precioHoraNocturna || 1.26,
        holidayBonusHourly: boeTable.precioHoraFestiva || 1.02,
        overtimeHourlyRate: boeTable.precioHoraExtra || 12.2,
        baseHourlyRate: Number((boeTable.baseDaily * 30 / (boeTable.jornadaMensual || 162)).toFixed(2)) || 7.17,
      };

      onSaveConvenio(updatedConvenio);
      onUpdateHolidays(holidays);
    }
    setSavedSuccessMsg(true);
    setTimeout(() => {
      setSavedSuccessMsg(false);
      onClose();
    }, 800);
  };

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayName.trim()) return;

    setHolidays(prev => ({
      ...prev,
      [newHolidayDate]: newHolidayName.trim(),
    }));
    setNewHolidayName('');
  };

  const handleDeleteHoliday = (dateKey: string) => {
    setHolidays(prev => {
      const copy = { ...prev };
      delete copy[dateKey];
      return copy;
    });
  };

  const handleAddCustomRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRateName.trim()) return;

    const newConcept: EconomicRateConcept = {
      id: `rate_${Date.now()}`,
      name: newRateName.trim(),
      amount: Number(newRateAmount),
      type: newRateType,
    };

    setFormData(prev => ({
      ...prev,
      customEconomicRates: [...(prev.customEconomicRates || []), newConcept],
    }));

    setNewRateName('');
    setNewRateAmount(50);
  };

  const handleDeleteCustomRate = (id: string) => {
    setFormData(prev => ({
      ...prev,
      customEconomicRates: (prev.customEconomicRates || []).filter(r => r.id !== id),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[94vh] flex flex-col">
        
        {/* Top Header */}
        <div className="bg-slate-900 text-white p-4 rounded-t-2xl flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                  CONVENIO COLECTIVO ESTATAL DE SEGURIDAD PRIVADA
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-mono">
                  {BOE_OFFICIAL_REFERENCE}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tablas salariales oficiales publicadas en el BOE y configuración de tarifas para Gasteiz de Vigilancia.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin ? (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                Modo Administrador (Editable)
              </span>
            ) : (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Solo Consulta (Vigilante)
              </span>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-lg font-bold p-1 ml-2 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 bg-slate-200/90 p-0.5 rounded-xl border border-slate-300 text-xs font-bold">
            <button
              onClick={() => setActiveTab('boe')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'boe'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>Tablas Salariales BOE-A-2026-8569</span>
            </button>
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'general'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span>Jornada y Pluses Adicionales</span>
            </button>
            <button
              onClick={() => setActiveTab('holidays')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'holidays'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Festivos de Álava-Araba</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={BOE_OFFICIAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg transition"
              title="Abrir publicación oficial en el Boletín Oficial del Estado"
            >
              <span>Ver en BOE.es</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          
          {/* TAB 1: TABLAS SALARIALES BOE-A-2026-8569 */}
          {activeTab === 'boe' && (
            <div className="space-y-4">
              
              {/* Information Banner explaining where the numbers come from */}
              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl p-4 shadow-sm border border-blue-800">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-800/60 text-amber-300">
                    <Info className="w-5 h-5" />
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm uppercase tracking-wide">
                        Fuente Oficial de los Valores:
                      </span>
                      <a
                        href={BOE_OFFICIAL_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-blue-200 hover:text-white font-mono font-bold flex items-center gap-1"
                      >
                        {BOE_OFFICIAL_REFERENCE}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-slate-200 leading-relaxed">
                      Los importes provienen de la <strong>{BOE_RESOLUCION_TITLE}</strong> (publicada en el BOE), que fija la jornada anual en <strong>1.782 horas</strong> (162 h/mes) y establece las tablas salariales obligatorias para Vigilantes de Seguridad, pluses de peligrosidad, transporte, vestuario, nocturnidad y horas extras.
                    </p>
                    <p className="text-slate-300 text-[11px] pt-1">
                      {isAdmin ? (
                        <span className="text-emerald-300 font-bold">
                          Como administrador, puedes modificar cualquiera de los importes a continuación para adaptarlos a revisiones salariales, acuerdos locales o pluses pactados.
                        </span>
                      ) : (
                        <span>Modo consulta. Solo los administradores pueden guardar modificaciones.</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Year Selector and Reset Button */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Ejercicio a Modificar:</span>
                  <select
                    value={boeYear}
                    onChange={e => setBoeYear(Number(e.target.value))}
                    className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1 text-xs font-bold text-blue-700 focus:outline-none"
                  >
                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                      <option key={y} value={y}>
                        Año {y} {y === 2026 ? '(Vigente Oficial BOE)' : ''}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Ref: {boeTable.boeReference}
                  </span>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleResetToStatutoryBoe}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 hover:text-rose-700 hover:bg-rose-50 border border-slate-300 transition"
                    title="Restablecer a los importes originales del BOE"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restablecer a Valores Oficiales BOE</span>
                  </button>
                )}
              </div>

              {/* Core Salary Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Bloque 1: Salario Base y Complementos Personales */}
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                    <span>1. Salario Base y Antigüedad (G.C. 6)</span>
                    <span className="text-[10px] text-blue-600 font-mono">Vigilante Seguridad</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        100 Salario Base (€/día)
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        disabled={!isAdmin}
                        value={boeTable.baseDaily}
                        onChange={e => handleBoeFieldChange('baseDaily', Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-900 focus:bg-white"
                      />
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Mensual (30 d): {(boeTable.baseDaily * 30).toFixed(2)} €
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        110 Antigüedad Quinquenio (€/día)
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        disabled={!isAdmin}
                        value={boeTable.quinquenioDaily}
                        onChange={e => handleBoeFieldChange('quinquenioDaily', Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-900 focus:bg-white"
                      />
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Mensual (30 d): {(boeTable.quinquenioDaily * 30).toFixed(2)} €
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        110 Antigüedad Trienio (€/día)
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        disabled={!isAdmin}
                        value={boeTable.trienioDaily}
                        onChange={e => handleBoeFieldChange('trienioDaily', Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-900 focus:bg-white"
                      />
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Mensual (30 d): {(boeTable.trienioDaily * 30).toFixed(2)} €
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        400 Paga Extra Beneficios (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        disabled={!isAdmin}
                        value={boeTable.pagaBeneficiosDefecto}
                        onChange={e => handleBoeFieldChange('pagaBeneficiosDefecto', Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-900 focus:bg-white"
                      />
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Prorrata mensual en nómina
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bloque 2: Pluses de Puesto y Peligrosidad */}
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                    <span>2. Pluses de Peligrosidad y Actividad</span>
                    <span className="text-[10px] text-indigo-600 font-mono">Art. 42 Convenio</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        140 Sin Arma (€/día)
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        disabled={!isAdmin}
                        value={boeTable.peligrosidadDaily.sin_arma}
                        onChange={e => handlePeligroFieldChange('sin_arma', Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-900 focus:bg-white"
                      />
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Mensual: {(boeTable.peligrosidadDaily.sin_arma * 30).toFixed(2)} € (PDF: 179,90 €)
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        140 Con Arma (€/día)
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        disabled={!isAdmin}
                        value={boeTable.peligrosidadDaily.con_arma}
                        onChange={e => handlePeligroFieldChange('con_arma', Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-900 focus:bg-white"
                      />
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Mensual: {(boeTable.peligrosidadDaily.con_arma * 30).toFixed(2)} €
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Transporte Fondos (€/día)
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        disabled={!isAdmin}
                        value={boeTable.peligrosidadDaily.transporte_fondos}
                        onChange={e => handlePeligroFieldChange('transporte_fondos', Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-900 focus:bg-white"
                      />
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Mensual: {(boeTable.peligrosidadDaily.transporte_fondos * 30).toFixed(2)} €
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Prorrata Pagas SS (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        disabled={!isAdmin}
                        value={boeTable.prorrataPagasExtrasDefecto}
                        onChange={e => handleBoeFieldChange('prorrataPagasExtrasDefecto', Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-900 focus:bg-white"
                      />
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Cómputo en BCCC (PDF: 254,10 €)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bloque 3: Pluses Indemnizatorios (Transporte y Vestuario) */}
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                    <span>3. Pluses Indemnizatorios</span>
                    <span className="text-[10px] text-emerald-600 font-mono">No computan despido</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        230 Distancia y Transporte (€/día)
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        disabled={!isAdmin}
                        value={boeTable.transporteDaily}
                        onChange={e => handleBoeFieldChange('transporteDaily', Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-900 focus:bg-white"
                      />
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Mensual (30 d): {(boeTable.transporteDaily * 30).toFixed(2)} € (PDF: 137,81 €)
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        240 Mantenimiento Vestuario (€/día)
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        disabled={!isAdmin}
                        value={boeTable.vestuarioDaily}
                        onChange={e => handleBoeFieldChange('vestuarioDaily', Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-900 focus:bg-white"
                      />
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Mensual (30 d): {(boeTable.vestuarioDaily * 30).toFixed(2)} € (PDF: 112,27 €)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bloque 4: Horas Nocturnas, Festivas, Extras y MEI */}
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                    <span>4. Horas Variables y Mecanismo MEI</span>
                    <span className="text-[10px] text-purple-600 font-mono">Por Horas / Cotización</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        162 Plus Nocturnidad (€/h)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        disabled={!isAdmin}
                        value={boeTable.precioHoraNocturna}
                        onChange={e => handleBoeFieldChange('precioHoraNocturna', Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono font-bold text-purple-900 focus:bg-white"
                      />
                      <span className="text-[10px] text-purple-600 block mt-0.5">
                        22:00 a 06:00 (BOE: 1,26 €/h)
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        172 Plus Festividad (€/h)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        disabled={!isAdmin}
                        value={boeTable.precioHoraFestiva}
                        onChange={e => handleBoeFieldChange('precioHoraFestiva', Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono font-bold text-orange-900 focus:bg-white"
                      />
                      <span className="text-[10px] text-orange-600 block mt-0.5">
                        Dom/Fest/Sáb (PDF: 1,02 €/h)
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        180 Horas Extras (€/h)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        disabled={!isAdmin}
                        value={boeTable.precioHoraExtra}
                        onChange={e => handleBoeFieldChange('precioHoraExtra', Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono font-bold text-emerald-900 focus:bg-white"
                      />
                      <span className="text-[10px] text-emerald-600 block mt-0.5">
                        Hora extraordinaria ordinaria
                      </span>
                    </div>

                    <div className="bg-amber-50 p-2 rounded border border-amber-200">
                      <label className="block text-[10px] font-bold text-amber-900 mb-0.5">
                        MEI Trabajador / Empresa (%)
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          disabled={!isAdmin}
                          value={boeTable.meiTrabajadorPct}
                          onChange={e => handleBoeFieldChange('meiTrabajadorPct', Number(e.target.value))}
                          className="w-14 bg-white border border-amber-300 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-amber-950"
                        />
                        <span className="text-amber-800 font-bold">/</span>
                        <input
                          type="number"
                          step="0.01"
                          disabled={!isAdmin}
                          value={boeTable.meiEmpresaPct}
                          onChange={e => handleBoeFieldChange('meiEmpresaPct', Number(e.target.value))}
                          className="w-14 bg-white border border-amber-300 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-amber-950"
                        />
                      </div>
                      <span className="text-[9.5px] text-amber-800 block mt-0.5">
                        Total MEI: {(boeTable.meiTrabajadorPct + boeTable.meiEmpresaPct).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: JORNADA Y PLUSES ADICIONALES */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
                  Cómputo Anual y Reglamentario del Servicio (Gasteiz de Vigilancia)
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Horas Mensuales de Referencia
                    </label>
                    <input
                      type="number"
                      disabled={!isAdmin}
                      value={formData.monthlyStandardHours}
                      onChange={e => setFormData({ ...formData, monthlyStandardHours: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-bold"
                    />
                    <span className="text-[10px] text-slate-500">162 h/mes según BOE</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Jornada Anual Efectiva
                    </label>
                    <input
                      type="number"
                      disabled={!isAdmin}
                      value={formData.annualStandardHours}
                      onChange={e => setFormData({ ...formData, annualStandardHours: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-bold text-blue-700"
                    />
                    <span className="text-[10px] text-slate-500">1.782 h (1 Ene - 31 Dic)</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Inicio Nocturnidad
                    </label>
                    <input
                      type="number"
                      disabled={!isAdmin}
                      value={formData.nightStartHour}
                      onChange={e => setFormData({ ...formData, nightStartHour: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-bold"
                    />
                    <span className="text-[10px] text-slate-500">22:00</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Fin Nocturnidad
                    </label>
                    <input
                      type="number"
                      disabled={!isAdmin}
                      value={formData.nightEndHour}
                      onChange={e => setFormData({ ...formData, nightEndHour: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-bold"
                    />
                    <span className="text-[10px] text-slate-500">06:00</span>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      disabled={!isAdmin}
                      checked={formData.saturdaysCountAsHoliday}
                      onChange={e => setFormData({ ...formData, saturdaysCountAsHoliday: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Cómputo de Sábados como Festivos (devengan Plus de Festividad junto a domingos y fiestas)
                    </span>
                  </label>
                </div>
              </div>

              {/* Custom Rates Table */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Conceptos Económicos Específicos Adicionales
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Pluses de cliente o complementos de servicio
                  </span>
                </div>

                {isAdmin && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Nombre del Plus</label>
                      <input
                        type="text"
                        placeholder="ej. Plus Disponibilidad, Plus Aeropuerto"
                        value={newRateName}
                        onChange={e => setNewRateName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Importe (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newRateAmount}
                        onChange={e => setNewRateAmount(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCustomRate}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-1.5 px-3 rounded transition"
                    >
                      + Añadir Plus
                    </button>
                  </div>
                )}

                <div className="divide-y divide-slate-100">
                  {(formData.customEconomicRates || []).length === 0 ? (
                    <div className="text-center text-slate-400 py-3 text-xs italic">
                      No hay pluses específicos adicionales configurados.
                    </div>
                  ) : (
                    formData.customEconomicRates.map(cr => (
                      <div key={cr.id} className="flex items-center justify-between py-2 text-xs">
                        <span className="font-semibold text-slate-800">{cr.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-emerald-700">+{cr.amount.toFixed(2)} €</span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomRate(cr.id)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: FESTIVOS DE ÁLAVA-ARABA */}
          {activeTab === 'holidays' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Calendario de Días Festivos Oficiales (Vitoria-Gasteiz / Álava)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Los turnos trabajados en estos días computan automáticamente el plus de festividad oficial.
                    </p>
                  </div>
                </div>

                {isAdmin && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Fecha Festivo</label>
                      <input
                        type="date"
                        value={newHolidayDate}
                        onChange={e => setNewHolidayDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Motivo / Festividad</label>
                      <input
                        type="text"
                        placeholder="ej. San Prudencio, Virgen Blanca"
                        value={newHolidayName}
                        onChange={e => setNewHolidayName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddHoliday}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 px-3 rounded transition"
                    >
                      + Añadir Festivo
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                  {Object.entries(holidays)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([dateKey, name]) => (
                      <div
                        key={dateKey}
                        className="flex items-center justify-between bg-orange-50/70 border border-orange-200/80 rounded-lg p-2 text-xs"
                      >
                        <div>
                          <span className="font-mono font-bold text-orange-950 block">{dateKey}</span>
                          <span className="text-[11px] text-orange-800">{name}</span>
                        </div>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteHoliday(dateKey)}
                            className="text-orange-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-white border-t border-slate-200 px-6 py-3 rounded-b-2xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>BOE-A-2026-8569 • Dirección General de Trabajo • Seguridad Privada</span>
          </div>

          <div className="flex items-center gap-2">
            {savedSuccessMsg && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-pulse">
                <Check className="w-4 h-4" />
                Guardado con éxito
              </span>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={handleSaveAll}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition shadow-xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Guardar Cambios de Convenio</span>
              </button>
            )}

            <button
              type="button"
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
