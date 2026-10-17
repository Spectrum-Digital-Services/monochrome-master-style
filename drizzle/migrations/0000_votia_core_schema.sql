
CREATE TYPE public.app_role AS ENUM ('organiser');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  organisation text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, organisation)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.raw_user_meta_data->>'organisation');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'organiser');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.elections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  opens_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elections TO authenticated;
GRANT ALL ON public.elections TO service_role;
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage elections" ON public.elections FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  manifesto text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT ALL ON public.candidates TO service_role;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage candidates" ON public.candidates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.elections e WHERE e.id = election_id AND e.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.elections e WHERE e.id = election_id AND e.owner_id = auth.uid()));

CREATE TABLE public.election_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.election_documents TO authenticated;
GRANT ALL ON public.election_documents TO service_role;
ALTER TABLE public.election_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage documents" ON public.election_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.elections e WHERE e.id = election_id AND e.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.elections e WHERE e.id = election_id AND e.owner_id = auth.uid()));

CREATE TABLE public.decision_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  label text NOT NULL,
  weight numeric NOT NULL DEFAULT 1,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decision_criteria TO authenticated;
GRANT ALL ON public.decision_criteria TO service_role;
ALTER TABLE public.decision_criteria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage criteria" ON public.decision_criteria FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.elections e WHERE e.id = election_id AND e.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.elections e WHERE e.id = election_id AND e.owner_id = auth.uid()));

CREATE TABLE public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL DEFAULT '',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status text NOT NULL DEFAULT 'invited',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invites TO authenticated;
GRANT ALL ON public.invites TO service_role;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage invites" ON public.invites FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.elections e WHERE e.id = election_id AND e.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.elections e WHERE e.id = election_id AND e.owner_id = auth.uid()));

-- Ballots store no voter identity: only the election, the choices and a receipt hash.
CREATE TABLE public.ballots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  selections jsonb NOT NULL,
  receipt_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ballots TO authenticated;
GRANT ALL ON public.ballots TO service_role;
ALTER TABLE public.ballots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read ballots" ON public.ballots FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.elections e WHERE e.id = election_id AND e.owner_id = auth.uid()));
