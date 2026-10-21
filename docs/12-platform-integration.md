# 12 Platform integration notes

> Researched 2026-10-21. Most sources are third-party summaries; official pages were not all opened. Treat everything here as [Unverified] until checked against the platform's own documentation for the Malaysian market.

## Summary

| Platform | What I found | What I did not find |
|---|---|---|
| Shopee | A chat module exists in the Open Platform API (conversation list, read messages, send message, auto-reply, and more) and a push mechanism for notifications. Authorization is OAuth with access and refresh tokens, per shop. Chat endpoints need a separate permission, and not every developer account gets chat access automatically. Authorizations can expire and must be renewed | Whether a Malaysian shop of Mom's type is eligible; the approval process and documents; chat permission rules for this account type. A Thai developer guide from 2022 said the API there was limited to some seller types, so the rules differ by country |
| TikTok Shop | A Customer Service API exists in the Partner Center as a custom API, meant to forward buyer messages to a third-party support system. It is inactive by default and needs approval. New messages arrive as a NEW_MESSAGE webhook event; messages can also be fetched with the Get Conversation Messages call (scope seller.customer_service). There is a "seller in-house developer" type for building a custom app for your own shop. It is not for ordinary TikTok direct messages | Whether the Customer Service API is available in the Malaysian market; the exact approval rules |
| SiteGiant | An ERP for Malaysian marketplace sellers (Shopee, Lazada, TikTok Shop) that syncs orders and inventory | Whether it has an open API for third parties, and which exports it offers |

## Shopee: steps to try [Proposed]

1. Register an Open Platform developer account. Account types mentioned in the sources: individual seller, seller in-house system, third-party partner platform (ISV). Pick the one that fits own-shop use; confirm in the console.
2. Create an app and note the partner ID and key (test keys first, sandbox).
3. Request the chat permission and see whether it is offered for this account.
4. Ask Mom to authorize the app on her shop through the official authorization link.
5. Build against the sandbox; request go-live when ready.
6. Track the authorization expiry date and plan re-authorization.

## TikTok Shop: steps to try [Proposed]

1. Register in the Partner Center for the Malaysian market as a seller (in-house) developer.
2. Create a custom app; open Manage API and add the customer service scope; request approval for the Customer Service API.
3. Ask Mom (shop admin) to authorize the app on her shop.
4. Subscribe to the NEW_MESSAGE event and return a success response quickly; fetch messages with the conversation calls; deduplicate by message ID.
5. Run a catch-up pull to recover from missed events.

## Questions to ask the platforms (support ticket or partner manager)

| Question |
|---|
| Is the chat or customer service API available for a Malaysian shop of this type, and for an own-shop developer account? |
| What documents and review steps are needed, and how long does it take? |
| Do the terms allow processing buyer messages with an AI model, and sending them to an external model provider? |
| May an own-shop app send replies through the API, and are there limits (rate, volume, window)? |
| What data retention or deletion rules apply to buyer messages? |
| Which message types are returned as text, and which are not? |

## Order data options

| Option | Notes |
|---|---|
| Platform order APIs | Direct, per platform; order IDs differ between platforms |
| SiteGiant export (CSV) | Likely the quickest start; manual until automated |
| SiteGiant API | Ask SiteGiant whether it exists |

Whatever is chosen, keep a mapping between the platform order ID and the SiteGiant order number.

## Sources

- TikTok Shop Partner Center, Customer Service API overview: https://partner.tiktokshop.com/docv2/page/customer-service-api-overview
- TikTok Shop Partner Center, Get Conversation Messages: https://partner.tiktokshop.com/docv2/page/650a587edefece02be664cd2
- TikTok Shop customer service webhooks guide (third party): https://dev.to/unifyport/tiktok-shop-customer-service-webhooks-a-production-ready-implementation-guide-2cid
- TikTok Shop app setup notes (third party): https://developers.apideck.com/apis/ecommerce/tiktok/configuration
- TikTok Shop connection guide (third party): https://ottokit.com/docs/connect-tiktok-shop-to-ottokit/
- Shopee Open Platform documents: https://open.shopee.com/documents
- Shopee Thailand developer guide, 2022 (third-party host): https://deo.shopeemobile.com/shopee/cms_cdn_bucket/ecb708f5284142ceb68be4a84f6cf5a4_TH_SEH_Open%20API_Developer%20Guide_v2.1_20220722.pdf
- Shopee chat endpoints as listed in an SDK: https://app.unpkg.com/shopee-openapi-v2@1.0.39/files/dist/chat.js
- Shopee API overview (third party): https://api2cart.com/api-technology/shopee-api/
- Shopee Malaysia seller centre, authorization expiry: https://seller.shopee.com.my/edu/article/3642
- SiteGiant: https://sitegiant.my/?p=57962
