# 法 incredibles.dev 之制 —— 2026-08-29

所法者 <https://incredibles.dev/>。其籤皆以 Playwright 讀其 `:root`,非目測。

## 所量者

| 屬 | 所法者 | 前此 | 今 |
|---|---|---|---|
| 字之階 | 一階五屬同綁(大、重、行高、族、距) | 但有其大,逐處手書其重與距 | `.h-3xl`…`.t-4xs`,五屬俱備 |
| 顯之族 | Frama 四百、寬其常、距 -.05em | Archivo 八百、寬七二、距 -.045em | Archivo 四百、寬其常、距 -.05em |
| 文之族 | Neue Montreal 三百 / 行高一點三 | Geist 四百 / 行高一點二 | Geist(大者三百,小者四百)/ 行高一點三 |
| 籤之族 | Supply Mono,大寫,距 +.03em | 系統等寬,距 +.08em | 系統等寬,距 +.03em |
| 地之格 | 一九二〇之限,其外四十八,十二列 | `max-w-6xl`(一一五二),其外二十 | `.grid-container`,同其制 |
| 節之距 | 4.6875rem(七十五) | 七十二 | 4.6875rem |
| 頂之空 | 8rem | 六 rem | 8rem |
| 角 | 六、八、十二、十六、二十四、丸 | 自十像素派生:六點四、八、十、十四 | 直書其值 |
| 影 | 零 | 一(select 之 `shadow-md`) | 零 |
| 色之易 | 0.07s linear | 0.15s ease-quint | 0.07s linear(一規盡之) |
| 形之動 | 0.8/0.6/0.3/0.2s,`cubic-bezier(.23,1,.32,1)` | 已同 | 不改 |
| 平捲 | Lenis lerp 0.1 | 已同,止於 landing | 不改 |
| 地之紋 | 半調之點(畫於 canvas) | 無 | 器之地一像素之點,距二十四,三分半之濃 |

## 所不從者,及其由

- **曝之階不易為其粉**(`#fc4778`)。青、黃、赤者,所量之曝也,非其牌之色。
- **暗為其常**。所法者為淡,此取其骨(墨非純黑、四階之灰、一色之微、無影)而施於暗地,非倒其色。
- **文之重不全從其三百**。所法者淡地黑字,細筆自明;此暗地淡字,細者暈開。故大者三百,小者仍四百。
- **`prefers-color-scheme` 不可辨「無所欲」**。凡不欲暗者皆報淡,故「其常為暗」不可以 media query 書之。今以 `data-theme` 主之,加一鈕於頂,其擇存於 localStorage,`index.html` 於畫前施之。
- **器不用 Lenis**。其中有 Leaflet,輪為其縮所繫,奪之則不可縮而人不知其故。
- **顯之階施於短語,不施於長句**。所法者之大題皆三五字;此頁之節題二十字,同施之則五行而據其全節。故長句用 2.5rem 之階。

## 其圖

`before/` 與 `after/`,皆三度:375 / 768 / 1440。

- `landing-1440.png` — hero
- `landing-1440-full.png` — 全頁
- `app-1440.png` — 器(暗)
- `app-1440-light.png` — 器(淡,按其鈕而得)
- `app-768.png`、`app-375.png`、`landing-768.png`、`landing-375.png`

`before/app-1440.png` 無 —— 前此但存其全頁者(`before/app-1440-full.png`)。

## 所驗者

- 對比:landing 零犯,器暗淡二題皆零犯(以 canvas 合其 alpha 而算,非以其名)。
- 影:全樹零。
- 字:Archivo Variable(顯)、Geist Variable(文)、系統等寬(籤)—— 三職三族,如所法者。
- h1 之量:136px / 400 / 行高 0.86 / 距 -6.8px —— 即其 `--font-size-h-3xl` 之數。
