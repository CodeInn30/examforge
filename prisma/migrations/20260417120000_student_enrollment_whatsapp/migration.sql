-- AlterTable
ALTER TABLE "students" ADD COLUMN "mobile_number" VARCHAR(20);
ALTER TABLE "students" ADD COLUMN "whatsapp_number" VARCHAR(20);

-- AlterTable
ALTER TABLE "exam_sessions" ADD COLUMN "result_share_token" TEXT;

-- CreateTable
CREATE TABLE "exam_enrollments" (
    "id" TEXT NOT NULL,
    "exam_form_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "mobile_number" VARCHAR(20) NOT NULL,
    "whatsapp_number" VARCHAR(20) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "exam_info_whatsapp_sent_at" TIMESTAMP(3),
    "exam_result_whatsapp_sent_at" TIMESTAMP(3),
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_notifications" (
    "id" TEXT NOT NULL,
    "recipient_type" "NotificationRecipientType" NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "recipient_phone" VARCHAR(20) NOT NULL,
    "notification_type" VARCHAR(50) NOT NULL,
    "message_body" TEXT NOT NULL,
    "media_url" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "provider_message_id" TEXT,
    "sent_at" TIMESTAMP(3),
    "failed_reason" TEXT,
    "related_exam_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "students_mobile_number_idx" ON "students"("mobile_number");

-- CreateIndex
CREATE INDEX "students_whatsapp_number_idx" ON "students"("whatsapp_number");

-- CreateIndex
CREATE UNIQUE INDEX "exam_sessions_result_share_token_key" ON "exam_sessions"("result_share_token");

-- CreateIndex
CREATE UNIQUE INDEX "exam_enrollments_exam_form_id_student_id_key" ON "exam_enrollments"("exam_form_id", "student_id");

-- CreateIndex
CREATE INDEX "exam_enrollments_exam_form_id_idx" ON "exam_enrollments"("exam_form_id");

-- CreateIndex
CREATE INDEX "exam_enrollments_student_id_idx" ON "exam_enrollments"("student_id");

-- CreateIndex
CREATE INDEX "exam_enrollments_whatsapp_number_idx" ON "exam_enrollments"("whatsapp_number");

-- CreateIndex
CREATE INDEX "whatsapp_notifications_recipient_type_recipient_id_idx" ON "whatsapp_notifications"("recipient_type", "recipient_id");

-- CreateIndex
CREATE INDEX "whatsapp_notifications_recipient_phone_idx" ON "whatsapp_notifications"("recipient_phone");

-- CreateIndex
CREATE INDEX "whatsapp_notifications_status_idx" ON "whatsapp_notifications"("status");

-- CreateIndex
CREATE INDEX "whatsapp_notifications_related_exam_id_idx" ON "whatsapp_notifications"("related_exam_id");

-- AddForeignKey
ALTER TABLE "exam_enrollments" ADD CONSTRAINT "exam_enrollments_exam_form_id_fkey" FOREIGN KEY ("exam_form_id") REFERENCES "exam_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_enrollments" ADD CONSTRAINT "exam_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_notifications" ADD CONSTRAINT "whatsapp_notifications_related_exam_id_fkey" FOREIGN KEY ("related_exam_id") REFERENCES "exam_forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
