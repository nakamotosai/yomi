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

## Codex Handoff

Last updated: 2026-05-09

- AI backend route is centralized at `src/app/api/ai/chat/route.ts`.
- Default model chain: `qwen/qwen3.5-122b-a10b`, then `openai/gpt-oss-120b`, then `google/gemma-4-31b-it` through cliproxyapi.
- Main AI teacher chat, word explanation, and grammar explanation share `/api/ai/chat`.
- Smooth typewriter streaming is implemented in `src/store/useGeminiStore.ts`.
- Shared Markdown streaming lives in `src/components/StreamingMarkdown.tsx`.
- Word/grammar `AI老师在线解读` uses `AIExplanationMarkdown`, preserving the original structured explanation layout while rendering Markdown during streaming.
- Production AI requires Cloudflare Pages variables `CLIPROXY_API_KEY` and `CLIPROXY_API_BASE_URL`; the current base URL is the protected `https://vps.saaaai.com/yomi-cliproxy/v1` reverse proxy to the live cliproxyapi runtime.
- 2026-05-09 production fix: `fb7ea71` updates `/api/ai/chat` to read Cloudflare Pages runtime env from `ctx.env` before falling back to `process.env`, fixing the post-deploy `CLIPROXY_API_KEY is missing` 500.
- Fast dictionary entry behavior is warmed/cached in the dictionary loaders and app stores; avoid reintroducing mandatory blocking index initialization on every entry.
- Local verification used for this handoff: `npm run typecheck`, `npm run lint`, `npm run build`, real browser replay on `http://100.120.69.1:3101/`, and production POST probe against `https://yomi.saaaai.com/api/ai/chat`.
