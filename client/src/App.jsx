import { useEffect, useMemo, useState } from "react";
import {
  Wallet, LayoutDashboard, CreditCard, ChartNoAxesColumn, Plus, Search,
  Bell, RefreshCw, Utensils, Car, House, ShoppingBag, HeartPulse, Tag,
  GraduationCap, Pencil, Trash2, X, Download, Menu, ChevronDown, ArrowUpRight,
  CircleDollarSign, CalendarDays, Activity, Filter
} from "lucide-react";

const API = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
const EXPENSES_URL = `${API}/api/expenses`;
const CATEGORIES = ["Food", "Transportation", "Housing", "Shopping", "Health", "Education", "Entertainment", "Bills", "Other"];
const ICONS = { Food: Utensils, Transportation: Car, Housing: House, Shopping: ShoppingBag, Health: HeartPulse, Education: GraduationCap, Other: Tag };

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers }
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  if (!response.ok) throw new Error(data?.message || data?.error || `Request failed (${response.status})`);
  return data;
}
function unwrap(data) {
  if (Array.isArray(data)) return data;
  return data?.expenses || data?.data || data?.results || [];
}
function money(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value) || 0);
}
function dateOnly(value) { return String(value || "").slice(0, 10); }
function niceDate(value) {
  if (!value) return "—";
  const d = new Date(`${dateOnly(value)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}
function monthKey(value) {
  const d = new Date(value || "");
  return Number.isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
function normalize(x) {
  return { ...x, id: x._id || x.id, title: x.title || "Untitled expense", amount: Number(x.amount) || 0,
    category: x.category || "Other", date: dateOnly(x.date || x.createdAt), description: x.description || "" };
}
function Stat({ label, value, note, icon: Icon, color }) {
  return <article className="stat-card"><div className={`stat-icon ${color}`}><Icon size={20}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></article>;
}
function ExpenseForm({ initial, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    title: initial?.title || "", amount: initial?.amount ?? "", category: initial?.category || "Food",
    date: initial?.date || new Date().toISOString().slice(0,10), description: initial?.description || ""
  });
  const [error, setError] = useState("");
  const change = (key, value) => setForm(old => ({ ...old, [key]: value }));
  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return setError("Please enter an expense title.");
    if (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) return setError("Amount must be greater than zero.");
    if (!form.date) return setError("Please choose a date.");
    setError("");
    try { await onSave({ ...form, title: form.title.trim(), amount: Number(form.amount) }); }
    catch (err) { setError(err.message); }
  }
  return <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
      <div className="modal-top"><div><span className="eyebrow">{initial ? "UPDATE RECORD" : "NEW RECORD"}</span><h2 id="form-title">{initial ? "Edit expense" : "Add an expense"}</h2><p>Record where your money goes.</p></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X/></button></div>
      <form className="form-grid" onSubmit={submit}>
        <label className="field span-2">Expense title<input value={form.title} maxLength="100" onChange={e=>change("title",e.target.value)} placeholder="e.g. Lunch at school"/></label>
        <label className="field">Amount (₱)<input type="number" min="0.01" step="0.01" value={form.amount} onChange={e=>change("amount",e.target.value)} placeholder="0.00"/></label>
        <label className="field">Category<select value={form.category} onChange={e=>change("category",e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label>
        <label className="field span-2">Date<input type="date" value={form.date} onChange={e=>change("date",e.target.value)}/></label>
        <label className="field span-2">Description <small>(optional)</small><textarea rows="3" maxLength="500" value={form.description} onChange={e=>change("description",e.target.value)} placeholder="Add a note about this expense..."/></label>
        {error && <p className="form-error span-2">{error}</p>}
        <div className="modal-actions span-2"><button type="button" className="btn secondary" onClick={onClose} disabled={saving}>Cancel</button><button className="btn primary" disabled={saving}>{saving ? "Saving..." : initial ? "Save changes" : "Save expense"}</button></div>
      </form>
    </section>
  </div>;
}
function Empty({ onAdd }) {
  return <div className="empty"><div className="empty-icon"><Wallet size={25}/></div><strong>No expenses found</strong><p>Add an expense or change your filters.</p>{onAdd && <button className="btn primary" onClick={onAdd}><Plus size={16}/> Add expense</button>}</div>;
}
function Table({ items, loading, edit, remove, compact = false }) {
  if (loading) return <div className="loading">Loading expenses…</div>;
  if (!items.length) return <Empty/>;
  return <div className="table-scroll"><table><thead><tr><th>EXPENSE</th><th>CATEGORY</th><th>DATE</th><th>AMOUNT</th><th className="right">ACTIONS</th></tr></thead><tbody>
    {items.map(x=>{ const Icon=ICONS[x.category] || Tag; return <tr key={x.id || `${x.title}-${x.date}`}>
      <td><div className="expense-cell"><div className="expense-symbol"><Icon size={17}/></div><div><strong>{x.title}</strong>{!compact && <small>{x.description || "No description"}</small>}</div></div></td>
      <td><span className="category-pill">{x.category}</span></td><td>{niceDate(x.date)}</td><td className="amount">{money(x.amount)}</td>
      <td><div className="actions"><button className="action edit" title="Edit expense" aria-label={`Edit ${x.title}`} onClick={()=>edit(x)}><Pencil size={15}/></button><button className="action delete" title="Delete expense" aria-label={`Delete ${x.title}`} onClick={()=>remove(x)}><Trash2 size={15}/></button></div></td>
    </tr>;})}
  </tbody></table></div>;
}
export default function App() {
  const [page, setPage] = useState("Dashboard");
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  async function load() {
    setLoading(true); setError("");
    try { setExpenses(unwrap(await api(EXPENSES_URL)).map(normalize)); }
    catch (e) { setError(`${e.message}. Make sure your Express backend is running at ${API}.`); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  const nowKey = new Date().toISOString().slice(0,7);
  const total = expenses.reduce((s,x)=>s+x.amount,0);
  const thisMonth = expenses.filter(x=>monthKey(x.date)===nowKey).reduce((s,x)=>s+x.amount,0);
  const categories = useMemo(() => {
    const sums = {};
    expenses.forEach(x=>sums[x.category]=(sums[x.category]||0)+x.amount);
    return Object.entries(sums).sort((a,b)=>b[1]-a[1]);
  }, [expenses]);
  const months = useMemo(() => Array.from({length:6},(_,i)=>{
    const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-(5-i));
    const key=monthKey(d);
    return {key,label:d.toLocaleDateString("en-PH",{month:"short"}),amount:expenses.filter(x=>monthKey(x.date)===key).reduce((s,x)=>s+x.amount,0)};
  }),[expenses]);
  const filtered = useMemo(()=>expenses.filter(x=>{
    const q=search.trim().toLowerCase();
    return (!q || `${x.title} ${x.category} ${x.description}`.toLowerCase().includes(q))
      && (category==="All categories" || x.category===category)
      && (!from || x.date>=from) && (!to || x.date<=to);
  }).sort((a,b)=>b.date.localeCompare(a.date)),[expenses,search,category,from,to]);

  async function save(values) {
    setSaving(true);
    try {
      if (modal?.expense?.id) {
        await api(`${EXPENSES_URL}/${modal.expense.id}`,{method:"PUT",body:JSON.stringify(values)});
        setNotice("Expense updated successfully.");
      } else {
        await api(EXPENSES_URL,{method:"POST",body:JSON.stringify(values)});
        setNotice("Expense added successfully.");
      }
      setModal(null); await load();
    } finally { setSaving(false); }
  }
  async function remove(x) {
    if (!x.id) return setError("This expense has no ID, so it cannot be deleted.");
    if (!window.confirm(`Delete "${x.title}" (${money(x.amount)})? This cannot be undone.`)) return;
    try { await api(`${EXPENSES_URL}/${x.id}`,{method:"DELETE"}); setNotice("Expense deleted successfully."); await load(); }
    catch(e) { setError(e.message); }
  }
  function exportCsv() {
    const rows=[["Title","Amount (PHP)","Category","Date","Description"],...filtered.map(x=>[x.title,x.amount,x.category,x.date,x.description])];
    const csv=rows.map(row=>row.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\r\n");
    const link=document.createElement("a"); const url=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));
    link.href=url; link.download="spendr-transactions.csv"; link.click(); URL.revokeObjectURL(url);
  }
  const nav=[["Dashboard",LayoutDashboard],["Transactions",CreditCard],["Reports",ChartNoAxesColumn]];
  return <div className="app">
    {menuOpen && <button className="scrim" onClick={()=>setMenuOpen(false)} aria-label="Close menu"/>}
    <aside className={`sidebar ${menuOpen?"open":""}`}>
      <div className="brand"><div className="brand-mark"><Wallet size={23}/></div><div><strong>spendr<span>.</span></strong><small>PERSONAL FINANCE</small></div><button className="icon-btn close-menu" onClick={()=>setMenuOpen(false)}><X size={19}/></button></div>
      <div className="nav-caption">WORKSPACE</div><nav>{nav.map(([label,Icon])=><button key={label} className={`nav-item ${page===label?"active":""}`} onClick={()=>{setPage(label);setMenuOpen(false)}}><Icon size={19}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="tip-card"><div className="tip-icon"><Activity size={18}/></div><strong>Stay in control</strong><p>Small steps today build healthier money habits.</p></div><div className="profile"><div className="avatar">M</div><div><strong>My Spendr</strong><small>Personal account</small></div><span className="dots">•••</span></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="top-left"><button className="icon-btn mobile-menu" onClick={()=>setMenuOpen(true)} aria-label="Open menu"><Menu/></button><div><div className="breadcrumb">Workspace <span>/</span> <b>{page}</b></div><p>Here's what's happening with your money.</p></div></div><div className="top-actions"><button className="icon-btn" onClick={load} title="Refresh data" aria-label="Refresh data"><RefreshCw size={18}/></button><button className="icon-btn bell" aria-label="Notifications"><Bell size={18}/><i/></button><div className="top-divider"/><div className="account"><div className="avatar small">M</div><span>My account</span><ChevronDown size={15}/></div></div></header>
      <div className="content">
        {error && <div className="alert error"><div><strong>Could not load your data</strong><p>{error}</p></div><button className="icon-btn" onClick={()=>setError("")}><X size={17}/></button></div>}
        {notice && <div className="alert success"><span>{notice}</span><button className="icon-btn" onClick={()=>setNotice("")}><X size={17}/></button></div>}
        <div className="page-heading"><div><span className="eyebrow">{page==="Dashboard"?"YOUR FINANCIAL OVERVIEW":page==="Transactions"?"YOUR RECORDS":"INSIGHTS & ANALYTICS"}</span><h1>{page==="Dashboard"?"Good day! ✦":page}</h1><p>{page==="Dashboard"?"Keep an eye on your spending and stay on track.":page==="Transactions"?"Manage, search, and organize all your expenses.":"Understand your spending patterns at a glance."}</p></div><button className="btn primary" onClick={()=>setModal({expense:null})}><Plus size={17}/> Add expense</button></div>
        {page==="Dashboard" && <>
          <div className="stats"><Stat label="Total expenses" value={loading?"—":money(total)} note="Across all recorded transactions" icon={Wallet} color="blue"/><Stat label="This month" value={loading?"—":money(thisMonth)} note="Current calendar month" icon={CalendarDays} color="purple"/><Stat label="Transactions" value={loading?"—":expenses.length} note="Total recorded expenses" icon={CreditCard} color="cyan"/><Stat label="Average expense" value={loading?"—":money(expenses.length?total/expenses.length:0)} note="Average per transaction" icon={CircleDollarSign} color="orange"/></div>
          <div className="grid">
            <section className="panel"><div className="panel-head"><div><h2>Spending overview</h2><p>Monthly expenses over the last six months</p></div><span className="live"><i/> Live overview</span></div><div className="chart-total">{money(thisMonth)}<small>This month</small></div><div className="bar-chart">{months.map(m=>{const max=Math.max(...months.map(x=>x.amount),1);return <div className="bar-column" key={m.key}><div className="bar-track"><div className={`bar ${m.key===nowKey?"current":""}`} style={{height:`${m.amount?Math.max(5,m.amount/max*100):2}%`}} title={money(m.amount)}/></div><span>{m.label}</span></div>})}</div><div className="chart-foot"><span><i/> Monthly spending</span><span>PHP · Last 6 months</span></div></section>
            <section className="panel"><div className="panel-head"><div><h2>Spending by category</h2><p>Where your money goes</p></div><button className="link-btn" onClick={()=>setPage("Reports")}>View report <ArrowUpRight size={14}/></button></div>
              {!categories.length&&!loading?<Empty onAdd={()=>setModal({expense:null})}/>:<div className="category-list">{categories.slice(0,6).map(([name,amount],i)=>{const Icon=ICONS[name]||Tag;return <div className="category-row" key={name}><div className={`category-icon c${i%5}`}><Icon size={17}/></div><div className="category-info"><div className="category-label"><strong>{name}</strong><b>{money(amount)}</b></div><div className="progress"><div className={`progress-fill p${i%5}`} style={{width:`${total?amount/total*100:0}%`}}/></div><small>{(total?amount/total*100:0).toFixed(1)}% of total</small></div></div>})}</div>}
            </section>
          </div>
          <section className="panel transactions-panel"><div className="panel-head table-title"><div><h2>Recent transactions</h2><p>Your latest recorded expenses</p></div><button className="link-btn" onClick={()=>setPage("Transactions")}>View all <ArrowUpRight size={14}/></button></div><Table items={[...expenses].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5)} loading={loading} edit={x=>setModal({expense:x})} remove={remove} compact/></section>
        </>}
        {page==="Transactions" && <section className="panel transactions-panel full-panel"><div className="toolbar"><label className="search"><Search size={17}/><input placeholder="Search expenses..." value={search} onChange={e=>setSearch(e.target.value)}/></label><label className="filter"><Filter size={15}/><select value={category} onChange={e=>setCategory(e.target.value)}><option>All categories</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label><label className="date-field"><span>From</span><input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label className="date-field"><span>To</span><input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><button className="btn secondary" onClick={exportCsv}><Download size={15}/> Export CSV</button></div><div className="result-line"><span><b>{filtered.length}</b> transactions found</span><button className="link-btn" onClick={()=>{setSearch("");setCategory("All categories");setFrom("");setTo("")}}>Clear filters</button></div><Table items={filtered} loading={loading} edit={x=>setModal({expense:x})} remove={remove}/></section>}
        {page==="Reports" && <>
          <div className="stats"><Stat label="All-time spending" value={money(total)} note="All recorded expenses" icon={Wallet} color="blue"/><Stat label="This month" value={money(thisMonth)} note="Current calendar month" icon={CalendarDays} color="purple"/><Stat label="Categories used" value={categories.length} note="Distinct categories" icon={Tag} color="cyan"/><Stat label="Transactions" value={expenses.length} note="Recorded expenses" icon={CreditCard} color="orange"/></div>
          <div className="grid"><section className="panel"><div className="panel-head"><div><h2>Monthly spending</h2><p>Six-month comparison</p></div></div><div className="report-months">{months.map(m=>{const max=Math.max(...months.map(x=>x.amount),1);return <div key={m.key}><div className="month-label"><span>{m.label}</span><b>{money(m.amount)}</b></div><div className="progress tall"><div className="progress-fill" style={{width:`${m.amount?m.amount/max*100:0}%`}}/></div></div>})}</div></section><section className="panel"><div className="panel-head"><div><h2>Category breakdown</h2><p>Share of all-time spending</p></div></div><div className="category-list">{categories.map(([name,amount],i)=>{const Icon=ICONS[name]||Tag;return <div className="category-row" key={name}><div className={`category-icon c${i%5}`}><Icon size={17}/></div><div className="category-info"><div className="category-label"><strong>{name}</strong><b>{money(amount)}</b></div><div className="progress"><div className={`progress-fill p${i%5}`} style={{width:`${total?amount/total*100:0}%`}}/></div><small>{(total?amount/total*100:0).toFixed(1)}%</small></div></div>})}</div></section></div>
          <section className="panel report-note"><div className="note-icon"><Wallet size={20}/></div><div><strong>Your numbers, your decisions.</strong><p>Reports are calculated from the expense records returned by your Spendr API.</p></div></section>
        </>}
        <footer><span>© {new Date().getFullYear()} Spendr. Take control of your money.</span><span><i/> Connected to your local API when server is available</span></footer>
      </div>
    </main>
    {modal && <ExpenseForm initial={modal.expense} onClose={()=>!saving&&setModal(null)} onSave={save} saving={saving}/>}
  </div>;
}