-- AlterTable: add group fields to Chat (name, avatar, adminId)
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "avatar" TEXT;
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "adminId" TEXT;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Chat_adminId_fkey'
  ) THEN
    ALTER TABLE "Chat" ADD CONSTRAINT "Chat_adminId_fkey"
      FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
