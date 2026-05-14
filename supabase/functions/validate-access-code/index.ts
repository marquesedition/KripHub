import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

type AccessCodeRow = {
  access_type: 'temporary' | 'permanent';
  collection_id: string;
  duration_minutes: number | null;
  expires_at: string | null;
  id: string;
  max_uses: number | null;
  owner_id: string;
  revoked_at: string | null;
  starts_at: string;
  status: 'active' | 'used' | 'expired' | 'revoked';
  used_count: number;
};

const ATTEMPT_WINDOW_MINUTES = 10;
const MAX_FAILED_ATTEMPTS = 8;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    status,
  });
}

function errorResponse(message: string, status: number) {
  return jsonResponse({ error: message, message }, status);
}

function normalizeAccessCode(code: string) {
  return code.trim().replace(/\s+/g, '').toUpperCase();
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function hashAccessCode(code: string) {
  return sha256Hex(`kriphub:v1:${normalizeAccessCode(code)}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return errorResponse('Function is not configured', 500);
  }

  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (!token) {
    return errorResponse('Authentication required', 401);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return errorResponse('Authentication required', 401);
  }

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === 'string' ? body.code : '';
  const normalizedCode = normalizeAccessCode(code);

  if (normalizedCode.length < 12) {
    return errorResponse('Invalid code', 400);
  }

  const codeHash = await hashAccessCode(normalizedCode);
  const windowStart = new Date(
    Date.now() - ATTEMPT_WINDOW_MINUTES * 60 * 1000,
  ).toISOString();

  const { count: failedAttempts } = await supabaseAdmin
    .from('code_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('success', false)
    .gte('created_at', windowStart);

  if ((failedAttempts ?? 0) >= MAX_FAILED_ATTEMPTS) {
    await supabaseAdmin.from('audit_events').insert({
      actor_id: user.id,
      event_type: 'access_code_rate_limited',
      metadata: { window_minutes: ATTEMPT_WINDOW_MINUTES },
    });

    return errorResponse('Too many attempts', 429);
  }

  const recordAttempt = async (success: boolean) => {
    await supabaseAdmin.from('code_attempts').insert({
      code_hash: codeHash,
      success,
      user_id: user.id,
    });
  };

  const { data: accessCode, error: accessCodeError } = await supabaseAdmin
    .from('access_codes')
    .select(
      'id,owner_id,collection_id,access_type,duration_minutes,starts_at,expires_at,max_uses,revoked_at,status,used_count',
    )
    .eq('code_hash', codeHash)
    .maybeSingle<AccessCodeRow>();

  const now = new Date();
  const startsInFuture =
    accessCode && new Date(accessCode.starts_at).getTime() > now.getTime();
  const expired =
    accessCode?.access_type === 'temporary' &&
    accessCode.expires_at !== null &&
    new Date(accessCode.expires_at).getTime() <= now.getTime();
  const missingOrHardInvalid =
    accessCodeError ||
    !accessCode ||
    Boolean(accessCode.revoked_at) ||
    startsInFuture ||
    expired;

  if (missingOrHardInvalid) {
    await recordAttempt(false);
    await supabaseAdmin.from('audit_events').insert({
      actor_id: user.id,
      event_type: 'access_code_rejected',
      metadata: { reason: 'invalid_expired_or_revoked' },
    });

    if (accessCode && expired) {
      await supabaseAdmin
        .from('access_codes')
        .update({ status: 'expired' })
        .eq('id', accessCode.id)
        .eq('status', 'active');
    }

    return errorResponse('Invalid code', 400);
  }

  const activeExistingSession = await supabaseAdmin
    .from('access_sessions')
    .select('id,access_code_id,collection_id,expires_at')
    .eq('recipient_id', user.id)
    .eq('access_code_id', accessCode.id)
    .is('revoked_at', null)
    .maybeSingle();

  if (
    activeExistingSession.data &&
    (!activeExistingSession.data.expires_at ||
      new Date(activeExistingSession.data.expires_at).getTime() > now.getTime())
  ) {
    const { data: mediaKeys, error: keysError } = await supabaseAdmin
      .from('media_keys')
      .select('media_id,encrypted_media_key,expires_at')
      .eq('access_code_id', accessCode.id)
      .is('revoked_at', null)
      .or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`);

    if (keysError) {
      await recordAttempt(false);
      return errorResponse('Could not load media keys', 500);
    }

    await recordAttempt(true);

    return jsonResponse({
      access_session: activeExistingSession.data,
      media_keys: mediaKeys ?? [],
    });
  }

  const invalidForNewSession =
    accessCode.status !== 'active' ||
    (accessCode.max_uses !== null && accessCode.used_count >= accessCode.max_uses);

  if (invalidForNewSession) {
    await recordAttempt(false);
    await supabaseAdmin.from('audit_events').insert({
      actor_id: user.id,
      event_type: 'access_code_rejected',
      metadata: { reason: 'already_used' },
    });

    return errorResponse('Invalid code', 400);
  }

  const nextUsedCount = accessCode.used_count + 1;
  const nextStatus =
    accessCode.max_uses !== null && nextUsedCount >= accessCode.max_uses
      ? 'used'
      : 'active';

  const { data: updatedCode, error: updateError } = await supabaseAdmin
    .from('access_codes')
    .update({
      status: nextStatus,
      used_count: nextUsedCount,
    })
    .eq('id', accessCode.id)
    .eq('used_count', accessCode.used_count)
    .select('id')
    .maybeSingle();

  if (updateError || !updatedCode) {
    await recordAttempt(false);
    return errorResponse('Code was already consumed', 409);
  }

  const sessionExpiresAt =
    accessCode.access_type === 'temporary' ? accessCode.expires_at : null;

  const { data: accessSession, error: sessionError } = await supabaseAdmin
    .from('access_sessions')
    .insert({
      access_code_id: accessCode.id,
      access_type: accessCode.access_type,
      collection_id: accessCode.collection_id,
      expires_at: sessionExpiresAt,
      owner_id: accessCode.owner_id,
      recipient_id: user.id,
    })
    .select('id,access_code_id,collection_id,expires_at')
    .single();

  if (sessionError) {
    await recordAttempt(false);
    return errorResponse('Could not create access session', 500);
  }

  const { data: mediaKeys, error: keysError } = await supabaseAdmin
    .from('media_keys')
    .select('media_id,encrypted_media_key,expires_at')
    .eq('access_code_id', accessCode.id)
    .is('revoked_at', null)
    .or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`);

  if (keysError) {
    await recordAttempt(false);
    return errorResponse('Could not load media keys', 500);
  }

  await recordAttempt(true);
  await supabaseAdmin.from('audit_events').insert({
    actor_id: user.id,
    event_type: 'access_code_accepted',
    target_id: accessCode.id,
    target_type: 'access_code',
    metadata: {
      access_type: accessCode.access_type,
      collection_id: accessCode.collection_id,
      media_key_count: mediaKeys?.length ?? 0,
    },
  });

  return jsonResponse({
    access_session: accessSession,
    media_keys: mediaKeys ?? [],
  });
});
