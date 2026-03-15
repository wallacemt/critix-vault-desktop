-- AlterTable
ALTER TABLE "movies" ADD COLUMN "budget" INTEGER;
ALTER TABLE "movies" ADD COLUMN "cast" TEXT;
ALTER TABLE "movies" ADD COLUMN "crew" TEXT;
ALTER TABLE "movies" ADD COLUMN "genres" TEXT;
ALTER TABLE "movies" ADD COLUMN "images" TEXT;
ALTER TABLE "movies" ADD COLUMN "imdbId" TEXT;
ALTER TABLE "movies" ADD COLUMN "popularity" REAL;
ALTER TABLE "movies" ADD COLUMN "revenue" INTEGER;
ALTER TABLE "movies" ADD COLUMN "tagline" TEXT;
ALTER TABLE "movies" ADD COLUMN "videos" TEXT;
ALTER TABLE "movies" ADD COLUMN "voteCount" INTEGER;

-- AlterTable
ALTER TABLE "series" ADD COLUMN "cast" TEXT;
ALTER TABLE "series" ADD COLUMN "crew" TEXT;
ALTER TABLE "series" ADD COLUMN "genres" TEXT;
ALTER TABLE "series" ADD COLUMN "images" TEXT;
ALTER TABLE "series" ADD COLUMN "imdbId" TEXT;
ALTER TABLE "series" ADD COLUMN "networks" TEXT;
ALTER TABLE "series" ADD COLUMN "popularity" REAL;
ALTER TABLE "series" ADD COLUMN "productionCompanies" TEXT;
ALTER TABLE "series" ADD COLUMN "tagline" TEXT;
ALTER TABLE "series" ADD COLUMN "videos" TEXT;
ALTER TABLE "series" ADD COLUMN "voteCount" INTEGER;
