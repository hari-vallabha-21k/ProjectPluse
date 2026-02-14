"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Contact } from "@/types/contact";

export default function ContactForm() {
  const [form, setForm] = useState<Omit<Contact, "id" | "created_at">>({
    name: "",
    email: "",
    message: "",
  });
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    const { error } = await supabase.from("contacts").insert([form]);

    if (error) {
      console.error(error);
      setStatus("error");
    } else {
      setStatus("success");
      setForm({ name: "", email: "", message: "" });
    }
  };

  return (
    <section id="contact" className="py-24 bg-slate-50 border-t border-slate-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">
            Request a Demo
          </h2>
          <p className="text-lg text-slate-600">
            See how ProjectPulse can revolutionize your productivity.
          </p>
        </div>

        <div className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="John Doe"
                  className="w-full px-5 py-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-primary bg-slate-50 transition-all outline-none text-sm text-slate-900"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700">
                  Work Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="john@company.com"
                  className="w-full px-5 py-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-primary bg-slate-50 transition-all outline-none text-sm text-slate-900"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">
                Message
              </label>
              <textarea
                name="message"
                rows={4}
                value={form.message}
                onChange={handleChange}
                required
                placeholder="Tell us about your team size..."
                className="w-full px-5 py-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-primary bg-slate-50 transition-all outline-none resize-none text-sm text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full bg-primary hover:bg-primary/90 text-white py-5 rounded-2xl text-base font-bold transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
            >
              {status === "loading" ? "Sending..." : "Request Demo"}
            </button>

            {status === "success" && (
              <p className="text-center text-sm text-emerald-600 font-medium">
                Demo request sent successfully!
              </p>
            )}
            {status === "error" && (
              <p className="text-center text-sm text-red-600 font-medium">
                Something went wrong. Please try again.
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
