import React, { useState, useEffect, useMemo, useRef } from "react";
import { Search, Plus, Trash2, Pencil, LogOut, Package, Image as ImageIcon } from "lucide-react";
import { supabase } from "./supabaseClient";

const SELLER_NAMES = ["Azizxon", "Doniyorjon", "Jahongir", "Javohirbek", "Hamidjon", "Jamshidbek", "Xislatbek", "Mubashirxon", "Jahongiroldi"];
const ORANGE = "#E9642B";
const ORANGE_DARK = "#C24F1F";

function fmt(n) { return (Number(n) || 0).toLocaleString("uz-UZ") + " so'm"; }

function LogoMark({ size = 20, sub = true }) {
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
      <div style={{ display: "inline-flex" }}>
        <div style={{ background: "#fff", color: "#111", border: "2px solid #111", padding: `${size * 0.18}px ${size * 0.45}px`, fontSize: size, fontWeight: 900, fontStyle: "italic", letterSpacing: -0.5, lineHeight: 1 }}>MAR</div>
        <div style={{ background: ORANGE, color: "#fff", marginLeft: -2, padding: `${size * 0.18}px ${size * 0.45}px`, fontSize: size, fontWeight: 900, fontStyle: "italic", letterSpacing: -0.5, lineHeight: 1 }}>BA</div>
      </div>
      {sub && <div style={{ fontSize: Math.max(8, size * 0.34), letterSpacing: 3, fontWeight: 700 }}>OMBOR</div>}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loginName, setLoginName] = useState(null);
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState(false);

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) { setSession(data.session); refreshProducts(); } });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); if (s) refreshProducts(); });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function refreshProducts() {
    const { data } = await supabase.from("products").select("*").order("name");
    setProducts(data || []);
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
    try {
      if (form.imageFile) imageUrl = await uploadImage(form.imageFile);
    } catch (e) {
      alert("Rasm yuklashda xatolik: " + e.message);
      setUploading(false);
      return;
    }
    const payload = { name: form.name.trim(), price: Number(form.price) || 0, cost_price: Number(form.cost_price) || 0, qty: Number(form.qty) || 0, image_url: imageUrl };
    if (form.id) await supabase.from("products").update(payload).eq("id", form.id);
    else await supabase.from("products").insert(payload);
    setUploading(false);
    setForm(null);
    refreshProducts();
  }
  async function deleteProduct(id) {
    if (!confirm("Ushbu qismni o'chirishga ishonchingiz komilmi?")) return;
    await supabase.from("products").delete().eq("id", id);
    refreshProducts();
  }

  if (!session) {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", minHeight: 500, display: "flex", alignItems: "center", justifyContent: "center", background: "#141412", padding: 24 }}>
        <style>{css}</style>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 28, color: "#fff" }}><LogoMark size={26} /></div>
          <div className="ob-card" style={{ background: "#1c1c1a", border: "1px solid #2c2c29" }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Xodimni tanlang</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
              {SELLER_NAMES.map((n) => (
                <button key={n} onClick={() => { setLoginName(n); setLoginError(""); }} className="ob-btn"
                  style={{ background: loginName === n ? ORANGE : "#2a2a27", color: "#fff", fontSize: 13, padding: "10px 8px" }}>{n}</button>
              ))}
            </div>
            <div style={{ color: "#c9c7bd", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Parol</div>
            <input type="password" className="ob-input" style={{ background: "#2a2a27", border: "1.5px solid #3a3a36", color: "#fff", marginBottom: 12 }}
              value={loginPass} onChange={(e) => setLoginPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doLogin()} placeholder="Parolni kiriting" />
            {loginError && <div style={{ color: "#f0837f", fontSize: 13, marginBottom: 10 }}>{loginError}</div>}
            <button className="ob-btn ob-btn-primary" style={{ width: "100%" }} disabled={busy} onClick={doLogin}>{busy ? "..." : "Kirish"}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", minHeight: 500, background: "#F3F2EC", color: "#161615" }}>
      <style>{css}</style>
      <div style={{ background: "#161615", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ color: "#fff" }}><LogoMark size={16} sub={false} /></div>
        <button className="ob-btn ob-btn-ghost" style={{ color: "#fff", borderColor: "#3a3a36", display: "flex", alignItems: "center", gap: 6, padding: "8px 12px" }} onClick={doLogout}><LogOut size={15} /> Chiqish</button>
      </div>

      <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
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
          <div className="ob-card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>{form.id ? "Tovarni tahrirlash" : "Yangi tovar kiritish"}</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{ width: 110, height: 110, borderRadius: 10, border: "2px dashed #d8d6cc", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", background: "#f7f6f1" }}
                >
                  {form.imageFile ? (
                    <img src={URL.createObjectURL(form.imageFile)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : form.image_url ? (
                    <img src={form.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <ImageIcon size={24} color="#8a887e" />
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={(e) => setForm({ ...form, imageFile: e.target.files[0] })} />
                <div style={{ fontSize: 11, color: "#8a887e", textAlign: "center", marginTop: 4 }}>Rasm</div>
              </div>
              <div style={{ flex: 1, minWidth: 220, display: "grid", gap: 10 }}>
                <input className="ob-input" placeholder="Nomi" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <input type="number" className="ob-input" placeholder="Kirim narxi (so'm)" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
                  <input type="number" className="ob-input" placeholder="Sotuv narxi (so'm)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <input type="number" className="ob-input" placeholder="Miqdori" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="ob-btn ob-btn-primary" disabled={uploading || !form.name.trim()} onClick={saveForm}>{uploading ? "Yuklanmoqda..." : "Saqlash"}</button>
              <button className="ob-btn ob-btn-ghost" onClick={() => setForm(null)}>Bekor qilish</button>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          {filtered.length === 0 ? (
            <div className="ob-card" style={{ textAlign: "center", color: "#8a887e", padding: "30px 0" }}>
              <Package size={28} style={{ marginBottom: 8 }} />
              <div>Hech narsa topilmadi.</div>
            </div>
          ) : filtered.map((p) => (
            <div key={p.id} className="ob-card" style={{ display: "flex", alignItems: "center", gap: 14, padding: 14 }}>
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
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button className="ob-btn ob-btn-ghost" style={{ padding: "7px 9px" }} onClick={() => setForm({ id: p.id, name: p.name, price: p.price, cost_price: p.cost_price, qty: p.qty, image_url: p.image_url, imageFile: null })}><Pencil size={14} /></button>
                <button className="ob-btn ob-btn-danger" style={{ padding: "7px 9px" }} onClick={() => deleteProduct(p.id)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const css = `
  * { box-sizing: border-box; }
  .ob-btn { cursor:pointer; border:none; border-radius:8px; font-weight:700; font-size:14px; padding:10px 16px; }
  .ob-btn-primary { background:${ORANGE}; color:#fff; }
  .ob-btn-primary:hover { background:${ORANGE_DARK}; }
  .ob-btn-primary:disabled { background:#d7a48c; }
  .ob-btn-ghost { background:transparent; border:1.5px solid #d8d6cc; }
  .ob-btn-ghost:hover { background:#eae8df; }
  .ob-btn-danger { background:#fbe4e2; color:#a1281f; }
  .ob-input { width:100%; padding:10px 12px; border:1.5px solid #d8d6cc; border-radius:8px; font-size:14px; }
  .ob-input:focus { outline:none; border-color:${ORANGE}; }
  .ob-card { background:#fff; border-radius:14px; padding:16px; border:1px solid #e7e5db; }
`;
