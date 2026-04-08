-- 新建省份统计数据表
CREATE TABLE IF NOT EXISTS province_stats (
                                              id INT AUTO_INCREMENT PRIMARY KEY,
                                              province_name VARCHAR(50) UNIQUE NOT NULL COMMENT '省份名称',
                                              case_count INT DEFAULT 0 COMMENT '案件数量',
                                              risk_level VARCHAR(20) DEFAULT '低' COMMENT '风险等级: 极高/高/中/低',
                                              update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 初始化部分演示数据
INSERT INTO province_stats (province_name, case_count, risk_level) VALUES
                                                                       ('北京', 450, '极高'), ('上海', 520, '极高'), ('广东', 510, '极高');