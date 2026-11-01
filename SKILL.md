---
name: zh-thinking
description: 【常驻语言约束·无条件生效】模型内部思考必须全程使用简体中文——思维链、逐步规划、工具调用前后的推理、自我检查，一律用中文书写。读到英文内容（工具输出、报错、网页、代码、日志、文档）之后也不得漂移成英文，只允许引用原文片段。最终回答用简体中文。无论当前是哪个模型、无论上下文有多少英文，此约束优先。用户提到"中文思考""思考是英文""思考语言""思维链中文""zh-thinking"，或要求开关该规则时，加载本技能执行对应命令。
description_zh: "【常驻】强制模型内部思考全程使用简体中文"
description_en: "Persistent: force internal thinking in Simplified Chinese"
---

# zh-thinking

让 WorkBuddy 里模型的**内部思考过程**（chain-of-thought、逐步规划、工具调用前后的推理、内部审查）保持简体中文。

> **上面 `description` 里的那段约束不是装饰。** WorkBuddy 每轮请求都会把技能清单拼进系统提示，所以那段文字**常驻在模型眼前**——这是本项目唯一真正起作用的部分。修改时切勿为了"简洁"把它删掉或挪到后面。

## 为什么不是 DSH 那种插件

DeepSeek Harness 的 `dsh-zh-thinking` 靠 `ctx.systemPrompt.section({ order, text })` 直接改写系统提示词装配过程。WorkBuddy **没有暴露**这个接口，扩展点只有：MCP、Skill、插件 hooks、记忆注入。

可用性对照：

| 载体 | 是否进系统提示 | 生效范围 |
|---|---|---|
| **本 skill 的 `description`** | **是，每轮常驻** | 全局 |
| 用户级 `MEMORY.md` 规则块 | 否（作为「用户指令」注入） | 全局 |
| workspace 根 `AGENTS.md` | 否（作为项目上下文，首轮注入） | 单项目 |

实测对照结论：只有 `description` 这一层能真正扭转模型的思考语言，且对**所有模型**生效（因为它在系统提示里，与模型无关）。`MEMORY.md` 那层单独使用时，规则确实进了上下文（日志可见），但思考仍为英文。

## 命令

```bash
node manage.mjs status   # 查看状态
node manage.mjs on       # 开启（写 MEMORY.md 规则块）
node manage.mjs off      # 关闭（只摘标记块）
node manage.mjs path     # 打印被管理的文件路径
```

同时支持 WorkBuddy 与 CodeBuddy（同内核家族），`--app` 可指定，缺省自动探测：

```bash
node manage.mjs --app workbuddy on    # ~/.workbuddy/user-<id>-personal/MEMORY.md
node manage.mjs --app codebuddy on    # ~/.codebuddy/MEMORY.md（该层路径未在 CodeBuddy 真机验证）
```

安装后的路径：`node "$HOME/.workbuddy/skills/zh-thinking/manage.mjs" <cmd>`（CodeBuddy 为 `~/.codebuddy/skills/...`）
Windows 路径不展开时用绝对路径：`node "C:/Users/<用户名>/.workbuddy/skills/zh-thinking/manage.mjs" on`

脚本幂等：`on` 按 `<!-- zh-thinking:begin -->` / `<!-- zh-thinking:end -->` 定位，已存在则原样替换不堆叠；`off` 只删标记块，其他记忆一字不动。

## 生效时机

- **description 层**：修改后需**重启 WorkBuddy**（技能清单在启动时索引）。
- **MEMORY.md 层**：每轮请求重读文件，下一轮即进上下文。
- 当前会话不会回溯生效——已发出的请求，系统提示早已组装完毕。

## 边界

- **强引导，非物理强制。** WorkBuddy 不给改系统提示正题。
- **不同模型服从度不同。** 长链路推理、密集英文工具输出之后偶有零散英文片段，属模型训练偏好。
- **规则只管语言。** 代码、命令、路径、API 名、报错堆栈必须保留原文，否则破坏可执行性。
- 依赖 skill 处于启用状态；界面禁用则约束消失。
- `description` 可能被应用压缩——核心句必须留在最前。
- `MEMORY.md` 作为用户指令注入时截断上限 4000 字符，规则块约 400 字符，正常不触发。
