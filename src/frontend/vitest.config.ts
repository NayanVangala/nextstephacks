import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
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
