-- CreateTable
CREATE TABLE "cron_job_logs" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "message" TEXT,
    "details" JSONB,
    "error" TEXT,
    "triggeredBy" TEXT NOT NULL DEFAULT 'cron',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cron_job_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cron_job_logs_jobName_idx" ON "cron_job_logs"("jobName");

-- CreateIndex
CREATE INDEX "cron_job_logs_status_idx" ON "cron_job_logs"("status");

-- CreateIndex
CREATE INDEX "cron_job_logs_startedAt_idx" ON "cron_job_logs"("startedAt");

-- CreateIndex
CREATE INDEX "cron_job_logs_createdAt_idx" ON "cron_job_logs"("createdAt");
