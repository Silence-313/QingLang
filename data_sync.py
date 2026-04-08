import pandas as pd
from sqlalchemy import create_engine, text

# --- 1. 数据库配置 (请根据实际情况修改) ---
DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': 'naonao050301',
    'database': 'QingLang'
}

engine = create_engine(f"mysql+pymysql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}?charset=utf8mb4")

def clean_boolean(value):
    """转换多种格式的布尔值为 Python 布尔值"""
    if pd.isna(value) or value == '': return False
    val_str = str(value).strip().lower()
    return val_str in ['true', '1', '1.0', '是', 'yes', 't']

def sync_excel_to_db(file_path):
    # --- Step A: 读取数据并同步 cases 主表 ---
    # 假设你的 Excel 不同 Sheet 分别命名为 cases, parties, details, supervision
    df_cases = pd.read_excel(file_path, sheet_name='cases')

    with engine.begin() as conn:
        for _, row in df_cases.iterrows():
            upsert_sql = text("""
                INSERT INTO cases (case_number, case_name, court_name, case_type, acceptance_date, closing_date, total_pages, document_types)
                VALUES (:case_number, :case_name, :court_name, :case_type, :acceptance_date, :closing_date, :total_pages, :document_types)
                ON DUPLICATE KEY UPDATE 
                case_name=VALUES(case_name), court_name=VALUES(court_name), closing_date=VALUES(closing_date);
            """)
            # 注意：这里的 row.to_dict() 中的 key 必须和 Excel 表头 case_number 等完全一致
            conn.execute(upsert_sql, row.to_dict())
    print("✅ 案件基础信息同步完成")

    # 获取数据库生成的 case_id 和 case_number 的映射
    mapping = pd.read_sql("SELECT case_id, case_number FROM cases", engine)
    id_map = dict(zip(mapping['case_number'], mapping['case_id']))

    # --- Step B: 同步 parties 表 ---
    df_parties = pd.read_excel(file_path, sheet_name='parties')
    # 关键修正：这里使用 case_number 匹配
    df_parties['case_id'] = df_parties['case_number'].str.strip().map(id_map)
    df_parties['has_foreign_lawyer'] = df_parties['has_foreign_lawyer'].apply(clean_boolean)
    df_parties['is_foreign_invested'] = df_parties['is_foreign_invested'].apply(clean_boolean)

    parties_final = df_parties.dropna(subset=['case_id'])[['case_id', 'party_name', 'nationality', 'party_type', 'has_foreign_lawyer', 'language_ability', 'is_foreign_invested']]
    parties_final.to_sql('parties', engine, if_exists='append', index=False)
    print(f"✅ 当事人信息同步完成 ({len(parties_final)} 条)")

    # --- Step C: 同步 case_details 表 ---
    df_details = pd.read_excel(file_path, sheet_name='details')
    df_details['case_id'] = df_details['case_number'].str.strip().map(id_map)
    df_details['has_overseas_evidence'] = df_details['has_overseas_evidence'].apply(clean_boolean)
    df_details['treaty_priority'] = df_details['treaty_priority'].apply(clean_boolean)

    details_final = df_details.dropna(subset=['case_id'])[['case_id', 'case_reason', 'involved_amount', 'has_overseas_evidence', 'overseas_evidence_type', 'infringement_location', 'damage_location', 'applicable_law', 'treaty_priority', 'foreign_related_pages', 'archive_language']]

    with engine.begin() as conn:
        for _, row in details_final.iterrows():
            conn.execute(text("""
                REPLACE INTO case_details (case_id, case_reason, involved_amount, has_overseas_evidence, overseas_evidence_type, infringement_location, damage_location, applicable_law, treaty_priority, foreign_related_pages, archive_language)
                VALUES (:case_id, :case_reason, :involved_amount, :has_overseas_evidence, :overseas_evidence_type, :infringement_location, :damage_location, :applicable_law, :treaty_priority, :foreign_related_pages, :archive_language)
            """), row.to_dict())
    print("✅ 案件业务详情同步完成")

    # --- Step D: 同步 legal_supervision 表 ---
    df_super = pd.read_excel(file_path, sheet_name='supervision')
    df_super['case_id'] = df_super['case_number'].str.strip().map(id_map)
    df_super['has_supervision_point'] = df_super['has_supervision_point'].apply(clean_boolean)

    super_final = df_super.dropna(subset=['case_id'])[['case_id', 'has_supervision_point', 'supervision_field', 'supervision_type', 'clue_description', 'severity_level']]
    super_final.to_sql('legal_supervision', engine, if_exists='append', index=False)
    print("✅ 法律监督信息同步完成")

if __name__ == "__main__":
    sync_excel_to_db("qinglang_data.xlsx")