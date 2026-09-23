-- CreateTable
CREATE TABLE "JobCardImage" (
    "id" TEXT NOT NULL,
    "jobCardId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobCardImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "JobCardImage" ADD CONSTRAINT "JobCardImage_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

