/**
 * @fileoverview One-off script to delete all Facebook/Meta campaigns for the connected ad account.
 * Deleting a campaign in Meta also removes its ad sets and ads. Requires FACEBOOK_ACCESS_TOKEN
 * and FACEBOOK_AD_ACCOUNT_ID in .env.local (e.g. copy token from browser cookie after logging in
 * to Ad Manager, or use Graph API Explorer).
 * @module scripts/delete-all-facebook-campaigns
 */
import { config } from 'dotenv';
import { createFacebookAPI } from '../utils/facebook/api';

config({ path: '.env.local' });

async function main() {
  const mockConnection = process.env.FACEBOOK_MOCK_CONNECTION === 'true';
  const token = process.env.FACEBOOK_ACCESS_TOKEN ?? null;
  const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID ?? null;

  if (mockConnection) {
    console.log('FACEBOOK_MOCK_CONNECTION is true. No live API calls; nothing to delete.');
    process.exit(0);
  }

  if (!token) {
    console.error(
      'FACEBOOK_ACCESS_TOKEN is not set. Set it in .env.local (e.g. copy from browser cookie after logging in to Ad Manager, or use Graph API Explorer).'
    );
    process.exit(1);
  }

  if (!adAccountId) {
    console.error(
      'FACEBOOK_AD_ACCOUNT_ID is not set. Set it in .env.local (e.g. act_123456789).'
    );
    process.exit(1);
  }

  const getToken = () => process.env.FACEBOOK_ACCESS_TOKEN ?? null;
  const api = createFacebookAPI(adAccountId, getToken);
  if (!api) {
    console.error('Failed to create Facebook API client.');
    process.exit(1);
  }

  console.log('Fetching all campaigns...');
  const campaigns = await api.getCampaigns();
  const activeOrPaused = campaigns.filter(
    (c) => c.status?.toUpperCase() === 'ACTIVE' || c.status?.toUpperCase() === 'PAUSED'
  );

  if (activeOrPaused.length === 0) {
    console.log('No active or paused campaigns found. Nothing to delete.');
    process.exit(0);
  }

  console.log(`Found ${activeOrPaused.length} campaign(s) to delete.`);
  for (const campaign of activeOrPaused) {
    try {
      await api.deleteCampaign(campaign.id);
      console.log(`  Deleted campaign: ${campaign.name} (${campaign.id})`);
    } catch (err) {
      console.error(`  Failed to delete ${campaign.name} (${campaign.id}):`, err);
    }
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
