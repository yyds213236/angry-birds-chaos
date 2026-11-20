# 愤怒的小鸟 · 变态版

[在线开玩](https://yyds213236.github.io/angry-birds-chaos/)

一个非官方的弹弓物理小游戏。前三关热身；第 4 关有 6 只小猪，第 5 关起每关翻倍（12、24、48……），进入无尽模式后也继续翻倍。每只小猪都可以单独撞击和击倒。猪多时镜头会拉远，再多时小猪会分波入场，清掉一波才能迎战下一波。主线共 30 关，通关后三选一，重复选到的卡可以持续叠加。

- 手机：按住小鸟向左拖动，松手发射。飞行中轻点战场或点技能按钮。横屏可以看到更大的战场。
- 电脑：鼠标拖拽，也可在战场上用方向键瞄准、空格发射和使用技能。按 `R` 重玩当前关。
- 游戏在本浏览器保存关卡、已通关的波次和强化卡。「重试本波」保留已打完的波次；「清空卡片」会移除强化并重开当前关。
- 战场背景有动态云层和远景。开启系统的「减少动态效果」时，背景会保持静止。

无需安装依赖或构建，打开 [`docs/index.html`](docs/index.html) 即可运行。物理引擎使用 Matter.js，许可证见 [MATTER-LICENSE.txt](docs/MATTER-LICENSE.txt)。

使用 `node --test tests/*.test.cjs` 检查关卡人数、波次、碰撞和过关流程。

## 每日自动优化

这个仓库排在 [`daily-tune`](../daily-tune) 队列的第二位：菜谱项目的待办做完了，就自动轮到这里，每天改一小处，不需要人盯着。

- 待办清单：`tools/backlog.json`，一项一条，写清改哪个文件、插到什么位置、替换哪段原文。
- 每日进度：`tools/applied.json`，记录做过哪些、哪些失败过、每次跑的结果。
- 触发方式：launchd 任务 `com.hufayang.daily-tune`，每天 10:30 跑一次，改完一项就停。
- 验收标准：每次都跑 `node --test tests/*.test.cjs`，没通过就回滚这一项、标成失败、换成下一条。
- 日志：`/Users/apple/Library/Logs/daily-tune.log`，`tail -f` 就能看当天做了什么。
- 看还剩多少：`python3 ../daily-tune/daily_tune.py --status`
- 想看它明天会改什么：`python3 ../daily-tune/daily_tune.py --dry-run --project angry-birds-chaos`
- 想暂停：`bash ../daily-tune/uninstall.sh`（只摘掉定时任务，不动代码和 backlog）。想临时跳过某一条，把它的 `id` 写进 `tools/applied.json` 的 `applied` 数组。
