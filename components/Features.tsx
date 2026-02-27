const features = [
  {
    icon: "folder_open",
    title: "Project Creation & Organization",
    description:
      "Create projects in seconds, organize them with labels and priorities, and keep everything structured. Set deadlines, milestones, and track deliverables from a single dashboard.",
  },
  {
    icon: "group",
    title: "Team & Task Assignment",
    description:
      "Invite team members, assign tasks based on expertise, and balance workloads. Roles like Manager and Member ensure the right people have the right level of access.",
  },
  {
    icon: "trending_up",
    title: "Real-Time Progress Tracking",
    description:
      "Visual status boards and progress bars let you see exactly where every project stands. Never miss a deadline with real-time updates and status indicators.",
  },
  {
    icon: "calendar_month",
    title: "Built-in Calendar View",
    description:
      "Plan sprints and schedule tasks using the integrated calendar. See upcoming deadlines, team availability, and project timelines at a glance.",
  },
  {
    icon: "chat",
    title: "Team Chat & Collaboration",
    description:
      "Communicate with your team directly inside the platform. Discuss tasks, share updates, and keep all project conversations in one place.",
  },
  {
    icon: "shield",
    title: "Secure & Role-Based Access",
    description:
      "Enterprise-grade security with role-based permissions. Managers control project settings while team members focus on their assigned tasks.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-slate-50 dark:bg-[#0d0e1f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-20 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 dark:bg-primary/20 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <span className="material-symbols-outlined text-[18px]">
              star
            </span>
            Everything you need
          </div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight sm:text-5xl mb-6">
            Powerful features for every team
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            ProjectPulse brings together project management, task tracking, team
            collaboration, and calendar scheduling — all in one beautifully
            designed platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f) => (
            <div
              key={f.title}
              className="group bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-8 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex items-center justify-center w-14 h-14 bg-primary/10 dark:bg-primary/20 rounded-2xl mb-6 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <span className="material-symbols-outlined text-primary text-2xl group-hover:text-white transition-colors duration-300">
                  {f.icon}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                {f.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
