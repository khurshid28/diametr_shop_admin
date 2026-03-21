import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useState } from "react";
import axiosClient from "../../service/axios.service";
import { toast } from "../../components/ui/toast";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Moment from "moment";

function getSubStatus(expired?: string | null) {
  if (!expired) return { label: "Belgilanmagan", color: "gray", daysLeft: null as number | null };
  const days = Math.ceil((new Date(expired).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0)  return { label: "Obuna tugagan", color: "red",    daysLeft: days };
  if (days <= 7) return { label: `${days} kun qoldi`, color: "yellow", daysLeft: days };
  return { label: "Faol", color: "green", daysLeft: days };
}

export default function ProfilePage() {
  const userRaw = localStorage.getItem("user");
  const [user, setUser] = useState<any>(userRaw ? JSON.parse(userRaw) : null);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const [chatId, setChatId] = useState<string>(user?.chat_id ?? "");
  const [savingTg, setSavingTg] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<number>(1);

  const sub = getSubStatus(user?.shop?.expired);

  // pre-compute classNames to avoid complex template literals inside JSX
  const subCardBorder =
    sub.color === "red"    ? "rounded-2xl border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-white/[0.03] p-6" :
    sub.color === "yellow" ? "rounded-2xl border border-yellow-200 bg-yellow-50 dark:border-yellow-800/40 dark:bg-white/[0.03] p-6" :
    sub.color === "green"  ? "rounded-2xl border border-green-200 bg-green-50 dark:border-green-800/40 dark:bg-white/[0.03] p-6" :
                             "rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-6";
  const subBadge =
    sub.color === "red"    ? "px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
    sub.color === "yellow" ? "px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
    sub.color === "green"  ? "px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                             "px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-500";
  const subValueColor =
    sub.color === "red" ? "mt-1 text-xl font-bold text-red-600" :
    sub.color === "yellow" ? "mt-1 text-xl font-bold text-yellow-600" :
    "mt-1 text-xl font-bold text-green-600";

  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword) {
      toast.error("Eski va yangi parolni kiriting");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Yangi parollar mos kelmaydi");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Parol kamida 6 ta belgi bo'lishi kerak");
      return;
    }
    setSaving(true);
    try {
      await axiosClient.patch(`/admin/${user?.id}`, {
        old_password: oldPassword,
        password: newPassword,
      });
      toast.success("Parol muvaffaqiyatli o'zgartirildi");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveChatId = async () => {
    if (!chatId.trim()) {
      toast.error("Chat ID kiriting");
      return;
    }
    setSavingTg(true);
    try {
      const res = await axiosClient.patch("/admin/me", { chat_id: chatId.trim() });
      const updated = { ...user, chat_id: res.data?.chat_id ?? chatId.trim() };
      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      toast.success("Telegram ulandi");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Xatolik yuz berdi");
    } finally {
      setSavingTg(false);
    }
  };

  return (
    <>
      <PageMeta title="Profil" description="Foydalanuvchi profili" />
      <PageBreadcrumb pageTitle="Profil" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Profile info */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-5">Profil ma&apos;lumotlari</h3>
          <div className="space-y-4">
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ism</span>
              <p className="mt-1 text-base text-gray-800 dark:text-white">{user?.fullname ?? "—"}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Telefon</span>
              <p className="mt-1 text-base text-gray-800 dark:text-white">{user?.phone ?? "—"}</p>
            </div>
            {user?.shop && (
              <div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Do&apos;kon</span>
                <p className="mt-1 text-base text-gray-800 dark:text-white">{user.shop.name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Subscription */}
        <div className={subCardBorder}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Obunam</h3>
            <span className={subBadge}>{sub.label}</span>
          </div>
          <div className="space-y-3">
            {user?.shop?.expired ? (
              <>
                <div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tugash sanasi</span>
                  <p className={subValueColor}>{Moment(user.shop.expired).format("DD.MM.YYYY")}</p>
                </div>
                {sub.daysLeft !== null && sub.daysLeft >= 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Qolgan muddat</span>
                    <p className="mt-1 text-base text-gray-700 dark:text-gray-300">{sub.daysLeft} kun</p>
                  </div>
                )}
                {sub.color === "red" && (
                  <div className="mt-3 p-3 rounded-xl bg-red-100 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-400">
                    Obunangiz tugagan. Davom ettirish uchun administrator bilan bog&apos;laning.
                  </div>
                )}
                {sub.color === "yellow" && (
                  <div className="mt-3 p-3 rounded-xl bg-yellow-100 dark:bg-yellow-900/20 text-sm text-yellow-700 dark:text-yellow-400">
                    Obunangiz tugashiga {sub.daysLeft} kun qoldi. Uzilmaslik uchun yangilang.
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Obuna ma&apos;lumotlari mavjud emas</p>
            )}
          </div>
        </div>

        {/* Telegram */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
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
              <li>
                Telegramda{" "}
                <a
                  href="https://t.me/diametr_admin_bot"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold underline hover:no-underline"
                >
                  @diametr_admin_bot
                </a>{" "}
                botini oching
              </li>
              <li><b>/start</b> tugmasini bosing</li>
              <li>Bot sizga Chat ID raqamini yuboradi</li>
              <li>Chat ID raqamini quyidagi maydonga kiriting va saqlang</li>
            </ol>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Chat ID</Label>
              <Input
                type="text"
                placeholder="Masalan: 123456789"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
              />
            </div>
            <Button onClick={handleSaveChatId} disabled={savingTg} className="w-full">
              {savingTg ? "Saqlanmoqda..." : user?.chat_id ? "Yangilash" : "Telegram ulash"}
            </Button>
          </div>
        </div>

        {/* Change password */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-5">Parolni o&apos;zgartirish</h3>
          <div className="space-y-4">
            <div>
              <Label>Eski parol</Label>
              <Input
                type="password"
                placeholder="Eski parol"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>
            <div>
              <Label>Yangi parol</Label>
              <Input
                type="password"
                placeholder="Yangi parol (min 6 belgi)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <Label>Yangi parolni tasdiqlang</Label>
              <Input
                type="password"
                placeholder="Yangi parolni qayta kiriting"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button onClick={handlePasswordChange} disabled={saving} className="w-full">
              {saving ? "Saqlanmoqda..." : "Parolni o'zgartirish"}
            </Button>
          </div>
        </div>

        {/* Subscription Payment */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Obunani to&apos;ldirish</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Xizmatdan foydalanishni davom ettiring</p>
            </div>
          </div>

          {/* Plans */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              { months: 1, price: 50_000,  label: "1 oy" },
              { months: 3, price: 135_000, label: "3 oy", badge: "Tejamkorona" },
              { months: 6, price: 250_000, label: "6 oy", badge: "Eng arzon" },
            ].map((plan) => (
              <div
                key={plan.months}
                className={`rounded-xl border p-4 text-center cursor-pointer transition-all ${
                  selectedPlan === plan.months
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20 ring-2 ring-brand-500/30"
                    : "border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700"
                }`}
                onClick={() => setSelectedPlan(plan.months)}
              >
                {plan.badge && (
                  <span className="inline-block mb-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                    {plan.badge}
                  </span>
                )}
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {plan.price.toLocaleString("uz")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">so&apos;m / {plan.label}</p>
              </div>
            ))}
          </div>

          {/* Payment methods */}
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            To&apos;lov usulini tanlang:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Click */}
            <a
              href={`https://my.click.uz/services/pay?service_id=35698&merchant_id=19286&amount=${
                selectedPlan === 1 ? 50000 : selectedPlan === 3 ? 135000 : 250000
              }&transaction_param=${user?.shop?.id ?? user?.id ?? ""}&return_url=https://shop.diametr.uz/profile`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl border-2 border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
            >
              <svg viewBox="0 0 48 48" className="w-7 h-7" fill="none">
                <rect width="48" height="48" rx="12" fill="#0066FF"/>
                <text x="24" y="31" textAnchor="middle" fontSize="16" fontWeight="bold" fill="white" fontFamily="sans-serif">Click</text>
              </svg>
              <span className="font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">Click</span>
            </a>

            {/* Payme */}
            <a
              href={`https://checkout.paycom.uz/${btoa(`m=6773a6a38a4e9fce15fa5895;ac.shop_id=${user?.shop?.id ?? ""};a=${
                selectedPlan === 1 ? 5000000 : selectedPlan === 3 ? 13500000 : 25000000
              }`)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl border-2 border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors group"
            >
              <svg viewBox="0 0 48 48" className="w-7 h-7" fill="none">
                <rect width="48" height="48" rx="12" fill="#00CCEE"/>
                <text x="24" y="31" textAnchor="middle" fontSize="13" fontWeight="bold" fill="white" fontFamily="sans-serif">Payme</text>
              </svg>
              <span className="font-semibold text-sky-600 dark:text-sky-400 group-hover:underline">Payme</span>
            </a>

            {/* Uzum */}
            <a
              href="https://t.me/diametr_admin_bot"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl border-2 border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors group"
            >
              <svg viewBox="0 0 48 48" className="w-7 h-7" fill="none">
                <rect width="48" height="48" rx="12" fill="#7C3AED"/>
                <text x="24" y="31" textAnchor="middle" fontSize="13" fontWeight="bold" fill="white" fontFamily="sans-serif">Uzum</text>
              </svg>
              <span className="font-semibold text-purple-600 dark:text-purple-400 group-hover:underline">Uzum</span>
            </a>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400">
            To&apos;lov amalga oshirilgandan so&apos;ng operator tomonidan obuna avtomatik yangilanadi.
            Muammo bo&apos;lsa <a href="https://t.me/diametr_admin_bot" target="_blank" rel="noreferrer" className="text-brand-500 hover:underline">@diametr_admin_bot</a> ga murojaat qiling.
          </div>
        </div>

      </div>
    </>
  );
}
