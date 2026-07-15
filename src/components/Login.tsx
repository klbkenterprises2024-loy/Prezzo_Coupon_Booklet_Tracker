/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { LogIn, Pizza, ShieldAlert, KeyRound } from "lucide-react";
import { motion } from "motion/react";

interface LoginProps {
  onLogin: (code: string) => void;
  onGoogleLogin?: () => void;
  isLoggingIn: boolean;
  error: string | null;
  unauthorizedEmail?: string | null;
  onLogout?: () => void;
}

export default function Login({
  onLogin,
  onGoogleLogin,
  isLoggingIn,
  error,
  unauthorizedEmail,
  onLogout
}: LoginProps) {
  const [code, setCode] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      onLogin(code);
    }
  };
  return (
    <div className="min-h-screen bg-[#FAF6F0] text-stone-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Decorative pizza slices background elements */}
      <div className="absolute top-[-100px] left-[-100px] w-80 h-80 opacity-[0.03] pointer-events-none rotate-45">
        <Pizza size={320} className="text-[#991B1B]" />
      </div>
      <div className="absolute bottom-[-100px] right-[-100px] w-80 h-80 opacity-[0.03] pointer-events-none -rotate-12">
        <Pizza size={320} className="text-[#991B1B]" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center">
          <motion.div
            initial={{ scale: 0.8, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-20 h-20 bg-[#991B1B]/10 rounded-full flex items-center justify-center shadow-lg border-2 border-[#991B1B]/20 text-[#991B1B]"
          >
            <Pizza size={44} />
          </motion.div>
        </div>
        <h2 className="mt-6 text-center text-4.5xl font-serif font-bold text-[#991B1B] tracking-tight">
          PREZZO PIZZERIA
        </h2>
        <p className="mt-2 text-center text-[10px] font-bold text-stone-500 uppercase tracking-[0.25em] font-sans">
          Coupon Booklet Tracker
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-stone-200 sm:px-10"
        >
          {unauthorizedEmail ? (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <ShieldAlert className="h-6 w-6 text-red-700" />
              </div>
              <h3 className="text-lg font-serif font-bold text-stone-900 mb-2">Access Denied</h3>
              <p className="text-sm text-stone-600 mb-4">
                Your email <strong className="text-stone-950 font-semibold">{unauthorizedEmail}</strong> is not registered as an authorized staff member.
              </p>
              <div className="rounded-lg bg-stone-50 p-3.5 mb-6 text-xs text-left border border-stone-200 text-stone-600 leading-relaxed">
                <strong className="text-[#991B1B]">Note:</strong> Please ask your administrator (Loy Rego) to add your email to the <strong>Staff</strong> sheet in the Google spreadsheet.
              </div>
              <button
                onClick={onLogout}
                className="w-full inline-flex justify-center py-2.5 px-4 border border-stone-300 rounded-xl shadow-sm text-sm font-semibold text-stone-700 bg-white hover:bg-stone-50 hover:text-stone-900 transition-colors cursor-pointer"
              >
                Sign out & Try Another Account
              </button>
            </div>
          ) : (
            <div>
              <p className="text-center text-sm text-stone-600 mb-6 leading-relaxed font-sans">
                Welcome to the Prezzo Coupon Portal. Enter your authorized staff pin code or email to access booklets, track redemptions, and log sales.
              </p>

              {error && (
                <div className="mb-4 rounded-xl bg-red-50 p-4 border border-red-200">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <ShieldAlert className="h-5 w-5 text-red-700" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-bold text-red-800">Authentication Error</h3>
                      <div className="mt-1 text-xs text-red-700 leading-relaxed">{error}</div>
                    </div>
                  </div>
                </div>
              )}

              {onGoogleLogin && (
                <div className="mb-5">
                  <button
                    type="button"
                    onClick={onGoogleLogin}
                    disabled={isLoggingIn}
                    className="w-full flex items-center justify-center space-x-3 py-3 px-4 border border-stone-200 rounded-xl shadow-md text-sm font-semibold text-stone-700 bg-white hover:bg-stone-50 transition-all duration-200 cursor-pointer disabled:opacity-50"
                  >
                    <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.583-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.103C18.23 2.012 15.42 1 12.24 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.986 0-.745-.078-1.31-.176-1.879l-10.617-.33z"/>
                    </svg>
                    <span>Sign in with Google</span>
                  </button>

                  <div className="relative flex py-4 items-center">
                    <div className="flex-grow border-t border-stone-200/60"></div>
                    <span className="flex-shrink mx-4 text-stone-400 text-[10px] font-mono uppercase tracking-wider">or login with code</span>
                    <div className="flex-grow border-t border-stone-200/60"></div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="login-code" className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2 font-mono">
                    Staff Passcode or Email
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                      <KeyRound size={16} />
                    </span>
                    <input
                      id="login-code"
                      type="password"
                      placeholder="Enter code (e.g. 1973) or email"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      disabled={isLoggingIn}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-stone-200 rounded-xl text-stone-900 text-sm font-mono bg-stone-50 focus:outline-none focus:ring-1 focus:ring-[#991B1B] focus:border-[#991B1B] transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn || !code.trim()}
                  className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-[#991B1B] hover:bg-[#7F1D1D] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoggingIn ? (
                    <div className="flex items-center space-x-2">
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <LogIn size={16} />
                      <span>Verify Code</span>
                    </div>
                  )}
                </button>
              </form>

              <div className="mt-6 border-t border-stone-100 pt-5 text-center">
                <p className="text-[10px] text-stone-500">
                  * Dynamic staff registered in the Roster tab can use their registered emails directly to log in.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-stone-100 text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 font-mono">
                  Authorized restaurant staff access only
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
