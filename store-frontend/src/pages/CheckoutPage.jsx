import { useState, useEffect } from "react";
import { useParams, useOutletContext, useNavigate, Link } from "react-router-dom";
import {
  submitOrder, customerUpdateMe, validatePromo,
  getPointsOffers, getAddresses, addAddress, deleteAddress,
} from "../api/index";
import { useCartStore, selectTotal } from "../store/cartStore";
import { useAuthStore } from "../store/authStore";
import {
  ArrowLeft, User, Phone, MapPin, FileText, Loader2, Navigation,
  Link2, CheckCircle2, Tag, Gift, Clock, Star, Trash2, Plus, Calendar,
} from "lucide-react";
import AuthModal from "../components/AuthModal";
import toast from "react-hot-toast";

function parseMapsUrl(url) {
  if (!url) return null;
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  const llMatch = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (llMatch) return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };
  return null;
}

const TIP_PRESETS = [0, 1, 2, 5];

export default function CheckoutPage() {
  const { slug }    = useParams();
  const { store }   = useOutletContext();
  const navigate    = useNavigate();
  const items       = useCartStore(s => s.items);
  const clearCart   = useCartStore(s => s.clearCart);
  const subtotal    = useCartStore(selectTotal);
  const deliveryFee = store?.deliveryFee || 0;
  const sym         = store?.currencySymbol || "$";

  const { customer, token, updateCustomer } = useAuthStore();
  const [showAuth, setShowAuth] = useState(false);

  // Address form state
  const [form, setForm] = useState({
    name:                customer?.name                || "",
    phone:               customer?.phone               || "",
    address:             customer?.address             || "",
    locationDescription: customer?.locationDescription || "",
    notes:               "",
    lat:                 customer?.lat  || null,
    lng:                 customer?.lng  || null,
  });
  const [mapsLink, setMapsLink]   = useState("");
  const [errors,   setErrors]     = useState({});
  const [loading,  setLoading]    = useState(false);
  const [locating, setLocating]   = useState(false);
  const [saveProfile, setSaveProfile] = useState(false);

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [showSaveAddrForm, setShowSaveAddrForm] = useState(false);
  const [newAddrLabel, setNewAddrLabel] = useState("");

  // Promo code
  const [promoInput,    setPromoInput]    = useState("");
  const [promoApplied,  setPromoApplied]  = useState(null); // { code, discount }
  const [promoLoading,  setPromoLoading]  = useState(false);
  const [promoError,    setPromoError]    = useState("");

  // Points offers
  const [pointsOffers,   setPointsOffers]   = useState([]);
  const [selectedOffer,  setSelectedOffer]  = useState(null); // offer object
  const [loadingOffers,  setLoadingOffers]  = useState(false);

  // Tip
  const [tipAmount,  setTipAmount]  = useState(0);
  const [customTip,  setCustomTip]  = useState("");
  const [tipMode,    setTipMode]    = useState("preset"); // preset | custom

  // Scheduled delivery
  const [scheduleMode, setScheduleMode] = useState("asap"); // asap | scheduled
  const [scheduledFor, setScheduledFor] = useState("");

  // Calculated totals
  const discount = promoApplied?.discount || selectedOffer?.discountAmount || 0;
  const tip      = tipMode === "custom" ? (parseFloat(customTip) || 0) : tipAmount;
  const total    = subtotal + deliveryFee - discount + tip;

  // Pre-fill form when customer logs in mid-checkout
  useEffect(() => {
    if (customer) {
      setForm(f => ({
        ...f,
        name:                f.name  || customer.name  || "",
        phone:               f.phone || customer.phone || "",
        address:             f.address || customer.address || "",
        locationDescription: f.locationDescription || customer.locationDescription || "",
        lat:                 f.lat || customer.lat || null,
        lng:                 f.lng || customer.lng || null,
      }));
    }
  }, [customer]);

  // Load saved addresses
  useEffect(() => {
    if (!customer || !token) return;
    setLoadingAddresses(true);
    getAddresses(slug, token)
      .then(d => setSavedAddresses(d.addresses || []))
      .catch(() => {})
      .finally(() => setLoadingAddresses(false));
  }, [customer, token, slug]);

  // Load points offers if points are enabled
  useEffect(() => {
    if (!store?.pointsEnabled || !customer) return;
    setLoadingOffers(true);
    getPointsOffers(slug)
      .then(setPointsOffers)
      .catch(() => {})
      .finally(() => setLoadingOffers(false));
  }, [store?.pointsEnabled, customer, slug]);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };

  // GPS auto-detect
  const handleLocate = () => {
    if (!navigator.geolocation) { toast.error("Geolocation is not supported"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { "Accept-Language": "en" } });
          const data = await res.json();
          const address = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setForm(f => ({ ...f, address, lat, lng }));
          setErrors(e => ({ ...e, address: "" }));
          toast.success("Location detected");
        } catch {
          setForm(f => ({ ...f, lat, lng }));
          toast("Location saved but couldn't fetch address", { icon: "⚠️" });
        } finally { setLocating(false); }
      },
      (err) => {
        setLocating(false);
        const msgs = { 1: "Location permission denied.", 2: "Location unavailable.", 3: "Location request timed out." };
        toast.error(msgs[err.code] || "Failed to get location");
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleMapsLinkChange = (val) => {
    setMapsLink(val);
    const coords = parseMapsUrl(val);
    if (coords) {
      setForm(f => ({ ...f, lat: coords.lat, lng: coords.lng }));
      toast.success("Coordinates extracted from link");
    } else {
      setForm(f => ({ ...f, lat: null, lng: null }));
    }
  };

  // Use a saved address
  const useSavedAddress = (addr) => {
    setForm(f => ({
      ...f,
      address:             addr.address,
      locationDescription: addr.locationDescription || "",
      lat:                 addr.lat || null,
      lng:                 addr.lng || null,
    }));
    setErrors(e => ({ ...e, address: "" }));
    setMapsLink("");
    toast.success(`Using "${addr.label || "saved"}" address`);
  };

  // Save current address
  const handleSaveAddress = async () => {
    if (!form.address.trim()) { toast.error("Enter an address first"); return; }
    setSavingAddress(true);
    try {
      const result = await addAddress(slug, token, {
        label:               newAddrLabel || "Home",
        address:             form.address,
        locationDescription: form.locationDescription,
        lat:                 form.lat,
        lng:                 form.lng,
      });
      setSavedAddresses(result.addresses);
      setShowSaveAddrForm(false);
      setNewAddrLabel("");
      toast.success("Address saved!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save address");
    } finally { setSavingAddress(false); }
  };

  const handleDeleteAddress = async (addrId) => {
    try {
      const result = await deleteAddress(slug, token, addrId);
      setSavedAddresses(result.addresses);
      toast.success("Address removed");
    } catch { toast.error("Failed to remove address"); }
  };

  // Apply promo code
  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    if (selectedOffer) { toast.error("Remove your points offer first"); return; }
    setPromoLoading(true);
    setPromoError("");
    try {
      const result = await validatePromo(slug, { code: promoInput.trim(), subtotal });
      setPromoApplied({ code: result.promo.code, discount: result.discount, type: result.promo.type, value: result.promo.value });
      toast.success(`Promo applied — ${sym}${result.discount.toFixed(2)} off!`);
    } catch (err) {
      setPromoError(err.response?.data?.message || "Invalid promo code");
      setPromoApplied(null);
    } finally { setPromoLoading(false); }
  };

  const removePromo = () => { setPromoApplied(null); setPromoInput(""); setPromoError(""); };

  // Select/deselect a points offer
  const selectOffer = (offer) => {
    if (promoApplied) { toast.error("Remove your promo code first"); return; }
    if (selectedOffer?._id === offer._id) {
      setSelectedOffer(null);
      return;
    }
    if (customer.loyaltyPoints < offer.pointsCost) {
      toast.error(`Not enough points (need ${offer.pointsCost}, you have ${customer.loyaltyPoints})`);
      return;
    }
    // Calculate discount preview
    let discountAmount = 0;
    if (offer.offerType === "free_delivery") discountAmount = deliveryFee;
    else if (offer.offerType === "discount_percent") discountAmount = +((subtotal * offer.offerValue) / 100).toFixed(2);
    else discountAmount = Math.min(offer.offerValue, subtotal);
    setSelectedOffer({ ...offer, discountAmount });
    toast.success(`"${offer.name}" applied!`);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name    = "Name is required";
    if (!form.phone.trim())   e.phone   = "Phone is required";
    if (!form.address.trim()) e.address = "Delivery address is required";
    if (scheduleMode === "scheduled" && !scheduledFor) e.scheduledFor = "Please pick a delivery time";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const locationDescription = form.locationDescription || (mapsLink && !form.lat ? mapsLink : "");
      const finalTip = tipMode === "custom" ? (parseFloat(customTip) || 0) : tipAmount;

      const result = await submitOrder({
        slug,
        customer: {
          name: form.name, phone: form.phone, address: form.address,
          locationDescription, lat: form.lat, lng: form.lng, notes: form.notes,
        },
        items:           items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        promoCode:       promoApplied?.code || "",
        redeemedOfferId: selectedOffer?._id || null,
        tipAmount:       finalTip,
        scheduledFor:    scheduleMode === "scheduled" ? scheduledFor : null,
      }, token || null);

      // Save profile if opted in
      if (customer && token && saveProfile) {
        try {
          const updated = await customerUpdateMe(slug, token, {
            name: form.name, phone: form.phone, address: form.address,
            locationDescription, lat: form.lat, lng: form.lng,
          });
          updateCustomer(updated.customer);
        } catch {}
      }

      clearCart();
      navigate(`/store/${slug}/order/${result.orderId}`, {
        replace: true,
        state: { pointsEarned: result.pointsEarned },
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to place order");
    } finally { setLoading(false); }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Your cart is empty.</p>
        <Link to={`/store/${slug}`} className="text-blue-600 hover:underline text-sm mt-2 block">← Shop now</Link>
      </div>
    );
  }

  const hasCoords      = form.lat && form.lng;
  const pointsToEarn   = (store?.pointsEnabled && customer) ? Math.floor(subtotal * (store.pointsPerUnit || 1)) : 0;
  const minScheduleTime = new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-24">
      <Link to={`/store/${slug}/cart`} className="flex items-center gap-1 text-sm text-blue-600 mb-5 hover:underline">
        <ArrowLeft size={16} /> Back to cart
      </Link>

      <h1 className="text-xl font-bold text-gray-800 mb-5">Delivery Details</h1>

      {/* Auth banner */}
      {customer ? (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-4">
          <CheckCircle2 size={16} className="text-green-600 shrink-0" />
          <p className="text-sm text-green-700">Logged in as <strong>{customer.name}</strong>
            {store?.pointsEnabled && <span className="ml-2 text-green-600">· <Star size={12} className="inline mb-0.5" /> {customer.loyaltyPoints} pts</span>}
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 mb-4">
          <p className="text-sm text-blue-700">Login to use saved addresses and earn points</p>
          <button type="button" onClick={() => setShowAuth(true)}
            className="shrink-0 ml-3 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition">
            Login / Register
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── Saved Addresses ───────────────────────────────────── */}
        {customer && savedAddresses.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
              <MapPin size={14} /> Saved Addresses
            </p>
            <div className="space-y-2">
              {savedAddresses.map(addr => (
                <div key={addr._id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-600">{addr.label || "Saved"}</p>
                    <p className="text-xs text-gray-500 truncate">{addr.address}</p>
                  </div>
                  <button type="button" onClick={() => useSavedAddress(addr)}
                    className="shrink-0 text-xs px-2.5 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
                    Use
                  </button>
                  <button type="button" onClick={() => handleDeleteAddress(addr._id)}
                    className="shrink-0 text-red-400 hover:text-red-600 transition p-1">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Name ─────────────────────────────────────────────── */}
        <div>
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
            <User size={14} /> Full Name
          </label>
          <input value={form.name} onChange={e => set("name", e.target.value)}
            placeholder="Your full name"
            className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? "border-red-400" : "border-gray-200"}`} />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        {/* ── Phone ────────────────────────────────────────────── */}
        <div>
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
            <Phone size={14} /> Phone Number
          </label>
          <input value={form.phone} onChange={e => set("phone", e.target.value)}
            placeholder="+1 234 567 890" type="tel"
            className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.phone ? "border-red-400" : "border-gray-200"}`} />
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
        </div>

        {/* ── Delivery Address + GPS ────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <MapPin size={14} /> Delivery Address
            </label>
            <button type="button" onClick={handleLocate} disabled={locating}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-colors">
              {locating ? <><Loader2 size={12} className="animate-spin" /> Detecting...</> : <><Navigation size={12} /> Use my location</>}
            </button>
          </div>
          <textarea value={form.address} onChange={e => set("address", e.target.value)}
            placeholder="Street, building, floor..."
            rows={3}
            className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${errors.address ? "border-red-400" : "border-gray-200"}`} />
          {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}

          {/* Save address button for logged-in customers */}
          {customer && token && form.address.trim() && (
            <div className="mt-2">
              {showSaveAddrForm ? (
                <div className="flex items-center gap-2">
                  <input value={newAddrLabel} onChange={e => setNewAddrLabel(e.target.value)}
                    placeholder="Label (e.g. Home, Work)"
                    className="flex-1 px-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  <button type="button" onClick={handleSaveAddress} disabled={savingAddress}
                    className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition disabled:opacity-60 font-medium">
                    {savingAddress ? "Saving..." : "Save"}
                  </button>
                  <button type="button" onClick={() => setShowSaveAddrForm(false)}
                    className="text-xs px-3 py-1.5 text-gray-500 hover:text-gray-700 transition">
                    Cancel
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setShowSaveAddrForm(true)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition">
                  <Plus size={12} /> Save this address
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Google Maps link ──────────────────────────────────── */}
        <div>
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
            <Link2 size={14} /> Google Maps Link <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input value={mapsLink} onChange={e => handleMapsLinkChange(e.target.value)}
            placeholder="Paste your Google Maps link here..."
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {hasCoords && <p className="text-xs text-green-600 mt-1">📍 GPS saved: {form.lat.toFixed(5)}, {form.lng.toFixed(5)}</p>}
          {mapsLink && !hasCoords && <p className="text-xs text-amber-600 mt-1">⚠️ Couldn't read coordinates — driver will still receive the link.</p>}
        </div>

        {/* ── Location description ──────────────────────────────── */}
        <div>
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
            <MapPin size={14} /> Location Description <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input value={form.locationDescription} onChange={e => set("locationDescription", e.target.value)}
            placeholder="e.g. Building 4, 2nd floor, Apt 201, near pharmacy..."
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* ── Notes ────────────────────────────────────────────── */}
        <div>
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
            <FileText size={14} /> Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
            placeholder="Any special instructions..."
            rows={2}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>

        {/* ── Scheduled Delivery ───────────────────────────────── */}
        <div>
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2">
            <Calendar size={14} /> Delivery Time
          </label>
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => setScheduleMode("asap")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition border ${scheduleMode === "asap" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"}`}>
              ASAP
            </button>
            <button type="button" onClick={() => setScheduleMode("scheduled")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition border ${scheduleMode === "scheduled" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"}`}>
              Schedule for later
            </button>
          </div>
          {scheduleMode === "asap" && store?.deliveryTimeMin && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Clock size={11} /> Estimated delivery: {store.deliveryTimeMin}–{store.deliveryTimeMax} min
            </p>
          )}
          {scheduleMode === "scheduled" && (
            <>
              <input
                type="datetime-local"
                value={scheduledFor}
                min={minScheduleTime}
                onChange={e => { setScheduledFor(e.target.value); setErrors(er => ({ ...er, scheduledFor: "" })); }}
                className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.scheduledFor ? "border-red-400" : "border-gray-200"}`}
              />
              {errors.scheduledFor && <p className="text-red-500 text-xs mt-1">{errors.scheduledFor}</p>}
            </>
          )}
        </div>

        {/* ── Tip ──────────────────────────────────────────────── */}
        <div>
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2">
            <Gift size={14} /> Add a Tip <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="flex gap-2 flex-wrap">
            {TIP_PRESETS.map(t => (
              <button key={t} type="button"
                onClick={() => { setTipAmount(t); setTipMode("preset"); setCustomTip(""); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${tipMode === "preset" && tipAmount === t ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"}`}>
                {t === 0 ? "No tip" : `${sym}${t}`}
              </button>
            ))}
            <button type="button"
              onClick={() => setTipMode("custom")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${tipMode === "custom" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"}`}>
              Custom
            </button>
          </div>
          {tipMode === "custom" && (
            <input type="number" min="0" step="0.5" value={customTip}
              onChange={e => setCustomTip(e.target.value)}
              placeholder={`Enter tip amount in ${sym}`}
              className="mt-2 w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          )}
        </div>

        {/* ── Points Offers (logged in + points enabled + has offers) ── */}
        {customer && store?.pointsEnabled && pointsOffers.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2">
              <Star size={14} className="text-yellow-500" /> Redeem Points
              <span className="text-xs text-gray-400 font-normal ml-1">— {customer.loyaltyPoints} pts available</span>
            </p>
            <div className="space-y-2">
              {loadingOffers ? (
                <div className="text-xs text-gray-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Loading offers...</div>
              ) : (
                pointsOffers.map(offer => {
                  const canAfford = customer.loyaltyPoints >= offer.pointsCost;
                  const isSelected = selectedOffer?._id === offer._id;
                  return (
                    <button key={offer._id} type="button"
                      onClick={() => selectOffer(offer)}
                      disabled={!canAfford && !isSelected}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition flex items-start gap-3
                        ${isSelected ? "border-blue-500 bg-blue-50" : canAfford ? "border-gray-200 hover:border-blue-300 bg-white" : "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"}`}>
                      <Star size={16} className={`mt-0.5 shrink-0 ${isSelected ? "text-blue-600" : "text-yellow-500"}`} />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{offer.name}</p>
                        {offer.description && <p className="text-xs text-gray-500 mt-0.5">{offer.description}</p>}
                        <p className="text-xs text-blue-600 mt-0.5 font-medium">{offer.pointsCost} pts</p>
                      </div>
                      {isSelected && <CheckCircle2 size={16} className="text-blue-600 shrink-0 mt-0.5" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── Order Summary ─────────────────────────────────────── */}
        <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
          <p className="font-semibold text-gray-700 text-sm mb-2">Order Summary ({items.length} item{items.length > 1 ? "s" : ""})</p>
          {items.map(i => (
            <div key={i.productId} className="flex justify-between text-sm text-gray-600">
              <span className="truncate mr-2">{i.name} × {i.quantity}</span>
              <span className="shrink-0">{sym}{(i.price * i.quantity).toFixed(2)}</span>
            </div>
          ))}

          {deliveryFee > 0 && (
            <div className="flex justify-between text-sm text-gray-600 border-t pt-2 mt-2">
              <span>Delivery fee</span>
              <span className={selectedOffer?.offerType === "free_delivery" ? "line-through text-gray-400" : ""}>
                {sym}{deliveryFee.toFixed(2)}
              </span>
            </div>
          )}

          {/* Promo code input */}
          <div className="border-t pt-3 mt-2">
            <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1"><Tag size={12} /> Promo Code</p>
            {promoApplied ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                <p className="text-sm text-green-700 font-medium">{promoApplied.code} — {sym}{promoApplied.discount.toFixed(2)} off</p>
                <button type="button" onClick={removePromo} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input value={promoInput} onChange={e => { setPromoInput(e.target.value); setPromoError(""); }}
                  placeholder="Enter code"
                  className={`flex-1 px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 ${promoError ? "border-red-400" : "border-gray-200"}`} />
                <button type="button" onClick={handleApplyPromo} disabled={promoLoading || !promoInput.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-1">
                  {promoLoading ? <Loader2 size={13} className="animate-spin" /> : "Apply"}
                </button>
              </div>
            )}
            {promoError && <p className="text-red-500 text-xs mt-1">{promoError}</p>}
          </div>

          {/* Discount line */}
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600 font-medium">
              <span>Discount {selectedOffer ? `(${selectedOffer.name})` : promoApplied ? `(${promoApplied.code})` : ""}</span>
              <span>−{sym}{discount.toFixed(2)}</span>
            </div>
          )}

          {/* Tip line */}
          {tip > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tip</span>
              <span>+{sym}{tip.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-gray-800 border-t pt-2 mt-2">
            <span>Total</span>
            <span>{sym}{Math.max(0, total).toFixed(2)}</span>
          </div>

          {/* Delivery time or scheduled time */}
          {scheduleMode === "asap" && store?.deliveryTimeMin ? (
            <p className="text-xs text-gray-400 text-center pt-1 flex items-center justify-center gap-1">
              <Clock size={11} /> Est. {store.deliveryTimeMin}–{store.deliveryTimeMax} min · 💵 Cash on delivery
            </p>
          ) : scheduleMode === "scheduled" && scheduledFor ? (
            <p className="text-xs text-blue-500 text-center pt-1 flex items-center justify-center gap-1">
              <Calendar size={11} /> Scheduled for {new Date(scheduledFor).toLocaleString()} · 💵 Cash on delivery
            </p>
          ) : (
            <p className="text-xs text-gray-400 text-center pt-1">💵 Cash on delivery</p>
          )}

          {/* Points to earn */}
          {pointsToEarn > 0 && (
            <p className="text-xs text-yellow-600 text-center font-medium flex items-center justify-center gap-1">
              <Star size={11} /> You'll earn {pointsToEarn} points when delivered!
            </p>
          )}
        </div>

        {/* Save profile option */}
        {customer && (
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={saveProfile} onChange={e => setSaveProfile(e.target.checked)} className="w-4 h-4 rounded accent-blue-600" />
            <span className="text-sm text-gray-600">Save updated info to my profile</span>
          </label>
        )}

        <button type="submit" disabled={loading}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-base">
          {loading ? <><Loader2 size={18} className="animate-spin" /> Placing order...</> : "Place Order 🚀"}
        </button>
      </form>

      {showAuth && <AuthModal slug={slug} onClose={() => setShowAuth(false)} />}
    </div>
  );
}
