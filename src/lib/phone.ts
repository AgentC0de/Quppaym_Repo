// Minimal E.164 formatting helper used by WA senders.
export function formatToE164(raw: string | null | undefined): string | null {
  const s = (raw || "").trim();
  if (!s) return null;
  try {
    if (s.startsWith("+")) {
      const digits = s.replace(/\D/g, "");
      return digits ? `+${digits}` : null;
    }
    const digits = s.replace(/\D/g, "");
    if (!digits) return null;
    if (digits.length >= 11) return `+${digits}`;
    if (digits.length === 10) {
      const cc = (import.meta.env.VITE_WA_DEFAULT_COUNTRY_CODE as string) || (import.meta.env.VITE_DEFAULT_COUNTRY_CODE as string) || "";
      if (cc) return `+${cc}${digits}`;
      return null;
    }
    return null;
  } catch (e) {
    return null;
  }
}

export default formatToE164;
