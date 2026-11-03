/**
 * 科目ごとの色分け（SPEC 3-2）。
 * 科目名から決定的に色を選ぶため、同じ科目はいつも同じ色になる。
 * 画面全体は白基調のまま、ドットだけに色を使う。
 */
const PALETTE = [
  '#4169E1', // ロイヤルブルー
  '#2E9E6B', // グリーン
  '#E8912D', // オレンジ
  '#9B59B6', // パープル
  '#D64545', // レッド
  '#0097A7', // ティール
  '#8D6E63', // ブラウン
  '#5C6BC0', // インディゴ
] as const;

export function subjectColor(subject: string): string {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = (hash * 31 + subject.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
