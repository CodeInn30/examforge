// Email sending is disabled. queueEmail is a no-op stub.

interface QueueEmailOptions {
  to: string;
  subject: string;
  html: string;
  recipientType: "admin" | "student";
  recipientId: string;
  notificationType: string;
  relatedExamId?: string;
}

export async function queueEmail(opts: QueueEmailOptions): Promise<void> {
  console.log(`[mailer] Email suppressed — to: ${opts.to}, subject: ${opts.subject}`);
}
