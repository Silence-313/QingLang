USE QingLang;

-- 会话表
CREATE TABLE IF NOT EXISTS conversations (
                                             conversation_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '会话ID',
                                             user_id INT NOT NULL COMMENT '用户ID',
                                             title VARCHAR(255) NOT NULL COMMENT '会话标题（用户第一个问题）',
                                             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                                             updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
                                             INDEX idx_user_id (user_id),
                                             CONSTRAINT fk_conversation_user FOREIGN KEY (user_id) REFERENCES login(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='对话会话表';

-- 修改 chat_history 表，添加 conversation_id 外键
ALTER TABLE chat_history
    ADD COLUMN conversation_id INT DEFAULT NULL AFTER user_id,
    ADD INDEX idx_conversation_id (conversation_id),
    ADD CONSTRAINT fk_chat_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE;

-- 将现有数据归入一个默认会话（可选）
-- 如果已有数据，需要先创建默认会话再关联，此处略。