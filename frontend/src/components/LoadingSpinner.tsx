export default function LoadingSpinner({ modal = false }: { modal?: boolean }) {
  return (
    <div
      className={
        modal
          ? "flex justify-center"
          : "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      }
    >
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <svg
          className="h-8 w-8 animate-spin text-brand-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      </div>
    </div>
  );
}
