-- Growth action queue for autonomous growth operations (Day 2 scaffolding)
-- Keeps AI actions durable, retryable, and auditable.

CREATE TABLE IF NOT EXISTS growth_action_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'running', 'succeeded', 'failed', 'dead_letter', 'cancelled')
  ),
  priority INTEGER NOT NULL DEFAULT 100,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ NULL,
  locked_by TEXT NULL,
  last_error TEXT NULL,
  result JSONB NULL,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_growth_action_queue_idempotency_key
  ON growth_action_queue (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_growth_action_queue_ready
  ON growth_action_queue (status, run_after, priority, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_growth_action_queue_recent
  ON growth_action_queue (created_at DESC);

ALTER TABLE growth_action_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage growth action queue" ON growth_action_queue;
CREATE POLICY "Admins can manage growth action queue"
ON growth_action_queue
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM admins
    WHERE admins."user" = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Service role can manage growth action queue" ON growth_action_queue;
CREATE POLICY "Service role can manage growth action queue"
ON growth_action_queue
FOR ALL
USING (auth.role() = 'service_role');

COMMENT ON TABLE growth_action_queue IS
  'Retryable autonomous growth operation queue with idempotency and dead-letter handling.';

