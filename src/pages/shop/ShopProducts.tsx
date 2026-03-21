import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useState } from "react";
import axiosClient from "../../service/axios.service";
import { toast } from "../../components/ui/toast";
import ShopProductsTable, { ShopProductItemProps } from "../../components/tables/shopProductsTable";
import { usePolling } from "../../hooks/usePolling";

export default function ShopProductsPage() {
  const [data, setData] = useState<ShopProductItemProps[]>([]);
  const shopId = Number(localStorage.getItem("shop_id") ?? 0);

  const fetchData = async () => {
    try {
      const res = await axiosClient.get("/shop-product/all");
      const all: ShopProductItemProps[] = res.data?.data ?? res.data ?? [];
      setData(all.filter((p: any) => p.shop_id === shopId));
    } catch {
      toast.error("Ma'lumotlarni yuklashda xatolik");
    }
  };

  useEffect(() => { fetchData(); }, []);
  usePolling(fetchData, 20000);

  return (
    <>
      <PageMeta title="Do'kon Tovarlar" description="Do'kon tovarlar ro'yxati" />
      <PageBreadcrumb pageTitle="Tovarlar" />
      <div className="space-y-6">
        <ShopProductsTable data={data} onRefetch={fetchData} />
      </div>
    </>
  );
}
