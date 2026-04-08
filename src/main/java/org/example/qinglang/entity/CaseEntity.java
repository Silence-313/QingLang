package org.example.qinglang.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Entity
@Table(name = "cases")
@Data
public class CaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer caseId;

    @Column(unique = true, nullable = false, length = 100)
    private String caseNumber; // 案件编号

    @Column(nullable = false, length = 255)
    private String caseName;   // 案件名称

    private String courtName;  // 审理法院/检察院
    private String caseType;   // 案件类型
    private LocalDate acceptanceDate; // 受理日期
    private LocalDate closingDate;    // 结案日期
    private Integer totalPages;       // 卷宗总页数
    private String documentTypes;     // 文书类型
}