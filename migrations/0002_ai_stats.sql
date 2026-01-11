-- AI 使用统计表 (RPM/TPM 限制)
CREATE TABLE IF NOT EXISTS ai_usage_stats (
    model_id TEXT NOT NULL,
    minute_key TEXT NOT NULL, -- 格式: YYYY-MM-DD HH:mm
    request_count INTEGER DEFAULT 0,
    token_count INTEGER DEFAULT 0,
    PRIMARY KEY (model_id, minute_key)
);
