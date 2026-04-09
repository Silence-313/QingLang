package org.example.qinglang.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;

@Entity
@Table(name = "case_details")
@Data
public class CaseDetailEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer detailId;

    @Column(name = "case_id", unique = true)
    private Integer caseId;

    @Column(name = "case_reason") // 映射数据库的 case_reason
    private String caseReason;

    private BigDecimal involvedAmount;
    private Boolean hasOverseasEvidence;
    private String overseasEvidenceType;
    private String infringementLocation;
    private String damageLocation;

    @Column(columnDefinition = "TEXT")
    private String applicableLaw;

    private Boolean treatyPriority;
    private Integer foreignRelatedPages;
    private String archiveLanguage;
}