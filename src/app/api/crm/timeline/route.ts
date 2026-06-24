import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { authenticateRequest, authFailResponse } from "@/lib/auth";
import { getDb } from "@/storage/database/sqlite-client";
import { crm_contact_logs, crm_contacts } from "@/storage/database/shared/schema";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return authFailResponse();

  const contactId = request.nextUrl.searchParams.get("contact_id");
  const db = getDb();
  const data = await db
    .select({ id: crm_contact_logs.id, contact_id: crm_contact_logs.contact_id, content: crm_contact_logs.content, log_date: crm_contact_logs.log_date, contact_name: crm_contacts.name })
    .from(crm_contact_logs)
    .leftJoin(crm_contacts, eq(crm_contact_logs.contact_id, crm_contacts.id))
    .where(contactId ? eq(crm_contact_logs.contact_id, parseInt(contactId, 10)) : undefined)
    .orderBy(desc(crm_contact_logs.log_date));
  return NextResponse.json({ success: true, data });
}
