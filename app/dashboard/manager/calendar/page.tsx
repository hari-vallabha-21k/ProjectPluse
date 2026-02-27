"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useWorkspace } from "@/context/WorkspaceContext";
import Modal from "@/components/ui/Modal";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CalendarEvent {
  id: string;
  title: string;
  type: "meeting" | "deadline" | "review" | "milestone";
  date: string;
  time: string;
  duration: string;
  attendees: string[];
  project: string;
  description: string;
  meetLink?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateJitsiLink(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const id = Math.random().toString(36).slice(2, 8);
  return `https://meet.jit.si/ProjectPulse-${slug}-${id}`;
}

function detectPlatform(url: string): {
  label: string;
  icon: string;
  color: string;
} {
  if (url.includes("meet.google.com"))
    return { label: "Google Meet", icon: "videocam", color: "bg-green-600" };
  if (url.includes("zoom.us"))
    return { label: "Zoom", icon: "videocam", color: "bg-blue-600" };
  if (url.includes("teams.microsoft") || url.includes("teams.live"))
    return { label: "MS Teams", icon: "videocam", color: "bg-indigo-600" };
  if (url.includes("meet.jit.si"))
    return { label: "Jitsi Meet", icon: "videocam", color: "bg-blue-500" };
  return { label: "Video Call", icon: "videocam", color: "bg-slate-600" };
}

function buildGoogleCalUrl(
  title: string,
  date: string,
  time: string,
  durationMins: number,
  description: string,
  attendees: string[]
) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = new Date(`${date}T${time}`);
  const end = new Date(start.getTime() + durationMins * 60_000);
  const fmt = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(
      d.getHours()
    )}${pad(d.getMinutes())}00`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: description,
    trp: "true",
  });
  if (attendees.length) params.set("add", attendees.join(","));
  return `https://calendar.google.com/calendar/render?${params}`;
}

function durationToMinutes(d: string): number {
  if (d.includes("hr")) return parseFloat(d) * 60;
  return parseInt(d, 10) || 30;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const DURATION_OPTIONS = [
  "15 min",
  "30 min",
  "45 min",
  "1 hr",
  "1.5 hr",
  "2 hr",
];

/* ------------------------------------------------------------------ */

export default function ManagerCalendar() {
  const { workspaceId, userId, userName } = useWorkspace();

  /* Data */
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  /* Fetch projects from Supabase */
  useEffect(() => {
    supabase
      .from("projects")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .order("name")
      .then(({ data }) => {
        if (data) setProjects(data);
      });
  }, [workspaceId]);

  /* Fetch calendar events from Supabase */
  const fetchEvents = useCallback(async () => {
    const { data } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("date", { ascending: true });
    if (data) {
      setEvents(
        data.map((e: Record<string, unknown>) => ({
          id: e.id as string,
          title: e.title as string,
          type: e.type as CalendarEvent["type"],
          date: e.date as string,
          time: e.time as string,
          duration: e.duration as string,
          attendees: (e.attendees as string[]) ?? [],
          project: (e.project as string) ?? "",
          description: (e.description as string) ?? "",
          meetLink: (e.meet_link as string) ?? undefined,
        }))
      );
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  /* Real-time: auto-refresh when events are added/deleted by others */
  useEffect(() => {
    const channel = supabase
      .channel("calendar-events")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calendar_events", filter: `workspace_id=eq.${workspaceId}` },
        () => { fetchEvents(); }
      )
      .subscribe();

    // Also poll every 15s as fallback in case realtime isn't enabled
    const interval = setInterval(fetchEvents, 15_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchEvents, workspaceId]);

  /* Supabase event helpers */
  const addEvent = async (e: Omit<CalendarEvent, "id">) => {
    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        workspace_id: workspaceId,
        title: e.title,
        type: e.type,
        date: e.date,
        time: e.time,
        duration: e.duration,
        attendees: e.attendees,
        project: e.project,
        description: e.description,
        meet_link: e.meetLink ?? null,
        created_by: userId,
      })
      .select()
      .single();
    if (error) {
      console.error("Failed to create event:", error);
      return;
    }
    if (data) {
      setEvents((prev) => [
        {
          id: data.id,
          title: data.title,
          type: data.type,
          date: data.date,
          time: data.time,
          duration: data.duration,
          attendees: data.attendees ?? [],
          project: data.project ?? "",
          description: data.description ?? "",
          meetLink: data.meet_link ?? undefined,
        },
        ...prev,
      ]);
    }
  };

  const deleteEvent = async (id: string) => {
    await supabase.from("calendar_events").delete().eq("id", id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  /* Calendar state */
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);

  /* Form state */
  const [form, setForm] = useState({
    title: "",
    type: "meeting" as "meeting" | "deadline" | "review" | "milestone",
    date: "",
    time: "09:00",
    duration: "30 min",
    attendees: "",
    project: "",
    description: "",
    meetMode: "auto" as "auto" | "custom" | "none",
    customMeetLink: "",
  });

  const resetForm = () =>
    setForm({
      title: "",
      type: "meeting",
      date: "",
      time: "09:00",
      duration: "30 min",
      attendees: "",
      project: "",
      description: "",
      meetMode: "auto",
      customMeetLink: "",
    });

  /* Calendar math */
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;

  const calendarCells = useMemo(() => {
    const cells: { day: number; month: number; year: number; key: string }[] =
      [];
    for (let i = 0; i < totalCells; i++) {
      if (i < firstDayOfMonth) {
        const d = daysInPrevMonth - firstDayOfMonth + i + 1;
        const m = month === 0 ? 11 : month - 1;
        const y = month === 0 ? year - 1 : year;
        cells.push({ day: d, month: m, year: y, key: `prev-${d}` });
      } else if (i - firstDayOfMonth < daysInMonth) {
        const d = i - firstDayOfMonth + 1;
        cells.push({ day: d, month, year, key: `cur-${d}` });
      } else {
        const d = i - firstDayOfMonth - daysInMonth + 1;
        const m = month === 11 ? 0 : month + 1;
        const y = month === 11 ? year + 1 : year;
        cells.push({ day: d, month: m, year: y, key: `next-${d}` });
      }
    }
    return cells;
  }, [year, month, firstDayOfMonth, daysInMonth, daysInPrevMonth, totalCells]);

  const todayStr = new Date().toISOString().split("T")[0];
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const toDateStr = (y: number, m: number, d: number) =>
    `${y}-${pad2(m + 1)}-${pad2(d)}`;

  const eventsForDate = (dateStr: string) =>
    events.filter((e) => e.date === dateStr);
  const todayEvents = eventsForDate(todayStr);
  const upcomingEvents = events
    .filter((e) => e.date > todayStr)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
    )
    .slice(0, 6);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  /* Helpers */
  const getEventColor = (type: string) => {
    const map: Record<string, string> = {
      meeting:
        "bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300",
      deadline:
        "bg-red-100 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300",
      review:
        "bg-yellow-100 border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300",
      milestone:
        "bg-green-100 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300",
    };
    return (
      map[type] ??
      "bg-gray-100 border-gray-200 text-gray-800 dark:bg-gray-900/30 dark:border-gray-800 dark:text-gray-300"
    );
  };
  const getEventIcon = (type: string) =>
    ({
      meeting: "videocam",
      deadline: "schedule",
      review: "rate_review",
      milestone: "flag",
    }[type] ?? "event");
  const getEventDot = (type: string) =>
    ({
      meeting: "bg-blue-500",
      deadline: "bg-red-500",
      review: "bg-yellow-500",
      milestone: "bg-green-500",
    }[type] ?? "bg-gray-400");

  /* Submit */
  const handleSubmit = async () => {
    if (!form.title.trim() || !form.date) return;
    let meetLink: string | undefined;
    if (form.type === "meeting") {
      if (form.meetMode === "auto") meetLink = generateJitsiLink(form.title);
      else if (form.meetMode === "custom" && form.customMeetLink.trim())
        meetLink = form.customMeetLink.trim();
    }
    await addEvent({
      title: form.title.trim(),
      type: form.type,
      date: form.date,
      time: form.time,
      duration: form.duration,
      attendees: form.attendees
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      project: form.project,
      description: form.description,
      meetLink,
    });

    /* Notify all workspace members */
    try {
      const { data: members } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspaceId);

      if (members && members.length) {
        const projectName = projects.find((p) => p.id === form.project)?.name;
        const rows = members
          .filter((m) => m.user_id !== userId) // don't notify the creator
          .map((m) => ({
            workspace_id: workspaceId,
            user_id: m.user_id,
            type: form.type,
            title: `New ${form.type}: ${form.title.trim()}`,
            message: [
              `${userName} scheduled a ${form.type}`,
              `on ${form.date} at ${form.time}`,
              projectName ? `for project "${projectName}"` : "",
              meetLink ? `• Join: ${meetLink}` : "",
            ]
              .filter(Boolean)
              .join(" "),
          }));
        if (rows.length) {
          await supabase.from("notifications").insert(rows);
        }
      }
    } catch {
      // notification insert failure should not block event creation
    }

    resetForm();
    setShowModal(false);
  };

  const googleCalLink = (ev: CalendarEvent) =>
    buildGoogleCalUrl(
      ev.title,
      ev.date,
      ev.time,
      durationToMinutes(ev.duration),
      ev.description,
      ev.attendees
    );

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Calendar &amp; Schedule
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage meetings, deadlines, and project milestones
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* View toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            {(["month", "week", "day"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-1 text-sm font-medium rounded-md capitalize ${
                  viewMode === v
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              resetForm();
              setForm((p) => ({ ...p, date: selectedDate ?? todayStr }));
              setShowModal(true);
            }}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">
              video_call
            </span>
            Schedule Meeting
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          {/* Nav */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
              {currentDate.toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={goToday}
                className="px-3 py-1 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Today
              </button>
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">
                  chevron_left
                </span>
              </button>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">
                  chevron_right
                </span>
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="p-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500"
              >
                {d}
              </div>
            ))}

            {/* Cells */}
            {calendarCells.map((cell) => {
              const dateStr = toDateStr(cell.year, cell.month, cell.day);
              const isCurrentMonth = cell.month === month;
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const dayEvents = eventsForDate(dateStr);
              const hasMeet = dayEvents.some((e) => e.meetLink);

              return (
                <div
                  key={cell.key}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`relative min-h-[72px] p-1.5 text-sm cursor-pointer rounded-lg border transition-all ${
                    isSelected
                      ? "border-primary/60 bg-primary/5 dark:bg-primary/10"
                      : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  } ${!isCurrentMonth ? "opacity-40" : ""}`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
                      isToday
                        ? "bg-primary text-white"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {cell.day}
                  </span>

                  {dayEvents.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-0.5 px-0.5">
                      {dayEvents.slice(0, 3).map((e) => (
                        <div
                          key={e.id}
                          className={`h-1.5 flex-1 min-w-[6px] rounded-full ${getEventDot(
                            e.type
                          )}`}
                          title={e.title}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[9px] leading-none text-slate-400">
                          +{dayEvents.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {hasMeet && (
                    <div className="absolute top-1 right-1">
                      <span
                        className="material-symbols-outlined text-[14px] text-blue-500"
                        title="Has video call"
                      >
                        videocam
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-6">
          {/* Selected-date / today events */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {selectedDate
                  ? new Date(selectedDate + "T00:00").toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric", year: "numeric" }
                    )
                  : "Today's Events"}
              </h3>
              {selectedDate && (
                <button
                  onClick={() => {
                    resetForm();
                    setForm((p) => ({ ...p, date: selectedDate }));
                    setShowModal(true);
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-primary transition-colors"
                  title="Add event on this day"
                >
                  <span className="material-symbols-outlined text-xl">
                    add
                  </span>
                </button>
              )}
            </div>
            <div className="space-y-3">
              {(selectedDate
                ? eventsForDate(selectedDate)
                : todayEvents
              ).length > 0 ? (
                (selectedDate
                  ? eventsForDate(selectedDate)
                  : todayEvents
                ).map((event) => (
                  <div
                    key={event.id}
                    className={`p-3 rounded-lg border cursor-pointer ${getEventColor(
                      event.type
                    )}`}
                    onClick={() => setDetailEvent(event)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">
                          {getEventIcon(event.type)}
                        </span>
                        <h4 className="font-medium text-sm">{event.title}</h4>
                      </div>
                      {event.meetLink && (
                        <a
                          href={event.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px] font-semibold hover:opacity-90 transition-colors ${
                            detectPlatform(event.meetLink).color
                          }`}
                          title="Join call"
                        >
                          <span className="material-symbols-outlined text-[12px]">
                            videocam
                          </span>
                          Join
                        </a>
                      )}
                    </div>
                    <p className="text-xs opacity-80">
                      {event.time} &middot; {event.duration}
                    </p>
                    {event.project && (
                      <p className="text-xs opacity-70 mt-0.5">
                        {event.project}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-slate-600">
                    event_busy
                  </span>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    No events
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Upcoming
            </h3>
            <div className="space-y-3">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => setDetailEvent(event)}
                    className="flex items-start gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getEventColor(
                        event.type
                      )}`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {getEventIcon(event.type)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-slate-900 dark:text-white truncate">
                        {event.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(
                          event.date + "T00:00"
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        at {event.time}
                      </p>
                      {event.meetLink && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                          <span className="material-symbols-outlined text-[12px]">
                            videocam
                          </span>
                          {detectPlatform(event.meetLink).label}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No upcoming events
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============ Schedule Meeting Modal ============ */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Schedule Meeting"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Meeting Title *
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Sprint Planning"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none text-sm"
            />
          </div>

          {/* Type + Project */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Type
              </label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as typeof form.type })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none text-sm"
              >
                <option value="meeting">Meeting</option>
                <option value="review">Review</option>
                <option value="deadline">Deadline</option>
                <option value="milestone">Milestone</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Project
              </label>
              <select
                value={form.project}
                onChange={(e) =>
                  setForm({ ...form, project: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none text-sm"
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Time
              </label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none text-sm"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Duration
            </label>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setForm({ ...form, duration: d })}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                    form.duration === d
                      ? "bg-primary text-white border-primary"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary/50"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Attendees (emails, comma-separated)
            </label>
            <input
              value={form.attendees}
              onChange={(e) =>
                setForm({ ...form, attendees: e.target.value })
              }
              placeholder="alice@example.com, bob@example.com"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Meeting agenda or notes..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none text-sm resize-none"
            />
          </div>

          {/* Video conferencing options */}
          {form.type === "meeting" && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Video Conferencing
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, meetMode: "auto" })}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    form.meetMode === "auto"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/30"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <span className="material-symbols-outlined text-xl text-blue-500 mb-1">
                    video_call
                  </span>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    Auto
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Jitsi Meet
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, meetMode: "custom" })}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    form.meetMode === "custom"
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20 ring-2 ring-green-500/30"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <span className="material-symbols-outlined text-xl text-green-500 mb-1">
                    link
                  </span>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    Custom
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Paste link
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, meetMode: "none" })}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    form.meetMode === "none"
                      ? "border-slate-500 bg-slate-50 dark:bg-slate-800 ring-2 ring-slate-500/30"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <span className="material-symbols-outlined text-xl text-slate-400 mb-1">
                    videocam_off
                  </span>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    None
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    No video
                  </p>
                </button>
              </div>

              {form.meetMode === "auto" && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-white text-lg">
                      videocam
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                      Jitsi Meet (free &amp; instant)
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      A working video link will be generated automatically
                    </p>
                  </div>
                </div>
              )}

              {form.meetMode === "custom" && (
                <div>
                  <input
                    value={form.customMeetLink}
                    onChange={(e) =>
                      setForm({ ...form, customMeetLink: e.target.value })
                    }
                    placeholder="https://meet.google.com/xxx-yyyy-zzz  or  Zoom / Teams link"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none text-sm"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    Supports Google Meet, Zoom, Microsoft Teams, or any video
                    URL
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!form.title.trim() || !form.date}
              className="px-5 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {form.type === "meeting" && form.meetMode !== "none" && (
                <span className="material-symbols-outlined text-base">
                  videocam
                </span>
              )}
              Schedule
              {form.type === "meeting" && form.meetMode !== "none"
                ? " with Video"
                : ""}
            </button>
          </div>
        </div>
      </Modal>

      {/* ============ Event Detail Modal ============ */}
      <Modal
        open={!!detailEvent}
        onClose={() => setDetailEvent(null)}
        title="Event Details"
      >
        {detailEvent && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${getEventColor(
                    detailEvent.type
                  )}`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {getEventIcon(detailEvent.type)}
                  </span>
                  {detailEvent.type.charAt(0).toUpperCase() +
                    detailEvent.type.slice(1)}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {detailEvent.title}
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined text-base">
                  calendar_today
                </span>
                {new Date(
                  detailEvent.date + "T00:00"
                ).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined text-base">
                  schedule
                </span>
                {detailEvent.time}
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined text-base">
                  hourglass_top
                </span>
                {detailEvent.duration}
              </div>
            </div>

            {detailEvent.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {detailEvent.description}
              </p>
            )}

            {detailEvent.project && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined text-base">
                  folder
                </span>
                {detailEvent.project}
              </div>
            )}

            {detailEvent.attendees.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Attendees
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {detailEvent.attendees.map((a) => (
                    <span
                      key={a}
                      className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {detailEvent.meetLink &&
              (() => {
                const platform = detectPlatform(detailEvent.meetLink!);
                return (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg ${platform.color} flex items-center justify-center shrink-0`}
                      >
                        <span className="material-symbols-outlined text-white">
                          videocam
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                          {platform.label}
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-400 truncate">
                          {detailEvent.meetLink}
                        </p>
                      </div>
                      <a
                        href={detailEvent.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-4 py-2 rounded-lg ${platform.color} text-white text-sm font-semibold hover:opacity-90 transition-colors flex items-center gap-1.5 shrink-0`}
                      >
                        <span className="material-symbols-outlined text-base">
                          videocam
                        </span>
                        Join
                      </a>
                    </div>
                  </div>
                );
              })()}

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  deleteEvent(detailEvent.id);
                  setDetailEvent(null);
                }}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">
                  delete
                </span>
                Delete
              </button>
              <div className="flex items-center gap-2">
                <a
                  href={googleCalLink(detailEvent)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M19.5 4h-3V2.5a.5.5 0 0 0-1 0V4h-7V2.5a.5.5 0 0 0-1 0V4h-3A1.5 1.5 0 0 0 3 5.5v14A1.5 1.5 0 0 0 4.5 21h15a1.5 1.5 0 0 0 1.5-1.5v-14A1.5 1.5 0 0 0 19.5 4ZM20 19.5a.5.5 0 0 1-.5.5h-15a.5.5 0 0 1-.5-.5V9h16v10.5ZM20 8H4V5.5a.5.5 0 0 1 .5-.5h3V6a.5.5 0 0 0 1 0V5h7v1a.5.5 0 0 0 1 0V5h3a.5.5 0 0 1 .5.5V8Z"
                    />
                  </svg>
                  Google Calendar
                </a>
                <button
                  onClick={() => setDetailEvent(null)}
                  className="px-4 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
