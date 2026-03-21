import { useCallback, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import axiosClient from "../../service/axios.service";
import { usePolling } from "../../hooks/usePolling";
import { formatMoney } from "../../service/formatters/money.format";

interface StatCard {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  sub?: string;
}

function StatCardComp({ label, value, icon, color, sub }: StatCard) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${color}`}>
        {icon}
      </div>
      <div className="mt-5">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">{value}</h4>
        {sub && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
      </div>
    </div>
  );
}

const statusColors: Record<string, string> = {
  STARTED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  CONFIRMED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  FINISHED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  CANCELED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};
const statusLabels: Record<string, string> = {
  STARTED: "Yangi",
  CONFIRMED: "Tasdiqlangan",
  FINISHED: "Bajarilgan",
  CANCELED: "Bekor",
};

export default function Home() {
  const shopId = Number(localStorage.getItem("shop_id") ?? 0);
  const [orders, setOrders] = useState<any[]>([]);
  const [productsCount, setProductsCount] = useState(0);
  const [workersCount, setWorkersCount] = useState(0);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [ordersRes, shopProductsRes, workersRes, paymentsRes] = await Promise.allSettled([
        axiosClient.get("/order/all"),
        axiosClient.get("/shop-product/all"),
        axiosClient.get("/worker/all"),
        axiosClient.get("/payment/all"),
      ]);

      if (ordersRes.status === "fulfilled") {
        const all: any[] = Array.isArray(ordersRes.value.data) ? ordersRes.value.data : ordersRes.value.data?.data ?? [];
        setOrders(all.filter((o) => o.shop?.id === shopId || o.shop_id === shopId));
      }
      if (shopProductsRes.status === "fulfilled") {
        const all: any[] = Array.isArray(shopProductsRes.value.data) ? shopProductsRes.value.data : shopProductsRes.value.data?.data ?? [];
        setProductsCount(all.filter((p) => p.shop_id === shopId || p.shop?.id === shopId).length);
      }
      if (workersRes.status === "fulfilled") {
        const all: any[] = Array.isArray(workersRes.value.data) ? workersRes.value.data : workersRes.value.data?.data ?? [];
        setWorkersCount(all.filter((w) => w.shop_id === shopId || w.shop?.id === shopId).length);
      }
      if (paymentsRes.status === "fulfilled") {
        const all: any[] = Array.isArray(paymentsRes.value.data) ? paymentsRes.value.data : paymentsRes.value.data?.data ?? [];
        const myPayments = all.filter((p) => p.shop_id === shopId || p.shop?.id === shopId);
        setPaymentsTotal(myPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0));
      }
    } catch (_) {
      // silent
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  usePolling(fetchData, 15_000);

  const finishedOrders = orders.filter((o) => o.status === "FINISHED");
  const activeOrders = orders.filter((o) => o.status === "STARTED" || o.status === "CONFIRMED");
  const revenue = finishedOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  const recentOrders = [...orders].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()).slice(0, 5);

  const skeleton = "animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-7 w-24";

  return (
    <>
      <PageMeta title="Dashboard | Diametr Do'kon Admin" description="Shop statistics" />

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-1">Dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Do'koningizning umumiy ko'rsatkichlari</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
          <StatCardComp
            label="Jami Buyurtmalar"
            value={loading ? "..." : orders.length}
            color="bg-brand-50 dark:bg-brand-500/15"
            icon={<svg className="w-6 h-6 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>}
            sub={`${activeOrders.length} ta aktiv`}
          />
          <StatCardComp
            label="Jami Tushumlar"
            value={loading ? "..." : `${formatMoney(revenue)} so'm`}
            color="bg-success-50 dark:bg-success-500/15"
            icon={<svg className="w-6 h-6 text-success-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33"/></svg>}
            sub={`${finishedOrders.length} ta bajarildi`}
          />
          <StatCardComp
            label="Do'kon Tovarlar"
            value={loading ? "..." : productsCount}
            color="bg-blue-50 dark:bg-blue-500/15"
            icon={<svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"/></svg>}
          />
          <StatCardComp
            label="To'lovlar"
            value={loading ? "..." : `${formatMoney(paymentsTotal)} so'm`}
            color="bg-purple-50 dark:bg-purple-500/15"
            icon={<svg className="w-6 h-6 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/></svg>}
          />
        </div>

        {/* Recent orders table */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-base font-medium text-gray-800 dark:text-white">Oxirgi Buyurtmalar</h3>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(4)].map((_, i) => <div key={i} className={skeleton + " w-full h-8"} />)}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">Buyurtmalar yo'q</div>
            ) : (
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Mijoz</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Summa</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Sana</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                      <td className="px-5 py-4 text-sm text-gray-800 dark:text-white">{order.user?.fullname ?? order.phone ?? "—"}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-green-600 dark:text-green-400">{order.amount ? `${Number(order.amount).toLocaleString()} so'm` : "—"}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
                          {statusLabels[order.status ?? ""] ?? order.status ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString("uz-UZ") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
