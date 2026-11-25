"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { Banknote, Landmark, Plus, Settings2, Smartphone, Wallet as WalletIcon } from "lucide-react";
import type { Wallet } from "@/lib/api/client";
import { useLanguage } from "@/context/language-context";
import { useAppActions } from "@/context/app-actions-context";
import { fmt, localizeWalletName } from "@/lib/i18n/translations";
import { formatPercent, toNumber } from "@/lib/format";
import { cn, hashString } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { Money } from "@/components/ui/money";
import { Button } from "@/components/ui/button";
import { CardHeader } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/feedback";

const GRADIENTS = [
  "from-[#5B21B6] via-[#6D28D9] to-[#1E1B4B]",
  "from-[#0E7490] via-[#155E75] to-[#1E3A8A]",
  "from-[#047857] via-[#065F46] to-[#0B2530]",
  "from-[#1D4ED8] via-[#1E40AF] to-[#172554]",
  "from-[#334155] via-[#1E293B] to-[#0B1220]",
  "from-[#3730A3] via-[#312E81] to-[#0C4A6E]",
];

function walletIcon(name: string) {
  const n = name.toLowerCase();
  if (/(gopay|ovo|dana|shopee|linkaja|e-?wallet|jenius)/.test(n)) return Smartphone;
  if (/(cash|tunai)/.test(n)) return Banknote;
  if (/(bank|bca|bni|bri|mandiri|tabungan|savings|rekening)/.test(n)) return Landmark;
  return WalletIcon;
}

/** Signature moment #2: holographic pocket cards that tilt toward the cursor. */
function PocketCard({ wallet, share, index = 0 }: { wallet: Wallet; share: number; index?: number }) {
  const { t, language } = useLanguage();
  const reduce = useReducedMotion();
  const gradient = GRADIENTS[hashString(wallet.id) % GRADIENTS.length];
  const Icon = walletIcon(wallet.name);
  const name = localizeWalletName(wallet.name, language);

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [6, -6]), spring.tilt);
  const rotateY = useSpring(useTransform(px, [0, 1], [-8, 8]), spring.tilt);
  const glareX = useTransform(px, (v) => `${v * 100}%`);
  const glareY = useTransform(py, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(240px circle at ${glareX} ${glareY}, rgba(255,255,255,0.28), transparent 60%)`;

  const onMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <motion.div style={{ perspective: 900 }} className="h-full">
      <motion.div style={reduce ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }} className="h-full">
        <Link
          href={`/transactions?walletId=${encodeURIComponent(wallet.id)}`}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          className={cn(
            "group relative flex h-44 flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white shadow-elev-2 ring-1 ring-inset ring-white/10 transition-shadow duration-slow hover:shadow-elev-3",
            gradient
          )}
        >
          <motion.span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-slow group-hover:opacity-100" style={{ background: glare }} />
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-white/10 blur-2xl" />
          <span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(115deg,#fff_0_1px,transparent_1px_14px)]" />

          <div className="relative flex items-center justify-between">
            <span className="flex min-w-0 items-center gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/15 backdrop-blur-sm">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="truncate text-sm font-semibold">{name}</span>
            </span>
            <span
              aria-hidden
              className="h-6 w-8 shrink-0 rounded-[5px] border border-amber-900/40 bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 shadow-inner"
            />
          </div>

          <div className="relative">
            <Money value={wallet.balance} className="text-2xl font-bold tracking-tight" />
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20" aria-hidden>
                <div
                  className="motion-bar h-full rounded-full bg-white/80"
                  style={{ width: `${Math.max(2, Math.min(100, share))}%`, "--d": `${700 + index * 110}ms` } as React.CSSProperties}
                />
              </div>
              <span className="tabular whitespace-nowrap text-xs font-medium text-white/80">
                {fmt(t.overview.pockets.shareOfTotal, { pct: formatPercent(share, language) })}
              </span>
            </div>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}

export function PocketsSection({ wallets, loading }: { wallets?: Wallet[]; loading?: boolean }) {
  const { t } = useLanguage();
  const { openWallets } = useAppActions();
  const total = (wallets ?? []).reduce((s, w) => s + Math.max(0, toNumber(w.balance)), 0);

  return (
    <section aria-labelledby="pockets-heading" className="space-y-4">
      <CardHeader
        id="pockets-heading"
        title={t.overview.pockets.title}
        description={t.overview.pockets.subtitle}
        action={
          <Button variant="outline" size="sm" onClick={openWallets}>
            <Settings2 aria-hidden />
            {t.overview.pockets.manage}
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-3xl" />
          ))}
        </div>
      ) : !wallets?.length ? (
        <EmptyState
          icon={<WalletIcon />}
          title={t.overview.pockets.empty}
          action={
            <Button size="sm" onClick={openWallets}>
              <Plus aria-hidden />
              {t.overview.pockets.add}
            </Button>
          }
        />
      ) : (
        <ul
          className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4"
        >
          {/* Cards are "dealt" onto the table one after another */}
          {wallets.map((w, i) => (
            <li
              key={w.id}
              className="motion-deal w-[82%] shrink-0 snap-start min-[480px]:w-[62%] sm:w-auto"
              style={{ "--d": `${250 + i * 110}ms` } as React.CSSProperties}
            >
              <PocketCard index={i} wallet={w} share={total > 0 ? (Math.max(0, toNumber(w.balance)) / total) * 100 : 0} />
            </li>
          ))}
          <li
            className="motion-deal w-[82%] shrink-0 snap-start min-[480px]:w-[62%] sm:w-auto"
            style={{ "--d": `${250 + wallets.length * 110}ms` } as React.CSSProperties}
          >
            <button
              type="button"
              onClick={openWallets}
              className="group flex h-44 w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-line-strong/80 text-center transition hover:border-brand/50 hover:bg-brand/[0.04]"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-brand/10 text-brand-fg transition-transform duration-slow ease-emphasized group-hover:scale-110 group-hover:rotate-90">
                <Plus className="size-5" aria-hidden />
              </span>
              <span className="text-sm font-semibold text-fg">{t.overview.pockets.add}</span>
              <span className="px-6 text-xs text-fg-subtle">{t.overview.pockets.addDesc}</span>
            </button>
          </li>
        </ul>
      )}
    </section>
  );
}
