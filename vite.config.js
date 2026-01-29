import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import fs from "fs";

// 自定义插件：将 .mjs 文件重命名为 .js
function renameMjsToJs() {
  return {
    name: "rename-mjs-to-js",
    writeBundle(options, bundle) {
      const outDir = options.dir || "dist";

      for (const fileName of Object.keys(bundle)) {
        if (fileName.endsWith(".mjs")) {
          const oldPath = resolve(outDir, fileName);
          const newPath = oldPath.replace(/\.mjs$/, ".js");

          if (fs.existsSync(oldPath)) {
            fs.renameSync(oldPath, newPath);
            console.log(
              `Renamed: ${fileName} -> ${fileName.replace(/\.mjs$/, ".js")}`,
            );
          }
        }
      }

      // 同时更新引用这些文件的 JS 文件
      const assetsDir = resolve(outDir, "assets");
      if (fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir);
        for (const file of files) {
          if (file.endsWith(".js")) {
            const filePath = resolve(assetsDir, file);
            let content = fs.readFileSync(filePath, "utf-8");

            // 替换 .mjs 引用为 .js
            if (content.includes(".mjs")) {
              content = content.replace(/\.mjs/g, ".js");
              fs.writeFileSync(filePath, content);
              console.log(`Updated references in: ${file}`);
            }
          }
        }
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), renameMjsToJs()],
  build: {
    rollupOptions: {
      output: {
        // 设置 chunk 文件命名规则
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
});
