export function waInfo(message: string, meta?: unknown) {
  try {
    if (meta !== undefined) console.info('[WA]', message, meta);
    else console.info('[WA]', message);
  } catch (e) {
    // swallow
  }
}

export function waWarn(message: string, meta?: unknown) {
  try {
    if (meta !== undefined) console.warn('[WA]', message, meta);
    else console.warn('[WA]', message);
  } catch (e) {
    // swallow
  }
}

export function waError(message: string, meta?: unknown) {
  try {
    if (meta !== undefined) console.error('[WA]', message, meta);
    else console.error('[WA]', message);
  } catch (e) {
    // swallow
  }
}

export default { waInfo, waWarn, waError };
