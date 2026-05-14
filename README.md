# KripHub

Expo + React Native + TypeScript app for a private encrypted media gallery backed by Supabase.

## Product Definition

- [KripHub functional and technical specification](docs/kriphub-spec.md)

## Stack

- Expo SDK 54
- React Native
- TypeScript strict mode
- Expo Router
- NativeWind
- Supabase Auth
- Supabase private Storage
- Supabase Row Level Security
- Supabase Edge Functions
- Expo Secure Store

## Supabase Project

- Project ref: `ymwlymasveorwpaexyql`
- URL: `https://ymwlymasveorwpaexyql.supabase.co`
- Private bucket: `encrypted-media`

## Security Shape

- Media is encrypted on-device with AES-256-GCM before upload.
- Supabase Storage only receives `.enc` ciphertext in the private `encrypted-media` bucket.
- Each media item gets a random `media_key`.
- `media_key` is never stored in cleartext in Supabase.
- Access codes are high-entropy, normalized, hashed, and validated by an Edge Function.
- `encrypted_media_key` wraps each media key with a key derived from the access code.
- The app unwraps keys and decrypts files locally.
- Expo Secure Store keeps temporary sensitive material.
- Local keys/cache are cleared on logout and expired local entries are pruned.
- The service role key belongs only in Supabase Edge Functions, never in Expo.

The current media service reads files into memory before encrypting. For production-scale videos, keep the same cryptographic model but move to chunked encryption/decryption to reduce peak memory.

## App Routes

- `/(auth)/login`
- `/(auth)/register`
- `/(main)/gallery`
- `/(main)/unlock-code`
- `/(main)/folder/[id]`
- `/(main)/image/[id]`
- `/(main)/video/[id]`
- `/(main)/access`
- `/(main)/profile`
- `/(owner)/create-folder`
- `/(owner)/upload-media`
- `/(owner)/generate-code`
- `/(owner)/manage-access`

Route groups are protected by the root Expo Router layout. Authenticated users can be both receivers and owners.

## Setup

1. Copy `.env.example` to `.env`.
2. Fill `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with the Supabase publishable or anon key.
3. Apply the migration in `supabase/migrations`.
4. Deploy the Edge Function:

```bash
supabase functions deploy validate-access-code --project-ref ymwlymasveorwpaexyql
```

5. Disable email confirmation in Supabase Auth if you want nickname/password accounts to be usable immediately with the private email alias strategy.

## Local Commands

```bash
npm start
npm run start:web
npm run ios
npm run android
npm run web
npm run typecheck
npm run check:edge
```

For NativeWind cache issues:

```bash
npx expo start --clear
```

## Deploy Web To GitHub Pages

This repo deploys the Expo web app to GitHub Pages on every push to `main`.

Production structure:

- GitHub Pages URL: `https://marquesedition.github.io/KripHub`
- Build output: Expo web export to `dist/`
- SPA fallback: `dist/404.html` copied from `dist/index.html`
- Workflow: `.github/workflows/deploy-pages.yml`

Repository setup required in GitHub:

1. In the repo settings, enable GitHub Pages with GitHub Actions as the source.
2. Add these repository secrets:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
EXPO_PUBLIC_ENCRYPTED_MEDIA_BUCKET
```

3. If the repo needs auto-enablement for Pages, also add:

```text
PAGES_ADMIN_PAT
```

Local production export:

```bash
npm run web:export
```

## First Delivery Contents

- Expo Router app routes with protected auth/main/owner groups.
- NativeWind configuration and base UI components.
- Supabase JS Auth configured for React Native storage.
- Nickname/password auth using private email aliases.
- Client crypto service using AES-GCM via `@noble/ciphers`.
- Expo Secure Store temporary key cache.
- Encrypted media upload/download services.
- Folder gallery, unlock code, media viewer, video player, access list, and profile screens.
- Owner screens for folder creation, encrypted upload, access-code generation, and access management.
- Initial SQL schema, RLS policies, private Storage bucket policy.
- Edge Function for authenticated access-code validation with rate limiting.
