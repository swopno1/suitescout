import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import LoginForm from "@/components/LoginForm";
import { SESSION_COOKIE, verifySessionValue } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Log in",
};

/** Local paths only — never bounce to an external URL after login,
 *  and never back to /login itself (a logged-in self-bounce loops). */
function safeNext(raw: string | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/board";
  if (/^\/login([?#/]|$)/.test(raw)) return "/board";
  return raw;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const secret = process.env.APP_PASSWORD;
  const configured = Boolean(process.env.APP_USER && secret);
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (
    configured &&
    secret &&
    session &&
    (await verifySessionValue(secret, session))
  ) {
    redirect(next);
  }

  return (
    <div className="mx-auto max-w-sm py-10">
      <div className="card">
        <div className="mb-4 flex items-center gap-3">
          <Logo size={44} />
          <div className="leading-none">
            <p className="text-[22px] font-extrabold tracking-tight text-ink">
              ViveReply <span className="text-accent">Admin</span>
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">
              Operator console
            </p>
          </div>
        </div>
        <h1 className="mb-1 text-lg font-bold">Log in</h1>
        <p className="mb-4 text-sm text-stone-600">
          The operator console for the ViveReply business: sales
          pipeline, customers, invoices and health. Log in with the
          admin credentials from the server environment.
        </p>
        <LoginForm next={next} configured={configured} />
      </div>
      <p className="mt-3 text-center text-xs text-stone-500">
        Sessions last 12 hours on this device.
      </p>
    </div>
  );
}
