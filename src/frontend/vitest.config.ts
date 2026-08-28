import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 此處 於 vite 之 native config loader 將不可用,而 import.meta.dirname
// 須 Node 20.11 以上。CI 用 Node 20,故取其可移者。
const 此處 = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(此處, "src") },
  },
  test: {
    // node 為常,快而無累。界面之測各自以 docblock 求 jsdom:
    //   // @vitest-environment jsdom
    // 既有之測皆算路與資,不需 DOM,不當為其付 jsdom 之費。
    //
    // 測既移入 src/frontend/tests —— 前在 repo 之根,而 node_modules 在此,
    // node 之解析自引者之處上行,故彼處求 react、@testing-library 皆不得。
    // 相對之路可行,故十六算測未嘗遇之;界面之測則必需 bare import。
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
