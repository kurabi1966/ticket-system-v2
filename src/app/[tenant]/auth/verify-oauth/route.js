import { getSupabaseCookiesUtilClient } from "@/supabase-utils/cookiesUtilClient";
import { buildUrl } from "@/utils/url-helpers";
import { NextResponse } from "next/server";
// import {getHostnameAndPort} from "./utils/url-helpers";
import { getSupabaseAdminClient } from "@/supabase-utils/adminClient";

export async function GET(request, { params }) {
    // This function will be called if the user sign-up via OAuth (Google) or sign-in via OAuth (Google)
    const url = new URL(request.url);

    const supabase = getSupabaseCookiesUtilClient();
    const { data: sessionData, error: sessionError } =
        await supabase.auth.exchangeCodeForSession(
            url.searchParams.get("code"),
        );

    if (sessionError) {
        return NextResponse.redirect(
            buildUrl("/error?type=login-failed", params.tenant, request),
        );
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const { tenant } = params;
    const { user } = sessionData;
    const { email } = user;
    const [,emailHost] = email.split("@");

    const {error: tenantMatchError} = supabaseAdmin
        .from("tenants")
        .select()
        .eq("id", tenant)
        .eq("domain", emailHost)
        .single();


    if(tenantMatchError) {
        await supabase.auth.signOut();
        return NextResponse.redirect(
            buildUrl(
                `/error?type=register_mail_mismatch&email=${email}`,
                params.tenant,
                request,
            ),
        );        
    }
    
    if(!user.app_metadata.tenants?.includes(tenant)) // new user
    {
        // insert the uer's app_metadata.tenants
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
            app_metadata: {
                tenants: [tenant, ...(user.app_metadata.tenants ?? [])],
            },
        });

        const { data: serviceUser } = await supabaseAdmin
            .from("service_users")
            .insert({
                full_name: user.user_metadata.full_name,
                supabase_user: user.id,
            })
            .select()
            .single();

        await supabaseAdmin.from("tenant_permissions").insert({
            tenant,
            service_user: serviceUser?.id,
        });
    }

    return NextResponse.redirect(
        buildUrl(
            `/tickets`,
            params.tenant,
            request,
        ),
    );    
    return NextResponse.json({ session: sessionData.session });
}

// https://www.linkedin.com/jobs/search/?f_TPR=r3600