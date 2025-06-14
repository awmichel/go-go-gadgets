import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  html: {
    title: "Go Go Gadgets",
  },
  output: {
    assetPrefix: "/go-go-gadgets/",
  },
  plugins: [pluginReact()],
  server: {
    open: false,
  },
});
