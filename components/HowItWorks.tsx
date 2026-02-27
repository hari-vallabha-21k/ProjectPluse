const steps = [
    {
        number: "01",
        title: "Create Your Workspace",
        description:
            "Sign up and create a workspace for your team in under a minute. Invite members via email and assign roles — Manager or Member.",
        icon: "workspaces",
    },
    {
        number: "02",
        title: "Set Up Projects & Tasks",
        description:
            "Create projects, break them down into actionable tasks, assign team members, set priorities, and define deadlines.",
        icon: "checklist",
    },
    {
        number: "03",
        title: "Collaborate & Track",
        description:
            "Chat with your team, update task statuses in real-time, view progress on the dashboard, and use the calendar to stay on schedule.",
        icon: "monitoring",
    },
    {
        number: "04",
        title: "Deliver on Time",
        description:
            "With clear visibility into every project, your team works more efficiently and consistently meets deadlines.",
        icon: "celebration",
    },
];

export default function HowItWorks() {
    return (
        <section className="py-24 bg-white dark:bg-[#101122]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-20 text-center max-w-3xl mx-auto">
                    <div className="inline-flex items-center gap-2 bg-primary/10 dark:bg-primary/20 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-6">
                        <span className="material-symbols-outlined text-[18px]">
                            route
                        </span>
                        Simple setup
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight sm:text-5xl mb-6">
                        Up and running in minutes
                    </h2>
                    <p className="text-lg text-slate-600 dark:text-slate-400">
                        Getting started with ProjectPulse is fast and straightforward. No
                        complicated onboarding — just create, invite, and start managing.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {steps.map((step, idx) => (
                        <div key={step.number} className="relative">
                            {/* Connector line */}
                            {idx < steps.length - 1 && (
                                <div className="hidden lg:block absolute top-10 left-[calc(50%+40px)] w-[calc(100%-40px)] h-px bg-gradient-to-r from-primary/30 to-primary/5 dark:from-primary/40 dark:to-primary/10"></div>
                            )}
                            <div className="text-center">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 dark:bg-primary/20 rounded-3xl mb-6 relative">
                                    <span className="material-symbols-outlined text-primary text-3xl">
                                        {step.icon}
                                    </span>
                                    <span className="absolute -top-2 -right-2 w-7 h-7 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">
                                        {step.number}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                                    {step.title}
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {step.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
