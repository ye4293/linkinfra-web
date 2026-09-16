// 时长为 0 是有效观测；缺失或异常时长不能按 0 秒解释。
export function parseAudioBilling(other: unknown) {
  if (!other || typeof other !== 'object' || Array.isArray(other)) return null;
  const data = other as Record<string, unknown>;
  if (data.billing_mode !== 'duration') return null;
  const number = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0
      ? value
      : null;
  return {
    seconds: number(data.audio_duration_seconds),
    price: number(data.duration_price_per_minute),
    ratio: number(data.group_ratio),
    source:
      data.transcription_usage_source === 'upstream' ? 'upstream' : 'missing'
  };
}
