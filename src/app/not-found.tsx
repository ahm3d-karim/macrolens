import Link from "next/link";
import { COUNTRIES } from "@/lib/countries";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 pb-24 pt-28 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#52B788]">
        Not found
      </p>
      <h1 className="mt-3 text-3xl font-bold text-[#E8E8ED]">
        No dossier here.
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-[#A0A0A8]">
        Macro Lens covers five countries. If you followed an old link, pick one
        of these.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {COUNTRIES.map((c) => (
          <Link
            key={c.slug}
            href={`/${c.slug}`}
            className="min-h-[44px] inline-flex items-center rounded-full border border-[#2A2A32] px-4 py-2 text-sm font-medium text-[#A0A0A8] transition-colors hover:border-[#3A3A44] hover:text-[#E8E8ED]"
          >
            <span className="mr-1.5">{c.flag}</span>
            {c.name}
          </Link>
        ))}
      </div>
    </div>
  );
}