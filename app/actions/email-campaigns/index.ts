// Export all email campaign actions
// Note: "use server" is not needed here since we're just re-exporting from files that already have "use server"
export { getCampaigns, getCampaign } from './campaigns';
export { getTemplates, getTemplate } from './templates';
export { getAudiences, createAudience, getAudience, updateAudience, deleteAudience } from './audiences';
export { getAudienceSubscribers, addAudienceSubscriber, removeAudienceSubscriber, getSubscriberAudienceMemberships } from './audience-subscribers';
export { getSubscribers, getSubscriber } from './subscribers';
export { getAnalytics } from './analytics';
export { getDeliverability } from './deliverability';
export { calculateReach, calculateBatchReach } from './reach';
export { sendCampaign } from './send';
// Do not export media.ts here — it imports sharp (~100MB+ native). Import from
// @/app/actions/email-campaigns/media only where needed (Vercel 250MB limit).

// Export types
export type { GetCampaignsParams, Campaign, GetCampaignsResponse, GetCampaignResponse } from './campaigns';
export type { GetTemplatesParams, EmailTemplate as Template, GetTemplatesResponse, GetTemplateResponse } from './templates';
export type { GetAudiencesParams, EmailAudience, GetAudiencesResponse, CreateAudienceParams, CreateAudienceResponse, GetAudienceResponse, UpdateAudienceParams, UpdateAudienceResponse } from './audiences';
export type { GetAudienceSubscribersParams, AudienceSubscriber, GetAudienceSubscribersResponse, AddAudienceSubscriberParams, AddAudienceSubscriberResponse, GetSubscriberAudienceMembershipsResponse } from './audience-subscribers';
export type { GetSubscribersParams, Subscriber, GetSubscribersResponse, GetSubscriberResponse } from './subscribers';
export type { GetAnalyticsParams, AnalyticsData, GetAnalyticsResponse } from './analytics';
export type { DeliverabilityData } from './deliverability';
export type { CalculateReachParams, CalculateReachResponse, CalculateBatchReachParams, CalculateBatchReachResponse } from './reach';
export type { SendCampaignParams, SendCampaignResponse } from './send';

