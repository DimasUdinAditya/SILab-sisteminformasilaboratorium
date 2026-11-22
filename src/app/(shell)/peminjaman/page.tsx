"use client";

import { Link } from "@/lib/router-compat";
import { useSuspenseQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/app/page-header";
import { BorrowingList } from "@/components/labman/borrowing-list";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { FlaskConical, ShoppingBasket } from "lucide-react";
import { meQueryOptions } from "@/lib/profile";


export default function BorrowingsPage() {
  const { data: me } = useSuspenseQuery(meQueryOptions);
  const c = useCart();
  if (me?.role === "kalab") {
    return (
      <div>
        <PageHeader title="Peminjaman Alat & Bahan" description="Peminjaman alat dan bahan di laboratorium yang Anda pimpin." />
        <BorrowingList mode="manage" />
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <PageHeader
        title="Peminjaman Alat & Bahan"
        description="Pilih alat dan bahan dari halaman laboratorium, lalu pantau status peminjaman Anda di sini."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/laboratorium">
                <FlaskConical /> Pilih Alat & Bahan
              </Link>
            </Button>
            <Button asChild>
              <Link to="/peminjaman/ajukan">
                <ShoppingBasket /> Keranjang{c.items.length ? ` (${c.items.length})` : ""}
              </Link>
            </Button>
          </>
        }
      />
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Sedang berjalan</h2>
        <BorrowingList mode="mine" />
      </section>
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Riwayat</h2>
        <BorrowingList mode="history" />
      </section>
    </div>
  );
}
