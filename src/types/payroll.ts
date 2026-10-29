export type DangerBonusType = 'sin_arma' | 'con_arma' | 'transporte_fondos' | 'ninguno';

export interface CompanyData {
  nombre: string;
  domicilio: string;
  poblacion: string;
  centroTrabajo: string;
  cif: string;
  ccc: string; // Código Cuenta Cotización SS
}

export interface WorkerPayrollProfile {
  codigoTrabajador: string; // e.g. "01-1840-1"
  nif: string;
  nombreCompleto: string;
  numAfiliacionSS: string; // e.g. "01 / 10036608 / 02"
  fechaAntiguedad: string; // e.g. "30/05/2005"
  fechaAltaEmpresa: string; // e.g. "01/07/2007"
  categoria: string; // e.g. "VIGILANTE SEGURIDAD"
  grupoCotizacion: number; // 6
  puestoTrabajo: string; // e.g. "PUESTO PRINCIPAL 24H"
  contrato: string; // e.g. "100" (Indefinido tiempo completo)
  proceso: string; // "0"
  iban: string; // e.g. "ES12-2100-5849-4802-0003-XXXX"
}

export interface PayrollParameters {
  year: number;
  month: number; // 1 - 12
  diasLiquidacion: number; // typically 30 for monthly quotation
  quinquenios: number;
  trienios: number;
  peligrosidadType: DangerBonusType;
  horasNocturnas: number;
  horasFestivas: number;
  horasExtras: number;
  horasExtrasEstructurales: number;
  plusTransporte: boolean;
  plusVestuario: boolean;
  // Extra pay options
  incluirPagaBeneficios: boolean;
  pagaBeneficiosImporte: number;
  prorrataPagasExtrasSS: number;
  // Tax (IRPF Álava)
  irpfPorcentaje: number;
  situacionFamiliar: 'soltero' | 'casado' | 'separado';
  hijosACargo: number;
  discapacidad: number;
  usarCalculoAutomaticoIRPF: boolean;
}

export interface DevengoLine {
  codigo: string;
  concepto: string;
  precioUnitario?: number;
  cantidad?: number;
  deducciones?: number;
  devengos: number;
}

export interface PayrollContributionDetail {
  base: number;
  porcentaje: number;
  cuota: number;
}

export interface PayrollCalculationResult {
  devengos: DevengoLine[];
  totalDevengado: number;
  bases: {
    remuneracionMensual: number;
    prorrataPagasExtras: number;
    cotizacionPeriodoIT: number;
    totalBCCC: number; // Base de Cotización por Contingencias Comunes
    baseHorasExtras: number;
    baseHorasExtrasEstructurales: number;
    baseIRPF: number;
  };
  trabajador: {
    contingenciasComunes: PayrollContributionDetail;
    desempleo: PayrollContributionDetail;
    formacionProfesional: PayrollContributionDetail;
    horasExtras: PayrollContributionDetail;
    horasExtrasEstructurales: PayrollContributionDetail;
    cotizacionAdicionalMEI: PayrollContributionDetail;
    totalAportaciones: number;
  };
  empresa: {
    contingenciasComunes: PayrollContributionDetail;
    desempleo: PayrollContributionDetail;
    formacionProfesional: PayrollContributionDetail;
    fogasa: PayrollContributionDetail;
    cIltIms: PayrollContributionDetail; // AT / EP (3.60% CNAE 80.10)
    horasExtras: PayrollContributionDetail;
    horasExtrasEstructurales: PayrollContributionDetail;
    mei: PayrollContributionDetail;
    cuotaTotalEmpresarial: number;
  };
  retenciones: {
    baseIRPF: number;
    porcentajeIRPF: number;
    cuotaIRPF: number;
    totalRetenciones: number;
  };
  totales: {
    totalDevengadoA: number;
    totalDeducirB: number;
    liquidoPercibir: number;
    costeTotalEmpresa: number;
  };
  meta: {
    periodoInicio: string; // "01/04/2026"
    periodoFin: string; // "30/04/2026"
    fechaEmision: string; // "VITORIA-GASTEIZ a 30 de abril de 2026"
    dias: number;
  };
}
