import {
  CompanyData,
  DangerBonusType,
  DevengoLine,
  PayrollCalculationResult,
  PayrollParameters,
  WorkerPayrollProfile,
} from '../types/payroll';

export const GASTEIZ_COMPANY_DEFAULT: CompanyData = {
  nombre: 'Gasteiz de Vigilancia, S. L.U.',
  domicilio: 'AV LOS OLMOS 1, 2º, 204',
  poblacion: 'VITORIA-GASTEIZ',
  centroTrabajo: 'GASTEIZ',
  cif: 'B01412840',
  ccc: '01/1033049/75',
};

// Official Security Guard salary tables according to the Convenio Colectivo Estatal de Empresas de Seguridad
interface ConvenioYearTable {
  baseDaily: number;
  quinquenioDaily: number;
  trienioDaily: number;
  peligrosidadDaily: {
    sin_arma: number;
    con_arma: number;
    transporte_fondos: number;
    ninguno: number;
  };
  transporteDaily: number;
  vestuarioDaily: number;
  precioHoraNocturna: number;
  precioHoraFestiva: number;
  precioHoraExtra: number;
  pagaBeneficiosDefecto: number;
  prorrataPagasExtrasDefecto: number;
  // MEI (Mecanismo de Equidad Intergeneracional)
  meiTrabajadorPct: number;
  meiEmpresaPct: number;
}

export const CONVENIO_TABLES: Record<number, ConvenioYearTable> = {
  2024: {
    baseDaily: 36.9747,
    quinquenioDaily: 5.8333,
    trienioDaily: 2.33,
    peligrosidadDaily: {
      sin_arma: 5.532,
      con_arma: 6.25,
      transporte_fondos: 6.85,
      ninguno: 0,
    },
    transporteDaily: 4.2377,
    vestuarioDaily: 3.4523,
    precioHoraNocturna: 1.16,
    precioHoraFestiva: 0.94,
    precioHoraExtra: 11.45,
    pagaBeneficiosDefecto: 120.0,
    prorrataPagasExtrasDefecto: 238.0,
    meiTrabajadorPct: 0.12,
    meiEmpresaPct: 0.58,
  },
  2025: {
    baseDaily: 38.0833,
    quinquenioDaily: 6.01,
    trienioDaily: 2.4,
    peligrosidadDaily: {
      sin_arma: 5.698,
      con_arma: 6.45,
      transporte_fondos: 7.05,
      ninguno: 0,
    },
    transporteDaily: 4.365,
    vestuarioDaily: 3.556,
    precioHoraNocturna: 1.2,
    precioHoraFestiva: 0.97,
    precioHoraExtra: 11.8,
    pagaBeneficiosDefecto: 123.5,
    prorrataPagasExtrasDefecto: 245.0,
    meiTrabajadorPct: 0.13,
    meiEmpresaPct: 0.67,
  },
  2026: {
    // Official values from the Gasteiz de Vigilancia payslip (Abril 2026)
    baseDaily: 38.7093,
    quinquenioDaily: 6.1147,
    trienioDaily: 2.45,
    peligrosidadDaily: {
      sin_arma: 5.9967,
      con_arma: 6.78,
      transporte_fondos: 7.4,
      ninguno: 0,
    },
    transporteDaily: 4.5937,
    vestuarioDaily: 3.7423,
    precioHoraNocturna: 1.26,
    precioHoraFestiva: 1.02,
    precioHoraExtra: 12.2,
    pagaBeneficiosDefecto: 127.05,
    prorrataPagasExtrasDefecto: 254.1,
    meiTrabajadorPct: 0.15,
    meiEmpresaPct: 0.75,
  },
  2027: {
    baseDaily: 39.677,
    quinquenioDaily: 6.2676,
    trienioDaily: 2.51,
    peligrosidadDaily: {
      sin_arma: 6.1467,
      con_arma: 6.95,
      transporte_fondos: 7.58,
      ninguno: 0,
    },
    transporteDaily: 4.7087,
    vestuarioDaily: 3.836,
    precioHoraNocturna: 1.2915,
    precioHoraFestiva: 1.0455,
    precioHoraExtra: 12.5,
    pagaBeneficiosDefecto: 130.2,
    prorrataPagasExtrasDefecto: 260.45,
    meiTrabajadorPct: 0.17,
    meiEmpresaPct: 0.83,
  },
};

/**
 * Helper to get the convenio rates for any year, falling back to 2026 if not explicitly mapped
 */
export function getConvenioYearTable(year: number): ConvenioYearTable {
  if (CONVENIO_TABLES[year]) {
    return CONVENIO_TABLES[year];
  }
  if (year > 2027) {
    // Escalate with +2.5% annual projection
    const diff = year - 2027;
    const factor = Math.pow(1.025, diff);
    const base2027 = CONVENIO_TABLES[2027];
    return {
      ...base2027,
      baseDaily: round(base2027.baseDaily * factor, 4),
      quinquenioDaily: round(base2027.quinquenioDaily * factor, 4),
      peligrosidadDaily: {
        sin_arma: round(base2027.peligrosidadDaily.sin_arma * factor, 4),
        con_arma: round(base2027.peligrosidadDaily.con_arma * factor, 4),
        transporte_fondos: round(base2027.peligrosidadDaily.transporte_fondos * factor, 4),
        ninguno: 0,
      },
      transporteDaily: round(base2027.transporteDaily * factor, 4),
      vestuarioDaily: round(base2027.vestuarioDaily * factor, 4),
      precioHoraNocturna: round(base2027.precioHoraNocturna * factor, 4),
      precioHoraFestiva: round(base2027.precioHoraFestiva * factor, 4),
      precioHoraExtra: round(base2027.precioHoraExtra * factor, 2),
      meiTrabajadorPct: 0.17,
      meiEmpresaPct: 0.83,
    };
  }
  return CONVENIO_TABLES[2026];
}

/**
 * Precise currency rounding to 2 decimal places
 */
export function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Estimates withholding rate according to Álava - Araba IRPF regulations
 * (Decreto Foral Normativo de Retenciones del Territorio Histórico de Álava)
 */
export function estimateAlavaIRPFRate(
  estimatedAnnualGross: number,
  hijosACargo: number,
  situacionFamiliar: 'soltero' | 'casado' | 'separado',
  discapacidad = 0
): number {
  // Approximate standard Álava tables for General Labor Income (Clave A)
  // For ~25,000 - 30,000€ gross annual income:
  let baseRate = 12.0;

  if (estimatedAnnualGross <= 15000) baseRate = 2.0;
  else if (estimatedAnnualGross <= 18000) baseRate = 6.0;
  else if (estimatedAnnualGross <= 21000) baseRate = 8.5;
  else if (estimatedAnnualGross <= 24000) baseRate = 10.0;
  else if (estimatedAnnualGross <= 27000) baseRate = 11.5;
  else if (estimatedAnnualGross <= 30000) baseRate = 13.0;
  else if (estimatedAnnualGross <= 35000) baseRate = 15.0;
  else baseRate = 17.0;

  // Family reductions
  if (hijosACargo === 1) baseRate -= 1.5;
  else if (hijosACargo === 2) baseRate -= 3.5;
  else if (hijosACargo >= 3) baseRate -= 6.0;

  if (situacionFamiliar === 'casado') baseRate -= 0.5;
  if (discapacidad >= 33) baseRate -= 3.0;

  return Math.max(2.0, round(baseRate, 2));
}

const MONTH_NAMES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

/**
 * Calculates complete Spanish payroll for a Private Security Guard
 * conforming strictly to the official format of Gasteiz de Vigilancia (Álava)
 */
export function calculateSecurityGuardPayroll(
  worker: WorkerPayrollProfile,
  params: PayrollParameters,
  company: CompanyData = GASTEIZ_COMPANY_DEFAULT
): PayrollCalculationResult {
  const table = getConvenioYearTable(params.year);
  const dias = params.diasLiquidacion || 30;

  // 1. DEVENGOS
  const devengos: DevengoLine[] = [];

  // 100 SALARIO BASE
  const salarioBaseAmount = round(table.baseDaily * dias, 2);
  devengos.push({
    codigo: '100',
    concepto: 'SALARIO BASE',
    precioUnitario: table.baseDaily,
    cantidad: dias,
    devengos: salarioBaseAmount,
  });

  // 110 ANTIGÜEDAD (Quinquenios / Trienios)
  if (params.quinquenios > 0) {
    const unitPrice = table.quinquenioDaily * params.quinquenios;
    const amount = round(unitPrice * dias, 2);
    devengos.push({
      codigo: '110',
      concepto: 'ANTIGÜEDAD QUINQUENIOS',
      precioUnitario: round(unitPrice, 4),
      cantidad: dias,
      devengos: amount,
    });
  } else if (params.trienios > 0) {
    const unitPrice = table.trienioDaily * params.trienios;
    const amount = round(unitPrice * dias, 2);
    devengos.push({
      codigo: '110',
      concepto: 'ANTIGÜEDAD TRIENIOS',
      precioUnitario: round(unitPrice, 4),
      cantidad: dias,
      devengos: amount,
    });
  }

  // 140 PLUS PELIGROSIDAD
  const peligroRate = table.peligrosidadDaily[params.peligrosidadType];
  if (peligroRate > 0) {
    const amount = round(peligroRate * dias, 2);
    devengos.push({
      codigo: '140',
      concepto: 'PLUS PELIGROSIDAD',
      precioUnitario: round(peligroRate, 4),
      cantidad: dias,
      devengos: amount,
    });
  }

  // 162 NOCTURNIDAD (Mes Anterior)
  if (params.horasNocturnas > 0) {
    const amount = round(table.precioHoraNocturna * params.horasNocturnas, 2);
    devengos.push({
      codigo: '162',
      concepto: 'NOCTURNIDAD (Mes Anterior)',
      precioUnitario: round(table.precioHoraNocturna, 4),
      cantidad: params.horasNocturnas,
      devengos: amount,
    });
  }

  // 172 FESTIVIDAD (Mes Anterior)
  if (params.horasFestivas > 0) {
    const amount = round(table.precioHoraFestiva * params.horasFestivas, 2);
    devengos.push({
      codigo: '172',
      concepto: 'FESTIVIDAD (Mes Anterior)',
      precioUnitario: round(table.precioHoraFestiva, 4),
      cantidad: params.horasFestivas,
      devengos: amount,
    });
  }

  // 230 DISTANCIA Y TRANSPORTE
  if (params.plusTransporte) {
    const amount = round(table.transporteDaily * dias, 2);
    devengos.push({
      codigo: '230',
      concepto: 'DISTANCIA Y TRANSPORTE',
      precioUnitario: round(table.transporteDaily, 4),
      cantidad: dias,
      devengos: amount,
    });
  }

  // 240 MANTENIMIENTO VESTUARIO
  if (params.plusVestuario) {
    const amount = round(table.vestuarioDaily * dias, 2);
    devengos.push({
      codigo: '240',
      concepto: 'MANTENIMIENTO VESTUARIO',
      precioUnitario: round(table.vestuarioDaily, 4),
      cantidad: dias,
      devengos: amount,
    });
  }

  // Horas Extras (si las hubiera en el mes)
  if (params.horasExtras > 0) {
    const amount = round(table.precioHoraExtra * params.horasExtras, 2);
    devengos.push({
      codigo: '180',
      concepto: 'HORAS EXTRAORDINARIAS',
      precioUnitario: round(table.precioHoraExtra, 4),
      cantidad: params.horasExtras,
      devengos: amount,
    });
  }

  // 400 PARTE PROP. PAGA EXTRA DE BENEFICIOS (o pagas prorrateadas)
  if (params.incluirPagaBeneficios && params.pagaBeneficiosImporte > 0) {
    devengos.push({
      codigo: '400',
      concepto: 'PARTE PROP.PAGA EXTRA DE BENEFICIOS',
      devengos: round(params.pagaBeneficiosImporte, 2),
    });
  }

  // Total Devengado (A)
  const totalDevengado = round(devengos.reduce((acc, line) => acc + line.devengos, 0), 2);

  // 2. BASES DE COTIZACIÓN
  const remuneracionMensual = totalDevengado;
  const prorrataPagasExtras = round(params.prorrataPagasExtrasSS || table.prorrataPagasExtrasDefecto, 2);
  const cotizacionPeriodoIT = 0.0;
  const totalBCCC = round(remuneracionMensual + prorrataPagasExtras + cotizacionPeriodoIT, 2);

  const baseHorasExtras = round(params.horasExtras * table.precioHoraExtra, 2);
  const baseHorasExtrasEstructurales = round(params.horasExtrasEstructurales * table.precioHoraExtra, 2);
  const baseIRPF = totalDevengado;

  // 3. APORTACIONES DEL TRABAJADOR A LA SEGURIDAD SOCIAL
  // CC: 4.70%
  const cuotaCCTrabajador = round(totalBCCC * 0.047, 2);
  // Desempleo (Indefinido clave 100): 1.55%
  const cuotaDesempleoTrabajador = round(totalBCCC * 0.0155, 2);
  // Formación Profesional: 0.10%
  const cuotaFPTrabajador = round(totalBCCC * 0.001, 2);
  // Horas extras: 4.70%
  const cuotaHETrabajador = round(baseHorasExtras * 0.047, 2);
  // Horas extras estructurales: 2.00%
  const cuotaHEEstrTrabajador = round(baseHorasExtrasEstructurales * 0.02, 2);
  // MEI (Mecanismo de Equidad Intergeneracional): e.g. 0.15% en 2026
  const cuotaMEITrabajador = round(totalBCCC * (table.meiTrabajadorPct / 100), 2);

  const totalAportacionesTrabajador = round(
    cuotaCCTrabajador +
    cuotaDesempleoTrabajador +
    cuotaFPTrabajador +
    cuotaHETrabajador +
    cuotaHEEstrTrabajador +
    cuotaMEITrabajador,
    2
  );

  // 4. APORTACIONES EMPRESARIALES (CUOTAS EMPRESA)
  // CC: 23.60%
  const cuotaCCEmpresa = round(totalBCCC * 0.236, 2);
  // Desempleo (Indefinido): 5.50%
  const cuotaDesempleoEmpresa = round(totalBCCC * 0.055, 2);
  // Formación Profesional: 0.60%
  const cuotaFPEmpresa = round(totalBCCC * 0.006, 2);
  // FOGASA (C. Emp. FGS): 0.20%
  const cuotaFogasaEmpresa = round(totalBCCC * 0.002, 2);
  // AT/EP (C. ILT + IMS, CNAE 80.10 Actividades de seguridad privada): 3.60% (IT 1.95% + IMS 1.65%)
  const cuotaCiltImsEmpresa = round(totalBCCC * 0.036, 2);
  // Horas extras normales: 23.60%
  const cuotaHEEmpresa = round(baseHorasExtras * 0.236, 2);
  // Horas extras estructurales: 12.00%
  const cuotaHEEstrEmpresa = round(baseHorasExtrasEstructurales * 0.12, 2);
  // MEI Empresa: e.g. 0.75% en 2026
  const cuotaMEIEmpresa = round(totalBCCC * (table.meiEmpresaPct / 100), 2);

  const cuotaTotalEmpresarial = round(
    cuotaCCEmpresa +
    cuotaDesempleoEmpresa +
    cuotaFPEmpresa +
    cuotaFogasaEmpresa +
    cuotaCiltImsEmpresa +
    cuotaHEEmpresa +
    cuotaHEEstrEmpresa +
    cuotaMEIEmpresa,
    2
  );

  // 5. RETENCIÓN IRPF (Hacienda Foral de Álava)
  let irpfPct = params.irpfPorcentaje;
  if (params.usarCalculoAutomaticoIRPF) {
    const annualEstimated = totalDevengado * 12;
    irpfPct = estimateAlavaIRPFRate(
      annualEstimated,
      params.hijosACargo,
      params.situacionFamiliar,
      params.discapacidad
    );
  }

  const cuotaIRPF = round(baseIRPF * (irpfPct / 100), 2);
  const totalRetenciones = cuotaIRPF;

  // 6. TOTALES FINALES
  const totalDeducirB = round(totalAportacionesTrabajador + totalRetenciones, 2);
  const liquidoPercibir = round(totalDevengado - totalDeducirB, 2);
  const costeTotalEmpresa = round(totalDevengado + cuotaTotalEmpresarial, 2);

  // Meta dates
  const m = params.month;
  const y = params.year;
  const lastDay = new Date(y, m, 0).getDate();
  const mmStr = String(m).padStart(2, '0');
  const lastDayStr = String(lastDay).padStart(2, '0');
  const monthNameEs = MONTH_NAMES_ES[m - 1] || 'mes';

  return {
    devengos,
    totalDevengado,
    bases: {
      remuneracionMensual,
      prorrataPagasExtras,
      cotizacionPeriodoIT,
      totalBCCC,
      baseHorasExtras,
      baseHorasExtrasEstructurales,
      baseIRPF,
    },
    trabajador: {
      contingenciasComunes: { base: totalBCCC, porcentaje: 4.7, cuota: cuotaCCTrabajador },
      desempleo: { base: totalBCCC, porcentaje: 1.55, cuota: cuotaDesempleoTrabajador },
      formacionProfesional: { base: totalBCCC, porcentaje: 0.1, cuota: cuotaFPTrabajador },
      horasExtras: { base: baseHorasExtras, porcentaje: 4.7, cuota: cuotaHETrabajador },
      horasExtrasEstructurales: { base: baseHorasExtrasEstructurales, porcentaje: 2.0, cuota: cuotaHEEstrTrabajador },
      cotizacionAdicionalMEI: { base: totalBCCC, porcentaje: table.meiTrabajadorPct, cuota: cuotaMEITrabajador },
      totalAportaciones: totalAportacionesTrabajador,
    },
    empresa: {
      contingenciasComunes: { base: totalBCCC, porcentaje: 23.6, cuota: cuotaCCEmpresa },
      desempleo: { base: totalBCCC, porcentaje: 5.5, cuota: cuotaDesempleoEmpresa },
      formacionProfesional: { base: totalBCCC, porcentaje: 0.6, cuota: cuotaFPEmpresa },
      fogasa: { base: totalBCCC, porcentaje: 0.2, cuota: cuotaFogasaEmpresa },
      cIltIms: { base: totalBCCC, porcentaje: 3.6, cuota: cuotaCiltImsEmpresa },
      horasExtras: { base: baseHorasExtras, porcentaje: 23.6, cuota: cuotaHEEmpresa },
      horasExtrasEstructurales: { base: baseHorasExtrasEstructurales, porcentaje: 12.0, cuota: cuotaHEEstrEmpresa },
      mei: { base: totalBCCC, porcentaje: table.meiEmpresaPct, cuota: cuotaMEIEmpresa },
      cuotaTotalEmpresarial,
    },
    retenciones: {
      baseIRPF,
      porcentajeIRPF: irpfPct,
      cuotaIRPF,
      totalRetenciones,
    },
    totales: {
      totalDevengadoA: totalDevengado,
      totalDeducirB,
      liquidoPercibir,
      costeTotalEmpresa,
    },
    meta: {
      periodoInicio: `01/${mmStr}/${y}`,
      periodoFin: `${lastDayStr}/${mmStr}/${y}`,
      fechaEmision: `VITORIA-GASTEIZ a ${lastDay} de ${monthNameEs} de ${y}`,
      dias,
    },
  };
}

/**
 * Pre-set sample profile matching the exact PDF uploaded by the user:
 * "ABRIL 2026.pdf" for JOSE ANGEL GABRIEL JIMENEZ
 */
export const SAMPLE_PDF_WORKER_2026: {
  worker: WorkerPayrollProfile;
  params: PayrollParameters;
} = {
  worker: {
    codigoTrabajador: '01-1840-1',
    nif: '16303460W',
    nombreCompleto: 'JOSE ANGEL GABRIEL JIMENEZ',
    numAfiliacionSS: '01 / 10036608 / 02',
    fechaAntiguedad: '30/05/2005',
    fechaAltaEmpresa: '01/07/2007',
    categoria: 'VIGILANTE SEGURIDAD',
    grupoCotizacion: 6,
    puestoTrabajo: 'PUESTO PRINCIPAL 24H',
    contrato: '100',
    proceso: '0',
    iban: 'ES12-2100-5849-4802-0003-XXXX',
  },
  params: {
    year: 2026,
    month: 4, // Abril
    diasLiquidacion: 30,
    quinquenios: 1, // 6.1147 * 30 = 183.44
    trienios: 0,
    peligrosidadType: 'sin_arma', // 5.9967 * 30 = 179.90
    horasNocturnas: 96, // 96 * 1.26 = 120.96
    horasFestivas: 87, // 87 * 1.02 = 88.74
    horasExtras: 0,
    horasExtrasEstructurales: 0,
    plusTransporte: true, // 4.5937 * 30 = 137.81
    plusVestuario: true, // 3.7423 * 30 = 112.27
    incluirPagaBeneficios: true,
    pagaBeneficiosImporte: 127.05,
    prorrataPagasExtrasSS: 254.1,
    irpfPorcentaje: 11.0, // Retención 11% = 232.26
    situacionFamiliar: 'soltero',
    hijosACargo: 0,
    discapacidad: 0,
    usarCalculoAutomaticoIRPF: false,
  },
};
