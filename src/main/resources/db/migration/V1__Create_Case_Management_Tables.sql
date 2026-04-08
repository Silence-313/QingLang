-- 1. 案件基础信息表
CREATE TABLE IF NOT EXISTS cases (
                                     case_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '自增主键',
                                     case_number VARCHAR(100) UNIQUE NOT NULL COMMENT '案件编号: 京0105刑初1234号',
                                     case_name VARCHAR(255) NOT NULL COMMENT '案件名称',
                                     court_name VARCHAR(255) COMMENT '审理法院/检察院',
                                     case_type VARCHAR(50) COMMENT '案件类型: 刑事',
                                     acceptance_date DATE COMMENT '受理日期',
                                     closing_date DATE COMMENT '结案日期',
                                     total_pages INT COMMENT '卷宗总页数',
                                     document_types VARCHAR(255) COMMENT '文书类型: 起诉书+证据材料'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. 当事人信息表
CREATE TABLE IF NOT EXISTS parties (
                                       party_id INT AUTO_INCREMENT PRIMARY KEY,
                                       case_id INT COMMENT '关联案件ID',
                                       party_name VARCHAR(100) COMMENT '当事人姓名/名称',
                                       nationality VARCHAR(100) COMMENT '国籍',
                                       party_type VARCHAR(50) COMMENT '当事人类型: 自然人/法人',
                                       has_foreign_lawyer BOOLEAN DEFAULT FALSE COMMENT '外籍当事人是否聘请律师',
                                       language_ability VARCHAR(100) COMMENT '外籍当事人语言能力',
                                       is_foreign_invested BOOLEAN DEFAULT FALSE COMMENT '是否涉及外商投资企业',
                                       CONSTRAINT fk_parties_case FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. 案件业务详情与证据表
CREATE TABLE IF NOT EXISTS case_details (
                                            detail_id INT AUTO_INCREMENT PRIMARY KEY,
                                            case_id INT UNIQUE,
                                            case_reason VARCHAR(255) COMMENT '涉外案由',
                                            involved_amount DECIMAL(18, 2) COMMENT '涉案金额',
                                            has_overseas_evidence BOOLEAN DEFAULT FALSE COMMENT '是否涉及境外证据',
                                            overseas_evidence_type VARCHAR(255) COMMENT '境外证据类型',
                                            infringement_location VARCHAR(255) COMMENT '侵权行为发生地',
                                            damage_location VARCHAR(255) COMMENT '损害结果发生地',
                                            applicable_law TEXT COMMENT '适用法律/条约',
                                            treaty_priority BOOLEAN DEFAULT FALSE COMMENT '是否主张条约优先适用',
                                            foreign_related_pages INT COMMENT '涉外相关页数',
                                            archive_language VARCHAR(100) COMMENT '卷宗语种',
                                            CONSTRAINT fk_details_case FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. 法律监督表
CREATE TABLE IF NOT EXISTS legal_supervision (
                                                 supervision_id INT AUTO_INCREMENT PRIMARY KEY,
                                                 case_id INT,
                                                 has_supervision_point BOOLEAN DEFAULT FALSE COMMENT '是否存在监督点',
                                                 supervision_field VARCHAR(100) COMMENT '监督领域',
                                                 supervision_type VARCHAR(100) COMMENT '监督类型',
                                                 clue_description TEXT COMMENT '监督线索具体描述',
                                                 severity_level VARCHAR(20) COMMENT '监督线索严重程度: 高/中/低',
                                                 CONSTRAINT fk_supervision_case FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;