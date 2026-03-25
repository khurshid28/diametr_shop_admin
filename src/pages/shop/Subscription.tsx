import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useCallback, useEffect, useState } from "react";
import axiosClient from "../../service/axios.service";
import Moment from "moment";

function formatMoney(n: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);
}

function statusInfo(expired?: string | null) {
  if (!expired) return { cls: "bg-gray-100 text-gray-500 border-gray-200", dot: "bg-gray-400", label: "Belgilanmagan", days: null, color: "gray" };
  const days = Math.ceil((new Date(expired).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { cls: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", label: "Muddati tugagan", days, color: "red" };
  if (days <= 3) return { cls: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", label: `${days} kun qoldi`, days, color: "red" };
  if (days <= 7) return { cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", label: `${days} kun qoldi`, days, color: "amber" };
  if (days <= 30) return { cls: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500", label: `${days} kun qoldi`, days, color: "blue" };
  return { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "Faol", days, color: "green" };
}

const LOG_LABELS: Record<string, { label: string; cls: string }> = {
  TOP_UP_CLICK: { label: "Click", cls: "bg-blue-50 text-blue-600" },
  TOP_UP_PAYME: { label: "Payme", cls: "bg-cyan-50 text-cyan-600" },
  TOP_UP_UZUM: { label: "Uzum", cls: "bg-purple-50 text-purple-600" },
  TOP_UP_MANUAL: { label: "Qolda", cls: "bg-teal-50 text-teal-600" },
  SUBSCRIPTION_DEDUCT: { label: "Obuna", cls: "bg-red-50 text-red-600" },
  FREE_TRIAL: { label: "Tekin", cls: "bg-violet-50 text-violet-600" },
};

export default function SubscriptionPage() {
  const [balance, setBalance] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [balRes, logsRes] = await Promise.allSettled([
        axiosClient.get("/subscription/balance"),
        axiosClient.get("/subscription/my-logs?take=30"),
      ]);
      if (balRes.status === "fulfilled") setBalance(balRes.value.data);
      if (logsRes.status === "fulfilled") {
        const d = logsRes.value.data;
        setLogs(Array.isArray(d) ? d : d?.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const st = statusInfo(balance?.expired);
  const isExpired = st.color === "red" && (st.days ?? 0) < 0;

  return (
    <>
      <PageMeta title="Obuna" description="Obuna holati" />
      <PageBreadcrumb pageTitle="Obuna" />

      {/* Expired Alert */}
      {isExpired && (
        <div className="mb-6 rounded-2xl border-2 border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-700 dark:text-red-400">Obuna muddati tugagan!</h3>
              <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                Sizning mahsulotlaringiz platformada foydalanuvchilarga <strong>ko'rsatilmaydi</strong>. 
                Obunani yangilash uchun balansni to'ldiring yoki administrator bilan bog'laning.
              </p>
              <p className="text-xs text-red-500 dark:text-red-400 mt-2">
                Tugagan sana: {balance?.expired ? Moment(balance.expired).format("DD.MM.YYYY") : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-6">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-6">
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-6 w-24 mb-2" />
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-8 w-32" />
            </div>
          ))
        ) : (
          <>
            {/* Balance */}
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-xs font-medium text-gray-400 uppercase">Balans</div>
              </div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">
                {formatMoney(balance?.balance ?? 0)} <span className="text-sm font-normal text-gray-400">so'm</span>
              </div>
            </div>

            {/* Expiry */}
            <div className={`rounded-2xl border p-6 ${isExpired ? "border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-900/10" : "border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]"}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isExpired ? "bg-red-100 dark:bg-red-900/30" : "bg-blue-50 dark:bg-blue-900/20"}`}>
                  <svg className={`w-5 h-5 ${isExpired ? "text-red-500" : "text-blue-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-xs font-medium text-gray-400 uppercase">Obuna muddati</div>
              </div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">
                {balance?.expired ? Moment(balance.expired).format("DD.MM.YYYY") : "—"}
              </div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border mt-2 ${st.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                {st.label}
              </span>
            </div>

            {/* Status */}
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-xs font-medium text-gray-400 uppercase">Holat</div>
              </div>
              <div className={`text-2xl font-bold ${isExpired ? "text-red-600" : "text-emerald-600"}`}>
                {isExpired ? "Bloklangan" : "Faol"}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {isExpired ? "Mahsulotlaringiz platformada ko'rinmaydi" : "Mahsulotlaringiz platformada ko'rinadi"}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Transaction Logs */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/[0.05] flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Tranzaksiyalar tarixi
          </h3>
          <span className="text-xs text-gray-400">{logs.length} ta</span>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-10" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">Tranzaksiyalar topilmadi</div>
        ) : (
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="min-w-full">
              <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Sana</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tur</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase">Summa</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase">Balans</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Izoh</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => {
                  const logStyle = LOG_LABELS[log.type] ?? { label: log.type, cls: "bg-gray-50 text-gray-600" };
                  return (
                    <tr key={log.id} className="border-b border-gray-50 dark:border-white/[0.03] last:border-0 hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                      <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">{Moment(log.createdt).format("DD.MM.YY HH:mm")}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${logStyle.cls}`}>
                          {logStyle.label}
                        </span>
                      </td>
                      <td className={`px-5 py-3 text-sm font-semibold text-right whitespace-nowrap ${log.amount >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {log.amount >= 0 ? "+" : ""}{formatMoney(log.amount)}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400 text-right whitespace-nowrap">{formatMoney(log.balance_after)}</td>
                      <td className="px-5 py-3 text-xs text-gray-400 max-w-[200px] truncate">{log.note ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
