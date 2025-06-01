import { getHostnameAndPort } from "@/utils/url-helpers";
import { buildUrl } from "@/utils/url-helpers";
import {sendOTPLink} from '@/utils/sendOTPLink';
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/supabase-utils/adminClient";

export async function POST(request, { params }) {
    const [tenantHost] = getHostnameAndPort(request);
    const formData = await request.formData();
    const email = formData.get("email");
    const [_,user_email_domain] = email.split('@');
    const name = formData.get("name");    
    const password = formData.get("password");
    const tenant = params.tenant;

    const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/; //simple front@back regex
    // const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/; //simple front@back regex

    if (!isNonEmptyString(name) || !isNonEmptyString(email) || !emailRegex.test(email) || !isNonEmptyString(password)) {
        console.log('Invalid signup fields')
        return NextResponse.redirect(
            buildUrl("/error?type=invalid_signup_fields", tenant, request),
            302
        );
    }

    const safeEmailString = encodeURIComponent(email);

    if(user_email_domain !== tenantHost){
        return NextResponse.redirect(
            buildUrl(
            `/error?type=register_mail_mismatch&email=${safeEmailString}`,tenant,request),
            302,
        );        
    } else {
        const supabaseAdmin = getSupabaseAdminClient();
        const { data: userData, error: userError } =
            await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                app_metadata: {
                    tenants: [tenant],
                },
        });
        if(userError){
            const userExists = userError.message.includes("already been registered");
            if(userExists){
                return NextResponse.redirect(
                    buildUrl(
                    `/error?type=register_mail_exists&email=${safeEmailString}`,tenant,request),
                    302,
                );
            } else {
                return NextResponse.redirect(
                    buildUrl("/error?type=register_unknown", tenant, request),
                    302,
                ); 
            }
        } else {
            const {data: serviceUser } = await supabaseAdmin
                .from("service_users")
                .insert({full_name: name, supabase_user: userData.user.id})
                .select()
                .single()
            
            const {error: tpError} = await supabaseAdmin
                .from("tenant_permissions")
                .insert({service_user: serviceUser?.id, tenant})

            if (tpError) {
                await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
                return NextResponse.redirect(
                    buildUrl("/error", tenant, request), 302
                );
            }

            await sendOTPLink(email, "signup", params.tenant, request);

            return NextResponse.redirect(
                buildUrl(
                    `/registration-success?email=${safeEmailString}`,
                    tenant,
                    request
                ),
                302
            );
        }
    }
}

