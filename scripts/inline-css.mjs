#!/usr/bin/env node
/**
 * inline-css.mjs —— 把 mind-elixir 的样式表内联进客户端 bundle。
 *
 * DSH 客户端 bundle 是单一自包含脚本（__ModuleLoader__ 闭包），无法在
 * 运行时从 node_modules 读取 CSS；本脚本在构建/类型检查/测试前把
 * node_modules/mind-elixir/dist/MindElixir.css 的内容生成到
 * src/client/generated/mind-elixir-style.ts，组件运行时注入 <style>。
 *
 * 该生成文件不提交（见 .gitignore），由 npm scripts 的 inline:css 保证
 * 存在（build / typecheck / test 前置）。
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cssPath = join(root, 'node_modules', 'mind-elixir', 'dist', 'MindElixir.css')
const outPath = join(root, 'src', 'client', 'generated', 'mind-elixir-style.ts')

let css
try {
  css = await readFile(cssPath, 'utf8')
} catch {
  console.error('[inline-css] 未找到 mind-elixir 样式表（是否已 npm install？）：' + cssPath)
  process.exit(1)
}

const content =
  '/* 本文件由 scripts/inline-css.mjs 自动生成，请勿手改。 */\n' +
  '// 来源：node_modules/mind-elixir/dist/MindElixir.css（MIT）\n' +
  'export const MIND_ELIXIR_CSS: string = ' +
  JSON.stringify(css) +
  '\n'

await mkdir(dirname(outPath), { recursive: true })
await writeFile(outPath, content, 'utf8')
console.log(`[inline-css] 已生成 ${outPath}（${css.length} 字节 CSS）`)
