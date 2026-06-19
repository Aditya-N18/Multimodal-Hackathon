CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  call_id text,
  caller_name text,
  caller_phone text,
  incident_type text,
  location text,
  occurred_at timestamptz,
  immediate_danger boolean DEFAULT false,
  other_party_info text,
  raw_transcript text,
  image_urls jsonb,
  injury_reported boolean,
  hazard_evidence jsonb,
  severity text,
  missing_evidence jsonb,
  responder_summary text,
  case_file_summary text,
  status text DEFAULT 'new',
  case_number text
);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidents TO anon, authenticated;
