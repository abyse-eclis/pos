import Link from "next/link";
import { AppShell } from "@/components/AppShell";

const sections = [
  {
    id: "pos",
    title: "เริ่มใช้งานหน้า POS",
    location: "Sidebar > ขายสินค้า",
    href: "/",
    cta: "ไปหน้าขายสินค้า",
    body:
      "หน้าแรกของระบบคือหน้าขายสินค้า ใช้สำหรับเลือกสินค้า เพิ่มลงตะกร้า ชำระเงินสดหรือเงินโอน และบันทึกยอดขายรายวัน",
  },
  {
    id: "session",
    title: "เปิดรอบขาย",
    location: "Sidebar > สต๊อก > คลังร้าน",
    href: "/stock/warehouse",
    cta: "ไปหน้าคลังร้าน",
    body:
      "ไปที่เมนูสต๊อก > คลังร้าน แล้วกดเปิดรอบขายใหม่ ระบุชื่อรอบตามงานจริง เช่น รอบตลาดศุกร์-เสาร์-อาทิตย์ รอบนี้จะใช้เก็บ movement ของสต๊อกจนกว่าจะปิดรอบ",
  },
  {
    id: "warehouse",
    title: "รับเข้าคลังร้าน",
    location: "Sidebar > สต๊อก > คลังร้าน",
    href: "/stock/warehouse",
    cta: "รับเข้าคลังร้าน",
    body:
      "เมื่อพนักงานรับของมาจากคลังใหญ่ ให้กรอกยอดสุทธิที่รับเข้าจริงในหน้าคลังร้าน ระบบจะถือว่าของนี้เข้าสู่คลังร้านทันที โดยไม่ต้อง track คลังใหญ่แยกในระบบ",
  },
  {
    id: "storefront",
    title: "เบิกไปหน้าร้านหลายรอบ",
    location: "Sidebar > สต๊อก > หน้าร้าน",
    href: "/stock/storefront",
    cta: "ไปหน้าหน้าร้าน",
    body:
      "ที่เมนูหน้าร้าน พนักงานสามารถเบิกจากคลังร้านไปหน้าร้านได้หลายครั้งภายในวันเดียว ระบบจะบันทึกเป็นรายการ movement ทีละรอบ และรวมยอดคงเหลือให้โดยอัตโนมัติ",
  },
  {
    id: "comparison",
    title: "ดูหน้าเปรียบเทียบ",
    location: "Sidebar > สต๊อก > เปรียบเทียบ",
    href: "/stock/comparison",
    cta: "ไปหน้าเปรียบเทียบ",
    body:
      "หน้าเปรียบเทียบใช้ตรวจสอบต่อสินค้า ทั้งยอดยกมาคลัง รับเข้า เบิกไปหน้าร้าน คลังคงเหลือ หน้าร้านคงเหลือ ยอดขายรายวัน หน้าร้านควรเหลือ นับจริง และส่วนต่างล่าสุด",
  },
  {
    id: "closeout",
    title: "ปิดรอบขาย",
    location: "Sidebar > สต๊อก > ปิดรอบ",
    href: "/stock/closeout",
    cta: "ไปหน้าปิดรอบ",
    body:
      "เมื่อขายจบ ให้ไปที่หน้าปิดรอบ นับหน้าร้านจริง บันทึกยอดนับ แล้วคืนของกลับเข้าคลังร้าน หลังตรวจสอบครบแล้วจึงกดปิดรอบขาย",
  },
  {
    id: "products",
    title: "จัดการรูปสินค้า",
    location: "Sidebar > สินค้า",
    href: "/products",
    cta: "ไปหน้าจัดการสินค้า",
    body:
      "หน้า สินค้า ใช้สำหรับอัปโหลดรูปสินค้าใหม่ เปลี่ยนรูปเดิม และบันทึก URL ของรูปลง Google Sheet โดยตรง ระบบจะเก็บไฟล์ไว้ที่ Vercel Blob จึงเหมาะกับการ deploy บน Vercel โดยไม่ต้องมีฐานข้อมูลแยก",
  },
  {
    id: "cash",
    title: "นับเงินรายวัน",
    location: "Sidebar > นับเงิน",
    href: "/cash-count",
    cta: "ไปหน้านับเงิน",
    body:
      "หน้า นับเงิน ยังคงเป็นรายวัน กรอกเงินทอนตั้งต้น นับเงินจริง และกรอกยอดโอนแบบ manual-first ได้ โดยระบบจะแสดงยอดขายเงินสดและช่วยเสนอค่ายอดโอนจาก daily sales เป็นตัวช่วย",
  },
  {
    id: "summary",
    title: "สรุปยอดรายวัน",
    location: "Sidebar > สรุปยอด",
    href: "/summary",
    cta: "ไปหน้าสรุปยอด",
    body:
      "หน้า สรุปยอด ใช้ดูภาพรวมยอดขายของวันเดียว ทั้งยอดรวม เงินสด เงินโอน รายการสินค้า และรายการบิล เหมาะสำหรับตรวจสอบปิดวันด้านการเงิน",
  },
];

export default function DocsPage() {
  return (
    <AppShell title="คู่มือการใช้งาน" subtitle="QuickPOS Workflow">
      <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
        <aside className="rounded-[32px] border border-white/[0.06] bg-white/[0.03] p-5 shadow-xl shadow-black/20 xl:sticky xl:top-6 xl:h-fit">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
            สารบัญ
          </p>
          <nav className="mt-4 space-y-2">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block rounded-2xl border border-white/[0.05] bg-black/20 px-4 py-3.5 text-base font-bold text-slate-200 transition hover:border-white/[0.1] hover:text-white"
              >
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        <main className="space-y-5">
          <section className="rounded-[32px] border border-white/[0.06] bg-linear-to-br from-white/[0.04] via-white/[0.03] to-white/[0.01] p-6 shadow-2xl shadow-black/30">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
              User Guide
            </p>
            <h2 className="mt-3 text-3xl font-black text-white">วิธีใช้งาน QuickPOS</h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
              คู่มือนี้อธิบาย flow ใหม่ของระบบ โดยแต่ละหัวข้อจะบอกชัดว่าอยู่ตรงไหนในเมนูด้านซ้ายและมีปุ่มลัดให้กดเข้าใช้งานหน้าจริงได้ทันที
            </p>
          </section>

          {sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              className="rounded-[32px] border border-white/[0.06] bg-white/[0.03] p-6 shadow-xl shadow-black/20 scroll-mt-24"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-cyan-400 to-blue-500 text-base font-black text-black">
                      {index + 1}
                    </span>
                    <h3 className="text-xl font-black text-white">{section.title}</h3>
                  </div>
                  <div className="mt-4 inline-flex rounded-full border border-cyan-500/15 bg-cyan-500/10 px-3 py-2 text-sm font-black uppercase tracking-[0.12em] text-cyan-200">
                    {section.location}
                  </div>
                </div>
                <Link
                  href={section.href}
                  className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-linear-to-r from-cyan-500 to-blue-500 px-5 py-3.5 text-base font-black text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 active:scale-[0.98]"
                >
                  {section.cta}
                </Link>
              </div>
              <p className="mt-5 text-base leading-8 text-slate-300">{section.body}</p>
            </section>
          ))}
        </main>
      </div>
    </AppShell>
  );
}
