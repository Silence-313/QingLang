-- V5__Create_Chat_History_Table.sql
USE QingLang;

-- 对话历史记录表
CREATE TABLE IF NOT EXISTS chat_history (
                                            message_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '消息ID',
                                            user_id INT NOT NULL COMMENT '关联用户ID（login表）',
                                            session_id VARCHAR(64) COMMENT '会话标识，用于区分不同对话窗口（预留）',
                                            role ENUM('user', 'assistant') NOT NULL COMMENT '角色：用户或助手',
                                            content TEXT NOT NULL COMMENT '消息内容',
                                            related_case_id INT DEFAULT NULL COMMENT '关联的案件ID（可选）',
                                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                                            INDEX idx_user_id (user_id),
                                            INDEX idx_session_id (session_id),
                                            INDEX idx_created_at (created_at),
                                            CONSTRAINT fk_chat_user FOREIGN KEY (user_id) REFERENCES login(user_id) ON DELETE CASCADE,
                                            CONSTRAINT fk_chat_case FOREIGN KEY (related_case_id) REFERENCES cases(case_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户与智能助手对话历史';