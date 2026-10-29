import React from 'react';
import { CompanyData, PayrollCalculationResult, WorkerPayrollProfile } from '../types/payroll';

interface OfficialPayslipProps {
  company: CompanyData;
  worker: WorkerPayrollProfile;
  payroll: PayrollCalculationResult;
}

/**
 * Formats a number to Spanish currency representation (e.g., "1.161,28" or "38,7093")
 */
function fmtNumber(value: number | undefined, decimals = 2): string {
  if (value === undefined || isNaN(value)) return '';
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export const OfficialPayslip: React.FC<OfficialPayslipProps> = ({
  company,
  worker,
  payroll,
}) => {
  return (
    <div className="official-payslip-root bg-white text-black p-4 sm:p-7 max-w-[850px] mx-auto border border-slate-300 shadow-xl rounded-sm print:shadow-none print:border-none print:p-0 print:max-w-none text-[10.5px] leading-tight select-text font-sans">
      {/* Outer black border container matching official printed document */}
      <div className="border border-black rounded-lg overflow-hidden">
        
        {/* ================= HEADER: EMPRESA & TRABAJADOR ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 border-b border-black divide-y md:divide-y-0 md:divide-x divide-black">
          
          {/* Left Column: EMPRESA */}
          <div className="p-2 space-y-1">
            <div className="bg-slate-200/90 px-1.5 py-0.5 font-bold text-[9px] uppercase tracking-wider text-slate-800">
              EMPRESA
            </div>
            <div className="font-bold text-[11px] px-1">{company.nombre}</div>

            <div className="grid grid-cols-1 gap-1 pt-0.5">
              <div>
                <span className="text-[9px] text-slate-600 block uppercase font-medium">DOMICILIO</span>
                <span className="font-semibold px-1 text-[10px]">{company.domicilio}</span>
              </div>

              <div>
                <span className="text-[9px] text-slate-600 block uppercase font-medium">POBLACIÓN</span>
                <span className="font-semibold px-1 text-[10px]">{company.poblacion}</span>
              </div>

              <div>
                <span className="text-[9px] text-slate-600 block uppercase font-medium">CENTRO DE TRABAJO</span>
                <span className="font-semibold px-1 text-[10px]">{company.centroTrabajo}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                <div>
                  <span className="text-[9px] text-slate-600 block uppercase font-medium">C.I.F.</span>
                  <span className="font-bold px-1 text-[10px] font-mono">{company.cif}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-600 block uppercase font-medium">COD.CTA.COTIZ. S.S.</span>
                  <span className="font-bold px-1 text-[10px] font-mono">{company.ccc}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: TRABAJADOR/A */}
          <div className="p-2 space-y-1">
            <div className="bg-slate-200/90 px-1.5 py-0.5 font-bold text-[9px] uppercase tracking-wider text-slate-800">
              TRABAJADOR/A
            </div>
            <div className="flex items-center gap-2 px-1">
              <span className="font-mono text-[10px] text-slate-700 font-bold">{worker.codigoTrabajador}</span>
              <span className="font-bold text-[11px] uppercase">{worker.nombreCompleto}</span>
            </div>

            {/* Sub-grid of worker official attributes */}
            <div className="border border-slate-300 rounded overflow-hidden text-[9px]">
              {/* Row 1 */}
              <div className="grid grid-cols-3 bg-slate-100/80 border-b border-slate-300 font-semibold text-slate-700 px-1.5 py-0.5">
                <div>N.I.F.</div>
                <div>Nº. AFILIACIÓN S.S.</div>
                <div>FECHA ANTIGÜEDAD</div>
              </div>
              <div className="grid grid-cols-3 border-b border-slate-300 px-1.5 py-0.5 font-bold font-mono text-[9.5px]">
                <div>{worker.nif}</div>
                <div>{worker.numAfiliacionSS}</div>
                <div>{worker.fechaAntiguedad}</div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-3 bg-slate-100/80 border-b border-slate-300 font-semibold text-slate-700 px-1.5 py-0.5">
                <div>CATEGORIA</div>
                <div>G.C.</div>
                <div>FECHA ALTA EMP.</div>
              </div>
              <div className="grid grid-cols-3 border-b border-slate-300 px-1.5 py-0.5 font-bold text-[9.5px]">
                <div className="truncate">{worker.categoria}</div>
                <div>{worker.grupoCotizacion}</div>
                <div className="font-mono">{worker.fechaAltaEmpresa}</div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-3 bg-slate-100/80 border-b border-slate-300 font-semibold text-slate-700 px-1.5 py-0.5">
                <div>PUESTO TRABAJO</div>
                <div>CONTRATO</div>
                <div>PROCESO</div>
              </div>
              <div className="grid grid-cols-3 border-b border-slate-300 px-1.5 py-0.5 font-bold text-[9.5px]">
                <div className="truncate">{worker.puestoTrabajo || '-'}</div>
                <div>{worker.contrato}</div>
                <div>{worker.proceso}</div>
              </div>

              {/* Row 4 */}
              <div className="grid grid-cols-3 bg-slate-100/80 border-b border-slate-300 font-semibold text-slate-700 px-1.5 py-0.5">
                <div className="col-span-2">PERIODO LIQUIDACIÓN</div>
                <div>DIAS</div>
              </div>
              <div className="grid grid-cols-3 px-1.5 py-0.5 font-bold text-[9.5px] font-mono">
                <div className="col-span-2">{payroll.meta.periodoInicio} - {payroll.meta.periodoFin}</div>
                <div>{payroll.meta.dias}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= CONCEPTO / DEVENGOS TABLE ================= */}
        <div>
          {/* Table Header */}
          <div className="grid grid-cols-12 bg-slate-100 border-b border-black font-bold text-[9.5px] py-1 px-2 text-slate-800 uppercase tracking-tight">
            <div className="col-span-6">CONCEPTO</div>
            <div className="col-span-1 text-right">PRECIO</div>
            <div className="col-span-1 text-right">CANTIDAD</div>
            <div className="col-span-2 text-right">DEDUCCIONES</div>
            <div className="col-span-2 text-right">DEVENGOS</div>
          </div>

          {/* Devengos Header indicator */}
          <div className="px-2 pt-1 font-black text-[9.5px] tracking-wider text-slate-800">
            DEVENGOS
          </div>

          {/* Devengos Lines */}
          <div className="px-2 space-y-0.5 min-h-[145px] pb-1 font-mono text-[9.5px]">
            {payroll.devengos.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 items-center py-0.5 hover:bg-slate-50">
                <div className="col-span-6 font-sans">
                  <span className="font-mono text-slate-600 mr-2 font-bold">{line.codigo}</span>
                  <span className="font-semibold text-slate-900">{line.concepto}</span>
                </div>
                <div className="col-span-1 text-right text-slate-700">
                  {line.precioUnitario !== undefined ? fmtNumber(line.precioUnitario, 4) : ''}
                </div>
                <div className="col-span-1 text-right text-slate-700">
                  {line.cantidad !== undefined ? fmtNumber(line.cantidad, 2) : ''}
                </div>
                <div className="col-span-2 text-right text-slate-500">
                  {line.deducciones ? fmtNumber(line.deducciones, 2) : ''}
                </div>
                <div className="col-span-2 text-right font-bold text-slate-950">
                  {fmtNumber(line.devengos, 2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================= BASES, RETENCIÓN IRPF Y SS ================= */}
        <div className="border-t border-black bg-slate-50/50 p-2 text-[9px]">
          <div className="font-bold text-[9.5px] text-slate-900 mb-1.5">
            Bases, Retención IRPF y aportaciones del trabajador/a a la Seguridad Social :
          </div>

          <div className="grid grid-cols-12 gap-2">
            
            {/* Left Sub-Box: Bases Summary */}
            <div className="col-span-12 lg:col-span-4 border border-black/80 rounded bg-white p-1.5 space-y-1">
              <div className="flex justify-between border-b border-slate-200 pb-0.5">
                <span className="text-slate-700">Remuneración cotizable mensual</span>
                <span className="font-bold font-mono">{fmtNumber(payroll.bases.remuneracionMensual, 2)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-0.5">
                <span className="text-slate-700">Prorrata Pagas Extraordinarias</span>
                <span className="font-bold font-mono">{fmtNumber(payroll.bases.prorrataPagasExtras, 2)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-0.5">
                <span className="text-slate-700">Cotización Periodo I.T.</span>
                <span className="font-mono text-slate-500">0,00</span>
              </div>
              <div className="flex justify-between pt-0.5 font-black text-[10px] text-slate-950">
                <span>Total</span>
                <span className="font-mono">{fmtNumber(payroll.bases.totalBCCC, 2)}</span>
              </div>
            </div>

            {/* Right Contributions & IRPF Table */}
            <div className="col-span-12 lg:col-span-8 border border-black/80 rounded bg-white overflow-hidden">
              <table className="w-full text-left border-collapse text-[8.5px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-black text-slate-800 font-bold">
                    <th className="p-1"></th>
                    <th className="p-1 text-right">Bases</th>
                    <th className="p-1 text-center">%</th>
                    <th className="p-1 text-right">Cuota</th>
                    <th className="p-1 text-right bg-slate-50 border-l border-slate-200">Cuotas Emp.</th>
                    <th className="p-1 text-right bg-slate-50"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {/* Contingencias Comunes */}
                  <tr>
                    <td className="p-1 font-sans font-semibold text-slate-800">Contingencias Comunes</td>
                    <td className="p-1 text-right">{fmtNumber(payroll.trabajador.contingenciasComunes.base, 2)}</td>
                    <td className="p-1 text-center">{fmtNumber(payroll.trabajador.contingenciasComunes.porcentaje, 2)}</td>
                    <td className="p-1 text-right font-bold">{fmtNumber(payroll.trabajador.contingenciasComunes.cuota, 2)}</td>
                    <td className="p-1 text-right border-l border-slate-200 bg-slate-50/60 font-semibold">{fmtNumber(payroll.empresa.contingenciasComunes.cuota, 2)}</td>
                    <td className="p-1 text-right bg-slate-50/60 font-sans text-slate-600">
                      <span className="text-[7.5px] uppercase">C. Emp.FGS:</span> <strong className="font-mono text-[8.5px] text-slate-900">{fmtNumber(payroll.empresa.fogasa.cuota, 2)}</strong>
                    </td>
                  </tr>

                  {/* Desempleo */}
                  <tr>
                    <td className="p-1 font-sans font-semibold text-slate-800">Desempleo</td>
                    <td className="p-1 text-right">{fmtNumber(payroll.trabajador.desempleo.base, 2)}</td>
                    <td className="p-1 text-center">{fmtNumber(payroll.trabajador.desempleo.porcentaje, 2)}</td>
                    <td className="p-1 text-right font-bold">{fmtNumber(payroll.trabajador.desempleo.cuota, 2)}</td>
                    <td className="p-1 text-right border-l border-slate-200 bg-slate-50/60 font-semibold">{fmtNumber(payroll.empresa.desempleo.cuota, 2)}</td>
                    <td className="p-1 text-right bg-slate-50/60 font-sans text-slate-600">
                      <span className="text-[7.5px] uppercase">C. ILT+IMS:</span> <strong className="font-mono text-[8.5px] text-slate-900">{fmtNumber(payroll.empresa.cIltIms.cuota, 2)}</strong>
                    </td>
                  </tr>

                  {/* Formación Profesional */}
                  <tr>
                    <td className="p-1 font-sans font-semibold text-slate-800">Formación Profesional</td>
                    <td className="p-1 text-right">{fmtNumber(payroll.trabajador.formacionProfesional.base, 2)}</td>
                    <td className="p-1 text-center">{fmtNumber(payroll.trabajador.formacionProfesional.porcentaje, 2)}</td>
                    <td className="p-1 text-right font-bold">{fmtNumber(payroll.trabajador.formacionProfesional.cuota, 2)}</td>
                    <td className="p-1 text-right border-l border-slate-200 bg-slate-50/60 font-semibold">{fmtNumber(payroll.empresa.formacionProfesional.cuota, 2)}</td>
                    <td className="p-1 text-right bg-slate-50/60 font-sans text-slate-600">
                      <span className="text-[7.5px] uppercase font-bold text-slate-800">Cuota Total:</span> <strong className="font-mono text-[9px] text-blue-900">{fmtNumber(payroll.empresa.cuotaTotalEmpresarial, 2)}</strong>
                    </td>
                  </tr>

                  {/* Horas Extras */}
                  <tr>
                    <td className="p-1 font-sans text-slate-700">Horas Extraordinarias</td>
                    <td className="p-1 text-right">{fmtNumber(payroll.trabajador.horasExtras.base, 2)}</td>
                    <td className="p-1 text-center">{fmtNumber(payroll.trabajador.horasExtras.porcentaje, 2)}</td>
                    <td className="p-1 text-right">{fmtNumber(payroll.trabajador.horasExtras.cuota, 2)}</td>
                    <td className="p-1 text-right border-l border-slate-200 bg-slate-50/60">{fmtNumber(payroll.empresa.horasExtras.cuota, 2)}</td>
                    <td className="p-1 bg-slate-50/60"></td>
                  </tr>

                  {/* Horas Extras Estructurales */}
                  <tr>
                    <td className="p-1 font-sans text-slate-700">Horas Extraordinarias Estructurales</td>
                    <td className="p-1 text-right">{fmtNumber(payroll.trabajador.horasExtrasEstructurales.base, 2)}</td>
                    <td className="p-1 text-center">{fmtNumber(payroll.trabajador.horasExtrasEstructurales.porcentaje, 2)}</td>
                    <td className="p-1 text-right">{fmtNumber(payroll.trabajador.horasExtrasEstructurales.cuota, 2)}</td>
                    <td className="p-1 text-right border-l border-slate-200 bg-slate-50/60">{fmtNumber(payroll.empresa.horasExtrasEstructurales.cuota, 2)}</td>
                    <td className="p-1 bg-slate-50/60"></td>
                  </tr>

                  {/* Cotización adicional C.C. / MEI */}
                  <tr className="bg-amber-50/30">
                    <td className="p-1 font-sans font-bold text-slate-900">Cotización adicional C.C. / MEI</td>
                    <td className="p-1 text-right">{fmtNumber(payroll.trabajador.cotizacionAdicionalMEI.base, 2)}</td>
                    <td className="p-1 text-center font-bold text-amber-800">
                      {fmtNumber(payroll.trabajador.cotizacionAdicionalMEI.porcentaje, 2)}%
                    </td>
                    <td className="p-1 text-right font-black text-slate-900">
                      {fmtNumber(payroll.trabajador.cotizacionAdicionalMEI.cuota, 2)}
                    </td>
                    <td className="p-1 text-right border-l border-slate-200 bg-slate-50/60 font-black text-slate-900">
                      {fmtNumber(payroll.empresa.mei.cuota, 2)}
                    </td>
                    <td className="p-1 text-right bg-slate-50/60 font-sans">
                      <span className="text-[7.5px] text-slate-500">MEI Emp: {fmtNumber(payroll.empresa.mei.porcentaje, 2)}%</span>
                    </td>
                  </tr>

                  {/* Subtotal aportaciones trabajador */}
                  <tr className="bg-slate-100 font-bold border-t border-slate-300">
                    <td colSpan={3} className="p-1 text-right font-sans uppercase text-[8.5px]">Total aportaciones:</td>
                    <td className="p-1 text-right font-black text-slate-950 font-mono text-[9.5px]">
                      {fmtNumber(payroll.trabajador.totalAportaciones, 2)}
                    </td>
                    <td colSpan={2} className="p-1 bg-slate-50/60"></td>
                  </tr>

                  {/* IRPF (Clave A) */}
                  <tr className="border-t-2 border-black bg-white">
                    <td className="p-1 font-sans font-black text-slate-900">IRPF ( Clave A )</td>
                    <td className="p-1 text-right font-bold">{fmtNumber(payroll.retenciones.baseIRPF, 2)}</td>
                    <td className="p-1 text-center font-bold">{fmtNumber(payroll.retenciones.porcentajeIRPF, 2)}</td>
                    <td className="p-1 text-right font-black text-slate-950">{fmtNumber(payroll.retenciones.cuotaIRPF, 2)}</td>
                    <td colSpan={2} className="p-1 text-right font-sans pr-2">
                      <span className="text-[8px] uppercase font-bold text-slate-600">Total Retenciones: </span>
                      <strong className="font-mono text-[9.5px] text-slate-950 ml-1">{fmtNumber(payroll.retenciones.totalRetenciones, 2)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ================= TOTALES BLOCK (A, B, LÍQUIDO) ================= */}
          <div className="grid grid-cols-12 gap-2 mt-2">
            
            {/* Forma de pago & Localidad */}
            <div className="col-span-12 sm:col-span-7 flex flex-col justify-between py-1">
              <div>
                <span className="font-bold text-[9px] text-slate-700">Forma de Pago :</span>
                <div className="font-mono font-semibold text-[9.5px] text-slate-800 tracking-tight mt-0.5">
                  Transf.: {worker.iban}
                </div>
              </div>
              <div className="text-center font-medium text-slate-700 pt-2 text-[9.5px]">
                {payroll.meta.fechaEmision}
              </div>
            </div>

            {/* Totales Card matching the exact PDF boxes */}
            <div className="col-span-12 sm:col-span-5 border border-black rounded overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-black border-b border-black text-center">
                <div className="p-1 bg-slate-100/80">
                  <span className="block text-[8px] font-black uppercase tracking-tight text-slate-700">
                    B. TOTAL A DEDUCIR
                  </span>
                  <span className="block font-mono font-black text-[12px] text-slate-950 pt-0.5">
                    {fmtNumber(payroll.totales.totalDeducirB, 2)}
                  </span>
                </div>
                <div className="p-1 bg-slate-100/80">
                  <span className="block text-[8px] font-black uppercase tracking-tight text-slate-700">
                    A. TOTAL DEVENGADO
                  </span>
                  <span className="block font-mono font-black text-[12px] text-slate-950 pt-0.5">
                    {fmtNumber(payroll.totales.totalDevengadoA, 2)}
                  </span>
                </div>
              </div>

              {/* LÍQUIDO A PERCIBIR (A - B) */}
              <div className="p-1.5 text-center bg-white">
                <span className="block text-[8.5px] font-black uppercase tracking-wider text-slate-800">
                  LÍQUIDO A PERCIBIR (A - B)
                </span>
                <span className="block font-mono font-black text-[16px] text-emerald-800 pt-0.5 tracking-tight">
                  {fmtNumber(payroll.totales.liquidoPercibir, 2)} €
                </span>
              </div>
            </div>

          </div>

          {/* ================= SIGNATURE & COMPANY SEAL BLOCK ================= */}
          <div className="grid grid-cols-2 gap-4 mt-3 pt-2 border-t border-black text-[9px]">
            
            {/* Left: Firma de la Empresa + Official Seal */}
            <div className="border border-black rounded p-2 min-h-[90px] flex flex-col justify-between relative bg-white">
              <span className="font-bold uppercase tracking-wider text-[8.5px] text-slate-800">
                FIRMA DE LA EMPRESA
              </span>

              {/* Official Stamp of Gasteiz de Vigilancia (exact replica from PDF) */}
              <div className="flex items-center justify-center py-1">
                <div className="border-2 border-blue-900/80 rounded-full px-3 py-1 text-center transform -rotate-3 text-blue-900 bg-blue-50/30 shadow-xs max-w-[200px]">
                  <div className="text-[7.5px] font-black uppercase tracking-wider leading-none">
                    GASTEIZ DE VIGILANCIA
                  </div>
                  <div className="text-[14px] font-black tracking-widest leading-tight my-0.5 text-blue-950">
                    GV
                  </div>
                  <div className="text-[7px] font-bold font-mono tracking-wider leading-none">
                    CIF: {company.cif}
                  </div>
                </div>
              </div>

              <div className="text-right text-[7.5px] text-slate-400">
                P.O. Departamento de Personal
              </div>
            </div>

            {/* Right: Recibí (Trabajador) */}
            <div className="border border-black rounded p-2 min-h-[90px] flex flex-col justify-between bg-white">
              <span className="font-bold uppercase tracking-wider text-[8.5px] text-slate-800">
                RECIBÍ
              </span>
              <div className="text-center text-slate-400 italic text-[8.5px] py-4">
                (Firma del trabajador/a o acuse telemático)
              </div>
              <div className="text-[7.5px] text-slate-500 font-mono">
                {worker.nombreCompleto} • NIF: {worker.nif}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
