const reasons = [
    {
        icon: "speed",
        title: "Lightning Fast",
        description:
            "Built on modern web technologies for instant load times and smooth interactions. No lag, no waiting.",
    },
    {
        icon: "devices",
        title: "Works Everywhere",
        description:
            "Fully responsive design that works beautifully on desktop, tablet, and mobile. Manage projects from anywhere.",
    },
    {
        icon: "lock",
        title: "Secure by Default",
        description:
            "End-to-end encryption, role-based access control, and secure authentication keep your data protected.",
    },
    {
        icon: "palette",
        title: "Dark & Light Themes",
        description:
            "Switch between elegant dark and light modes. Work comfortably at any time of day.",
    },
];

export default function WhyChooseUs() {
    return (
        <section className="py-24 bg-slate-50 dark:bg-[#0d0e1f]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Left Content */}
                    <div>
                        <div className="inline-flex items-center gap-2 bg-primary/10 dark:bg-primary/20 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-6">
                            <span className="material-symbols-outlined text-[18px]">
                                thumb_up
                            </span>
                            Why ProjectPulse
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight sm:text-5xl mb-6">
                            Built different. Built better.
                        </h2>
                        <p className="text-lg text-slate-600 dark:text-slate-400 mb-10">
                            We focused on what matters most — simplicity, speed, and a
                            delightful experience for every team member. No bloat, no
                            complexity.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {reasons.map((r) => (
                                <div key={r.title} className="flex gap-4">
                                    <div className="flex-shrink-0 w-11 h-11 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-primary text-xl">
                                            {r.icon}
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                                            {r.title}
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                            {r.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right — CTA Card */}
                    <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 dark:to-transparent rounded-3xl border border-primary/20 dark:border-primary/30 p-10 lg:p-14">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4">
                            Ready to boost your team&apos;s productivity?
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                            Join teams already using ProjectPulse to deliver projects faster
                            and collaborate more effectively. Free to get started — no credit
                            card required.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <a
                                href="/signup"
                                className="bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/25 text-center"
                            >
                                Start for Free
                            </a>
                            <a
                                href="#contact"
                                className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-8 py-4 rounded-xl text-sm font-bold transition-all text-center"
                            >
                                Contact Us
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
