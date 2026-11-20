import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@/lib/api";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  getUser, getWalletHistory, claimDailyBonus, topUpCoins,
  type WalletEntry
} from "@/lib/store";
import {
  Coins, Gift, PlusCircle, ArrowDownLeft, ArrowUpRight,
  Sparkles, CheckCircle2, ShieldCheck, Zap, History
} from "lucide-react";

export const Route = createFileRoute("/dashboard/wallet")({
  head: () => ({
    meta: [
      { title: "Coin Wallet — Brain Nest" },
      { name: "description", content: "Manage your Brain Nest coin balance, claim daily study bonuses, and view generation transactions." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const [user, setUser] = useState(() => getUser());
  const [history, setHistory] = useState<WalletEntry[]>(() => getWalletHistory());
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [topUpSuccess, setTopUpSuccess] = useState<string | null>(null);

  const refreshState = () => {
    setUser(getUser());
    setHistory(getWalletHistory());
  };

  const handleClaimDaily = async () => {
    try {
      const apiRes = await api.claimDailyBonus();
      if (apiRes.success && apiRes.data?.claimed) {
        setClaimMessage(apiRes.data.message || "Daily bonus of 50 coins added to your wallet!");
        if (typeof apiRes.data.newBalance === "number") {
          const u = getUser();
          u.coins = apiRes.data.newBalance;
          localStorage.setItem("bn_user", JSON.stringify(u));
        }
      } else {
        const res = claimDailyBonus();
        setClaimMessage(res.message);
      }
    } catch {
      const res = claimDailyBonus();
      setClaimMessage(res.message);
    }
    refreshState();
    setTimeout(() => setClaimMessage(null), 4000);
  };

  const handleTopUp = async (amount: number, packageName: string) => {
    topUpCoins(amount, packageName);
    api.topUpWallet(amount, packageName).catch(() => {});
    setTopUpSuccess(`Added ${amount} coins via ${packageName}!`);
    refreshState();
    setTimeout(() => setTopUpSuccess(null), 3000);
  };

  const packages = [
    { name: "Starter Bundle", coins: 250, price: "$2.99", bonus: "Standard", popular: false },
    { name: "Scholar Pack", coins: 750, price: "$6.99", bonus: "+100 Free Coins", popular: true },
    { name: "Mastery Vault", coins: 2000, price: "$14.99", bonus: "+400 Free Coins", popular: false },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-1">
            <Coins className="h-4 w-4" /> Study Economy & Balance
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Wallet & Coin Center</h1>
          <p className="mt-2 text-muted-foreground">
            Coins power AI note synthesis, quiz generation, and live tutor interactions.
          </p>
        </div>

        {/* Current Balance & Daily Bonus Banner */}
        <div className="grid gap-6 md:grid-cols-12 mb-8">
          <div className="md:col-span-6 panel p-8 flex flex-col justify-between bg-card/90">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Available Coin Balance
              </span>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="font-display text-5xl font-extrabold text-primary">
                  {user.coins}
                </span>
                <span className="text-muted-foreground text-sm font-medium">Study Coins</span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Sufficient for ~{Math.floor(user.coins / 15)} detailed notes or {Math.floor(user.coins / 10)} adaptive quizzes.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Coins never expire • Free daily recharges available</span>
            </div>
          </div>

          <div className="md:col-span-6 panel p-8 flex flex-col justify-between border-primary/40 bg-primary/5">
            <div>
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Gift className="h-5 w-5" /> Daily Study Reward
              </div>
              <h2 className="mt-2 text-xl font-bold">Claim +50 Free Daily Coins</h2>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Log in every day to claim your free reward and keep your study momentum going without spending anything.
              </p>
            </div>

            <div className="mt-6">
              {claimMessage && (
                <div className="mb-3 rounded-lg bg-card border border-primary/40 p-2.5 text-xs text-primary font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> {claimMessage}
                </div>
              )}

              <button
                onClick={handleClaimDaily}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 active:scale-95 cursor-pointer"
              >
                <Gift className="h-4 w-4" /> Claim Today's 50 Coins
              </button>
            </div>
          </div>
        </div>

        {/* Top-Up Coin Packages */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">Refill Coins</h2>
              <p className="text-xs text-muted-foreground">Choose a bundle for extra study resources (Instant Demo Recharges)</p>
            </div>
            {topUpSuccess && (
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                {topUpSuccess}
              </span>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {packages.map((pkg) => (
              <div
                key={pkg.name}
                className={`panel relative p-6 flex flex-col justify-between transition hover:-translate-y-1 ${
                  pkg.popular ? "border-primary shadow-glow bg-primary/5" : ""
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-primary px-3 py-0.5 text-[10px] font-bold text-primary-foreground shadow-glow">
                    MOST POPULAR
                  </span>
                )}

                <div>
                  <h3 className="font-bold text-base">{pkg.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="font-display text-3xl font-extrabold text-foreground">
                      {pkg.coins}
                    </span>
                    <span className="text-xs text-muted-foreground">Coins</span>
                  </div>
                  <span className="mt-1 inline-block text-xs font-semibold text-primary">
                    {pkg.bonus}
                  </span>
                </div>

                <div className="mt-6 pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold">{pkg.price}</span>
                    <span className="text-[11px] text-muted-foreground">One-time</span>
                  </div>
                  <button
                    onClick={() => handleTopUp(pkg.coins, pkg.name)}
                    className="w-full rounded-xl bg-card border border-primary/50 py-2.5 text-xs font-semibold text-foreground hover:bg-primary hover:text-primary-foreground transition shadow-sm"
                  >
                    + Add {pkg.coins} Coins
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction History Ledger */}
        <div className="panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <History className="h-4 w-4 text-primary" /> Coin Activity & Ledger
            </h2>
            <span className="text-xs text-muted-foreground">{history.length} transactions</span>
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No coin transactions recorded yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {history.map((entry) => {
                const isPositive = entry.coins > 0;
                return (
                  <div key={entry.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div
                        className={`grid h-8 w-8 place-items-center rounded-lg ${
                          isPositive ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isPositive ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{entry.action}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleString([], {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`font-mono font-bold text-sm ${
                        isPositive ? "text-emerald-400" : "text-muted-foreground"
                      }`}
                    >
                      {isPositive ? `+${entry.coins}` : entry.coins} Coins
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
