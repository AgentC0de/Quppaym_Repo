-- Migration: Allow authenticated users full CRUD on all public tables
-- WARNING: This grants broad access to any authenticated user. Use only for testing.

DO $$
DECLARE
  t RECORD;
  policy_name TEXT;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    policy_name := t.tablename || '_allow_authenticated';

    -- Enable RLS so policies are applied
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t.tablename);

    -- Remove any existing policy with the same name
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', policy_name, t.tablename);

    -- Create a policy that allows any authenticated role full access
    EXECUTE format($sql$
      CREATE POLICY %I ON public.%I
      FOR ALL
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
    $sql$, policy_name, t.tablename);
  END LOOP;
END$$;

-- End of migration
