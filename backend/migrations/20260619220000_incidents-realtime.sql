-- EvidenceLine dashboard: broadcast incident INSERT/UPDATE to Realtime channel
INSERT INTO realtime.channels (pattern, description, enabled)
VALUES ('evidenceline:incidents', 'EvidenceLine dashboard incident feed', true)
ON CONFLICT (pattern) DO UPDATE SET enabled = EXCLUDED.enabled;

CREATE OR REPLACE FUNCTION public.notify_incidents_realtime()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM realtime.publish(
    'evidenceline:incidents',
    TG_OP,
    jsonb_build_object(
      'new', to_jsonb(NEW),
      'old', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS incidents_realtime_trigger ON public.incidents;
CREATE TRIGGER incidents_realtime_trigger
  AFTER INSERT OR UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.notify_incidents_realtime();
