/**
 * 日與影之算。自 SunDial 析出 —— 其式已誤者再,故當可試。
 *
 * Split out of the component so it can be tested. This maths shipped wrong
 * twice in one sitting (a point-light projection that shaded 90% of the block
 * at noon, then an invented altitude curve that erased every shadow between
 * 10:00 and 16:00), which is exactly the kind of silent error a component file
 * hides. See tests/日影.test.ts.
 */

/** 其資所存之八時。非所擬 —— 見 public/landing-net.json 之 hours。 */
export const 時 = [6, 8, 10, 12, 14, 16, 18, 20];

/**
 * 靜者取正午。量之,日中之蔭最少 —— 影短於日中,不在其最熱之刻。
 * 靜像當取其最險者,不當取其最善者。同 HeatField 之所擇。
 */
export const 靜之位 = 3;

export const 地 = 316;
export const 寬 = 1200;

/** 三樓。其高其廣皆擬,故其註明之。 */
export const 樓 = [
  { x: 132, w: 128, h: 156 },
  { x: 506, w: 96, h: 214 },
  { x: 858, w: 152, h: 112 },
];

/**
 * 日之位與其影,皆自其高度角出。
 *
 * MUST be a directional source, not a point lamp. The first version projected
 * each corner through a sun placed a few hundred units above the street, which
 * made the noon sun — nearly overhead and physically the *least* shading moment
 * — throw shadows across 90% of the block. Wrong, and wrong in the direction
 * that flatters the tool. The sun is 150 million km away: every ray is
 * parallel, shadow length is h / tan(altitude), and nothing else.
 *
 * 高度角不可擬,故取其實:sin α = sin φ sin δ + cos φ cos δ cos H。
 * φ 為洛城之緯(三四點〇五度),δ 為夏至之赤緯(二三點四四度),H 為時角。
 * 量之:六時一二點九度,十二時七九點四度,十八時一二點九度。
 * 二十時則已在地下,而其資猶存其數 —— 故限之於三度,其影幾盡其街,是其實。
 *
 * Real solar geometry for Los Angeles at the June solstice rather than an
 * invented sine: the first version had the sun at 88° all afternoon, which
 * erased every shadow between 10:00 and 16:00. Noon comes out as the least
 * shaded hour, which is what the shipped dataset says too (see HeatField).
 */
const 緯 = (34.05 * Math.PI) / 180;
const 赤緯 = (23.44 * Math.PI) / 180;
/** 日既沒而其資猶有其時,故不使全沒 —— 三度者,其影長二十倍於其高。 */
const 最低 = (3 * Math.PI) / 180;

export function 日之向(i: number) {
  const H = ((時[i] - 12) * 15 * Math.PI) / 180;
  const sinα =
    Math.sin(緯) * Math.sin(赤緯) +
    Math.cos(緯) * Math.cos(赤緯) * Math.cos(H);
  const α = Math.max(最低, Math.asin(Math.max(-1, Math.min(1, sinα))));
  // 午前日在東(左),故其影投於右。正午則其日近乎頂,無側可言。
  const 側 = H < 0 ? -1 : H > 0 ? 1 : 0;
  return { α, 側, 影向: -側 };
}

/** 日之像。其徑同其射之角,故諸射皆指其日 —— 二者不可異其向。 */
export function 日之位(i: number): [number, number] {
  const { α, 側 } = 日之向(i);
  return [600 + 側 * Math.cos(α) * 270, 地 - Math.sin(α) * 270];
}

/** 一樓之影,投於地。長者 h / tan α,向者從其日之反。 */
export function 影(樓: { x: number; w: number; h: number }, i: number) {
  const { α, 影向 } = 日之向(i);
  const 長 = Math.min(2400, 樓.h / Math.tan(α));
  // 其址自蔽,故其蔭並其址而計之。
  if (影向 === 0) return [樓.x, 樓.x + 樓.w] as const;
  return 影向 > 0
    ? ([樓.x, 樓.x + 樓.w + 長] as const)
    : ([樓.x - 長, 樓.x + 樓.w] as const);
}

/** 人行道之格。四十八,故其形似其刻而不似其漸。 */
export const 格數 = 48;

/** 一時之蔭,格格言之。畫與數共此一算 —— 二算則必離。 */
export function 蔭之格(i: number): boolean[] {
  const 諸影 = 樓.map((b) => 影(b, i));
  return Array.from({ length: 格數 }, (_, k) => {
    const cx = ((k + 0.5) / 格數) * 寬;
    return 諸影.some(([a, b]) => cx >= a && cx <= b);
  });
}
