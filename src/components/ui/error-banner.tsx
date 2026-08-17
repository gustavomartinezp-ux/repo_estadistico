import { motion } from "framer-motion";
import { AlertTriangle, RotateCw } from "lucide-react";

export function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="overflow-hidden"
    >
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <p className="flex-1">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm transition-all duration-200 hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
        >
          <RotateCw className="h-3.5 w-3.5" />
          Reintentar
        </button>
      </div>
    </motion.div>
  );
}
