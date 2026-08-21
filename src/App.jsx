import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search, Plus, Trash2, Pencil, LogOut, Package, Image as ImageIcon,
  Warehouse, ClipboardCheck, Undo2, BarChart3, ArrowRightLeft, X
} from "lucide-react";
import { supabase } from "./supabaseClient";

const SELLER_NAMES = ["Azizxon", "Doniyorjon", "Jahongir", "Javohirbek", "Hamidjon", "Jamshidbek", "Xislatbek", "Mubashirxon", "Jahongiroldi"];
const ORANGE = "#E9642B";
const ORANGE_DARK = "#C24F1F";
const PURPLE_DARK = "#3D2A54";
const PURPLE = "#4D3966";
const PURPLE_BORDER = "#5D4976";

function fmt(n) { return "$" + (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function formatDate(iso) {
  try { return new Date(iso).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch (e) { return iso; }
}

function LogoMark({ size = 20, sub = true }) {
  return (
    <img src="/logo.png" alt="MARBA" style={{ height: size * 2.6, width: "auto", borderRadius: "50%" }} />
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [sellerName, setSellerName] = useState("");
  const [loginName, setLoginName] = useState(null);
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState("ombor");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) initSeller(data.session); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) initSeller(s); else { setSession(null); setSellerName(""); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function initSeller(s) {
    setSession(s);
    const { data } = await supabase.from("sellers").select("name").eq("auth_user_id", s.user.id).maybeSingle();
    setSellerName(data?.name || s.user.email.split("@")[0]);
  }

  async function doLogin() {
    if (!loginName) { setLoginError("Xodimni tanlang"); return; }
    setBusy(true);
    const email = `${loginName.toLowerCase()}@marba.internal`;
    const { error } = await supabase.auth.signInWithPassword({ email, password: loginPass });
    setBusy(false);
    if (error) { setLoginError("Parol noto'g'ri"); return; }
    setLoginPass(""); setLoginError("");
  }
  async function doLogout() { await supabase.auth.signOut(); }

  if (!session) {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", minHeight: 500, display: "flex", alignItems: "center", justifyContent: "center", background: PURPLE_DARK, padding: 24 }}>
        <style>{css}</style>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}><LogoMark size={26} /></div>
          <div className="ob-card" style={{ background: PURPLE, border: `1px solid ${PURPLE_BORDER}` }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Xodimni tanlang</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
              {SELLER_NAMES.map((n) => (
                <button key={n} onClick={() => { setLoginName(n); setLoginError(""); }} className="ob-btn"
                  style={{ background: loginName === n ? ORANGE : PURPLE_DARK, color: "#fff", fontSize: 13, padding: "10px 8px" }}>{n}</button>
              ))}
            </div>
            <div style={{ color: "#d9d0e6", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Parol</div>
            <input type="password" className="ob-input" style={{ background: PURPLE_DARK, border: `1.5px solid ${PURPLE_BORDER}`, color: "#fff", marginBottom: 12 }}
              value={loginPass} onChange={(e) => setLoginPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doLogin()} placeholder="Parolni kiriting" />
            {loginError && <div style={{ color: "#f0837f", fontSize: 13, marginBottom: 10 }}>{loginError}</div>}
            <button className="ob-btn ob-btn-primary" style={{ width: "100%" }} disabled={busy} onClick={doLogin}>{busy ? "..." : "Kirish"}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", minHeight: 500, background: PURPLE, color: "#161615" }}>
      <style>{css}</style>

      <div style={{ background: PURPLE_DARK, padding: "10px 20px", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", borderBottom: `1px solid ${PURPLE_BORDER}` }}>
        <img src="/logo.png" alt="MARBA" style={{ height: 42, width: 42, borderRadius: "50%", flexShrink: 0 }} />
        <div style={{ width: 1, height: 28, background: PURPLE_BORDER, flexShrink: 0 }} />
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
          <NavTab icon={<Package size={16} />} label="Ombor" active={section === "ombor"} onClick={() => setSection("ombor")} />
          <NavTab icon={<Warehouse size={16} />} label="Uy ombor" active={section === "uyombor"} onClick={() => setSection("uyombor")} />
          <NavTab icon={<ClipboardCheck size={16} />} label="Reviziya" active={section === "reviziya"} onClick={() => setSection("reviziya")} />
          <NavTab icon={<Undo2 size={16} />} label="Vazvrat" active={section === "vazvrat"} onClick={() => setSection("vazvrat")} />
          <NavTab icon={<BarChart3 size={16} />} label="Statistika" active={section === "statistika"} onClick={() => setSection("statistika")} />
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ color: "#d9d0e6", fontSize: 13.5 }}>Xodim: <b style={{ color: "#fff" }}>{sellerName}</b></span>
          <button className="ob-btn ob-btn-ghost" style={{ color: "#fff", borderColor: PURPLE_BORDER, display: "flex", alignItems: "center", gap: 6, padding: "8px 12px" }} onClick={doLogout}><LogOut size={15} /> Chiqish</button>
        </div>
      </div>

      <div style={{ padding: 20, maxWidth: 1400, margin: "0 auto" }}>
        {section === "ombor" && <OmborSection sellerName={sellerName} />}
        {section === "uyombor" && <UyOmborSection sellerName={sellerName} />}
        {section === "reviziya" && <ReviziyaSection sellerName={sellerName} />}
        {section === "vazvrat" && <VazvratSection sellerName={sellerName} />}
        {section === "statistika" && <StatistikaSection />}
      </div>
    </div>
  );
}

function NavTab({ icon, label, active, onClick }) {
  return (
    <div className={`ob-tab ${active ? "active" : ""}`} onClick={onClick}>{icon} {label}</div>
  );
}

/* ---------------- OMBOR (asosiy) ---------------- */
function OmborSection() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { refresh(); }, []);
  async function refresh() {
    const { data } = await supabase.from("products").select("*").order("name");
    setProducts(data || []);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  async function uploadImage(file) {
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("part-images").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("part-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function saveForm() {
    if (!form.name.trim()) return;
    setUploading(true);
    let imageUrl = form.image_url || null;
    try { if (form.imageFile) imageUrl = await uploadImage(form.imageFile); }
    catch (e) { alert("Rasm yuklashda xatolik: " + e.message); setUploading(false); return; }
    const payload = { name: form.name.trim(), price: Number(form.price) || 0, cost_price: Number(form.cost_price) || 0, qty: Number(form.qty) || 0, image_url: imageUrl };
    if (form.id) await supabase.from("products").update(payload).eq("id", form.id);
    else await supabase.from("products").insert(payload);
    setUploading(false); setForm(null); refresh();
  }
  async function deleteItem(id) {
    if (!confirm("O'chirishga ishonchingiz komilmi?")) return;
    await supabase.from("products").delete().eq("id", id);
    refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "#8a887e" }} />
          <input className="ob-input" style={{ paddingLeft: 36 }} placeholder="Nomini yozing (masalan: fil → filtr topiladi)" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="ob-btn ob-btn-primary" onClick={() => setForm({ name: "", price: "", cost_price: "", qty: "", image_url: null, imageFile: null })}>
          <Plus size={14} style={{ verticalAlign: -2 }} /> Yangi tovar
        </button>
      </div>

      {form && (
        <ProductForm form={form} setForm={setForm} uploading={uploading} onSave={saveForm} onCancel={() => setForm(null)} fileInputRef={fileInputRef} />
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {filtered.length === 0 ? (
          <EmptyState text="Hech narsa topilmadi." />
        ) : filtered.map((p) => (
          <ProductRow key={p.id} p={p}
            onEdit={() => setForm({ id: p.id, name: p.name, price: p.price, cost_price: p.cost_price, qty: p.qty, image_url: p.image_url, imageFile: null })}
            onDelete={() => deleteItem(p.id)} />
        ))}
      </div>
    </div>
  );
}

function ProductForm({ form, setForm, uploading, onSave, onCancel, fileInputRef }) {
  return (
    <div className="ob-card" style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>{form.id ? "Tahrirlash" : "Yangi tovar kiritish"}</div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div onClick={() => fileInputRef.current?.click()}
            style={{ width: 110, height: 110, borderRadius: 10, border: "2px dashed #d8d6cc", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", background: "#f7f6f1" }}>
            {form.imageFile ? <img src={URL.createObjectURL(form.imageFile)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : form.image_url ? <img src={form.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <ImageIcon size={24} color="#8a887e" />}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => setForm({ ...form, imageFile: e.target.files[0] })} />
          <div style={{ fontSize: 11, color: "#8a887e", textAlign: "center", marginTop: 4 }}>Rasm</div>
        </div>
        <div style={{ flex: 1, minWidth: 220, display: "grid", gap: 10 }}>
          <input className="ob-input" placeholder="Nomi" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input type="number" className="ob-input" placeholder="Kirim narxi ($)" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
            <input type="number" className="ob-input" placeholder="Sotuv narxi ($)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <input type="number" className="ob-input" placeholder="Miqdori" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button className="ob-btn ob-btn-primary" disabled={uploading || !form.name.trim()} onClick={onSave}>{uploading ? "Yuklanmoqda..." : "Saqlash"}</button>
        <button className="ob-btn ob-btn-ghost" onClick={onCancel}>Bekor qilish</button>
      </div>
    </div>
  );
}

function ProductRow({ p, onEdit, onDelete, extra }) {
  return (
    <div className="ob-card" style={{ display: "flex", alignItems: "center", gap: 14, padding: 14 }}>
      <div style={{ width: 56, height: 56, borderRadius: 8, background: "#f7f6f1", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {p.image_url ? <img src={p.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={20} color="#c9c7bd" />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14.5 }}>{p.name}</div>
        <div style={{ fontSize: 12.5, color: "#8a887e" }}>
          Kirim: {fmt(p.cost_price)} • Sotuv: {fmt(p.price)} • Miqdor: <span style={{ color: p.qty <= 0 ? "#c0392b" : "inherit", fontWeight: p.qty <= 0 ? 700 : 400 }}>{p.qty}</span>
        </div>
        <div style={{ fontSize: 12, color: "#2c7a4b", fontWeight: 600, marginTop: 2 }}>Foyda (birlik): {fmt((Number(p.price) || 0) - (Number(p.cost_price) || 0))}</div>
      </div>
      {extra}
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button className="ob-btn ob-btn-ghost" style={{ padding: "7px 9px" }} onClick={onEdit}><Pencil size={14} /></button>
        <button className="ob-btn ob-btn-danger" style={{ padding: "7px 9px" }} onClick={onDelete}><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="ob-card" style={{ textAlign: "center", color: "#8a887e", padding: "30px 0" }}>
      <Package size={28} style={{ marginBottom: 8 }} />
      <div>{text}</div>
    </div>
  );
}

/* ---------------- UY OMBOR ---------------- */
function UyOmborSection({ sellerName }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [transferQty, setTransferQty] = useState({});
  const [transferring, setTransferring] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { refresh(); }, []);
  async function refresh() {
    const { data } = await supabase.from("uy_ombor").select("*").order("name");
    setItems(data || []);
  }
  async function loadHistory() {
    const { data } = await supabase.from("uy_ombor_transfers").select("*").order("created_at", { ascending: false }).limit(50);
    setHistory(data || []);
    setShowHistory(true);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => p.name.toLowerCase().includes(q));
  }, [items, search]);

  async function uploadImage(file) {
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("part-images").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("part-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function saveForm() {
    if (!form.name.trim()) return;
    setUploading(true);
    let imageUrl = form.image_url || null;
    try { if (form.imageFile) imageUrl = await uploadImage(form.imageFile); }
    catch (e) { alert("Rasm yuklashda xatolik: " + e.message); setUploading(false); return; }
    const payload = { name: form.name.trim(), price: Number(form.price) || 0, cost_price: Number(form.cost_price) || 0, qty: Number(form.qty) || 0, image_url: imageUrl };
    if (form.id) await supabase.from("uy_ombor").update(payload).eq("id", form.id);
    else await supabase.from("uy_ombor").insert(payload);
    setUploading(false); setForm(null); refresh();
  }
  async function deleteItem(id) {
    if (!confirm("O'chirishga ishonchingiz komilmi?")) return;
    await supabase.from("uy_ombor").delete().eq("id", id);
    refresh();
  }

  async function transferToOmbor(item) {
    const qty = Math.max(1, Math.min(Number(transferQty[item.id]) || 1, item.qty));
    if (item.qty <= 0) return;
    setTransferring(item.id);

    const { data: existing } = await supabase.from("products").select("*").eq("name", item.name).maybeSingle();
    if (existing) {
      await supabase.from("products").update({ qty: existing.qty + qty }).eq("id", existing.id);
    } else {
      await supabase.from("products").insert({ name: item.name, price: item.price, cost_price: item.cost_price, qty, image_url: item.image_url });
    }
    await supabase.from("uy_ombor").update({ qty: item.qty - qty }).eq("id", item.id);
    await supabase.from("uy_ombor_transfers").insert({ product_name: item.name, qty, seller_name: sellerName });

    setTransferring(null);
    setTransferQty((d) => ({ ...d, [item.id]: 1 }));
    refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "#8a887e" }} />
          <input className="ob-input" style={{ paddingLeft: 36 }} placeholder="Nomini yozing..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="ob-btn ob-btn-ghost" onClick={loadHistory}>Obmen tarixi</button>
        <button className="ob-btn ob-btn-primary" onClick={() => setForm({ name: "", price: "", cost_price: "", qty: "", image_url: null, imageFile: null })}>
          <Plus size={14} style={{ verticalAlign: -2 }} /> Yangi tovar
        </button>
      </div>

      {form && <ProductForm form={form} setForm={setForm} uploading={uploading} onSave={saveForm} onCancel={() => setForm(null)} fileInputRef={fileInputRef} />}

      {showHistory && (
        <div className="ob-card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontWeight: 700 }}>Obmen tarixi</div>
            <button className="ob-btn ob-btn-ghost" style={{ padding: "5px 9px" }} onClick={() => setShowHistory(false)}><X size={14} /></button>
          </div>
          {history.length === 0 ? <div style={{ color: "#8a887e", fontSize: 13.5 }}>Hali obmen bo'lmagan.</div> : (
            <div style={{ display: "grid", gap: 8 }}>
              {history.map((h) => (
                <div key={h.id} style={{ fontSize: 13, display: "flex", justifyContent: "space-between", borderBottom: "1px solid #efeee7", paddingBottom: 6 }}>
                  <span>{h.product_name} — {h.qty} dona</span>
                  <span style={{ color: "#8a887e" }}>{h.seller_name} • {formatDate(h.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {filtered.length === 0 ? <EmptyState text="Uy omborda hech narsa yo'q." /> : filtered.map((p) => (
          <ProductRow key={p.id} p={p}
            onEdit={() => setForm({ id: p.id, name: p.name, price: p.price, cost_price: p.cost_price, qty: p.qty, image_url: p.image_url, imageFile: null })}
            onDelete={() => deleteItem(p.id)}
            extra={
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginRight: 6 }}>
                <input type="number" min="1" max={p.qty} className="ob-input" style={{ width: 64, padding: "6px 8px" }}
                  value={transferQty[p.id] ?? 1} onChange={(e) => setTransferQty((d) => ({ ...d, [p.id]: e.target.value }))} />
                <button className="ob-btn ob-btn-dark" style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: 4 }}
                  disabled={p.qty <= 0 || transferring === p.id} onClick={() => transferToOmbor(p)}>
                  <ArrowRightLeft size={13} /> Omborga
                </button>
              </div>
            } />
        ))}
      </div>
    </div>
  );
}

/* ---------------- REVIZIYA ---------------- */
function ReviziyaSection({ sellerName }) {
  const [products, setProducts] = useState([]);
  const [actuals, setActuals] = useState({});
  const [savedIds, setSavedIds] = useState({});
  const [history, setHistory] = useState([]);

  useEffect(() => { refresh(); loadHistory(); }, []);
  async function refresh() {
    const { data } = await supabase.from("products").select("*").order("name");
    setProducts(data || []);
  }
  async function loadHistory() {
    const { data } = await supabase.from("reviziyalar").select("*").order("created_at", { ascending: false }).limit(30);
    setHistory(data || []);
  }

  async function saveCheck(p) {
    const actual = Number(actuals[p.id]);
    if (isNaN(actual) || actual < 0) return;
    const diff = actual - p.qty;
    await supabase.from("reviziyalar").insert({
      product_id: p.id, product_name: p.name, expected_qty: p.qty, actual_qty: actual, difference: diff, seller_name: sellerName,
    });
    await supabase.from("products").update({ qty: actual }).eq("id", p.id);
    setSavedIds((s) => ({ ...s, [p.id]: true }));
    refresh(); loadHistory();
  }

  return (
    <div>
      <div className="ob-card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Reviziya — qoldiqni tekshirish</div>
        <div style={{ fontSize: 13, color: "#8a887e" }}>Har bir tovar uchun ombordagi haqiqiy sonini kiriting va saqlang. Farq bo'lsa avtomatik qayd etiladi va ombor qoldig'i yangilanadi.</div>
      </div>
      <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
        {products.map((p) => {
          const actual = actuals[p.id];
          const diff = actual !== undefined && actual !== "" ? Number(actual) - p.qty : null;
          return (
            <div key={p.id} className="ob-card" style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{p.name}</div>
                <div style={{ fontSize: 12.5, color: "#8a887e" }}>Tizimda: {p.qty} dona</div>
              </div>
              <input type="number" className="ob-input" style={{ width: 100 }} placeholder="Haqiqiy son"
                value={actuals[p.id] ?? ""} onChange={(e) => setActuals((a) => ({ ...a, [p.id]: e.target.value }))} />
              {diff !== null && !isNaN(diff) && (
                <div style={{ fontSize: 13, fontWeight: 700, color: diff === 0 ? "#2c7a4b" : "#a1281f", minWidth: 90 }}>
                  {diff === 0 ? "Mos keladi" : diff > 0 ? `+${diff} ortiq` : `${diff} kam`}
                </div>
              )}
              <button className="ob-btn ob-btn-primary" style={{ padding: "8px 14px" }} disabled={actuals[p.id] === undefined || actuals[p.id] === ""} onClick={() => saveCheck(p)}>
                {savedIds[p.id] ? "Saqlandi ✓" : "Saqlash"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="ob-card">
        <div style={{ fontWeight: 700, marginBottom: 10 }}>So'nggi reviziyalar</div>
        {history.length === 0 ? <div style={{ color: "#8a887e", fontSize: 13.5 }}>Hali reviziya qilinmagan.</div> : (
          <div style={{ display: "grid", gap: 8 }}>
            {history.map((h) => (
              <div key={h.id} style={{ fontSize: 13, display: "flex", justifyContent: "space-between", borderBottom: "1px solid #efeee7", paddingBottom: 6, flexWrap: "wrap", gap: 4 }}>
                <span>{h.product_name}: {h.expected_qty} → {h.actual_qty} <span style={{ color: h.difference === 0 ? "#2c7a4b" : "#a1281f", fontWeight: 700 }}>({h.difference > 0 ? "+" : ""}{h.difference})</span></span>
                <span style={{ color: "#8a887e" }}>{h.seller_name} • {formatDate(h.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- VAZVRAT ---------------- */
function VazvratSection({ sellerName }) {
  const [customerId, setCustomerId] = useState("");
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [amount, setAmount] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => { loadProducts(); loadHistory(); }, []);
  async function loadProducts() {
    const { data } = await supabase.from("products").select("*").order("name");
    setProducts(data || []);
  }
  async function loadHistory() {
    const { data } = await supabase.from("vazvratlar").select("*").order("created_at", { ascending: false }).limit(30);
    setHistory(data || []);
  }

  async function searchCustomer() {
    const id = customerId.trim();
    setError("");
    if (!/^\d{8}$/.test(id)) { setError("Mijoz ID 8 xonali bo'lishi kerak"); return; }
    const { data } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
    if (data) setCustomer(data); else setError("Bunday mijoz topilmadi");
  }

  const productResults = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [productSearch, products]);

  async function submitReturn() {
    if (!customer || !selectedProduct) { setError("Mijoz va tovarni tanlang"); return; }
    const q = Number(qty) || 1;
    const amt = Number(amount) || 0;
    setError("");

    await supabase.from("vazvratlar").insert({
      customer_id: customer.id, product_id: selectedProduct.id, product_name: selectedProduct.name, qty: q, amount: amt, seller_name: sellerName,
    });
    await supabase.from("products").update({ qty: selectedProduct.qty + q }).eq("id", selectedProduct.id);
    const newDebt = Math.max((customer.debt || 0) - amt, 0);
    const { data: updatedCustomer } = await supabase.from("customers").update({ debt: newDebt }).eq("id", customer.id).select("*").single();

    setCustomer(updatedCustomer);
    setSelectedProduct(null); setProductSearch(""); setQty(1); setAmount("");
    loadProducts(); loadHistory();
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="ob-card">
        <div style={{ fontWeight: 700, marginBottom: 12 }}>1. Mijozni toping</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="ob-input" placeholder="Mijoz ID (8 xonali)" value={customerId}
            onChange={(e) => setCustomerId(e.target.value.replace(/\D/g, "").slice(0, 8))}
            onKeyDown={(e) => e.key === "Enter" && searchCustomer()} />
          <button className="ob-btn ob-btn-dark" onClick={searchCustomer}><Search size={15} /></button>
        </div>
        {error && <div style={{ color: "#c0392b", fontSize: 13.5, marginTop: 8 }}>{error}</div>}
        {customer && (
          <div style={{ marginTop: 12, padding: 10, background: "#f7f6f1", borderRadius: 8 }}>
            <div style={{ fontWeight: 700 }}>{customer.name}</div>
            <div style={{ fontSize: 12.5, color: "#8a887e" }}>ID: {customer.id} • Joriy qarz: {fmt(customer.debt)}</div>
          </div>
        )}
      </div>

      {customer && (
        <div className="ob-card">
          <div style={{ fontWeight: 700, marginBottom: 12 }}>2. Qaytarilayotgan tovar</div>
          <input className="ob-input" placeholder="Tovar nomini qidirish..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
          {productResults.length > 0 && !selectedProduct && (
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {productResults.map((p) => (
                <div key={p.id} onClick={() => { setSelectedProduct(p); setProductSearch(p.name); }}
                  style={{ padding: "8px 10px", background: "#f7f6f1", borderRadius: 8, cursor: "pointer", fontSize: 13.5 }}>{p.name}</div>
              ))}
            </div>
          )}
          {selectedProduct && (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input type="number" min="1" className="ob-input" style={{ maxWidth: 120 }} placeholder="Soni" value={qty} onChange={(e) => setQty(e.target.value)} />
                <input type="number" className="ob-input" style={{ maxWidth: 180 }} placeholder="Qaytariladigan summa ($)" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <button className="ob-btn ob-btn-primary" onClick={submitReturn}>Vazvratni saqlash</button>
            </div>
          )}
        </div>
      )}

      <div className="ob-card">
        <div style={{ fontWeight: 700, marginBottom: 10 }}>So'nggi vazvratlar</div>
        {history.length === 0 ? <div style={{ color: "#8a887e", fontSize: 13.5 }}>Hali vazvrat bo'lmagan.</div> : (
          <div style={{ display: "grid", gap: 8 }}>
            {history.map((h) => (
              <div key={h.id} style={{ fontSize: 13, display: "flex", justifyContent: "space-between", borderBottom: "1px solid #efeee7", paddingBottom: 6, flexWrap: "wrap", gap: 4 }}>
                <span>{h.product_name} x{h.qty} — mijoz {h.customer_id} — {fmt(h.amount)}</span>
                <span style={{ color: "#8a887e" }}>{h.seller_name} • {formatDate(h.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- STATISTIKA ---------------- */
function StatistikaSection() {
  const [loading, setLoading] = useState(true);
  const [sellerStats, setSellerStats] = useState([]);
  const [totalDebt, setTotalDebt] = useState(0);
  const [omborValue, setOmborValue] = useState({ cost: 0, sale: 0 });
  const [uyOmborValue, setUyOmborValue] = useState({ cost: 0, sale: 0 });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: sales }, { data: customers }, { data: products }, { data: uyOmbor }] = await Promise.all([
      supabase.from("sales").select("seller_name, total"),
      supabase.from("customers").select("debt"),
      supabase.from("products").select("price, cost_price, qty"),
      supabase.from("uy_ombor").select("price, cost_price, qty"),
    ]);

    const bySeller = {};
    (sales || []).forEach((s) => { bySeller[s.seller_name] = (bySeller[s.seller_name] || 0) + Number(s.total || 0); });
    setSellerStats(Object.entries(bySeller).sort((a, b) => b[1] - a[1]));

    setTotalDebt((customers || []).reduce((s, c) => s + Number(c.debt || 0), 0));

    setOmborValue({
      cost: (products || []).reduce((s, p) => s + Number(p.cost_price || 0) * Number(p.qty || 0), 0),
      sale: (products || []).reduce((s, p) => s + Number(p.price || 0) * Number(p.qty || 0), 0),
    });
    setUyOmborValue({
      cost: (uyOmbor || []).reduce((s, p) => s + Number(p.cost_price || 0) * Number(p.qty || 0), 0),
      sale: (uyOmbor || []).reduce((s, p) => s + Number(p.price || 0) * Number(p.qty || 0), 0),
    });

    setLoading(false);
  }

  if (loading) return <div style={{ textAlign: "center", color: "#8a887e", padding: 30 }}>Yuklanmoqda...</div>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <StatCard label="MIJOZLAR JORIY QARZI" value={fmt(totalDebt)} color="#a1281f" />
        <StatCard label="OMBOR QIYMATI (kirim narxida)" value={fmt(omborValue.cost)} />
        <StatCard label="OMBOR QIYMATI (sotuv narxida)" value={fmt(omborValue.sale)} color="#2c7a4b" />
        <StatCard label="UY OMBOR QIYMATI (kirim narxida)" value={fmt(uyOmborValue.cost)} />
        <StatCard label="UY OMBOR QIYMATI (sotuv narxida)" value={fmt(uyOmborValue.sale)} color="#2c7a4b" />
      </div>

      <div className="ob-card">
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Sotuvchilar bo'yicha sotuv statistikasi</div>
        {sellerStats.length === 0 ? <div style={{ color: "#8a887e", fontSize: 13.5 }}>Hali sotuv yo'q.</div> : (
          <div style={{ display: "grid", gap: 8 }}>
            {sellerStats.map(([name, total]) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, borderBottom: "1px solid #efeee7", paddingBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>{name}</span>
                <span style={{ fontWeight: 700 }}>{fmt(total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="ob-card">
      <div style={{ fontSize: 11.5, color: "#8a887e", fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 700, color: color || "#161615" }}>{value}</div>
    </div>
  );
}

const css = `
  * { box-sizing: border-box; }
  .ob-btn { cursor:pointer; border:none; border-radius:8px; font-weight:700; font-size:14px; padding:10px 16px; }
  .ob-btn-primary { background:${ORANGE}; color:#fff; }
  .ob-btn-primary:hover { background:${ORANGE_DARK}; }
  .ob-btn-primary:disabled { background:#d7a48c; }
  .ob-btn-dark { background:${PURPLE_DARK}; color:#fff; }
  .ob-btn-ghost { background:transparent; border:1.5px solid #d8d6cc; }
  .ob-btn-ghost:hover { background:#eae8df; }
  .ob-btn-danger { background:#fbe4e2; color:#a1281f; }
  .ob-input { width:100%; padding:10px 12px; border:1.5px solid #d8d6cc; border-radius:8px; font-size:14px; }
  .ob-input:focus { outline:none; border-color:${ORANGE}; }
  .ob-card { background:#fff; border-radius:14px; padding:16px; border:1px solid #e7e5db; }
  .ob-tab { display:flex; align-items:center; gap:7px; padding:12px 18px; cursor:pointer; color:#c9c7bd; font-weight:700; font-size:14px; border-bottom:3px solid transparent; white-space:nowrap; }
  .ob-tab.active { color:#fff; border-bottom-color:${ORANGE}; }
`;
