-- CreateTable
CREATE TABLE "DailyCode" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyCode_date_key" ON "DailyCode"("date");
