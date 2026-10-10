import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search, Plus, Trash2, Printer, LogOut, ShoppingCart,
  Users, History, X, Instagram, Send, Wallet, Check, ChevronLeft, Inbox,
  Pencil, Package, Image as ImageIcon,
  Warehouse, ClipboardCheck, Undo2, BarChart3, ArrowRightLeft, Sparkles, Video, FileText, MapPin, Truck
} from "lucide-react";
import { supabase } from "./supabaseClient";
import * as XLSX from "xlsx";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const SELLER_NAMES = ["Azizxon", "Doniyorjon", "Jahongir", "Javohirbek", "Hamidjon", "Jamshidbek", "Xislatbek", "Mubashirxon", "Jahongiroldi"];
const FEATURED_GROUPS = [
  { key: "yangiliklar", label: "Yangiliklar" },
  { key: "eng_kop_soralgan", label: "Eng ko'p so'ralgan" },
  { key: "mavsumiy", label: "Mavsumiy" },
  { key: "garantiyalik", label: "Garantiyalik" },
];
const ORANGE = "#E9642B";
const ORANGE_DARK = "#C24F1F";
const PURPLE_DARK = "#0B1220";
const PURPLE = "#141B2E";
const PURPLE_BORDER = "#232C42";

function fmt(n) { return "$" + (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function formatDate(iso) {
  try { return new Date(iso).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch (e) { return iso; }
}

function compressImage(file, maxWidth = 800, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.onerror = reject;
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round(height * (maxWidth / width));
        width = maxWidth;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })),
        "image/jpeg",
        quality
      );
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function LogoMark({ size = 20 }) {
  return (
    <img src="/logo.png" alt="MARBA" style={{ height: size * 1.6, width: "auto", maxWidth: 160 }} />
  );
}

async function nextCustomerId() {
  const { data } = await supabase
    .from("customers")
    .select("id")
    .order("id", { ascending: false })
    .limit(50);
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
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    try {
      const audio = new window.Audio("/splash-sound.wav");
      audio.volume = 0.8;
      audio.play().catch(() => {});
    } catch (e) {}
    const t = setTimeout(() => setShowSplash(false), 2200);
    return () => clearTimeout(t);
  }, []);

  const [updateAvailable, setUpdateAvailable] = useState(false);
  const initialEtagRef = useRef(null);
  useEffect(() => {
    async function checkVersion() {
      try {
        const res = await fetch("/", { method: "HEAD", cache: "no-store" });
        const etag = res.headers.get("etag") || res.headers.get("last-modified");
        if (!etag) return;
        if (initialEtagRef.current === null) {
          initialEtagRef.current = etag;
        } else if (etag !== initialEtagRef.current) {
          setUpdateAvailable(true);
        }
      } catch (e) {}
    }
    checkVersion();
    const interval = setInterval(checkVersion, 90000);
    return () => clearInterval(interval);
  }, []);

  const [session, setSession] = useState(null);
  const [sellerName, setSellerName] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [sellerLavozim, setSellerLavozim] = useState("sotuvchi");
  const [loginName, setLoginName] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState(false);

  const [sectionState, setSection] = useState(null);
  const restricted = sellerLavozim === "mesta";
  const section = restricted ? "polka" : sectionState;
  const [expandedGroup, setExpandedGroup] = useState("sotuvchi");
  const [products, setProducts] = useState([]);

  const [saleCustomer, setSaleCustomer] = useState(null);
  const [customerIdInput, setCustomerIdInput] = useState("");
  const [saleError, setSaleError] = useState("");
  const [newCustomerForm, setNewCustomerForm] = useState(null);
  const [cart, setCart] = useState([]);
  const [saleSearch, setSaleSearch] = useState("");
  const [saleBolim, setSaleBolim] = useState("hammasi");
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
      if (s) initSeller(s); else { setSession(null); setSellerName(""); setSellerLavozim("sotuvchi"); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function initSeller(s) {
    const { data } = await supabase.from("sellers").select("name, phone, lavozim").eq("auth_user_id", s.user.id).maybeSingle();
    setSellerName(data?.name || s.user.email.split("@")[0]);
    setSellerPhone(data?.phone || "");
    setSellerLavozim(data?.lavozim || "sotuvchi");
    setSession(s);
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
    setSection(null); setSaleCustomer(null); setCart([]);
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
    const byBolim = saleBolim !== "hammasi";
    if (!q && !byBolim) return [];
    const terms = q.split(/\s+/).filter(Boolean);
    const base = byBolim ? products.filter((p) => p.bolim === saleBolim) : products;
    return base.filter((p) => {
      const nameLower = p.name.toLowerCase();
      return terms.every((term) => nameLower.includes(term));
    }).slice(0, byBolim && !q ? 30 : 8);
  }, [saleSearch, saleBolim, products]);

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

  if (showSplash) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#081018" }}>
        <style>{`
          @keyframes marbaSplashIn {
            0% { opacity: 0; transform: scale(0.75); }
            60% { opacity: 1; transform: scale(1.05); }
            100% { opacity: 1; transform: scale(1); }
          }
          .marba-splash-logo { animation: marbaSplashIn 1.1s cubic-bezier(.2,.9,.3,1.3) forwards; }
        `}</style>
        <img src="/logo.png" alt="MARBA" className="marba-splash-logo" style={{ width: 160, height: "auto" }} />
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0B1220", padding: 24 }}>
        <style>{allCss}</style>
        {updateAvailable && <UpdateBanner />}
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

  const MENU_ITEMS = [
    { key: "sale", label: "Yangi sotuv", icon: ShoppingCart },
    { key: "orders", label: "Yangi buyurtmalar", icon: Inbox, badge: newOrdersCount },
    { key: "accepted", label: "Qabul qilingan", icon: ClipboardCheck, badge: acceptedOrdersCount },
    { key: "history", label: "Sotuvchi tarixi", icon: History },
    { key: "customers", label: "Mijozlar", icon: Users },
    { key: "aktsverka", label: "Akt sverkasi", icon: FileText },
    { key: "xodimlar", label: "Xodimlar", icon: Users },
    { key: "ombor", label: "Ombor", icon: Package },
    { key: "uyombor", label: "Uy ombor", icon: Warehouse },
    { key: "vazvrat", label: "Vazvrat", icon: Undo2 },
    { key: "reviziya", label: "Reviziya", icon: ClipboardCheck },
    { key: "stories", label: "Stories", icon: Sparkles },
    { key: "featured", label: "Market tovarlar", icon: Package },
    { key: "statistika", label: "Statistika", icon: BarChart3 },
    { key: "import", label: "1C Import", icon: Package },
    { key: "buxgalter", label: "Buxgalter", icon: FileText },
    { key: "yiguv", label: "Yig'uv", icon: ClipboardCheck },
    { key: "polka", label: "Polka (mesta)", icon: MapPin },
    { key: "haydovchilar", label: "Haydovchilar", icon: Truck },
  ];
  const activeMenuItem = MENU_ITEMS.find((m) => m.key === section);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#0B1220", color: "#E7EAF0" }}>
      <style>{allCss}</style>
      {updateAvailable && <UpdateBanner />}

      {section === null ? (
        <div className="no-print" style={{ minHeight: "100vh", padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ marginBottom: 28 }}><LogoMark size={24} /></div>
          <div
            style={{ color: "#98A2B8", fontSize: 13, cursor: "pointer", marginBottom: 10, textAlign: "center" }}
            onClick={() => {
              const val = prompt("Telefon raqamingizni kiriting:", sellerPhone);
              if (val !== null) savePhone(val.trim());
            }}
          >
            <b style={{ color: "#fff" }}>{sellerName}</b>{sellerPhone ? "" : " (tel kiritilmagan)"}
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            gap: 16,
            width: "100%",
            maxWidth: 1000,
            marginTop: 10,
          }}>
            {MENU_ITEMS.map(({ key, label, icon: Icon, badge }) => (
              <div key={key} onClick={() => setSection(key)} style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div style={{ position: "relative" }}>
                  <div style={{ width: 68, height: 68, borderRadius: 20, background: "#141B2E", border: "1px solid #232C42", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={28} color={ORANGE} />
                  </div>
                  {!!badge && (
                    <div style={{ position: "absolute", top: -6, right: -6, background: "#E53935", borderRadius: 10, minWidth: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>
                      <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>{badge}</span>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 12.5, textAlign: "center", color: "#C7CDDA", fontWeight: 600 }}>{label}</div>
              </div>
            ))}
          </div>

          <button className="mb-btn mb-btn-ghost" style={{ marginTop: 36, display: "flex", alignItems: "center", gap: 6 }} onClick={doLogout}><LogOut size={15} /> Chiqish</button>
        </div>
      ) : (
      <div className="no-print" style={{ minHeight: "100vh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderBottom: `1px solid ${PURPLE_BORDER}`, background: "#0B1220" }}>
          {!restricted && (
            <button className="mb-btn mb-btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px" }} onClick={() => setSection(null)}>
              <ChevronLeft size={16} /> Menyu
            </button>
          )}
          <div style={{ fontWeight: 700, fontSize: 15 }}>{activeMenuItem ? activeMenuItem.label : ""}</div>
          <button className="mb-btn mb-btn-ghost" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "8px 12px" }} onClick={doLogout}><LogOut size={15} /> Chiqish</button>
        </div>

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
                          {o.packed_by ? "\u{1F4E6} " + o.packed_by : ""}{o.packed_by && o.driver_name ? " \u2022 " : ""}{o.driver_name ? "\u{1F697} " + o.driver_name : ""}
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
                      <div style={{ color: "#98A2B8", fontSize: 13, marginBottom: 10 }}>Yangi mijoz ID: <b style={{ color: "#fff", fontFamily: "monospace", fontSize: 15 }}>{newCustomerForm.previewId}</b></div>
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
                      {saleCustomer.debt > 0 && <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, background: "#3A2020", color: "#f0837f", fontSize: 12.5, fontWeight: 700, padding: "4px 10px", borderRadius: 6 }}><Wallet size={13} /> Joriy qarz: {fmt(saleCustomer.debt)}</div>}
                    </div>
                    <button className="mb-btn mb-btn-ghost" onClick={changeCustomer}><ChevronLeft size={14} style={{ verticalAlign: -2 }} /> Boshqa mijoz</button>
                  </div>

                  <div className="mb-card">
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>2. Ehtiyot qismlar qo'shish</div>
                    <div style={{ marginBottom: 10 }}>
                      <BolimChips value={saleBolim} onChange={setSaleBolim} products={products} />
                    </div>
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
                      <div style={{ fontSize: 13.5, color: debtPreview > 0 ? "#f0837f" : "#2c7a4b", fontWeight: 600, marginBottom: 14 }}>{debtPreview > 0 ? `Yangi qarz bo'ladi: ${fmt(debtPreview)}` : "Qarz qolmaydi"}</div>
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
                      {c.debt > 0 && <div style={{ color: "#f0837f", fontWeight: 700, fontSize: 13.5 }}>Qarz: {fmt(c.debt)}</div>}
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
                    <div style={{ background: "#1B2740", borderRadius: 10, padding: "10px 16px" }}><div style={{ fontSize: 11.5, color: "#98A2B8", fontWeight: 700 }}>JORIY QARZ</div><div style={{ fontSize: 18, fontWeight: 700, color: selectedCustomer.debt > 0 ? "#f0837f" : "#2c7a4b" }}>{fmt(selectedCustomer.debt)}</div></div>
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
                        <td style={{ color: r.paid < r.total ? "#f0837f" : "#2c7a4b" }}>{fmt(r.paid)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {section === "aktsverka" && <AktSverkaSection />}
          {section === "ombor" && <OmborSection sellerName={sellerName} />}
          {section === "uyombor" && <UyOmborSection sellerName={sellerName} />}
          {section === "reviziya" && <ReviziyaSection sellerName={sellerName} />}
          {section === "vazvrat" && <VazvratSection sellerName={sellerName} />}
          {section === "statistika" && <StatistikaSection />}
          {section === "stories" && <StoriesSection />}
          {section === "xodimlar" && <XodimlarSection />}
          {section === "featured" && <FeaturedProductsSection />}
          {section === "import" && <ImportSection />}
          {section === "buxgalter" && <BuxgalterSection />}
          {section === "yiguv" && <YiguvSection />}
          {section === "polka" && <PolkaSection sellerName={sellerName} />}
          {section === "haydovchilar" && <HaydovchilarSection />}
        </div>
      </div>
      )}

      {receipt && <ReceiptOverlay data={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

function UpdateBanner() {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 999,
      background: "#E9642B", color: "#fff", padding: "10px 16px",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 14,
      fontSize: 13.5, fontWeight: 700,
    }}>
      <span>Yangi versiya mavjud</span>
      <button
        onClick={() => window.location.reload(true)}
        style={{ background: "#fff", color: "#E9642B", border: "none", borderRadius: 6, padding: "5px 14px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}
      >
        Yangilash
      </button>
    </div>
  );
}

function ReceiptOverlay({ data, onClose }) {
  return (
    <>
      <div className="no-print" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }} onClick={onClose}>
        <div style={{ background: "#fff", borderRadius: 12, maxWidth: 640, width: "100%", maxHeight: "90vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
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
  return (
    <div style={{ padding: 28, color: "#111", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #111", paddingBottom: 14, marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
        <div>
          <LogoMark size={18} />
          <div style={{ marginTop: 10, fontSize: 13.5, lineHeight: 1.7 }}>
            <div>Buyurtma #: <b>{purchase.order_no || "-"}</b></div>
            <div>Mijoz ID: <b style={{ fontFamily: "monospace" }}>{customer?.id}</b></div>
            <div>Mijoz: <b>{customer?.name}</b></div>
            <div>Mijoz tel: {customer?.phone || "-"}</div>
            <div>Manzil: {customer?.viloyat}{customer?.manzil ? `, ${customer.manzil}` : ""}</div>
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 12.5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end", marginBottom: 4 }}><Instagram size={14} /> @marba_avtoparts</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end", marginBottom: 10 }}><Send size={14} /> @marba_zapchast</div>
          <div>Sana: {formatDate(purchase.date)}</div>
          <div>Sotuvchi: {seller}</div>
          <div>Sotuvchi tel: {sellerPhone || "-"}</div>
          {customer?.delivery_lat && customer?.delivery_lng && (
            <div style={{ marginTop: 10 }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`https://yandex.uz/maps/?pt=${customer.delivery_lng},${customer.delivery_lat}&z=16&l=map`)}`}
                alt="Manzil QR"
                style={{ width: 80, height: 80 }}
              />
              <div style={{ fontSize: 10, color: "#666", marginTop: 3 }}>Yetkazib berish manzili</div>
            </div>
          )}
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, marginBottom: 14 }}>
        <thead><tr><th style={{ textAlign: "left", padding: "6px 4px", borderBottom: "2px solid #111" }}>Nomi</th><th style={{ textAlign: "center", padding: "6px 4px", borderBottom: "2px solid #111" }}>Soni</th><th style={{ textAlign: "right", padding: "6px 4px", borderBottom: "2px solid #111" }}>Narxi</th><th style={{ textAlign: "right", padding: "6px 4px", borderBottom: "2px solid #111" }}>Summa</th></tr></thead>
        <tbody>
          {purchase.items.map((it, i) => (
            <tr key={i}><td style={{ padding: "6px 4px", borderBottom: "1px solid #ddd" }}>{it.name}</td><td style={{ padding: "6px 4px", borderBottom: "1px solid #ddd", textAlign: "center" }}>{it.qty}</td><td style={{ padding: "6px 4px", borderBottom: "1px solid #ddd", textAlign: "right" }}>{fmt(it.price)}</td><td style={{ padding: "6px 4px", borderBottom: "1px solid #ddd", textAlign: "right" }}>{fmt(it.price * it.qty)}</td></tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: "flex", borderTop: "2px solid #111", paddingTop: 12, fontSize: 14 }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#666" }}>Jami</div>
          <div style={{ fontWeight: 700 }}>{fmt(purchase.total)}</div>
        </div>
        <div style={{ flex: 1, textAlign: "center", borderLeft: "1px solid #ccc" }}>
          <div style={{ fontSize: 11, color: "#666" }}>Eski qarz</div>
          <div style={{ fontWeight: 700 }}>{fmt(purchase.oldDebt)}</div>
        </div>
        <div style={{ flex: 1, textAlign: "center", borderLeft: "1px solid #ccc" }}>
          <div style={{ fontSize: 11, color: "#666" }}>Hozirgi qarz</div>
          <div style={{ fontWeight: 700, color: purchase.newDebt > 0 ? "#a1281f" : "#2c7a4b" }}>{fmt(purchase.newDebt)}</div>
        </div>
      </div>
      <div style={{ borderTop: "1px solid #ccc", marginTop: 18, paddingTop: 10, fontSize: 11.5, color: "#666", textAlign: "center" }}>MARBA AUTO PARTS \u2014 Xaridingiz uchun rahmat!</div>
    </div>
  );
}

/* ---------------- OMBOR (asosiy) ---------------- */
const BOLIMLAR = [
  { key: "motor", label: "Motor" },
  { key: "xodovoy", label: "Xodovoy" },
  { key: "elektr", label: "Elektr" },
  { key: "kuzov", label: "Kuzov" },
];

function BolimChips({ value, onChange, products, showNone }) {
  const count = (k) => products.filter((p) => (k === "yoq" ? !p.bolim : p.bolim === k)).length;
  const items = [{ key: "hammasi", label: "Hammasi", n: products.length }, ...BOLIMLAR.map((b) => ({ ...b, n: count(b.key) }))];
  if (showNone) items.push({ key: "yoq", label: "Belgilanmagan", n: count("yoq") });
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {items.map((it) => (
        <button key={it.key} type="button" onClick={() => onChange(it.key)} className="ob-btn"
          style={{ background: value === it.key ? ORANGE : "#1B2740", color: "#fff", fontSize: 12.5, padding: "7px 12px" }}>
          {it.label} ({it.n})
        </button>
      ))}
    </div>
  );
}

function OmborSection() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [bolimFilter, setBolimFilter] = useState("hammasi");
  const fileInputRef = useRef(null);

  useEffect(() => { refresh(); }, []);
  async function refresh() {
    const { data } = await supabase.from("products").select("*").order("name");
    setProducts(data || []);
  }

  async function assignBolim(p, value) {
    const v = value || null;
    const { error } = await supabase.from("products").update({ bolim: v }).eq("id", p.id);
    if (error) { alert("Bo'lim saqlanmadi: " + error.message); return; }
    setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, bolim: v } : x)));
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products;
    if (bolimFilter === "yoq") list = list.filter((p) => !p.bolim);
    else if (bolimFilter !== "hammasi") list = list.filter((p) => p.bolim === bolimFilter);
    if (!q) return list;
    const terms = q.split(/\s+/).filter(Boolean);
    return list.filter((p) => {
      const nameLower = p.name.toLowerCase();
      return terms.every((term) => nameLower.includes(term));
    });
  }, [products, search, bolimFilter]);

  async function uploadImage(file) {
    let uploadFile = file;
    try { uploadFile = await compressImage(file); } catch (e) { /* siqishda xato bolsa, asl faylni yuklaymiz */ }
    const ext = uploadFile.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await supabase.storage.from("part-images").upload(path, uploadFile);
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
    const payload = { name: form.name.trim(), price: Number(form.price) || 0, cost_price: Number(form.cost_price) || 0, qty: Number(form.qty) || 0, image_url: imageUrl, birlik: form.birlik || "dona", bolim: form.bolim || null };
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
          <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "#98A2B8" }} />
          <input className="ob-input" style={{ paddingLeft: 36 }} placeholder="Nomini yozing..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="ob-btn ob-btn-primary" onClick={() => setForm({ name: "", price: "", cost_price: "", qty: "", image_url: null, imageFile: null, birlik: "dona", bolim: bolimFilter !== "hammasi" && bolimFilter !== "yoq" ? bolimFilter : "" })}>
          <Plus size={14} style={{ verticalAlign: -2 }} /> Yangi tovar
        </button>
      </div>

      {form && (
        <ProductForm form={form} setForm={setForm} uploading={uploading} onSave={saveForm} onCancel={() => setForm(null)} fileInputRef={fileInputRef} />
      )}

      <div style={{ marginBottom: 14 }}>
        <BolimChips value={bolimFilter} onChange={setBolimFilter} products={products} showNone />
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {filtered.length === 0 ? (
          <EmptyState text="Hech narsa topilmadi." />
        ) : filtered.map((p) => (
          <ProductRow key={p.id} p={p}
            extra={
              <select className="ob-input" style={{ width: 120, padding: "6px 8px", fontSize: 12.5, flexShrink: 0 }} value={p.bolim || ""} onChange={(e) => assignBolim(p, e.target.value)}>
                <option value="">Bo'limsiz</option>
                {BOLIMLAR.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
              </select>
            }
            onEdit={() => setForm({ id: p.id, name: p.name, price: p.price, cost_price: p.cost_price, qty: p.qty, image_url: p.image_url, imageFile: null, birlik: p.birlik || "dona", bolim: p.bolim || "" })}
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
            style={{ width: 110, height: 110, borderRadius: 10, border: "2px dashed #2A3652", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", background: "#1B2740" }}>
            {form.imageFile ? <img src={URL.createObjectURL(form.imageFile)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : form.image_url ? <img src={form.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <ImageIcon size={24} color="#98A2B8" />}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => setForm({ ...form, imageFile: e.target.files[0] })} />
          <div style={{ fontSize: 11, color: "#98A2B8", textAlign: "center", marginTop: 4 }}>Rasm</div>
        </div>
        <div style={{ flex: 1, minWidth: 220, display: "grid", gap: 10 }}>
          <input className="ob-input" placeholder="Nomi" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="ob-input" value={form.bolim || ""} onChange={(e) => setForm({ ...form, bolim: e.target.value })}>
            <option value="">Bo'lim: tanlanmagan</option>
            {BOLIMLAR.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
          </select>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input type="number" className="ob-input" placeholder="Kirim narxi ($)" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
            <input type="number" className="ob-input" placeholder="Sotuv narxi ($)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input type="number" className="ob-input" placeholder="Miqdori" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={() => setForm({ ...form, birlik: "dona" })}
                className="ob-btn" style={{ flex: 1, background: form.birlik !== "komplekt" ? ORANGE : "#1B2740", color: "#fff", padding: "10px 8px", fontSize: 13 }}>
                Dona
              </button>
              <button type="button" onClick={() => setForm({ ...form, birlik: "komplekt" })}
                className="ob-btn" style={{ flex: 1, background: form.birlik === "komplekt" ? ORANGE : "#1B2740", color: "#fff", padding: "10px 8px", fontSize: 13 }}>
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
      <div style={{ width: 56, height: 56, borderRadius: 8, background: "#1B2740", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {p.image_url ? <img src={p.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={20} color="#5A6580" />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14.5 }}>{p.name}{p.featured ? " \u2B50" : ""}</div>
        <div style={{ fontSize: 12.5, color: "#98A2B8" }}>
          Kirim: {fmt(p.cost_price)} \u2022 Sotuv: {fmt(p.price)} \u2022 Miqdor: <span style={{ color: p.qty <= 0 ? "#f0837f" : "inherit", fontWeight: p.qty <= 0 ? 700 : 400 }}>{p.qty} {p.birlik === "komplekt" ? "komplekt" : "dona"}</span>
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
    <div className="ob-card" style={{ textAlign: "center", color: "#98A2B8", padding: "30px 0" }}>
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
    let uploadFile = file;
    try { uploadFile = await compressImage(file); } catch (e) {}
    const ext = uploadFile.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await supabase.storage.from("part-images").upload(path, uploadFile);
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
          <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "#98A2B8" }} />
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
          {history.length === 0 ? <div style={{ color: "#98A2B8", fontSize: 13.5 }}>Hali obmen bo'lmagan.</div> : (
            <div style={{ display: "grid", gap: 8 }}>
              {history.map((h) => (
                <div key={h.id} style={{ fontSize: 13, display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1B2740", paddingBottom: 6 }}>
                  <span>{h.product_name} \u2014 {h.qty} dona</span>
                  <span style={{ color: "#98A2B8" }}>{h.seller_name} \u2022 {formatDate(h.created_at)}</span>
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
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Reviziya \u2014 qoldiqni tekshirish</div>
        <div style={{ fontSize: 13, color: "#98A2B8" }}>Har bir tovar uchun ombordagi haqiqiy sonini kiriting va saqlang.</div>
      </div>
      <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
        {products.map((p) => {
          const actual = actuals[p.id];
          const diff = actual !== undefined && actual !== "" ? Number(actual) - p.qty : null;
          return (
            <div key={p.id} className="ob-card" style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{p.name}</div>
                <div style={{ fontSize: 12.5, color: "#98A2B8" }}>Tizimda: {p.qty} {p.birlik === "komplekt" ? "komplekt" : "dona"}</div>
              </div>
              <input type="number" className="ob-input" style={{ width: 100 }} placeholder="Haqiqiy son"
                value={actuals[p.id] ?? ""} onChange={(e) => setActuals((a) => ({ ...a, [p.id]: e.target.value }))} />
              {diff !== null && !isNaN(diff) && (
                <div style={{ fontSize: 13, fontWeight: 700, color: diff === 0 ? "#2c7a4b" : "#f0837f", minWidth: 90 }}>
                  {diff === 0 ? "Mos keladi" : diff > 0 ? `+${diff} ortiq` : `${diff} kam`}
                </div>
              )}
              <button className="ob-btn ob-btn-primary" style={{ padding: "8px 14px" }} disabled={actuals[p.id] === undefined || actuals[p.id] === ""} onClick={() => saveCheck(p)}>
                {savedIds[p.id] ? "Saqlandi \u2713" : "Saqlash"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="ob-card">
        <div style={{ fontWeight: 700, marginBottom: 10 }}>So'nggi reviziyalar</div>
        {history.length === 0 ? <div style={{ color: "#98A2B8", fontSize: 13.5 }}>Hali reviziya qilinmagan.</div> : (
          <div style={{ display: "grid", gap: 8 }}>
            {history.map((h) => (
              <div key={h.id} style={{ fontSize: 13, display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1B2740", paddingBottom: 6, flexWrap: "wrap", gap: 4 }}>
                <span>{h.product_name}: {h.expected_qty} \u2192 {h.actual_qty} <span style={{ color: h.difference === 0 ? "#2c7a4b" : "#f0837f", fontWeight: 700 }}>({h.difference > 0 ? "+" : ""}{h.difference})</span></span>
                <span style={{ color: "#98A2B8" }}>{h.seller_name} \u2022 {formatDate(h.created_at)}</span>
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
        {error && <div style={{ color: "#f0837f", fontSize: 13.5, marginTop: 8 }}>{error}</div>}
        {customer && (
          <div style={{ marginTop: 12, padding: 10, background: "#1B2740", borderRadius: 8 }}>
            <div style={{ fontWeight: 700 }}>{customer.name}</div>
            <div style={{ fontSize: 12.5, color: "#98A2B8" }}>ID: {customer.id} \u2022 Joriy qarz: {fmt(customer.debt)}</div>
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
                  style={{ padding: "8px 10px", background: "#1B2740", borderRadius: 8, cursor: "pointer", fontSize: 13.5 }}>{p.name}</div>
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
        {history.length === 0 ? <div style={{ color: "#98A2B8", fontSize: 13.5 }}>Hali vazvrat bo'lmagan.</div> : (
          <div style={{ display: "grid", gap: 8 }}>
            {history.map((h) => (
              <div key={h.id} style={{ fontSize: 13, display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1B2740", paddingBottom: 6, flexWrap: "wrap", gap: 4 }}>
                <span>{h.product_name} x{h.qty} \u2014 mijoz {h.customer_id} \u2014 {fmt(h.amount)}</span>
                <span style={{ color: "#98A2B8" }}>{h.seller_name} \u2022 {formatDate(h.created_at)}</span>
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
  const [allSales, setAllSales] = useState([]);
  const [periodTab, setPeriodTab] = useState("bugun");
  const [calDate, setCalDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: sales }, { data: customers }, { data: products }, { data: uyOmbor }, { data: drvPayments }] = await Promise.all([
      supabase.from("sales").select("seller_name, total, created_at"),
      supabase.from("customers").select("debt"),
      supabase.from("products").select("price, cost_price, qty"),
      supabase.from("uy_ombor").select("price, cost_price, qty"),
      supabase.from("payments").select("*, customers(name)").not("driver_name", "is", null).order("created_at", { ascending: false }).limit(100),
    ]);
    setDriverPayments(drvPayments || []);
    setAllSales(sales || []);

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

  const periodStats = useMemo(() => {
    const now = new Date();
    let from, to;
    if (periodTab === "bugun") {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      to = new Date(from); to.setDate(to.getDate() + 1);
    } else if (periodTab === "hafta") {
      from = new Date(now); from.setDate(from.getDate() - 6); from.setHours(0, 0, 0, 0);
      to = new Date(now); to.setDate(to.getDate() + 1); to.setHours(0, 0, 0, 0);
    } else if (periodTab === "oy") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    } else {
      from = new Date(calDate + "T00:00:00");
      to = new Date(from); to.setDate(to.getDate() + 1);
    }
    const filtered = allSales.filter((s) => {
      const d = new Date(s.created_at);
      return d >= from && d < to;
    });
    const total = filtered.reduce((s, r) => s + Number(r.total || 0), 0);
    return { total, count: filtered.length };
  }, [allSales, periodTab, calDate]);

  if (loading) return <div style={{ textAlign: "center", color: "#98A2B8", padding: 30 }}>Yuklanmoqda...</div>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="ob-card">
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Davriy savdo</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {[["bugun", "Bugun"], ["hafta", "1 hafta"], ["oy", "1 oy"], ["kalendar", "Kalendar"]].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setPeriodTab(key)}
              className="ob-btn" style={{ background: periodTab === key ? ORANGE : "#232C42", color: "#fff", fontSize: 12.5, padding: "8px 12px" }}>
              {label}
            </button>
          ))}
        </div>
        {periodTab === "kalendar" && (
          <input type="date" className="ob-input" style={{ maxWidth: 200, marginBottom: 12 }} value={calDate} onChange={(e) => setCalDate(e.target.value)} />
        )}
        <div style={{ display: "flex", gap: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: "#98A2B8" }}>JAMI SAVDO</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(periodStats.total)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#98A2B8" }}>SOTUVLAR SONI</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{periodStats.count}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <StatCard label="MIJOZLAR JORIY QARZI" value={fmt(totalDebt)} color="#f0837f" />
        <StatCard label="OMBOR QIYMATI (kirim narxida)" value={fmt(omborValue.cost)} />
        <StatCard label="OMBOR QIYMATI (sotuv narxida)" value={fmt(omborValue.sale)} color="#2c7a4b" />
        <StatCard label="UY OMBOR QIYMATI (kirim narxida)" value={fmt(uyOmborValue.cost)} />
        <StatCard label="UY OMBOR QIYMATI (sotuv narxida)" value={fmt(uyOmborValue.sale)} color="#2c7a4b" />
      </div>

      <div className="ob-card">
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Sotuvchilar bo'yicha sotuv statistikasi</div>
        {sellerStats.length === 0 ? <div style={{ color: "#98A2B8", fontSize: 13.5 }}>Hali sotuv yo'q.</div> : (
          <div style={{ display: "grid", gap: 8 }}>
            {sellerStats.map(([name, total]) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, borderBottom: "1px solid #1B2740", paddingBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>{name}</span>
                <span style={{ fontWeight: 700 }}>{fmt(total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="ob-card">
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Haydovchilar qabul qilgan to'lovlar</div>
        {driverPayments.length === 0 ? <div style={{ color: "#98A2B8", fontSize: 13.5 }}>Hali haydovchi orqali to'lov qilinmagan.</div> : (
          <div style={{ display: "grid", gap: 8 }}>
            {driverPayments.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5, borderBottom: "1px solid #1B2740", paddingBottom: 8, flexWrap: "wrap", gap: 4 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.driver_name} {"\u2192"} {p.customers?.name || "Nomalum mijoz"}</div>
                  <div style={{ color: "#98A2B8", fontSize: 12 }}>{formatDate(p.created_at)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700 }}>{fmt(p.amount)}</div>
                  {p.currency === "SOM" && p.original_amount ? (
                    <div style={{ fontSize: 11.5, color: "#98A2B8" }}>{Number(p.original_amount).toLocaleString("en-US")} som</div>
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

function StatCard({ label, value, color }) {
  return (
    <div className="ob-card">
      <div style={{ fontSize: 11.5, color: "#98A2B8", fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 700, color: color || "#E7EAF0" }}>{value}</div>
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
        <div style={{ fontSize: 13, color: "#98A2B8", marginBottom: 12 }}>Rasm yoki video yuklang \u2014 mijoz mobil ilovasida Market bo'limi tepasida ko'rinadi.</div>
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
            <div style={{ width: "100%", aspectRatio: "1", borderRadius: 10, overflow: "hidden", background: "#1B2740", marginBottom: 8, position: "relative" }}>
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
            <div onClick={() => showViewers(s.id)} style={{ textAlign: "center", fontSize: 12, color: "#98A2B8", marginBottom: 8, cursor: "pointer" }}>
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
              <div style={{ color: "#98A2B8", fontSize: 13.5 }}>Hali hech kim ko'rmagan.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {viewersList.map((v, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, borderBottom: "1px solid #1B2740", paddingBottom: 6 }}>
                    <span>{v.customers?.name || "Noma'lum"}</span>
                    <span style={{ color: "#98A2B8", fontSize: 12 }}>{formatDate(v.viewed_at)}</span>
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
/* ---------------- YIGUV (Yiguvchi - polka belgilash) ---------------- */
function YiguvSection() {
  const [code, setCode] = useState("");
  const [yiguvchi, setYiguvchi] = useState(null);
  const [codeError, setCodeError] = useState("");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);

  async function identify() {
    setCodeError("");
    const raqam = code.trim();
    if (!raqam) { setCodeError("Kodni kiriting"); return; }
    const { data } = await supabase.from("yiguvchilar").select("*").eq("raqam", raqam).maybeSingle();
    if (!data) { setCodeError("Bunday kod topilmadi"); return; }
    setYiguvchi(data);
    refreshOrders();
  }

  async function refreshOrders() {
    setOrdersLoading(true);
    const { data } = await supabase
      .from("buyurtmalar")
      .select("*, buyurtma_items(*)")
      .eq("status", "qabul_qilindi")
      .order("created_at", { ascending: true });
    const list = data || [];
    const customerIds = [...new Set(list.map((o) => o.customer_id))];
    let customerMap = {};
    if (customerIds.length) {
      const { data: custs } = await supabase.from("customers").select("id, name, viloyat, manzil").in("id", customerIds);
      (custs || []).forEach((c) => { customerMap[c.id] = c; });
    }
    setOrders(list.map((o) => ({ ...o, customer: customerMap[o.customer_id] })));
    setOrdersLoading(false);
  }

  async function markPacked(order) {
    setSavingId(order.id);
    const { error } = await supabase
      .from("buyurtmalar")
      .update({ status: "yigilmoqda", packed_by: yiguvchi.name })
      .eq("id", order.id);
    setSavingId(null);
    if (error) { alert("Xatolik: " + error.message); return; }
    refreshOrders();
  }

  if (!yiguvchi) {
    return (
      <div className="mb-card" style={{ maxWidth: 360 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Kodingizni kiriting</div>
        <input className="mb-input" style={{ marginBottom: 10 }} placeholder="Masalan: 101" value={code}
          onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && identify()} />
        {codeError && <div style={{ color: "#f0837f", fontSize: 13, marginBottom: 10 }}>{codeError}</div>}
        <button className="mb-btn mb-btn-primary" onClick={identify}>Kirish</button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="mb-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700 }}>Yig'uvchi: {yiguvchi.name}</div>
        <button className="mb-btn mb-btn-ghost" onClick={() => { setYiguvchi(null); setCode(""); }}>Chiqish</button>
      </div>

      <div className="mb-card">
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Yig'ish kerak bo'lgan buyurtmalar ({orders.length})</div>
        {ordersLoading ? (
          <div style={{ color: "#98A2B8" }}>Yuklanmoqda...</div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: "center", color: "#98A2B8", padding: "24px 0" }}>Hozircha yig'ilishi kerak bo'lgan buyurtma yo'q.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {orders.map((o) => (
              <div key={o.id} style={{ border: "1px solid #232C42", borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                  <div style={{ fontWeight: 700 }}>{o.customer?.name || "Noma'lum"} <span style={{ color: "#98A2B8", fontFamily: "monospace", fontWeight: 400, fontSize: 12 }}>({o.customer_id})</span></div>
                  <div style={{ color: "#98A2B8", fontSize: 12 }}>{o.order_no ? `#${o.order_no}` : ""}</div>
                </div>
                <div style={{ fontSize: 13, marginBottom: 10, color: "#C7CDDA" }}>
                  {o.buyurtma_items.map((it) => `${it.product_name} x${it.qty}`).join(", ")}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <button className="mb-btn mb-btn-primary" disabled={savingId === o.id} onClick={() => markPacked(o)}>
                    {savingId === o.id ? "..." : "Yig'ildi"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- POLKA (Mesta - mijoz bo'yicha joy band qilish) ---------------- */
function PolkaSection({ sellerName }) {
  const [tab, setTab] = useState("faol");
  const [faol, setFaol] = useState([]);
  const [faolLoading, setFaolLoading] = useState(true);

  const [custQuery, setCustQuery] = useState("");
  const [custResults, setCustResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [polka, setPolka] = useState("");
  const [yukSoni, setYukSoni] = useState("1");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [histRows, setHistRows] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("hammasi");
  const [dateField, setDateField] = useState("created");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [histSearch, setHistSearch] = useState("");

  async function refreshFaol() {
    const { data } = await supabase
      .from("mestalar")
      .select("*")
      .eq("status", "yuklanmagan")
      .order("polka", { ascending: true })
      .order("created_at", { ascending: true });
    setFaol(data || []);
    setFaolLoading(false);
  }

  useEffect(() => {
    refreshFaol();
    const interval = setInterval(refreshFaol, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const q = custQuery.trim().replace(/[,()%*"]/g, "");
    if (!q || selectedCustomer) { setCustResults([]); return; }
    const t = setTimeout(async () => {
      const filter = /^\d+$/.test(q) ? `id.ilike.${q}%,name.ilike.%${q}%` : `name.ilike.%${q}%`;
      const { data } = await supabase.from("customers").select("id, name, viloyat").or(filter).limit(8);
      setCustResults(data || []);
    }, 250);
    return () => clearTimeout(t);
  }, [custQuery, selectedCustomer]);

  async function createMesta() {
    setFormError("");
    if (!selectedCustomer) { setFormError("Mijozni ro'yxatdan tanlang"); return; }
    const p = parseInt(polka, 10);
    const y = parseInt(yukSoni, 10);
    if (!p || p < 1) { setFormError("Polka raqamini kiriting"); return; }
    if (!y || y < 1) { setFormError("Yuk sonini kiriting"); return; }
    setSaving(true);
    const { error } = await supabase.from("mestalar").insert({
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.name,
      polka: p,
      yuk_soni: y,
      created_by: sellerName,
    });
    setSaving(false);
    if (error) { setFormError("Xatolik: " + error.message); return; }
    setSelectedCustomer(null); setCustQuery(""); setPolka(""); setYukSoni("1");
    refreshFaol();
  }

  async function deleteMesta(m) {
    if (!confirm(`${m.customer_name} \u2014 ${m.polka}-polka yozuvini o'chirishga ishonchingiz komilmi?`)) return;
    const { error } = await supabase.from("mestalar").delete().eq("id", m.id);
    if (error) { alert("Xatolik: " + error.message); return; }
    refreshFaol();
  }

  async function loadHist() {
    setHistLoading(true);
    const field = dateField === "loaded" ? "loaded_at" : "created_at";
    let q = supabase.from("mestalar").select("*").order(field, { ascending: false, nullsFirst: false }).limit(500);
    if (statusFilter !== "hammasi") q = q.eq("status", statusFilter);
    if (dateFrom) q = q.gte(field, new Date(dateFrom + "T00:00:00").toISOString());
    if (dateTo) q = q.lte(field, new Date(dateTo + "T23:59:59.999").toISOString());
    const { data } = await q;
    setHistRows(data || []);
    setHistLoading(false);
  }

  useEffect(() => {
    if (tab === "tarix") loadHist();
  }, [tab, statusFilter, dateField, dateFrom, dateTo]);

  const histFiltered = useMemo(() => {
    const q = histSearch.trim().toLowerCase();
    if (!q) return histRows;
    return histRows.filter((m) =>
      (m.customer_name || "").toLowerCase().includes(q) ||
      String(m.customer_id || "").includes(q) ||
      String(m.polka).includes(q) ||
      (m.loaded_by || "").toLowerCase().includes(q)
    );
  }, [histRows, histSearch]);
  const histYuk = useMemo(() => histFiltered.reduce((s, m) => s + Number(m.yuk_soni || 0), 0), [histFiltered]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {[["faol", "Mesta belgilash"], ["tarix", "Tarix"]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className="mb-btn"
            style={{ background: tab === k ? ORANGE : "#232C42", color: "#fff", fontSize: 13 }}>{label}</button>
        ))}
      </div>

      {tab === "faol" && (
        <>
          <div className="mb-card">
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Yangi mesta</div>
            <div style={{ position: "relative", marginBottom: 10 }}>
              <input className="mb-input" placeholder="Mijoz ID yoki ismi" value={custQuery}
                onChange={(e) => { setCustQuery(e.target.value); if (selectedCustomer) setSelectedCustomer(null); }} />
              {custResults.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, background: "#141B2E", border: "1px solid #2A3652", borderRadius: 8, marginTop: 4, maxHeight: 280, overflowY: "auto" }}>
                  {custResults.map((c) => (
                    <div key={c.id}
                      onClick={() => { setSelectedCustomer(c); setCustQuery(c.name); setCustResults([]); }}
                      style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #1B2740", fontSize: 13.5 }}>
                      <b>{c.name}</b> <span style={{ color: "#98A2B8", fontFamily: "monospace", fontSize: 12 }}>({c.id})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedCustomer && (
              <div style={{ fontSize: 12.5, color: "#2c7a4b", marginBottom: 10 }}>Tanlandi: {selectedCustomer.name} (ID: {selectedCustomer.id})</div>
            )}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <input type="number" min="1" className="mb-input" style={{ maxWidth: 140 }} placeholder="Polka raqami" value={polka} onChange={(e) => setPolka(e.target.value)} />
              <input type="number" min="1" className="mb-input" style={{ maxWidth: 140 }} placeholder="Yuk soni" value={yukSoni} onChange={(e) => setYukSoni(e.target.value)} />
            </div>
            {formError && <div style={{ color: "#f0837f", fontSize: 13, marginBottom: 10 }}>{formError}</div>}
            <button className="mb-btn mb-btn-primary" disabled={saving} onClick={createMesta}>{saving ? "..." : "Mesta belgilash"}</button>
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Yuklanmagan mesta'lar ({faol.length})</div>
            {faolLoading ? (
              <div style={{ color: "#98A2B8", textAlign: "center", padding: 24 }}>Yuklanmoqda...</div>
            ) : faol.length === 0 ? (
              <div className="mb-card" style={{ textAlign: "center", color: "#98A2B8", padding: 30 }}>Hozircha yuklanmagan mesta yo'q.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
                {faol.map((m) => (
                  <div key={m.id} className="mb-card" style={{ padding: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: ORANGE, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                        {m.polka}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{m.customer_name}</div>
                        <div style={{ color: "#98A2B8", fontSize: 11.5, fontFamily: "monospace" }}>{m.customer_id || ""}</div>
                      </div>
                      <button className="mb-btn mb-btn-danger" style={{ padding: "5px 8px" }} onClick={() => deleteMesta(m)}><Trash2 size={13} /></button>
                    </div>
                    <div style={{ fontSize: 13 }}>{"\u{1F4E6}"} Yuk soni: <b>{m.yuk_soni}</b></div>
                    <div style={{ fontSize: 11.5, color: "#98A2B8", marginTop: 4 }}>{m.created_by} {"\u2022"} {formatDate(m.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "tarix" && (
        <>
          <div className="mb-card">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {[["hammasi", "Hammasi"], ["yuklanmagan", "Yuklanmagan"], ["yuklangan", "Yuklangan"], ["yetkazilgan", "Yetkazilgan"]].map(([k, label]) => (
                <button key={k} onClick={() => setStatusFilter(k)} className="mb-btn"
                  style={{ background: statusFilter === k ? ORANGE : "#232C42", color: "#fff", fontSize: 12.5, padding: "8px 12px" }}>{label}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 12.5, color: "#98A2B8" }}>Sana bo'yicha:</span>
              {[["created", "Belgilangan sana"], ["loaded", "Yuklangan sana"]].map(([k, label]) => (
                <button key={k} onClick={() => setDateField(k)} className="mb-btn"
                  style={{ background: dateField === k ? "#2C6FA6" : "#232C42", color: "#fff", fontSize: 12.5, padding: "7px 12px" }}>{label}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
              <input type="date" className="mb-input" style={{ maxWidth: 170 }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <span style={{ color: "#98A2B8" }}>{"\u2014"}</span>
              <input type="date" className="mb-input" style={{ maxWidth: 170 }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              {(dateFrom || dateTo) && (
                <button className="mb-btn mb-btn-ghost" style={{ padding: "8px 12px", fontSize: 12.5 }} onClick={() => { setDateFrom(""); setDateTo(""); }}>Tozalash</button>
              )}
            </div>
            <input className="mb-input" placeholder="Mijoz, ID, polka yoki haydovchi bo'yicha qidirish..." value={histSearch} onChange={(e) => setHistSearch(e.target.value)} />
          </div>

          <div className="mb-card">
            <div style={{ fontWeight: 700, marginBottom: 10 }}>{histFiltered.length} ta yozuv, {histYuk} ta yuk</div>
            {histLoading ? (
              <div style={{ color: "#98A2B8", textAlign: "center", padding: 20 }}>Yuklanmoqda...</div>
            ) : histFiltered.length === 0 ? (
              <div style={{ color: "#98A2B8", textAlign: "center", padding: 20 }}>Hech narsa topilmadi.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="mb-table">
                  <thead><tr><th>Belgilangan</th><th>Mijoz</th><th>Polka</th><th>Yuk</th><th>Holat</th><th>Yuklagan</th><th>Yetkazgan</th></tr></thead>
                  <tbody>
                    {histFiltered.map((m) => (
                      <tr key={m.id}>
                        <td style={{ fontSize: 12 }}>{formatDate(m.created_at)}</td>
                        <td>
                          {m.customer_name}
                          {m.customer_id ? <span style={{ color: "#98A2B8", fontFamily: "monospace", fontSize: 11.5 }}> ({m.customer_id})</span> : null}
                        </td>
                        <td style={{ fontWeight: 700 }}>{m.polka}</td>
                        <td>{m.yuk_soni}</td>
                        <td style={{ fontWeight: 700, fontSize: 12.5, color: m.status === "yetkazilgan" ? "#1E88E5" : m.status === "yuklangan" ? "#2c7a4b" : "#B8860B" }}>
                          {m.status === "yetkazilgan" ? "Yetkazilgan" : m.status === "yuklangan" ? "Yuklangan" : "Yuklanmagan"}
                        </td>
                        <td style={{ fontSize: 12 }}>{m.loaded_by ? `${m.loaded_by} \u2022 ${formatDate(m.loaded_at)}` : "-"}</td>
                        <td style={{ fontSize: 12 }}>{m.delivered_by ? `${m.delivered_by} \u2022 ${formatDate(m.delivered_at)}` : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- HAYDOVCHILAR (admin panel) ---------------- */
function HaydovchilarSection() {
  const [tab, setTab] = useState("holat");
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[["holat", "Holat"], ["xarita", "Xarita"], ["masofa", "Masofa"], ["tolovlar", "To'lovlar"]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className="mb-btn"
            style={{ background: tab === k ? ORANGE : "#232C42", color: "#fff", fontSize: 13 }}>{label}</button>
        ))}
      </div>
      {tab === "holat" && <HaydovchiHolat />}
      {tab === "xarita" && <HaydovchiXarita />}
      {tab === "masofa" && <HaydovchiMasofa />}
      {tab === "tolovlar" && <HaydovchiTolovlar />}
    </div>
  );
}

function HaydovchiHolat() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    const i = setInterval(load, 15000);
    return () => clearInterval(i);
  }, []);

  async function load() {
    const { data } = await supabase.from("drivers").select("*").order("name");
    setDrivers(data || []);
    setLoading(false);
  }

  if (loading) return <div style={{ color: "#98A2B8", textAlign: "center", padding: 24 }}>Yuklanmoqda...</div>;
  const onRouteCount = drivers.filter((d) => d.on_route).length;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ fontWeight: 700 }}>Haydovchilar ({drivers.length}), yo'lda: {onRouteCount}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {drivers.map((d) => {
          const mapHref = d.current_lat && d.current_lng
            ? `https://yandex.uz/maps/?pt=${d.current_lng},${d.current_lat}&z=15&l=map`
            : null;
          return (
            <div key={d.id} className="mb-card" style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontWeight: 700 }}>{d.name}{d.is_admin ? " (admin)" : ""}</div>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: d.on_route ? "#2c7a4b" : "#98A2B8" }}>{d.on_route ? "Yo'lda" : "Yo'lda emas"}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "#98A2B8" }}>
                {d.phone || "tel yo'q"}{d.hudud ? ` \u2022 ${d.hudud}${d.viloyat ? ` (${d.viloyat})` : ""}` : ""}
              </div>
              <div style={{ fontWeight: 700, fontSize: 13.5, margin: "8px 0" }}>Joriy masofa: {Number(d.route_km || 0).toFixed(1)} km</div>
              {mapHref ? (
                <a href={mapHref} target="_blank" rel="noreferrer" className="mb-btn mb-btn-ghost"
                  style={{ display: "inline-block", textDecoration: "none", fontSize: 12.5, padding: "7px 12px" }}>Xaritada ko'rish</a>
              ) : (
                <div style={{ fontSize: 12, color: "#98A2B8" }}>Joylashuv hali yo'q</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Xarita plitkalari manzili. OpenStreetMap'ning ochiq serveri yengil foydalanish uchun;
// foydalanuvchilar ko'payganda shu bitta qatorni boshqa provayder manziliga almashtiring.
const MAP_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

function escHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

// Har bir haydovchiga alohida rang (haydovchilar ro'yxatidagi tartib bo'yicha, bir-biriga qaytarilmaydi)
const DRIVER_COLORS = ["#E53935", "#1E88E5", "#43A047", "#FB8C00", "#8E24AA", "#00ACC1", "#D81B60", "#6D4C41", "#7CB342", "#3949AB", "#F4511E", "#00897B"];
function driverColor(allDrivers, id) {
  const idx = allDrivers.findIndex((d) => d.id === id);
  return DRIVER_COLORS[(idx < 0 ? 0 : idx) % DRIVER_COLORS.length];
}

function HaydovchiXarita() {
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const fittedRef = useRef(false);
  const linesRef = useRef({});
  const tracksRef = useRef({});   // {driverId: {start, pts: [[lat,lng]], lastId}}
  const [drivers, setDrivers] = useState([]);
  const [trackVer, setTrackVer] = useState(0);

  // Yo'lda bo'lgan haydovchilarning yo'l izini (yangi nuqtalarni) yuklaydi
  async function loadTracks(list) {
    let changed = false;
    const active = {};
    for (const d of list) {
      if (!d.on_route || !d.auth_user_id || !d.route_started_at) continue;
      active[d.id] = true;
      let t = tracksRef.current[d.id];
      if (!t || t.start !== d.route_started_at) { t = { start: d.route_started_at, pts: [], lastId: 0 }; tracksRef.current[d.id] = t; changed = true; }
      for (let guard = 0; guard < 10; guard++) {
        const { data } = await supabase.from("route_points").select("id, lat, lng")
          .eq("driver_auth_uid", d.auth_user_id).gte("started_at", d.route_started_at)
          .gt("id", t.lastId).order("id").limit(1000);
        if (!data || data.length === 0) break;
        data.forEach((r) => t.pts.push([r.lat, r.lng]));
        t.lastId = data[data.length - 1].id;
        changed = true;
        if (data.length < 1000) break;
      }
    }
    Object.keys(tracksRef.current).forEach((id) => { if (!active[id]) { delete tracksRef.current[id]; changed = true; } });
    if (changed) setTrackVer((v) => v + 1);
  }

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data } = await supabase.from("drivers").select("*").order("name");
      if (!alive) return;
      setDrivers(data || []);
      loadTracks(data || []);
    }
    load();
    const i = setInterval(load, 10000);
    return () => { alive = false; clearInterval(i); };
  }, []);

  useEffect(() => {
    const map = L.map(mapDivRef.current).setView([41.4, 64.6], 5);
    L.tileLayer(MAP_TILE_URL, { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; markersRef.current = {}; linesRef.current = {}; fittedRef.current = false; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = {};
    const bounds = [];

    drivers.forEach((d) => {
      if (!d.current_lat || !d.current_lng) return;
      seen[d.id] = true;
      const pos = [Number(d.current_lat), Number(d.current_lng)];
      bounds.push(pos);

      const lastPing = d.last_ping_at ? new Date(d.last_ping_at).getTime() : null;
      const stale = lastPing !== null && Date.now() - lastPing > 10 * 60 * 1000;
      const active = d.on_route && !stale;
      const color = driverColor(drivers, d.id);
      const dim = active ? "1" : "0.55";
      const label = escHtml(d.name) + (d.on_route ? " \u00B7 " + Number(d.route_km || 0).toFixed(1) + " km" : "");
      const icon = L.divIcon({
        className: "",
        iconSize: [0, 0],
        iconAnchor: [8, 8],
        html: '<div style="display:flex;align-items:center;gap:6px;white-space:nowrap">' +
          '<span style="width:16px;height:16px;border-radius:50%;background:' + color + ';border:3px solid #fff;box-shadow:0 0 4px rgba(0,0,0,.5);flex-shrink:0;opacity:' + dim + '"></span>' +
          '<span style="background:' + color + ';opacity:' + dim + ';color:#fff;font:600 12px system-ui,sans-serif;padding:2px 7px;border-radius:6px">' + label + "</span></div>",
      });
      const ago = lastPing !== null ? Math.max(0, Math.round((Date.now() - lastPing) / 60000)) + " daqiqa oldin" : "noma'lum";
      const popup =
        "<b>" + escHtml(d.name) + "</b><br/>" +
        escHtml(d.phone || "tel yo'q") + "<br/>" +
        (d.on_route ? "Yo'lda" : "Yo'lda emas") + " \u2022 " + Number(d.route_km || 0).toFixed(1) + " km<br/>" +
        "Oxirgi signal: " + ago + "<br/>" +
        '<a href="https://yandex.uz/maps/?pt=' + pos[1] + "," + pos[0] + '&z=16&l=map" target="_blank" rel="noreferrer">Yandex xaritada</a>';

      const existing = markersRef.current[d.id];
      if (existing) {
        existing.setLatLng(pos);
        existing.setIcon(icon);
        existing.setPopupContent(popup);
      } else {
        markersRef.current[d.id] = L.marker(pos, { icon }).addTo(map).bindPopup(popup);
      }
    });

    Object.keys(markersRef.current).forEach((id) => {
      if (!seen[id]) { markersRef.current[id].remove(); delete markersRef.current[id]; }
    });

    if (!fittedRef.current && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      fittedRef.current = true;
    }
  }, [drivers]);

  // Yo'l izi chiziqlari: har bir haydovchi o'z rangida, yo'l tugagach o'chadi
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = {};
    Object.keys(tracksRef.current).forEach((id) => {
      const t = tracksRef.current[id];
      if (!t || t.pts.length < 2) return;
      seen[id] = true;
      const color = driverColor(drivers, id);
      let line = linesRef.current[id];
      if (!line) {
        line = L.polyline(t.pts, { color, weight: 5, opacity: 0.9, lineCap: "round", lineJoin: "round" }).addTo(map);
        linesRef.current[id] = line;
      } else {
        line.setLatLngs(t.pts);
        line.setStyle({ color });
      }
    });
    Object.keys(linesRef.current).forEach((id) => {
      if (!seen[id]) { linesRef.current[id].remove(); delete linesRef.current[id]; }
    });
  }, [trackVer, drivers]);

  const withPos = drivers.filter((d) => d.current_lat && d.current_lng);
  const onRouteCount = withPos.filter((d) => d.on_route).length;

  return (
    <div className="mb-card" style={{ padding: 12 }}>
      <div style={{ fontSize: 13, color: "#98A2B8", marginBottom: 10 }}>
        Joylashuvi bor: {withPos.length} ta, yo'lda: {onRouteCount} ta. Xarita har 10 soniyada yangilanadi.
        Har bir haydovchi o'z rangida; yo'lda bo'lganlarning bosib o'tgan yo'li chiziq bo'lib ko'rinadi. Xira belgi: yo'lda emas yoki signal 10 daqiqadan beri yo'q.
      </div>
      <div ref={mapDivRef} style={{ height: "65vh", borderRadius: 10, overflow: "hidden" }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        {drivers.map((d) => (
          <span key={d.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, background: "#232C42", borderRadius: 8, padding: "4px 10px", opacity: d.on_route ? 1 : 0.55 }}>
            <span style={{ width: 22, height: 5, borderRadius: 3, background: driverColor(drivers, d.id) }} />
            {d.name}{d.on_route ? ` \u00B7 ${Number(d.route_km || 0).toFixed(1)} km` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function HaydovchiMasofa() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase.from("driver_routes").select("*").order("ended_at", { ascending: false }).limit(500);
      if (dateFrom) q = q.gte("ended_at", new Date(dateFrom + "T00:00:00").toISOString());
      if (dateTo) q = q.lte("ended_at", new Date(dateTo + "T23:59:59.999").toISOString());
      const { data } = await q;
      setRows(data || []);
      setLoading(false);
    })();
  }, [dateFrom, dateTo]);

  const totals = useMemo(() => {
    const t = {};
    rows.forEach((r) => { t[r.driver_name] = (t[r.driver_name] || 0) + Number(r.km || 0); });
    return Object.entries(t).sort((a, b) => b[1] - a[1]);
  }, [rows]);
  const totalKm = totals.reduce((s, entry) => s + entry[1], 0);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="mb-card">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input type="date" className="mb-input" style={{ maxWidth: 170 }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span style={{ color: "#98A2B8" }}>{"\u2014"}</span>
          <input type="date" className="mb-input" style={{ maxWidth: 170 }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          {(dateFrom || dateTo) && (
            <button className="mb-btn mb-btn-ghost" style={{ padding: "8px 12px", fontSize: 12.5 }} onClick={() => { setDateFrom(""); setDateTo(""); }}>Tozalash</button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ color: "#98A2B8", textAlign: "center", padding: 24 }}>Yuklanmoqda...</div>
      ) : (
        <>
          <div className="mb-card">
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Jami masofa: {totalKm.toFixed(1)} km</div>
            {totals.length === 0 ? (
              <div style={{ color: "#98A2B8", fontSize: 13.5 }}>Ma'lumot yo'q.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {totals.map(([name, km]) => (
                  <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, borderBottom: "1px solid #1B2740", paddingBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{name}</span>
                    <span style={{ fontWeight: 700 }}>{km.toFixed(1)} km</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-card">
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Yo'l tarixi ({rows.length})</div>
            {rows.length === 0 ? (
              <div style={{ color: "#98A2B8", fontSize: 13.5 }}>Hali yo'l tarixi yo'q.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="mb-table">
                  <thead><tr><th>Haydovchi</th><th>Boshlangan</th><th>Tugagan</th><th>Masofa</th></tr></thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.driver_name}</td>
                        <td style={{ fontSize: 12 }}>{r.started_at ? formatDate(r.started_at) : "-"}</td>
                        <td style={{ fontSize: 12 }}>{r.ended_at ? formatDate(r.ended_at) : "-"}</td>
                        <td style={{ fontWeight: 700 }}>{Number(r.km || 0).toFixed(1)} km</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function HaydovchiTolovlar() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [driverFilter, setDriverFilter] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase.from("payments").select("*, customers(name)").not("driver_name", "is", null).order("created_at", { ascending: false }).limit(500);
      if (dateFrom) q = q.gte("created_at", new Date(dateFrom + "T00:00:00").toISOString());
      if (dateTo) q = q.lte("created_at", new Date(dateTo + "T23:59:59.999").toISOString());
      const { data } = await q;
      setRows(data || []);
      setLoading(false);
    })();
  }, [dateFrom, dateTo]);

  const driverNames = useMemo(() => [...new Set(rows.map((r) => r.driver_name))].sort(), [rows]);
  const activeDriver = driverNames.includes(driverFilter) ? driverFilter : "";
  const filtered = useMemo(() => (activeDriver ? rows.filter((r) => r.driver_name === activeDriver) : rows), [rows, activeDriver]);
  const total = useMemo(() => filtered.reduce((s, r) => s + Number(r.amount || 0), 0), [filtered]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="mb-card">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          <button onClick={() => setDriverFilter("")} className="mb-btn"
            style={{ background: activeDriver === "" ? ORANGE : "#232C42", color: "#fff", fontSize: 12.5, padding: "8px 12px" }}>Hammasi</button>
          {driverNames.map((n) => (
            <button key={n} onClick={() => setDriverFilter(n)} className="mb-btn"
              style={{ background: activeDriver === n ? ORANGE : "#232C42", color: "#fff", fontSize: 12.5, padding: "8px 12px" }}>{n}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input type="date" className="mb-input" style={{ maxWidth: 170 }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span style={{ color: "#98A2B8" }}>{"\u2014"}</span>
          <input type="date" className="mb-input" style={{ maxWidth: 170 }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          {(dateFrom || dateTo) && (
            <button className="mb-btn mb-btn-ghost" style={{ padding: "8px 12px", fontSize: 12.5 }} onClick={() => { setDateFrom(""); setDateTo(""); }}>Tozalash</button>
          )}
        </div>
      </div>

      <div className="mb-card">
        <div style={{ fontWeight: 700, marginBottom: 10 }}>{filtered.length} ta to'lov, jami {fmt(total)}</div>
        {loading ? (
          <div style={{ color: "#98A2B8", textAlign: "center", padding: 20 }}>Yuklanmoqda...</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: "#98A2B8", textAlign: "center", padding: 20 }}>Hali haydovchi orqali to'lov qilinmagan.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="mb-table">
              <thead><tr><th>Sana</th><th>Haydovchi</th><th>Mijoz</th><th>Summa</th></tr></thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontSize: 12 }}>{formatDate(p.created_at)}</td>
                    <td style={{ fontWeight: 600 }}>{p.driver_name}</td>
                    <td>
                      {p.customers?.name || "Noma'lum mijoz"}
                      {p.customer_id ? <span style={{ color: "#98A2B8", fontFamily: "monospace", fontSize: 11.5 }}> ({p.customer_id})</span> : null}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {fmt(p.amount)}
                      {p.currency === "SOM" && p.original_amount ? (
                        <div style={{ fontSize: 11.5, color: "#98A2B8", fontWeight: 400 }}>{Number(p.original_amount).toLocaleString("en-US")} so'm</div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- BUXGALTER ---------------- */
function BuxgalterSection() {
  return (
    <div className="mb-card" style={{ textAlign: "center", padding: 40 }}>
      <FileText size={32} style={{ marginBottom: 12, color: "#98A2B8" }} />
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Buxgalter bo'limi</div>
      <div style={{ color: "#98A2B8", fontSize: 13.5 }}>Bu bo'lim tez orada to'ldiriladi.</div>
    </div>
  );
}

/* ---------------- AKT SVERKASI ---------------- */
function AktSverkaSection() {
  const [customerId, setCustomerId] = useState("");
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [events, setEvents] = useState(null);
  const [openingBalance, setOpeningBalance] = useState(0);

  async function searchCustomer() {
    const id = customerId.trim();
    setError(""); setEvents(null);
    if (!/^\d{4,8}$/.test(id)) { setError("Mijoz ID 4 yoki 8 xonali bolishi kerak"); return; }
    const { data } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
    if (data) setCustomer(data); else setError("Bunday mijoz topilmadi");
  }

  async function buildStatement() {
    if (!customer) return;
    setLoading(true);

    const [{ data: sales }, { data: payments }, { data: vazvrat }] = await Promise.all([
      supabase.from("sales").select("id, total, paid, created_at").eq("customer_id", customer.id),
      supabase.from("payments").select("id, amount, created_at").eq("customer_id", customer.id),
      supabase.from("vazvratlar").select("id, product_name, qty, amount, created_at").eq("customer_id", customer.id),
    ]);

    let all = [];
    (sales || []).forEach((s) => {
      all.push({ date: s.created_at, type: "Sotuv", desc: `Sotuv #${s.id.slice(0, 8)}`, debit: Number(s.total), credit: Number(s.paid) });
    });
    (payments || []).forEach((p) => {
      all.push({ date: p.created_at, type: "Tolov", desc: "Tolov qilindi", debit: 0, credit: Number(p.amount) });
    });
    (vazvrat || []).forEach((v) => {
      all.push({ date: v.created_at, type: "Vazvrat", desc: `${v.product_name} x${v.qty}`, debit: 0, credit: Number(v.amount) });
    });

    all.sort((a, b) => new Date(a.date) - new Date(b.date));

    const fromDate = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
    const toDate = dateTo ? new Date(dateTo + "T23:59:59") : null;

    let opening = 0;
    const periodEvents = [];
    all.forEach((e) => {
      const d = new Date(e.date);
      if (fromDate && d < fromDate) {
        opening += e.debit - e.credit;
      } else if (toDate && d > toDate) {
        // davrdan keyin - hisobga olinmaydi
      } else {
        periodEvents.push(e);
      }
    });

    let running = opening;
    const withBalance = periodEvents.map((e) => {
      running += e.debit - e.credit;
      return { ...e, balance: running };
    });

    setOpeningBalance(opening);
    setEvents(withBalance);
    setLoading(false);
  }

  const closingBalance = events && events.length > 0 ? events[events.length - 1].balance : openingBalance;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="mb-card no-print">
        <div style={{ fontWeight: 700, marginBottom: 12 }}>1. Mijozni toping</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input className="mb-input" placeholder="Mijoz ID" value={customerId}
            onChange={(e) => setCustomerId(e.target.value.replace(/\D/g, "").slice(0, 8))}
            onKeyDown={(e) => e.key === "Enter" && searchCustomer()} />
          <button className="mb-btn mb-btn-dark" onClick={searchCustomer}><Search size={15} /></button>
        </div>
        {error && <div style={{ color: "#f0837f", fontSize: 13.5 }}>{error}</div>}
        {customer && (
          <div style={{ marginTop: 10, padding: 10, background: "#1B2740", borderRadius: 8 }}>
            <div style={{ fontWeight: 700 }}>{customer.name}</div>
            <div style={{ fontSize: 12.5, color: "#98A2B8" }}>ID: {customer.id} \u2022 Joriy qarz: {fmt(customer.debt)}</div>
          </div>
        )}
      </div>

      {customer && (
        <div className="mb-card no-print">
          <div style={{ fontWeight: 700, marginBottom: 12 }}>2. Davr (ixtiyoriy)</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <input type="date" className="mb-input" style={{ maxWidth: 180 }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="Dan" />
            <input type="date" className="mb-input" style={{ maxWidth: 180 }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="Gacha" />
          </div>
          <button className="mb-btn mb-btn-primary" disabled={loading} onClick={buildStatement}>{loading ? "..." : "Aktni shakllantirish"}</button>
        </div>
      )}

      {events && customer && (
        <div className="mb-card" id="akt-sverka-print">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }} className="no-print">
            <button className="mb-btn mb-btn-primary" onClick={() => window.print()}><Printer size={14} style={{ verticalAlign: -2 }} /> Chop etish</button>
          </div>

          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>AKT SVERKASI</div>
            <div style={{ fontSize: 13, color: "#98A2B8", marginTop: 4 }}>
              {dateFrom || dateTo ? `${dateFrom || "..."} dan ${dateTo || "hozirgacha"}` : "Butun davr"}
            </div>
          </div>

          <div style={{ marginBottom: 16, fontSize: 13.5 }}>
            <div>Mijoz: <b>{customer.name}</b> (ID: {customer.id})</div>
            <div style={{ color: "#98A2B8" }}>{customer.viloyat}{customer.manzil ? `, ${customer.manzil}` : ""}</div>
          </div>

          <div style={{ marginBottom: 12, fontSize: 13.5, fontWeight: 700 }}>
            Davr boshiga qoldiq: {fmt(openingBalance)}
          </div>

          <table className="mb-table">
            <thead><tr><th>Sana</th><th>Turi</th><th>Tavsif</th><th>Debet</th><th>Kredit</th><th>Qoldiq</th></tr></thead>
            <tbody>
              {events.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "#98A2B8", padding: 16 }}>Bu davrda operatsiya yoq</td></tr>
              ) : events.map((e, i) => (
                <tr key={i}>
                  <td style={{ fontSize: 12 }}>{formatDate(e.date)}</td>
                  <td>{e.type}</td>
                  <td style={{ fontSize: 12.5 }}>{e.desc}</td>
                  <td style={{ color: e.debit > 0 ? "#f0837f" : undefined }}>{e.debit > 0 ? fmt(e.debit) : "-"}</td>
                  <td style={{ color: e.credit > 0 ? "#2c7a4b" : undefined }}>{e.credit > 0 ? fmt(e.credit) : "-"}</td>
                  <td style={{ fontWeight: 700 }}>{fmt(e.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 16, textAlign: "right", fontSize: 15, fontWeight: 800 }}>
            Davr oxiriga qoldiq: {fmt(closingBalance)}
          </div>
        </div>
      )}
    </div>
  );
}

function XodimlarSection() {
  const [sellers, setSellers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [yiguvchilar, setYiguvchilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [role, setRole] = useState("seller");
  const [lavozim, setLavozim] = useState("sotuvchi");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [raqam, setRaqam] = useState("");
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdInfo, setCreatedInfo] = useState(null);

  const [editTarget, setEditTarget] = useState(null); // { role, row }
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editError, setEditError] = useState("");
  const [editBusy, setEditBusy] = useState(false);

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
    setRole("seller"); setName(""); setUsername(""); setPassword(""); setRaqam(""); setLavozim("sotuvchi");
    setFormError(""); setCreatedInfo(null);
  }

  function openEdit(role, row) {
    setEditTarget({ role, row });
    setEditName(row.name);
    setEditPassword("");
    setEditError("");
  }

  async function saveEdit() {
    if (!editName.trim()) { setEditError("Ism bosh bolmasin"); return; }
    setEditBusy(true);
    setEditError("");
    const table = editTarget.role === "seller" ? "sellers" : editTarget.role === "driver" ? "drivers" : "yiguvchilar";
    const { error } = await supabase.from(table).update({ name: editName.trim() }).eq("id", editTarget.row.id);
    if (error) { setEditError("Xatolik: " + error.message); setEditBusy(false); return; }

    if (editTarget.role !== "yiguvchi" && editPassword.trim()) {
      if (editPassword.trim().length < 6) { setEditError("Parol kamida 6 belgi bolishi kerak"); setEditBusy(false); return; }
      try {
        const sessionRes = await supabase.auth.getSession();
        const token = sessionRes.data.session ? sessionRes.data.session.access_token : "";
        const res = await fetch("https://gbtqoqcvcgxueienqusn.supabase.co/functions/v1/manage-staff", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "reset_password", authUserId: editTarget.row.auth_user_id, newPassword: editPassword.trim() }),
        });
        const json = await res.json();
        if (!json.ok) { setEditError(json.error || "Parolni yangilashda xato"); setEditBusy(false); return; }
      } catch (e) {
        setEditError("Tarmoq xatoligi"); setEditBusy(false); return;
      }
    }

    setEditBusy(false);
    setEditTarget(null);
    refresh();
  }

  async function deleteStaff(role, row) {
    if (!confirm(`${row.name}ni ochirishga ishonchingiz komilmi?`)) return;
    try {
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data.session ? sessionRes.data.session.access_token : "";
      const res = await fetch("https://gbtqoqcvcgxueienqusn.supabase.co/functions/v1/manage-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "delete", role, tableId: row.id, authUserId: row.auth_user_id || null }),
      });
      const json = await res.json();
      if (!json.ok) { alert("Xatolik: " + (json.error || "")); return; }
      refresh();
    } catch (e) {
      alert("Tarmoq xatoligi");
    }
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
        body: JSON.stringify({ role, name: name.trim(), username: username.trim(), password, raqam: raqam.trim(), lavozim }),
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
              <div style={{ color: "#2c7a4b", fontWeight: 700, marginBottom: 8 }}>Xodim muvaffaqiyatli qo'shildi!</div>
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
                {[["seller", "Sotuvchi"], ["driver", "Haydovchi"], ["yiguvchi", "Yig'uvchi"]].map(([r, label]) => (
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
                  {role === "seller" && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 12.5, color: "#98A2B8", marginBottom: 6 }}>Lavozim</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {[["sotuvchi", "Sotuvchi"], ["ceo", "CEO"], ["rahbar", "Rahbar"], ["buxgalter", "Buxgalter"], ["mesta", "Mesta"]].map(([v, label]) => (
                          <button key={v} type="button" onClick={() => setLavozim(v)}
                            className="mb-btn" style={{ background: lavozim === v ? ORANGE : "#232C42", color: "#fff", fontSize: 12.5, padding: "7px 12px" }}>{label}</button>
                        ))}
                      </div>
                    </div>
                  )}
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
            {sellers.length === 0 ? <div style={{ color: "#98A2B8", fontSize: 13.5 }}>Hali sotuvchi yo'q.</div> : (
              <div style={{ display: "grid", gap: 8 }}>
                {sellers.map((s) => (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5, borderBottom: "1px solid #1B2740", paddingBottom: 6 }}>
                    <div>
                      <div>{s.name}{s.lavozim && s.lavozim !== "sotuvchi" ? <span style={{ color: ORANGE, fontWeight: 700, fontSize: 11.5 }}> {"\u2022"} {s.lavozim.toUpperCase()}</span> : null}</div>
                      <div style={{ color: "#98A2B8", fontSize: 12 }}>{s.phone || "tel yo'q"}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="mb-btn mb-btn-ghost" style={{ padding: "5px 9px" }} onClick={() => openEdit("seller", s)}><Pencil size={13} /></button>
                      <button className="mb-btn mb-btn-danger" style={{ padding: "5px 9px" }} onClick={() => deleteStaff("seller", s)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-card">
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Haydovchilar ({drivers.length})</div>
            {drivers.length === 0 ? <div style={{ color: "#98A2B8", fontSize: 13.5 }}>Hali haydovchi yo'q.</div> : (
              <div style={{ display: "grid", gap: 8 }}>
                {drivers.map((d) => (
                  <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5, borderBottom: "1px solid #1B2740", paddingBottom: 6 }}>
                    <div>
                      <div>{d.name}{d.is_admin ? " (admin)" : ""}</div>
                      <div style={{ color: "#98A2B8", fontSize: 12 }}>{d.phone || "tel yo'q"}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="mb-btn mb-btn-ghost" style={{ padding: "5px 9px" }} onClick={() => openEdit("driver", d)}><Pencil size={13} /></button>
                      <button className="mb-btn mb-btn-danger" style={{ padding: "5px 9px" }} onClick={() => deleteStaff("driver", d)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-card">
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Yig'uvchilar ({yiguvchilar.length})</div>
            {yiguvchilar.length === 0 ? <div style={{ color: "#98A2B8", fontSize: 13.5 }}>Hali yig'uvchi yo'q.</div> : (
              <div style={{ display: "grid", gap: 8 }}>
                {yiguvchilar.map((y) => (
                  <div key={y.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5, borderBottom: "1px solid #1B2740", paddingBottom: 6 }}>
                    <div>
                      <div>{y.name}</div>
                      <div style={{ color: "#98A2B8", fontSize: 12, fontFamily: "monospace" }}>Kod: {y.raqam}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="mb-btn mb-btn-ghost" style={{ padding: "5px 9px" }} onClick={() => openEdit("yiguvchi", y)}><Pencil size={13} /></button>
                      <button className="mb-btn mb-btn-danger" style={{ padding: "5px 9px" }} onClick={() => deleteStaff("yiguvchi", y)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {editTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setEditTarget(null)}>
          <div className="mb-card" style={{ maxWidth: 360, width: "90%" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontWeight: 700 }}>Tahrirlash</div>
              <button className="mb-btn mb-btn-ghost" style={{ padding: "5px 9px" }} onClick={() => setEditTarget(null)}><X size={14} /></button>
            </div>
            <input className="mb-input" style={{ marginBottom: 10 }} placeholder="Ismi" value={editName} onChange={(e) => setEditName(e.target.value)} />
            {editTarget.role !== "yiguvchi" && (
              <input className="mb-input" style={{ marginBottom: 10 }} type="password" placeholder="Yangi parol (ixtiyoriy, ozgartirmasa bosh qoldiring)" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
            )}
            {editError && <div style={{ color: "#f0837f", fontSize: 13, marginBottom: 10 }}>{editError}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="mb-btn mb-btn-primary" disabled={editBusy} onClick={saveEdit}>{editBusy ? "..." : "Saqlash"}</button>
              <button className="mb-btn mb-btn-ghost" onClick={() => setEditTarget(null)}>Bekor qilish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- MARKET TOVARLAR (Tanlangan mahsulotlar) ---------------- */
function FeaturedProductsSection() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState(null);

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

  const featuredList = useMemo(() => products.filter((p) => p.featured), [products]);
  const featuredByGroup = useMemo(() => {
    const map = {};
    FEATURED_GROUPS.forEach((g) => { map[g.key] = []; });
    featuredList.forEach((p) => {
      const key = p.featured_group || FEATURED_GROUPS[0].key;
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => (a.featured_order ?? 999) - (b.featured_order ?? 999));
    });
    return map;
  }, [featuredList]);

  const bannerList = useMemo(
    () => products.filter((p) => p.banner).sort((a, b) => (a.banner_order ?? 999) - (b.banner_order ?? 999)),
    [products]
  );

  async function toggleBanner(p) {
    if (!p.banner && bannerList.length >= 8) { alert("Bannerda ko'pi bilan 8 ta tovar bo'ladi. Avval bittasini olib tashlang."); return; }
    setSavingId(p.id);
    const payload = p.banner
      ? { banner: false, banner_order: null }
      : { banner: true, banner_order: bannerList.length > 0 ? Math.max(...bannerList.map((x) => x.banner_order ?? 0)) + 1 : 1 };
    const { error } = await supabase.from("products").update(payload).eq("id", p.id);
    if (error) { alert("Xatolik: " + error.message); setSavingId(null); return; }
    await refresh();
    setSavingId(null);
  }

  async function moveBanner(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= bannerList.length) return;
    const a = bannerList[index], b = bannerList[targetIndex];
    setSavingId(a.id);
    await Promise.all([
      supabase.from("products").update({ banner_order: targetIndex + 1 }).eq("id", a.id),
      supabase.from("products").update({ banner_order: index + 1 }).eq("id", b.id),
    ]);
    await refresh();
    setSavingId(null);
  }

  async function toggleFeatured(p) {
    setSavingId(p.id);
    const newFeatured = !p.featured;
    let payload;
    if (newFeatured) {
      const groupKey = p.featured_group || FEATURED_GROUPS[0].key;
      const existingInGroup = featuredByGroup[groupKey] || [];
      const nextOrder = existingInGroup.length > 0 ? Math.max(...existingInGroup.map((x) => x.featured_order ?? 0)) + 1 : 1;
      payload = { featured: true, featured_group: groupKey, featured_order: nextOrder };
    } else {
      payload = { featured: false, featured_group: null, featured_order: null };
    }
    const { error } = await supabase.from("products").update(payload).eq("id", p.id);
    if (error) { alert("Xatolik: " + error.message); setSavingId(null); return; }
    await refresh();
    setSavingId(null);
  }

  async function setGroup(p, groupKey) {
    setSavingId(p.id);
    const existingInGroup = featuredByGroup[groupKey] || [];
    const nextOrder = existingInGroup.length > 0 ? Math.max(...existingInGroup.map((x) => x.featured_order ?? 0)) + 1 : 1;
    const { error } = await supabase.from("products").update({ featured_group: groupKey, featured_order: nextOrder }).eq("id", p.id);
    if (error) { alert("Xatolik: " + error.message); setSavingId(null); return; }
    await refresh();
    setSavingId(null);
  }

  async function moveInGroup(groupKey, index, direction) {
    const list = featuredByGroup[groupKey] || [];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const a = list[index], b = list[targetIndex];
    setSavingId(a.id);
    await Promise.all([
      supabase.from("products").update({ featured_order: b.featured_order ?? targetIndex + 1 }).eq("id", a.id),
      supabase.from("products").update({ featured_order: a.featured_order ?? index + 1 }).eq("id", b.id),
    ]);
    await refresh();
    setSavingId(null);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="ob-card">
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Tanlangan mahsulotlar ({featuredList.length})</div>
        <div style={{ fontSize: 13, color: "#98A2B8", marginBottom: 14 }}>
          Bu yerda belgilangan mahsulotlar mijoz mobil ilovasida Market bo'limi tepasida, guruhlar bo'yicha ko'rsatiladi.
        </div>
        <input className="ob-input" placeholder="Mahsulot qidirish..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="ob-card">
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Katta banner ({bannerList.length}/8)</div>
        <div style={{ fontSize: 13, color: "#98A2B8", marginBottom: 12 }}>
          Mijoz ilovasi ochilganda tepada aylanib turadigan katta rasmli tovarlar. Faqat shu yerda belgilanganlar chiqadi. Rasmi bor tovar tanlang (toza, fonsiz rasm yaxshi ko'rinadi).
        </div>
        {bannerList.length === 0 ? (
          <div style={{ fontSize: 13, color: "#98A2B8" }}>Hali banner tovari yo'q. Pastdagi ro'yxatdan "Bannerga qo'yish" ni bosing.</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {bannerList.map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#1B2740", borderRadius: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 13, background: ORANGE, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ width: 36, height: 36, borderRadius: 6, background: "#232C42", overflow: "hidden", flexShrink: 0 }}>
                  {p.image_url ? <img src={p.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                </div>
                <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>
                  {p.name}
                  {!p.image_url ? <span style={{ color: "#f0837f", fontSize: 11.5, fontWeight: 700 }}> {"\u2014"} rasmi yo'q, banner'da chiqmaydi</span> : null}
                </div>
                <button disabled={i === 0 || savingId === p.id} onClick={() => moveBanner(i, -1)} className="ob-btn ob-btn-ghost" style={{ padding: "4px 10px", fontSize: 14 }}>{"\u2191"}</button>
                <button disabled={i === bannerList.length - 1 || savingId === p.id} onClick={() => moveBanner(i, 1)} className="ob-btn ob-btn-ghost" style={{ padding: "4px 10px", fontSize: 14 }}>{"\u2193"}</button>
                <button disabled={savingId === p.id} onClick={() => toggleBanner(p)} className="ob-btn ob-btn-danger" style={{ padding: "4px 10px", fontSize: 13 }}>{"\u2715"}</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {featuredList.length > 0 && FEATURED_GROUPS.map((g) => {
        const list = featuredByGroup[g.key] || [];
        if (list.length === 0) return null;
        return (
          <div key={g.key} className="ob-card">
            <div style={{ fontWeight: 700, marginBottom: 10 }}>{g.label} \u2014 tartib</div>
            <div style={{ display: "grid", gap: 6 }}>
              {list.map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#1B2740", borderRadius: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 13, background: ORANGE, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{p.name}</div>
                  <button disabled={i === 0 || savingId === p.id} onClick={() => moveInGroup(g.key, i, -1)}
                    className="ob-btn ob-btn-ghost" style={{ padding: "4px 10px", fontSize: 14 }}>{"\u2191"}</button>
                  <button disabled={i === list.length - 1 || savingId === p.id} onClick={() => moveInGroup(g.key, i, 1)}
                    className="ob-btn ob-btn-ghost" style={{ padding: "4px 10px", fontSize: 14 }}>{"\u2193"}</button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div style={{ display: "grid", gap: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ color: "#98A2B8", textAlign: "center", padding: 20 }}>Mahsulot topilmadi.</div>
        ) : filtered.map((p) => (
          <div key={p.id} className="ob-card" style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ width: 50, height: 50, borderRadius: 8, background: "#1B2740", flexShrink: 0, overflow: "hidden" }}>
                {p.image_url ? <img src={p.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "#98A2B8" }}>{fmt(p.price)}</div>
              </div>
              <button
                onClick={() => toggleBanner(p)}
                disabled={savingId === p.id}
                className="ob-btn"
                style={{ background: p.banner ? ORANGE : "#232C42", color: "#fff", fontSize: 12.5, padding: "8px 14px" }}
              >
                {p.banner ? "Bannerda \u2713" : "Bannerga qo'yish"}
              </button>
              <button
                onClick={() => toggleFeatured(p)}
                disabled={savingId === p.id}
                className="ob-btn"
                style={{ background: p.featured ? ORANGE : "#232C42", color: "#fff", fontSize: 12.5, padding: "8px 14px" }}
              >
                {p.featured ? "Tanlangan \u2713" : "Tanlash"}
              </button>
            </div>

            {p.featured && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12, paddingTop: 12, borderTop: "1px solid #232C42" }}>
                {FEATURED_GROUPS.map((g) => (
                  <button
                    key={g.key}
                    onClick={() => setGroup(p, g.key)}
                    disabled={savingId === p.id}
                    className="ob-btn"
                    style={{
                      background: p.featured_group === g.key ? ORANGE : "#1B2740",
                      color: "#fff",
                      fontSize: 12,
                      padding: "7px 12px",
                    }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- 1C / EXCEL'DAN IMPORT ---------------- */
function ImportSection() {
  const [rawRows, setRawRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({ name: "", price: "", cost_price: "", qty: "" });
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  function handleFile(file) {
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      if (json.length === 0) return;
      const hdrs = json[0].map((h) => String(h).trim());
      const rows = json.slice(1).filter((r) => r.some((c) => String(c).trim() !== ""));
      setHeaders(hdrs);
      setRawRows(rows);

      const guess = (keywords) => {
        const idx = hdrs.findIndex((h) => keywords.some((k) => h.toLowerCase().includes(k)));
        return idx >= 0 ? String(idx) : "";
      };
      setMapping({
        name: guess(["наимен", "nomi", "name", "товар"]),
        price: guess(["цена", "narx", "price", "розниц"]),
        cost_price: guess(["себестоим", "kirim", "закуп", "cost"]),
        qty: guess(["кол", "miqdor", "qty", "остат"]),
      });
    };
    reader.readAsArrayBuffer(file);
  }

  function parseNum(val) {
    if (val === "" || val === null || val === undefined) return 0;
    const cleaned = String(val).trim().replace(/\s/g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }

  async function runImport() {
    if (!mapping.name || !mapping.price) {
      alert("Kamida 'Nomi' va 'Narxi' ustunlarini belgilang");
      return;
    }
    setImporting(true);
    let success = 0, failed = 0;
    for (const row of rawRows) {
      const name = String(row[Number(mapping.name)] || "").trim();
      if (!name) { failed++; continue; }
      const price = parseNum(row[Number(mapping.price)]);
      const cost_price = mapping.cost_price ? parseNum(row[Number(mapping.cost_price)]) : 0;
      const qty = mapping.qty ? parseNum(row[Number(mapping.qty)]) : 0;

      const { error } = await supabase.from("products").insert({ name, price, cost_price, qty, birlik: "dona" });
      if (error) failed++; else success++;
    }
    setImporting(false);
    setResult({ success, failed });
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="ob-card">
        <div style={{ fontWeight: 700, marginBottom: 6 }}>1C / Excel'dan mahsulot import qilish</div>
        <div style={{ fontSize: 13, color: "#98A2B8", marginBottom: 14 }}>
          1C'da mahsulotlar ro'yxatini oching, "Barcha amallar" {"\u2192"} "Ro'yxatni chiqarish" orqali Excel'ga saqlang, keyin shu faylni shu yerga yuklang.
        </div>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files[0])} />
        <button className="ob-btn ob-btn-primary" onClick={() => fileInputRef.current?.click()}>
          Excel fayl tanlash
        </button>
        {fileName && <div style={{ fontSize: 12.5, color: "#98A2B8", marginTop: 8 }}>Tanlangan: {fileName}</div>}
      </div>

      {headers.length > 0 && (
        <div className="ob-card">
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Ustunlarni moslashtiring ({rawRows.length} qator topildi)</div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              ["name", "Nomi (majburiy)"],
              ["price", "Sotuv narxi (majburiy)"],
              ["cost_price", "Kirim narxi (ixtiyoriy)"],
              ["qty", "Miqdori (ixtiyoriy)"],
            ].map(([key, label]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 170, fontSize: 13.5, fontWeight: 600 }}>{label}</div>
                <select
                  className="ob-input"
                  value={mapping[key]}
                  onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))}
                >
                  <option value="">{"\u2014 tanlanmagan \u2014"}</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>{h || `Ustun ${i + 1}`}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, fontSize: 12.5, color: "#98A2B8" }}>
            Namuna (birinchi 3 qator):
            <div style={{ marginTop: 6, fontFamily: "monospace", fontSize: 11.5, background: "#1B2740", padding: 10, borderRadius: 8 }}>
              {rawRows.slice(0, 3).map((r, i) => (
                <div key={i}>{r.join(" | ")}</div>
              ))}
            </div>
          </div>

          <button className="ob-btn ob-btn-primary" style={{ marginTop: 16 }} disabled={importing} onClick={runImport}>
            {importing ? "Import qilinmoqda..." : `${rawRows.length} ta mahsulotni import qilish`}
          </button>

          {result && (
            <div style={{ marginTop: 12, fontSize: 13.5 }}>
              <span style={{ color: "#2c7a4b", fontWeight: 700 }}>{result.success} ta muvaffaqiyatli</span>
              {result.failed > 0 && <span style={{ color: "#f0837f", fontWeight: 700, marginLeft: 12 }}>{result.failed} ta xato</span>}
            </div>
          )}
        </div>
      )}
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