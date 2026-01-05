import * as React from "react"
import { createContext, useContext, useState, useCallback } from "react"
import { X, CheckCircle, AlertCircle, Info } from "lucide-react"

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = "default") => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((message) => addToast(message, "default"), [addToast])
  toast.success = useCallback((message) => addToast(message, "success"), [addToast])
  toast.error = useCallback((message) => addToast(message, "error"), [addToast])
  toast.info = useCallback((message) => addToast(message, "info"), [addToast])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-md shadow-lg border
              animate-in slide-in-from-right-full duration-300
              ${t.type === "success" ? "bg-emerald-500 text-white border-emerald-600" : ""}
              ${t.type === "error" ? "bg-red-500 text-white border-red-600" : ""}
              ${t.type === "info" ? "bg-blue-500 text-white border-blue-600" : ""}
              ${t.type === "default" ? "bg-card text-card-foreground border-border" : ""}
            `}
          >
            {t.type === "success" && <CheckCircle className="h-5 w-5 flex-shrink-0" />}
            {t.type === "error" && <AlertCircle className="h-5 w-5 flex-shrink-0" />}
            {t.type === "info" && <Info className="h-5 w-5 flex-shrink-0" />}
            <span className="flex-1 text-sm font-medium">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="flex-shrink-0 hover:opacity-70 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within ToastProvider")
  }
  return context
}

// Exportar toast global para uso fora de componentes React
let globalToast = null

export function setGlobalToast(toastFn) {
  globalToast = toastFn
}

export const toast = (message) => globalToast?.(message)
toast.success = (message) => globalToast?.success?.(message)
toast.error = (message) => globalToast?.error?.(message)
toast.info = (message) => globalToast?.info?.(message)
