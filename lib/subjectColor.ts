/**
 * 科目ごとの色分け。
 * 科目名から決定的に色を選ぶため、同じ科目はいつも同じ色になる。
 * デザイン刷新に合わせ、強い原色ではなく淡いパステル系を使う。
 */
const PALETTE = [
  '#F28C65', // コーラル
  '#F5B18E', // ピーチ
  '#7189B8', // ソフトブルー
  '#A8C3A0', // セージ
  '#E3C878', // ソフトイエロー
  '#C4A7D8', // ラベンダー
  '#93C6D6', // スカイ
  '#E5A3AC', // ダスティピンク
] as const;

export function subjectColor(subject: string): string {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = (hash * 31 + subject.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
