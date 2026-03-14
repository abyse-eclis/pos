"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Product } from "@/components/PosTypes";

interface ProductFormState {
  name: string;
  category: string;
  price: string;
  cost: string;
  is_active: boolean;
}

function buildForm(product: Product | null): ProductFormState {
  return {
    name: product?.name || "",
    category: product?.category || "",
    price: product ? String(product.price || 0) : "",
    cost: product ? String(product.cost || 0) : "",
    is_active: product?.is_active !== false,
  };
}

export default function ProductManagementPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSku, setSelectedSku] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState<ProductFormState>(buildForm(null));

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("โหลดรายการสินค้าไม่สำเร็จ");
        const data = await res.json();
        const nextProducts = data.products || [];
        setProducts(nextProducts);
        if (nextProducts[0]) {
          setSelectedSku(nextProducts[0].sku_code);
          setForm(buildForm(nextProducts[0]));
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "โหลดรายการสินค้าไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      [product.name, product.sku_code, product.category]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [products, search]);

  const selectedProduct =
    products.find((product) => product.sku_code === selectedSku) || filteredProducts[0] || null;

  useEffect(() => {
    if (selectedProduct) {
      setForm(buildForm(selectedProduct));
    }
  }, [selectedProduct]);

  const previewUrl = useMemo(() => {
    if (!selectedFile) return selectedProduct?.image || "/image/empty.jpg";
    return URL.createObjectURL(selectedFile);
  }, [selectedFile, selectedProduct]);

  useEffect(() => {
    return () => {
      if (selectedFile && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl, selectedFile]);

  const handleSelectProduct = (skuCode: string) => {
    setSelectedSku(skuCode);
    setSelectedFile(null);
    setMessage("");
    setError("");
  };

  const handleFormChange =
    (field: keyof ProductFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = field === "is_active" ? event.target.checked : event.target.value;
      setForm((current) => ({ ...current, [field]: nextValue }));
    };

  const handleSave = async () => {
    if (!selectedProduct) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku_code: selectedProduct.sku_code,
          name: form.name.trim(),
          category: form.category.trim(),
          price: Number(form.price) || 0,
          cost: Number(form.cost) || 0,
          is_active: form.is_active,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "บันทึกสินค้าไม่สำเร็จ");
      }

      setProducts((current) =>
        current.map((product) =>
          product.sku_code === selectedProduct.sku_code
            ? {
                ...product,
                name: form.name.trim(),
                category: form.category.trim(),
                price: Number(form.price) || 0,
                cost: Number(form.cost) || 0,
                is_active: form.is_active,
              }
            : product,
        ),
      );
      setMessage("บันทึกข้อมูลสินค้าเรียบร้อย");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "บันทึกสินค้าไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedProduct || !selectedFile) return;

    setUploading(true);
    setMessage("");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("sku_code", selectedProduct.sku_code);
      formData.append("name", selectedProduct.name);

      const res = await fetch("/api/product-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "อัปโหลดรูปไม่สำเร็จ");
      }

      setProducts((current) =>
        current.map((product) =>
          product.sku_code === selectedProduct.sku_code
            ? { ...product, image: data.image }
            : product,
        ),
      );
      setSelectedFile(null);
      setMessage("อัปโหลดรูปแล้ว และบันทึก URL ลง Google Sheet เรียบร้อย");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppShell
      title="จัดการสินค้า"
      subtitle="แก้ไขข้อมูลสินค้า เปิด/ปิดการใช้งาน และอัปโหลดรูปขึ้น Vercel Blob"
    >
      <div className="space-y-5">
        <section className="rounded-[32px] border border-white/[0.06] bg-white/[0.03] p-5 shadow-xl shadow-black/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
                Product Tools
              </p>
              <p className="mt-2 text-base text-slate-300">
                จัดการข้อมูลสินค้า เปิดหรือปิดการขาย และดูอันดับสินค้าขายดีได้จากหมวดนี้
              </p>
            </div>
            <Link
              href="/products/ranking"
              className="inline-flex items-center justify-center rounded-2xl bg-linear-to-r from-violet-500 to-fuchsia-500 px-5 py-3.5 text-base font-black text-white shadow-lg shadow-violet-500/20 transition hover:brightness-110 active:scale-[0.98]"
            >
              ไปหน้าจัดอันดับสินค้า
            </Link>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <aside className="rounded-[32px] border border-white/[0.06] bg-white/[0.03] p-5 shadow-xl shadow-black/20">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
              ค้นหาสินค้า
            </p>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาจากชื่อ, SKU, หมวดหมู่"
              className="mt-3 w-full rounded-2xl border border-white/[0.08] bg-[#0d1117] px-4 py-3 text-base text-white outline-none transition focus:border-cyan-500/50"
            />

            <div className="mt-4 max-h-[65dvh] space-y-3 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
              {loading ? (
                <div className="rounded-2xl border border-white/[0.05] bg-black/20 p-4 text-base text-slate-400">
                  กำลังโหลดสินค้า...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.05] bg-black/20 p-4 text-base text-slate-400">
                  ไม่พบสินค้าที่ค้นหา
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const active = product.sku_code === selectedProduct?.sku_code;
                  return (
                    <button
                      key={product.sku_code}
                      type="button"
                      onClick={() => handleSelectProduct(product.sku_code)}
                      className={`flex w-full items-center gap-3 rounded-[24px] border p-3 text-left transition ${
                        active
                          ? "border-cyan-500/30 bg-cyan-500/10"
                          : "border-white/[0.05] bg-black/20 hover:border-white/[0.12] hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#0d1117] p-2">
                        <img
                          src={product.image || "/image/empty.jpg"}
                          alt={product.name}
                          className="h-full w-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/image/empty.jpg";
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-2 text-base font-black text-white">{product.name}</p>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-[0.16em] ${
                              product.is_active !== false
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-rose-500/15 text-rose-300"
                            }`}
                          >
                            {product.is_active !== false ? "เปิด" : "ปิด"}
                          </span>
                        </div>
                        <p className="mt-1 break-all text-sm text-slate-400">{product.sku_code}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className="rounded-[32px] border border-white/[0.06] bg-linear-to-br from-white/[0.04] via-white/[0.03] to-white/[0.01] p-5 shadow-2xl shadow-black/30 sm:p-6">
            {selectedProduct ? (
              <div className="space-y-5">
                <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
                  <div className="rounded-[28px] border border-white/[0.06] bg-black/20 p-4">
                    <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0d1117] p-3">
                      <img
                        src={previewUrl}
                        alt={selectedProduct.name}
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/image/empty.jpg";
                        }}
                      />
                    </div>
                    <p className="mt-4 text-lg font-black text-white">{selectedProduct.name}</p>
                    <p className="mt-1 break-all text-sm text-slate-400">{selectedProduct.sku_code}</p>
                    <p className="mt-2 text-sm text-slate-300">
                      สถานะ: {form.is_active ? "เปิดใช้งาน" : "ปิดการขาย"}
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-white/[0.06] bg-black/20 p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">
                          ชื่อสินค้า
                        </span>
                        <input
                          type="text"
                          value={form.name}
                          onChange={handleFormChange("name")}
                          className="mt-2 w-full rounded-2xl border border-white/[0.08] bg-[#0d1117] px-4 py-3 text-base text-white outline-none transition focus:border-cyan-500/50"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">
                          หมวดหมู่
                        </span>
                        <input
                          type="text"
                          value={form.category}
                          onChange={handleFormChange("category")}
                          className="mt-2 w-full rounded-2xl border border-white/[0.08] bg-[#0d1117] px-4 py-3 text-base text-white outline-none transition focus:border-cyan-500/50"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">
                          ราคาขาย
                        </span>
                        <input
                          type="number"
                          value={form.price}
                          onChange={handleFormChange("price")}
                          className="mt-2 w-full rounded-2xl border border-white/[0.08] bg-[#0d1117] px-4 py-3 text-base text-white outline-none transition focus:border-cyan-500/50"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">
                          ราคาทุน
                        </span>
                        <input
                          type="number"
                          value={form.cost}
                          onChange={handleFormChange("cost")}
                          className="mt-2 w-full rounded-2xl border border-white/[0.08] bg-[#0d1117] px-4 py-3 text-base text-white outline-none transition focus:border-cyan-500/50"
                        />
                      </label>
                    </div>

                    <label className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#0d1117] px-4 py-3">
                      <div>
                        <p className="text-base font-black text-white">เปิดใช้งานสินค้า</p>
                        <p className="mt-1 text-sm text-slate-400">
                          ถ้าปิด สินค้าจะไม่แสดงในหน้าขาย
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={handleFormChange("is_active")}
                        className="h-5 w-5 accent-cyan-500"
                      />
                    </label>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded-2xl bg-linear-to-r from-emerald-500 to-teal-500 px-5 py-3.5 text-base font-black text-white shadow-lg shadow-emerald-500/20 transition active:scale-[0.98] disabled:opacity-40"
                      >
                        {saving ? "กำลังบันทึก..." : "บันทึกข้อมูลสินค้า"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm(buildForm(selectedProduct))}
                        className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3.5 text-base font-black text-slate-200 transition hover:border-white/[0.14] hover:text-white"
                      >
                        รีเซ็ตฟอร์ม
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/[0.06] bg-black/20 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
                        อัปโหลดรูปสินค้า
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        ย่อส่วนอัปโหลดรูปให้เล็กลงแล้ว ใช้สำหรับเปลี่ยนรูปอย่างเดียว
                      </p>
                    </div>
                    {selectedProduct.image && (
                      <a
                        href={selectedProduct.image}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm font-black text-slate-200 transition hover:border-white/[0.14] hover:text-white"
                      >
                        เปิดรูปปัจจุบัน
                      </a>
                    )}
                  </div>

                  <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="block w-full rounded-2xl border border-dashed border-white/[0.1] bg-[#0d1117] px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-500 file:px-4 file:py-2 file:text-sm file:font-black file:text-black"
                    />
                    <button
                      type="button"
                      onClick={handleUpload}
                      disabled={!selectedFile || uploading}
                      className="rounded-2xl bg-linear-to-r from-cyan-500 to-blue-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-cyan-500/20 transition active:scale-[0.98] disabled:opacity-40"
                    >
                      {uploading ? "กำลังอัปโหลด..." : "อัปโหลดรูป"}
                    </button>
                  </div>
                </div>

                {message && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-base font-bold text-emerald-100">
                    {message}
                  </div>
                )}
                {error && (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-base font-bold text-rose-100">
                    {error}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[0.05] bg-black/20 p-5 text-base text-slate-400">
                ไม่พบสินค้าให้จัดการ
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
