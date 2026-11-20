import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";

export function ComingSoonAuth({ title }: { title: string }) {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-md px-5 py-24 text-center">
        <div className="panel p-10">
          <Lock className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-5 text-3xl font-bold">{title}</h1>
          <p className="mt-3 text-muted-foreground">Accounts are being set up and will open soon. New accounts will receive 500 starter coins after verifying their email.</p>
          <div className="mt-6 flex justify-center gap-4 text-sm">
            <Link to="/features" className="text-primary underline">Explore features</Link>
            <Link to="/contact" className="text-primary underline">Contact us</Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
