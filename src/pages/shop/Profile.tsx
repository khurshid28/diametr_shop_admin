import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useState } from "react";
import axiosClient from "../../service/axios.service";
import { toast } from "../../components/ui/toast";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";

export default function ProfilePage() {
  const userRaw = localStorage.getItem("user");
  const user = userRaw ? JSON.parse(userRaw) : null;

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

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
      await axiosClient.patch(`/user/${user?.id}`, {
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

  return (
    <>
      <PageMeta title="Profil" description="Foydalanuvchi profili" />
      <PageBreadcrumb pageTitle="Profil" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profile info */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-5">Profil ma'lumotlari</h3>
          <div className="space-y-4">
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ism</span>
              <p className="mt-1 text-base text-gray-800 dark:text-white">{user?.name ?? "—"}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Telefon</span>
              <p className="mt-1 text-base text-gray-800 dark:text-white">{user?.phone ?? "—"}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Rol</span>
              <p className="mt-1 text-base text-gray-800 dark:text-white">{user?.role ?? "—"}</p>
            </div>
            {user?.shop && (
              <div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Do'kon</span>
                <p className="mt-1 text-base text-gray-800 dark:text-white">{user.shop.name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Change password */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-5">Parolni o'zgartirish</h3>
          <div className="space-y-4">
            <div>
              <Label>Eski parol</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>
            <div>
              <Label>Yangi parol</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <Label>Yangi parolni tasdiqlang</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button onClick={handlePasswordChange} disabled={saving} className="w-full">
              {saving ? "Saqlanmoqda..." : "Parolni o'zgartirish"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
