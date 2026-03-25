import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useCallback, useEffect, useState } from "react";
import axiosClient from "../../service/axios.service";
import { toast } from "../../components/ui/toast";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Moment from "moment";
import { formatMoney } from "../../service/formatters/money.format";

// ─── helpers ──────────────────────────────────────────────────────────────────
function getSubStatus(expired?: string | null) {
  if (!expired) return { label: "Belgilanmagan", color: "gray", daysLeft: null as number | null };
  const days = Math.ceil((new Date(expired).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0)  return { label: "Obuna tugagan", color: "red",    daysLeft: days };
  if (days <= 7) return { label: `${days} kun qoldi`, color: "yellow", daysLeft: days };
  return { label: "Faol", color: "green", daysLeft: days };
}

const LOG_LABELS: Record<string, string> = {
  TOP_UP_CLICK: "Click orqali",
  TOP_UP_PAYME: "Payme orqali",
  TOP_UP_UZUM: "Uzum orqali",
  TOP_UP_MANUAL: "Qo'lda to'ldirish",
  SUBSCRIPTION_DEDUCT: "Obuna yechildi",
  FREE_TRIAL: "Bepul sinov",
};

// ─── Plan options ──────────────────────────────────────────────────────────────
const PLANS = [
  { id: 1, months: 1, price: 50_000, label: "1 oy" },
  { id: 2, months: 3, price: 135_000, label: "3 oy", badge: "Tejamkor" },
  { id: 3, months: 1, price: 300_000, label: "1 oy" },
];

export default function ProfilePage() {
  const userRaw = localStorage.getItem("user");
  const [user, setUser] = useState<any>(userRaw ? JSON.parse(userRaw) : null);
  const shopId = user?.shop?.id ?? user?.shop_id;

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const [chatId, setChatId] = useState<string>(user?.chat_id ?? "");
  const [savingTg, setSavingTg] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState(1);
  const [balanceData, setBalanceData] = useState<any>(null);
  const [balanceLogs, setBalanceLogs] = useState<any[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(false);

  const balance = balanceData?.balance ?? 0;
  const sub = getSubStatus(balanceData?.expired ?? user?.shop?.expired);

  const subCardBorder =
    sub.color === "red"    ? "rounded-2xl border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-white/3 p-6" :
    sub.color === "yellow" ? "rounded-2xl border border-yellow-200 bg-yellow-50 dark:border-yellow-800/40 dark:bg-white/3 p-6" :
    sub.color === "green"  ? "rounded-2xl border border-green-200 bg-green-50 dark:border-green-800/40 dark:bg-white/3 p-6" :
                             "rounded-2xl border border-gray-200 bg-white dark:border-white/5 dark:bg-white/3 p-6";
  const subBadge =
    sub.color === "red"    ? "px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
    sub.color === "yellow" ? "px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
    sub.color === "green"  ? "px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                             "px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-500";

  const fetchBalance = useCallback(async () => {
    if (!shopId) return;
    setLoadingBalance(true);
    try {
      const [balRes, logsRes] = await Promise.allSettled([
        axiosClient.get("/subscription/balance"),
        axiosClient.get("/subscription/my-logs?take=10"),
      ]);
      if (balRes.status === "fulfilled") {
        setBalanceData(balRes.value.data);
      }
      if (logsRes.status === "fulfilled") {
        const d = logsRes.value.data;
        setBalanceLogs(Array.isArray(d) ? d : d?.data ?? []);
      }
    } finally {
      setLoadingBalance(false);
    }
  }, [shopId]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword) { toast.error("Eski va yangi parolni kiriting"); return; }
    if (newPassword !== confirmPassword) { toast.error("Yangi parollar mos kelmaydi"); return; }
    if (newPassword.length < 6) { toast.error("Parol kamida 6 ta belgi bolishi kerak"); return; }
    setSaving(true);
    try {
      await axiosClient.patch(`/admin/${user?.id}`, { old_password: oldPassword, password: newPassword });
      toast.success("Parol muvaffaqiyatli ozgartirildi");
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Xatolik yuz berdi");
    } finally { setSaving(false); }
  };

  const handleSaveChatId = async () => {
    if (!chatId.trim()) { toast.error("Chat ID kiriting"); return; }
    setSavingTg(true);
    try {
      const res = await axiosClient.patch("/admin/me", { chat_id: chatId.trim() });
      const updated = { ...user, chat_id: res.data?.chat_id ?? chatId.trim() };
      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      toast.success("Telegram ulandi");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Xatolik yuz berdi");
    } finally { setSavingTg(false); }
  };

  const planPrice = PLANS.find((p) => p.id === selectedPlan)?.price ?? 50_000;
  const clickServiceId = (import.meta as any).env?.VITE_CLICK_SERVICE_ID ?? "35698";
  const clickMerchantId = (import.meta as any).env?.VITE_CLICK_MERCHANT_ID ?? "19286";
  const paymeMerchantId = (import.meta as any).env?.VITE_PAYME_MERCHANT_ID ?? "6773a6a38a4e9fce15fa5895";
  const clickUrl = `https://my.click.uz/services/pay?service_id=${clickServiceId}&merchant_id=${clickMerchantId}&amount=${planPrice}&transaction_param=${shopId}_${selectedPlan}&return_url=https://shop.diametr.uz/profile`;
  const paymeAmount = planPrice * 100;
  const paymeParams = btoa(`m=${paymeMerchantId};ac.shop_id=${shopId};a=${paymeAmount}`);
  const paymeUrl = `https://checkout.paycom.uz/${paymeParams}`;

  return (
    <>
      <PageMeta title="Profil" description="Foydalanuvchi profili" />
      <PageBreadcrumb pageTitle="Profil" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Profile info */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/5 dark:bg-white/3">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-5">Profil</h3>
          <div className="space-y-4">
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ism</span>
              <p className="mt-1 text-base text-gray-800 dark:text-white">{user?.fullname ?? "—"}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Telefon</span>
              <p className="mt-1 text-base text-gray-800 dark:text-white">{user?.phone ?? "—"}</p>
            </div>
            {user?.shop && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dokon</span>
                <p className="mt-1 text-base text-gray-800 dark:text-white">{user.shop.name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Balance card */}
        <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white dark:from-brand-900/20 dark:to-gray-900 dark:border-brand-800/40 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Hisob Balansi</h3>
            <button
              onClick={fetchBalance}
              className="text-xs text-brand-500 hover:underline"
            >
              Yangilash
            </button>
          </div>
          {loadingBalance ? (
            <div className="animate-pulse h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          ) : (
            <p className="text-3xl font-bold text-brand-600 dark:text-brand-400">
              {formatMoney(balance)} so&#x27;m
            </p>
          )}
          <div className="mt-4 pt-4 border-t border-brand-100 dark:border-brand-800/30">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Oxirgi harakatlar</p>
            {balanceLogs.length === 0 ? (
              <p className="text-sm text-gray-400">Hali harakatlar yoq</p>
            ) : (
              <div className="space-y-2">
                {balanceLogs.slice(0, 4).map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 truncate">
                      {LOG_LABELS[log.type] ?? log.type}
                    </span>
                    <span className={log.amount >= 0 ? "text-green-600 dark:text-green-400 font-medium ml-2 shrink-0" : "text-red-500 font-medium ml-2 shrink-0"}>
                      {log.amount >= 0 ? "+" : ""}{formatMoney(log.amount)} so&#x27;m
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Subscription status */}
        <div className={subCardBorder}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Obunam</h3>
            <span className={subBadge}>{sub.label}</span>
          </div>
          <div className="space-y-3">
            {(balanceData?.expired || user?.shop?.expired) ? (
              <>
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tugash sanasi</span>
                  <p className={
                    sub.color === "red" ? "mt-1 text-xl font-bold text-red-600" :
                    sub.color === "yellow" ? "mt-1 text-xl font-bold text-yellow-600" :
                    "mt-1 text-xl font-bold text-green-600"
                  }>
                    {Moment(balanceData?.expired || user?.shop?.expired).format("DD.MM.YYYY")}
                  </p>
                </div>
                {sub.daysLeft !== null && sub.daysLeft >= 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Qolgan muddat</span>
                    <p className="mt-1 text-base text-gray-700 dark:text-gray-300">{sub.daysLeft} kun</p>
                  </div>
                )}
                {sub.color === "red" && (
                  <div className="mt-3 p-3 rounded-xl bg-red-100 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-400">
                    Obunangiz tugagan. Hisobni toldiring.
                  </div>
                )}
                {sub.color === "yellow" && (
                  <div className="mt-3 p-3 rounded-xl bg-yellow-100 dark:bg-yellow-900/20 text-sm text-yellow-700 dark:text-yellow-400">
                    Obunangiz tugashiga {sub.daysLeft} kun qoldi.
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Obuna ma&apos;lumotlari mavjud emas</p>
            )}
          </div>
        </div>

        {/* Telegram */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/5 dark:bg-white/3">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-sky-500">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Telegram</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Bildirishnomalar uchun ulang</p>
            </div>
            {user?.chat_id && (
              <span className="ml-auto px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Ulangan
              </span>
            )}
          </div>
          <div className="mb-5 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40">
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">Qanday ulash?</p>
            <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1.5 list-decimal list-inside">
              <li>Telegramda <a href="https://t.me/diametr_admin_bot" target="_blank" rel="noreferrer" className="font-semibold underline">@diametr_admin_bot</a> botini oching</li>
              <li>/start tugmasini bosing</li>
              <li>Bot Chat ID raqamini yuboradi</li>
              <li>Raqamni quyida kiriting va saqlang</li>
            </ol>
          </div>
          <div className="space-y-3">
            <div>
              <Label>Chat ID</Label>
              <Input type="text" placeholder="Masalan: 123456789" value={chatId} onChange={(e: any) => setChatId(e.target.value)} />
            </div>
            <Button onClick={handleSaveChatId} disabled={savingTg} className="w-full">
              {savingTg ? "Saqlanmoqda..." : user?.chat_id ? "Yangilash" : "Telegram ulash"}
            </Button>
          </div>
        </div>

        {/* Change password */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/5 dark:bg-white/3">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-5">Parolni ozgartirish</h3>
          <div className="space-y-4">
            <div>
              <Label>Eski parol</Label>
              <Input type="password" placeholder="Eski parol" value={oldPassword} onChange={(e: any) => setOldPassword(e.target.value)} />
            </div>
            <div>
              <Label>Yangi parol</Label>
              <Input type="password" placeholder="Yangi parol (min 6 belgi)" value={newPassword} onChange={(e: any) => setNewPassword(e.target.value)} />
            </div>
            <div>
              <Label>Yangi parolni tasdiqlang</Label>
              <Input type="password" placeholder="Yangi parolni qayta kiriting" value={confirmPassword} onChange={(e: any) => setConfirmPassword(e.target.value)} />
            </div>
            <Button onClick={handlePasswordChange} disabled={saving} className="w-full">
              {saving ? "Saqlanmoqda..." : "Parolni ozgartirish"}
            </Button>
          </div>
        </div>

        {/* Balance top-up — full width */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/5 dark:bg-white/3">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Balansni toldirish</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Oylik obuna avtomatik yechiladi</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-gray-400">Joriy balans</p>
              <p className="text-lg font-bold text-brand-600 dark:text-brand-400">{formatMoney(balance)} so&#x27;m</p>
            </div>
          </div>

          {/* Plan picker */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                className={[
                  "relative rounded-xl border-2 p-4 text-center transition-all",
                  selectedPlan === plan.id
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20 ring-2 ring-brand-500/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700",
                ].join(" ")}
              >
                {plan.badge && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-500 text-white">
                    {plan.badge}
                  </span>
                )}
                <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                  {plan.price.toLocaleString("uz")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">so&apos;m / {plan.label}</p>
              </button>
            ))}
          </div>

          {/* Payment buttons with real logos */}
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Tolov usulini tanlang:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Click */}
            <a
              href={clickUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-3 px-5 py-4 rounded-xl border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
            >
              <img src="/payments/click.png" alt="Click" className="h-8 w-auto object-contain" />
              <span className="font-semibold text-gray-800 dark:text-white group-hover:text-blue-600">Click</span>
            </a>

            {/* Payme */}
            <a
              href={paymeUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-3 px-5 py-4 rounded-xl border-2 border-sky-200 dark:border-sky-800 hover:border-sky-400 dark:hover:border-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all group"
            >
              <img src="/payments/payme.png" alt="Payme" className="h-8 w-auto object-contain" />
              <span className="font-semibold text-gray-800 dark:text-white group-hover:text-sky-600">Payme</span>
            </a>

            {/* Uzum */}
            <a
              href="https://t.me/diametr_admin_bot"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-3 px-5 py-4 rounded-xl border-2 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all group"
            >
              <img src="/payments/uzum.png" alt="Uzum" className="h-8 w-auto object-contain" />
              <span className="font-semibold text-gray-800 dark:text-white group-hover:text-purple-600">Uzum</span>
            </a>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-white/2 border border-gray-100 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400">
            Tolov amalga oshirilgandan song balans avtomatik yangilanadi (5-10 daqiqa ichida).
            Muammo bolsa <a href="https://t.me/diametr_admin_bot" target="_blank" rel="noreferrer" className="text-brand-500 hover:underline">@diametr_admin_bot</a> ga murojaat qiling.
          </div>
        </div>

      </div>
    </>
  );
}
