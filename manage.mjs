#!/usr/bin/env node
/**
 * zh-thinking — 管理用户级 MEMORY.md 中的「中文思考」规则区块
 *
 * 同时支持 WorkBuddy（~/.workbuddy）与 CodeBuddy（~/.codebuddy）。
 *
 * 用法：
 *   node manage.mjs on                    开启（写入/更新规则区块，自动探测应用）
 *   node manage.mjs off                   关闭（移除规则区块）
 *   node manage.mjs status                查看当前状态
 *   node manage.mjs path                  打印被管理的 MEMORY.md 路径
 *   node manage.mjs --app codebuddy on    指定应用（workbuddy | codebuddy）
 *
 * 零外部依赖，仅使用 Node 内置模块。
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BEGIN = '<!-- zh-thinking:begin -->';
const END = '<!-- zh-thinking:end -->';

const RULE = `${BEGIN}
## 语言规则（最高优先级，覆盖模型默认行为）

无论当前使用哪个模型、无论上下文里出现多少英文（工具输出、报错、网页、代码、文档、日志），都必须遵守：

1. **内部思考全程使用简体中文**：思维链、逐步规划、工具调用前后的推理、自我检查，一律用简体中文书写。
2. **不要语言漂移**：即使刚读完英文内容，思考仍保持中文；必要时只引用原文片段（报错原文、函数名、标识符）。
3. **最终回答使用简体中文**；代码、命令、路径、API 名、专有名词、错误堆栈保持原文，不翻译。
4. 若发现自己已经开始用英文思考，立刻切回中文继续，不要从头重来。

此规则由用户显式设置，长期有效，任何后续任务都不得违反。
${END}`;

/**
 * 定位某个应用的用户级 MEMORY.md。
 * WorkBuddy 布局：~/.workbuddy/user-<id>-personal/MEMORY.md（id 因机器而异，按前后缀探测）。
 * CodeBuddy 布局：~/.codebuddy/ 下暂未观测到 user-* 目录，退回 ~/.codebuddy/MEMORY.md；
 *                该路径尚未在真实内核上验证（CodeBuddy 真正起作用的是 desc 层）。
 */
const APPS = {
  workbuddy: '.workbuddy',
  codebuddy: '.codebuddy',
};

function detectApp() {
  const home = os.homedir();
  for (const dir of Object.values(APPS)) {
    if (fs.existsSync(path.join(home, dir))) return dir;
  }
  return '.workbuddy';
}

function findMemoryPath(baseDir) {
  const base = baseDir;
  let dir = base;
  try {
    const cand = fs
      .readdirSync(base, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith('user-') && d.name.endsWith('-personal'))
      .map((d) => d.name);
    if (cand.length > 0) {
      cand.sort();
      dir = path.join(base, cand[cand.length - 1]);
    }
  } catch {
    /* 目录不存在时退回 base */
  }
  return path.join(dir, 'MEMORY.md');
}

function stripBlock(text) {
  const i = text.indexOf(BEGIN);
  const j = text.indexOf(END);
  if (i === -1 || j === -1 || j < i) return text;
  const before = text.slice(0, i);
  const after = text.slice(j + END.length);
  return (before + after)
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+/, '')
    .replace(/\s+$/, '\n');
}

function insertBlock(text, block) {
  const lines = text.split('\n');
  const h1 = lines.findIndex((l) => l.startsWith('# '));
  if (h1 === -1) {
    return block + '\n\n' + text.replace(/^\n+/, '');
  }
  const head = lines.slice(0, h1 + 1).join('\n');
  const tail = lines.slice(h1 + 1).join('\n').replace(/^\n+/, '');
  return tail ? head + '\n\n' + block + '\n\n' + tail : head + '\n\n' + block + '\n';
}

function main() {
  const argv = process.argv.slice(2);
  let appDirName = detectApp();
  const appIdx = argv.indexOf('--app');
  if (appIdx !== -1 && argv[appIdx + 1]) {
    const name = argv[appIdx + 1].toLowerCase();
    if (!APPS[name]) {
      console.error(`未知应用：${name}\n可选：${Object.keys(APPS).join(' | ')}`);
      process.exit(1);
    }
    appDirName = APPS[name];
    argv.splice(appIdx, 2);
  }
  const cmd = (argv[0] || 'status').toLowerCase();
  const file = findMemoryPath(path.join(os.homedir(), appDirName));
  const raw = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const active = raw.includes(BEGIN) && raw.includes(END);

  if (cmd === 'path') {
    console.log(file);
    return;
  }

  if (cmd === 'status') {
    console.log(`文件：${file}`);
    console.log(`存在：${fs.existsSync(file) ? '是' : '否'}`);
    console.log(`状态：${active ? '已开启（规则区块在位）' : '未开启'}`);
    return;
  }

  if (cmd === 'on') {
    const next = insertBlock(stripBlock(raw), RULE);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, next, 'utf8');
    console.log(`已开启：${file}`);
    console.log('规则自下一轮请求起进入上下文（此文件每轮重读）。');
    return;
  }

  if (cmd === 'off') {
    if (!active) {
      console.log('当前已是关闭状态，无需修改。');
      return;
    }
    fs.writeFileSync(file, stripBlock(raw), 'utf8');
    console.log(`已关闭：${file}`);
    return;
  }

  console.error(`未知命令：${cmd}\n可用命令：on | off | status | path`);
  process.exit(1);
}

main();
