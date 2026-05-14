type ApiErrorRecord = Record<string, unknown>;

const PUBLIC_ERROR_KEYS = [
  'code',
  'message',
  'weak_password',
  'weakPassword',
  'reasons',
  'status',
  'statusCode',
  'error',
  'error_description',
  'details',
  'hint',
] as const;

function isRecord(value: unknown): value is ApiErrorRecord {
  return typeof value === 'object' && value !== null;
}

function getTrimmedString(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function getScalarText(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value === null) {
    return 'null';
  }

  return null;
}

function formatPayloadLines(payload: unknown, prefix = ''): string[] {
  if (typeof payload === 'string') {
    const trimmed = getTrimmedString(payload);
    return trimmed ? [prefix ? `${prefix}: ${trimmed}` : trimmed] : [];
  }

  const scalarText = getScalarText(payload);

  if (scalarText !== null) {
    return prefix ? [`${prefix}: ${scalarText}`] : [scalarText];
  }

  if (Array.isArray(payload)) {
    const scalarValues = payload
      .map((item) => getScalarText(item))
      .filter((item): item is string => item !== null);

    if (scalarValues.length === payload.length) {
      return prefix ? [`${prefix}: ${scalarValues.join(', ')}`] : scalarValues;
    }

    return payload.flatMap((item, index) =>
      formatPayloadLines(item, prefix ? `${prefix}.${index}` : String(index)),
    );
  }

  if (!isRecord(payload)) {
    return [];
  }

  return Object.keys(payload).flatMap((key) => {
    const value = payload[key];

    if (typeof value === 'undefined' || typeof value === 'function') {
      return [];
    }

    return formatPayloadLines(value, prefix ? `${prefix}.${key}` : key);
  });
}

function formatPayload(payload: unknown) {
  const lines = formatPayloadLines(payload);

  return lines.length > 0 ? lines.join('\n') : null;
}

function getMessageFromPayload(payload: unknown): string | null {
  if (typeof payload === 'string') {
    return getTrimmedString(payload);
  }

  if (!isRecord(payload)) {
    return null;
  }

  return (
    getTrimmedString(payload.message) ??
    getTrimmedString(payload.error_description) ??
    getTrimmedString(payload.error)
  );
}

async function readResponsePayload(response: unknown) {
  if (!isRecord(response)) {
    return null;
  }

  const responseLike =
    typeof response.clone === 'function' ? response.clone() : response;

  if (!isRecord(responseLike)) {
    return null;
  }

  if (typeof responseLike.json === 'function') {
    try {
      return await responseLike.json();
    } catch {
      // Fall through to text parsing below.
    }
  }

  if (typeof responseLike.text === 'function') {
    try {
      const text = await responseLike.text();
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  return null;
}

function readJsonPayload(error: ApiErrorRecord) {
  if (typeof error.toJSON !== 'function') {
    return null;
  }

  try {
    return error.toJSON();
  } catch {
    return null;
  }
}

function getDirectSupabasePayload(error: ApiErrorRecord) {
  const jsonPayload = readJsonPayload(error);
  const source = isRecord(jsonPayload) ? jsonPayload : error;
  const payload: ApiErrorRecord = {};

  for (const key of PUBLIC_ERROR_KEYS) {
    const value = source[key] ?? error[key];

    if (typeof value !== 'undefined' && typeof value !== 'function') {
      payload[key] = value;
    }
  }

  if (!payload.weak_password && payload.weakPassword) {
    payload.weak_password = payload.weakPassword;
    delete payload.weakPassword;
  }

  if (
    payload.code === 'weak_password' &&
    !payload.weak_password &&
    Array.isArray(payload.reasons)
  ) {
    payload.weak_password = {
      reasons: payload.reasons,
    };
    delete payload.reasons;
  }

  const keys = Object.keys(payload);

  if (keys.length === 1 && keys[0] === 'message' && !jsonPayload) {
    return null;
  }

  return keys.length > 0 ? payload : null;
}

export async function getApiErrorMessage(
  error: unknown,
  fallback = 'Ha ocurrido un error.',
) {
  if (isRecord(error)) {
    const contextPayload = await readResponsePayload(error.context ?? error.response);
    const contextMessage = formatPayload(contextPayload);

    if (contextMessage) {
      return contextMessage;
    }

    const directPayload = getDirectSupabasePayload(error);
    const directMessage = formatPayload(directPayload);

    if (directMessage) {
      return directMessage;
    }
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return getMessageFromPayload(error) ?? fallback;
}
