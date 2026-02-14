const features = [
  {
    step: 1,
    title: "Project Creation",
    description: "Create and organize projects easily.",
  },
  {
    step: 2,
    title: "Task Assignment",
    description: "Assign tasks and manage team responsibilities.",
  },
  {
    step: 3,
    title: "Progress Tracking",
    description: "Monitor project status and deadlines.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-slate-50 dark:bg-[#0d0e1f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-20 text-center max-w-3xl mx-auto">
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight sm:text-5xl mb-6">
            Experience the flow
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            See how ProjectPulse handles every stage of your project lifecycle
            with a unified, intuitive interface.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {features.map((f) => (
            <div key={f.step} className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-primary font-bold text-xl shadow-sm">
                {f.step}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                  {f.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
