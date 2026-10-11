-- Base migration for Class 3 AI Tutor (NeonDB / PostgreSQL + pgvector)
-- Run with DIRECT_URL (Neon direct host). Runtime uses pooled DATABASE_URL.
-- WARNING: changing EMBEDDING_DIMENSION later requires a new vector column
-- or full re-embedding — never mix incompatible dimensions (spec §8.7).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- NOTE: Prisma Migrate creates tables from schema.prisma. This file adds the
-- Postgres-native objects Prisma cannot express: vector + tsvector columns,
-- HNSW/IVFFLAT indexes, full-text triggers, and TTL cleanup helpers.

-- document_chunks vector similarity (cosine). Dimension MUST match
-- EMBEDDING_DIMENSION (default 1536). If you change the embedding model,
-- create a NEW migration with a new column/index + re-embed job.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'document_chunks_embedding_idx') THEN
    CREATE INDEX document_chunks_embedding_idx
      ON "document_chunks"
      USING hnsw ("embedding" vector_cosine_ops);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'document_chunks_search_idx') THEN
    CREATE INDEX document_chunks_search_idx
      ON "document_chunks"
      USING GIN ("searchTsv");
  END IF;
END
$$;

-- Keep searchTsv in sync with content (English + simple config; Bengali
-- content still benefits from trigram + vector recall in hybrid retrieval).
CREATE OR REPLACE FUNCTION document_chunks_tsv_trigger() RETURNS trigger AS $$
BEGIN
  NEW."searchTsv" := to_tsvector('english', coalesce(NEW.content, ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_document_chunks_tsv ON "document_chunks";
CREATE TRIGGER trg_document_chunks_tsv
  BEFORE INSERT OR UPDATE OF content ON "document_chunks"
  FOR EACH ROW EXECUTE FUNCTION document_chunks_tsv_trigger();

-- Trigram index for Banglish / fuzzy keyword recall.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'document_chunks_content_trgm_idx') THEN
    CREATE INDEX document_chunks_content_trgm_idx
      ON "document_chunks"
      USING gin (content gin_trgm_ops);
  END IF;
END
$$;

-- TTL cleanup helper (called by scripts/cleanup-temp.ts on a schedule).
CREATE OR REPLACE FUNCTION cleanup_expired_rows() RETURNS void AS $$
BEGIN
  DELETE FROM "guest_sessions" WHERE "expiresAt" < now();
  DELETE FROM "conversations"
    WHERE "expiresAt" IS NOT NULL AND "expiresAt" < now();
  UPDATE "uploads" SET "status" = 'EXPIRED'
    WHERE "status" IN ('PENDING', 'READY')
      AND "expiresAt" IS NOT NULL AND "expiresAt" < now();
END;
$$ LANGUAGE plpgsql;
