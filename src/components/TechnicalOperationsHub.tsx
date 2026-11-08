import React from 'react';
import { GasteizLogo } from '../constants/logo';
import { Employee } from '../types/quadrant';
import {
  Calendar,
  Receipt,
  Scale,
  Sparkles,
  Users,
  Cloud,
  ShieldCheck,
  ChevronRight,
  LogOut,
  ExternalLink,
  Smartphone,
  FileText,
  Clock,
  Building2,
  Database,
  ArrowRight,
  CheckCircle2,
  Award,
} from 'lucide-react';
import { BOE_OFFICIAL_REFERENCE, BOE_OFFICIAL_URL } from '../services/payrollCalculator';

export type ScreenId = 'hub' | 'cuadrante' | 'nominas' | 'convenio' | 'reportes' | 'empleados' | 'drive' | 'calendar';

interface TechnicalOperationsHubProps {
  currentUser: { email?: string | null; displayName?: string | null } | null;
  currentUserRole: 'admin' | 'user' | null;
  year: number;
  month: number;
  serviceName: string;
  employees: Employee[];
  daysCount: number;
  onSelectScreen: (screen: ScreenId) => void;
  onLogout: () => void;
  onToggleMobileView: () => void;
  onExportPDF: () => void;
}

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const TechnicalOperationsHub: React.FC<TechnicalOperationsHubProps> = ({
  currentUser,
  currentUserRole,
  year,
  month,
  serviceName,
  employees,
  daysCount,
  onSelectScreen,
  onLogout,
  onToggleMobileView,
  onExportPDF,
}) => {
  const isAdmin = currentUserRole === 'admin';
  const monthName = MONTH_NAMES_ES[month - 1] || 'Enero';

  const screensConfig = [
    {
      id: 'cuadrante' as ScreenId,
      title: 'CUADRANTE OPERATIVO 24H',
      tag: 'CONTROL HORARIO Y TURNOS',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      icon: Calendar,
      iconColor: 'text-blue-400 bg-blue-500/10 border-blue-400/20',
      description:
        'Matriz mensual de turnos 24 horas (A 13h, B 12h, C 12h, M, T, N, L, V, BAJA). Supervisión de cobertura continua, cálculo de descansos reglamentarios de 13h y asignación directa.',
      metric: `${employees.length} Vigilantes • ${daysCount} Días • Cobertura 24/7`,
      actionLabel: 'Abrir Cuadrante Operativo',
      highlight: true,
    },
    {
      id: 'nominas' as ScreenId,
      title: 'NÓMINAS OFICIALES Y SUELDO NETO',
      tag: 'MODELO OFICIAL PDF ÁLAVA',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: Receipt,
      iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-400/20',
      description:
        'Cálculo exacto del sueldo neto mensual conforme al BOE-A-2026-8569 y retenciones forales de Álava (Clave A). Desglose BCCC, MEI (0,15%/0,75%), costes patronales y vista idéntica al PDF de GV.',
      metric: `Salario Base 1.161,28 € • BCCC • MEI • IRPF Álava`,
      actionLabel: 'Acceder a Nóminas Oficiales',
      highlight: true,
    },
    {
      id: 'convenio' as ScreenId,
      title: 'CONVENIO COLECTIVO BOE',
      tag: `REF: ${BOE_OFFICIAL_REFERENCE}`,
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      icon: Scale,
      iconColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-400/20',
      description:
        'Tablas salariales estatutarias del sector de la Seguridad Privada (Resolución Dirección General de Trabajo). Configuración de salario base, pluses de peligrosidad, vestuario, transporte y horas extras.',
      metric: isAdmin ? 'Parámetros Editables por Administrador' : 'Modo Consulta Oficial',
      actionLabel: 'Configurar Convenio BOE',
      highlight: false,
    },
    {
      id: 'reportes' as ScreenId,
      title: 'INFORMES Y CÓMPUTO ANUAL',
      tag: '1.782 HORAS (1 ENE - 31 DIC)',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      icon: Sparkles,
      iconColor: 'text-amber-400 bg-amber-500/10 border-amber-400/20',
      description:
        'Consolidado de liquidación mensual de horas ordinarias, nocturnas (22-06h), festivas (domingos, festivos y sábados) y horas extraordinarias. Seguimiento del límite de 1.782h anuales.',
      metric: `Liquidación ${monthName} ${year} • Resumen Equipo`,
      actionLabel: 'Ver Informe de Servicio',
      highlight: false,
    },
    {
      id: 'empleados' as ScreenId,
      title: 'PLANTILLA Y ASIGNACIÓN DE PUESTOS',
      tag: 'VIGILANTES DE SEGURIDAD',
      badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      icon: Users,
      iconColor: 'text-sky-400 bg-sky-500/10 border-sky-400/20',
      description:
        'Gestión de vigilantes habilitados, TIP profesional, N.I.F., afiliación a la Seguridad Social, fechas de antigüedad y asignación de puestos (Puesto Principal 24h, Accesos, Apoyo).',
      metric: `${employees.length} Vigilantes registrados • TIP oficial`,
      actionLabel: 'Gestionar Plantilla',
      highlight: false,
    },
    {
      id: 'drive' as ScreenId,
      title: 'RESPALDO Y SINCRONIZACIÓN CLOUD',
      tag: 'GOOGLE WORKSPACE',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      icon: Cloud,
      iconColor: 'text-purple-400 bg-purple-500/10 border-purple-400/20',
      description:
        'Copias de seguridad automáticas y restauración cifrada en Google Drive. Sincronización telemática de turnos operativos con los calendarios de Google de los vigilantes.',
      metric: `Google Drive Backup • Google Calendar Sync`,
      actionLabel: 'Sincronización Cloud',
      highlight: false,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      
      {/* Top Professional Command Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          
          {/* Brand & Technical Title */}
          <div className="flex items-center gap-3.5">
            <GasteizLogo className="w-11 h-11 ring-1 ring-slate-700/60 rounded-xl p-0.5 bg-slate-800/80 shadow-md" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white uppercase flex items-center gap-2">
                  GASTEIZ DE VIGILANCIA
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    SISTEMA OPERATIVO PROFESIONAL
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>Servicio: <strong className="text-slate-200">{serviceName}</strong></span>
                <span className="text-slate-600">•</span>
                <span>Periodo: <strong className="text-blue-400 font-semibold">{monthName} {year}</strong></span>
              </p>
            </div>
          </div>

          {/* User Status and Quick Action Buttons */}
          <div className="flex items-center gap-3">
            {/* User Badge */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-1.5 text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <span className="text-slate-400 block text-[10px] leading-none">Usuario Conectado:</span>
                <span className="font-semibold text-slate-200 font-mono text-[11px]">{currentUser?.email || 'Operador'}</span>
              </div>
              <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md uppercase ml-1 ${
                isAdmin
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                  : 'bg-slate-700 text-slate-300'
              }`}>
                {isAdmin ? 'ADMINISTRADOR' : 'VIGILANTE'}
              </span>
            </div>

            {/* Mobile View button */}
            <button
              onClick={onToggleMobileView}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
              title="Vista adaptada a teléfonos móviles de los vigilantes"
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Vista Móvil</span>
            </button>

            {/* Export PDF Cuadrante */}
            <button
              onClick={onExportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm cursor-pointer"
              title="Exportar Cuadrante Oficial a PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF Cuadrante</span>
            </button>

            {/* Logout */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Screen Selector Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
        
        {/* Legislative & Technical Hero Header */}
        <div className="mb-6 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                  CENTRO DE MANDO OPERACIONAL
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  VITORIA-GASTEIZ (ÁLAVA)
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                Selecciona el Módulo de Trabajo
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-1 leading-relaxed">
                Plataforma integral de gestión de seguridad privada para <strong className="text-slate-200">Gasteiz de Vigilancia S.L.U.</strong> Conforme a las tablas salariales del <strong className="text-blue-300">BOE-A-2026-8569</strong> y las retenciones forales de Álava.
              </p>
            </div>

            {/* Quick Legislation Links */}
            <div className="flex flex-col sm:items-end gap-1.5 text-xs text-slate-400 font-mono">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Convenio:</span>
                <a
                  href={BOE_OFFICIAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-bold underline transition"
                >
                  {BOE_OFFICIAL_REFERENCE}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="text-slate-400">
                Jornada Anual: <strong className="text-slate-200">1.782h</strong> • Mensual: <strong className="text-slate-200">162h</strong>
              </div>
              <div className="text-slate-400">
                Hacienda Foral: <strong className="text-emerald-400">Territorio Histórico de Álava</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ================= 6 SCREEN CARDS GRID ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {screensConfig.map(screen => {
            const Icon = screen.icon;
            return (
              <div
                key={screen.id}
                onClick={() => onSelectScreen(screen.id)}
                className={`group relative bg-slate-900/90 hover:bg-slate-900 border rounded-2xl p-5 sm:p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-lg hover:shadow-2xl hover:-translate-y-0.5 ${
                  screen.highlight
                    ? 'border-slate-700/80 hover:border-blue-500/60 ring-1 ring-blue-500/10'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Card Header with Icon & Tag */}
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner transition-transform group-hover:scale-105 ${screen.iconColor}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border tracking-wide uppercase ${screen.badgeColor}`}>
                      {screen.tag}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-black text-white group-hover:text-blue-400 transition tracking-tight uppercase mb-2">
                    {screen.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {screen.description}
                  </p>
                </div>

                {/* Card Footer: Metrics & Action Button */}
                <div className="pt-3 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-3">
                    <span className="truncate text-[11px] font-medium text-slate-300">
                      {screen.metric}
                    </span>
                  </div>

                  <div className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-800/90 group-hover:bg-blue-600 group-hover:text-white text-slate-200 font-bold text-xs transition duration-150 shadow-xs">
                    <span>{screen.actionLabel}</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Technical Footer Bar */}
        <footer className="mt-8 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-mono">
          <div className="flex items-center gap-3">
            <Building2 className="w-4 h-4 text-slate-600" />
            <span>Gasteiz de Vigilancia S.L.U. • CIF B01412840 • CCC: 01/1033049/75 • Vitoria-Gasteiz</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Tablas BOE-A-2026-8569 Verificadas
            </span>
            <span className="text-slate-600">•</span>
            <span>Seguridad Privada CNAE 80.10</span>
          </div>
        </footer>

      </main>

    </div>
  );
};
