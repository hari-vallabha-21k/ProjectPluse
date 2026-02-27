interface MetricCardProps {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  badge: string;
  badgeType: "positive" | "neutral";
}

export default function MetricCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  badge,
  badgeType,
}: MetricCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 ${iconBg} ${iconColor} rounded-lg`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <span
          className={`text-xs font-bold px-2 py-1 rounded-full ${
            badgeType === "positive"
              ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
              : "text-slate-400 bg-slate-50 dark:bg-slate-800"
          }`}
        >
          {badge}
        </span>
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <h3 className="text-2xl font-bold mt-1">{value}</h3>
    </div>
  );
}