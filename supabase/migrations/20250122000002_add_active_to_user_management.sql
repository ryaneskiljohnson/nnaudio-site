-- Add active column to user_management table
ALTER TABLE public.user_management
ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

-- Add comment
COMMENT ON COLUMN public.user_management.active IS 'Whether the user account is active (inactive users are disabled)';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_user_management_active ON public.user_management(active);

