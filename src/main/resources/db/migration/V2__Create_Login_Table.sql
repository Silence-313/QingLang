-- 5. 用户登录信息表
CREATE TABLE IF NOT EXISTS login (
                                     user_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '用户唯一ID',
                                     username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
                                     email VARCHAR(100) UNIQUE COMMENT '邮箱',
                                     phone VARCHAR(20) UNIQUE COMMENT '电话/手机号',
                                     password VARCHAR(255) NOT NULL COMMENT '加密存储的密码',
                                     real_name VARCHAR(50) COMMENT '真实姓名',
                                     role VARCHAR(20) DEFAULT 'USER' COMMENT '角色: USER/ADMIN',
                                     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;