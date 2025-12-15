-- ============================================================================
-- Combined Migrations from cymasphere-website
-- Total migrations: 57
-- Generated: 2025-12-14T23:18:10.903Z
-- ============================================================================

-- Disable foreign key checks temporarily
SET session_replication_role = 'replica';


-- ============================================================================
-- Migration: 20240320000000_create_customers_table.sql
-- ============================================================================

create table if not exists public.customers (
  id uuid default gen_random_uuid() primary key,
  stripe_customer_id text not null unique,
  email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.customers enable row level security;

-- Create policies
create policy "Customers are viewable by authenticated users" on public.customers
  for select using (auth.role() = 'authenticated');

create policy "Customers are insertable by service role" on public.customers
  for insert with check (auth.role() = 'service_role');

create policy "Customers are updatable by service role" on public.customers
  for update using (auth.role() = 'service_role');

-- Create updated_at trigger using a simple function
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger handle_updated_at before update on public.customers
  for each row execute procedure update_updated_at_column(); 


-- ============================================================================
-- Migration: 20241201000000_add_admin_subscription_type.sql
-- ============================================================================

-- Create subscription_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.subscription_type AS ENUM ('none', 'monthly', 'annual', 'lifetime');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add 'admin' to the subscription_type enum
-- This allows users to have admin privileges in the application

-- First, let's add the new enum value
ALTER TYPE public.subscription_type ADD VALUE IF NOT EXISTS 'admin';
 
-- The enum should now support: 'none', 'monthly', 'annual', 'lifetime', 'admin'
-- No need to modify the profiles table as it already uses this enum type 


-- ============================================================================
-- Migration: 20241220000000_create_support_tickets_system.sql
-- ============================================================================

-- Create support ticket system tables
-- This migration creates the complete support ticket infrastructure

-- Create enums for ticket status and priority
CREATE TYPE public.ticket_status AS ENUM (
  'open',
  'in_progress', 
  'resolved',
  'closed'
);

CREATE TYPE public.ticket_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

CREATE TYPE public.message_type AS ENUM (
  'text',
  'system'
);

CREATE TYPE public.attachment_type AS ENUM (
  'image',
  'video',
  'document',
  'audio',
  'other'
);

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number text NOT NULL UNIQUE, -- Human readable ticket ID like "T-001"
  subject text NOT NULL,
  description text,
  status public.ticket_status DEFAULT 'open' NOT NULL,
  priority public.ticket_priority DEFAULT 'medium' NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- Admin user assigned to ticket
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  resolved_at timestamp with time zone,
  closed_at timestamp with time zone
);

-- Create support_messages table
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type public.message_type DEFAULT 'text' NOT NULL,
  is_admin boolean DEFAULT false NOT NULL, -- True if message is from admin/support
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  edited_at timestamp with time zone
);

-- Create support_attachments table
CREATE TABLE IF NOT EXISTS public.support_attachments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.support_messages(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_size bigint NOT NULL, -- Size in bytes
  file_type text NOT NULL, -- MIME type
  attachment_type public.attachment_type NOT NULL,
  storage_path text NOT NULL, -- Path in Supabase storage
  url text, -- Public URL if applicable
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX idx_support_tickets_created_at ON public.support_tickets(created_at);
CREATE INDEX idx_support_tickets_ticket_number ON public.support_tickets(ticket_number);

CREATE INDEX idx_support_messages_ticket_id ON public.support_messages(ticket_id);
CREATE INDEX idx_support_messages_user_id ON public.support_messages(user_id);
CREATE INDEX idx_support_messages_created_at ON public.support_messages(created_at);

CREATE INDEX idx_support_attachments_message_id ON public.support_attachments(message_id);

-- Enable RLS on all tables
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for support_tickets
-- Users can view their own tickets
CREATE POLICY "Users can view their own tickets" ON public.support_tickets
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND subscription = 'admin'
    )
  );

-- Users can create their own tickets
CREATE POLICY "Users can create their own tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own tickets (limited fields)
CREATE POLICY "Users can update their own tickets" ON public.support_tickets
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can update any ticket
CREATE POLICY "Admins can update any ticket" ON public.support_tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND subscription = 'admin'
    )
  );

-- Admins can delete tickets
CREATE POLICY "Admins can delete tickets" ON public.support_tickets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND subscription = 'admin'
    )
  );

-- Create RLS policies for support_messages
-- Users can view messages for their own tickets or if they're admin
CREATE POLICY "Users can view messages for their tickets" ON public.support_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets 
      WHERE id = ticket_id AND (
        user_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND subscription = 'admin'
        )
      )
    )
  );

-- Users can create messages for their own tickets or if they're admin
CREATE POLICY "Users can create messages for their tickets" ON public.support_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
      EXISTS (
        SELECT 1 FROM public.support_tickets 
        WHERE id = ticket_id AND user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND subscription = 'admin'
      )
    )
  );

-- Users can update their own messages (within time limit)
CREATE POLICY "Users can update their own messages" ON public.support_messages
  FOR UPDATE USING (
    auth.uid() = user_id AND 
    created_at > (now() - interval '15 minutes')
  );

-- Admins can update any message
CREATE POLICY "Admins can update any message" ON public.support_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND subscription = 'admin'
    )
  );

-- Create RLS policies for support_attachments
-- Users can view attachments for messages they can see
CREATE POLICY "Users can view attachments for accessible messages" ON public.support_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_messages sm
      JOIN public.support_tickets st ON sm.ticket_id = st.id
      WHERE sm.id = message_id AND (
        st.user_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND subscription = 'admin'
        )
      )
    )
  );

-- Users can create attachments for their own messages
CREATE POLICY "Users can create attachments for their messages" ON public.support_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_messages sm
      JOIN public.support_tickets st ON sm.ticket_id = st.id
      WHERE sm.id = message_id AND sm.user_id = auth.uid() AND (
        st.user_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND subscription = 'admin'
        )
      )
    )
  );

-- Create function to generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS text AS $$
DECLARE
  next_number integer;
  ticket_number text;
BEGIN
  -- Get the next ticket number by counting existing tickets
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 3) AS integer)), 0) + 1
  INTO next_number
  FROM public.support_tickets
  WHERE ticket_number ~ '^T-[0-9]+$';
  
  -- Format as T-XXX with zero padding
  ticket_number := 'T-' || LPAD(next_number::text, 3, '0');
  
  RETURN ticket_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate ticket numbers
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_ticket_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();

-- Create updated_at triggers
CREATE TRIGGER handle_updated_at_support_tickets 
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW 
  EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TRIGGER handle_updated_at_support_messages 
  BEFORE UPDATE ON public.support_messages
  FOR EACH ROW 
  EXECUTE PROCEDURE moddatetime(updated_at);

-- Create function to update ticket timestamp when messages are added
CREATE OR REPLACE FUNCTION update_ticket_on_message()
RETURNS trigger AS $$
BEGIN
  -- Update the ticket's updated_at timestamp
  UPDATE public.support_tickets 
  SET updated_at = now()
  WHERE id = NEW.ticket_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ticket_on_message
  AFTER INSERT ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_on_message();

-- Create function to auto-set resolved_at and closed_at timestamps
CREATE OR REPLACE FUNCTION update_ticket_status_timestamps()
RETURNS trigger AS $$
BEGIN
  -- Set resolved_at when status changes to resolved
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.resolved_at := now();
  END IF;
  
  -- Set closed_at when status changes to closed
  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
    NEW.closed_at := now();
  END IF;
  
  -- Clear timestamps if status changes back
  IF NEW.status != 'resolved' AND OLD.status = 'resolved' THEN
    NEW.resolved_at := NULL;
  END IF;
  
  IF NEW.status != 'closed' AND OLD.status = 'closed' THEN
    NEW.closed_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ticket_status_timestamps
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_status_timestamps(); 


-- ============================================================================
-- Migration: 20241221000000_create_email_campaigns_system.sql
-- ============================================================================

-- Email Campaigns System Migration
-- Created: 2024-12-21
-- Description: Complete email campaigns system with subscriber management, templates, campaigns, analytics, and automation

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- MIGRATION SAFETY CHECKS
-- =============================================

-- Check if this migration has already been run
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscribers' AND table_schema = 'public') THEN
    RAISE NOTICE 'Email campaigns system already exists. Skipping table creation but updating functions/views...';
  ELSE
    RAISE NOTICE 'Creating new email campaigns system...';
  END IF;
END $$;

-- =============================================
-- CUSTOM TYPES FOR BETTER PERFORMANCE & CONSISTENCY
-- =============================================

-- Create ENUM types for better performance and data consistency
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscriber_status') THEN
    CREATE TYPE subscriber_status AS ENUM ('active', 'unsubscribed', 'bounced', 'pending');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_status') THEN
    CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'paused', 'failed');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'template_status') THEN
    CREATE TYPE template_status AS ENUM ('draft', 'active', 'archived');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'template_type') THEN
    CREATE TYPE template_type AS ENUM ('welcome', 'newsletter', 'promotional', 'transactional', 'custom');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'automation_trigger') THEN
    CREATE TYPE automation_trigger AS ENUM ('signup', 'purchase', 'abandonment', 'anniversary', 'behavior', 'custom');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_send_status') THEN
    CREATE TYPE email_send_status AS ENUM ('pending', 'sent', 'delivered', 'bounced', 'failed');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bounce_type') THEN
    CREATE TYPE bounce_type AS ENUM ('hard', 'soft', 'complaint');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_severity') THEN
    CREATE TYPE notification_severity AS ENUM ('info', 'warning', 'error', 'critical');
  END IF;
END $$;

-- =============================================
-- 1. SUBSCRIBER MANAGEMENT
-- =============================================

-- Main subscribers table (cleaned up - removed calculated fields)
CREATE TABLE IF NOT EXISTS subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email VARCHAR(255) UNIQUE NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  status subscriber_status DEFAULT 'active',
  subscribe_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unsubscribe_date TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_unsubscribe_date CHECK (unsubscribe_date IS NULL OR unsubscribe_date >= subscribe_date),
  CONSTRAINT valid_status_dates CHECK (
    (status = 'unsubscribed' AND unsubscribe_date IS NOT NULL) OR 
    (status != 'unsubscribed' AND unsubscribe_date IS NULL)
  ),
  source VARCHAR(100), -- 'website', 'import', 'api', etc.
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  -- Note: first_name, last_name come from auth.users profile
  -- Note: engagement_level, total_opens, total_clicks calculated via views
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriber imports tracking
CREATE TABLE IF NOT EXISTS subscriber_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  total_rows INTEGER NOT NULL,
  successful_imports INTEGER DEFAULT 0,
  failed_imports INTEGER DEFAULT 0,
  import_status VARCHAR(50) DEFAULT 'processing' CHECK (import_status IN ('processing', 'completed', 'failed')),
  error_log TEXT,
  imported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriber tags for organization
CREATE TABLE IF NOT EXISTS subscriber_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#007bff', -- Hex color code
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. TEMPLATE SYSTEM
-- =============================================

-- Email templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  subject VARCHAR(500),
  html_content TEXT,
  text_content TEXT,
  template_type template_type DEFAULT 'custom',
  status template_status DEFAULT 'draft',
  variables JSONB DEFAULT '{}', -- Template variables like {{firstName}}
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Template versions for version control
CREATE TABLE IF NOT EXISTS email_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES email_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  html_content TEXT,
  text_content TEXT,
  variables JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_id, version_number)
);

-- Template favorites
CREATE TABLE IF NOT EXISTS email_template_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES email_templates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_id, user_id)
);

-- Template ratings and reviews
CREATE TABLE IF NOT EXISTS email_template_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES email_templates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_id, user_id)
);

-- Transactional email templates
CREATE TABLE IF NOT EXISTS transactional_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key VARCHAR(100) UNIQUE NOT NULL, -- 'order_confirmation', 'password_reset', etc.
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  fallback_template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Template cloning history
CREATE TABLE IF NOT EXISTS email_template_clones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_template_id UUID REFERENCES email_templates(id) ON DELETE CASCADE,
  cloned_template_id UUID REFERENCES email_templates(id) ON DELETE CASCADE,
  cloned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  clone_type VARCHAR(50) DEFAULT 'duplicate' CHECK (clone_type IN ('duplicate', 'fork', 'branch')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email element types for visual editor
CREATE TABLE IF NOT EXISTS email_element_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_name VARCHAR(100) UNIQUE NOT NULL, -- 'header', 'text', 'button', 'image', 'divider', 'spacer'
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  default_properties JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. AUDIENCE MANAGEMENT
-- =============================================

-- Audience segments
CREATE TABLE IF NOT EXISTS email_audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  query_conditions JSONB NOT NULL, -- Dynamic query conditions
  is_dynamic BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table for audience-subscriber relationships
CREATE TABLE IF NOT EXISTS email_audience_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience_id UUID REFERENCES email_audiences(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(audience_id, subscriber_id)
);

-- =============================================
-- 4. CAMPAIGN MANAGEMENT
-- =============================================

-- Email campaigns
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  sender_name VARCHAR(255) DEFAULT 'Cymasphere',
  sender_email VARCHAR(255) DEFAULT 'support@cymasphere.com',
  reply_to_email VARCHAR(255),
  preheader TEXT,
  html_content TEXT,
  text_content TEXT,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  audience_id UUID REFERENCES email_audiences(id) ON DELETE SET NULL,
  status campaign_status DEFAULT 'draft',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_campaign_dates CHECK (
    (status = 'scheduled' AND scheduled_at IS NOT NULL) OR
    (status != 'scheduled') OR
    (scheduled_at IS NULL)
  ),
  CONSTRAINT valid_sent_date CHECK (sent_at IS NULL OR sent_at >= created_at),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign scheduling queue
CREATE TABLE IF NOT EXISTS email_campaign_schedule_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Campaign preview and testing
CREATE TABLE IF NOT EXISTS email_campaign_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  preview_type VARCHAR(50) DEFAULT 'browser' CHECK (preview_type IN ('browser', 'email', 'device')),
  device_type VARCHAR(50) CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  email_client VARCHAR(100), -- 'gmail', 'outlook', 'apple_mail', etc.
  preview_url TEXT,
  generated_html TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Test email sends
CREATE TABLE IF NOT EXISTS email_test_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  template_id UUID REFERENCES email_templates(id) ON DELETE CASCADE,
  test_email VARCHAR(255) NOT NULL,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status email_send_status DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 5. EMAIL TRACKING
-- =============================================

-- Individual email sends
CREATE TABLE IF NOT EXISTS email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE CASCADE,
  email_address VARCHAR(255) NOT NULL,
  status email_send_status DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  message_id VARCHAR(255), -- Provider message ID
  error_message TEXT
);

-- Email opens tracking (partitioned by month for performance)
CREATE TABLE IF NOT EXISTS email_opens (
  id UUID DEFAULT gen_random_uuid(),
  send_id UUID REFERENCES email_sends(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  PRIMARY KEY (id, opened_at)
) PARTITION BY RANGE (opened_at);

-- Create partitions for current and next 3 months (can be extended)
CREATE TABLE IF NOT EXISTS email_opens_2024_12 PARTITION OF email_opens
  FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');
CREATE TABLE IF NOT EXISTS email_opens_2025_01 PARTITION OF email_opens
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE IF NOT EXISTS email_opens_2025_02 PARTITION OF email_opens
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE IF NOT EXISTS email_opens_default PARTITION OF email_opens DEFAULT;

-- Email clicks tracking (partitioned by month for performance)
CREATE TABLE IF NOT EXISTS email_clicks (
  id UUID DEFAULT gen_random_uuid(),
  send_id UUID REFERENCES email_sends(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  PRIMARY KEY (id, clicked_at)
) PARTITION BY RANGE (clicked_at);

-- Create partitions for current and next 3 months
CREATE TABLE IF NOT EXISTS email_clicks_2024_12 PARTITION OF email_clicks
  FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');
CREATE TABLE IF NOT EXISTS email_clicks_2025_01 PARTITION OF email_clicks
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE IF NOT EXISTS email_clicks_2025_02 PARTITION OF email_clicks
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE IF NOT EXISTS email_clicks_default PARTITION OF email_clicks DEFAULT;

-- Email unsubscribes
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  send_id UUID REFERENCES email_sends(id) ON DELETE SET NULL,
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
  reason VARCHAR(255),
  unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email bounces
CREATE TABLE IF NOT EXISTS email_bounces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  send_id UUID REFERENCES email_sends(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  bounce_type bounce_type NOT NULL,
  bounce_subtype VARCHAR(100),
  bounce_reason TEXT,
  diagnostic_code TEXT,
  bounced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 6. AUTOMATION SYSTEM
-- =============================================

-- Email automations
CREATE TABLE IF NOT EXISTS email_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(100) NOT NULL CHECK (trigger_type IN ('signup', 'purchase', 'abandonment', 'anniversary', 'behavior', 'custom')),
  trigger_conditions JSONB DEFAULT '{}',
  email_sequence JSONB NOT NULL, -- Array of emails with delays
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automation enrollments
CREATE TABLE IF NOT EXISTS email_automation_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES email_automations(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  next_send_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- 7. A/B TESTING
-- =============================================

-- A/B tests
CREATE TABLE IF NOT EXISTS email_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  test_name VARCHAR(255) NOT NULL,
  test_type VARCHAR(100) NOT NULL CHECK (test_type IN ('subject_line', 'sender_name', 'content', 'send_time')),
  variants JSONB NOT NULL, -- Array of test variants
  traffic_split JSONB DEFAULT '{"A": 50, "B": 50}', -- Percentage split
  winner_criteria VARCHAR(100) DEFAULT 'open_rate' CHECK (winner_criteria IN ('open_rate', 'click_rate', 'conversion_rate')),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'paused')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  winner_variant VARCHAR(10),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/B test results (calculated fields removed - use views for these)
CREATE TABLE IF NOT EXISTS email_ab_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ab_test_id UUID REFERENCES email_ab_tests(id) ON DELETE CASCADE,
  variant VARCHAR(10) NOT NULL,
  statistical_significance DECIMAL(5,2) DEFAULT 0,
  is_winner BOOLEAN DEFAULT false,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 8. ANALYTICS & REPORTING
-- =============================================

-- Campaign analytics
CREATE TABLE IF NOT EXISTS email_campaign_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed', 'spam')),
  device_type VARCHAR(50),
  browser VARCHAR(100),
  operating_system VARCHAR(100),
  country VARCHAR(100),
  region VARCHAR(100),
  city VARCHAR(100),
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  revenue DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Domain reputation tracking
CREATE TABLE IF NOT EXISTS email_domain_reputation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) UNIQUE NOT NULL,
  reputation_score INTEGER DEFAULT 100 CHECK (reputation_score BETWEEN 0 AND 100),
  dkim_status VARCHAR(50) DEFAULT 'not_configured' CHECK (dkim_status IN ('valid', 'invalid', 'not_configured')),
  spf_status VARCHAR(50) DEFAULT 'not_configured' CHECK (spf_status IN ('pass', 'fail', 'not_configured')),
  dmarc_status VARCHAR(50) DEFAULT 'not_configured' CHECK (dmarc_status IN ('pass', 'fail', 'not_configured')),
  is_blacklisted BOOLEAN DEFAULT false,
  blacklist_sources TEXT[],
  last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign results summary (REMOVED - these are all calculated fields)
-- Use views or calculate on-demand from email_sends, email_opens, email_clicks, etc.

-- System notifications
CREATE TABLE IF NOT EXISTS email_system_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type VARCHAR(100) NOT NULL CHECK (notification_type IN ('deliverability_warning', 'bounce_threshold', 'api_limit', 'domain_reputation', 'campaign_completed', 'automation_error')),
  severity notification_severity DEFAULT 'info',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_for UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Subscribers indexes
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);
CREATE INDEX IF NOT EXISTS idx_subscribers_user_id ON subscribers(user_id);
-- Note: engagement_level removed from table, calculated in views
CREATE INDEX IF NOT EXISTS idx_subscribers_tags ON subscribers USING GIN(tags);

-- Templates indexes
CREATE INDEX IF NOT EXISTS idx_templates_type ON email_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_templates_status ON email_templates(status);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON email_templates(created_by);

-- Campaigns indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON email_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at ON email_campaigns(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_template_id ON email_campaigns(template_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_audience_id ON email_campaigns(audience_id);

-- Tracking indexes
CREATE INDEX IF NOT EXISTS idx_sends_campaign_id ON email_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sends_subscriber_id ON email_sends(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_sends_status ON email_sends(status);
CREATE INDEX IF NOT EXISTS idx_opens_send_id ON email_opens(send_id);
CREATE INDEX IF NOT EXISTS idx_opens_subscriber_id ON email_opens(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_clicks_send_id ON email_clicks(send_id);
CREATE INDEX IF NOT EXISTS idx_clicks_subscriber_id ON email_clicks(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_bounces_send_id ON email_bounces(send_id);
CREATE INDEX IF NOT EXISTS idx_bounces_subscriber_id ON email_bounces(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_bounces_bounce_type ON email_bounces(bounce_type);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_campaign_id ON email_campaign_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON email_campaign_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON email_campaign_analytics(created_at);

-- Automation indexes
CREATE INDEX IF NOT EXISTS idx_automations_status ON email_automations(status);
CREATE INDEX IF NOT EXISTS idx_automations_trigger_type ON email_automations(trigger_type);
CREATE INDEX IF NOT EXISTS idx_enrollments_automation_id ON email_automation_enrollments(automation_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_subscriber_id ON email_automation_enrollments(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON email_automation_enrollments(status);

-- A/B test indexes
CREATE INDEX IF NOT EXISTS idx_ab_tests_campaign_id ON email_ab_tests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON email_ab_tests(status);

-- Additional specialized indexes
CREATE INDEX IF NOT EXISTS idx_transactional_templates_key ON transactional_email_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_transactional_templates_active ON transactional_email_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_template_clones_original ON email_template_clones(original_template_id);
CREATE INDEX IF NOT EXISTS idx_template_clones_cloned ON email_template_clones(cloned_template_id);
CREATE INDEX IF NOT EXISTS idx_campaign_previews_campaign ON email_campaign_previews(campaign_id);
CREATE INDEX IF NOT EXISTS idx_test_sends_campaign ON email_test_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_test_sends_status ON email_test_sends(status);
CREATE INDEX IF NOT EXISTS idx_system_notifications_type ON email_system_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_system_notifications_severity ON email_system_notifications(severity);
CREATE INDEX IF NOT EXISTS idx_system_notifications_user_unread ON email_system_notifications(created_for, is_read) WHERE is_read = false;

-- Additional performance indexes for Supabase integration
CREATE INDEX IF NOT EXISTS idx_subscribers_user_status ON subscribers(user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_email_opens_subscriber_date ON email_opens(subscriber_id, opened_at);
CREATE INDEX IF NOT EXISTS idx_email_clicks_subscriber_date ON email_clicks(subscriber_id, clicked_at);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_active ON profiles(subscription) WHERE subscription != 'none';
CREATE INDEX IF NOT EXISTS idx_profiles_trial_active ON profiles(trial_expiration);

-- Advanced composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_campaigns_status_created_at ON email_campaigns(status, created_at DESC) WHERE status IN ('draft', 'scheduled');
CREATE INDEX IF NOT EXISTS idx_sends_campaign_status_sent ON email_sends(campaign_id, status, sent_at DESC) WHERE status IN ('sent', 'delivered');
CREATE INDEX IF NOT EXISTS idx_subscriber_engagement_composite ON subscribers(status, subscribe_date DESC) WHERE status = 'active';

-- Functional indexes for common search patterns
CREATE INDEX IF NOT EXISTS idx_subscribers_email_domain ON subscribers(email) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_campaigns_sent_date ON email_campaigns(sent_at) WHERE sent_at IS NOT NULL;

-- JSONB indexes for metadata and preferences
CREATE INDEX IF NOT EXISTS idx_subscribers_preferences ON subscribers USING GIN(preferences) WHERE preferences IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_templates_variables ON email_templates USING GIN(variables) WHERE variables IS NOT NULL;

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_fulltext ON email_campaigns USING GIN(to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(subject, '')));
CREATE INDEX IF NOT EXISTS idx_templates_fulltext ON email_templates USING GIN(to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, '')));

-- =============================================
-- INSERT DEFAULT DATA
-- =============================================

-- Insert default email element types
INSERT INTO email_element_types (type_name, display_name, description, default_properties, sort_order) 
VALUES
  ('header', 'Header', 'Main heading text', '{"fontSize": "24px", "color": "#333", "textAlign": "center"}', 1),
  ('text', 'Text Block', 'Paragraph text content', '{"fontSize": "16px", "color": "#666", "lineHeight": "1.5"}', 2),
  ('button', 'Call-to-Action Button', 'Clickable button with link', '{"backgroundColor": "#007bff", "color": "#fff", "padding": "12px 24px"}', 3),
  ('image', 'Image', 'Embedded image', '{"width": "100%", "height": "auto"}', 4),
  ('divider', 'Divider Line', 'Horizontal separator', '{"height": "1px", "backgroundColor": "#eee"}', 5),
  ('spacer', 'Spacer', 'Empty spacing element', '{"height": "20px"}', 6)
ON CONFLICT (type_name) DO NOTHING;

-- Insert default transactional email template mappings
INSERT INTO transactional_email_templates (template_key, is_active) 
VALUES
  ('order_confirmation', true),
  ('password_reset', true),
  ('welcome_email', true),
  ('account_verification', true),
  ('payment_receipt', true),
  ('subscription_renewal', true)
ON CONFLICT (template_key) DO NOTHING;

-- Insert default subscriber tags (including subscription-based tags)
INSERT INTO subscriber_tags (name, description, color) 
VALUES
  ('VIP', 'VIP customers and high-value subscribers', '#ff6b6b'),
  ('New User', 'Recently signed up users', '#4ecdc4'),
  ('Producer', 'Music producers and creators', '#45b7d1'),
  ('DJ', 'DJs and performers', '#96ceb4'),
  ('Student', 'Students and learners', '#ffeaa7'),
  ('Professional', 'Professional musicians', '#dda0dd'),
  ('Beginner', 'Beginner users', '#98d8c8'),
  ('Free User', 'Users with no subscription', '#95a5a6'),
  ('Monthly Subscriber', 'Monthly subscription users', '#3498db'),
  ('Annual Subscriber', 'Annual subscription users', '#2ecc71'),
  ('Lifetime Member', 'Lifetime subscription users', '#f39c12'),
  ('Trial User', 'Users in trial period', '#e74c3c'),
  ('Expired Subscription', 'Users with expired subscriptions', '#9b59b6')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_ab_tests ENABLE ROW LEVEL SECURITY;

-- Create admin check function
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins 
    WHERE user = user_id::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Subscribers RLS policies
CREATE POLICY "Users can view own subscriber data" ON subscribers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscribers" ON subscribers
  FOR ALL USING (is_admin(auth.uid()));

-- Email campaigns RLS policies
CREATE POLICY "Admins can manage campaigns" ON email_campaigns
  FOR ALL USING (is_admin(auth.uid()));

-- Email templates RLS policies
CREATE POLICY "Admins can manage templates" ON email_templates
  FOR ALL USING (is_admin(auth.uid()));

-- Email audiences RLS policies
CREATE POLICY "Admins can manage audiences" ON email_audiences
  FOR ALL USING (is_admin(auth.uid()));

-- Email automations RLS policies
CREATE POLICY "Admins can manage automations" ON email_automations
  FOR ALL USING (is_admin(auth.uid()));

-- A/B tests RLS policies
CREATE POLICY "Admins can manage ab tests" ON email_ab_tests
  FOR ALL USING (is_admin(auth.uid()));

-- =============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_subscribers_updated_at BEFORE UPDATE ON subscribers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON email_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_audiences_updated_at BEFORE UPDATE ON email_audiences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_automations_updated_at BEFORE UPDATE ON email_automations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create subscriber when user signs up (with error handling)
CREATE OR REPLACE FUNCTION create_subscriber_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  subscriber_id UUID;
BEGIN
  -- Only create subscriber if email exists and is valid
  IF NEW.email IS NOT NULL AND NEW.email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    BEGIN
      INSERT INTO subscribers (user_id, email, source)
      VALUES (NEW.id, NEW.email, 'signup')
      RETURNING id INTO subscriber_id;
      
      -- Log successful subscriber creation
      INSERT INTO email_system_notifications (
        notification_type, severity, title, message, created_for, metadata
      ) VALUES (
        'subscriber_created', 'info', 'New Subscriber Created',
        format('Subscriber created for user %s with email %s', NEW.id, NEW.email),
        NEW.id,
        jsonb_build_object('subscriber_id', subscriber_id, 'user_id', NEW.id)
      );
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail user creation
      INSERT INTO email_system_notifications (
        notification_type, severity, title, message, metadata
      ) VALUES (
        'subscriber_creation_error', 'error', 'Failed to Create Subscriber',
        format('Failed to create subscriber for user %s: %s', NEW.id, SQLERRM),
        jsonb_build_object('user_id', NEW.id, 'error', SQLERRM)
      );
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create subscriber when user is created
CREATE TRIGGER create_subscriber_on_user_creation
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_subscriber_for_new_user();

-- Function to handle user email updates (sync with subscriber)
CREATE OR REPLACE FUNCTION sync_subscriber_email_on_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update subscriber email if user email changes
  IF OLD.email IS DISTINCT FROM NEW.email AND NEW.email IS NOT NULL THEN
    UPDATE subscribers 
    SET email = NEW.email, updated_at = NOW()
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync subscriber email when user email changes
CREATE TRIGGER sync_subscriber_on_user_email_update
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_subscriber_email_on_user_update();

-- Function to auto-tag subscribers based on subscription status
CREATE OR REPLACE FUNCTION update_subscriber_subscription_tags()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if subscription-related fields changed
  IF OLD.subscription IS DISTINCT FROM NEW.subscription OR 
     OLD.subscription_expiration IS DISTINCT FROM NEW.subscription_expiration OR
     OLD.trial_expiration IS DISTINCT FROM NEW.trial_expiration THEN
    
    -- Update subscriber tags based on current subscription status
    UPDATE subscribers 
    SET tags = CASE
      -- Trial user (has trial_expiration in future)
      WHEN NEW.trial_expiration IS NOT NULL AND NEW.trial_expiration::timestamp > NOW() THEN
        array_remove(array_remove(array_remove(array_remove(array_remove(
          tags || ARRAY['Trial User'], 
          'Free User'), 'Monthly Subscriber'), 'Annual Subscriber'), 'Lifetime Member'), 'Expired Subscription')
      
      -- Active subscription users
      WHEN NEW.subscription = 'monthly' AND (NEW.subscription_expiration IS NULL OR NEW.subscription_expiration::timestamp > NOW()) THEN
        array_remove(array_remove(array_remove(array_remove(array_remove(
          tags || ARRAY['Monthly Subscriber'], 
          'Free User'), 'Trial User'), 'Annual Subscriber'), 'Lifetime Member'), 'Expired Subscription')
      
      WHEN NEW.subscription = 'annual' AND (NEW.subscription_expiration IS NULL OR NEW.subscription_expiration::timestamp > NOW()) THEN
        array_remove(array_remove(array_remove(array_remove(array_remove(
          tags || ARRAY['Annual Subscriber'], 
          'Free User'), 'Trial User'), 'Monthly Subscriber'), 'Lifetime Member'), 'Expired Subscription')
      
      WHEN NEW.subscription = 'lifetime' THEN
        array_remove(array_remove(array_remove(array_remove(array_remove(
          tags || ARRAY['Lifetime Member'], 
          'Free User'), 'Trial User'), 'Monthly Subscriber'), 'Annual Subscriber'), 'Expired Subscription')
      
      -- Expired subscription
      WHEN NEW.subscription IN ('monthly', 'annual') AND NEW.subscription_expiration IS NOT NULL AND NEW.subscription_expiration::timestamp <= NOW() THEN
        array_remove(array_remove(array_remove(array_remove(array_remove(
          tags || ARRAY['Expired Subscription'], 
          'Free User'), 'Trial User'), 'Monthly Subscriber'), 'Annual Subscriber'), 'Lifetime Member')
      
      -- Free user (no subscription or 'none')
      ELSE
        array_remove(array_remove(array_remove(array_remove(array_remove(
          tags || ARRAY['Free User'], 
          'Trial User'), 'Monthly Subscriber'), 'Annual Subscriber'), 'Lifetime Member'), 'Expired Subscription')
    END,
    updated_at = NOW()
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-tag subscribers when profile subscription changes
CREATE TRIGGER update_subscriber_tags_on_profile_change
  AFTER UPDATE OF subscription, subscription_expiration, trial_expiration ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_subscriber_subscription_tags();

-- =============================================
-- DATABASE VIEWS FOR CALCULATED FIELDS
-- =============================================

-- Campaign performance view (replaces email_campaign_results table)
CREATE OR REPLACE VIEW campaign_performance AS
SELECT 
  c.id as campaign_id,
  c.name,
  c.status,
  c.sent_at,
  
  -- Calculated totals from actual data
  COUNT(DISTINCT s.id) as total_recipients,
  COUNT(DISTINCT CASE WHEN s.status = 'sent' THEN s.id END) as total_sent,
  COUNT(DISTINCT CASE WHEN s.status = 'delivered' THEN s.id END) as total_delivered,
  COUNT(DISTINCT o.id) as total_opens,
  COUNT(DISTINCT cl.id) as total_clicks,
  COUNT(DISTINCT b.id) as total_bounces,
  COUNT(DISTINCT u.id) as total_unsubscribes,
  COUNT(DISTINCT CASE WHEN ca.event_type = 'spam' THEN ca.id END) as total_spam_reports,
  
  -- Calculated rates
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN s.status = 'sent' THEN s.id END) > 0 
    THEN ROUND(COUNT(DISTINCT o.id)::decimal / COUNT(DISTINCT CASE WHEN s.status = 'sent' THEN s.id END) * 100, 2)
    ELSE 0 
  END as open_rate,
  
  CASE 
    WHEN COUNT(DISTINCT o.id) > 0 
    THEN ROUND(COUNT(DISTINCT cl.id)::decimal / COUNT(DISTINCT o.id) * 100, 2)
    ELSE 0 
  END as click_rate,
  
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN s.status = 'sent' THEN s.id END) > 0 
    THEN ROUND(COUNT(DISTINCT b.id)::decimal / COUNT(DISTINCT CASE WHEN s.status = 'sent' THEN s.id END) * 100, 2)
    ELSE 0 
  END as bounce_rate,
  
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN s.status = 'sent' THEN s.id END) > 0 
    THEN ROUND(COUNT(DISTINCT u.id)::decimal / COUNT(DISTINCT CASE WHEN s.status = 'sent' THEN s.id END) * 100, 2)
    ELSE 0 
  END as unsubscribe_rate,
  
  -- Revenue (sum from analytics)
  COALESCE(SUM(ca.revenue), 0) as revenue_generated

FROM email_campaigns c
LEFT JOIN email_sends s ON c.id = s.campaign_id
LEFT JOIN email_opens o ON s.id = o.send_id
LEFT JOIN email_clicks cl ON s.id = cl.send_id
LEFT JOIN email_bounces b ON s.id = b.send_id
LEFT JOIN email_unsubscribes u ON s.id = u.send_id
LEFT JOIN email_campaign_analytics ca ON c.id = ca.campaign_id
GROUP BY c.id, c.name, c.status, c.sent_at;

-- Subscriber profiles view (Supabase-centric: auth.users → profiles → subscribers)
CREATE OR REPLACE VIEW subscriber_profiles AS
SELECT 
  s.id as subscriber_id,
  s.user_id,
  s.email,
  s.status,
  s.subscribe_date,
  s.unsubscribe_date,
  s.source,
  s.metadata,
  s.tags,
  s.preferences,
  s.created_at,
  s.updated_at,
  
  -- Get user data from auth.users
  u.created_at as user_created_at,
  u.email_confirmed_at,
  u.last_sign_in_at,
  u.email as auth_email,
  
  -- Get profile data from profiles table (PROPER Supabase integration)
  p.first_name,
  p.last_name,
  p.avatar_url,
  p.subscription,
  p.subscription_expiration,
  p.trial_expiration,
  p.customer_id,
  p.updated_at as profile_updated_at,
  
  -- Calculate engagement metrics (simplified for performance)
  COUNT(DISTINCT eo.id) as total_opens,
  COUNT(DISTINCT ec.id) as total_clicks,
  MAX(GREATEST(eo.opened_at, ec.clicked_at)) as last_engagement_date,
  
  -- Calculate engagement level
  CASE 
    WHEN COUNT(DISTINCT eo.id) + COUNT(DISTINCT ec.id) >= 10 THEN 'High'
    WHEN COUNT(DISTINCT eo.id) + COUNT(DISTINCT ec.id) >= 3 THEN 'Medium'
    WHEN COUNT(DISTINCT eo.id) + COUNT(DISTINCT ec.id) > 0 THEN 'Low'
    ELSE 'Unknown'
  END as engagement_level

FROM subscribers s
LEFT JOIN auth.users u ON s.user_id = u.id
LEFT JOIN profiles p ON s.user_id = p.id  -- PROPER profile integration
  LEFT JOIN email_opens eo ON s.id = eo.subscriber_id AND eo.opened_at > CURRENT_DATE - INTERVAL '90 days'
  LEFT JOIN email_clicks ec ON s.id = ec.subscriber_id AND ec.clicked_at > CURRENT_DATE - INTERVAL '90 days'
GROUP BY s.id, s.user_id, s.email, s.status, s.subscribe_date, s.unsubscribe_date, 
         s.source, s.metadata, s.tags, s.preferences, s.created_at, s.updated_at,
         u.created_at, u.email_confirmed_at, u.last_sign_in_at, u.email,
         p.first_name, p.last_name, p.avatar_url, p.subscription, p.subscription_expiration, 
         p.trial_expiration, p.customer_id, p.updated_at;

-- Subscriber tag counts view
CREATE OR REPLACE VIEW subscriber_tag_counts AS
SELECT 
  st.id,
  st.name,
  st.description,
  st.color,
  st.created_at,
  COUNT(s.id) as subscriber_count
FROM subscriber_tags st
LEFT JOIN subscribers s ON st.name = ANY(s.tags) AND s.status = 'active'
GROUP BY st.id, st.name, st.description, st.color, st.created_at;

-- Template usage view
CREATE OR REPLACE VIEW template_usage_stats AS
SELECT 
  t.id,
  t.name,
  t.template_type,
  t.status,
  t.last_used_at,
  t.created_at,
  
  -- Calculate usage from campaigns that used this template
  COUNT(c.id) as usage_count,
  
  -- Calculate average rating
  ROUND(AVG(r.rating), 2) as avg_rating,
  COUNT(r.id) as total_ratings,
  
  -- Count favorites
  COUNT(f.id) as favorite_count

FROM email_templates t
LEFT JOIN email_campaigns c ON t.id = c.template_id
LEFT JOIN email_template_ratings r ON t.id = r.template_id
LEFT JOIN email_template_favorites f ON t.id = f.template_id
GROUP BY t.id, t.name, t.template_type, t.status, t.last_used_at, t.created_at;

-- Audience size view (for dynamic audiences)
CREATE OR REPLACE VIEW audience_subscriber_counts AS
SELECT 
  a.id,
  a.name,
  a.description,
  a.is_dynamic,
  a.created_at,
  
  -- Count subscribers in this audience
  COUNT(eas.subscriber_id) as subscriber_count,
  
  -- Last time the audience was calculated (for dynamic audiences)
  MAX(eas.added_at) as last_calculated_at

FROM email_audiences a
LEFT JOIN email_audience_subscribers eas ON a.id = eas.audience_id
LEFT JOIN subscribers s ON eas.subscriber_id = s.id AND s.status = 'active'
GROUP BY a.id, a.name, a.description, a.is_dynamic, a.created_at;

-- Automation enrollment stats view
CREATE OR REPLACE VIEW automation_enrollment_stats AS
SELECT 
  a.id,
  a.name,
  a.trigger_type,
  a.status,
  a.created_at,
  
  -- Calculate enrollment stats
  COUNT(e.id) as total_enrolled,
  COUNT(CASE WHEN e.status = 'completed' THEN 1 END) as total_completed,
  COUNT(CASE WHEN e.status = 'active' THEN 1 END) as active_enrolled,
  
  -- Calculate completion rate
  CASE 
    WHEN COUNT(e.id) > 0 
    THEN ROUND(COUNT(CASE WHEN e.status = 'completed' THEN 1 END)::decimal / COUNT(e.id) * 100, 2)
    ELSE 0 
  END as completion_rate

FROM email_automations a
LEFT JOIN email_automation_enrollments e ON a.id = e.automation_id
GROUP BY a.id, a.name, a.trigger_type, a.status, a.created_at;

-- A/B test performance view
CREATE OR REPLACE VIEW ab_test_performance AS
SELECT 
  abt.id as test_id,
  abt.test_name,
  abt.test_type,
  abt.status,
  abtr.variant,
  
  -- Calculate performance from actual tracking data
  COUNT(DISTINCT s.id) as total_sent,
  COUNT(DISTINCT o.id) as total_opens,
  COUNT(DISTINCT cl.id) as total_clicks,
  COUNT(DISTINCT CASE WHEN ca.revenue > 0 THEN ca.id END) as total_conversions,
  
  -- Calculate rates
  CASE 
    WHEN COUNT(DISTINCT s.id) > 0 
    THEN ROUND(COUNT(DISTINCT o.id)::decimal / COUNT(DISTINCT s.id) * 100, 2)
    ELSE 0 
  END as open_rate,
  
  CASE 
    WHEN COUNT(DISTINCT o.id) > 0 
    THEN ROUND(COUNT(DISTINCT cl.id)::decimal / COUNT(DISTINCT o.id) * 100, 2)
    ELSE 0 
  END as click_rate,
  
  CASE 
    WHEN COUNT(DISTINCT s.id) > 0 
    THEN ROUND(COUNT(DISTINCT CASE WHEN ca.revenue > 0 THEN ca.id END)::decimal / COUNT(DISTINCT s.id) * 100, 2)
    ELSE 0 
  END as conversion_rate,
  
  -- Statistical significance and winner status from stored results
  abtr.statistical_significance,
  abtr.is_winner

FROM email_ab_tests abt
JOIN email_ab_test_results abtr ON abt.id = abtr.ab_test_id
LEFT JOIN email_sends s ON abt.campaign_id = s.campaign_id
LEFT JOIN email_opens o ON s.id = o.send_id
LEFT JOIN email_clicks cl ON s.id = cl.send_id
LEFT JOIN email_campaign_analytics ca ON abt.campaign_id = ca.campaign_id
GROUP BY abt.id, abt.test_name, abt.test_type, abt.status, abtr.variant, abtr.statistical_significance, abtr.is_winner;

-- Domain reputation stats view
CREATE OR REPLACE VIEW domain_reputation_stats AS
SELECT 
  dr.id,
  dr.domain,
  dr.reputation_score,
  dr.dkim_status,
  dr.spf_status,
  dr.dmarc_status,
  dr.is_blacklisted,
  dr.last_checked_at,
  
  -- Calculate stats from actual email tracking
  COUNT(DISTINCT s.id) as total_sent,
  COUNT(DISTINCT CASE WHEN s.status = 'delivered' THEN s.id END) as total_delivered,
  COUNT(DISTINCT b.id) as total_bounced,
  COUNT(DISTINCT CASE WHEN ca.event_type = 'spam' THEN ca.id END) as total_spam_reports,
  
  -- Calculate delivery rate
  CASE 
    WHEN COUNT(DISTINCT s.id) > 0 
    THEN ROUND(COUNT(DISTINCT CASE WHEN s.status = 'delivered' THEN s.id END)::decimal / COUNT(DISTINCT s.id) * 100, 2)
    ELSE 0 
  END as delivery_rate

FROM email_domain_reputation dr
LEFT JOIN email_sends s ON SPLIT_PART(s.email_address, '@', 2) = dr.domain
LEFT JOIN email_bounces b ON s.id = b.send_id
LEFT JOIN email_campaign_analytics ca ON ca.event_type = 'spam'
GROUP BY dr.id, dr.domain, dr.reputation_score, dr.dkim_status, dr.spf_status, dr.dmarc_status, dr.is_blacklisted, dr.last_checked_at;

-- Enhanced audience insights view (includes subscription segmentation)
CREATE OR REPLACE VIEW audience_insights AS
SELECT 
  a.id,
  a.name,
  a.description,
  a.is_dynamic,
  a.created_at,
  
  -- Overall subscriber counts
  COUNT(DISTINCT eas.subscriber_id) as total_subscribers,
  COUNT(DISTINCT CASE WHEN s.status = 'active' THEN eas.subscriber_id END) as active_subscribers,
  
  -- Subscription type breakdown
  COUNT(DISTINCT CASE WHEN sp.subscription = 'none' THEN eas.subscriber_id END) as free_users,
  COUNT(DISTINCT CASE WHEN sp.subscription = 'monthly' THEN eas.subscriber_id END) as monthly_subscribers,
  COUNT(DISTINCT CASE WHEN sp.subscription = 'annual' THEN eas.subscriber_id END) as annual_subscribers,
  COUNT(DISTINCT CASE WHEN sp.subscription = 'lifetime' THEN eas.subscriber_id END) as lifetime_members,
  
  -- Trial users
  COUNT(DISTINCT CASE WHEN sp.trial_expiration IS NOT NULL AND sp.trial_expiration::timestamp > NOW() THEN eas.subscriber_id END) as trial_users,
  
  -- Engagement breakdown
  COUNT(DISTINCT CASE WHEN sp.engagement_level = 'High' THEN eas.subscriber_id END) as high_engagement,
  COUNT(DISTINCT CASE WHEN sp.engagement_level = 'Medium' THEN eas.subscriber_id END) as medium_engagement,
  COUNT(DISTINCT CASE WHEN sp.engagement_level = 'Low' THEN eas.subscriber_id END) as low_engagement,
  
  -- Audience health metrics
  ROUND(COUNT(DISTINCT CASE WHEN s.status = 'active' THEN eas.subscriber_id END)::decimal / NULLIF(COUNT(DISTINCT eas.subscriber_id), 0) * 100, 2) as active_rate,
  ROUND(COUNT(DISTINCT CASE WHEN sp.subscription != 'none' THEN eas.subscriber_id END)::decimal / NULLIF(COUNT(DISTINCT eas.subscriber_id), 0) * 100, 2) as paid_subscriber_rate

FROM email_audiences a
LEFT JOIN email_audience_subscribers eas ON a.id = eas.audience_id
LEFT JOIN subscribers s ON eas.subscriber_id = s.id
LEFT JOIN subscriber_profiles sp ON s.id = sp.subscriber_id
GROUP BY a.id, a.name, a.description, a.is_dynamic, a.created_at;

-- =============================================
-- MATERIALIZED VIEWS FOR HIGH-PERFORMANCE ANALYTICS
-- =============================================

-- Materialized view for subscriber engagement summary (refresh daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS subscriber_engagement_summary AS
SELECT 
  s.id,
  s.email,
  s.status,
  COUNT(DISTINCT eo.id) as total_opens_30d,
  COUNT(DISTINCT ec.id) as total_clicks_30d,
  COUNT(DISTINCT es.id) as total_emails_received_30d,
  MAX(GREATEST(eo.opened_at, ec.clicked_at)) as last_engagement,
  CASE 
    WHEN COUNT(DISTINCT eo.id) + COUNT(DISTINCT ec.id) >= 5 THEN 'High'
    WHEN COUNT(DISTINCT eo.id) + COUNT(DISTINCT ec.id) >= 2 THEN 'Medium'
    WHEN COUNT(DISTINCT eo.id) + COUNT(DISTINCT ec.id) > 0 THEN 'Low'
    ELSE 'None'
  END as engagement_level_30d
FROM subscribers s
  LEFT JOIN email_sends es ON s.id = es.subscriber_id AND es.sent_at > CURRENT_DATE - INTERVAL '30 days'
  LEFT JOIN email_opens eo ON es.id = eo.send_id AND eo.opened_at > CURRENT_DATE - INTERVAL '30 days'
  LEFT JOIN email_clicks ec ON es.id = ec.send_id AND ec.clicked_at > CURRENT_DATE - INTERVAL '30 days'
WHERE s.status = 'active'
GROUP BY s.id, s.email, s.status;

-- Create unique index for faster refreshes
CREATE UNIQUE INDEX ON subscriber_engagement_summary (id);

-- Materialized view for campaign performance summary
CREATE MATERIALIZED VIEW IF NOT EXISTS campaign_performance_summary AS
SELECT 
  c.id,
  c.name,
  c.status,
  c.sent_at,
  COUNT(DISTINCT es.id) as total_sent,
  COUNT(DISTINCT CASE WHEN es.status = 'delivered' THEN es.id END) as total_delivered,
  COUNT(DISTINCT eo.id) as total_opens,
  COUNT(DISTINCT ec.id) as total_clicks,
  COUNT(DISTINCT eb.id) as total_bounces,
  ROUND(COUNT(DISTINCT eo.id)::decimal / NULLIF(COUNT(DISTINCT es.id), 0) * 100, 2) as open_rate,
  ROUND(COUNT(DISTINCT ec.id)::decimal / NULLIF(COUNT(DISTINCT eo.id), 0) * 100, 2) as click_rate,
  ROUND(COUNT(DISTINCT eb.id)::decimal / NULLIF(COUNT(DISTINCT es.id), 0) * 100, 2) as bounce_rate
FROM email_campaigns c
LEFT JOIN email_sends es ON c.id = es.campaign_id
LEFT JOIN email_opens eo ON es.id = eo.send_id
LEFT JOIN email_clicks ec ON es.id = ec.send_id
LEFT JOIN email_bounces eb ON es.id = eb.send_id
WHERE c.status IN ('sent', 'sending')
GROUP BY c.id, c.name, c.status, c.sent_at;

-- Create unique index for faster refreshes
CREATE UNIQUE INDEX ON campaign_performance_summary (id);

-- =============================================
-- FUNCTIONS FOR MATERIALIZED VIEW MANAGEMENT
-- =============================================

-- Function to refresh engagement summary (call daily)
CREATE OR REPLACE FUNCTION refresh_engagement_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY subscriber_engagement_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_performance_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- DATA ARCHIVING & CLEANUP FUNCTIONS
-- =============================================

-- Function to archive old email tracking data (run monthly)
CREATE OR REPLACE FUNCTION archive_old_email_data(archive_before_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '1 year')
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER := 0;
BEGIN
  -- Archive old email opens (keep last 1 year by default)
  WITH archived_opens AS (
    DELETE FROM email_opens 
    WHERE opened_at < archive_before_date
    RETURNING *
  )
  SELECT COUNT(*) INTO archived_count FROM archived_opens;
  
  -- Archive old email clicks
  DELETE FROM email_clicks 
  WHERE clicked_at < archive_before_date;
  
  -- Archive old campaign analytics
  DELETE FROM email_campaign_analytics 
  WHERE created_at < archive_before_date;
  
  -- Clean up expired preview URLs
  DELETE FROM email_campaign_previews 
  WHERE expires_at < NOW();
  
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create monthly partitions automatically
CREATE OR REPLACE FUNCTION create_monthly_partitions(table_name TEXT, months_ahead INTEGER DEFAULT 3)
RETURNS void AS $$
DECLARE
  start_date DATE;
  end_date DATE;
  partition_name TEXT;
  i INTEGER;
BEGIN
  start_date := DATE_TRUNC('month', NOW())::DATE;
  
  FOR i IN 1..months_ahead LOOP
    start_date := start_date + INTERVAL '1 month';
    end_date := start_date + INTERVAL '1 month';
    partition_name := table_name || '_' || TO_CHAR(start_date, 'YYYY_MM');
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
      partition_name, table_name, start_date, end_date);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- INITIALIZE SUBSCRIPTION TAGS FOR EXISTING USERS
-- =============================================

-- Initialize subscription tags for existing subscribers
-- This will run once during migration to tag existing users
DO $$
BEGIN
  -- Update existing subscribers with appropriate subscription tags
  UPDATE subscribers 
  SET tags = CASE
    -- Get subscription info from profiles table
    WHEN (SELECT p.trial_expiration FROM profiles p WHERE p.id = subscribers.user_id)::timestamp > NOW() THEN
      array_remove(tags || ARRAY['Trial User'], NULL)
    
    WHEN (SELECT p.subscription FROM profiles p WHERE p.id = subscribers.user_id) = 'monthly' 
         AND ((SELECT p.subscription_expiration FROM profiles p WHERE p.id = subscribers.user_id) IS NULL 
              OR (SELECT p.subscription_expiration FROM profiles p WHERE p.id = subscribers.user_id)::timestamp > NOW()) THEN
      array_remove(tags || ARRAY['Monthly Subscriber'], NULL)
    
    WHEN (SELECT p.subscription FROM profiles p WHERE p.id = subscribers.user_id) = 'annual' 
         AND ((SELECT p.subscription_expiration FROM profiles p WHERE p.id = subscribers.user_id) IS NULL 
              OR (SELECT p.subscription_expiration FROM profiles p WHERE p.id = subscribers.user_id)::timestamp > NOW()) THEN
      array_remove(tags || ARRAY['Annual Subscriber'], NULL)
    
    WHEN (SELECT p.subscription FROM profiles p WHERE p.id = subscribers.user_id) = 'lifetime' THEN
      array_remove(tags || ARRAY['Lifetime Member'], NULL)
    
    WHEN (SELECT p.subscription FROM profiles p WHERE p.id = subscribers.user_id) IN ('monthly', 'annual') 
         AND (SELECT p.subscription_expiration FROM profiles p WHERE p.id = subscribers.user_id)::timestamp <= NOW() THEN
      array_remove(tags || ARRAY['Expired Subscription'], NULL)
    
    ELSE
      array_remove(tags || ARRAY['Free User'], NULL)
  END,
  updated_at = NOW()
  WHERE user_id IS NOT NULL;
END $$;

-- =============================================
-- PERFORMANCE MONITORING & OPTIMIZATION
-- =============================================

-- Function to analyze query performance and suggest optimizations
CREATE OR REPLACE FUNCTION analyze_email_system_performance()
RETURNS TABLE(
  table_name TEXT,
  estimated_rows BIGINT,
  table_size TEXT,
  index_usage TEXT,
  recommendations TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_name::TEXT,
    t.n_tup_est AS estimated_rows,
    pg_size_pretty(pg_total_relation_size(t.table_name::regclass)) AS table_size,
    CASE 
      WHEN t.seq_scan > t.idx_scan THEN 'Low index usage - consider adding indexes'
      ELSE 'Good index usage'
    END AS index_usage,
    CASE
      WHEN t.n_tup_est > 100000 AND t.seq_scan > t.idx_scan THEN 'Large table with sequential scans - needs optimization'
      WHEN t.n_tup_est > 10000 THEN 'Consider partitioning or archiving old data'
      ELSE 'Performance looks good'
    END AS recommendations
  FROM pg_stat_user_tables t
  WHERE t.schemaname = 'public' 
    AND t.table_name LIKE 'email_%' OR t.table_name = 'subscribers'
  ORDER BY t.n_tup_est DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get email system health metrics
CREATE OR REPLACE FUNCTION get_email_system_metrics()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_subscribers', (SELECT COUNT(*) FROM subscribers WHERE status = 'active'),
    'total_campaigns', (SELECT COUNT(*) FROM email_campaigns),
    'campaigns_sent_today', (SELECT COUNT(*) FROM email_campaigns WHERE sent_at::date = CURRENT_DATE),
    'avg_open_rate_7d', (
      SELECT ROUND(AVG(open_rate), 2) 
      FROM campaign_performance_summary 
      WHERE sent_at > NOW() - INTERVAL '7 days'
    ),
    'avg_click_rate_7d', (
      SELECT ROUND(AVG(click_rate), 2) 
      FROM campaign_performance_summary 
      WHERE sent_at > NOW() - INTERVAL '7 days'
    ),
    'bounced_subscribers', (SELECT COUNT(*) FROM subscribers WHERE status = 'bounced'),
    'unsubscribed_today', (
      SELECT COUNT(*) FROM subscribers 
      WHERE status = 'unsubscribed' AND unsubscribe_date::date = CURRENT_DATE
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- MISSING FEATURES ADDED
-- =============================================

-- Add webhook endpoints tracking for email service providers
CREATE TABLE IF NOT EXISTS email_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(100) NOT NULL, -- 'sendgrid', 'mailgun', 'ses', etc.
  event_type VARCHAR(100) NOT NULL,
  webhook_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for webhook processing
CREATE INDEX IF NOT EXISTS idx_webhook_logs_unprocessed ON email_webhook_logs(created_at) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_webhook_logs_provider_event ON email_webhook_logs(provider, event_type);

-- Email list growth tracking
CREATE TABLE IF NOT EXISTS email_list_growth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  new_subscribers INTEGER DEFAULT 0,
  unsubscribes INTEGER DEFAULT 0,
  bounces INTEGER DEFAULT 0,
  net_growth INTEGER DEFAULT 0,
  total_subscribers INTEGER DEFAULT 0,
  growth_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date)
);

-- Index for growth analytics
CREATE INDEX IF NOT EXISTS idx_list_growth_date ON email_list_growth(date DESC);

-- Email deliverability settings per domain
CREATE TABLE IF NOT EXISTS email_deliverability_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) UNIQUE NOT NULL,
  dkim_selector VARCHAR(100),
  dkim_private_key TEXT,
  custom_tracking_domain VARCHAR(255),
  bounce_handling_enabled BOOLEAN DEFAULT true,
  complaint_handling_enabled BOOLEAN DEFAULT true,
  open_tracking_enabled BOOLEAN DEFAULT true,
  click_tracking_enabled BOOLEAN DEFAULT true,
  unsubscribe_tracking_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign A/B test variants detail table
CREATE TABLE IF NOT EXISTS email_ab_test_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ab_test_id UUID REFERENCES email_ab_tests(id) ON DELETE CASCADE,
  variant_name VARCHAR(10) NOT NULL, -- 'A', 'B', 'C', etc.
  traffic_percentage INTEGER NOT NULL CHECK (traffic_percentage BETWEEN 0 AND 100),
  subject_line VARCHAR(500),
  sender_name VARCHAR(255),
  sender_email VARCHAR(255),
  content_variant JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ab_test_id, variant_name)
);

-- Email send rate limiting table
CREATE TABLE IF NOT EXISTS email_send_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(100) NOT NULL,
  emails_per_hour INTEGER NOT NULL DEFAULT 100,
  emails_per_day INTEGER NOT NULL DEFAULT 1000,
  current_hour_count INTEGER DEFAULT 0,
  current_day_count INTEGER DEFAULT 0,
  last_reset_hour TIMESTAMP WITH TIME ZONE DEFAULT DATE_TRUNC('hour', NOW()),
  last_reset_day TIMESTAMP WITH TIME ZONE DEFAULT DATE_TRUNC('day', NOW()),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider)
);

-- Function to check send rate limits
CREATE OR REPLACE FUNCTION check_send_rate_limit(provider_name VARCHAR, emails_to_send INTEGER DEFAULT 1)
RETURNS BOOLEAN AS $$
DECLARE
  rate_limit RECORD;
  current_hour TIMESTAMP;
  current_day TIMESTAMP;
BEGIN
  current_hour := DATE_TRUNC('hour', NOW());
  current_day := DATE_TRUNC('day', NOW());
  
  SELECT * INTO rate_limit FROM email_send_rate_limits WHERE provider = provider_name AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN true; -- No rate limit set
  END IF;
  
  -- Reset counters if needed
  IF rate_limit.last_reset_hour < current_hour THEN
    UPDATE email_send_rate_limits 
    SET current_hour_count = 0, last_reset_hour = current_hour 
    WHERE provider = provider_name;
    rate_limit.current_hour_count := 0;
  END IF;
  
  IF rate_limit.last_reset_day < current_day THEN
    UPDATE email_send_rate_limits 
    SET current_day_count = 0, last_reset_day = current_day 
    WHERE provider = provider_name;
    rate_limit.current_day_count := 0;
  END IF;
  
  -- Check if sending would exceed limits
  IF (rate_limit.current_hour_count + emails_to_send) > rate_limit.emails_per_hour OR
     (rate_limit.current_day_count + emails_to_send) > rate_limit.emails_per_day THEN
    RETURN false;
  END IF;
  
  -- Update counters
  UPDATE email_send_rate_limits 
  SET 
    current_hour_count = current_hour_count + emails_to_send,
    current_day_count = current_day_count + emails_to_send
  WHERE provider = provider_name;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate daily list growth metrics
CREATE OR REPLACE FUNCTION calculate_daily_list_growth(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
DECLARE
  new_subs INTEGER;
  unsubs INTEGER;
  bounced INTEGER;
  total_subs INTEGER;
  net_growth INTEGER;
  growth_rate DECIMAL(5,2);
  prev_total INTEGER;
BEGIN
  -- Calculate metrics for the target date
  SELECT COUNT(*) INTO new_subs 
  FROM subscribers 
  WHERE subscribe_date::date = target_date;
  
  SELECT COUNT(*) INTO unsubs 
  FROM subscribers 
  WHERE unsubscribe_date::date = target_date;
  
  SELECT COUNT(*) INTO bounced 
  FROM subscribers 
  WHERE status = 'bounced' 
  AND created_at::date = target_date;
  
  SELECT COUNT(*) INTO total_subs 
  FROM subscribers 
  WHERE status = 'active' 
  AND subscribe_date::date <= target_date;
  
  -- Get previous day total for growth rate calculation
  SELECT total_subscribers INTO prev_total 
  FROM email_list_growth 
  WHERE date = target_date - INTERVAL '1 day';
  
  IF prev_total IS NULL THEN
    prev_total := 0;
  END IF;
  
  net_growth := new_subs - unsubs - bounced;
  
  IF prev_total > 0 THEN
    growth_rate := (net_growth::decimal / prev_total) * 100;
  ELSE
    growth_rate := 0;
  END IF;
  
  -- Insert or update the daily metrics
  INSERT INTO email_list_growth (
    date, new_subscribers, unsubscribes, bounces, 
    net_growth, total_subscribers, growth_rate
  ) VALUES (
    target_date, new_subs, unsubs, bounced, 
    net_growth, total_subs, growth_rate
  )
  ON CONFLICT (date) DO UPDATE SET
    new_subscribers = EXCLUDED.new_subscribers,
    unsubscribes = EXCLUDED.unsubscribes,
    bounces = EXCLUDED.bounces,
    net_growth = EXCLUDED.net_growth,
    total_subscribers = EXCLUDED.total_subscribers,
    growth_rate = EXCLUDED.growth_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced email system metrics with growth data
CREATE OR REPLACE FUNCTION get_enhanced_email_metrics()
RETURNS JSON AS $$
DECLARE
  result JSON;
  growth_7d DECIMAL(5,2);
  growth_30d DECIMAL(5,2);
BEGIN
  -- Calculate growth rates
  SELECT AVG(growth_rate) INTO growth_7d 
  FROM email_list_growth 
  WHERE date > CURRENT_DATE - INTERVAL '7 days';
  
  SELECT AVG(growth_rate) INTO growth_30d 
  FROM email_list_growth 
  WHERE date > CURRENT_DATE - INTERVAL '30 days';
  
  SELECT json_build_object(
    'subscribers', json_build_object(
      'total_active', (SELECT COUNT(*) FROM subscribers WHERE status = 'active'),
      'total_unsubscribed', (SELECT COUNT(*) FROM subscribers WHERE status = 'unsubscribed'),
      'total_bounced', (SELECT COUNT(*) FROM subscribers WHERE status = 'bounced'),
      'growth_rate_7d', COALESCE(growth_7d, 0),
      'growth_rate_30d', COALESCE(growth_30d, 0),
      'new_today', (SELECT COUNT(*) FROM subscribers WHERE subscribe_date::date = CURRENT_DATE)
    ),
    'campaigns', json_build_object(
      'total', (SELECT COUNT(*) FROM email_campaigns),
      'sent_today', (SELECT COUNT(*) FROM email_campaigns WHERE sent_at::date = CURRENT_DATE),
      'draft', (SELECT COUNT(*) FROM email_campaigns WHERE status = 'draft'),
      'scheduled', (SELECT COUNT(*) FROM email_campaigns WHERE status = 'scheduled')
    ),
    'performance', json_build_object(
      'avg_open_rate_7d', (
        SELECT ROUND(AVG(open_rate), 2) 
        FROM campaign_performance_summary 
        WHERE sent_at > NOW() - INTERVAL '7 days'
      ),
      'avg_click_rate_7d', (
        SELECT ROUND(AVG(click_rate), 2) 
        FROM campaign_performance_summary 
        WHERE sent_at > NOW() - INTERVAL '7 days'
      ),
      'avg_bounce_rate_7d', (
        SELECT ROUND(AVG(bounce_rate), 2) 
        FROM campaign_performance_summary 
        WHERE sent_at > NOW() - INTERVAL '7 days'
      )
    ),
    'engagement', json_build_object(
      'high_engagement', (SELECT COUNT(*) FROM subscriber_engagement_summary WHERE engagement_level_30d = 'High'),
      'medium_engagement', (SELECT COUNT(*) FROM subscriber_engagement_summary WHERE engagement_level_30d = 'Medium'),
      'low_engagement', (SELECT COUNT(*) FROM subscriber_engagement_summary WHERE engagement_level_30d = 'Low'),
      'no_engagement', (SELECT COUNT(*) FROM subscriber_engagement_summary WHERE engagement_level_30d = 'None')
