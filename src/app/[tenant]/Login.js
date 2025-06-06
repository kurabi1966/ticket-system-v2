"use client";
import { getSupabaseBrowserClient } from "@/supabase-utils/browserClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { FORM_TYPES } from "./formTypes";
import { urlPath } from "@/utils/url-helpers";

export const Login = ({ formType = "pw-login", tenant, tenantName, tenantDomain }) => {
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();

  const isPasswordRecovery = formType === FORM_TYPES.PASSWORD_RECOVERY;
  const isPasswordLogin = formType === FORM_TYPES.PASSWORD_LOGIN;
  const isMagicLinkLogin = formType === FORM_TYPES.MAGIC_LINK;

  const getPath = (subPath) => urlPath(subPath ?? "", tenant);

  const formAction = getPath(
    isPasswordLogin ? `/auth/pw-login` : `/auth/magic-link`,
  );
  const loginBasePath = getPath("/");

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        if (session.user.app_metadata?.tenants.includes(tenant)) {
          router.push(getPath("/tickets"));
        } else {
          supabase.auth.signOut();
          alert("Could not sign in, tenant does not match.");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <form
      method="POST"
      action={formAction}
      onSubmit={(event) => {
        isPasswordLogin && event.preventDefault();

        if (isPasswordLogin) {
          supabase.auth
            .signInWithPassword({
              email: emailInputRef.current.value,
              password: passwordInputRef.current.value,
            })
            .then((result) => {
              !result.data?.user && alert("Could not sign in");
            });
        }
      }}
    >
      {isPasswordRecovery && (
        <input type="hidden" name="type" value="recovery" />
      )}

      <article style={{ maxWidth: "480px", margin: "auto" }}>
        <header>
          {isPasswordRecovery && <strong>Request new password</strong>}
          {!isPasswordRecovery && <strong>Login</strong>}
          <div style={{ display: "block", fontSize: "0.7em" }}>
            {tenantName}
          </div>
        </header>

        <fieldset>
          <label htmlFor="email">
            Email{" "}
            <input
              ref={emailInputRef}
              type="email"
              id="email"
              name="email"
              required
            />
          </label>

          {isPasswordLogin && (
            <label htmlFor="password" style={{ marginTop: "20px" }}>
              Password{" "}
              <input
                ref={passwordInputRef}
                type="password"
                id="password"
                name="password"
              />
            </label>
          )}
        </fieldset>

        <button type="submit">
          {isPasswordLogin && "Sign in with Password"}
          {isPasswordRecovery && "Request new password"}
          {isMagicLinkLogin && "Sign in with Magic Link"}
        </button>

<button
  type="button"
  onClick={() => {

supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: window.location.origin + "/auth/verify-oauth",
    queryParams: {
     access_type: "offline",
     prompt: "consent",
     hd: tenantDomain,
    },
  },
});    

  }}
>
  Sign in with Google
</button>


        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexDirection: "column",
            gap: "6px",
            marginBottom: "20px",
          }}
        >
          {isPasswordRecovery && (
            <div style={{ marginTop: "0.6em" }}>
              <small>Want to sign in instead?</small>
            </div>
          )}
          {!isPasswordLogin && (
            <Link
              role="button"
              className="contrast"
              href={{
                pathname: loginBasePath,
                query: { magicLink: "no" },
              }}
            >
              Go to Password Login
            </Link>
          )}
          {!isMagicLinkLogin && (
            <Link
              role="button"
              className="contrast"
              href={{
                pathname: loginBasePath,
                query: { magicLink: "yes" },
              }}
            >
              Go to Magic Link Login
            </Link>
          )}
        </div>

        {!isPasswordRecovery && (
          <Link
            href={{
              pathname: loginBasePath,
              query: { passwordRecovery: "yes" },
            }}
            style={{
              textAlign: "center",
              display: "block",
            }}
          >
            Go to Password Recovery
          </Link>
        )}

<Link
  href={urlPath("/register", tenant)}
  style={{
    textAlign: "center",
    display: "block",
    marginTop: "1em",
  }}
>
  Create account
</Link>

      </article>
    </form>
  );
};
