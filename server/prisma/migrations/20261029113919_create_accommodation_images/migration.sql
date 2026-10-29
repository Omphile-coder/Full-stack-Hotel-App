-- CreateTable
CREATE TABLE "accommodation_images" (
    "id" UUID NOT NULL,
    "accommodationId" UUID NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "accommodation_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accommodation_images_accommodationId_idx" ON "accommodation_images"("accommodationId");

-- AddForeignKey
ALTER TABLE "accommodation_images" ADD CONSTRAINT "accommodation_images_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES "accommodations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
