

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."subscription_type" AS ENUM (
    'none',
    'monthly',
    'annual',
    'lifetime',
    'admin',
    'ad_manager'
);


ALTER TYPE "public"."subscription_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'ad_manager'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_families_table"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if families table already exists
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'families'
  ) THEN
    -- Create the families table
    CREATE TABLE public.families (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      family_name VARCHAR(255) NOT NULL,
      primary_contact_id uuid,
      contact_ids uuid[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Add RLS policy
    ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

    -- Add policies
    CREATE POLICY "Allow authenticated users to read families" 
      ON public.families FOR SELECT 
      USING (auth.role() = 'authenticated');

    CREATE POLICY "Allow authenticated users to insert families" 
      ON public.families FOR INSERT 
      WITH CHECK (auth.role() = 'authenticated');

    CREATE POLICY "Allow authenticated users to update their families" 
      ON public.families FOR UPDATE 
      USING (auth.role() = 'authenticated');

    CREATE POLICY "Allow authenticated users to delete their families" 
      ON public.families FOR DELETE 
      USING (auth.role() = 'authenticated');
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;


ALTER FUNCTION "public"."create_families_table"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."discipline_exists"("p_discipline_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM disciplines WHERE id = p_discipline_id) INTO v_exists;
  RETURN v_exists;
END;
$$;


ALTER FUNCTION "public"."discipline_exists"("p_discipline_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_primary_contact_in_family"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- If primary_contact_id is not null and not in contact_ids array
  IF NEW.primary_contact_id IS NOT NULL AND NOT (NEW.primary_contact_id = ANY(NEW.contact_ids)) THEN
    -- Add primary_contact_id to contact_ids array
    NEW.contact_ids = array_append(NEW.contact_ids, NEW.primary_contact_id);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_primary_contact_in_family"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_discipline_id"("p_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- If p_id is already a valid UUID, return it
    IF is_valid_uuid(p_id) THEN
        RETURN p_id::UUID;
    END IF;
    
    -- Otherwise, try to look up the old ID in the disciplines_id_map
    RETURN (SELECT new_id FROM disciplines_id_map WHERE old_id = p_id::INTEGER);
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."get_discipline_id"("p_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_employee_discipline_names"("p_employee_id" integer) RETURNS TABLE("id" "uuid", "name" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    has_new BOOLEAN;
BEGIN
    -- Check if there's data in the new junction table
    SELECT EXISTS(SELECT 1 FROM employee_disciplines_new WHERE employee_id = p_employee_id) INTO has_new;
    
    IF has_new THEN
        -- Return disciplines with names for an employee from the new table
        RETURN QUERY 
        SELECT d.id, d.name
        FROM disciplines d
        JOIN employee_disciplines_new ed ON d.id = ed.discipline_id
        WHERE ed.employee_id = p_employee_id;
    ELSE
        -- Return disciplines with names for an employee from the old table, using the mapping
        RETURN QUERY 
        SELECT d.id, d.name
        FROM disciplines d
        JOIN disciplines_id_map dm ON d.id = dm.new_id
        JOIN employee_disciplines ed ON ed.discipline_id = dm.old_id
        WHERE ed.employee_id = p_employee_id;
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_employee_discipline_names"("p_employee_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_employee_disciplines"("p_employee_id" integer) RETURNS SETOF "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    has_new BOOLEAN;
BEGIN
    -- Check if there's data in the new junction table
    SELECT EXISTS(SELECT 1 FROM employee_disciplines_new WHERE employee_id = p_employee_id) INTO has_new;
    
    IF has_new THEN
        -- Return disciplines for an employee from the new table
        RETURN QUERY 
        SELECT ed.discipline_id 
        FROM employee_disciplines_new ed
        WHERE ed.employee_id = p_employee_id;
    ELSE
        -- Return disciplines for an employee from the old table, using the mapping
        RETURN QUERY 
        SELECT dm.new_id
        FROM employee_disciplines ed
        JOIN disciplines_id_map dm ON ed.discipline_id = dm.old_id
        WHERE ed.employee_id = p_employee_id;
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_employee_disciplines"("p_employee_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_employee_id"("p_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN get_entity_by_id(p_id, 'employees', 'employees_id_map');
END;
$$;


ALTER FUNCTION "public"."get_employee_id"("p_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_enrollment_id"("p_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN get_entity_by_id(p_id, 'enrollments', 'enrollments_id_map');
END;
$$;


ALTER FUNCTION "public"."get_enrollment_id"("p_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_entity_by_id"("p_id" "text", "p_table_name" "text", "p_id_map_table" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_id UUID;
    v_old_id INTEGER;
    v_query TEXT;
BEGIN
    -- First, check if the ID is a valid UUID
    IF is_valid_uuid(p_id) THEN
        RETURN p_id::UUID;
    END IF;
    
    -- Try to convert to integer for old ID lookup
    BEGIN
        v_old_id := p_id::INTEGER;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN NULL;
    END;
    
    -- Build the query to get the UUID from the ID map
    v_query := 'SELECT new_id FROM ' || p_id_map_table || ' WHERE old_id = ' || v_old_id;
    
    -- Execute the query
    EXECUTE v_query INTO v_id;
    
    RETURN v_id;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."get_entity_by_id"("p_id" "text", "p_table_name" "text", "p_id_map_table" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_event_id"("p_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN get_entity_by_id(p_id, 'events', 'events_id_map');
END;
$$;


ALTER FUNCTION "public"."get_event_id"("p_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_invoice_id"("p_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN get_entity_by_id(p_id, 'invoices', 'invoices_id_map');
END;
$$;


ALTER FUNCTION "public"."get_invoice_id"("p_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_location_id"("p_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN get_entity_by_id(p_id, 'locations', 'locations_id_map');
END;
$$;


ALTER FUNCTION "public"."get_location_id"("p_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_location_type_id"("p_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN get_entity_by_id(p_id, 'location_types', 'location_types_id_map');
END;
$$;


ALTER FUNCTION "public"."get_location_type_id"("p_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_role_id"("p_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN get_entity_by_id(p_id, 'roles', 'roles_id_map');
END;
$$;


ALTER FUNCTION "public"."get_role_id"("p_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_service_id"("p_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN get_entity_by_id(p_id, 'services', 'services_id_map');
END;
$$;


ALTER FUNCTION "public"."get_service_id"("p_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_service_variation_id"("p_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN get_entity_by_id(p_id, 'service_variations', 'service_variations_id_map');
END;
$$;


ALTER FUNCTION "public"."get_service_variation_id"("p_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_setting_id"("p_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN get_entity_by_id(p_id, 'settings', 'settings_id_map');
END;
$$;


ALTER FUNCTION "public"."get_setting_id"("p_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_id"("p_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN get_entity_by_id(p_id, 'users', 'users_id_map');
END;
$$;


ALTER FUNCTION "public"."get_user_id"("p_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_permission_id"("p_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN get_entity_by_id(p_id, 'user_permissions', 'user_permissions_id_map');
END;
$$;


ALTER FUNCTION "public"."get_user_permission_id"("p_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_families_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at = CURRENT_TIMESTAMP;
    NEW.updated_at = CURRENT_TIMESTAMP;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_families_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inspect_junction_table"("junction_table" "text", "table1" "text", "table2" "text") RETURNS TABLE("junction_table_name" "text", "table1_name" "text", "table1_column" "text", "table1_column_type" "text", "table2_name" "text", "table2_column" "text", "table2_column_type" "text", "junction_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    table1_column text;
    table2_column text;
    table1_column_type text;
    table2_column_type text;
    junction_count bigint;
BEGIN
    -- Find columns that reference table1 and table2
    SELECT 
        kcu.column_name INTO table1_column
    FROM 
        information_schema.table_constraints tc
    JOIN 
        information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN 
        information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE 
        tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public' 
        AND tc.table_name = junction_table 
        AND ccu.table_name = table1;
        
    SELECT 
        kcu.column_name INTO table2_column
    FROM 
        information_schema.table_constraints tc
    JOIN 
        information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN 
        information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE 
        tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public' 
        AND tc.table_name = junction_table 
        AND ccu.table_name = table2;
        
    -- Get column types
    SELECT 
        data_type INTO table1_column_type
    FROM 
        information_schema.columns
    WHERE 
        table_schema = 'public' 
        AND table_name = junction_table 
        AND column_name = table1_column;
        
    SELECT 
        data_type INTO table2_column_type
    FROM 
        information_schema.columns
    WHERE 
        table_schema = 'public' 
        AND table_name = junction_table 
        AND column_name = table2_column;
        
    -- Get record count
    EXECUTE format('SELECT COUNT(*) FROM public.%I', junction_table) INTO junction_count;
    
    -- Return the information
    RETURN QUERY 
    SELECT 
        junction_table::text as junction_table_name,
        table1::text as table1_name,
        table1_column::text,
        table1_column_type::text,
        table2::text as table2_name,
        table2_column::text,
        table2_column_type::text,
        junction_count;
END;
$$;


ALTER FUNCTION "public"."inspect_junction_table"("junction_table" "text", "table1" "text", "table2" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inspect_table_structure"("table_name" "text") RETURNS TABLE("column_name" "text", "data_type" "text", "is_nullable" boolean, "is_primary" boolean)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        c.column_name::text, 
        c.data_type::text,
        CASE WHEN c.is_nullable = 'YES' THEN true ELSE false END as is_nullable,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary
    FROM 
        information_schema.columns c
    LEFT JOIN (
        SELECT 
            tc.table_schema, 
            tc.table_name, 
            ccu.column_name
        FROM 
            information_schema.table_constraints tc
        JOIN 
            information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE 
            tc.constraint_type = 'PRIMARY KEY'
    ) pk ON 
        c.table_schema = pk.table_schema 
        AND c.table_name = pk.table_name 
        AND c.column_name = pk.column_name
    WHERE 
        c.table_schema = 'public' 
        AND c.table_name = table_name
    ORDER BY 
        c.ordinal_position;
END;
$$;


ALTER FUNCTION "public"."inspect_table_structure"("table_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_valid_uuid"("str" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN (str ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$_$;


ALTER FUNCTION "public"."is_valid_uuid"("str" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."migrate_employee_disciplines"("p_employee_id" integer) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- Insert into the new table from the old one using the mapping
    INSERT INTO employee_disciplines_new (employee_id, discipline_id)
    SELECT 
        ed.employee_id, 
        dm.new_id
    FROM 
        employee_disciplines ed
    JOIN 
        disciplines_id_map dm ON ed.discipline_id = dm.old_id
    WHERE 
        ed.employee_id = p_employee_id
    AND 
        NOT EXISTS (
            SELECT 1 FROM employee_disciplines_new 
            WHERE employee_id = ed.employee_id AND discipline_id = dm.new_id
        );
        
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."migrate_employee_disciplines"("p_employee_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_families_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_families_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "is_ad_manager" boolean DEFAULT false
);


ALTER TABLE "public"."admins" OWNER TO "postgres";


COMMENT ON TABLE "public"."admins" IS 'Table to track users with admin privileges';



COMMENT ON COLUMN "public"."admins"."is_ad_manager" IS 'True if this admin user only has ad manager permissions (cannot access full admin console)';



CREATE TABLE IF NOT EXISTS "public"."band_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "band_id" "uuid" NOT NULL,
    "contact_id" "uuid" NOT NULL,
    "enrollment_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."band_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bands" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "leader_id" "uuid",
    "avatar_url" "text",
    "avatar_key" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "bands_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."bands" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "first_name" character varying(100) NOT NULL,
    "last_name" character varying(100) NOT NULL,
    "email" character varying(255),
    "phone" character varying(20),
    "date_of_birth" "date",
    "avatar_url" "text",
    "avatar_key" "text",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."digital_signs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "left_location_id" "uuid",
    "right_location_id" "uuid",
    "background_image_url" "text",
    "background_image_key" "text",
    "background_mask_opacity" numeric(3,2) DEFAULT 0.3,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."digital_signs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."disciplines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "position" integer,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "icon" character varying(100) DEFAULT 'music'::character varying
);


ALTER TABLE "public"."disciplines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_disciplines" (
    "employee_id" "uuid" NOT NULL,
    "discipline_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."employee_disciplines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "avatar_url" "text",
    "avatar_key" "text",
    "hire_date" "date",
    "employment_type" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "role_id" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "email" "text"
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contact_id" "uuid",
    "discipline_id" "uuid",
    "service_id" "uuid",
    "start_date" "date" NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "service_variation_id" "uuid",
    "instructor_id" "uuid"
);


ALTER TABLE "public"."enrollments" OWNER TO "postgres";


COMMENT ON TABLE "public"."enrollments" IS 'Student enrollments in services with assigned instructors';



CREATE TABLE IF NOT EXISTS "public"."event_instructors" (
    "event_id" "uuid" NOT NULL,
    "instructor_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'instructor'::"text",
    "is_substitute" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."event_instructors" OWNER TO "postgres";


COMMENT ON TABLE "public"."event_instructors" IS 'Junction table for events and instructors. This is the single source of truth for event-instructor relationships, supporting multiple instructors per event with roles.';



CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "start_time" timestamp with time zone NOT NULL,
    "duration" integer NOT NULL,
    "event_type" "text",
    "discipline_id" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "recurrence_type" "text" DEFAULT 'none'::"text",
    "recurrence_days" integer[],
    "recurrence_start_date" timestamp with time zone,
    "recurrence_end_date" timestamp with time zone,
    "excluded_dates" "text"[],
    "occurrence_statuses" "jsonb",
    "parent_event_id" "uuid",
    "is_occurrence" boolean DEFAULT false,
    "occurrence_date" "text",
    "original_event_id" "uuid",
    "location_id" "uuid",
    "enrollment_id" "uuid",
    "band_id" "uuid",
    "status" "text" DEFAULT 'scheduled'::"text",
    "format" "text" DEFAULT 'facility'::"text",
    "is_reschedule" boolean DEFAULT false,
    "rescheduled_from_id" "uuid"
);


ALTER TABLE "public"."events" OWNER TO "postgres";


COMMENT ON TABLE "public"."events" IS 'Calendar events. Instructors are now linked exclusively via the event_instructors junction table to support multiple instructors per event.';



CREATE TABLE IF NOT EXISTS "public"."families" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_name" character varying(255) NOT NULL,
    "primary_contact_id" "uuid",
    "contact_ids" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."families" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contact_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "due_date" "date",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."location_disciplines" (
    "location_id" "uuid" NOT NULL,
    "discipline_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."location_disciplines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."location_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."location_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "capacity" integer,
    "position" integer,
    "type_id" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone,
    "username" "text",
    "full_name" "text",
    "avatar_url" "text",
    "website" "text",
    "subscription" "public"."subscription_type" DEFAULT 'none'::"public"."subscription_type",
    "email" "text",
    "first_name" "text",
    "last_name" "text",
    "customer_id" "text",
    "subscription_expiration" timestamp with time zone,
    "trial_expiration" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."subscription" IS 'User subscription type: none, monthly, annual, lifetime, admin, ad_manager';



CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_variations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "price_type" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."service_variations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "duration" integer,
    "image_url" "text",
    "image_key" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "service_type" "text",
    CONSTRAINT "services_service_type_check" CHECK ((("service_type" = ANY (ARRAY['lesson'::"text", 'workshop'::"text", 'event'::"text", 'band'::"text"])) OR ("service_type" IS NULL)))
);


ALTER TABLE "public"."services" OWNER TO "postgres";


COMMENT ON TABLE "public"."services" IS 'Services with type information';



CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true,
    "device_token" "text",
    "device_info" "text",
    "last_activity" timestamp with time zone,
    "terminated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "permission" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."user_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "password" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "role" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "role_enum" "public"."user_role"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."role" IS 'Legacy text role column. Will be deprecated in favor of role_enum.';



COMMENT ON COLUMN "public"."users"."role_enum" IS 'New enum-based role column. Use this instead of the text role column.';



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_user_key" UNIQUE ("user");



ALTER TABLE ONLY "public"."band_members"
    ADD CONSTRAINT "band_members_band_id_contact_id_key" UNIQUE ("band_id", "contact_id");



ALTER TABLE ONLY "public"."band_members"
    ADD CONSTRAINT "band_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bands"
    ADD CONSTRAINT "bands_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_new_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."digital_signs"
    ADD CONSTRAINT "digital_signs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."disciplines"
    ADD CONSTRAINT "disciplines_new_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_disciplines"
    ADD CONSTRAINT "employee_disciplines_new_pkey" PRIMARY KEY ("employee_id", "discipline_id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_new_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_new_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_instructors"
    ADD CONSTRAINT "event_instructors_pkey" PRIMARY KEY ("event_id", "instructor_id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_new_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."families"
    ADD CONSTRAINT "families_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_new_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."location_disciplines"
    ADD CONSTRAINT "location_disciplines_uuid_pkey" PRIMARY KEY ("location_id", "discipline_id");



ALTER TABLE ONLY "public"."location_types"
    ADD CONSTRAINT "location_types_new_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_new_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_new_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_variations"
    ADD CONSTRAINT "service_variations_new_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_new_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_new_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_key_unique" UNIQUE ("key");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_new_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_new_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_new_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_admins_is_ad_manager" ON "public"."admins" USING "btree" ("is_ad_manager");



CREATE INDEX "idx_band_members_band_id" ON "public"."band_members" USING "btree" ("band_id");



CREATE INDEX "idx_band_members_contact_id" ON "public"."band_members" USING "btree" ("contact_id");



CREATE INDEX "idx_band_members_enrollment_id" ON "public"."band_members" USING "btree" ("enrollment_id");



CREATE INDEX "idx_bands_leader_id" ON "public"."bands" USING "btree" ("leader_id");



CREATE INDEX "idx_contacts_email" ON "public"."contacts" USING "btree" ("email");



CREATE INDEX "idx_contacts_name" ON "public"."contacts" USING "btree" ("last_name", "first_name");



CREATE INDEX "idx_digital_signs_left_location" ON "public"."digital_signs" USING "btree" ("left_location_id");



CREATE INDEX "idx_digital_signs_name" ON "public"."digital_signs" USING "btree" ("name");



CREATE INDEX "idx_digital_signs_right_location" ON "public"."digital_signs" USING "btree" ("right_location_id");



CREATE INDEX "idx_employee_disciplines_discipline_id" ON "public"."employee_disciplines" USING "btree" ("discipline_id");



CREATE INDEX "idx_employee_disciplines_employee_id" ON "public"."employee_disciplines" USING "btree" ("employee_id");



CREATE INDEX "idx_enrollments_instructor_id" ON "public"."enrollments" USING "btree" ("instructor_id");



CREATE INDEX "idx_event_instructors_event_id" ON "public"."event_instructors" USING "btree" ("event_id");



CREATE INDEX "idx_event_instructors_instructor_id" ON "public"."event_instructors" USING "btree" ("instructor_id");



CREATE INDEX "idx_event_instructors_role" ON "public"."event_instructors" USING "btree" ("role");



CREATE INDEX "idx_events_band_id" ON "public"."events" USING "btree" ("band_id");



CREATE INDEX "idx_events_format" ON "public"."events" USING "btree" ("format");



CREATE INDEX "idx_events_is_reschedule" ON "public"."events" USING "btree" ("is_reschedule");



CREATE INDEX "idx_events_location_id" ON "public"."events" USING "btree" ("location_id");



CREATE INDEX "idx_events_occurrence_date" ON "public"."events" USING "btree" ("occurrence_date");



CREATE INDEX "idx_events_original_event_id" ON "public"."events" USING "btree" ("original_event_id");



CREATE INDEX "idx_events_parent_event_id" ON "public"."events" USING "btree" ("parent_event_id");



CREATE INDEX "idx_events_recurrence_type" ON "public"."events" USING "btree" ("recurrence_type");



CREATE INDEX "idx_events_rescheduled_from_id" ON "public"."events" USING "btree" ("rescheduled_from_id");



CREATE INDEX "idx_events_status" ON "public"."events" USING "btree" ("status");



CREATE INDEX "idx_services_service_type" ON "public"."services" USING "btree" ("service_type");



CREATE OR REPLACE TRIGGER "ensure_primary_contact_in_family_trigger" BEFORE INSERT OR UPDATE ON "public"."families" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_primary_contact_in_family"();



CREATE OR REPLACE TRIGGER "set_families_updated_at" BEFORE UPDATE ON "public"."families" FOR EACH ROW EXECUTE FUNCTION "public"."update_families_updated_at"();



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_user_fkey" FOREIGN KEY ("user") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."band_members"
    ADD CONSTRAINT "band_members_band_id_fkey" FOREIGN KEY ("band_id") REFERENCES "public"."bands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."band_members"
    ADD CONSTRAINT "band_members_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."band_members"
    ADD CONSTRAINT "band_members_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bands"
    ADD CONSTRAINT "bands_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."digital_signs"
    ADD CONSTRAINT "digital_signs_left_location_id_fkey" FOREIGN KEY ("left_location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."digital_signs"
    ADD CONSTRAINT "digital_signs_right_location_id_fkey" FOREIGN KEY ("right_location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_new_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_new_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_new_discipline_id_fkey" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_new_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_instructors"
    ADD CONSTRAINT "event_instructors_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_instructors"
    ADD CONSTRAINT "event_instructors_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_band_id_fkey" FOREIGN KEY ("band_id") REFERENCES "public"."bands"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_new_discipline_id_fkey" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_original_event_id_fkey" FOREIGN KEY ("original_event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_parent_event_id_fkey" FOREIGN KEY ("parent_event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_rescheduled_from_id_fkey" FOREIGN KEY ("rescheduled_from_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_new_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."location_disciplines"
    ADD CONSTRAINT "location_disciplines_uuid_discipline_id_fkey" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."location_disciplines"
    ADD CONSTRAINT "location_disciplines_uuid_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_new_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "public"."location_types"("id");



ALTER TABLE ONLY "public"."service_variations"
    ADD CONSTRAINT "service_variations_new_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_new_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_new_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



CREATE POLICY "Allow all operations for authenticated users" ON "public"."profiles" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users" ON "public"."employee_disciplines" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users" ON "public"."employees" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users" ON "public"."enrollments" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users" ON "public"."events" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users" ON "public"."invoices" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users" ON "public"."location_disciplines" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users" ON "public"."location_types" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users" ON "public"."locations" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users" ON "public"."roles" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users" ON "public"."service_variations" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users" ON "public"."services" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users" ON "public"."sessions" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users" ON "public"."settings" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users" ON "public"."user_permissions" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users" ON "public"."users" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to delete digital signs" ON "public"."digital_signs" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete their families" ON "public"."families" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to insert digital signs" ON "public"."digital_signs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert families" ON "public"."families" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to read admins" ON "public"."admins" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to read digital signs" ON "public"."digital_signs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to read families" ON "public"."families" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to update digital signs" ON "public"."digital_signs" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to update their families" ON "public"."families" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow delete for testing" ON "public"."families" FOR DELETE TO "anon" USING (true);



CREATE POLICY "Allow full access for authenticated users" ON "public"."employee_disciplines" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow insert for testing" ON "public"."families" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Allow insert/update/delete for authenticated users" ON "public"."disciplines" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow read access for anonymous users" ON "public"."families" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow update for testing" ON "public"."families" FOR UPDATE TO "anon" USING (true);



CREATE POLICY "Allow users to update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Enable delete for authenticated users only" ON "public"."band_members" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable delete for authenticated users only" ON "public"."bands" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."band_members" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."bands" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for all users" ON "public"."band_members" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."bands" FOR SELECT USING (true);



CREATE POLICY "Enable update for authenticated users only" ON "public"."band_members" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable update for authenticated users only" ON "public"."bands" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."admins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anon_all_operations_policy" ON "public"."events" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "anon_select_policy" ON "public"."disciplines" FOR SELECT USING (true);



CREATE POLICY "anon_select_policy" ON "public"."employee_disciplines" FOR SELECT USING (true);



CREATE POLICY "anon_select_policy" ON "public"."employees" FOR SELECT USING (true);



CREATE POLICY "anon_select_policy" ON "public"."enrollments" FOR SELECT USING (true);



CREATE POLICY "anon_select_policy" ON "public"."invoices" FOR SELECT USING (true);



CREATE POLICY "anon_select_policy" ON "public"."location_disciplines" FOR SELECT USING (true);



CREATE POLICY "anon_select_policy" ON "public"."location_types" FOR SELECT USING (true);



CREATE POLICY "anon_select_policy" ON "public"."locations" FOR SELECT USING (true);



CREATE POLICY "anon_select_policy" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "anon_select_policy" ON "public"."roles" FOR SELECT USING (true);



CREATE POLICY "anon_select_policy" ON "public"."service_variations" FOR SELECT USING (true);



CREATE POLICY "anon_select_policy" ON "public"."services" FOR SELECT USING (true);



CREATE POLICY "anon_select_policy" ON "public"."sessions" FOR SELECT USING (true);



CREATE POLICY "anon_select_policy" ON "public"."settings" FOR SELECT USING (true);



CREATE POLICY "anon_select_policy" ON "public"."user_permissions" FOR SELECT USING (true);



CREATE POLICY "anon_select_policy" ON "public"."users" FOR SELECT USING (true);



ALTER TABLE "public"."band_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bands" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."digital_signs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."disciplines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_disciplines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."enrollments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."families" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."location_disciplines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."location_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_variations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT ALL ON SCHEMA "public" TO PUBLIC;











































































































































































GRANT ALL ON FUNCTION "public"."create_families_table"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_families_table"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_families_table"() TO "service_role";



GRANT ALL ON FUNCTION "public"."discipline_exists"("p_discipline_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."discipline_exists"("p_discipline_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."discipline_exists"("p_discipline_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_primary_contact_in_family"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_primary_contact_in_family"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_primary_contact_in_family"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_discipline_id"("p_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_discipline_id"("p_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_discipline_id"("p_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_employee_discipline_names"("p_employee_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_employee_discipline_names"("p_employee_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_employee_discipline_names"("p_employee_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_employee_disciplines"("p_employee_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_employee_disciplines"("p_employee_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_employee_disciplines"("p_employee_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_employee_id"("p_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_employee_id"("p_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_employee_id"("p_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_enrollment_id"("p_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_enrollment_id"("p_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_enrollment_id"("p_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_entity_by_id"("p_id" "text", "p_table_name" "text", "p_id_map_table" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_entity_by_id"("p_id" "text", "p_table_name" "text", "p_id_map_table" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_entity_by_id"("p_id" "text", "p_table_name" "text", "p_id_map_table" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_event_id"("p_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_event_id"("p_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_event_id"("p_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_invoice_id"("p_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_invoice_id"("p_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_invoice_id"("p_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_location_id"("p_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_location_id"("p_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_location_id"("p_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_location_type_id"("p_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_location_type_id"("p_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_location_type_id"("p_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_role_id"("p_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_role_id"("p_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_role_id"("p_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_service_id"("p_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_service_id"("p_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_service_id"("p_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_service_variation_id"("p_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_service_variation_id"("p_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_service_variation_id"("p_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_setting_id"("p_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_setting_id"("p_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_setting_id"("p_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_id"("p_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_id"("p_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_id"("p_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_permission_id"("p_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_permission_id"("p_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_permission_id"("p_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_families_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_families_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_families_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."inspect_junction_table"("junction_table" "text", "table1" "text", "table2" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."inspect_junction_table"("junction_table" "text", "table1" "text", "table2" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inspect_junction_table"("junction_table" "text", "table1" "text", "table2" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."inspect_table_structure"("table_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."inspect_table_structure"("table_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inspect_table_structure"("table_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_valid_uuid"("str" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_valid_uuid"("str" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_valid_uuid"("str" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."migrate_employee_disciplines"("p_employee_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."migrate_employee_disciplines"("p_employee_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."migrate_employee_disciplines"("p_employee_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_families_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_families_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_families_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."admins" TO "anon";
GRANT ALL ON TABLE "public"."admins" TO "authenticated";
GRANT ALL ON TABLE "public"."admins" TO "service_role";



GRANT ALL ON TABLE "public"."band_members" TO "anon";
GRANT ALL ON TABLE "public"."band_members" TO "authenticated";
GRANT ALL ON TABLE "public"."band_members" TO "service_role";



GRANT ALL ON TABLE "public"."bands" TO "anon";
GRANT ALL ON TABLE "public"."bands" TO "authenticated";
GRANT ALL ON TABLE "public"."bands" TO "service_role";



GRANT ALL ON TABLE "public"."contacts" TO "anon";
GRANT ALL ON TABLE "public"."contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."contacts" TO "service_role";



GRANT ALL ON TABLE "public"."digital_signs" TO "anon";
GRANT ALL ON TABLE "public"."digital_signs" TO "authenticated";
GRANT ALL ON TABLE "public"."digital_signs" TO "service_role";



GRANT ALL ON TABLE "public"."disciplines" TO "anon";
GRANT ALL ON TABLE "public"."disciplines" TO "authenticated";
GRANT ALL ON TABLE "public"."disciplines" TO "service_role";



GRANT ALL ON TABLE "public"."employee_disciplines" TO "anon";
GRANT ALL ON TABLE "public"."employee_disciplines" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_disciplines" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."enrollments" TO "anon";
GRANT ALL ON TABLE "public"."enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."event_instructors" TO "anon";
GRANT ALL ON TABLE "public"."event_instructors" TO "authenticated";
GRANT ALL ON TABLE "public"."event_instructors" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."families" TO "anon";
GRANT ALL ON TABLE "public"."families" TO "authenticated";
GRANT ALL ON TABLE "public"."families" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."location_disciplines" TO "anon";
GRANT ALL ON TABLE "public"."location_disciplines" TO "authenticated";
GRANT ALL ON TABLE "public"."location_disciplines" TO "service_role";



GRANT ALL ON TABLE "public"."location_types" TO "anon";
GRANT ALL ON TABLE "public"."location_types" TO "authenticated";
GRANT ALL ON TABLE "public"."location_types" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."service_variations" TO "anon";
GRANT ALL ON TABLE "public"."service_variations" TO "authenticated";
GRANT ALL ON TABLE "public"."service_variations" TO "service_role";



GRANT ALL ON TABLE "public"."services" TO "anon";
GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";



GRANT ALL ON TABLE "public"."sessions" TO "anon";
GRANT ALL ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_permissions" TO "anon";
GRANT ALL ON TABLE "public"."user_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
