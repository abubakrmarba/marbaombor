import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search, Plus, Trash2, Printer, LogOut, ShoppingCart,
  Users, History, X, Instagram, Send, Wallet, Check, ChevronLeft, Inbox,
  Pencil, Package, Image as ImageIcon,
  Warehouse, ClipboardCheck, Undo2, BarChart3, ArrowRightLeft, Sparkles, Video
} from "lucide-react";
import { supabase } from "./supabaseClient";

const SELLER_NAMES = ["Azizxon", "Doniyorjon", "Jahongir", "Javohirbek", "Hamidjon", "Jamshidbek", "Xislatbek", "Mubashirxon", "Jahongiroldi"];
const ORANGE = "#E9642B";
const ORANGE_DARK = "#C24F1F";
const PURPLE_DARK = "#0B1220";
const PURPLE = "#141B2E";
const PURPLE_BORDER = "#232C42";
const DARK_TEXT = "#E7EAF0";
const DARK_MUTED = "#98A2B8";
const DARK_HILITE = "#1B2740";
const DARK_INPUT_BORDER = "#2A3652";
const DARK_ROW_BORDER = "#232C42";

function fmt(n) { return "$" + (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function formatDate(iso) {
  try { return new Date(iso).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch (e) { return iso; }
}

function LogoMark({ size = 20 }) {
  return (
    <img src="/logo.png" alt="MARBA" style={{ height: size * 1.6, width: "auto", maxWidth: 160 }} />
  );
}

async function nextCustomerId() {
  const { data } = await supabase.from("customers").select("id");
  const nums = (data || [])
    .map((c) => c.id.trim())
    .filter((id) => id.length === 4)
    .map((id) => parseInt(id, 10))
    .filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return String(next).padStart(4, "0");
}

const ORDER_STATUS_LABELS = {
  yangi: "Yangi", qabul_qilindi: "Qabul qilindi", yigilmoqda: "Yig'ilmoqda",
  yolda: "Yo'lda", yetkazildi: "Yetkazildi", yakunlandi: "Sotuvga aylandi", bekor_qilindi: "Bekor qilindi",
};
function orderStatusColor(status) {
  if (status === "yangi") return "#98A2B8";
  if (status === "qabul_qilindi") return "#2C6FA6";
  if (status === "yigilmoqda" || status === "yolda") return "#B8860B";
  if (status === "yetkazildi" || status === "yakunlandi") return "#2c7a4b";
  return "#a1281f";
}

export default function App() {
  const [session, setSession] = useState(null);
  const [sellerName, setSellerName] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [loginName, setLoginName] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState(false);

  const [section, setSection] = useState("sale");
  const [expandedGroup, setExpandedGroup] = useState("sotuvchi");
  const [products, setProducts] = useState([]);

  const [saleCustomer, setSaleCustomer] = useState(null);
  const [customerIdInput, setCustomerIdInput] = useState("");
  const [saleError, setSaleError] = useState("");
  const [newCustomerForm, setNewCustomerForm] = useState(null);
  const [cart, setCart] = useState([]);
  const [saleSearch, setSaleSearch] = useState("");
  const [qtyDraft, setQtyDraft] = useState({});
  const [paymentInput, setPaymentInput] = useState("");

  const [custSearch, setCustSearch] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [payAmount, setPayAmount] = useState("");

  const [historyRows, setHistoryRows] = useState([]);
  const [receipt, setReceipt] = useState(null);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const newOrders = useMemo(() => orders.filter((o) => o.status === "yangi"), [orders]);
  const acceptedOrders = useMemo(() => orders.filter((o) => o.status !== "yangi"), [orders]);
  const newOrdersCount = newOrders.length;
  const acceptedOrdersCount = acceptedOrders.length;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) initSeller(data.session); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) initSeller(s); else { setSession(null); setSellerName(""); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function initSeller(s) {
    setSession(s);
    const { data } = await supabase.from("sellers").select("name, phone").eq("auth_user_id", s.user.id).maybeSingle();
    setSellerName(data?.name || s.user.email.split("@")[0]);
    setSellerPhone(data?.phone || "");
  }

  useEffect(() => { if (session) refreshProducts(); }, [session]);
  useEffect(() => { if (section === "history" && session) refreshHistory(); }, [section, session]);
  useEffect(() => { if ((section === "orders" || section === "accepted") && session) refreshOrders(); }, [section, session]);

  async function refreshProducts() {
    const { data } = await supabase.from("products").select("*").order("name");
    setProducts(data || []);
  }
  async function refreshHistory() {
    const { data } = await supabase
      .from("sales")
      .select("*, customers(name), sale_items(*)")
      .order("created_at", { ascending: false })
      .limit(100);
    setHistoryRows(data || []);
  }
  async function refreshOrders() {
    setOrdersLoading(true);
    const { data } = await supabase
      .from("buyurtmalar")
      .select("*, buyurtma_items(*)")
      .not("status", "in", "(bekor_qilindi,yetkazildi,yakunlandi)")
      .order("created_at", { ascending: false });
    const list = data || [];
    const customerIds = [...new Set(list.map((o) => o.customer_id))];
    let customerMap = {};
    if (customerIds.length) {
      const { data: custs } = await supabase.from("customers").select("*").in("id", customerIds);
      (custs || []).forEach((c) => { customerMap[c.id] = c; });
    }
    setOrders(list.map((o) => ({ ...o, customer: customerMap[o.customer_id] })));
    setOrdersLoading(false);
  }

  async function setOrderStatus(order, status) {
    const payload = { status };
    if (status === "qabul_qilindi") payload.seller_name = sellerName;
    const { error } = await supabase.from("buyurtmalar").update(payload).eq("id", order.id);
    if (error) { alert("Xatolik: " + error.message); return; }
    refreshOrders();
  }

  function acceptAndPrint(order) {
    setOrderStatus(order, "qabul_qilindi");
    const items = order.buyurtma_items.map((it) => ({ name: it.product_name, price: it.price, qty: it.qty }));
    const total = items.reduce((s, it) => s + it.price * it.qty, 0);
    const debtNow = (order.customer && order.customer.debt) || 0;
    setReceipt({
      customer: order.customer,
      purchase: { order_no: order.order_no, total, paid: 0, items, date: new Date().toISOString(), oldDebt: debtNow, newDebt: debtNow },
      seller: sellerName,
      sellerPhone,
    });
  }

  async function cancelOrder(order) {
    if (!confirm("Buyurtmani bekor qilishga ishonchingiz komilmi?")) return;
    await supabase.from("buyurtmalar").update({ status: "bekor_qilindi" }).eq("id", order.id);
    refreshOrders();
  }

  async function savePhone(newPhone) {
    await supabase.from("sellers").update({ phone: newPhone }).eq("auth_user_id", session.user.id);
    setSellerPhone(newPhone);
  }

  async function doLogin() {
    if (!loginName.trim()) { setLoginError("Login kiriting"); return; }
    setBusy(true);
    const email = `${loginName.trim().toLowerCase().replace(/\s+/g, "")}@marba.internal`;
    const { error } = await supabase.auth.signInWithPassword({ email, password: loginPass });
    setBusy(false);
    if (error) { setLoginError("Login yoki parol notogri"); return; }
    setLoginPass(""); setLoginError("");
  }
  async function doLogout() {
    await supabase.auth.signOut();
    setSection("sale"); setSaleCustomer(null); setCart([]);
  }

  async function searchCustomer() {
    const id = customerIdInput.trim();
    setSaleError("");
    if (!/^\d{4,8}$/.test(id)) { setSaleError("Mijoz ID 4 yoki 8 ta raqamdan iborat bo'lishi kerak"); return; }
    const { data } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
    if (data) { setSaleCustomer(data); setNewCustomerForm(null); }
    else setSaleError("Bunday ID topilmadi. Yangi mijoz yarating.");
  }
  async function startNewCustomer() {
    const previewId = await nextCustomerId();
    setNewCustomerForm({ previewId, name: "", viloyat: "", manzil: "" });
    setSaleError("");
  }
  async function saveNewCustomer() {
    if (!newCustomerForm.name.trim() || !newCustomerForm.viloyat.trim()) { setSaleError("Mijoz ismi va viloyatini to'liq kiriting"); return; }
    const { data, error } = await supabase.from("customers")
      .insert({ id: newCustomerForm.previewId, name: newCustomerForm.name.trim(), viloyat: newCustomerForm.viloyat.trim(), manzil: newCustomerForm.manzil.trim(), debt: 0 })
      .select("*").single();
    if (error) { setSaleError("Xatolik: " + error.message); return; }
    setSaleCustomer(data); setNewCustomerForm(null); setSaleError("");
  }
  function changeCustomer() { setSaleCustomer(null); setCustomerIdInput(""); setCart([]); setPaymentInput(""); setSaleError(""); }

  const saleSearchResults = useMemo(() => {
    const q = saleSearch.trim().toLowerCase();
    if (!q) return [];
    const terms = q.split(/\s+/).filter(Boolean);
    return products.filter((p) => {
      const nameLower = p.name.toLowerCase();
      return terms.every((term) => nameLower.includes(term));
    }).slice(0, 8);
  }, [saleSearch, products]);

  function addToCart(product) {
    const qty = Math.max(1, Math.min(Number(qtyDraft[product.id]) || 1, product.qty));
    if (product.qty <= 0) return;
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.productId === product.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: Math.min(copy[idx].qty + qty, product.qty) };
        return copy;
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, qty }];
    });
    setQtyDraft((d) => ({ ...d, [product.id]: 1 }));
  }
  function removeFromCart(idx) { setCart((prev) => prev.filter((_, i) => i !== idx)); }
  const cartTotal = useMemo(() => cart.reduce((s, l) => s + l.price * l.qty, 0), [cart]);
  const paidNum = Number(paymentInput) || 0;
  const debtPreview = Math.max((saleCustomer?.debt || 0) + cartTotal - paidNum, 0);

  async function finishSale() {
    if (!saleCustomer) { setSaleError("Avval mijozni tanlang"); return; }
    if (cart.length === 0) { setSaleError("Ro'yxatga kamida bitta qism qo'shing"); return; }
    setSaleError(""); setBusy(true);

    const total = cartTotal, paid = paidNum;
    const newDebt = Math.max((saleCustomer.debt || 0) + total - paid, 0);

    const { data: sale, error: saleErr } = await supabase.from("sales")
      .insert({ customer_id: saleCustomer.id, seller_name: sellerName, total, paid })
      .select("*").single();
    if (saleErr) { setSaleError("Xatolik: " + saleErr.message); setBusy(false); return; }

    await supabase.from("sale_items").insert(cart.map((l) => ({ sale_id: sale.id, product_name: l.name, price: l.price, qty: l.qty })));

    for (const line of cart) {
      const prod = products.find((p) => p.id === line.productId);
      if (prod) await supabase.from("products").update({ qty: Math.max(0, prod.qty - line.qty) }).eq("id", prod.id);
    }

    if (paid > 0) {
      await supabase.from("payments").insert({ customer_id: saleCustomer.id, amount: paid, seller_name: sellerName });
    }

    const { data: updatedCustomer } = await supabase.from("customers").update({ debt: newDebt }).eq("id", saleCustomer.id).select("*").single();

    setBusy(false);
    setReceipt({
      customer: updatedCustomer,
      purchase: { ...sale, items: cart, date: sale.created_at, oldDebt: saleCustomer.debt || 0, newDebt: updatedCustomer.debt },
      seller: sellerName,
      sellerPhone,
    });
    setCart([]); setPaymentInput(""); setSaleCustomer(updatedCustomer);
    refreshProducts();
  }

  useEffect(() => {
    if (section !== "customers") return;
    (async () => {
      const q = custSearch.trim();
      let query = supabase.from("customers").select("*").order("created_at", { ascending: false }).limit(30);
      if (q) query = supabase.from("customers").select("*").or(`id.ilike.%${q}%,name.ilike.%${q}%`).limit(30);
      const { data } = await query;
      setCustomerResults(data || []);
    })();
  }, [custSearch, section]);

  async function openCustomer(c) {
    const { data: sales } = await supabase.from("sales").select("*, sale_items(*)").eq("customer_id", c.id).order("created_at", { ascending: false });
    setSelectedCustomer({ ...c, purchases: sales || [] });
  }
  async function addStandalonePayment() {
    if (!selectedCustomer) return;
    const amt = Number(payAmount);
    if (!amt || amt <= 0) return;
    await supabase.from("payments").insert({ customer_id: selectedCustomer.id, amount: amt, seller_name: sellerName });
    const newDebt = Math.max((selectedCustomer.debt || 0) - amt, 0);
    const { data } = await supabase.from("customers").update({ debt: newDebt }).eq("id", selectedCustomer.id).select("*").single();
    setSelectedCustomer({ ...selectedCustomer, debt: data.debt });
    setPayAmount("");
  }

  if (!session) {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0B1220", padding: 24 }}>
        <style>{allCss}</style>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}><LogoMark size={26} /></div>
          <div className="mb-card">
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Tizimga kirish</div>
            <div style={{ color: "#98A2B8", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Login</div>
            <input className="mb-input" style={{ marginBottom: 14 }}
              value={loginName} onChange={(e) => { setLoginName(e.target.value); setLoginError(""); }}
              onKeyDown={(e) => e.key === "Enter" && doLogin()} placeholder="masalan: azizxon" autoCapitalize="none" />
            <div style={{ color: "#98A2B8", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Parol</div>
            <input type="password" className="mb-input" style={{ marginBottom: 12 }}
              value={loginPass} onChange={(e) => setLoginPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doLogin()} placeholder="Parolni kiriting" />
            {loginError && <div style={{ color: "#f0837f", fontSize: 13, marginBottom: 10 }}>{loginError}</div>}
            <button className="mb-btn mb-btn-primary" style={{ width: "100%" }} disabled={busy} onClick={doLogin}>{busy ? "..." : "Kirish"}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: PURPLE, color: "#E7EAF0" }}>
      <style>{allCss}</style>
      <div className="no-print" style={{ display: "flex", minHeight: "100vh" }}>
        <div style={{ width: 230, background: "#0B1220", borderRight: `1px solid ${PURPLE_BORDER}`, display: "flex", flexDirection: "column", padding: "20px 12px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}><LogoMark size={20} /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
            <div className={`sidebar-item ${section === "statistika" ? "active" : ""}`} onClick={() => setSection("statistika")}><BarChart3 size={17} /> Statistika</div>

            <div className={`sidebar-item ${["sale", "orders", "accepted", "history", "customers"].includes(section) ? "active" : ""}`} onClick={() => setExpandedGroup(expandedGroup === "sotuvchi" ? null : "sotuvchi")}>
              <ShoppingCart size={17} /> Sotuvchi
            </div>
            {expandedGroup === "sotuvchi" && (
              <>
                <div className={`sidebar-sub ${section === "sale" ? "active" : ""}`} onClick={() => setSection("sale")}>Yangi sotuv</div>
                <div className={`sidebar-sub ${section === "orders" ? "active" : ""}`} onClick={() => setSection("orders")}>Yangi buyurtmalar{newOrdersCount > 0 ? ` (${newOrdersCount})` : ""}</div>
                <div className={`sidebar-sub ${section === "accepted" ? "active" : ""}`} onClick={() => setSection("accepted")}>Qabul qilingan{acceptedOrdersCount > 0 ? ` (${acceptedOrdersCount})` : ""}</div>
                <div className={`sidebar-sub ${section === "history" ? "active" : ""}`} onClick={() => setSection("history")}>Sotuvchi tarixi</div>
                <div className={`sidebar-sub ${section === "customers" ? "active" : ""}`} onClick={() => setSection("customers")}>Mijozlar</div>
              </>
            )}

            <div className={`sidebar-item ${section === "xodimlar" ? "active" : ""}`} onClick={() => setSection("xodimlar")}><Users size={17} /> Xodimlar</div>

            <div className={`sidebar-item ${["ombor", "uyombor", "vazvrat", "reviziya"].includes(section) ? "active" : ""}`} onClick={() => setExpandedGroup(expandedGroup === "ombor" ? null : "ombor")}>
              <Package size={17} /> Ombor
            </div>
            {expandedGroup === "ombor" && (
              <>
                <div className={`sidebar-sub ${section === "ombor" ? "active" : ""}`} onClick={() => setSection("ombor")}>Ombor</div>
                <div className={`sidebar-sub ${section === "uyombor" ? "active" : ""}`} onClick={() => setSection("uyombor")}>Uy ombor</div>
                <div className={`sidebar-sub ${section === "vazvrat" ? "active" : ""}`} onClick={() => setSection("vazvrat")}>Vazvrat</div>
                <div className={`sidebar-sub ${section === "reviziya" ? "active" : ""}`} onClick={() => setSection("reviziya")}>Reviziya</div>
              </>
            )}

            <div className={`sidebar-item ${section === "stories" ? "active" : ""}`} onClick={() => setSection("stories")}><Sparkles size={17} /> Stories</div>
          </div>

          <div style={{ borderTop: `1px solid ${PURPLE_BORDER}`, paddingTop: 14, marginTop: 10 }}>
            <div
              style={{ color: "#98A2B8", fontSize: 12.5, cursor: "pointer", marginBottom: 10 }}
              onClick={() => {
                const val = prompt("Telefon raqamingizni kiriting:", sellerPhone);
                if (val !== null) savePhone(val.trim());
              }}
              title="Telefon raqamingizni kiritish uchun bosing"
            >
              <b style={{ color: "#fff" }}>{sellerName}</b>{sellerPhone ? "" : " (tel kiritilmagan)"}
            </div>
            <button className="mb-btn mb-btn-ghost" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} onClick={doLogout}><LogOut size={15} /> Chiqish</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ padding: 20, maxWidth: 1400, margin: "0 auto" }}>
          {section === "orders" && (
            <div className="mb-card">
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Yangi buyurtmalar ({newOrders.length})</div>
              {ordersLoading ? <div style={{ color: "#98A2B8" }}>Yuklanmoqda...</div> : newOrders.length === 0 ? (
                <div style={{ textAlign: "center", color: "#98A2B8", padding: "24px 0" }}>Hozircha yangi buyurtma yo'q.</div>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {newOrders.map((o) => (
                    <div key={o.id} style={{ border: "1px solid #232C42", borderRadius: 8, padding: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4, marginBottom: 3 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{o.customer?.name || "Noma'lum"} <span style={{ color: "#98A2B8", fontFamily: "monospace", fontWeight: 400, fontSize: 11 }}>({o.customer_id})</span></div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{fmt(o.buyurtma_items.reduce((s, it) => s + it.price * it.qty, 0))}</div>
                      </div>
                      <div style={{ fontSize: 11.5, color: "#98A2B8", marginBottom: 3 }}>{formatDate(o.created_at)}{o.order_no ? ` \u2022 #${o.order_no}` : ""}</div>
                      <div style={{ fontSize: 12, marginBottom: 6, color: "#C7CDDA" }}>{o.buyurtma_items.map((it) => `${it.product_name} x${it.qty}`).join(", ")}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button className="mb-btn mb-btn-primary" style={{ padding: "6px 12px", fontSize: 12.5 }} onClick={() => acceptAndPrint(o)}>Qabul qilish va chop etish</button>
                        <button className="mb-btn mb-btn-danger" style={{ padding: "6px 12px", fontSize: 12.5 }} onClick={() => cancelOrder(o)}>Bekor qilish</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === "accepted" && (
            <div className="mb-card">
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Qabul qilingan buyurtmalar ({acceptedOrders.length})</div>
              {ordersLoading ? <div style={{ color: "#98A2B8" }}>Yuklanmoqda...</div> : acceptedOrders.length === 0 ? (
                <div style={{ textAlign: "center", color: "#98A2B8", padding: "24px 0" }}>Hozircha qabul qilingan buyurtma yo'q.</div>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {acceptedOrders.map((o) => (
                    <div key={o.id} style={{ border: "1px solid #232C42", borderRadius: 8, padding: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4, marginBottom: 3 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{o.customer?.name || "Noma'lum"} <span style={{ color: "#98A2B8", fontFamily: "monospace", fontWeight: 400, fontSize: 11 }}>({o.customer_id})</span></div>
                        <div style={{ fontWeight: 700, fontSize: 12.5, color: orderStatusColor(o.status) }}>{ORDER_STATUS_LABELS[o.status] || o.status}</div>
                      </div>
                      <div style={{ fontSize: 11.5, color: "#98A2B8", marginBottom: 3 }}>{formatDate(o.created_at)}{o.order_no ? ` \u2022 #${o.order_no}` : ""}</div>
                      <div style={{ fontSize: 12, marginBottom: 4, color: "#C7CDDA" }}>{o.buyurtma_items.map((it) => `${it.product_name} x${it.qty}`).join(", ")}</div>
                      {(o.packed_by || o.driver_name) && (
                        <div style={{ fontSize: 11.5, color: "#2C6FA6", marginBottom: 6 }}>
                          {o.packed_by ? "\uD83D\uDCE6 " + o.packed_by : ""}{o.packed_by && o.driver_name ? " \u2022 " : ""}{o.driver_name ? "\uD83D\uDE97 " + o.driver_name : ""}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {o.status === "qabul_qilindi" && <button className="mb-btn mb-btn-primary" style={{ padding: "6px 12px", fontSize: 12.5 }} onClick={() => setOrderStatus(o, "yigilmoqda")}>Yig'ilmoqda deb belgilash</button>}
                        <button className="mb-btn mb-btn-danger" style={{ padding: "6px 12px", fontSize: 12.5 }} onClick={() => cancelOrder(o)}>Bekor qilish</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === "sale" && (
            <div style={{ display: "grid", gap: 16 }}>
              {!saleCustomer ? (
                <div className="mb-card">
                  <div style={{ fontWeight: 700, marginBottom: 12 }}>1. Mijozni tanlang</div>
                  {!newCustomerForm ? (
                    <>
                      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                        <input className="mb-input" placeholder="Mijoz ID (4 yoki 8 xonali)" value={customerIdInput}
                          onChange={(e) => setCustomerIdInput(e.target.value.replace(/\D/g, "").slice(0, 8))}
                          onKeyDown={(e) => e.key === "Enter" && searchCustomer()} />
                        <button className="mb-btn mb-btn-dark" onClick={searchCustomer}><Search size={15} /></button>
                      </div>
                      {saleError && <div style={{ color: "#c0392b", fontSize: 13.5, marginBottom: 10 }}>{saleError}</div>}
                      <button className="mb-btn mb-btn-primary" onClick={startNewCustomer}><Plus size={14} style={{ verticalAlign: -2 }} /> Yangi mijoz yaratish</button>
                    </>
                  ) : (
                    <div>
                      <div style={{ color: "#98A2B8", fontSize: 13, marginBottom: 10 }}>Yangi mijoz ID: <b style={{ color: "#E7EAF0", fontFamily: "monospace", fontSize: 15 }}>{newCustomerForm.previewId}</b></div>
                      <div style={{ display: "grid", gap: 10 }}>
                        <input className="mb-input" placeholder="Mijoz ismi (to'liq)" value={newCustomerForm.name} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })} />
                        <input className="mb-input" placeholder="Viloyati / hududi" value={newCustomerForm.viloyat} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, viloyat: e.target.value })} />
                        <input className="mb-input" placeholder="Manzil (ixtiyoriy)" value={newCustomerForm.manzil} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, manzil: e.target.value })} />
                      </div>
                      {saleError && <div style={{ color: "#c0392b", fontSize: 13.5, margin: "10px 0" }}>{saleError}</div>}
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button className="mb-btn mb-btn-primary" onClick={saveNewCustomer}>Saqlash</button>
                        <button className="mb-btn mb-btn-ghost" onClick={() => setNewCustomerForm(null)}>Bekor qilish</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#98A2B8", fontWeight: 700 }}>MIJOZ ID: {saleCustomer.id}</div>
                      <div style={{ fontSize: 17, fontWeight: 700, margin: "3px 0" }}>{saleCustomer.name}</div>
                      <div style={{ fontSize: 13.5, color: "#98A2B8" }}>{saleCustomer.viloyat}{saleCustomer.manzil ? `, ${saleCustomer.manzil}` : ""}</div>
                      {saleCustomer.debt > 0 && <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, background: "#fbe4e2", color: "#a1281f", fontSize: 12.5, fontWeight: 700, padding: "4px 10px", borderRadius: 6 }}><Wallet size={13} /> Joriy qarz: {fmt(saleCustomer.debt)}</div>}
                    </div>
                    <button className="mb-btn mb-btn-ghost" onClick={changeCustomer}><ChevronLeft size={14} style={{ verticalAlign: -2 }} /> Boshqa mijoz</button>
                  </div>

                  <div className="mb-card">
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>2. Ehtiyot qismlar qo'shish</div>
                    <input className="mb-input" placeholder="Qism nomini qidirish..." value={saleSearch} onChange={(e) => setSaleSearch(e.target.value)} />
                    {saleSearchResults.length > 0 && (
                      <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                        {saleSearchResults.map((p) => (
                          <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "#1B2740", borderRadius: 8, gap: 8, flexWrap: "wrap" }}>
                            <div style={{ minWidth: 140 }}>
                              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.name}</div>
                              <div style={{ fontSize: 12, color: "#98A2B8" }}>{fmt(p.price)} \u2022 omborda: {p.qty}</div>
                            </div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <input type="number" min="1" max={p.qty} className="mb-input" style={{ width: 64, padding: "6px 8px" }} value={qtyDraft[p.id] ?? 1} onChange={(e) => setQtyDraft((d) => ({ ...d, [p.id]: e.target.value }))} />
                              <button className="mb-btn mb-btn-dark" style={{ padding: "8px 10px" }} disabled={p.qty <= 0} onClick={() => addToCart(p)}>{p.qty <= 0 ? "Tugagan" : <Plus size={14} />}</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {cart.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <table className="mb-table">
                          <thead><tr><th>Nomi</th><th>Soni</th><th>Narxi</th><th>Summa</th><th></th></tr></thead>
                          <tbody>
                            {cart.map((l, i) => (
                              <tr key={i}><td>{l.name}</td><td>{l.qty}</td><td>{fmt(l.price)}</td><td>{fmt(l.price * l.qty)}</td>
                                <td><button className="mb-btn mb-btn-danger" style={{ padding: "5px 8px" }} onClick={() => removeFromCart(i)}><Trash2 size={13} /></button></td></tr>
                            ))}
                          </tbody>
                        </table>
                        <div style={{ textAlign: "right", fontWeight: 700, fontSize: 16, marginTop: 10 }}>Jami: {fmt(cartTotal)}</div>
                      </div>
                    )}
                  </div>

                  {cart.length > 0 && (
                    <div className="mb-card">
                      <div style={{ fontWeight: 700, marginBottom: 12 }}>3. To'lov</div>
                      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                        <input type="number" className="mb-input" style={{ maxWidth: 200 }} placeholder="To'langan summa" value={paymentInput} onChange={(e) => setPaymentInput(e.target.value)} />
                        <button className="mb-btn mb-btn-ghost" onClick={() => setPaymentInput(String(cartTotal))}>To'liq to'lash</button>
                      </div>
                      <div style={{ fontSize: 13.5, color: debtPreview > 0 ? "#a1281f" : "#2c7a4b", fontWeight: 600, marginBottom: 14 }}>{debtPreview > 0 ? `Yangi qarz bo'ladi: ${fmt(debtPreview)}` : "Qarz qolmaydi"}</div>
                      {saleError && <div style={{ color: "#c0392b", fontSize: 13.5, marginBottom: 10 }}>{saleError}</div>}
                      <button className="mb-btn mb-btn-primary" disabled={busy} onClick={finishSale}>{busy ? "..." : "Sotuvni yakunlash va chek chiqarish"}</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {section === "customers" && (
            <div style={{ display: "grid", gap: 14 }}>
              <input className="mb-input" style={{ maxWidth: 360 }} placeholder="ID yoki ism bo'yicha qidirish..." value={custSearch} onChange={(e) => setCustSearch(e.target.value)} />
              {!selectedCustomer ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {customerResults.length === 0 && <div style={{ color: "#98A2B8", padding: "20px 0", textAlign: "center" }}>Mijozlar topilmadi.</div>}
                  {customerResults.map((c) => (
                    <div key={c.id} className="mb-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", padding: 14 }} onClick={() => openCustomer(c)}>
                      <div><div style={{ fontWeight: 700 }}>{c.name}</div><div style={{ fontSize: 12.5, color: "#98A2B8", fontFamily: "monospace" }}>ID: {c.id} \u2022 {c.viloyat}</div></div>
                      {c.debt > 0 && <div style={{ color: "#a1281f", fontWeight: 700, fontSize: 13.5 }}>Qarz: {fmt(c.debt)}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-card">
                  <button className="mb-btn mb-btn-ghost" style={{ marginBottom: 14 }} onClick={() => setSelectedCustomer(null)}><ChevronLeft size={14} style={{ verticalAlign: -2 }} /> Orqaga</button>
                  <div style={{ fontSize: 12, color: "#98A2B8", fontWeight: 700 }}>MIJOZ ID: {selectedCustomer.id}</div>
                  <div style={{ fontSize: 19, fontWeight: 700, margin: "4px 0" }}>{selectedCustomer.name}</div>
                  <div style={{ color: "#98A2B8", marginBottom: 12 }}>{selectedCustomer.viloyat}{selectedCustomer.manzil ? `, ${selectedCustomer.manzil}` : ""}</div>
                  <div style={{ display: "flex", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
                    <div style={{ background: "#1B2740", borderRadius: 10, padding: "10px 16px" }}><div style={{ fontSize: 11.5, color: "#98A2B8", fontWeight: 700 }}>JORIY QARZ</div><div style={{ fontSize: 18, fontWeight: 700, color: selectedCustomer.debt > 0 ? "#a1281f" : "#2c7a4b" }}>{fmt(selectedCustomer.debt)}</div></div>
                    <div style={{ background: "#1B2740", borderRadius: 10, padding: "10px 16px" }}><div style={{ fontSize: 11.5, color: "#98A2B8", fontWeight: 700 }}>JAMI XARIDLAR</div><div style={{ fontSize: 18, fontWeight: 700 }}>{selectedCustomer.purchases.length}</div></div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                    <input type="number" className="mb-input" style={{ maxWidth: 200 }} placeholder="Qarz to'lovi summasi" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                    <button className="mb-btn mb-btn-primary" onClick={addStandalonePayment}><Check size={14} style={{ verticalAlign: -2 }} /> To'lov qo'shish</button>
                  </div>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Xaridlar tarixi</div>
                  {selectedCustomer.purchases.length === 0 ? <div style={{ color: "#98A2B8", fontSize: 13.5 }}>Hali xarid yo'q.</div> : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {selectedCustomer.purchases.map((p) => (
                        <div key={p.id} style={{ border: "1px solid #232C42", borderRadius: 10, padding: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#98A2B8", marginBottom: 6 }}>
                            <span>{formatDate(p.created_at)} \u2022 {p.seller_name}</span>
                            <span>Jami: {fmt(p.total)} / To'landi: {fmt(p.paid)}</span>
                          </div>
                          <div style={{ fontSize: 13.5 }}>{(p.sale_items || []).map((it) => `${it.product_name} x${it.qty}`).join(", ")}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {section === "history" && (
            <div className="mb-card">
              {historyRows.length === 0 ? <div style={{ textAlign: "center", color: "#98A2B8", padding: "30px 0" }}>Hali sotuvlar tarixi yo'q.</div> : (
                <table className="mb-table">
                  <thead><tr><th>Sana</th><th>Mijoz</th><th>Sotuvchi</th><th>Jami</th><th>To'landi</th></tr></thead>
                  <tbody>
                    {historyRows.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontSize: 12.5 }}>{formatDate(r.created_at)}</td>
                        <td>{r.customers?.name} <span style={{ color: "#98A2B8", fontFamily: "monospace", fontSize: 11.5 }}>({r.customer_id})</span></td>
                        <td>{r.seller_name}</td><td>{fmt(r.total)}</td>
                        <td style={{ color: r.paid < r.total ? "#a1281f" : "#2c7a4b" }}>{fmt(r.paid)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {section === "ombor" && <OmborSection sellerName={sellerName} />}
          {section === "uyombor" && <UyOmborSection sellerName={sellerName} />}
          {section === "reviziya" && <ReviziyaSection sellerName={sellerName} />}
          {section === "vazvrat" && <VazvratSection sellerName={sellerName} />}
          {section === "statistika" && <StatistikaSection />}
          {section === "stories" && <StoriesSection />}
          {section === "xodimlar" && <XodimlarSection />}
        </div>
        </div>
      </div>

      {receipt && <ReceiptOverlay data={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

function ReceiptOverlay({ data, onClose }) {
  return (
    <>
      <div className="no-print" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }} onClick={onClose}>
        <div style={{ background: "#141B2E", borderRadius: 12, maxWidth: 640, width: "100%", maxHeight: "90vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: 12, borderBottom: "1px solid #eee" }}>
            <button className="mb-btn mb-btn-primary" onClick={() => window.print()}><Printer size={14} style={{ verticalAlign: -2 }} /> Chop etish</button>
            <button className="mb-btn mb-btn-ghost" onClick={onClose}><X size={16} /></button>
          </div>
          <ReceiptContent data={data} />
        </div>
      </div>
      <div className="print-only"><ReceiptContent data={data} /></div>
    </>
  );
}

function ReceiptContent({ data }) {
  const { customer, purchase, seller, sellerPhone } = data;
  const telegramQr = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent("https://t.me/marba_zapchast")}`;

  return (
    <div style={{ width: "210mm", minHeight: "297mm", padding: "8mm", color: "#111", fontFamily: "system-ui, sans-serif", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>

      {/* YUQORI QISM - taxminan 20% balandlik */}
      <div style={{ height: "55mm", display: "flex", borderBottom: "2px solid #111", paddingBottom: "4mm", marginBottom: "4mm", flexShrink: 0 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", fontSize: 11, lineHeight: 1.9 }}>
          <div>Buyurtma #: <b>{purchase.order_no || "-"}</b></div>
          <div>Mijoz ID: <b style={{ fontFamily: "monospace" }}>{customer?.id || "-"}</b></div>
          <div>Mijoz tel: <b>{customer?.phone || "-"}</b></div>
          <div>Sotuvchi tel: <b>{sellerPhone || "-"}</b></div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <LogoMark size={14} />
          <div style={{ fontSize: 10, marginTop: "3mm", lineHeight: 1.5 }}>
            <div style={{ fontWeight: 700 }}>Yetkazib berish manzili</div>
            <div>{customer?.viloyat || ""}{customer?.manzil ? `, ${customer.manzil}` : ""}</div>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", fontSize: 10.5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Instagram size={12} /> @marba_avtoparts</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: "2mm" }}><Send size={12} /> @marba_zapchast</div>
          <img src={telegramQr} alt="Telegram QR" style={{ width: "18mm", height: "18mm", marginTop: "3mm" }} />
          <div style={{ marginTop: "1mm", fontWeight: 700 }}>Obuna bo'ling</div>
        </div>
      </div>

      {/* EHTIYOT QISMLAR JADVALI - Excel uslubida, 25 qatorgacha sigadi */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, flex: 1 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "1.5mm 2mm", border: "1px solid #999", background: "#f0f0f0" }}>Nomi</th>
            <th style={{ textAlign: "center", padding: "1.5mm 2mm", border: "1px solid #999", background: "#f0f0f0", width: "18mm" }}>Miqdori</th>
            <th style={{ textAlign: "right", padding: "1.5mm 2mm", border: "1px solid #999", background: "#f0f0f0", width: "24mm" }}>Narx</th>
            <th style={{ textAlign: "right", padding: "1.5mm 2mm", border: "1px solid #999", background: "#f0f0f0", width: "28mm" }}>Umumiy narx</th>
          </tr>
        </thead>
        <tbody>
          {purchase.items.map((it, i) => (
            <tr key={i}>
              <td style={{ padding: "1.5mm 2mm", border: "1px solid #ccc" }}>{it.name}</td>
              <td style={{ padding: "1.5mm 2mm", border: "1px solid #ccc", textAlign: "center" }}>{it.qty}</td>
              <td style={{ padding: "1.5mm 2mm", border: "1px solid #ccc", textAlign: "right" }}>{fmt(it.price)}</td>
              <td style={{ padding: "1.5mm 2mm", border: "1px solid #ccc", textAlign: "right" }}>{fmt(it.price * it.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* PASTKI QATOR - Jami, Eski qarz, Xozirgi qarz - uzunasiga */}
      <div style={{ display: "flex", borderTop: "2px solid #111", marginTop: "4mm", paddingTop: "3mm", fontSize: 12, flexShrink: 0 }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#666" }}>Jami</div>
          <div style={{ fontWeight: 700 }}>{fmt(purchase.total)}</div>
        </div>
        <div style={{ flex: 1, textAlign: "center", borderLeft: "1px solid #ccc" }}>
          <div style={{ fontSize: 10, color: "#666" }}>Eski qarz</div>
          <div style={{ fontWeight: 700 }}>{fmt(purchase.oldDebt)}</div>
        </div>
        <div style={{ flex: 1, textAlign: "center", borderLeft: "1px solid #ccc" }}>
          <div style={{ fontSize: 10, color: "#666" }}>Xozirgi qarz</div>
          <div style={{ fontWeight: 700, color: purchase.newDebt > 0 ? "#a1281f" : "#2c7a4b" }}>{fmt(purchase.newDebt)}</div>
        </div>
      </div>
    </div>
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
    const terms = q.split(/\s+/).filter(Boolean);
    return products.filter((p) => {
      const nameLower = p.name.toLowerCase();
      return terms.every((term) => nameLower.includes(term));
    });
  }, [products, search]);

  async function uploadImage(file) {
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await supabase.storage.from("part-images").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("part-images").getPublicUrl(path);
        return data.publicUrl;
      }
      lastError = error;
      await new Promise((r) => setTimeout(r, 600));
    }
    throw lastError;
  }

  async function saveForm() {
    if (!form.name.trim()) return;
    setUploading(true);
    let imageUrl = form.image_url || null;
    try { if (form.imageFile) imageUrl = await uploadImage(form.imageFile); }
    catch (e) { alert("Rasm yuklashda xatolik: " + e.message); setUploading(false); return; }
    const payload = { name: form.name.trim(), price: Number(form.price) || 0, cost_price: Number(form.cost_price) || 0, qty: Number(form.qty) || 0, image_url: imageUrl, birlik: form.birlik || "dona" };
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
        <button className="ob-btn ob-btn-primary" onClick={() => setForm({ name: "", price: "", cost_price: "", qty: "", image_url: null, imageFile: null, birlik: "dona" })}>
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
            onEdit={() => setForm({ id: p.id, name: p.name, price: p.price, cost_price: p.cost_price, qty: p.qty, image_url: p.image_url, imageFile: null, birlik: p.birlik || "dona" })}
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input type="number" className="ob-input" placeholder="Miqdori" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={() => setForm({ ...form, birlik: "dona" })}
                className="ob-btn" style={{ flex: 1, background: form.birlik !== "komplekt" ? ORANGE : "#f7f6f1", color: form.birlik !== "komplekt" ? "#fff" : "#161615", padding: "10px 8px", fontSize: 13 }}>
                Dona
              </button>
              <button type="button" onClick={() => setForm({ ...form, birlik: "komplekt" })}
                className="ob-btn" style={{ flex: 1, background: form.birlik === "komplekt" ? ORANGE : "#f7f6f1", color: form.birlik === "komplekt" ? "#fff" : "#161615", padding: "10px 8px", fontSize: 13 }}>
                Komplekt
              </button>
            </div>
          </div>
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
          Kirim: {fmt(p.cost_price)} • Sotuv: {fmt(p.price)} • Miqdor: <span style={{ color: p.qty <= 0 ? "#c0392b" : "inherit", fontWeight: p.qty <= 0 ? 700 : 400 }}>{p.qty} {p.birlik === "komplekt" ? "komplekt" : "dona"}</span>
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
    const terms = q.split(/\s+/).filter(Boolean);
    return items.filter((p) => {
      const nameLower = p.name.toLowerCase();
      return terms.every((term) => nameLower.includes(term));
    });
  }, [items, search]);

  async function uploadImage(file) {
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await supabase.storage.from("part-images").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("part-images").getPublicUrl(path);
        return data.publicUrl;
      }
      lastError = error;
      await new Promise((r) => setTimeout(r, 600));
    }
    throw lastError;
  }

  async function saveForm() {
    if (!form.name.trim()) return;
    setUploading(true);
    let imageUrl = form.image_url || null;
    try { if (form.imageFile) imageUrl = await uploadImage(form.imageFile); }
    catch (e) { alert("Rasm yuklashda xatolik: " + e.message); setUploading(false); return; }
    const payload = { name: form.name.trim(), price: Number(form.price) || 0, cost_price: Number(form.cost_price) || 0, qty: Number(form.qty) || 0, image_url: imageUrl, birlik: form.birlik || "dona" };
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
      await supabase.from("products").insert({ name: item.name, price: item.price, cost_price: item.cost_price, qty, image_url: item.image_url, birlik: item.birlik || "dona" });
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
        <button className="ob-btn ob-btn-primary" onClick={() => setForm({ name: "", price: "", cost_price: "", qty: "", image_url: null, imageFile: null, birlik: "dona" })}>
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
            onEdit={() => setForm({ id: p.id, name: p.name, price: p.price, cost_price: p.cost_price, qty: p.qty, image_url: p.image_url, imageFile: null, birlik: p.birlik || "dona" })}
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
                <div style={{ fontSize: 12.5, color: "#8a887e" }}>Tizimda: {p.qty} {p.birlik === "komplekt" ? "komplekt" : "dona"}</div>
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
    if (!/^\d{4,8}$/.test(id)) { setError("Mijoz ID 4 yoki 8 xonali bo'lishi kerak"); return; }
    const { data } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
    if (data) setCustomer(data); else setError("Bunday mijoz topilmadi");
  }

  const productResults = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return [];
    const terms = q.split(/\s+/).filter(Boolean);
    return products.filter((p) => {
      const nameLower = p.name.toLowerCase();
      return terms.every((term) => nameLower.includes(term));
    }).slice(0, 8);
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
          <input className="ob-input" placeholder="Mijoz ID (4 yoki 8 xonali)" value={customerId}
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
  const [driverPayments, setDriverPayments] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: sales }, { data: customers }, { data: products }, { data: uyOmbor }, { data: drvPayments }] = await Promise.all([
      supabase.from("sales").select("seller_name, total"),
      supabase.from("customers").select("debt"),
      supabase.from("products").select("price, cost_price, qty"),
      supabase.from("uy_ombor").select("price, cost_price, qty"),
      supabase.from("payments").select("*, customers(name)").not("driver_name", "is", null).order("created_at", { ascending: false }).limit(100),
    ]);
    setDriverPayments(drvPayments || []);

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

      <div className="ob-card">
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Haydovchilar qabul qilgan tolovlar</div>
        {driverPayments.length === 0 ? <div style={{ color: "#8a887e", fontSize: 13.5 }}>Hali haydovchi orqali tolov qilinmagan.</div> : (
          <div style={{ display: "grid", gap: 8 }}>
            {driverPayments.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5, borderBottom: "1px solid #efeee7", paddingBottom: 8, flexWrap: "wrap", gap: 4 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.driver_name} {"\u2192"} {p.customers?.name || "Nomalum mijoz"}</div>
                  <div style={{ color: "#8a887e", fontSize: 12 }}>{formatDate(p.created_at)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700 }}>{fmt(p.amount)}</div>
                  {p.currency === "SOM" && p.original_amount ? (
                    <div style={{ fontSize: 11.5, color: "#8a887e" }}>{Number(p.original_amount).toLocaleString("en-US")} som</div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- STORIES ---------------- */
function StoriesSection() {
  const [stories, setStories] = useState([]);
  const [viewCounts, setViewCounts] = useState({});
  const [uploading, setUploading] = useState(false);
  const [viewersFor, setViewersFor] = useState(null);
  const [viewersList, setViewersList] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => { refresh(); }, []);
  async function refresh() {
    const { data } = await supabase.from("stories").select("*").eq("active", true).order("created_at", { ascending: false });
    setStories(data || []);
    const { data: views } = await supabase.from("story_views").select("story_id");
    const counts = {};
    (views || []).forEach((v) => { counts[v.story_id] = (counts[v.story_id] || 0) + 1; });
    setViewCounts(counts);
  }

  async function showViewers(storyId) {
    const { data } = await supabase
      .from("story_views")
      .select("viewed_at, customers(name)")
      .eq("story_id", storyId)
      .order("viewed_at", { ascending: false });
    setViewersList(data || []);
    setViewersFor(storyId);
  }

  async function handleFile(file) {
    if (!file) return;
    setUploading(true);
    try {
      const isVideo = file.type.startsWith("video");
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("stories").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("stories").getPublicUrl(path);
      await supabase.from("stories").insert({ media_url: pub.publicUrl, media_type: isVideo ? "video" : "image" });
      refresh();
    } catch (e) {
      alert("Yuklashda xatolik: " + e.message);
    } finally {
      setUploading(false);
    }
  }

  async function deleteStory(id) {
    if (!confirm("Bu storyni o'chirishga ishonchingiz komilmi?")) return;
    await supabase.from("stories").update({ active: false }).eq("id", id);
    refresh();
  }

  return (
    <div>
      <div className="ob-card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Yangi story qo'shish</div>
        <div style={{ fontSize: 13, color: "#8a887e", marginBottom: 12 }}>Rasm yoki video yuklang — mijoz mobil ilovasida Market bo'limi tepasida ko'rinadi.</div>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
        <button className="ob-btn ob-btn-primary" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
          {uploading ? "Yuklanmoqda..." : "Rasm / Video tanlash"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
        {stories.length === 0 ? (
          <div style={{ gridColumn: "1 / -1" }}><EmptyState text="Hali story qo'shilmagan." /></div>
        ) : stories.map((s) => (
          <div key={s.id} className="ob-card" style={{ padding: 10 }}>
            <div style={{ width: "100%", aspectRatio: "1", borderRadius: 10, overflow: "hidden", background: "#f7f6f1", marginBottom: 8, position: "relative" }}>
              {s.media_type === "video" ? (
                <video src={s.media_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
              ) : (
                <img src={s.media_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
              {s.media_type === "video" && (
                <div style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.55)", borderRadius: 6, padding: 4 }}>
                  <Video size={12} color="#fff" />
                </div>
              )}
            </div>
            <div onClick={() => showViewers(s.id)} style={{ textAlign: "center", fontSize: 12, color: "#8a887e", marginBottom: 8, cursor: "pointer" }}>
              {viewCounts[s.id] || 0} kishi ko'rdi
            </div>
            <button className="ob-btn ob-btn-danger" style={{ width: "100%", padding: "6px 0", fontSize: 12.5 }} onClick={() => deleteStory(s.id)}>
              <Trash2 size={12} style={{ verticalAlign: -1 }} /> O'chirish
            </button>
          </div>
        ))}
      </div>

      {viewersFor && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setViewersFor(null)}>
          <div className="ob-card" style={{ maxWidth: 360, width: "90%", maxHeight: "70vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>Ko'rganlar ({viewersList.length})</div>
              <button className="ob-btn ob-btn-ghost" style={{ padding: "5px 9px" }} onClick={() => setViewersFor(null)}><X size={14} /></button>
            </div>
            {viewersList.length === 0 ? (
              <div style={{ color: "#8a887e", fontSize: 13.5 }}>Hali hech kim ko'rmagan.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {viewersList.map((v, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, borderBottom: "1px solid #efeee7", paddingBottom: 6 }}>
                    <span>{v.customers?.name || "Noma'lum"}</span>
                    <span style={{ color: "#8a887e", fontSize: 12 }}>{formatDate(v.viewed_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- XODIMLAR ---------------- */
function XodimlarSection() {
  const [sellers, setSellers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [yiguvchilar, setYiguvchilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [role, setRole] = useState("seller");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [raqam, setRaqam] = useState("");
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdInfo, setCreatedInfo] = useState(null);

  useEffect(() => { refresh(); }, []);
  async function refresh() {
    setLoading(true);
    const [{ data: s }, { data: d }, { data: y }] = await Promise.all([
      supabase.from("sellers").select("*").order("name"),
      supabase.from("drivers").select("*").order("name"),
      supabase.from("yiguvchilar").select("*").order("name"),
    ]);
    setSellers(s || []);
    setDrivers(d || []);
    setYiguvchilar(y || []);
    setLoading(false);
  }

  function resetForm() {
    setRole("seller"); setName(""); setUsername(""); setPassword(""); setRaqam("");
    setFormError(""); setCreatedInfo(null);
  }

  async function createStaff() {
    if (!name.trim()) { setFormError("Ism kiriting"); return; }
    if (role === "yiguvchi" && !raqam.trim()) { setFormError("Raqam (kod) kiriting"); return; }
    if (role !== "yiguvchi") {
      if (!username.trim()) { setFormError("Login kiriting"); return; }
      if (!password || password.length < 6) { setFormError("Parol kamida 6 belgi"); return; }
    }
    setCreating(true);
    setFormError("");
    try {
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data.session ? sessionRes.data.session.access_token : "";
      const res = await fetch("https://gbtqoqcvcgxueienqusn.supabase.co/functions/v1/create-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role, name: name.trim(), username: username.trim(), password, raqam: raqam.trim() }),
      });
      const json = await res.json();
      if (!json.ok) { setFormError(json.error || "Xatolik yuz berdi"); setCreating(false); return; }
      setCreatedInfo({ role, name: name.trim(), email: json.email, raqam: raqam.trim() });
      refresh();
    } catch (e) {
      setFormError("Tarmoq xatoligi");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      {!showForm ? (
        <button className="mb-btn mb-btn-primary" style={{ marginBottom: 16 }} onClick={() => { setShowForm(true); resetForm(); }}>
          + Yangi xodim qo'shish
        </button>
      ) : (
        <div className="mb-card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Yangi xodim</div>

          {createdInfo ? (
            <div>
              <div style={{ color: "#2c7a4b", fontWeight: 700, marginBottom: 8 }}>Xodim muvaffaqiyatli qoshildi!</div>
              <div style={{ fontSize: 13.5, marginBottom: 4 }}>Ism: <b>{createdInfo.name}</b></div>
              {createdInfo.role === "yiguvchi" ? (
                <div style={{ fontSize: 13.5, marginBottom: 12 }}>Kod: <b style={{ fontFamily: "monospace" }}>{createdInfo.raqam}</b></div>
              ) : (
                <div style={{ fontSize: 13.5, marginBottom: 12 }}>Login: <b style={{ fontFamily: "monospace" }}>{createdInfo.email}</b></div>
              )}
              <button className="mb-btn mb-btn-ghost" onClick={() => { setShowForm(false); resetForm(); }}>Yopish</button>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {[["seller", "Sotuvchi"], ["driver", "Haydovchi"], ["yiguvchi", "Yiguvchi"]].map(([r, label]) => (
                  <button key={r} type="button" onClick={() => setRole(r)}
                    className="mb-btn" style={{ flex: 1, background: role === r ? ORANGE : "#232C42", color: "#fff", fontSize: 13 }}>{label}</button>
                ))}
              </div>
              <input className="mb-input" style={{ marginBottom: 8 }} placeholder="Ismi" value={name} onChange={(e) => setName(e.target.value)} />
              {role === "yiguvchi" ? (
                <input className="mb-input" style={{ marginBottom: 8 }} placeholder="Raqam (kod)" value={raqam} onChange={(e) => setRaqam(e.target.value)} />
              ) : (
                <>
                  <input className="mb-input" style={{ marginBottom: 8 }} placeholder="Login (masalan: azizxon)" value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" />
                  <input className="mb-input" style={{ marginBottom: 8 }} type="password" placeholder="Parol (kamida 6 belgi)" value={password} onChange={(e) => setPassword(e.target.value)} />
                </>
              )}
              {formError && <div style={{ color: "#f0837f", fontSize: 13, marginBottom: 8 }}>{formError}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="mb-btn mb-btn-primary" disabled={creating} onClick={createStaff}>{creating ? "..." : "Yaratish"}</button>
                <button className="mb-btn mb-btn-ghost" onClick={() => setShowForm(false)}>Bekor qilish</button>
              </div>
            </>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ color: "#98A2B8", textAlign: "center", padding: 24 }}>Yuklanmoqda...</div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <div className="mb-card">
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Sotuvchilar ({sellers.length})</div>
            {sellers.length === 0 ? <div style={{ color: "#98A2B8", fontSize: 13.5 }}>Hali sotuvchi yoq.</div> : (
              <div style={{ display: "grid", gap: 8 }}>
                {sellers.map((s) => (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, borderBottom: "1px solid #1B2740", paddingBottom: 6 }}>
                    <span>{s.name}</span>
                    <span style={{ color: "#98A2B8" }}>{s.phone || "tel yoq"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-card">
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Haydovchilar ({drivers.length})</div>
            {drivers.length === 0 ? <div style={{ color: "#98A2B8", fontSize: 13.5 }}>Hali haydovchi yoq.</div> : (
              <div style={{ display: "grid", gap: 8 }}>
                {drivers.map((d) => (
                  <div key={d.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, borderBottom: "1px solid #1B2740", paddingBottom: 6 }}>
                    <span>{d.name}{d.is_admin ? " (admin)" : ""}</span>
                    <span style={{ color: "#98A2B8" }}>{d.phone || "tel yoq"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-card">
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Yig'uvchilar ({yiguvchilar.length})</div>
            {yiguvchilar.length === 0 ? <div style={{ color: "#98A2B8", fontSize: 13.5 }}>Hali yiguvchi yoq.</div> : (
              <div style={{ display: "grid", gap: 8 }}>
                {yiguvchilar.map((y) => (
                  <div key={y.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, borderBottom: "1px solid #1B2740", paddingBottom: 6 }}>
                    <span>{y.name}</span>
                    <span style={{ color: "#98A2B8", fontFamily: "monospace" }}>Kod: {y.raqam}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
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

const allCss = `
  * { box-sizing: border-box; }
  body { background: #0B1220; }
  .mb-btn, .ob-btn { cursor:pointer; border:none; border-radius:8px; font-weight:700; font-size:14px; padding:10px 16px; }
  .mb-btn-primary, .ob-btn-primary { background:${ORANGE}; color:#fff; }
  .mb-btn-primary:hover, .ob-btn-primary:hover { background:${ORANGE_DARK}; }
  .mb-btn-primary:disabled, .ob-btn-primary:disabled { background:#5a4238; color:#9a8478; }
  .mb-btn-dark, .ob-btn-dark { background:#232C42; color:#fff; }
  .mb-btn-dark:hover, .ob-btn-dark:hover { background:#2A3652; }
  .mb-btn-ghost, .ob-btn-ghost { background:transparent; border:1.5px solid #2A3652; color:#E7EAF0; }
  .mb-btn-ghost:hover, .ob-btn-ghost:hover { background:#1B2740; }
  .mb-btn-danger, .ob-btn-danger { background:#3A2020; color:#f0837f; }
  .mb-btn-danger:hover, .ob-btn-danger:hover { background:#4A2828; }
  .mb-input, .ob-input { width:100%; padding:10px 12px; border:1.5px solid #2A3652; border-radius:8px; font-size:14px; background:#0F1729; color:#E7EAF0; }
  .mb-input::placeholder, .ob-input::placeholder { color:#5A6580; }
  .mb-input:focus, .ob-input:focus { outline:none; border-color:${ORANGE}; }
  .mb-card, .ob-card { background:#141B2E; border-radius:14px; padding:20px; border:1px solid #232C42; color:#E7EAF0; }
  .mb-table { width:100%; border-collapse:collapse; font-size:13.5px; color:#E7EAF0; }
  .mb-table th { text-align:left; padding:9px 10px; color:#98A2B8; font-weight:700; font-size:11.5px; text-transform:uppercase; border-bottom:1.5px solid #232C42; }
  .mb-table td { padding:10px; border-bottom:1px solid #1B2740; vertical-align:middle; }
  .mb-tab { display:flex; align-items:center; gap:7px; padding:12px 18px; cursor:pointer; color:#98A2B8; font-weight:700; font-size:14px; border-bottom:3px solid transparent; white-space:nowrap; }
  .mb-tab.active { color:#fff; border-bottom-color:${ORANGE}; }
  .sidebar-item { display:flex; align-items:center; gap:10px; padding:11px 14px; border-radius:10px; cursor:pointer; color:#98A2B8; font-weight:600; font-size:13.5px; }
  .sidebar-item:hover { background:#1B2740; }
  .sidebar-item.active { background:${ORANGE}; color:#fff; }
  .sidebar-sub { display:flex; align-items:center; gap:10px; padding:9px 14px 9px 40px; border-radius:8px; cursor:pointer; color:#8492AA; font-weight:600; font-size:13px; }
  .sidebar-sub:hover { background:#1B2740; color:#E7EAF0; }
  .sidebar-sub.active { background:#232C42; color:#fff; }
  .print-only { display:none; }
  @media print {
    .no-print { display:none !important; }
    .print-only { display:block !important; }
    @page { size: A4; margin: 0; }
    body { margin: 0; }
  }
`;