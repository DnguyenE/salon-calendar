CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    duration_minutes SMALLINT NOT NULL,

    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- indexes
CREATE INDEX idx_services_organization_id ON services(organization_id);
CREATE INDEX idx_services_created_at ON services(created_at);

-- enforce uniqueness per org
ALTER TABLE services
ADD CONSTRAINT unique_service_per_org UNIQUE (organization_id, name);

-- updated_at trigger (reuse existing function)
CREATE TRIGGER services_updated_at
BEFORE UPDATE ON services
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "services_select"
ON services
FOR SELECT
USING (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1
    FROM public.admin_organizations ao
    WHERE ao.admin_id = auth.uid()
      AND ao.organization_id = services.organization_id
  )
);

-- INSERT
CREATE POLICY "services_insert"
ON services
FOR INSERT
WITH CHECK (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1
    FROM public.admin_organizations ao
    WHERE ao.admin_id = auth.uid()
      AND ao.organization_id = services.organization_id
  )
);

-- UPDATE
CREATE POLICY "services_update"
ON services
FOR UPDATE
USING (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1
    FROM public.admin_organizations ao
    WHERE ao.admin_id = auth.uid()
      AND ao.organization_id = services.organization_id
  )
)
WITH CHECK (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1
    FROM public.admin_organizations ao
    WHERE ao.admin_id = auth.uid()
      AND ao.organization_id = services.organization_id
  )
);

-- DELETE
CREATE POLICY "services_delete"
ON services
FOR DELETE
USING (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1
    FROM public.admin_organizations ao
    WHERE ao.admin_id = auth.uid()
      AND ao.organization_id = services.organization_id
  )
);