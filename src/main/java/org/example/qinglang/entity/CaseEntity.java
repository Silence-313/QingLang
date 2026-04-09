package org.example.qinglang.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;

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

    private String courtName;
    @Column(name = "case_type")
    private String caseType;
    private LocalDate acceptanceDate;
    private LocalDate closingDate;
    private Integer totalPages;
    private String documentTypes;

    @Transient // 告诉 JPA 这不是 cases 表的列
    private String causeOfAction;

    // 新增：建立与 PartyEntity 的一对多关联[cite: 18]
    @OneToMany(mappedBy = "caseEntity", fetch = FetchType.LAZY)
    private List<PartyEntity> parties;
}