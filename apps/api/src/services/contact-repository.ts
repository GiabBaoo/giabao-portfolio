import type { ContactSubmission } from "@giabao-portfolio/shared";

const HEALTH_CHECK_SQL = "SELECT 1 AS ok";

const INSERT_CONTACT_MESSAGE_SQL = `
  INSERT INTO contact_messages (
    name,
    email,
    subject,
    message,
    locale,
    ip_hash,
    user_agent
  )
  VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
`;

export interface ContactRecordMetadata {
  ipHash: string | null;
  userAgent: string | null;
}

export async function checkDatabaseHealth(db: D1Database): Promise<void> {
  const row = await db.prepare(HEALTH_CHECK_SQL).first<{ ok: number }>();

  if (!row || row.ok !== 1) {
    throw new Error("Database health check returned unexpected result");
  }
}

export async function insertContactMessage(
  db: D1Database,
  submission: ContactSubmission,
  metadata: ContactRecordMetadata = { ipHash: null, userAgent: null },
): Promise<void> {
  const result = await db
    .prepare(INSERT_CONTACT_MESSAGE_SQL)
    .bind(
      submission.name,
      submission.email,
      submission.subject ?? null,
      submission.message,
      submission.locale,
      metadata.ipHash,
      metadata.userAgent,
    )
    .run();

  if (!result.success) {
    throw new Error("Database insert returned unsuccessful result");
  }
}
