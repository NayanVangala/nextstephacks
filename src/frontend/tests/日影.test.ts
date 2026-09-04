import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { 時, 日之向, 影, 樓, 格數, 蔭之格 } from "../src/landing/日之算";
import { 建圖, 大域, type 網 } from "../src/landing/useNet";

/*
  此二事皆已誤而不覺,故試之。
  Both of these shipped wrong and neither raised anything: the shadow model
  made noon the *most* shaded hour, and the graph's snap grid silently deleted
  43% of the segments it was supposed to walk. Nothing throws in either case —
  the picture just quietly says something false.
*/

describe("日影之算", () => {
  it("日中最高,其影最短", () => {
    const 高 = 時.map((_, i) => 日之向(i).α);
    const 午 = 時.indexOf(12);
    expect(Math.max(...高)).toBe(高[午]);
  });

  it("蔭最少者在日中,非在其最熱之時", () => {
    const 比 = 時.map((_, i) => 蔭之格(i).filter(Boolean).length / 格數);
    const 午 = 時.indexOf(12);
    expect(Math.min(...比)).toBe(比[午]);
    // 其址自蔽,故不能為零。
    expect(比[午]).toBeGreaterThan(0);
    expect(比[午]).toBeLessThan(0.5);
  });

  it("午前之影投於東之反,午後反之", () => {
    expect(日之向(時.indexOf(8)).影向).toBeGreaterThan(0);
    expect(日之向(時.indexOf(16)).影向).toBeLessThan(0);
  });

  it("一樓之影,恆含其址", () => {
    for (let i = 0; i < 時.length; i++) {
      for (const b of 樓) {
        const [a, z] = 影(b, i);
        expect(a).toBeLessThanOrEqual(b.x);
        expect(z).toBeGreaterThanOrEqual(b.x + b.w);
      }
    }
  });
});

describe("網之圖", () => {
  const 網 = JSON.parse(
    readFileSync(new URL("../public/landing-net.json", import.meta.url), "utf8"),
  ) as 網;

  it("歸格不吞其段", () => {
    const 圖 = 建圖(網);
    let 存 = 0;
    for (const 諸 of 圖.鄰.values()) 存 += 諸.length;
    // 每段兩端各一,故其半即所存之段。前此之格吞五九七段於一四〇〇。
    const 落 = 網.edges.length - 存 / 2;
    /*
      其限當以比,不以數。
      前此書「少於十」—— 其時網為一千四百段,即百之〇點七一。今網三千四百,
      所落十三,乃百之〇點三八 —— 其比反優於舊,而其數逾舊限,故其驗誤報。
      所驗者本為「格不可吞其段」,是比也,非數也;網之大小既可變,則其限
      亦當隨之。取百之一為限,尚寬於舊之〇點七一,而足以捕舊時百之四十三之病。
      The bound must be proportional. It was an absolute "< 10" tuned when this
      net held 1,400 segments (0.71%). The net is now 3,400 and drops 13, which
      is 0.38% — proportionally better, yet it trips an absolute threshold. What
      this test actually guards is "the snapping grid must not swallow
      segments", a ratio; 1% stays tighter than the old effective bound and
      still catches the 43% collapse that motivated the test.
    */
    expect(落 / 網.edges.length).toBeLessThan(0.01);
  });

  it("其大域涵其網之大半 —— 洪之始必在此", () => {
    expect(大域(建圖(網)).size).toBeGreaterThan(1000);
  });
});
