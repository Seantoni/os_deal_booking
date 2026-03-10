CREATE TABLE "task_stars" (
    "taskId" TEXT NOT NULL,
    "userClerkId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_stars_pkey" PRIMARY KEY ("taskId","userClerkId")
);

CREATE INDEX "task_stars_userClerkId_idx" ON "task_stars"("userClerkId");

ALTER TABLE "task_stars"
ADD CONSTRAINT "task_stars_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "tasks"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "task_stars"
ADD CONSTRAINT "task_stars_userClerkId_fkey"
FOREIGN KEY ("userClerkId") REFERENCES "UserProfile"("clerkId")
ON DELETE CASCADE
ON UPDATE CASCADE;
