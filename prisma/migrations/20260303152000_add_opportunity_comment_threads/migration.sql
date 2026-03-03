-- CreateEnum
CREATE TYPE "CommentThreadStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "opportunity_comment_threads" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "CommentThreadStatus" NOT NULL DEFAULT 'OPEN',
    "createdBy" TEXT NOT NULL,
    "resolutionNote" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunity_comment_threads_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "opportunity_comments"
ADD COLUMN "threadId" TEXT;

-- CreateIndex
CREATE INDEX "opportunity_comment_threads_opportunityId_status_createdAt_idx"
ON "opportunity_comment_threads"("opportunityId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "opportunity_comment_threads_status_idx"
ON "opportunity_comment_threads"("status");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_comment_threads_one_open_idx"
ON "opportunity_comment_threads"("opportunityId")
WHERE "status" = 'OPEN';

-- CreateIndex
CREATE INDEX "opportunity_comments_threadId_createdAt_idx"
ON "opportunity_comments"("threadId", "createdAt");

-- AddForeignKey
ALTER TABLE "opportunity_comment_threads"
ADD CONSTRAINT "opportunity_comment_threads_opportunityId_fkey"
FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_comments"
ADD CONSTRAINT "opportunity_comments_threadId_fkey"
FOREIGN KEY ("threadId") REFERENCES "opportunity_comment_threads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
