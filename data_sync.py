import pandas as pd
import numpy as np
import re
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.types import Date, Integer, String, Text, Boolean
import pymysql

# --------------------------- 配置区域 ---------------------------
EXCEL_PATH = "qinglang_data.xlsx"
DB_CONFIG = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "naonao050301",
    "database": "QingLang",
    "charset": "utf8mb4"
}

# --------------------------- 辅助函数 ---------------------------
def clean_date(value):
    """清洗日期字段，返回 date 对象或 None"""
    if pd.isna(value) or value in ("", "/", "不适用", "无"):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        value = value.strip()
        # 处理格式如 "2013/5/6"
        if re.match(r"\d{4}/\d{1,2}/\d{1,2}", value):
            try:
                return datetime.strptime(value, "%Y/%m/%d").date()
            except:
                pass
        # 处理格式 "2021-01-01 00:00:00"
        if " " in value:
            value = value.split(" ")[0]
        # 处理格式 "2021-01-01"
        try:
            return datetime.strptime(value, "%Y-%m-%d").date()
        except:
            pass
        # 处理格式 "2021/5/6"
        try:
            return datetime.strptime(value, "%Y/%m/%d").date()
        except:
            pass
        # 处理带有文字描述的日期，例如 "二审结案：2022/9/5（一审：2022/3/24）"
        match = re.search(r"(\d{4}[/-]\d{1,2}[/-]\d{1,2})", value)
        if match:
            ds = match.group(1).replace("/", "-")
            try:
                return datetime.strptime(ds, "%Y-%m-%d").date()
            except:
                pass
    return None

def clean_bool(value):
    """清洗布尔字段"""
    if isinstance(value, bool):
        return value
    if pd.isna(value):
        return False
    if isinstance(value, str):
        if value.strip().lower() == "true":
            return True
        if value.strip().lower() == "false":
            return False
    return False

def clean_string(value):
    """清洗字符串字段，去除首尾空白、换行符"""
    if pd.isna(value):
        return None
    if isinstance(value, str):
        value = value.replace("<br>", " ").replace("\n", " ").replace("\r", " ").strip()
        if value in ("", "/", "无", "不适用", "不涉及"):
            return None
        return value
    return str(value).strip()

def clean_int(value):
    """清洗整数字段"""
    if pd.isna(value):
        return None
    try:
        return int(float(value))
    except:
        return None

def clean_case_type(value):
    """
    清洗并标准化案件类型字段。
    优先级：公益诉讼 > 行政 = 刑事 = 民事
    最终输出仅限：'公益诉讼', '行政', '刑事', '民事'
    """
    if pd.isna(value):
        return None
    if not isinstance(value, str):
        value = str(value)

    val = value.strip()

    # 1. 优先匹配“公益诉讼”
    if "公益诉讼" in val:
        return "公益诉讼"

    # 2. 匹配其他三种类型（可处理类似“民事公益诉讼”但未含“公益诉讼”字样或已处理的情况）
    if "行政" in val:
        return "行政"
    if "刑事" in val:
        return "刑事"
    if "民事" in val:
        return "民事"

    # 3. 若无匹配，返回 None（或根据需要设定默认值，如"民事"）
    return None
# --------------------------- 主程序 ---------------------------
def main():
    # 读取 Excel 所有 sheet
    print("正在读取 Excel 文件...")
    df_cases_raw = pd.read_excel(EXCEL_PATH, sheet_name="cases")
    df_parties_raw = pd.read_excel(EXCEL_PATH, sheet_name="parties")
    df_details_raw = pd.read_excel(EXCEL_PATH, sheet_name="details")
    df_supervision_raw = pd.read_excel(EXCEL_PATH, sheet_name="supervision")

    # 创建数据库连接
    engine = create_engine(
        f"mysql+pymysql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}?charset={DB_CONFIG['charset']}"
    )

    # ---------- 1. 清洗 cases 表数据 ----------
    print("清洗 cases 表...")
    df_cases = pd.DataFrame()
    df_cases["case_number"] = df_cases_raw["case_number"].apply(clean_string)
    df_cases["case_name"] = df_cases_raw["case_name"].apply(clean_string)
    df_cases["court_name"] = df_cases_raw["court_name"].apply(clean_string)
    df_cases["case_type"] = df_cases_raw["case_type"].apply(clean_case_type)
    df_cases["acceptance_date"] = df_cases_raw["acceptance_date"].apply(clean_date)
    df_cases["closing_date"] = df_cases_raw["closing_date"].apply(clean_date)
    df_cases["total_pages"] = df_cases_raw["total_pages"].apply(clean_int)
    df_cases["document_types"] = df_cases_raw["document_types"].apply(clean_string)

    # 去重，保留第一条（根据 case_number 唯一约束）
    df_cases = df_cases.drop_duplicates(subset=["case_number"]).reset_index(drop=True)
    df_cases = df_cases.where(pd.notnull(df_cases), None)

    # 写入 cases 表
    print("写入 cases 表...")
    df_cases.to_sql("cases", con=engine, if_exists="append", index=False,
                    dtype={
                        "acceptance_date": Date,
                        "closing_date": Date,
                        "total_pages": Integer,
                    })

    # 获取 case_id 映射
    with engine.connect() as conn:
        result = conn.execute(text("SELECT case_id, case_number FROM cases"))
        case_map = {row[1]: row[0] for row in result.fetchall()}

    # ---------- 2. 清洗 parties 表数据 ----------
    print("清洗 parties 表...")
    df_parties = pd.DataFrame()
    df_parties["case_number"] = df_parties_raw["case_number"].apply(clean_string)
    df_parties["party_name"] = df_parties_raw["party_name"].apply(clean_string)
    df_parties["nationality"] = df_parties_raw["nationality"].apply(clean_string)
    df_parties["party_type"] = df_parties_raw["party_type"].apply(clean_string)
    df_parties["has_foreign_lawyer"] = df_parties_raw["has_foreign_lawyer"].apply(clean_bool)
    df_parties["language_ability"] = df_parties_raw["language_ability"].apply(clean_string)
    df_parties["is_foreign_invested"] = df_parties_raw["is_foreign_invested"].apply(clean_bool)

    # 映射 case_id
    df_parties["case_id"] = df_parties["case_number"].map(case_map)
    df_parties = df_parties.dropna(subset=["case_id"])
    df_parties = df_parties.drop(columns=["case_number"])
    df_parties = df_parties.where(pd.notnull(df_parties), None)

    # 写入 parties 表
    print("写入 parties 表...")
    df_parties.to_sql("parties", con=engine, if_exists="append", index=False)

    # ---------- 3. 清洗 case_details 表数据 ----------
    print("清洗 case_details 表...")
    df_details = pd.DataFrame()
    df_details["case_number"] = df_details_raw["case_number"].apply(clean_string)
    df_details["case_reason"] = df_details_raw["case_reason"].apply(clean_string)
    df_details["judgment_results"] = df_details_raw["judgment_result"].apply(clean_string)
    df_details["has_overseas_evidence"] = df_details_raw["has_overseas_evidence"].apply(clean_bool)
    df_details["overseas_evidence_type"] = df_details_raw["overseas_evidence_type"].apply(clean_string)
    df_details["infringement_location"] = df_details_raw["infringement_location"].apply(clean_string)
    df_details["damage_location"] = df_details_raw["damage_location"].apply(clean_string)
    df_details["applicable_law"] = df_details_raw["applicable_law"].apply(clean_string)
    df_details["treaty_priority"] = df_details_raw["treaty_priority"].apply(clean_bool)
    df_details["foreign_related_pages"] = df_details_raw["foreign_related_pages"].apply(clean_int)
    df_details["archive_language"] = df_details_raw["archive_language"].apply(clean_string)

    df_details["case_id"] = df_details["case_number"].map(case_map)
    df_details = df_details.dropna(subset=["case_id"])
    df_details = df_details.drop(columns=["case_number"])
    df_details = df_details.where(pd.notnull(df_details), None)

    # 写入 case_details 表
    print("写入 case_details 表...")
    df_details.to_sql("case_details", con=engine, if_exists="append", index=False,
                      dtype={
                          "foreign_related_pages": Integer,
                      })

    # ---------- 4. 清洗 legal_supervision 表数据 ----------
    print("清洗 legal_supervision 表...")
    df_supervision = pd.DataFrame()
    df_supervision["case_number"] = df_supervision_raw["case_number"].apply(clean_string)
    df_supervision["has_supervision_point"] = df_supervision_raw["has_supervision_point"].apply(clean_bool)
    df_supervision["supervision_field"] = df_supervision_raw["supervision_field"].apply(clean_string)
    df_supervision["supervision_type"] = df_supervision_raw["supervision_type"].apply(clean_string)
    df_supervision["clue_description"] = df_supervision_raw["clue_description"].apply(clean_string)
    df_supervision["severity_level"] = df_supervision_raw["severity_level"].apply(clean_string)

    df_supervision["case_id"] = df_supervision["case_number"].map(case_map)
    df_supervision = df_supervision.dropna(subset=["case_id"])
    df_supervision = df_supervision.drop(columns=["case_number"])
    df_supervision = df_supervision.where(pd.notnull(df_supervision), None)

    # 写入 legal_supervision 表
    print("写入 legal_supervision 表...")
    df_supervision.to_sql("legal_supervision", con=engine, if_exists="append", index=False)

    print("数据导入完成！")

if __name__ == "__main__":
    main()