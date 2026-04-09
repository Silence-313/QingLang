-- 1. 删除旧视图
DROP VIEW IF EXISTS province_stats;

-- 2. 创建健壮的汇总视图
CREATE VIEW province_stats AS
WITH cleaned_cases AS (
    SELECT
        case_id,
        -- 清洗逻辑：
        -- 1. 移除 '一审：', '二审：', '审查起诉：' 等前缀
        -- 2. 移除空格和 '检察院' 关键字
        -- 3. 针对 '最高人民法院' 特殊处理为 '北京'
        -- 4. 最后取前两个字
        CASE
            WHEN court_name LIKE '%最高人民法院%' THEN '北京'
            ELSE SUBSTRING(
                    REGEXP_REPLACE(
                            REGEXP_REPLACE(court_name, '^(一审|二审|审查起诉|再审)[:： ]*', ''),
                            '^检察院[ ]*', ''
                    ), 1, 2
                 )
            END AS clean_province
    FROM cases
)
SELECT
    cc.clean_province AS province_name,
    COUNT(DISTINCT c.case_id) AS case_count,

    -- 风险等级计算
    CASE
        WHEN COUNT(DISTINCT ls.supervision_id) > 10 THEN '极高'
        WHEN COUNT(DISTINCT ls.supervision_id) > 5 THEN '高'
        WHEN COUNT(DISTINCT ls.supervision_id) > 2 THEN '中'
        ELSE '低'
        END AS risk_level,

    -- 涉案金额汇总
    COALESCE(SUM(cd.involved_amount), 0) AS total_amount,
    NOW() AS update_time
FROM cleaned_cases cc
         JOIN cases c ON cc.case_id = c.case_id
         LEFT JOIN case_details cd ON c.case_id = cd.case_id
         LEFT JOIN legal_supervision ls ON c.case_id = ls.case_id
-- 过滤掉清洗后依然无法识别或者为空的数据
WHERE cc.clean_province IS NOT NULL AND cc.clean_province != ''
GROUP BY cc.clean_province;