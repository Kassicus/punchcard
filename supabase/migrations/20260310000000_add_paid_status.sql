-- Add paid status tracking to time entries
ALTER TABLE public.time_entries
  ADD COLUMN is_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN paid_at timestamptz,
  ADD COLUMN paid_by uuid REFERENCES public.profiles(id);

CREATE INDEX idx_time_entries_is_paid ON public.time_entries(is_paid);
