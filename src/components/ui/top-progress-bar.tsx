/** Barra fina de progreso indeterminado, para refetch en segundo plano (ya hay datos en pantalla). */
export function TopProgressBar({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="fixed top-0 right-0 left-0 z-50 h-0.5 overflow-hidden bg-primary-100 lg:left-60">
      <div className="h-full w-1/3 animate-[progress-slide_1.1s_ease-in-out_infinite] bg-gradient-to-r from-primary-500 via-accent-400 to-primary-500" />
      <style>{`
        @keyframes progress-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
