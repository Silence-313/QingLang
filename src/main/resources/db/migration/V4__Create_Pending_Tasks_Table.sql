
-- 待办任务表
CREATE TABLE IF NOT EXISTS pending_tasks (
                                             task_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '任务ID',
                                             case_id INT NOT NULL COMMENT '关联案件ID',
                                             task_title VARCHAR(255) COMMENT '任务标题（可选，默认使用案件名称）',
                                             task_status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED') DEFAULT 'PENDING' COMMENT '任务状态',
                                             priority ENUM('LOW', 'MEDIUM', 'HIGH') DEFAULT 'MEDIUM' COMMENT '优先级',
                                             assigned_to VARCHAR(100) COMMENT '负责人',
                                             due_date DATE COMMENT '截止日期',
                                             notes TEXT COMMENT '备注',
                                             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                                             updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
                                             CONSTRAINT fk_pending_case FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE,
                                             INDEX idx_status (task_status),
                                             INDEX idx_priority (priority),
                                             INDEX idx_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='待办任务表';