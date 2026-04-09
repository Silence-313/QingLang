import pymysql
from elasticsearch import Elasticsearch, helpers

# MySQL 配置（根据你的实际情况填写密码）
mysql_config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'naonao050301',
    'database': 'QingLang',
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

es = Elasticsearch("http://localhost:9200")

def fetch_data_from_mysql():
    connection = pymysql.connect(**mysql_config)
    try:
        with connection.cursor() as cursor:
            # 这是一个强大的联合查询，把四张表的信息聚合成一条记录[cite: 1]
            sql = """
            SELECT 
                c.case_id, 
                c.case_number, 
                c.case_name, 
                c.case_type,
                c.acceptance_date,
                d.case_reason, 
                d.applicable_law,
                s.clue_description,
                s.supervision_field,
                (SELECT GROUP_CONCAT(party_name) FROM parties WHERE case_id = c.case_id) as party_names
            FROM cases c
            LEFT JOIN case_details d ON c.case_id = d.case_id
            LEFT JOIN legal_supervision s ON c.case_id = s.case_id
            """
            cursor.execute(sql)
            return cursor.fetchall()
    finally:
        connection.close()

def sync():
    print("🚀 开始从 MySQL 联表提取法治数据...")
    rows = fetch_data_from_mysql()

    actions = []
    for row in rows:
        # 映射 MySQL 字段到 ES 索引字段[cite: 1]
        action = {
            "_index": "legal_cases",
            "_id": row['case_id'],
            "_source": {
                "title": f"{row['case_name']} ({row['case_number']})", # 拼接标题
                "content": f"案由：{row['case_reason'] or '无'}。适用法律：{row['applicable_law'] or '无'}。监督线索：{row['clue_description'] or '无'}",
                "case_type": row['case_type'],
                "party_names": row['party_names'], # 新增：当事人列表
                "supervision_field": row['supervision_field'],
                "publish_date": row['acceptance_date'].strftime('%Y-%m-%d') if row['acceptance_date'] else None
            }
        }
        actions.append(action)

    if actions:
        success, _ = helpers.bulk(es, actions)
        print(f"✅ 成功同步 {success} 条复合案件数据到 Elasticsearch!")
    else:
        print("查无数据，请确认 MySQL 表中是否有记录。")

if __name__ == "__main__":
    sync()