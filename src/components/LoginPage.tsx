import React, { useState } from 'react';
import {
  Shield,
  Lock,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
  LogOut,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  ExternalLink,
  Copy,
  Check,
  Globe,
} from 'lucide-react';
import { GasteizLogo } from '../constants/logo';
import { googleSignIn, logout, signInWithGsi } from '../services/calendarService';
import {
  verifyUserInDbCuadrantes,
  getSavedSpreadsheetId,
  saveSpreadsheetId,
  DEFAULT_DB_SPREADSHEET_ID,
  DEFAULT_DB_SHEET_TAB,
  VerificationResult,
  UserRole,
} from '../services/authSheetService';
import { User } from 'firebase/auth';

interface LoginPageProps {
  onLoginSuccess: (user: any, role: UserRole, sheetTitle?: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authStep, setAuthStep] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [cachedToken, setCachedToken] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [manualSheetInput, setManualSheetInput] = useState<string>(() => getSavedSpreadsheetId() || DEFAULT_DB_SPREADSHEET_ID);
  const [showManualInput, setShowManualInput] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDomain(text);
    setTimeout(() => {
      setCopiedDomain(null);
    }, 2500);
  };

  const handleGoogleLogin = async () => {
    setIsAuthenticating(true);
    setVerificationResult(null);
    setAuthStep('Abriendo ventana de inicio de sesión de Google...');

    try {
      const signInResult = await googleSignIn();
      if (!signInResult || !signInResult.user || !signInResult.accessToken) {
        throw new Error('No se completó la autenticación con Google.');
      }

      const { user, accessToken } = signInResult;
      setCurrentUser(user);
      setCachedToken(accessToken);

      setAuthStep('Consultando permisos en DB_cuadrantes...');

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
        }, 500);
      } else {
        if (result.error === 'NO_SPREADSHEET_FOUND' || result.error === 'SHEET_READ_ERROR') {
          setShowManualInput(true);
        }
      }
    } catch (err: any) {
      console.error('Error durante el inicio de sesión:', err);
      let errorMsg = err?.message || 'Error al iniciar sesión con Google.';
      const isUnauthorizedDomain =
        err?.code === 'auth/unauthorized-domain' ||
        err?.message?.includes('unauthorized-domain');

      if (isUnauthorizedDomain) {
        setVerificationResult({
          authorized: false,
          role: null,
          email: '',
          error: 'UNAUTHORIZED_DOMAIN',
          errorMessage: 'El dominio de la aplicación no está en la lista de dominios autorizados de Firebase Console.',
        });
        return;
      }

      if (err?.code === 'auth/popup-closed-by-user') {
        errorMsg = 'Se cerró la ventana de inicio de sesión de Google antes de completar los permisos. Pulsa de nuevo en Continuar para permitir el acceso.';
      } else if (err?.code === 'auth/cancelled-popup-request') {
        errorMsg = 'Se canceló la solicitud de inicio de sesión. Inténtalo de nuevo.';
      } else if (err?.message?.includes('403') || err?.message?.includes('permission')) {
        errorMsg = 'Google no concedió permisos de lectura sobre la hoja de cálculo. Asegúrate de marcar todas las casillas de permisos solicitadas.';
      }

      setVerificationResult({
        authorized: false,
        role: null,
        email: currentUser?.email || '',
        error: 'AUTH_FAILED',
        errorMessage: errorMsg,
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDirectGsiLogin = async () => {
    setIsAuthenticating(true);
    setVerificationResult(null);
    setAuthStep('Conectando directamente con Google Identity Services...');

    try {
      const signInResult = await signInWithGsi();
      if (!signInResult || !signInResult.accessToken) {
        throw new Error('No se completó la autenticación con Google.');
      }

      const { user, accessToken } = signInResult;
      setCurrentUser(user);
      setCachedToken(accessToken);

      setAuthStep('Consultando permisos en DB_cuadrantes...');

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
        }, 500);
      } else {
        if (result.error === 'NO_SPREADSHEET_FOUND' || result.error === 'SHEET_READ_ERROR') {
          setShowManualInput(true);
        }
      }
    } catch (err: any) {
      console.error('Error con GSI:', err);
      setVerificationResult({
        authorized: false,
        role: null,
        email: currentUser?.email || '',
        error: 'AUTH_FAILED',
        errorMessage: err?.message || 'No se pudo completar el acceso con Google Identity Services.',
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
        }, 500);
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

  const handleResetAndRetry = async () => {
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
          {/* 1. Authenticating Spinner */}
          {isAuthenticating && (
            <div className="flex flex-col items-center text-center py-6 space-y-4">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <div className="space-y-1">
                <div className="text-sm font-bold text-white">{authStep}</div>
                <p className="text-xs text-slate-400">
                  Por favor, responde a la ventana emergente de Google para conceder los permisos.
                </p>
              </div>
            </div>
          )}

          {/* 2. Success State transition */}
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

          {/* 3. User Not Authorized in Sheet */}
          {!isAuthenticating && verificationResult && verificationResult.error === 'USER_NOT_AUTHORIZED' && (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                <ShieldAlert className="w-8 h-8" />
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
                  onClick={handleResetAndRetry}
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

          {/* 4. Sheet Not Found or Sheet Read Error */}
          {!isAuthenticating && verificationResult && (verificationResult.error === 'NO_SPREADSHEET_FOUND' || verificationResult.error === 'SHEET_READ_ERROR' || showManualInput) && (
            <div className="flex flex-col space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 shrink-0">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Verificar Hoja DB_cuadrantes
                  </h3>
                  <p className="text-xs text-slate-400">
                    Comprueba el ID o enlace de la hoja de cálculo.
                  </p>
                </div>
              </div>

              {verificationResult.errorMessage && (
                <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl leading-relaxed flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{verificationResult.errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleManualSheetSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ID o Enlace de Google Sheets:
                  </label>
                  <input
                    type="text"
                    value={manualSheetInput}
                    onChange={e => setManualSheetInput(e.target.value)}
                    placeholder="1N6al3C2O9Sla2KuyPmBvq92duqGbq2ptTydUwrK68P0"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Pestaña vinculada por defecto: <strong>{DEFAULT_DB_SHEET_TAB}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={!manualSheetInput.trim() || isAuthenticating}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <span>Reintentar verificación</span>
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

          {/* 5. Auth Failed Error Banner (when user closes popup or permissions rejected) */}
          {!isAuthenticating && verificationResult && verificationResult.error === 'AUTH_FAILED' && (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Permisos no completados</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  {verificationResult.errorMessage || 'Es necesario conceder los permisos de Google para poder verificar tu acceso con la hoja de cálculo.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm transition shadow-md cursor-pointer"
              >
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
                <span>Volver a intentar con Google</span>
              </button>
            </div>
          )}

          {/* 6. Unauthorized Domain in Firebase */}
          {!isAuthenticating && verificationResult && verificationResult.error === 'UNAUTHORIZED_DOMAIN' && (
            <div className="flex flex-col space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 shrink-0">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Dominio pendiente de autorizar
                  </h3>
                  <p className="text-[11px] text-emerald-400 font-semibold">
                    En Google Sheets NO necesitas ningún AppScript
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs">
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Tu hoja <strong className="text-white">DB_cuadrantes</strong> está perfecta y no requiere macros ni scripts. Este aviso se debe a que Firebase Authentication exige registrar los dominios web autorizados de la aplicación.
                </p>

                <div className="space-y-1 pt-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    1. Dominio actual para autorizar:
                  </label>
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-[11px] text-blue-300 justify-between">
                    <span className="truncate">{currentHostname || 'Dominio actual'}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(currentHostname)}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-sans transition shrink-0 cursor-pointer"
                    >
                      {copiedDomain === currentHostname ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedDomain === currentHostname ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    2. Dominio de tu GitHub Pages:
                  </label>
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-[11px] text-emerald-300 justify-between">
                    <span className="truncate">micajadecasa.github.io</span>
                    <button
                      type="button"
                      onClick={() => handleCopyText('micajadecasa.github.io')}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-sans transition shrink-0 cursor-pointer"
                    >
                      {copiedDomain === 'micajadecasa.github.io' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedDomain === 'micajadecasa.github.io' ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-200">Pasos en Firebase Console (solo 1 vez):</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-400 pl-1 text-[11px]">
                    <li>Abre el enlace de Firebase Console abajo.</li>
                    <li>En <strong>Dominios autorizados</strong>, pulsa <strong>Añadir dominio</strong>.</li>
                    <li>Pega el dominio copiado y haz clic en <strong>Guardar</strong>.</li>
                  </ol>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <a
                  href="https://console.firebase.google.com/project/gen-lang-client-0728322381/authentication/settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-md cursor-pointer"
                >
                  <span>Abrir Configuración en Firebase Console</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reintentar con Google</span>
                </button>

                <button
                  type="button"
                  onClick={handleDirectGsiLogin}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition cursor-pointer"
                >
                  <span>Probar conexión directa de Google (GSI)</span>
                </button>
              </div>
            </div>
          )}

          {/* 7. Default / Ready to Sign In State */}
          {!isAuthenticating && (!verificationResult || (!verificationResult.authorized && verificationResult.error !== 'USER_NOT_AUTHORIZED' && verificationResult.error !== 'NO_SPREADSHEET_FOUND' && verificationResult.error !== 'SHEET_READ_ERROR' && verificationResult.error !== 'AUTH_FAILED' && verificationResult.error !== 'UNAUTHORIZED_DOMAIN')) && (
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
              </button>

              <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-center gap-1.5 flex-wrap">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Base de datos:</span>
                <span className="font-semibold text-slate-200">DB_cuadrantes</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-emerald-300 rounded border border-slate-700">Hoja 1</span>
              </div>
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
