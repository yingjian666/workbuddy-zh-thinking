# Changelog

## 0.1.0 — 2026-11-01

首个版本。

**做了什么**

- 用 Skill 的 `description` 字段把「必须用简体中文思考」的规则写进 WorkBuddy 的系统提示。这是 WorkBuddy 中唯一能写进系统提示的自定义常驻文本，等于 DSH `systemPrompt.section()` 的平替。
- `manage.mjs` 管理用户级 `MEMORY.md` 里的规则块，作为第二层保险，可幂等开关。
- `install.mjs` 一键安装 / 卸载。

**过程中被证伪的方案**

先试的是往用户级 `MEMORY.md` 写规则。日志（`~/.workbuddy/logs/<日期>/workbuddyMainThread__*.log`）里能看到 `[MemoryCollector] user MEMORY.md dir=... scoped=yes` 每轮请求刷一行，说明文件确实每轮重读、规则确实进了上下文——**但模型思考仍然是英文的**。

改成 `description` 后立刻生效，且换任何模型都一样生效。这个对照实验说明：`MEMORY.md` 作为「用户指令」注入时权重不足，压不住模型默认习惯；而系统提示层的约束与模型无关。

**已知边界**

- 强引导，非物理强制。
- 部分模型的长链路推理、密集英文工具输出之后仍有零散英文片段。
- 修改 `description` 后需重启 WorkBuddy。
