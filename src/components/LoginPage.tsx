import React, { useState } from 'react';
import {
  Shield,
  Lock,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
  LogOut,
  RefreshCw,
  KeyRound,
  ArrowRight,
} from 'lucide-react';
import { GasteizLogo } from '../constants/logo';
import { googleSignIn, logout } from '../services/calendarService';
import {
  verifyUserInDbCuadrantes,
  extractSpreadsheetId,
  getSavedSpreadsheetId,
  saveSpreadsheetId,
  VerificationResult,
  UserRole,
} from '../services/authSheetService';
import { User } from 'firebase/auth';

interface LoginPageProps {
  onLoginSuccess: (user: User, role: UserRole, sheetTitle?: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authStep, setAuthStep] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cachedToken, setCachedToken] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [manualSheetInput, setManualSheetInput] = useState<string>(() => getSavedSpreadsheetId());
  const [showManualInput, setShowManualInput] = useState(false);

  const handleGoogleLogin = async () => {
    setIsAuthenticating(true);
    setVerificationResult(null);
    setAuthStep('Conectando con Google...');

    try {
      const signInResult = await googleSignIn();
      if (!signInResult || !signInResult.user || !signInResult.accessToken) {
        throw new Error('No se completó la autenticación con Google.');
      }

      const { user, accessToken } = signInResult;
      setCurrentUser(user);
      setCachedToken(accessToken);

      setAuthStep('Verificando usuario en DB_cuadrantes...');

      const result = await verifyUserInDbCuadrantes(
        user.email || '',
        accessToken,
        manualSheetInput
      );

      setVerificationResult(result);

      if (result.authorized && result.role) {
        setAuthStep('Acceso concedido. Entrando...');
        setTimeout(() => {
          onLoginSuccess(user, result.role as UserRole, result.spreadsheetTitle);
        }, 600);
      } else {
        if (result.error === 'NO_SPREADSHEET_FOUND' || result.error === 'SHEET_READ_ERROR') {
          setShowManualInput(true);
        }
      }
    } catch (err: any) {
      console.error('Error durante el inicio de sesión:', err);
      setVerificationResult({
        authorized: false,
        role: null,
        email: currentUser?.email || '',
        error: 'AUTH_FAILED',
        errorMessage:
          err?.message || 'Error al iniciar sesión con Google o denegación de permisos.',
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleManualSheetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSheetInput.trim() || !currentUser || !cachedToken) return;

    setIsAuthenticating(true);
    setAuthStep('Consultando hoja de cálculo indicada...');

    try {
      saveSpreadsheetId(manualSheetInput);
      const result = await verifyUserInDbCuadrantes(
        currentUser.email || '',
        cachedToken,
        manualSheetInput
      );

      setVerificationResult(result);

      if (result.authorized && result.role) {
        setAuthStep('Acceso concedido. Entrando...');
        setTimeout(() => {
          onLoginSuccess(currentUser, result.role as UserRole, result.spreadsheetTitle);
        }, 600);
      }
    } catch (err: any) {
      setVerificationResult({
        authorized: false,
        role: null,
        email: currentUser.email || '',
        error: 'SHEET_READ_ERROR',
        errorMessage: err?.message || 'No se pudo conectar a la hoja de cálculo indicada.',
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSwitchAccount = async () => {
    await logout();
    setCurrentUser(null);
    setCachedToken(null);
    setVerificationResult(null);
    setShowManualInput(false);
    handleGoogleLogin();
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    setCachedToken(null);
    setVerificationResult(null);
    setShowManualInput(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100 relative overflow-hidden select-none font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Brand Emblem & Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl mb-3 flex items-center justify-center">
            <GasteizLogo className="w-16 h-16 sm:w-20 sm:h-20" />
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
            GASTEIZ DE VIGILANCIA
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
            Sistema Oficial de Gestión de Cuadrantes y Nóminas
          </p>

          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
            <span>Seguridad Privada</span>
            <span>·</span>
            <span>Control de Acceso</span>
            <span>·</span>
            <span>Convenio Colectivo</span>
          </div>
        </div>

        {/* Card */}
        <div className="w-full bg-slate-900/95 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {/* Default / Initial State */}
          {!currentUser && !verificationResult && (
            <div className="flex flex-col items-center text-center space-y-5">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                <Lock className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Identificación Requerida
                </h2>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Acceso exclusivo para personal autorizado. Inicia sesión con tu cuenta de Google para verificar tus permisos en el registro oficial.
                </p>
              </div>

              {/* Official Google Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isAuthenticating}
                className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm transition shadow-md active:scale-98 cursor-pointer disabled:opacity-60"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
                    <span>{authStep || 'Conectando...'}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continuar con Google (Gmail)</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-center gap-1.5 flex-wrap">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Base de datos vinculada:</span>
                <span className="font-semibold text-slate-200">DB_cuadrantes</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-emerald-300 rounded border border-slate-700">Hoja 1</span>
              </div>
            </div>
          )}

          {/* Authenticating Spinner */}
          {isAuthenticating && (
            <div className="flex flex-col items-center text-center py-6 space-y-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <div className="text-sm font-semibold text-white">{authStep}</div>
              <p className="text-xs text-slate-400">
                Verificando la autorización en Google Sheets...
              </p>
            </div>
          )}

          {/* Result: User Not Authorized */}
          {!isAuthenticating && verificationResult && verificationResult.error === 'USER_NOT_AUTHORIZED' && (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h2 className="text-lg font-bold text-white">Acceso Denegado</h2>
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30">
                  Usuario no registrado
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 w-full text-left space-y-2">
                <div className="text-xs text-slate-400">
                  <span>Cuenta conectada:</span>
                  <div className="font-mono text-sm font-semibold text-white truncate">
                    {verificationResult.email}
                  </div>
                </div>

                <p className="text-xs text-slate-400 border-t border-slate-800/80 pt-2 leading-relaxed">
                  Este correo no figura en la columna <strong className="text-slate-300">usuarios</strong> de la hoja de cálculo <strong className="text-slate-300">DB_cuadrantes</strong>. Contacta con el administrador del servicio para que registre tu cuenta.
                </p>
              </div>

              <div className="flex flex-col w-full gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Probar con otra cuenta de Google</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </div>
          )}

          {/* Result: Spreadsheet Not Found or Manual ID Configuration */}
          {!isAuthenticating && verificationResult && (verificationResult.error === 'NO_SPREADSHEET_FOUND' || verificationResult.error === 'SHEET_READ_ERROR' || showManualInput) && (
            <div className="flex flex-col space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 shrink-0">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Conectar con DB_cuadrantes
                  </h3>
                  <p className="text-xs text-slate-400">
                    No se localizó automáticamente la hoja en Google Drive.
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                Pega a continuación el enlace completo o el ID de tu Google Sheet llamado <strong>DB_cuadrantes</strong> (debe tener las columnas <code>usuarios</code> y <code>roles</code>):
              </p>

              <form onSubmit={handleManualSheetSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Enlace o ID de Google Sheets:
                  </label>
                  <input
                    type="text"
                    value={manualSheetInput}
                    onChange={e => setManualSheetInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition font-mono"
                  />
                </div>

                {verificationResult.errorMessage && (
                  <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{verificationResult.errorMessage}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={!manualSheetInput.trim() || isAuthenticating}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <span>Verificar permisos y entrar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
                    title="Cerrar sesión"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Success State transition */}
          {!isAuthenticating && verificationResult && verificationResult.authorized && (
            <div className="flex flex-col items-center text-center py-4 space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 animate-in zoom-in-75" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">¡Acceso Verificado!</h3>
                <p className="text-xs text-emerald-400 font-semibold">
                  Rol: {verificationResult.role === 'admin' ? 'Administrador' : 'Usuario'}
                </p>
              </div>
              <p className="text-xs text-slate-400">Entrando a CuadrantePro...</p>
            </div>
          )}
        </div>

        {/* Footnote */}
        <div className="mt-6 text-center text-xs text-slate-500 space-y-1">
          <p>Gasteiz de Vigilancia S.A. — Acceso Restringido</p>
          <p className="text-[11px] text-slate-400">
            Control horario según Convenio Colectivo Estatal de Empresas de Seguridad
          </p>
        </div>
      </div>
    </div>
  );
};
