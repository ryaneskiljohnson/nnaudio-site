"use server";

import { createClient } from '@/utils/supabase/server';
import { requireAdminAction } from '@/utils/auth/action-guards';
import { escapeIlikeContainsForOr } from '@/utils/supabase/ilike-escape';

export interface GetTemplatesParams {
  search?: string;
  type?: string;
  status?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  template_type: string;
  status: string;
  variables: any;
  created_by: string;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  usage_count?: number;
  audienceIds?: string[];
  excludedAudienceIds?: string[];
}

export interface GetTemplatesResponse {
  success: boolean;
  templates: EmailTemplate[];
  total: number;
}

/**
 * Get all email templates (admin only)
 */
export async function getTemplates(
  params?: GetTemplatesParams
): Promise<GetTemplatesResponse> {
  await requireAdminAction();
  try {
    const supabase = await createClient();

    // Note: RLS will enforce admin access - if user is not admin, queries will fail

    // Build query
    let query = supabase
      .from('email_templates')
      .select('id,name,description,subject,template_type,status,variables,created_by,last_used_at,created_at,updated_at')
      .order('updated_at', { ascending: false });

    // Apply filters
    if (params?.search) {
      const s = escapeIlikeContainsForOr(params.search);
      query = query.or(`name.ilike.%${s}%,description.ilike.%${s}%,subject.ilike.%${s}%`);
    }

    if (params?.type && ['welcome', 'newsletter', 'promotional', 'transactional', 'custom'].includes(params.type)) {
      query = query.eq('template_type', params.type as 'custom' | 'welcome' | 'newsletter' | 'promotional' | 'transactional');
    }

    if (params?.status && ['draft', 'active', 'archived'].includes(params.status)) {
      query = query.eq('status', params.status as 'draft' | 'active' | 'archived');
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('Error fetching templates:', error);
      throw new Error('Failed to fetch templates');
    }

    // Calculate usage statistics
    const templateIds = templates?.map((t: any) => t.id) || [];
    const usageStats: Record<string, number> = {};

    if (templateIds.length > 0) {
      const { data: campaigns } = await supabase
        .from('email_campaigns')
        .select('template_id')
        .in('template_id', templateIds);

      campaigns?.forEach((campaign: any) => {
        if (campaign.template_id) {
          usageStats[campaign.template_id] = (usageStats[campaign.template_id] || 0) + 1;
        }
      });
    }

    // Fetch intended audiences
    const templateAudiences: Record<string, { included: string[]; excluded: string[] }> = {};

    if (templateIds.length > 0) {
      const { data: audienceRelations } = await supabase
        .from('email_template_audiences')
        .select('template_id, audience_id, is_excluded')
        .in('template_id', templateIds);

      audienceRelations?.forEach((relation: any) => {
        if (!templateAudiences[relation.template_id]) {
          templateAudiences[relation.template_id] = {
            included: [],
            excluded: [],
          };
        }

        if (relation.is_excluded) {
          templateAudiences[relation.template_id].excluded.push(relation.audience_id);
        } else {
          templateAudiences[relation.template_id].included.push(relation.audience_id);
        }
      });
    }

    // Add usage count and audiences to templates
    const templatesWithUsage = templates?.map((template: any) => ({
      ...template,
      usage_count: usageStats[template.id] || 0,
      type: template.template_type,
      audienceIds: templateAudiences[template.id]?.included || [],
      excludedAudienceIds: templateAudiences[template.id]?.excluded || [],
    })) || [];

    return {
      success: true,
      templates: templatesWithUsage,
      total: templatesWithUsage.length,
    };
  } catch (error) {
    console.error('Error in getTemplates:', error);
    throw error;
  }
}

export interface GetTemplateResponse {
  template: EmailTemplate & {
    htmlContent?: string;
    textContent?: string;
  };
}

/**
 * Get a single email template by ID (admin only)
 */
export async function getTemplate(templateId: string): Promise<GetTemplateResponse> {
  await requireAdminAction();
  try {
    const supabase = await createClient();

    // Note: RLS will enforce admin access - if user is not admin, queries will fail

    // Fetch the template
    const { data: template, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      console.error('Error fetching template:', error);
      if (error.code === 'PGRST116') {
        throw new Error('Template not found');
      }
      throw new Error('Failed to fetch template');
    }

    // Get audience relationships from junction table
    const { data: audienceRelations } = await supabase
      .from('email_template_audiences')
      .select('audience_id, is_excluded')
      .eq('template_id', templateId);

    // Separate included and excluded audiences
    const audienceIds: string[] = [];
    const excludedAudienceIds: string[] = [];

    if (audienceRelations) {
      for (const relation of audienceRelations) {
        if (relation.audience_id) {
          if (relation.is_excluded) {
            excludedAudienceIds.push(relation.audience_id);
          } else {
            audienceIds.push(relation.audience_id);
          }
        }
      }
    }

    // Transform the data for frontend consumption
    const transformedTemplate = {
      ...template,
      subject: template.subject ?? '',
      type: template.template_type,
      htmlContent: template.html_content,
      textContent: template.text_content,
      audienceIds,
      excludedAudienceIds,
    };

    return {
      template: transformedTemplate as GetTemplateResponse['template'],
    };
  } catch (error) {
    console.error('Error in getTemplate:', error);
    throw error;
  }
}

