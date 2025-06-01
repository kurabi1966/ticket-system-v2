import { NextResponse } from "next/server";
import { getSupabaseReqResClient } from "./supabase-utils/reqResClient";
import { TENANT_MAP } from "./tenant-map";
import { buildUrl, getHostnameAndPort } from "./utils/url-helpers";

export async function middleware(req) {
  console.log('middleware: ', req.url)
  const { supabase } = getSupabaseReqResClient({ request: req });
  // const session = await supabase.auth.getSession();
  const { data: { user }, error } = await supabase.auth.getUser();

  const [hostname] = getHostnameAndPort(req);

  if (hostname in TENANT_MAP === false) {
    return NextResponse.rewrite(new URL("/not-found", req.url));
  }

  const requestedPath = req.nextUrl.pathname;
  // const sessionUser = session.data?.session?.user;

  const tenant = TENANT_MAP[hostname];
  const applicationPath = requestedPath;

  if (!/[a-z0-9-_]+/.test(tenant)) {
    return NextResponse.rewrite(new URL("/not-found", req.url));
  }

  if (applicationPath.startsWith("/tickets")) {
    if (!user) {
      return NextResponse.redirect(buildUrl("/", tenant, req));
    } else if (!user.app_metadata.tenants?.includes(tenant)) {
      return NextResponse.rewrite(new URL("/not-found", req.url));
    }
  } else if (applicationPath === "/") {
    if (user) {
      return NextResponse.redirect(buildUrl("/tickets", tenant, req));
    }
  }

  return NextResponse.rewrite(
    new URL(`/${tenant}${applicationPath}${req.nextUrl.search}`, req.url)
  );
}

export const config = {
  matcher: ['/((?!_next|images|favicon.ico|api|\\.well-known).*)'],
};
