/**
 * 轻量 Markdown → React 渲染器（自包含）。
 *
 * 设计决策：DSH 客户端插件 bundle 相互隔离（禁止跨插件 value import），
 * 无法直接复用 dsh-better-sidebar 内部的 marked 实例；为独立发布与零额外
 * 依赖，V0.1 提供覆盖结构化文档常见语法的轻量实现：
 * 标题 / 段落 / 无序列表 / 任务列表 / 有序列表 / 行内代码 / 粗体 / 斜体 /
 * 行内链接 / 代码块 / 表格 / 分隔线。超出范围的文本按原文展示。
 *
 * 不解析 HTML（安全考虑：一律按文本展示）。
 */
import { Fragment, type ReactNode } from 'react'

/** 行内样式解析：`code`、**bold**、*italic*、[text](url)。 */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const regex = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[([^\]]+)\]\(([^)\s]+)\))/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let index = 0
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }
    const [full] = match
    const key = `${keyPrefix}-${index++}`
    if (match[1] !== undefined) {
      nodes.push(<code key={key} className="sdv-code">{match[1].slice(1, -1)}</code>)
    } else if (match[2] !== undefined) {
      nodes.push(<strong key={key}>{match[2].slice(2, -2)}</strong>)
    } else if (match[3] !== undefined) {
      nodes.push(<em key={key}>{match[3].slice(1, -1)}</em>)
    } else if (match[4] !== undefined) {
      const label = match[5] ?? full
      const href = match[6] ?? ''
      nodes.push(<a key={key} href={href} target="_blank" rel="noreferrer">{label}</a>)
    } else {
      nodes.push(full)
    }
    lastIndex = match.index + full.length
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

function isTaskLine(line: string): { checked: boolean; rest: string } | null {
  const match = /^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/.exec(line)
  if (match === null) return null
  return { checked: match[1] === 'x' || match[1] === 'X', rest: match[2]! }
}

/** 表格行解析：`| a | b |`。 */
function splitTableRow(line: string): string[] {
  return line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map(cell => cell.trim())
}

/** 渲染一段 Markdown 文本。 */
export function renderMarkdown(markdown: string): ReactNode {
  const lines = markdown.split(/\r?\n/)
  const blocks: ReactNode[] = []
  let index = 0
  let blockIndex = 0

  const pushBlock = (node: ReactNode): void => {
    blocks.push(<Fragment key={`b${blockIndex++}`}>{node}</Fragment>)
  }

  while (index < lines.length) {
    const line = lines[index]!

    // 空行
    if (line.trim() === '') {
      index += 1
      continue
    }

    // 代码围栏
    const fence = /^\s*```/.exec(line)
    if (fence !== null) {
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && !/^\s*```/.test(lines[index]!)) {
        codeLines.push(lines[index]!)
        index += 1
      }
      index += 1 // 跳过闭合围栏
      pushBlock(<pre key="pre" className="sdv-pre"><code>{codeLines.join('\n')}</code></pre>)
      continue
    }

    // 标题
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading !== null) {
      const level = heading[1]!.length
      const Tag = (`h${level}`) as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
      pushBlock(<Tag key="h" className="sdv-heading">{inline(heading[2]!, `h${level}`)}</Tag>)
      index += 1
      continue
    }

    // 分隔线
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      pushBlock(<hr key="hr" />)
      index += 1
      continue
    }

    // 表格（连续的行首含 |）
    if (line.trim().startsWith('|')) {
      const tableLines: string[] = []
      while (index < lines.length && lines[index]!.trim().startsWith('|')) {
        tableLines.push(lines[index]!)
        index += 1
      }
      if (tableLines.length >= 2 && /^[\s|:-]+$/.test(tableLines[1]!.replace(/[|]/g, '').trim())) {
        const header = splitTableRow(tableLines[0]!)
        const rows = tableLines.slice(2).map(splitTableRow)
        pushBlock(
          <table key="table" className="sdv-table">
            <thead>
              <tr>{header.map((cell, i) => <th key={i}>{cell}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>{header.map((_, c) => <td key={c}>{row[c] ?? ''}</td>)}</tr>
              ))}
            </tbody>
          </table>,
        )
        continue
      }
      // 不是表格：按普通段落回落
      pushBlock(<p key="p">{inline(tableLines[0]!, 'p')}</p>)
      continue
    }

    // 有序列表
    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line)
    if (ordered !== null) {
      const items: ReactNode[] = []
      while (index < lines.length) {
        const item = /^\s*\d+[.)]\s+(.*)$/.exec(lines[index]!)
        if (item === null) break
        items.push(<li key={items.length}>{inline(item[1]!, `o${items.length}`)}</li>)
        index += 1
      }
      pushBlock(<ol key="ol" className="sdv-list">{items}</ol>)
      continue
    }

    // 任务列表 / 无序列表（含缩进层级，简单两级）
    const bullet = /^(\s*)[-*+]\s+(.*)$/.exec(line)
    if (bullet !== null) {
      const items: ReactNode[] = []
      while (index < lines.length) {
        const item = /^(\s*)[-*+]\s+(.*)$/.exec(lines[index]!)
        if (item === null) break
        const task = isTaskLine(lines[index]!)
        if (task !== null) {
          items.push(
            <li key={items.length} className="sdv-task">
              <input type="checkbox" checked={task.checked} readOnly disabled />
              <span>{inline(task.rest, `t${items.length}`)}</span>
            </li>,
          )
        } else {
          items.push(<li key={items.length}>{inline(item[2]!, `u${items.length}`)}</li>)
        }
        index += 1
      }
      pushBlock(<ul key="ul" className="sdv-list">{items}</ul>)
      continue
    }

    // 普通段落（连续非空行）
    const paragraphLines: string[] = [line]
    index += 1
    while (index < lines.length && lines[index]!.trim() !== '' && !/^(#{1,6})\s/.test(lines[index]!) && !/^\s*```/.test(lines[index]!)) {
      paragraphLines.push(lines[index]!)
      index += 1
    }
    pushBlock(<p key="p" className="sdv-paragraph">{inline(paragraphLines.join(' '), 'p')}</p>)
  }

  return <div className="sdv-markdown">{blocks}</div>
}
