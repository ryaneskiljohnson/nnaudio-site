# Meta Marketing API: Ad Creation (Ad Manager alignment)

Parameter alignment for **creating an ad** via the Marketing API. We support **all Meta-documented Ad Creating parameters**: core fields plus optional fields and `meta_params` passthrough. Request body is **form-encoded** like Meta’s examples.

**Reference:** [Ad Account Ads – Creating](https://developers.facebook.com/docs/marketing-api/reference/ad-account/ads/)

---

## Meta Creating parameters (full coverage)

| Meta parameter | Type | We send (core) | We forward if provided |
|----------------|------|----------------|------------------------|
| `name` | string | Yes | — |
| `adset_id` | int64 | Yes | — |
| `creative` | object | Yes (JSON string) | — |
| `status` | enum | Yes | — |
| `conversion_domain` | string | If provided | — |
| `ad_schedule_start_time` | datetime | If provided | — |
| `ad_schedule_end_time` | datetime | If provided | — |
| `adlabels` | list | — | Yes |
| `tracking_specs` | object | — | Yes |
| `execution_options` | list | — | Yes |
| Any other Meta Creating param | — | — | Yes via `meta_params` |

So **all Meta ad Creating settings** are supported; use typed fields or `meta_params` to pass any documented parameter.

---

## Request format

Meta’s examples use **application/x-www-form-urlencoded** for POST. Our `createAd()` sends the same: `access_token`, `name`, `adset_id`, `creative` (JSON string), `status`, and any optional parameters as form fields.
