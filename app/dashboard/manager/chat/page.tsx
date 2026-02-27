"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useWorkspace } from "@/context/WorkspaceContext";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Member {
  user_id: string;
  email: string;
  name: string;
}

interface Conversation {
  id: string;
  type: "direct" | "group";
  name: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unread: number;
  members: Member[];
  peer?: Member;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  type: "text" | "file" | "system";
  file_name?: string;
  file_url?: string;
  file_type?: string;
  file_size?: number;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string): string {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "movie";
  if (type.includes("pdf")) return "picture_as_pdf";
  if (type.includes("spreadsheet") || type.includes("excel")) return "table_chart";
  if (type.includes("zip") || type.includes("rar")) return "folder_zip";
  return "attach_file";
}

function getFileColor(type: string): string {
  if (type.startsWith("image/")) return "text-pink-500 bg-pink-50 dark:bg-pink-900/20";
  if (type.includes("pdf")) return "text-red-500 bg-red-50 dark:bg-red-900/20";
  if (type.includes("spreadsheet") || type.includes("excel")) return "text-green-500 bg-green-50 dark:bg-green-900/20";
  return "text-slate-500 bg-slate-50 dark:bg-slate-800";
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function chatTimeStamp(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function initial(name: string) {
  return name?.charAt(0)?.toUpperCase() || "?";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TeamChat() {
  const { workspaceId, userId, userName, userEmail } = useWorkspace();

  /* ---- state ---- */
  const [members, setMembers] = useState<Member[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [showMobile, setShowMobile] = useState<"list" | "chat">("list");
  const [searchQuery, setSearchQuery] = useState("");

  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null;

  /* ---- build name map for sender lookups ---- */
  const nameMap = useRef<Record<string, string>>({});
  useEffect(() => {
    const map: Record<string, string> = {};
    map[userId] = userName || userEmail;
    members.forEach((m) => {
      map[m.user_id] = m.name || m.email;
    });
    nameMap.current = map;
  }, [members, userId, userName, userEmail]);

  /* ================================================================ */
  /*  FETCH workspace members                                         */
  /* ================================================================ */

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase
      .from("workspace_members")
      .select("user_id, email, role")
      .eq("workspace_id", workspaceId);
    if (!data) return [];
    const list: Member[] = data.map((m) => ({
      user_id: m.user_id,
      email: m.email ?? "",
      name: m.email?.split("@")[0] ?? "",
    }));
    setMembers(list);
    return list;
  }, [workspaceId]);

  /* ================================================================ */
  /*  ENSURE "General" group + DM conversations for every member      */
  /* ================================================================ */

  const ensureConversations = useCallback(
    async (memberList: Member[]) => {
      /* 1. fetch all conversations the user participates in */
      const { data: myParts } = await supabase
        .from("chat_participants")
        .select("conversation_id")
        .eq("user_id", userId);
      const myConvIds = (myParts ?? []).map((p) => p.conversation_id);

      let convRows: { id: string; type: string; name: string | null; created_at: string }[] = [];
      if (myConvIds.length) {
        const { data } = await supabase
          .from("chat_conversations")
          .select("id, type, name, created_at")
          .in("id", myConvIds)
          .eq("workspace_id", workspaceId);
        convRows = data ?? [];
      }

      /* 2. ensure "General" group */
      let generalConv = convRows.find((c) => c.type === "group" && c.name === "General");
      if (!generalConv) {
        const { data: existingGroups } = await supabase
          .from("chat_conversations")
          .select("id, type, name, created_at")
          .eq("workspace_id", workspaceId)
          .eq("type", "group")
          .eq("name", "General")
          .limit(1);
        if (existingGroups && existingGroups.length) {
          generalConv = existingGroups[0];
          await supabase
            .from("chat_participants")
            .upsert({ conversation_id: generalConv.id, user_id: userId }, { onConflict: "conversation_id,user_id" });
          convRows.push(generalConv);
        } else {
          const { data: newConv } = await supabase
            .from("chat_conversations")
            .insert({ workspace_id: workspaceId, type: "group", name: "General", created_by: userId })
            .select()
            .single();
          if (newConv) {
            generalConv = newConv;
            convRows.push(newConv);
            const rows = memberList.map((m) => ({ conversation_id: newConv.id, user_id: m.user_id }));
            if (rows.length) await supabase.from("chat_participants").upsert(rows, { onConflict: "conversation_id,user_id" });
          }
        }
      } else {
        const rows = memberList.map((m) => ({ conversation_id: generalConv!.id, user_id: m.user_id }));
        if (rows.length) await supabase.from("chat_participants").upsert(rows, { onConflict: "conversation_id,user_id" });
      }

      /* 3. ensure DM with every OTHER member */
      const otherMembers = memberList.filter((m) => m.user_id !== userId);
      const existingDMs = convRows.filter((c) => c.type === "direct");

      let dmPeerMap: Record<string, string> = {};
      if (existingDMs.length) {
        const { data: partRows } = await supabase
          .from("chat_participants")
          .select("conversation_id, user_id")
          .in("conversation_id", existingDMs.map((d) => d.id));
        if (partRows) {
          for (const pr of partRows) {
            if (pr.user_id !== userId) {
              dmPeerMap[pr.conversation_id] = pr.user_id;
            }
          }
        }
      }
      const existingPeerIds = new Set(Object.values(dmPeerMap));

      for (const m of otherMembers) {
        if (existingPeerIds.has(m.user_id)) continue;
        const { data: newDm } = await supabase
          .from("chat_conversations")
          .insert({ workspace_id: workspaceId, type: "direct", name: null, created_by: userId })
          .select()
          .single();
        if (newDm) {
          await supabase.from("chat_participants").insert([
            { conversation_id: newDm.id, user_id: userId },
            { conversation_id: newDm.id, user_id: m.user_id },
          ]);
          convRows.push(newDm);
          dmPeerMap[newDm.id] = m.user_id;
        }
      }

      /* 4. fetch last message for each conversation */
      const convIds = convRows.map((c) => c.id);
      let lastMsgMap: Record<string, { content: string; created_at: string; type: string }> = {};
      if (convIds.length) {
        const { data: lastMsgs } = await supabase
          .from("chat_messages")
          .select("conversation_id, content, created_at, type")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false });
        if (lastMsgs) {
          for (const lm of lastMsgs) {
            if (!lastMsgMap[lm.conversation_id]) {
              lastMsgMap[lm.conversation_id] = lm;
            }
          }
        }
      }

      /* 5. build Conversation[] */
      const memberById = Object.fromEntries(memberList.map((m) => [m.user_id, m]));
      const convList: Conversation[] = convRows.map((c) => {
        const lm = lastMsgMap[c.id];
        const peerId = dmPeerMap[c.id];
        const peer = peerId ? memberById[peerId] : undefined;
        return {
          id: c.id,
          type: c.type as "direct" | "group",
          name: c.type === "group" ? (c.name ?? "Group") : (peer?.name || peer?.email || "Unknown"),
          lastMessage: lm ? (lm.type === "file" ? "📎 File" : lm.content) : undefined,
          lastMessageAt: lm?.created_at,
          unread: 0,
          members: memberList,
          peer,
        };
      });

      convList.sort((a, b) => {
        if (a.type === "group" && a.name === "General") return -1;
        if (b.type === "group" && b.name === "General") return 1;
        const at = a.lastMessageAt ?? "";
        const bt = b.lastMessageAt ?? "";
        return bt.localeCompare(at);
      });

      setConversations(convList);
      if (!activeConvId && convList.length) setActiveConvId(convList[0].id);
      setLoading(false);
    },
    [workspaceId, userId, activeConvId]
  );

  /* ================================================================ */
  /*  Initial load                                                     */
  /* ================================================================ */

  useEffect(() => {
    (async () => {
      const list = await fetchMembers();
      await ensureConversations(list);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  /* ================================================================ */
  /*  Load messages when conversation changes                          */
  /* ================================================================ */

  const fetchMessages = useCallback(async (convId: string) => {
    setMsgLoading(true);
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (data) {
      setMessages(
        data.map((m: Record<string, unknown>) => ({
          ...m,
          sender_name: nameMap.current[m.sender_id as string] || "Unknown",
        })) as Message[]
      );
    }
    setMsgLoading(false);
  }, []);

  useEffect(() => {
    if (activeConvId) fetchMessages(activeConvId);
  }, [activeConvId, fetchMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ================================================================ */
  /*  Real-time subscription                                           */
  /* ================================================================ */

  useEffect(() => {
    if (!activeConvId) return;
    const channel = supabase
      .channel(`chat-${activeConvId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${activeConvId}` },
        (payload) => {
          const m = payload.new as Message;
          m.sender_name = nameMap.current[m.sender_id] || "Unknown";
          setMessages((prev) => {
            if (prev.some((p) => p.id === m.id)) return prev;
            return [...prev, m];
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConvId]);

  useEffect(() => {
    const convIds = conversations.map((c) => c.id);
    if (!convIds.length) return;
    const channel = supabase
      .channel("chat-sidebar")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const m = payload.new as { conversation_id: string; content: string; created_at: string; type: string; sender_id: string };
          if (!convIds.includes(m.conversation_id)) return;
          setConversations((prev) =>
            prev
              .map((c) =>
                c.id === m.conversation_id
                  ? {
                    ...c,
                    lastMessage: m.type === "file" ? "📎 File" : m.content,
                    lastMessageAt: m.created_at,
                    unread: m.conversation_id !== activeConvId && m.sender_id !== userId ? c.unread + 1 : c.unread,
                  }
                  : c
              )
              .sort((a, b) => {
                if (a.type === "group" && a.name === "General") return -1;
                if (b.type === "group" && b.name === "General") return 1;
                return (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? "");
              })
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversations.length, activeConvId, userId]);

  /* ================================================================ */
  /*  Send message                                                     */
  /* ================================================================ */

  const handleSend = async () => {
    if (!text.trim() || !activeConvId) return;
    const content = text.trim();
    setText("");

    // Optimistic: show message immediately in the UI
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      conversation_id: activeConvId,
      sender_id: userId,
      sender_name: nameMap.current[userId] || "You",
      content,
      type: "text",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: activeConvId,
        sender_id: userId,
        content,
        type: "text",
      })
      .select()
      .single();

    if (error) {
      console.error("Send failed:", error);
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return;
    }

    // Replace temp message with real one (if realtime hasn't already)
    if (data) {
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        if (withoutTemp.some((m) => m.id === data.id)) return withoutTemp;
        return [...withoutTemp, { ...data, sender_name: nameMap.current[userId] || "You" }];
      });
    }

    // Notify other participants
    try {
      const { data: participants } = await supabase
        .from("chat_participants")
        .select("user_id")
        .eq("conversation_id", activeConvId);
      if (participants) {
        const senderName = userName || userEmail;
        const convName = activeConv?.type === "group" ? activeConv.name : null;
        const rows = participants
          .filter((p) => p.user_id !== userId)
          .map((p) => ({
            workspace_id: workspaceId,
            user_id: p.user_id,
            type: "general" as const,
            title: convName
              ? `New message in ${convName}`
              : `New message from ${senderName}`,
            message: content.length > 100 ? content.slice(0, 100) + "…" : content,
          }));
        if (rows.length) await supabase.from("notifications").insert(rows);
      }
    } catch {
      // notification failure should not affect chat
    }
  };

  /* ================================================================ */
  /*  File send                                                        */
  /* ================================================================ */

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConvId) return;
    e.target.value = "";
    const url = URL.createObjectURL(file);

    // Optimistic
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      conversation_id: activeConvId,
      sender_id: userId,
      sender_name: nameMap.current[userId] || "You",
      content: file.name,
      type: "file",
      file_name: file.name,
      file_url: url,
      file_type: file.type,
      file_size: file.size,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: activeConvId,
        sender_id: userId,
        content: file.name,
        type: "file",
        file_name: file.name,
        file_url: url,
        file_type: file.type,
        file_size: file.size,
      })
      .select()
      .single();

    if (error) {
      console.error("File send failed:", error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return;
    }

    if (data) {
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        if (withoutTemp.some((m) => m.id === data.id)) return withoutTemp;
        return [...withoutTemp, { ...data, sender_name: nameMap.current[userId] || "You" }];
      });
    }

    // Notify other participants
    try {
      const { data: participants } = await supabase
        .from("chat_participants")
        .select("user_id")
        .eq("conversation_id", activeConvId);
      if (participants) {
        const senderName = userName || userEmail;
        const convName = activeConv?.type === "group" ? activeConv.name : null;
        const rows = participants
          .filter((p) => p.user_id !== userId)
          .map((p) => ({
            workspace_id: workspaceId,
            user_id: p.user_id,
            type: "general" as const,
            title: convName
              ? `File shared in ${convName}`
              : `${senderName} sent a file`,
            message: `📎 ${file.name}`,
          }));
        if (rows.length) await supabase.from("notifications").insert(rows);
      }
    } catch {
      // notification failure should not affect chat
    }
  };

  /* ================================================================ */
  /*  Select conversation                                              */
  /* ================================================================ */

  const selectConversation = (id: string) => {
    setActiveConvId(id);
    setShowMobile("chat");
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c))
    );
  };

  /* ================================================================ */
  /*  Delete conversation                                              */
  /* ================================================================ */

  const handleDeleteChat = async (convId: string) => {
    const conv = conversations.find((c) => c.id === convId);
    const label = conv?.type === "group" ? `"${conv.name}" group` : `chat with ${conv?.name}`;
    const confirmed = window.confirm(
      `Delete ${label}? All messages will be permanently removed.`
    );
    if (!confirmed) return;

    /* Delete messages first (FK constraint), then participants, then conversation */
    await supabase.from("chat_messages").delete().eq("conversation_id", convId);
    await supabase.from("chat_participants").delete().eq("conversation_id", convId);
    await supabase.from("chat_conversations").delete().eq("id", convId);

    /* Update local state */
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConvId === convId) {
      const remaining = conversations.filter((c) => c.id !== convId);
      setActiveConvId(remaining.length > 0 ? remaining[0].id : null);
      setMessages([]);
      setShowMobile("list");
    }
  };

  /* ================================================================ */
  /*  Filtered list                                                    */
  /* ================================================================ */

  const filteredConversations = searchQuery
    ? conversations.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : conversations;

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Team Chat
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Direct messages &amp; group conversations
        </p>
      </div>

      {/* Chat Container */}
      <div className="flex h-[calc(100vh-12rem)] bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* ========== LEFT: Conversation List ========== */}
        <div
          className={`w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col ${showMobile === "chat" ? "hidden md:flex" : "flex"
            }`}
        >
          {/* Search */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                search
              </span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent rounded-lg text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 outline-none"
              />
            </div>
          </div>

          {/* Conversation items */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-slate-600 mb-2">
                  forum
                </span>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No conversations
                </p>
              </div>
            )}
            {filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-800/50 ${activeConvId === conv.id
                    ? "bg-primary/5 dark:bg-primary/10"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {conv.type === "group" ? (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-xl">
                        groups
                      </span>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-indigo-400 flex items-center justify-center text-white font-bold text-lg">
                      {initial(conv.name)}
                    </div>
                  )}
                </div>

                {/* Name + last message */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {conv.name}
                    </h4>
                    {conv.lastMessageAt && (
                      <span className="text-[11px] text-slate-400 flex-shrink-0 ml-2">
                        {timeLabel(conv.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {conv.lastMessage ?? (conv.type === "group" ? "Group chat" : "Start a conversation")}
                    </p>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {conv.unread > 0 && (
                        <span className="min-w-[20px] h-[20px] flex items-center justify-center bg-primary text-white text-[10px] font-bold rounded-full px-1">
                          {conv.unread}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChat(conv.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                        title="Delete conversation"
                      >
                        <span className="material-symbols-outlined text-sm text-red-500 dark:text-red-400">
                          delete
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ========== RIGHT: Chat Area ========== */}
        <div
          className={`flex-1 flex flex-col ${showMobile === "list" ? "hidden md:flex" : "flex"
            }`}
        >
          {!activeConv ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400">
              <span className="material-symbols-outlined text-5xl mb-3">
                chat
              </span>
              <p className="text-sm">Select a conversation</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <button
                  onClick={() => setShowMobile("list")}
                  className="md:hidden p-1 -ml-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">
                    arrow_back
                  </span>
                </button>

                {activeConv.type === "group" ? (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-primary">
                      groups
                    </span>
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-indigo-400 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {initial(activeConv.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                    {activeConv.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeConv.type === "group"
                      ? `${members.length} members`
                      : activeConv.peer?.email ?? "Direct message"}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteChat(activeConv.id)}
                  className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Delete conversation"
                >
                  <span className="material-symbols-outlined text-lg text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors">
                    delete
                  </span>
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-slate-50 dark:bg-slate-950/40">
                {msgLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-3">
                      chat_bubble_outline
                    </span>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      No messages yet
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Say hello!
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, idx) => {
                      const isMe = msg.sender_id === userId;
                      const showName =
                        activeConv.type === "group" &&
                        !isMe &&
                        (idx === 0 || messages[idx - 1].sender_id !== msg.sender_id);

                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? "justify-end" : "justify-start"} ${showName ? "mt-3" : "mt-0.5"}`}
                        >
                          <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                            {showName && (
                              <span className="text-[11px] font-semibold text-primary mb-0.5 ml-1">
                                {msg.sender_name}
                              </span>
                            )}

                            {msg.type === "file" && msg.file_name ? (
                              <div
                                className={`rounded-2xl border overflow-hidden ${isMe
                                    ? "bg-primary/10 border-primary/20 rounded-tr-sm"
                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-tl-sm"
                                  }`}
                              >
                                {msg.file_type?.startsWith("image/") && msg.file_url && (
                                  <div className="max-w-[280px]">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={msg.file_url}
                                      alt={msg.file_name}
                                      className="w-full rounded-t-2xl max-h-48 object-cover"
                                    />
                                  </div>
                                )}
                                <div className="flex items-center gap-3 p-3">
                                  <div
                                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${getFileColor(msg.file_type ?? "")}`}
                                  >
                                    <span className="material-symbols-outlined text-lg">
                                      {getFileIcon(msg.file_type ?? "")}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0 text-left">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                      {msg.file_name}
                                    </p>
                                    {msg.file_size && (
                                      <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {formatFileSize(msg.file_size)}
                                      </p>
                                    )}
                                  </div>
                                  {msg.file_url && (
                                    <a
                                      href={msg.file_url}
                                      download={msg.file_name}
                                      className="shrink-0 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                    >
                                      <span className="material-symbols-outlined text-lg text-primary">
                                        download
                                      </span>
                                    </a>
                                  )}
                                </div>
                                <div className="px-3 pb-1.5 text-right">
                                  <span className="text-[10px] text-slate-400">
                                    {chatTimeStamp(msg.created_at)}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div
                                className={`inline-block px-3.5 py-2 text-sm whitespace-pre-wrap ${isMe
                                    ? "bg-primary text-white rounded-2xl rounded-tr-sm"
                                    : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl rounded-tl-sm border border-slate-200 dark:border-slate-700"
                                  }`}
                              >
                                {msg.content}
                                <span
                                  className={`block text-right mt-0.5 text-[10px] ${isMe ? "text-white/60" : "text-slate-400"
                                    }`}
                                >
                                  {chatTimeStamp(msg.created_at)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={endRef} />
                  </>
                )}
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-end gap-2">
                <input
                  type="file"
                  ref={fileRef}
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
                >
                  <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">
                    attach_file
                  </span>
                </button>
                <div className="flex-1">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message..."
                    rows={1}
                    className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-sm placeholder:text-slate-400 text-slate-900 dark:text-white resize-none outline-none focus:ring-2 focus:ring-primary/30"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!text.trim()}
                  className="p-2.5 bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  <span className="material-symbols-outlined text-lg">
                    send
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
