-- 1. 先删除旧的静态表（如果存在）
DROP TABLE IF EXISTS province_stats;

-- 2. 创建动态汇总视图
CREATE VIEW province_stats AS
SELECT
    -- 提取法院名称的前两个字作为省份名
    SUBSTRING(c.court_name, 1, 2) AS province_name,

    -- 汇总案件数量
    COUNT(c.case_id) AS case_count,

    -- 动态计算风险等级
    CASE
        WHEN COUNT(ls.supervision_id) > 10 THEN '极高'
        WHEN COUNT(ls.supervision_id) > 5 THEN '高'
        WHEN COUNT(ls.supervision_id) > 2 THEN '中'
        ELSE '低'
        END AS risk_level,

    -- 统计总涉案金额
    SUM(cd.involved_amount) AS total_amount,

    -- 记录更新时间
    NOW() AS update_time
FROM cases c
         LEFT JOIN case_details cd ON c.case_id = cd.case_id
         LEFT JOIN legal_supervision ls ON c.case_id = ls.case_id
GROUP BY SUBSTRING(c.court_name, 1, 2);