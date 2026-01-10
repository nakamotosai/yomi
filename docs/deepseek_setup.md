# DeepSeek API 注册与配置指南

为了让“AI 语法老师”能够生成高质量的教学内容，我们需要使用 DeepSeek 的 API。
DeepSeek 是目前性价比极高的 AI 模型服务商，注册过程非常简单。

## 1. 注册账号

1.  访问 DeepSeek 开放平台官网：[https://platform.deepseek.com/](https://platform.deepseek.com/)
2.  点击右上角的 **"注册"** 或 **"登录"** 按钮。
3.  可以直接使用 **手机号** 注册，或者使用 **Google / GitHub** 账号快捷登录。
4.  注册完成后，根据提示完成简单的实名认证（如果需要）。

## 2. 获取 API Key

1.  登录成功后，进入控制台仪表盘。
2.  在左侧菜单栏找到 **"API Keys"**。
3.  点击 **"创建 API Key"** 按钮。
4.  给 Key 起个名字（例如 `Yomi-Grammar-Project`）。
5.  **重要**：复制生成的 API Key（以 `sk-` 开头的长字符串）。**请务必保存好，因为它只显示一次！**

## 3. 充值（可选但推荐）

DeepSeek 通常会赠送少量初始额度（例如 10元或 500万 token），这对于我们的测试已经足够了。
如果额度用完，可以点击 **"充值"**，只需充值 10 元人民币即可使用很久（DeepSeek 的价格非常便宜，10元能生成几百万字）。

## 4. 配置到项目中

为了安全起见，我们不要把 API Key 直接写在代码里，而是放在环境变量文件中。

1.  在项目根目录 (`c:\Users\sai\yomi\`) 下，创建一个名为 `.env.local` 的文件（如果已存在，则追加内容）。
2.  在文件中添加以下内容：

```bash
# DeepSeek API Key
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

*(请将 `sk-xxxxxxxx` 替换为您刚才复制的真实 Key)*

---

**准备好后，就可以通过脚本调用 API 进行数据生成了！**
