# workbuddy-zh-thinking

让 **WorkBuddy** 里所有模型的**内部思考过程**（思维链、逐步规划、工具调用前后的推理、自我审查）强制使用**简体中文**。

> 这是 [dsh-zh-thinking](https://github.com/yingjian666/dsh-zh-thinking)（DeepSeek Harness 版）在 WorkBuddy 上的对应实现。
> 两者的技术路径完全不同——DSH 有宿主插件 API，WorkBuddy 没有，详见下文「为什么不是插件」。

* * *

## CodeBuddy 能用吗？

**能，同一个内核家族。** 实机证据：CodeBuddy CN 的 agent 诊断日志里，CLI 实体指向的就是 CodeBuddy Code 内核（WorkBuddy 正是它的定制发行版，连内部文件名都叫 `codebuddy-lite-wb.mjs`）；`~/.codebuddy` 的插件市场、`SKILL.md` 结构与 WorkBuddy 完全一致。

在 CodeBuddy 上使用：把 `SKILL.md` + `manage.mjs` 放进 `~/.codebuddy/skills/zh-thinking/` 即可，description 层（真正起作用的那层）照常生效。`manage.mjs --app codebuddy on` 可写 CodeBuddy 的 `MEMORY.md` 保险层——但该层的注入路径在 CodeBuddy 上尚未真机验证，desc 层不受影响。

* * *

## 快速安装

```bash
git clone https://github.com/yingjian666/workbuddy-zh-thinking.git
cd workbuddy-zh-thinking
node install.mjs
```

**然后重启 WorkBuddy**。新会话里丢一段英文材料（英文报错、英文文档都行），观察思考块的语言。

卸载：

```bash
node install.mjs --uninstall
```

* * *

## 为什么不是插件

DSH 版的做法是 `ctx.systemPrompt.section({ order, text })` —— 直接往系统提示词的装配过程里插一段。**WorkBuddy 没有对外暴露这个接口**。把 `app.asar` 翻完，它的扩展点只有四类：

| 扩展点 | 位置 | 能否注入系统提示 |
|---|---|---|
| MCP 服务 | `~/.workbuddy/mcp.json` | 否，只提供工具 |
| Skill | `~/.workbuddy/skills/` | **能**（见下） |
| 插件 hooks | 插件内 `hooks.json`，事件含 `PreToolUse` / `SessionStart` / `SessionEnd` | 未验证能进上下文 |
| 记忆文件 | `MEMORY.md` / `AGENTS.md` | 能，但不是系统提示正题 |

### 找到的那个落点

WorkBuddy 每轮请求都会把**技能清单**拼进系统提示，而每个技能的 `description` 字段原样进入这份清单。也就是说：

> **Skill 的 `description` 是 WorkBuddy 中唯一能写进系统提示的自定义常驻文本。**

这就是 DSH `systemPrompt.section()` 的平替。本项目的全部核心，就是把强制规则前置写进 `SKILL.md` 的 `description`。

### 一个被证伪的猜想

一开始试的是更"正规"的做法：往用户级 `MEMORY.md` 里写规则。日志证实它确实每轮都被读取——

```
[MemoryCollector] user MEMORY.md dir=C:\Users\liang\.workbuddy\user-xxxx-personal scoped=yes
```

每轮请求刷一行，规则确实进了上下文。**但思考仍然是英文的。** 一条「用户指令」压不住模型的默认习惯。

换成 `description` 之后立刻生效，而且**换任何模型都一样生效**——因为它在系统提示里，与模型无关。这个对照实验是整件事的关键证据。

* * *

## 实现的三层

| 层 | 载体 | 位置强度 | 生效范围 |
|---|---|---|---|
| 1 | `SKILL.md` 的 `description` | 系统提示（技能清单，每轮常驻） | 全局 |
| 2 | `~/.workbuddy/user-<id>-personal/MEMORY.md` 标记块 | 用户指令（每轮重读） | 全局 |
| 3 | workspace 根 `AGENTS.md`（可选，`install.mjs` 不写） | 项目上下文（首轮注入） | 单项目 |

层 1 是决定性的，层 2 是保险。`manage.mjs off` 只摘层 2，**要彻底关闭得禁用或删除这个 skill**。

* * *

## 目录结构

```
.
├── SKILL.md          # 技能定义，description 里就是强制规则（核心）
├── manage.mjs        # MEMORY.md 规则块的 on/off/status/path
├── install.mjs       # 安装/卸载到 ~/.workbuddy/skills/
├── CHANGELOG.md
├── LICENSE
└── README.md
```

* * *

## 命令

安装后：

```bash
# 管理 MEMORY.md 那层保险
node ~/.workbuddy/skills/zh-thinking/manage.mjs status
node ~/.workbuddy/skills/zh-thinking/manage.mjs on
node ~/.workbuddy/skills/zh-thinking/manage.mjs off

# 直接跑仓库里的也可以，不依赖安装位置
node manage.mjs on
```

Windows 下若 `$HOME` 不展开，用绝对路径：
`node "C:/Users/<用户名>/.workbuddy/skills/zh-thinking/manage.mjs" on`

脚本是幂等的：`on` 按 `<!-- zh-thinking:begin -->` / `<!-- zh-thinking:end -->` 标记定位，已存在则原样替换、不会堆叠；`off` 只删标记块，`MEMORY.md` 里其他记忆一字不动。

* * *

## 生效时机

- **层 1（description）**：改完需要**重启 WorkBuddy**。技能清单在启动时索引，重启后每轮都在。
- **层 2（MEMORY.md）**：每轮请求都重读文件，改完下一轮即进上下文。

注意：当前会话不会回溯改变——已发出的请求，系统提示早就组装完了。

* * *

## 边界与代价（请先读这段）

- **这是强引导，不是物理强制。** WorkBuddy 不给改系统提示正题，本项目只能做到"在系统提示里加一条约束"，做不到"重写整个提示词"。
- **不同模型服从度不同。** DeepSeek 系通常最稳；其它模型偶有零散英文片段，尤其是长链路推理、密集英文工具输出之后。属模型训练偏好，不是本技能失效。
- **规则只管语言。** 代码、命令、路径、API 名、报错堆栈必须保留原文——翻译了会破坏可执行性，`SKILL.md` 里已明确写死这条。
- **依赖 skill 处于启用状态。** 在界面上禁用该 skill，约束立刻消失。改名、删目录同理。
- **description 可能被压缩。** 技能数量激增时，应用可能截断描述。核心句必须留在**最前面**，这也是 `SKILL.md` 里那条规则写成现在这个顺序的原因。
- **`MEMORY.md` 有 4000 字符上限。** 规则块约 400 字符，正常不触发；若用户记忆很长需留意。

* * *

## 兼容性

- WorkBuddy Desktop（`app.asar` 版本 2026-10 前后）实测有效。
- 不依赖任何第三方 npm 包，纯 Node 内置模块。
- 修改的文件都在用户目录 `~/.workbuddy/` 下，**不触碰应用安装目录**，升级 WorkBuddy 不会失效。

* * *

## 和其它方案的关系

| 方案 | 强度 | 代价 |
|---|---|---|
| **本项目**（description 注入） | 中高，系统提示层 | 需重启；依赖 skill 启用 |
| workspace `AGENTS.md` | 中，项目上下文层，仅首轮 | 只对单项目生效 |
| 插件 + `SessionStart` hook | 未知 | WorkBuddy 插件格式复杂，hook 输出能否进上下文未验证 |
| 直接改 `app.asar` 系统提示 | 最高 | 升级即失效，动宿主程序，**不推荐** |

* * *

## 许可证 / 致谢

MIT · Copyright (c) 2026 yingjian666

思路延续自两个项目，特此致谢：

- [dsh-zh-thinking](https://github.com/yingjian666/dsh-zh-thinking) —— 同作者的 DSH 版，本项目要解决的正是它当初要解决的那个问题
- [wodongx123/dsh-language-control](https://github.com/wodongx123/dsh-language-control) —— 「让 Agent 用中文思考」这个思路的最初来源（MIT License, Copyright (c) 2026 wodongx123）

本项目针对 WorkBuddy 的扩展点**重新实现**，与上述两个项目的代码无共用。
