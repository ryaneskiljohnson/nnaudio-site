# Meta Marketing API: Ad Set Creation (Ad Manager alignment)

This document summarizes **Meta’s official requirements** for creating an ad set and how our Ad Manager implements them. All behavior is aligned with Meta’s reference.

**Reference:** [Ad Account Adsets – Creating](https://developers.facebook.com/docs/marketing-api/reference/ad-account/adsets/)

---

## Required parameters (Meta)

| Parameter       | Description |
|----------------|-------------|
| `name`         | Ad set name (max 400 characters). |
| `campaign_id`  | ID of the campaign this ad set belongs to. |
| `targeting`    | Targeting spec; **`geo_locations.countries` is required**. |
| Budget         | **Either** `daily_budget` **or** `lifetime_budget` must be &gt; 0 (in account currency, e.g. cents for USD). |

---

## Daily budget rules (Meta)

- **Daily budget** is “allowed only for ad sets with a duration (difference between `end_time` and `start_time`) longer than 24 hours,” **or** you can set the ad set to be **ongoing**.
- **Ongoing:** “When creating a set with a daily budget, specify **`end_time=0`** to set the set to be ongoing and have no end date.”
- So for **daily budget** we either:
  - Send `start_time` and `end_time` (ISO 8601 with timezone) with duration &gt; 24h, or  
  - Send `start_time` = now and **`end_time=0`** for no end date.

---

## Lifetime budget (Meta)

- If you use **`lifetime_budget`**, you **must** also specify **`end_time`**.

---

## Targeting (Meta)

- **`countries`** inside `geo_locations` is **required**.
- Meta’s examples often include:
  - `facebook_positions`: e.g. `["feed"]`
  - `publisher_platforms`: e.g. `["facebook", "audience_network"]`

So the minimal compliant targeting is:

```json
{
  "geo_locations": { "countries": ["US"] }
}
```

Recommended (matches Meta examples):

```json
{
  "facebook_positions": ["feed"],
  "geo_locations": { "countries": ["US"] },
  "publisher_platforms": ["facebook", "audience_network"]
}
```

---

## Status (Meta)

- For **creation**, only **`ACTIVE`** and **`PAUSED`** are valid.

---

## Our implementation (`utils/facebook/api.ts`)

1. **Targeting**  
   We default to Meta’s recommended structure: `facebook_positions: ["feed"]`, `geo_locations: { countries: ["US"] }`, `publisher_platforms: ["facebook", "audience_network"]`. If the client sends `targeting`, we merge it with this default and ensure `geo_locations.countries` is set (fallback `["US"]`).

2. **Budget**  
   - If **lifetime_budget** is provided: we send `lifetime_budget` (cents) and `end_time` (user-provided or now + 30 days).  
   - Otherwise: we send **daily_budget** (cents, minimum 100 = $1).

3. **Schedule for daily budget**  
   - If the user provides both **start_time** and **end_time** (valid ISO 8601 with timezone): we send them.  
   - Otherwise we send **`start_time`** = current time (ISO) and **`end_time=0`** so the ad set is **ongoing** per Meta’s docs.

4. **Other fields**  
   - `optimization_goal`: default `LINK_CLICKS`.  
   - `billing_event`: default `LINK_CLICKS` (matches Meta’s example for link-click campaigns).  
   - `special_ad_categories`: we always send `[]` if not provided.  
   - `status`: from client; must be `ACTIVE` or `PAUSED` for create.

5. **API version**  
   We use **v22.0** for Marketing API calls to avoid deprecation (Meta error 2635).

---

## UI (Create Ad Set page)

- Sends: `name`, `campaignId`, `status`, `dailyBudget`, `targeting`, `optimizationGoal`, `billingEvent`, optional `startTime` / `endTime` (as ISO from datetime-local).
- If the user does **not** fill optional dates, the backend uses **ongoing** (`end_time=0`) so creation still complies with Meta.

---

## Meta Creating parameters (full coverage)

We support **all Meta-documented Ad Set Creating parameters**. Core fields are sent by default; optional fields and any other Meta param can be passed via `CreateAdSetParams` or `meta_params` and are forwarded to the API.

| Meta parameter | Type | We send (core) | We forward if provided |
|----------------|------|----------------|------------------------|
| `name` | string | Yes | — |
| `campaign_id` | string | Yes | — |
| `targeting` | object | Yes (with defaults) | — |
| `daily_budget` | int64 (cents) | Yes (or lifetime_budget) | — |
| `lifetime_budget` | int64 (cents) | If provided | — |
| `start_time` | datetime | Yes (or now) | — |
| `end_time` | datetime | Yes (or `0` ongoing) | — |
| `status` | enum | Yes | — |
| `optimization_goal` | enum | Yes (default LINK_CLICKS) | — |
| `billing_event` | enum | Yes (default LINK_CLICKS) | — |
| `special_ad_categories` | array | Yes (`[]` default) | — |
| `bid_strategy` | enum | Yes (default LOWEST_COST_WITHOUT_CAP) | — |
| `bid_amount` | int (cents) | If provided | — |
| `destination_type` | enum | — | Yes |
| `promoted_object` | object | — | Yes |
| `adset_schedule` | list | — | Yes |
| `attribution_spec` | list | — | Yes |
| `daily_spend_cap` | int64 | — | Yes |
| `lifetime_spend_cap` | int64 | — | Yes |
| `execution_options` | list | — | Yes |
| Any other Meta Creating param | — | — | Yes via `meta_params` |

So **all Meta ad set Creating settings** are supported; use typed fields or `meta_params` to pass any documented parameter.

---

## Errors

- Meta errors (e.g. 400) are returned with `error_user_msg` or `message` and surfaced in the Ad Manager UI and in server logs as `Meta createAdSet error:`.
