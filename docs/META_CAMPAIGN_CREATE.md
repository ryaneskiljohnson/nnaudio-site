# Meta Marketing API: Campaign Creation (Ad Manager alignment)

Parameter alignment for **creating a campaign** via the Marketing API. We support **all Meta-documented Creating parameters**: core fields are sent by default; optional fields and any other Meta param can be passed via `CreateCampaignParams` or `meta_params` and are forwarded to the API.

**Reference:** [Ad Account Campaigns – Creating](https://developers.facebook.com/docs/marketing-api/reference/ad-account/campaigns/)

---

## Meta Creating parameters (coverage)

| Meta parameter | Type | We send (core) | We forward if provided |
|----------------|------|----------------|------------------------|
| `name` | string | Yes | — |
| `objective` | enum | Yes | — |
| `status` | enum | Yes | — |
| `special_ad_categories` | array | Yes (`[]` default) | — |
| `buying_type` | string | Yes (default AUCTION) | — |
| `is_adset_budget_sharing_enabled` | — | Yes (`0`) | — |
| `daily_budget` | int64 (cents) | If provided | — |
| `lifetime_budget` | int64 (cents) | If provided | — |
| `start_time` | datetime | If provided | — |
| `end_time` | datetime | If provided | — |
| `spend_cap` | int64 | — | Yes |
| `adlabels` | list | — | Yes |
| `bid_strategy` | enum | — | Yes |
| `promoted_object` | object | — | Yes |
| `execution_options` | list | — | Yes |
| Any other Meta Creating param | — | — | Yes via `meta_params` |

So **all Meta campaign Creating settings** are supported: use the typed fields on `CreateCampaignParams` or pass any documented Meta key in `meta_params` and it will be sent in the form body.

---

## Objective enum (Meta)

Meta allows: `APP_INSTALLS`, `BRAND_AWARENESS`, `CONVERSIONS`, `EVENT_RESPONSES`, `LEAD_GENERATION`, `LINK_CLICKS`, `LOCAL_AWARENESS`, `MESSAGES`, `OFFER_CLAIMS`, `OUTCOME_APP_PROMOTION`, `OUTCOME_AWARENESS`, `OUTCOME_ENGAGEMENT`, `OUTCOME_LEADS`, `OUTCOME_SALES`, `OUTCOME_TRAFFIC`, `PAGE_LIKES`, `POST_ENGAGEMENT`, `PRODUCT_CATALOG_SALES`, `REACH`, `STORE_VISITS`, `VIDEO_VIEWS`.

Our app currently restricts to **OUTCOME_*** objectives in `CAMPAIGN_OBJECTIVES`; the API route validates against that set. To support the full Meta list, extend `CAMPAIGN_OBJECTIVES` and the campaign create UI.
