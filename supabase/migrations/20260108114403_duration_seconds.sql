-- Change duration from minutes to seconds for more granular time tracking

-- Drop the existing computed column
ALTER TABLE public.time_entries DROP COLUMN duration_minutes;

-- Add new column storing seconds
ALTER TABLE public.time_entries
ADD COLUMN duration_seconds integer NOT NULL GENERATED ALWAYS AS (
  EXTRACT(EPOCH FROM (end_time - start_time))::integer
) STORED;
