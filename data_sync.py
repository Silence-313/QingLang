import pandas as pd

def generate_sql_script(excel_path):
    # 读取 Excel。确保录入人填写的 Sheet 名称准确
    cases = pd.read_excel(excel_path, sheet_name='cases')
    parties = pd.read_excel(excel_path, sheet_name='parties')
    details = pd.read_excel(excel_path, sheet_name='case_details')
    supervision = pd.read_excel(excel_path, sheet_name='legal_supervision')

    sql_output = []

    for _, row in cases.iterrows():
        c_no = row['case_number']
        # 1. 插入基础案件[cite: 1]
        sql_output.append(f"INSERT INTO cases (case_number, case_name, court_name, case_type, acceptance_date, total_pages) "
                          f"VALUES ('{c_no}', '{row['case_name']}', '{row['court_name']}', '{row['case_type']}', '{row['acceptance_date']}', {row['total_pages']});")

        # 2. 插入当事人。注意：这里用 (SELECT case_id...) 动态匹配刚才生成的 ID[cite: 1]
        c_parties = parties[parties['case_number'] == c_no]
        for _, p in c_parties.iterrows():
            sql_output.append(f"INSERT INTO parties (case_id, party_name, nationality, party_type) "
                              f"VALUES ((SELECT case_id FROM cases WHERE case_number='{c_no}'), '{p['party_name']}', '{p['nationality']}', '{p['party_type']}');")

        # 3. 插入监督线索[cite: 1]
        c_sup = supervision[supervision['case_number'] == c_no]
        for _, s in c_sup.iterrows():
            sql_output.append(f"INSERT INTO legal_supervision (case_id, has_supervision_point, supervision_type, clue_description) "
                              f"VALUES ((SELECT case_id FROM cases WHERE case_number='{c_no}'), {s['has_supervision_point']}, '{s['supervision_type']}', '{s['clue_description']}');")

    with open('sync_data.sql', 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_output))
    print("SQL 文件生成成功：sync_data.sql")

if __name__ == "__main__":
    generate_sql_script('qinglang_data.xlsx')