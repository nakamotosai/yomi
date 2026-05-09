# YOMI | 読み 📖

**YOMI (読み)** 是一款现代化的日语阅读辅助工具，专为日语学习者设计。通过智能分词、语法分析和即时词典查询，帮助用户更高效地阅读和理解日语文本。

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css)

---

## ✨ 核心功能

### 📝 智能文本分析
- **形态素解析**：使用 Kuromoji + Kuroshiro 引擎自动将日语文本分解为单词标记
- **自动假名标注**：为汉字自动添加振假名（ふりがな），支持隐藏常用词假名
- **词性颜色标记**：动词、形容词、助词等词性用不同颜色区分，可自定义
- **句子翻译**：可选的句子级中文翻译显示

### � 五十音图乐器 (Kana Instrument)
- **交互式假名网格**：视觉化探索平假名与片假名，支持清音/浊音/拗音过滤
- **键盘演奏模式**：像弹钢琴一样通过键盘按键（A, I, U, E, O...）触发假名发音
- **权威笔顺动画**：基于 `KanjiVG` 数据的 SVG 遮罩动画，完美呈现毛笔书写质感
- **互动描红练习**：带引导的高精度书写验证，纠正书写习惯
- **听音辨位游戏**：通过趣味练习强化假名听力与位置记忆

### �🎤 多种输入方式
| 输入方式 | 说明 |
|---------|------|
| **文本输入** | 直接粘贴或输入日语文本 |
| **图片 OCR** | 拖放/粘贴图片，使用 Tesseract.js 提取日语文本 |
| **EPUB 阅读器** | 加载电子书，逐章分析阅读 |
| **语音输入** | 语音转文字输入（实验性） |

### 🔊 文字转语音 (TTS)
- **多引擎支持**：
  - 浏览器原生语音（系统日语声音）
  - [VOICEVOX](https://voicevox.hiroshiba.jp/)（高质量本地 AI 语音）
  - Microsoft Edge TTS（在线高质量语音）
- **卡拉OK模式**：朗读时实时高亮当前单词
- **语速调节**：0.5x - 2.0x 可调

### 📚 词典查询
点击任意单词即刻查看详细释义：
- **Jisho.org**：英日词典（默认）
- **Yomitan 格式**：支持本地日中/日日词典
- **词性标签**：中/英/日三语词性显示
- **例句解析**：部分词典包含例句和用法说明

### 🎯 音调/声调标注
- **Pitch Accent 可视化**：以线条标记单词的高低音变化
- 帮助学习者掌握正确的日语发音

### 📥 单词本 & 导出
- **一键收藏**：点击 ⭐ 保存单词到本地单词本
- **Anki 导出**：TSV 格式，可直接导入 Anki 制作闪卡
- **CSV 备份**：通用格式备份所有收藏单词

### 🎨 个性化设置
- **主题切换**：亮色沉浸阅读模式 / 暗色毛玻璃模式
- **字体选择**：黑体 / 宋体
- **字号调节**：小 / 中 / 大
- **词性着色**：自定义哪些词性需要颜色高亮

---

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| **框架** | [Next.js 16](https://nextjs.org/) (App Router) |
| **前端** | [React 19](https://react.dev/) |
| **动画** | [Framer Motion](https://www.framer.com/motion/) |
| **样式** | [Tailwind CSS 4](https://tailwindcss.com/) |
| **状态管理** | [Zustand](https://github.com/pmndrs/zustand) |
| **本地存储** | [IndexedDB (idb)](https://github.com/jakearchibald/idb) |
| **日语 NLP** | [Kuromoji](https://github.com/takuyaa/kuromoji.js) + [Kuroshiro](https://github.com/hexenq/kuroshiro) |
| **假名处理** | [WanaKana](https://github.com/wanikani/wanakana) |
| **OCR** | [Tesseract.js](https://tesseract.projectnaptha.com/) |
| **EPUB** | [react-reader](https://github.com/gerhardsletten/react-reader) |
| **图标** | [Lucide React](https://lucide.dev/) |

---

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm / yarn / pnpm / bun

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/your-repo/yomi.git
cd yomi

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

### 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run start` | 运行生产服务器 |
| `npm run lint` | 运行 ESLint 检查 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run verify` | 完整验证（类型检查 + Lint + 构建） |

---

## 📂 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   ├── page.tsx           # 主页面 (Mode 切换、Reader 主体)
│   └── layout.tsx         # 应用布局
├── components/            # React 组件
│   ├── KanaGrid.tsx       # 五十音图组件
│   ├── KanaModal.tsx      # 假名详情、笔顺、描红
│   ├── KanaGame.tsx       # 假名听音游戏
│   ├── TextAnalyzer.tsx   # 核心：文本分析与阅读层
│   ├── WordToken.tsx      # 单词标记组件
│   └── ...
├── data/                  # 静态数据
│   ├── kanaData.ts        # 假名列表与映射
│   └── kanaStrokes.ts     # 假名笔顺 SVG 路径数据
├── lib/                   # 工具库
│   ├── tts/               # 自定义 TTS 引擎 (VOICEVOX, Edge)
│   └── ...
├── store/                 # Zustand 状态管理
└── ...
```

---

## ⚙️ 配置说明

### VOICEVOX 配置（可选）
如需使用高质量本地 AI 语音：
1. 下载并安装 [VOICEVOX](https://voicevox.hiroshiba.jp/)
2. 启动 VOICEVOX 引擎（默认端口 50021）
3. 在 YOMI 设置中选择 VOICEVOX 作为 TTS 引擎

### Yomitan 词典（可选）
支持导入 Yomitan 格式的本地词典，提供更丰富的中文释义。

---

## 📄 许可证

MIT License

---

## 🙏 致谢

- [Kuromoji](https://github.com/takuyaa/kuromoji.js) - 日语形态素分析器
- [Kuroshiro](https://github.com/hexenq/kuroshiro) - 日语假名转换
- [Jisho.org](https://jisho.org/) - 开源日英词典
- [VOICEVOX](https://voicevox.hiroshiba.jp/) - 高质量日语 AI 语音合成
- [kana-svg-data](https://github.com/MistOfv/kana-svg-data) - 高质量假名 SVG 数据

---

## 当前状态

Last updated: 2026-05-10 (Asia/Tokyo). README.md 是 YOMI 当前进度的唯一当前进度标准。当前版本 `0.1.0`，生产站是 `https://yomi.saaaai.com/`。

当前 AI app 运行时代码修复在 GitHub `main` 的 `4e2638a Fix AI chat markdown heading emphasis`。后续 README-only closeout commit 只更新交接文档，不改变运行时代码；因此 Cloudflare Pages Production/main 的 Active source 可能是后续文档提交，但 AI 聊天渲染代码仍包含 `4e2638a`。自定义域名 `https://yomi.saaaai.com/` 返回 HTTP 200。

AI 老师相关入口统一走 `/api/ai/chat`，后端使用 cliproxyapi 模型链 `qwen/qwen3.5-122b-a10b -> openai/gpt-oss-120b -> google/gemma-4-31b-it`。不要在未获用户明确批准时改 provider/model/fallback 顺序。

## 接手提示

- 当前进度：AI 老师聊天已使用 AI 夏目漱石式逐字 typewriter 流式体验，活跃文本写入非持久 transient state，完成后才提交到聊天历史。
- 本轮完成：AI 老师聊天卡片新增多选删除、单条删除、单条重试；模型消息保留收藏按钮，用户消息和模型消息底部操作适配手机端。
- 本轮完成：单条重试通过 `sourcePrompt` 重新走现有 `sendMessage` 流式路径，并用 `retryOfTimestamp` 标记来源；删除和重试均写入 Zustand 持久历史。
- 本轮完成：`appMode`、`centerViewMode`、`isChatOpen` 已持久化；本地预览/页面刷新后不会再无故跳回首页阅读器，移动端切到 AI 时同步 `centerViewMode === "ai"`。
- 本轮完成：Markdown 流式渲染已支持常见 LaTeX 箭头显示，例如 `$\rightarrow$` / `\Rightarrow` 会显示为可读箭头；CJK 相邻 `**bold**` 会在流式中及时渲染。
- 本轮完成：主 AI 老师聊天格式规则已固定：一级标题独立成行、只显示粗体标题文本、不显示 `1.`/小圆点；用户提问目标词在正文中自动加粗；模型自己生成的其他 `**重点**` 一律降级为下划线，不再变粗体。
- 本轮完成：`StreamingMarkdown` 通过内部 heading marker 区分“真正一级标题”和普通 Markdown strong；`接续 / 正确 / 错误 / ます形 / 正しい形 / 日常伴随动作` 等内容标签不得被渲染为粗体。
- 本轮追加修复：AI 聊天一级标题识别不再粗暴排除假名，改为“短行、无句末/冒号、命中标题语义词”的正向门禁；`ながら的核心用法`、`使用时的关键限制`、`与相似语法的区别` 这类生产样例会渲染为真正粗体标题，`接续：` 等普通强调仍渲染为下划线。
- 本轮追加修复：一级标题内部如果被模型局部加粗，例如 `**ながら**的核心用法`、`使用时的**关键限制**`、`**ながら** 的核心用法`，现在会先剥离内部 Markdown emphasis，再把整条识别为一级标题；不会只把标题碎片当作普通下划线强调。
- 本轮再次修复：模型实际可能输出 `## **ながら的核心用法**`、`## **使用时的关键限制**` 或无编号独立短标题；`StreamingMarkdown` 现在会先归一化 Markdown hash 标题和独立标题行，再渲染为 heading marker，避免被普通 strong 规则降级成下划线。
- 本轮追加门禁：新增 `npm run test:ai-chat-formatting` 并接入 `npm run verify`，固定验证真实截图同款样例，防止再漏测“目标词 + 中文标题词”、Markdown hash heading、无编号独立标题组合。
- 本轮完成：主 AI 老师上下文注入最近 6 条消息；用户清空对话后持久历史和 transient stream state 都归零，下一轮从零开始。
- 本轮完成：主 AI 老师、单词 AI 解读、语法 AI 解读提示词均要求尽量控制在 800 字以内。
- 本轮完成：单词/语法 `AI老师在线解读` 已恢复专用结构 renderer，保留 accent 标题、同色 inline labels、日文/中文例句卡、喇叭按钮、`UnifiedHighlighter` 高亮和流式显示。
- 本轮完成：带 `cacheKey` 的成功生成先写 Cloudflare R2 bucket `yomi-ai-cache` 的 `AI_CACHE` binding，D1 `ai_cache` 保留为 fallback；下次同 key 请求会优先返回 R2 缓存。
- 关键文件：`src/app/api/ai/chat/route.ts`、`src/store/useGeminiStore.ts`、`src/components/AIChatView.tsx`、`src/components/StreamingMarkdown.tsx`、`src/components/InfoPanel.tsx`、`src/store/useAppStore.ts`、`wrangler.toml`。
- 入口：生产站 `https://yomi.saaaai.com/`，AI API `https://yomi.saaaai.com/api/ai/chat`。
- 风险：生产 AI 依赖 Cloudflare Pages secrets `CLIPROXY_API_KEY` / `CLIPROXY_API_BASE_URL`、`AI_CACHE` R2 binding、`DB` D1 binding，以及 `https://vps.saaaai.com/yomi-cliproxy/v1` 到 live cliproxyapi 的反代。
- 下一步：无主动开发任务；仅在用户发现新回归或要求继续迭代时恢复。

## 本轮收口验证

- `npm run typecheck`: passed.
- `npm run lint`: passed with 87 existing warnings and 0 errors.
- `npm run test:ai-chat-formatting`: passed. 覆盖 `1. **ながら的核心用法**`、`1. **ながら**的核心用法`、`2. 使用时的**关键限制**`、`1. **ながら** 的核心用法`、`## **ながら的核心用法**`、`## **使用时的关键限制**`、无编号独立标题行；`strongTexts` included `ながら的核心用法`、`使用时的关键限制`、`与相似语法的区别`、目标词 `ながら`; `underlineTexts` included `接续：`; 二级子项未进入 `strong`。
- `npm run build`: passed; existing warnings remain for production `JWT_SECRET` and edge runtime static generation.
- `npm run pages:build`: passed; Cloudflare Next-on-Pages output generated successfully.
- `git diff --check`: passed.
- AI 老师 Markdown server-render smoke test: passed. `strong` only included true headings and target term `ながら`; `接续 / 正しい形 / ます形 / 正确` rendered as underline/non-bold; heading number/bullet did not leak.
- Production DOM probe on `https://yomi.saaaai.com/`: passed after deployment. Injected the screenshot-style AI chat sample with partial heading emphasis (`**ながら**的核心用法` / `使用时的**关键限制**`) into the real production page; DOM `strong` contained `ながら的核心用法`、`使用时的关键限制`、`与相似语法的区别`、`ながら`; `.underline` contained `接续：`; headings were not underlined and content subitems were not bold.
- `python3 /home/ubuntu/codex/scripts/design_truth_guard.py /home/ubuntu/codex/specs/yomi-clix-qwen-ai-teacher-20260509`: passed.
- GitHub app code: `4e2638a` is the current runtime fix commit before README closeout.
- Cloudflare Pages: pending re-verification after pushing this follow-up fix; the production deployment must contain runtime fix `4e2638a` before final handoff.
- Public homepage: `https://yomi.saaaai.com/` returned HTTP 200.
- Production AI API: POST `https://yomi.saaaai.com/api/ai/chat` with a minimal `请只回复 OK。` payload returned `OK` and HTTP 200.
- Production R2 cache probe: unique key `codex-closeout-r2-1778339221` first returned `CACHEOK`; second returned `{"fromCache":true,"cacheLayer":"r2"}`.
- Learning writeback: `~/.codex/mistakebook/cards/global/root-cause-and-acceptance.md` records both the original AI teacher Markdown bold/heading regression and this follow-up miss where the test matrix did not include `目标词 + 中文标题词` production examples.

## 当前边界

- Do not change the approved model chain unless the user explicitly approves a new provider/model list.
- Do not expose AI keys through `NEXT_PUBLIC_*`.
- Do not reintroduce mandatory blocking dictionary index initialization on every entry; fast entry should rely on warmed/cached dictionary loaders and app stores.
- Do not replace the word/grammar AI explanation renderer with generic Markdown unless the old structure, colors, examples, speaker buttons, and highlights are preserved.
- OCR, EPUB, TTS, kana training, and unrelated site design are outside this AI teacher closeout.

## 仓库卫生要求

- Keep `main` clean before handoff; do not leave runtime residue such as `.chrome-devtools/`, `.data/`, or `.omx/` in git status.
- For future AI/provider changes, verify the production custom-domain API route with a real POST payload, not only Cloudflare deployment status or homepage 200.
- For future `*.saaaai.com` production closeout, keep GitHub, Cloudflare Pages, custom domain, `saaaai.com` project card, planner truth source, Todoist, Notion, README, and learning writeback in sync.
