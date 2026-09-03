"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COUNTRIES } from "@/lib/countries";

export default function CountryToggle() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {COUNTRIES.map((c) => {
        const active = pathname === `/${c.slug}`;
        return (
          <Link
            key={c.slug}
            href={`/${c.slug}`}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
              active
                ? "border-transparent text-[#0A0A0B]"
                : "border-[#2A2A32] text-[#A0A0A8] hover:border-[#3A3A44] hover:text-[#E8E8ED]"
            }`}
            style={active ? { backgroundColor: c.color } : undefined}
          >
            <span className="mr-1.5">{c.flag}</span>
            {c.name}
          </Link>
        );
      })}
    </div>
  );
}