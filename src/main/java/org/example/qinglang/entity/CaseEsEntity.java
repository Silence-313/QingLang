package org.example.qinglang.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

@Data
@Document(indexName = "legal_cases") // 必须与 ES 索引名一致
public class CaseEsEntity {

    @Id
    private Integer caseId; // 对应 MySQL 的 case_id

    @Field(type = FieldType.Text, analyzer = "ik_max_word", searchAnalyzer = "ik_smart")
    private String title;

    @Field(type = FieldType.Text, analyzer = "ik_max_word", searchAnalyzer = "ik_smart")
    private String content;

    @Field(type = FieldType.Text, analyzer = "ik_max_word")
    private String partyNames;

    @Field(type = FieldType.Keyword)
    private String caseType;


}