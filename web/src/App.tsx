import { useCallback, useEffect, useState } from "react";
import { api, type Policy, type Ticket, type TicketDetail } from "./api";

type Tab = "inbox" | "import" | "policies" | "stats";

const CHANNEL_LABEL: Record<string, string> = { shopee: "Shopee", tiktok: "TikTok", manual: "Manual" };
const FLAG_LABEL: Record<string, string> = {
  possible_overpromise: "Possible promise of refund, replacement or delivery: check before sending",
  mentions_amount: "Mentions an amount of money",
  needs_mom_decision: "Needs your decision (refund, compensation or exception)",
  cites_unknown_policy: "Relies on a policy that is not in the policy table",
};

export function App() {
  const [tab, setTab] = useState<Tab>("inbox");
  return (
    <div className="app">
      <header>
        <h1>Shop Inbox</h1>
        <nav>
          {(["inbox", "import", "policies", "stats"] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>
      </header>
      {tab === "inbox" && <Inbox />}
      {tab === "import" && <Import />}
      {tab === "policies" && <Policies />}
      {tab === "stats" && <Stats />}
    </div>
  );
}

function Inbox() {
  const [view, setView] = useState<"open" | "replied">("open");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api.tickets(view).then(setTickets, (e) => setError(String(e)));
  }, [view]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000); // new messages and finished triage show up without a reload
    return () => clearInterval(timer);
  }, [load]);

  return (
    <main className="inbox">
      <aside>
        <div className="toggle">
          <button className={view === "open" ? "active" : ""} onClick={() => setView("open")}>
            Open
          </button>
          <button className={view === "replied" ? "active" : ""} onClick={() => setView("replied")}>
            Done
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        {tickets.length === 0 && <p className="muted">Nothing here.</p>}
        <ul>
          {tickets.map((t) => (
            <li key={t.id} className={selected === t.id ? "selected" : ""} onClick={() => setSelected(t.id)}>
              <div className="row">
                <span className={`prio ${t.priority ?? "new"}`}>{t.priority ?? (t.status === "error" ? "ERR" : "…")}</span>
                <span className={`chan ${t.channel}`}>{CHANNEL_LABEL[t.channel]}</span>
                {t.needs_human && <span className="badge">needs you</span>}
                <span className="time">{timeAgo(t.last_message_at)}</span>
              </div>
              <div className="preview">{t.preview ?? "[non-text message]"}</div>
              <div className="meta">
                {t.category?.replace(/_/g, " ") ?? "triaging…"} {t.language && `· ${t.language}`}
              </div>
            </li>
          ))}
        </ul>
      </aside>
      <section>{selected ? <TicketView id={selected} onDone={load} /> : <p className="muted">Pick a conversation.</p>}</section>
    </main>
  );
}

function TicketView({ id, onDone }: { id: string; onDone: () => void }) {
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [text, setText] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(() => {
    api.ticket(id).then((d) => {
      setDetail(d);
      setText(d.draft?.text ?? "");
    });
  }, [id]);
  useEffect(() => {
    setNote(null);
    load();
  }, [load]);

  if (!detail) return <p className="muted">Loading…</p>;
  const { ticket, messages, draft, order } = detail;

  async function send() {
    if (!draft) return;
    if (draft.safety_flags.includes("possible_overpromise") && !confirm("This draft may promise something. Send anyway?")) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard can be blocked; the text is still in the box to copy by hand
    }
    const r = await api.review(draft.id, text);
    setNote(`Copied. Paste it in ${CHANNEL_LABEL[ticket.channel]} and send. (Edited ${Math.round(r.editRatio * 100)}%)`);
    onDone();
  }

  return (
    <div className="ticket">
      <div className="ticket-head">
        <span className={`prio ${ticket.priority ?? "new"}`}>{ticket.priority ?? "…"}</span>
        <strong>{ticket.category?.replace(/_/g, " ") ?? "not triaged yet"}</strong>
        <span className="muted">
          {CHANNEL_LABEL[ticket.channel]} · {ticket.buyer_ref} · {ticket.language ?? "?"}
        </span>
      </div>
      {ticket.priority_reasons.length > 0 && (
        <ul className="reasons">
          {ticket.priority_reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}

      <div className="thread">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.sender_type}`}>
            {m.message_type === "text" ? m.text : <em>[{m.message_type}] open the platform app to see it</em>}
            <time>{new Date(m.created_at_channel).toLocaleString()}</time>
          </div>
        ))}
      </div>

      <div className="order">
        <h3>Order</h3>
        {order ? (
          <dl>
            <dt>Order</dt>
            <dd>
              {order.channel_order_id} {order.sitegiant_order_no && <span className="muted">({order.sitegiant_order_no})</span>}
            </dd>
            <dt>Status</dt>
            <dd>{order.status}</dd>
            <dt>Items</dt>
            <dd>{order.items.map((it) => `${it.qty}× ${it.name}${it.variant ? ` (${it.variant})` : ""}`).join(", ")}</dd>
            {order.tracking_no && (
              <>
                <dt>Tracking</dt>
                <dd>{order.tracking_no}</dd>
              </>
            )}
            {order.promised_delivery_at && (
              <>
                <dt>Promised by</dt>
                <dd>{new Date(order.promised_delivery_at).toLocaleDateString()}</dd>
              </>
            )}
          </dl>
        ) : (
          <p className="muted">
            {ticket.extracted_order_ref ? `No single match for "${ticket.extracted_order_ref}".` : "No order number found."}
          </p>
        )}
      </div>

      <div className="draft">
        <h3>Draft reply</h3>
        {draft ? (
          <>
            {draft.safety_flags.map((f) => (
              <p key={f} className={f === "possible_overpromise" ? "warn strong" : "warn"}>
                {FLAG_LABEL[f] ?? f}
              </p>
            ))}
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} />
            <p className="muted small">
              Based on: {draft.policy_refs.map((p) => `${p.topic} v${p.version}`).join(", ") || "no policy"} · {draft.model}
              {draft.cost && ` · $${Number(draft.cost).toFixed(4)}`}
            </p>
            <div className="actions">
              <button className="primary" onClick={send} disabled={ticket.status === "replied"}>
                Copy & mark replied
              </button>
              <button onClick={() => api.retriage(id).then(() => setNote("Re-running triage…"))}>Redo draft</button>
              <button onClick={() => api.close(id).then(onDone)}>No reply needed</button>
            </div>
          </>
        ) : (
          <>
            <p className="muted">
              {ticket.needs_human ? "No draft: this one needs you (non-text, unclear, or low confidence)." : "Draft not ready yet."}
            </p>
            <div className="actions">
              <button onClick={() => api.retriage(id).then(() => setNote("Re-running triage…"))}>Try again</button>
              <button onClick={() => api.close(id).then(onDone)}>Mark done</button>
            </div>
          </>
        )}
        {note && <p className="note">{note}</p>}
      </div>
    </div>
  );
}

function Import() {
  const [channel, setChannel] = useState("shopee");
  const [buyer, setBuyer] = useState("");
  const [text, setText] = useState("");
  const [json, setJson] = useState("");
  const [result, setResult] = useState<string | null>(null);

  async function paste() {
    const r = await api.importPaste({ channel, buyer, text });
    setResult(`Stored ${r.stored}, duplicates ${r.duplicates}, queued ${r.ticketsQueued}`);
    setText("");
  }

  async function importJson(kind: "messages" | "orders") {
    try {
      setResult(JSON.stringify(await api.importJson(kind, JSON.parse(json))));
    } catch (e) {
      setResult(String(e));
    }
  }

  return (
    <main className="page">
      <h2>Paste a conversation</h2>
      <p className="muted">
        One message per line. Start buyer lines with <code>B:</code> and your replies with <code>S:</code>.
      </p>
      <div className="form">
        <select value={channel} onChange={(e) => setChannel(e.target.value)}>
          <option value="shopee">Shopee</option>
          <option value="tiktok">TikTok Shop</option>
        </select>
        <input placeholder="Buyer username (stored as a pseudonym)" value={buyer} onChange={(e) => setBuyer(e.target.value)} />
        <textarea rows={6} placeholder={"B: hi, my parcel not yet arrive\nS: let me check\nB: ok"} value={text} onChange={(e) => setText(e.target.value)} />
        <button className="primary" disabled={!buyer || !text} onClick={paste}>
          Import
        </button>
      </div>

      <h2>Import JSON</h2>
      <p className="muted">An array of messages or orders. See data/synthetic in the repository for the format.</p>
      <textarea rows={8} value={json} onChange={(e) => setJson(e.target.value)} />
      <div className="actions">
        <button onClick={() => importJson("messages")}>Import messages</button>
        <button onClick={() => importJson("orders")}>Import orders</button>
      </div>
      {result && <p className="note">{result}</p>}
    </main>
  );
}

function Policies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [draft, setDraft] = useState({ scope: "shop", topic: "", text: "" });
  const load = () => void api.policies().then(setPolicies);
  useEffect(load, []);

  return (
    <main className="page">
      <h2>Shop policies</h2>
      <p className="muted">Drafts may only rely on these. Saving a topic again creates a new version; old drafts keep pointing at the version they used.</p>
      <table>
        <thead>
          <tr>
            <th>Scope</th>
            <th>Topic</th>
            <th>Version</th>
            <th>Text</th>
          </tr>
        </thead>
        <tbody>
          {policies.map((p) => (
            <tr key={p.id} onClick={() => setDraft({ scope: p.scope, topic: p.topic, text: p.text })}>
              <td>{p.scope}</td>
              <td>{p.topic}</td>
              <td>v{p.version}</td>
              <td>{p.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="form">
        <select value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value })}>
          <option value="shop">All channels</option>
          <option value="shopee">Shopee only</option>
          <option value="tiktok">TikTok only</option>
        </select>
        <input placeholder="topic (returns, refunds, shipping, …)" value={draft.topic} onChange={(e) => setDraft({ ...draft, topic: e.target.value })} />
        <textarea rows={3} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
        <button className="primary" disabled={!draft.topic || !draft.text} onClick={() => api.addPolicy(draft).then(load)}>
          Save new version
        </button>
      </div>
    </main>
  );
}

function Stats() {
  const [stats, setStats] = useState<Record<string, string | number | null> | null>(null);
  useEffect(() => void api.stats().then(setStats), []);
  return (
    <main className="page">
      <h2>Numbers</h2>
      {stats && (
        <table>
          <tbody>
            {Object.entries(stats).map(([k, v]) => (
              <tr key={k}>
                <th>{k.replace(/_/g, " ")}</th>
                <td>{v ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}
