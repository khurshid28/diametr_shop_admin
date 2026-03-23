import TableActions from "./TableActions";
import TableToolbar from "./TableToolbar";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import Button from "../ui/button/Button";
import { PlusIcon } from "../../icons";
import { useEffect, useState } from "react";
import { useModal } from "../../hooks/useModal";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { Modal } from "../ui/modal";
import Select from "../form/Select";
import axiosClient from "../../service/axios.service";
import { toast } from "../ui/toast";
import { formatMoney } from "../../service/formatters/money.format";
import * as XLSX from "xlsx";
import Moment from "moment";

export interface ShopProductItemProps {
  id: number;
  count?: number;
  price?: number;
  bonus_price?: number;
  sold_count?: number;
  last_sold?: string | null;
  shop_id?: number;
  shop?: { id: number; name?: string };
  product_item_id?: number;
  product_item?: {
    id: number;
    name?: string;
    image?: string;
    value?: number | string;
    color?: string;
    size?: string;
    unit_type?: { id: number; name?: string; symbol?: string };
    product?: {
      id: number;
      name?: string;
      name_uz?: string;
      name_ru?: string;
      image?: string;
      category_id?: number;
      category?: { id: number; name?: string; name_uz?: string };
    };
  };
}

interface CategoryOption { value: string; label: string }
interface ProductRaw { id: number; name_uz?: string; name?: string; name_ru?: string; category_id?: number }
interface ProductItemRaw {
  id: number;
  name?: string;
  value?: any;
  color?: string;
  size?: string;
  product_id?: number;
  product?: ProductRaw;
  unit_type?: { id: number; symbol?: string };
}

const emptyForm = {
  category_id: "",
  product_id: "",
  product_item_id: "",
  count: "",
  price: "",
  bonus_price: "",
};

export default function ShopProductsTable({
  data,
  onRefetch,
}: {
  data: ShopProductItemProps[];
  onRefetch?: () => void;
}) {
  const [tableData, setTableData] = useState(data);
  const { isOpen, openModal, closeModal } = useModal();
  const [editItem, setEditItem] = useState<ShopProductItemProps | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [optionValue, setOptionValue] = useState("10");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const shopId = Number(localStorage.getItem("shop_id") ?? 0);

  // master data
  const [allCategories, setAllCategories] = useState<CategoryOption[]>([]);
  const [allProducts, setAllProducts] = useState<ProductRaw[]>([]);
  const [allProductItems, setAllProductItems] = useState<ProductItemRaw[]>([]);

  // selected product item info
  const [selectedItemInfo, setSelectedItemInfo] = useState<{
    count?: number;
    price?: number;
    bonus_price?: number;
  } | null>(null);

  useEffect(() => { setTableData(data); setCurrentPage(1); }, [data]);
  useEffect(() => { setCurrentPage(1); }, [optionValue]);

  // load master data once
  useEffect(() => {
    Promise.allSettled([
      axiosClient.get("/category/all"),
      axiosClient.get("/product/all"),
      axiosClient.get("/product-item/all"),
    ]).then(([catRes, prodRes, itemRes]) => {
      if (catRes.status === "fulfilled") {
        const list: any[] = Array.isArray(catRes.value.data) ? catRes.value.data : catRes.value.data?.data ?? [];
        setAllCategories(list.map((c: any) => ({ value: String(c.id), label: c.name_uz ?? c.name ?? c.name_ru ?? `#${c.id}` })));
      }
      if (prodRes.status === "fulfilled") {
        const list: any[] = Array.isArray(prodRes.value.data) ? prodRes.value.data : prodRes.value.data?.data ?? [];
        setAllProducts(list);
      }
      if (itemRes.status === "fulfilled") {
        const list: any[] = Array.isArray(itemRes.value.data) ? itemRes.value.data : itemRes.value.data?.data ?? [];
        setAllProductItems(list);
      }
    });
  }, []);

  // derived options based on form selections
  const productOptions = allProducts
    .filter((p) => !form.category_id || String(p.category_id) === form.category_id)
    .map((p) => ({ value: String(p.id), label: p.name_uz ?? p.name ?? p.name_ru ?? `#${p.id}` }));

  const productItemOptions = allProductItems
    .filter((pi) => !form.product_id || String(pi.product?.id ?? pi.product_id ?? "") === form.product_id)
    .map((pi) => {
      const pname = pi.product?.name_uz ?? pi.product?.name ?? "";
      const variants = [
        pi.value != null && pi.unit_type?.symbol ? `${pi.value} ${pi.unit_type.symbol}` : "",
        pi.color ?? "",
        pi.size ?? "",
      ].filter(Boolean).join(", ");
      const label = variants ? `${pname ? pname + " — " : ""}${variants}` : (pname || pi.name || `ID:${pi.id}`);
      return { value: String(pi.id), label };
    });

  // when product item is selected, prefill price/count from existing shop product if any
  useEffect(() => {
    if (!form.product_item_id) { setSelectedItemInfo(null); return; }
    const existing = data.find(
      (sp) => String(sp.product_item_id ?? sp.product_item?.id) === form.product_item_id && sp.shop_id === shopId
    );
    if (existing && !editItem) {
      setSelectedItemInfo({ count: existing.count, price: existing.price, bonus_price: existing.bonus_price });
      setForm((prev) => ({
        ...prev,
        count: existing.count != null ? String(existing.count) : prev.count,
        price: existing.price != null ? String(existing.price) : prev.price,
        bonus_price: existing.bonus_price != null ? String(existing.bonus_price) : prev.bonus_price,
      }));
    } else {
      setSelectedItemInfo(null);
    }
  }, [form.product_item_id]);

  const filteredData = search.trim() === ""
    ? tableData
    : tableData.filter((s) => {
        const q = search.toLowerCase();
        const pi = s.product_item;
        const pname = pi?.product?.name_uz ?? pi?.product?.name ?? pi?.name ?? "";
        return pname.toLowerCase().includes(q);
      });

  const maxPage = Math.ceil(filteredData.length / +optionValue) || 1;
  const currentItems = filteredData.slice((currentPage - 1) * +optionValue, currentPage * +optionValue);

  const openEdit = (item: ShopProductItemProps) => {
    setEditItem(item);
    const pi = item.product_item;
    const productId = String(pi?.product?.id ?? "");
    const catId = String(pi?.product?.category_id ?? "");
    setForm({
      category_id: catId,
      product_id: productId,
      product_item_id: String(item.product_item_id ?? pi?.id ?? ""),
      count: item.count != null ? String(item.count) : "",
      price: item.price != null ? String(item.price) : "",
      bonus_price: item.bonus_price != null ? String(item.bonus_price) : "",
    });
    setSelectedItemInfo(null);
    openModal();
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({ ...emptyForm });
    setSelectedItemInfo(null);
    openModal();
  };

  const handleSave = async () => {
    if (!form.product_item_id || !form.price) {
      toast.error("Tovar varianti va narx kiritilishi shart");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        product_item_id: Number(form.product_item_id),
        price: Number(form.price),
        count: form.count ? Number(form.count) : 0,
        shop_id: shopId,
      };
      if (form.bonus_price && Number(form.bonus_price) > 0) payload.bonus_price = Number(form.bonus_price);

      if (editItem) {
        await axiosClient.put(`/shop-product/${editItem.id}`, payload);
        toast.success("Tovar yangilandi");
      } else {
        await axiosClient.post("/shop-product", payload);
        toast.success("Tovar qo'shildi");
      }
      onRefetch?.();
      closeModal();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axiosClient.delete(`/shop-product/${id}`);
      toast.success("Tovar o'chirildi");
      onRefetch?.();
    } catch {
      toast.error("Xatolik yuz berdi");
    }
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(
      tableData.map((p) => {
        const pi = p.product_item;
        const pname = pi?.product?.name_uz ?? pi?.product?.name ?? pi?.name ?? "";
        const variants = [
          pi?.value != null && pi?.unit_type?.symbol ? `${pi.value} ${pi.unit_type.symbol}` : "",
          pi?.color ?? "",
          pi?.size ?? "",
        ].filter(Boolean).join(", ");
        return {
          "Tovar": pname,
          "Variant": variants,
          "Soni": p.count ?? 0,
          "Sotilgan": p.sold_count ?? 0,
          "Oxirgi savdo": p.last_sold ? Moment(p.last_sold).format('DD.MM.YYYY') : "",
          "Narx": p.price ?? 0,
          "Skidka narxi": p.bonus_price ?? "",
        };
      })
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tovarlar");
    XLSX.writeFile(wb, `shop-products-${Moment().format("YYYY-MM-DD")}.xlsx`);
  };

  const getProductName = (sp: ShopProductItemProps) => {
    const pi = sp.product_item;
    return pi?.product?.name_uz ?? pi?.product?.name ?? pi?.name ?? "—";
  };

  const getVariantLabel = (sp: ShopProductItemProps) => {
    const pi = sp.product_item;
    if (!pi) return "";
    return [
      pi.value != null && pi.unit_type?.symbol ? `${pi.value} ${pi.unit_type.symbol}` : "",
      pi.color ?? "",
      pi.size ?? "",
    ].filter(Boolean).join(" · ");
  };

  const discountPct = (price?: number, bonus?: number) =>
    price && bonus && price > 0 ? Math.round((1 - bonus / price) * 100) : null;

  const staticUrl = import.meta.env.VITE_STATIC_PATH ?? "";

  const getItemImage = (sp: ShopProductItemProps) => {
    const pi = sp.product_item;
    if (pi?.image) return `${staticUrl}/product-items/${pi.image}`;
    if (pi?.product?.image) return `${staticUrl}/products/${pi.product.image}`;
    return null;
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <TableToolbar
          search={search}
          onSearch={(v) => { setSearch(v); setCurrentPage(1); }}
          searchPlaceholder="Tovar qidirish..."
          showValue={optionValue}
          onShowChange={(v) => { setOptionValue(v); setCurrentPage(1); }}
          onExport={handleExport}
          action={
            <Button size="sm" variant="primary" startIcon={<PlusIcon className="size-4 fill-white" />} onClick={openAdd}>
              Qo&apos;shish
            </Button>
          }
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="px-5 py-3 text-xs font-medium text-gray-500 uppercase dark:text-gray-400">#</TableCell>
              <TableCell isHeader className="px-5 py-3 text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Rasm</TableCell>
              <TableCell isHeader className="px-5 py-3 text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Tovar</TableCell>
              <TableCell isHeader className="px-5 py-3 text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Variant</TableCell>
              <TableCell isHeader className="px-5 py-3 text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Soni</TableCell>
              <TableCell isHeader className="px-5 py-3 text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Sotilgan</TableCell>
              <TableCell isHeader className="px-5 py-3 text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Narx</TableCell>
              <TableCell isHeader className="px-5 py-3 text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Amallar</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-gray-400">Tovarlar yo&apos;q</TableCell>
              </TableRow>
            ) : currentItems.map((item, idx) => {
              const variantLabel = getVariantLabel(item);
              const dp = discountPct(item.price, item.bonus_price);
              return (
                <TableRow key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {(currentPage - 1) * +optionValue + idx + 1}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    {(() => {
                      const imgUrl = getItemImage(item);
                      return imgUrl ? (
                        <img src={imgUrl} alt="" className="h-10 w-10 rounded-lg object-cover border border-gray-200 dark:border-white/10" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center">
                          <svg className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="px-5 py-4 font-medium text-gray-800 dark:text-white text-sm">
                    <div>{getProductName(item)}</div>
                    {item.product_item?.product?.category?.name_uz && (
                      <span className="text-xs text-gray-400">{item.product_item.product.category.name_uz}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {variantLabel ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.06] text-xs">
                        {item.product_item?.color?.startsWith('#') && (
                          <span className="w-4 h-4 rounded-full border-2 border-white dark:border-gray-700 shadow-sm flex-shrink-0 ring-1 ring-gray-200 dark:ring-gray-600" style={{ background: item.product_item.color }} />
                        )}
                        {variantLabel}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {item.count ?? 0} ta
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm">
                    <div className="font-semibold text-gray-800 dark:text-white">{item.sold_count ?? 0} ta</div>
                    {item.last_sold ? (
                      <span className="text-[11px] text-gray-400">{Moment(item.last_sold).format('DD.MM.YYYY HH:mm')}</span>
                    ) : (
                      <span className="text-[11px] text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm">
                    {item.bonus_price != null && dp !== null && dp > 0 ? (
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-brand-600 dark:text-brand-400">{formatMoney(item.bonus_price)} so&apos;m</span>
                          <span className="px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium">-{dp}%</span>
                        </div>
                        <div className="text-xs text-gray-400 line-through">{formatMoney(item.price)} so&apos;m</div>
                      </div>
                    ) : (
                      <span className="font-semibold text-gray-800 dark:text-white">
                        {item.price != null ? `${formatMoney(item.price)} so'm` : "—"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <TableActions onEdit={() => openEdit(item)} onDelete={() => handleDelete(item.id)} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="px-5 py-3 flex justify-between items-center border-t border-gray-100 dark:border-white/[0.05]">
          <span className="text-sm text-gray-500 dark:text-gray-400">{filteredData.length} ta tovar</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>Oldingi</Button>
            <Button size="sm" variant="outline" disabled={currentPage >= maxPage} onClick={() => setCurrentPage((p) => p + 1)}>Keyingi</Button>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[540px] m-4">
        <div className="relative w-full p-4 overflow-y-auto bg-white no-scrollbar rounded-3xl dark:bg-gray-900 lg:p-8 max-h-[90vh]">
          <div className="px-2 pr-14 mb-6">
            <h4 className="text-xl font-semibold text-gray-800 dark:text-white">
              {editItem ? "Tovarni tahrirlash" : "Yangi tovar qo'shish"}
            </h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Kategoriya → Tovar → Variantni tanlang</p>
          </div>

          <div className="flex flex-col gap-4 px-2">
            {/* Step 1: Category */}
            <div>
              <Label>1. Kategoriya</Label>
              <Select
                options={[{ value: "", label: "Barcha kategoriyalar" }, ...allCategories]}
                defaultValue={form.category_id}
                onChange={(v) => setForm({ ...form, category_id: v, product_id: "", product_item_id: "" })}
              />
            </div>

            {/* Step 2: Product */}
            <div>
              <Label>2. Tovar <span className="text-error-500">*</span></Label>
              {productOptions.length > 0 ? (
                <Select
                  options={[{ value: "", label: "Tovarni tanlang..." }, ...productOptions]}
                  defaultValue={form.product_id}
                  onChange={(v) => setForm({ ...form, product_id: v, product_item_id: "" })}
                />
              ) : (
                <p className="text-sm text-gray-400 py-2">
                  {form.category_id ? "Bu kategoriyada tovar yo'q" : "Avval kategoriya tanlang"}
                </p>
              )}
            </div>

            {/* Step 3: Product Item / Variant */}
            <div>
              <Label>3. Variant / Tur <span className="text-error-500">*</span></Label>
              {form.product_id ? (
                productItemOptions.length > 0 ? (
                  <Select
                    options={[{ value: "", label: "Variantni tanlang..." }, ...productItemOptions]}
                    defaultValue={form.product_item_id}
                    onChange={(v) => setForm({ ...form, product_item_id: v })}
                  />
                ) : (
                  <p className="text-sm text-gray-400 py-2">Bu tovar uchun variant yo&apos;q</p>
                )
              ) : (
                <p className="text-sm text-gray-400 py-2">Avval tovarni tanlang</p>
              )}
            </div>

            {/* Hint if existing shop product found */}
            {selectedItemInfo && (
              <div className="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 text-sm text-blue-700 dark:text-blue-400">
                Bu variant do&apos;koningizda mavjud: {selectedItemInfo.count ?? 0} ta,{" "}
                {selectedItemInfo.price ? `${formatMoney(selectedItemInfo.price)} so'm` : "narx yo'q"}
                {selectedItemInfo.bonus_price ? ` (skidka: ${formatMoney(selectedItemInfo.bonus_price)} so'm)` : ""}
              </div>
            )}

            {/* Count and Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Soni (dona)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.count}
                  onChange={(e) => setForm({ ...form, count: e.target.value })}
                />
              </div>
              <div>
                <Label>Narx (so&apos;m) <span className="text-error-500">*</span></Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
            </div>

            {/* Bonus price */}
            <div>
              <Label>Skidka narxi (so&apos;m) — ixtiyoriy</Label>
              <Input
                type="number"
                placeholder="Skidka bo'lmasa bo'sh qoldiring"
                value={form.bonus_price}
                onChange={(e) => setForm({ ...form, bonus_price: e.target.value })}
              />
              {form.bonus_price && form.price && Number(form.price) > 0 && Number(form.bonus_price) > 0 && (
                <p className="mt-1 text-xs text-brand-600 dark:text-brand-400">
                  Chegirma: {Math.round((1 - Number(form.bonus_price) / Number(form.price)) * 100)}% |
                  Asosiy: {formatMoney(Number(form.price))} so&apos;m → Skidka: {formatMoney(Number(form.bonus_price))} so&apos;m
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 px-2 mt-6 justify-end">
            <Button size="sm" variant="outline" onClick={closeModal}>Bekor qilish</Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !form.product_item_id || !form.price}>
              {saving ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
