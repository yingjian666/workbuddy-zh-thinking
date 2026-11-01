#!/usr/bin/env node
/**
 * zh-thinking 安装脚本
 *
 *   node install.mjs              安装到 ~/.workbuddy/skills/zh-thinking/
 *   node install.mjs --uninstall  卸载（同时摘除 MEMORY.md 规则块）
 *
 * 零外部依赖，仅使用 Node 内置模块。
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL_NAME = 'zh-thinking';
const FILES = ['SKILL.md', 'manage.mjs'];
const WB_DIR = path.join(os.homedir(), '.workbuddy');
const DEST = path.join(WB_DIR, 'skills', SKILL_NAME);

const uninstall = process.argv.includes('--uninstall');

function runManage(cmd) {
  const script = path.join(DEST, 'manage.mjs');
  if (!fs.existsSync(script)) return;
  const r = spawnSync(process.execPath, [script, cmd], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.warn(`  manage.mjs ${cmd} 返回非零状态码，可稍后手动执行。`);
  }
}

if (!fs.existsSync(WB_DIR)) {
  console.error(`未找到 WorkBuddy 配置目录：${WB_DIR}`);
  console.error('请确认已安装并至少启动过一次 WorkBuddy。');
  process.exit(1);
}

if (uninstall) {
  runManage('off');
  if (fs.existsSync(DEST)) {
    fs.rmSync(DEST, { recursive: true, force: true });
    console.log(`已移除：${DEST}`);
  } else {
    console.log(`未安装，无需移除：${DEST}`);
  }
  console.log('重启 WorkBuddy 后约束失效。');
  process.exit(0);
}

// 安装
fs.mkdirSync(DEST, { recursive: true });
for (const f of FILES) {
  const src = path.join(HERE, f);
  if (!fs.existsSync(src)) {
    console.error(`缺少文件：${src}`);
    process.exit(1);
  }
  fs.copyFileSync(src, path.join(DEST, f));
  console.log(`已写入：${path.join(DEST, f)}`);
}

runManage('on');

console.log('');
console.log('安装完成。');
console.log('  • 请重启 WorkBuddy —— 技能清单在启动时索引，description 层的约束重启后才常驻系统提示。');
console.log('  • 重启后新开会话，丢一段英文材料，观察思考块语言。');
console.log(`  • 卸载：node "${path.join(HERE, 'install.mjs')}" --uninstall`);
