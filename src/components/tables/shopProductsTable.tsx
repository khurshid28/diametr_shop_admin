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

type VariantRow = { checked: boolean; count: string; price: string; bonus_price: string };

export default function ShopProductsTable({
  data,
  onRefetch,
}: {
  data: ShopProductItemProps[];
  onRefetch?: () => void;
}) {
  const [tableData, setTableData] = useState(data);
  /* add modal */
  const { isOpen: addOpen, openModal: openAddModal, closeModal: closeAddModal } = useModal();
  /* edit modal */
  const { isOpen: editOpen, openModal: openEditModal, closeModal: closeEditModal } = useModal();
  const [editItem, setEditItem] = useState<ShopProductItemProps | null>(null);
  const [editForm, setEditForm] = useState({ count: "", price: "", bonus_price: "" });
  const [editSaving, setEditSaving] = useState(false);

  /* add flow state */
  const [addCatId, setAddCatId] = useState("");
  const [addProdId, setAddProdId] = useState("");
  const [variantRows, setVariantRows] = useState<Record<number, VariantRow>>({});
  const [addSaving, setAddSaving] = useState(false);
  const [optionValue, setOptionValue] = useState("10");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const shopId = Number(localStorage.getItem("shop_id") ?? 0);

  // master data
  const [allCategories, setAllCategories] = useState<CategoryOption[]>([]);
  const [allProducts, setAllProducts] = useState<ProductRaw[]>([]);
  const [allProductItems, setAllProductItems] = useState<ProductItemRaw[]>([]);

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

  // ─── Add modal: derived data ───────────────────────────
  const addProductOptions = allProducts
    .filter((p) => !addCatId || String(p.category_id) === addCatId)
    .map((p) => ({ value: String(p.id), label: p.name_uz ?? p.name ?? p.name_ru ?? `#${p.id}` }));

  const addVariants = allProductItems.filter(
    (pi) => addProdId && String(pi.product?.id ?? pi.product_id ?? "") === addProdId
  );

  // When product changes, reset variant rows and pre-fill existing shop product data
  useEffect(() => {
    if (!addProdId) { setVariantRows({}); return; }
    const rows: Record<number, VariantRow> = {};
    const variants = allProductItems.filter(
      (pi) => String(pi.product?.id ?? pi.product_id ?? "") === addProdId
    );
    for (const v of variants) {
      const existing = data.find(
        (sp) => (sp.product_item_id ?? sp.product_item?.id) === v.id && sp.shop_id === shopId
      );
      rows[v.id] = {
        checked: !!existing,
        count: existing?.count != null ? String(existing.count) : "",
        price: existing?.price != null ? String(existing.price) : "",
        bonus_price: existing?.bonus_price != null ? String(existing.bonus_price) : "",
      };
    }
    setVariantRows(rows);
  }, [addProdId, allProductItems]);

  const toggleVariant = (id: number) => {
    setVariantRows((prev) => ({
      ...prev,
      [id]: { ...prev[id], checked: !prev[id]?.checked },
    }));
  };

  const updateVariantRow = (id: number, field: keyof VariantRow, value: string) => {
    setVariantRows((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const checkedCount = Object.values(variantRows).filter((r) => r.checked).length;

  // ─── Add: open / close / save ──────────────────────────
  const openAdd = () => {
    setAddCatId("");
    setAddProdId("");
    setVariantRows({});
    openAddModal();
  };

  const handleAddSave = async () => {
    const toSave = Object.entries(variantRows)
      .filter(([_, r]) => r.checked && r.price)
      .map(([id, r]) => ({
        product_item_id: Number(id),
        price: Number(r.price),
        count: r.count ? Number(r.count) : 0,
        bonus_price: r.bonus_price && Number(r.bonus_price) > 0 ? Number(r.bonus_price) : undefined,
        shop_id: shopId,
      }));

    if (toSave.length === 0) {
      toast.error("Kamida bitta variant tanlang va narx kiriting");
      return;
    }
    setAddSaving(true);
    try {
      let created = 0;
      let updated = 0;
      for (const payload of toSave) {
        const existing = data.find(
          (sp) => (sp.product_item_id ?? sp.product_item?.id) === payload.product_item_id && sp.shop_id === shopId
        );
        if (existing) {
          await axiosClient.put(`/shop-product/${existing.id}`, payload);
          updated++;
        } else {
          await axiosClient.post("/shop-product", payload);
          created++;
        }
      }
      const msgs: string[] = [];
      if (created) msgs.push(`${created} ta yangi qo'shildi`);
      if (updated) msgs.push(`${updated} ta yangilandi`);
      toast.success(msgs.join(", "));
      onRefetch?.();
      closeAddModal();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Xatolik yuz berdi");
    } finally {
      setAddSaving(false);
    }
  };

  // ─── Edit: open / save ────────────────────────────────
  const openEdit = (item: ShopProductItemProps) => {
    setEditItem(item);
    setEditForm({
      count: item.count != null ? String(item.count) : "",
      price: item.price != null ? String(item.price) : "",
      bonus_price: item.bonus_price != null ? String(item.bonus_price) : "",
    });
    openEditModal();
  };

  const handleEditSave = async () => {
    if (!editItem || !editForm.price) {
      toast.error("Narx kiritilishi shart");
      return;
    }
    setEditSaving(true);
    try {
      const payload: any = {
        product_item_id: editItem.product_item_id ?? editItem.product_item?.id,
        price: Number(editForm.price),
        count: editForm.count ? Number(editForm.count) : 0,
        shop_id: shopId,
      };
      if (editForm.bonus_price && Number(editForm.bonus_price) > 0)
        payload.bonus_price = Number(editForm.bonus_price);

      await axiosClient.put(`/shop-product/${editItem.id}`, payload);
      toast.success("Tovar yangilandi");
      onRefetch?.();
      closeEditModal();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Xatolik yuz berdi");
    } finally {
      setEditSaving(false);
    }
  };

  // ─── Delete ────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    try {
      await axiosClient.delete(`/shop-product/${id}`);
      toast.success("Tovar o'chirildi");
      onRefetch?.();
    } catch {
      toast.error("Xatolik yuz berdi");
    }
  };

  // ─── Table helpers ─────────────────────────────────────
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

  const getVariantLabelRaw = (pi: ProductItemRaw) => {
    return [
      pi.name ?? "",
      pi.value != null && pi.unit_type?.symbol ? `${pi.value} ${pi.unit_type.symbol}` : "",
      pi.color ?? "",
      pi.size ?? "",
    ].filter(Boolean).join(" · ") || `ID:${pi.id}`;
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

      {/* ─── ADD MODAL: Multi-variant selection ──────────── */}
      <Modal isOpen={addOpen} onClose={closeAddModal} className="max-w-[720px] m-4">
        <div className="relative w-full overflow-hidden bg-white no-scrollbar rounded-3xl dark:bg-gray-900 shadow-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">Tovar qo&apos;shish</h4>
                <p className="text-sm text-white/70">Tovar tanlang, variantlarni belgilang</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1">
            {/* Step 1: Category + Product selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div>
                <Label>Kategoriya</Label>
                <Select
                  options={[{ value: "", label: "Barcha kategoriyalar" }, ...allCategories]}
                  defaultValue={addCatId}
                  onChange={(v) => { setAddCatId(v); setAddProdId(""); setVariantRows({}); }}
                />
              </div>
              <div>
                <Label>Tovar <span className="text-error-500">*</span></Label>
                {addProductOptions.length > 0 ? (
                  <Select
                    options={[{ value: "", label: "Tovarni tanlang..." }, ...addProductOptions]}
                    defaultValue={addProdId}
                    onChange={(v) => setAddProdId(v)}
                  />
                ) : (
                  <p className="text-sm text-gray-400 py-2">
                    {addCatId ? "Bu kategoriyada tovar yo'q" : "Tovar yo'q"}
                  </p>
                )}
              </div>
            </div>

            {/* Step 2: Variants with checkboxes */}
            {addProdId && addVariants.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Variantlar
                    <span className="ml-1.5 text-gray-400 font-normal">({addVariants.length} ta)</span>
                  </p>
                  {checkedCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-100 dark:border-emerald-800/30">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {checkedCount} ta tanlandi
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {addVariants.map((v) => {
                    const row = variantRows[v.id] ?? { checked: false, count: "", price: "", bonus_price: "" };
                    const existing = data.find(
                      (sp) => (sp.product_item_id ?? sp.product_item?.id) === v.id && sp.shop_id === shopId
                    );
                    return (
                      <div key={v.id} className={`rounded-xl border transition-all ${
                        row.checked
                          ? "border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-900/10"
                          : "border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02]"
                      }`}>
                        {/* Variant header with checkbox */}
                        <label className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={row.checked}
                            onChange={() => toggleVariant(v.id)}
                            className="w-4.5 h-4.5 rounded-md border-2 border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
                          />
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            {v.color?.startsWith("#") && (
                              <span className="w-5 h-5 rounded-md flex-shrink-0 ring-1 ring-black/10 shadow-sm" style={{ background: v.color }} />
                            )}
                            <span className="font-medium text-sm text-gray-800 dark:text-white truncate">
                              {getVariantLabelRaw(v)}
                            </span>
                          </div>
                          {existing && (
                            <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[11px] font-medium">
                              Mavjud: {existing.count ?? 0} ta, {existing.price ? formatMoney(existing.price) : "—"}
                            </span>
                          )}
                        </label>

                        {/* Expanded fields when checked */}
                        {row.checked && (
                          <div className="px-4 pb-3 pt-0">
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Soni</label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={row.count}
                                  onChange={(e) => updateVariantRow(v.id, "count", e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                  Narx <span className="text-error-500">*</span>
                                </label>
                                <Input
                                  type="number"
                                  placeholder="so'm"
                                  value={row.price}
                                  onChange={(e) => updateVariantRow(v.id, "price", e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Skidka narxi</label>
                                <Input
                                  type="number"
                                  placeholder="ixtiyoriy"
                                  value={row.bonus_price}
                                  onChange={(e) => updateVariantRow(v.id, "bonus_price", e.target.value)}
                                />
                              </div>
                            </div>
                            {row.bonus_price && row.price && Number(row.price) > 0 && Number(row.bonus_price) > 0 && (
                              <p className="mt-1.5 text-xs text-brand-600 dark:text-brand-400">
                                Chegirma: {Math.round((1 - Number(row.bonus_price) / Number(row.price)) * 100)}% |{" "}
                                {formatMoney(Number(row.price))} → {formatMoney(Number(row.bonus_price))} so&apos;m
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {addProdId && addVariants.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-400">Bu tovar uchun variantlar yo&apos;q</p>
                <p className="text-xs text-gray-400 mt-1">Administrator variantlarni qo'shishi kerak</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 dark:border-white/[0.05] flex-shrink-0 justify-end">
            <Button size="sm" variant="outline" onClick={closeAddModal}>Bekor qilish</Button>
            <Button size="sm" onClick={handleAddSave} disabled={addSaving || checkedCount === 0}>
              {addSaving ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Saqlanmoqda...
                </span>
              ) : `Saqlash (${checkedCount} ta)`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── EDIT MODAL: Single shop product ─────────────── */}
      <Modal isOpen={editOpen} onClose={closeEditModal} className="max-w-[500px] m-4">
        <div className="relative w-full overflow-hidden bg-white no-scrollbar rounded-3xl dark:bg-gray-900 shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">Tovarni tahrirlash</h4>
                {editItem && (
                  <p className="text-sm text-white/70">{getProductName(editItem)} — {getVariantLabel(editItem) || "variant"}</p>
                )}
              </div>
            </div>
          </div>
          {/* Body */}
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Soni (dona)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={editForm.count}
                  onChange={(e) => setEditForm({ ...editForm, count: e.target.value })}
                />
              </div>
              <div>
                <Label>Narx (so&apos;m) <span className="text-error-500">*</span></Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={editForm.price}
                  onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-4">
              <Label>Skidka narxi (so&apos;m) — ixtiyoriy</Label>
              <Input
                type="number"
                placeholder="Skidka bo'lmasa bo'sh qoldiring"
                value={editForm.bonus_price}
                onChange={(e) => setEditForm({ ...editForm, bonus_price: e.target.value })}
              />
              {editForm.bonus_price && editForm.price && Number(editForm.price) > 0 && Number(editForm.bonus_price) > 0 && (
                <p className="mt-1 text-xs text-brand-600 dark:text-brand-400">
                  Chegirma: {Math.round((1 - Number(editForm.bonus_price) / Number(editForm.price)) * 100)}% |{" "}
                  {formatMoney(Number(editForm.price))} → {formatMoney(Number(editForm.bonus_price))} so&apos;m
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 mt-6 justify-end">
              <Button size="sm" variant="outline" onClick={closeEditModal}>Bekor qilish</Button>
              <Button size="sm" onClick={handleEditSave} disabled={editSaving || !editForm.price}>
                {editSaving ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Saqlanmoqda...
                  </span>
                ) : "Saqlash"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
