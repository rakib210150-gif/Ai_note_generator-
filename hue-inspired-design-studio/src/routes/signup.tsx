import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { setCurrentUser } from "@/lib/store";
import { api } from "@/lib/api";
import { BrainCircuit, Sparkles, AlertCircle, UserPlus, Globe, Phone, Mail, User, Lock, GraduationCap, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — Brain Nest" },
      { name: "description", content: "Create your free Brain Nest account and claim 500 starter study coins." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Sign up — Brain Nest" },
      { property: "og:description", content: "Join Brain Nest and start studying smarter." },
    ],
  }),
  component: SignupPage,
});

const POPULAR_COUNTRIES = [
  "Bangladesh",
  "India",
  "Pakistan",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "United Arab Emirates",
  "Saudi Arabia",
  "Malaysia",
  "Singapore",
  "Germany",
  "France",
  "Nepal",
  "Sri Lanka",
  "Other",
];

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [country, setCountry] = useState("Bangladesh");
  const [classLevel, setClassLevel] = useState("9-10");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Preserve redirect parameter if student came from a protected feature
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/dashboard";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please provide a valid Gmail or email address.");
      return;
    }
    if (!mobileNumber.trim() || mobileNumber.trim().length < 5) {
      setError("Please enter a valid mobile phone number.");
      return;
    }
    if (!country.trim()) {
      setError("Please select or enter your country.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.signup(
        email.trim(),
        password,
        name.trim(),
        mobileNumber.trim(),
        country.trim(),
        classLevel
      );

      if (res.success && res.data?.user) {
        const u = res.data.user;
        setCurrentUser({
          id: u.id,
          name: u.name || name.trim(),
          email: u.email,
          mobileNumber: mobileNumber.trim(),
          country: country.trim(),
          coins: u.coins ?? 500,
          classLevel: u.classLevel || u.class_level || classLevel,
          createdAt: u.createdAt || new Date().toISOString(),
        });

        // Redirect to originally requested feature or dashboard
        if (redirectTarget && redirectTarget.startsWith("/") && !redirectTarget.startsWith("//")) {
          window.location.href = redirectTarget;
        } else {
          navigate({ to: "/dashboard" });
        }
      } else {
        setError(res.message || "Failed to create account. Please try again.");
        setLoading(false);
      }
    } catch (err: any) {
      setError(
        err?.message || "Unable to register with Brain Nest. Please try again."
      );
      setLoading(false);
    }
  };

  return (
    <SiteLayout>
      <section className="mx-auto max-w-lg px-5 py-12">
        <div className="panel p-8 bg-card border border-border shadow-2xl rounded-2xl">
          <div className="flex justify-center mb-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-primary/40 bg-accent shadow-glow">
              <BrainCircuit className="h-6 w-6 text-primary" />
            </span>
          </div>

          <h1 className="text-2xl font-bold text-center">Create Student Account</h1>
          <p className="mt-1 text-center text-xs text-muted-foreground">
            Sign up once to unlock all 12 AI tools with{" "}
            <strong className="text-primary">+500 Free Starter Coins</strong>.
          </p>

          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary/10 border border-primary/25 px-3 py-1.5 text-xs text-primary font-medium">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>Registration automatically synchronized to verified student records</span>
          </div>

          {error && (
            <div className="mt-5 rounded-lg bg-destructive/15 border border-destructive/30 p-3 text-xs text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" /> Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rakib Ahmed"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none transition"
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-primary" /> Gmail / Email Address
              </label>
              <input
                type="email"
                required
                placeholder="you@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none transition"
              />
            </div>

            {/* Mobile Number & Country */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-primary" /> Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+880 1712-345678"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-primary" /> Country
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none transition"
                >
                  {POPULAR_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Academic Class Level */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-primary" /> Academic Level
              </label>
              <select
                value={classLevel}
                onChange={(e) => setClassLevel(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none transition"
              >
                <option value="9-10">Class 9-10 (SSC / NCTB Secondary)</option>
                <option value="11-12">Class 11-12 (HSC Higher Secondary)</option>
                <option value="university">University / Higher Studies</option>
              </select>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-primary" /> Password (min 6 characters)
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 px-4 font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition active:scale-[0.98] cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                "Creating your account..."
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Register & Claim 500 Coins
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border/70 text-center">
            <p className="text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                search={{ redirect: redirectTarget } as any}
                className="text-primary font-semibold hover:underline"
              >
                Log in here
              </Link>
            </p>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
