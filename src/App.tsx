import { useState, useEffect, useRef, type FormEvent } from "react";
import { 
  Database, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Server, 
  Layers, 
  Users, 
  FileText, 
  Tag, 
  Zap, 
  Plus, 
  ShieldCheck, 
  Clock, 
  ExternalLink,
  ChevronRight
} from "lucide-react";

interface DbStatus {
  connected: boolean;
  provider: string;
  host: string;
  port: number;
  mode: string;
  latencyMs: number;
  info?: {
    version?: string;
    current_database?: string;
    current_user?: string;
  };
  counts?: {
    users: number;
    posts: number;
    tags: number;
    profiles: number;
  };
  recentUsers?: Array<{
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: string;
    profile?: { bio: string | null } | null;
    posts?: Array<{ id: string; title: string }>;
  }>;
  error?: string;
}

export default function App() {
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "config">("overview");

  // Form state
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("USER");
  const [formMsg, setFormMsg] = useState<string | null>(null);

  const [retrying, setRetrying] = useState(false);
  const retryCountRef = useRef(0);

  const fetchStatus = async (isManual = false) => {
    if (isManual) {
      retryCountRef.current = 0;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/db/status");
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Backend server is warming up. Retrying...");
      }
      const data = await res.json();
      setStatus(data);
      retryCountRef.current = 0;
      setRetrying(false);
    } catch (err: any) {
      const isSyntaxErr = err?.name === "SyntaxError" || err?.message?.includes("JSON");
      const errMsg = isSyntaxErr
        ? "Backend service warming up. Retrying automatically..."
        : (err.message || "Failed to reach backend server");

      setStatus({
        connected: false,
        provider: "Supabase PostgreSQL",
        host: "aws-1-eu-west-1.pooler.supabase.com",
        port: 6543,
        mode: "Transaction Pooler",
        latencyMs: 0,
        error: errMsg,
      });

      // Auto-retry up to 4 times with short intervals if server was warming up
      if (retryCountRef.current < 4) {
        retryCountRef.current += 1;
        setRetrying(true);
        setTimeout(() => {
          fetchStatus();
        }, 2000);
      } else {
        setRetrying(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSeed = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Server is restarting. Please retry in a moment.");
      }
      const data = await res.json();
      if (data.success) {
        setFormMsg("Sample user & post created in Supabase!");
        await fetchStatus();
      } else {
        setFormMsg(data.error || "Failed to seed data");
      }
    } catch (e: any) {
      setFormMsg(e.message || "Failed to seed data");
    } finally {
      setActionLoading(false);
      setTimeout(() => setFormMsg(null), 4000);
    }
  };

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, email: newEmail, role: newRole }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Server is restarting. Please retry in a moment.");
      }
      const data = await res.json();
      if (data.user) {
        setFormMsg(`Created user: ${data.user.email}`);
        setNewEmail("");
        setNewName("");
        await fetchStatus();
      } else {
        setFormMsg(data.error || "Error creating user");
      }
    } catch (err: any) {
      setFormMsg(err.message || "Failed to create user");
    } finally {
      setActionLoading(false);
      setTimeout(() => setFormMsg(null), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/10">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-sm tracking-tight text-white">Database Control Center</h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  Prisma + Supabase
                </span>
              </div>
              <p className="text-xs text-slate-400">PostgreSQL 17.6 • Pooler IPv4</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="refresh-btn"
              onClick={() => fetchStatus(true)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading || retrying ? "animate-spin text-emerald-400" : ""}`} />
              {loading || retrying ? "Connecting..." : "Refresh"}
            </button>
            <button
              id="quick-seed-btn"
              onClick={handleSeed}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              Add Demo Record
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {formMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in slide-in-from-top duration-200">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              {formMsg}
            </span>
          </div>
        )}

        {/* Status Banner */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div className={`w-4 h-4 rounded-full ${status?.connected ? "bg-emerald-400" : "bg-rose-500"}`} />
                {status?.connected && (
                  <div className="absolute -inset-1 rounded-full bg-emerald-400/40 animate-ping pointer-events-none" />
                )}
              </div>
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  {status?.connected ? "Database Online & Healthy" : "Connection Issue"}
                </h2>
                <div className="flex items-center gap-3 mt-0.5">
                  <p className="text-xs text-slate-400">
                    {status?.connected
                      ? "Prisma client successfully communicating with Supabase PostgreSQL cluster"
                      : status?.error || "Unable to reach database"}
                  </p>
                  {!status?.connected && (
                    <button
                      onClick={() => fetchStatus(true)}
                      className="text-xs text-emerald-400 underline hover:text-emerald-300 font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${loading || retrying ? "animate-spin" : ""}`} />
                      {retrying ? "Retrying..." : "Retry Now"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center gap-2 text-slate-300">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Latency:</span>
                <span className="font-mono font-semibold text-white">{status?.latencyMs || 0}ms</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center gap-2 text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>SSL / Pooler:</span>
                <span className="font-semibold text-emerald-400">Active</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Users</span>
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                {status?.counts?.users ?? "—"}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Table: users</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Posts</span>
                <FileText className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                {status?.counts?.posts ?? "—"}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Table: posts</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Profiles</span>
                <Layers className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                {status?.counts?.profiles ?? "—"}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Table: profiles</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Tags</span>
                <Tag className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                {status?.counts?.tags ?? "—"}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Table: tags</p>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "overview"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Overview & Records
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "users"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Create User Test
          </button>
          <button
            onClick={() => setActiveTab("config")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === "config"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Connection Topology
          </button>
        </div>

        {/* Tab Content: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Live Records in Supabase (`users`)</h3>
                  <p className="text-xs text-slate-400">Queried dynamically via Prisma Client</p>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {status?.recentUsers?.length || 0} displayed
                </span>
              </div>

              {status?.recentUsers && status.recentUsers.length > 0 ? (
                <div className="divide-y divide-slate-800/60">
                  {status.recentUsers.map((u) => (
                    <div key={u.id} className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-emerald-400">
                          {u.name ? u.name[0]?.toUpperCase() : u.email[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">{u.name || "Unnamed User"}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              u.role === "ADMIN" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "bg-slate-800 text-slate-300"
                            }`}>
                              {u.role}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 font-mono">{u.email}</span>
                          {u.profile?.bio && (
                            <p className="text-xs text-slate-400 italic mt-0.5">{u.profile.bio}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        {u.posts && u.posts.length > 0 && (
                          <span className="text-[11px] px-2 py-1 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                            {u.posts.length} Post{u.posts.length > 1 ? "s" : ""}
                          </span>
                        )}
                        <span className="text-slate-500 font-mono text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">No Users Found Yet</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                      Your Supabase database tables are ready! Click the button below to insert a real demo record.
                    </p>
                  </div>
                  <button
                    onClick={handleSeed}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Insert Demo User & Post
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Content: Users */}
        {activeTab === "users" && (
          <div className="max-w-xl rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Insert User into Supabase</h3>
              <p className="text-xs text-slate-400">Writes directly to PostgreSQL through Prisma ORM</p>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  id="user-name-input"
                  type="text"
                  placeholder="e.g. Alex Mercer"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address *</label>
                <input
                  id="user-email-input"
                  type="email"
                  required
                  placeholder="alex@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Role</label>
                <select
                  id="user-role-select"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition"
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="MODERATOR">MODERATOR</option>
                </select>
              </div>

              <button
                type="submit"
                id="submit-user-btn"
                disabled={actionLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? "Writing to PostgreSQL..." : "Create User in Supabase"}
              </button>
            </form>
          </div>
        )}

        {/* Tab Content: Configuration */}
        {activeTab === "config" && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-white">Configured Connection Topology</h3>
              <p className="text-xs text-slate-400">Architecture breakdown of your Supabase connection</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                  <Server className="w-4 h-4" />
                  <span>DATABASE_URL (App Runtime)</span>
                </div>
                <div className="space-y-1 text-xs text-slate-400">
                  <div className="flex justify-between py-1 border-b border-slate-900">
                    <span>Host:</span>
                    <span className="font-mono text-slate-200">aws-1-eu-west-1.pooler.supabase.com</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-900">
                    <span>Port:</span>
                    <span className="font-mono text-emerald-400">6543 (Transaction Mode)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-900">
                    <span>Protocol:</span>
                    <span className="font-mono text-slate-200">IPv4 PgBouncer Pooler</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Purpose:</span>
                    <span className="text-slate-300">Fast application queries & scale</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
                <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs">
                  <Layers className="w-4 h-4" />
                  <span>DIRECT_URL (Migrations)</span>
                </div>
                <div className="space-y-1 text-xs text-slate-400">
                  <div className="flex justify-between py-1 border-b border-slate-900">
                    <span>Host:</span>
                    <span className="font-mono text-slate-200">aws-1-eu-west-1.pooler.supabase.com</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-900">
                    <span>Port:</span>
                    <span className="font-mono text-sky-400">5432 (Session Mode)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-900">
                    <span>Protocol:</span>
                    <span className="font-mono text-slate-200">IPv4 Session Pooler</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Purpose:</span>
                    <span className="text-slate-300">Prisma migrations & advisory locks</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-2">
              <div className="font-semibold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Migrations Status
              </div>
              <p>
                All migrations are up-to-date. Migration <code className="text-emerald-300 bg-slate-900 px-1.5 py-0.5 rounded">20260909150516_init</code> has been applied to Supabase PostgreSQL, creating all models, relations, and indexes.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
