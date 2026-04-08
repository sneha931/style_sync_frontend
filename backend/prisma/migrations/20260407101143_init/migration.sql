-- CreateTable
CREATE TABLE "scraped_sites" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,

    CONSTRAINT "scraped_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_tokens" (
    "id" TEXT NOT NULL,
    "colors" JSONB NOT NULL,
    "typography" JSONB NOT NULL,
    "spacing" JSONB NOT NULL,

    CONSTRAINT "design_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locked_tokens" (
    "id" TEXT NOT NULL,
    "token_name" TEXT NOT NULL,
    "is_locked" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "locked_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "version_history" (
    "id" TEXT NOT NULL,
    "before_state" JSONB NOT NULL,
    "after_state" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "version_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "locked_tokens_token_name_key" ON "locked_tokens"("token_name");
