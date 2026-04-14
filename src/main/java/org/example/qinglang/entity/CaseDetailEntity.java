package org.example.qinglang.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "case_details")
@Data
public class CaseDetailEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer detailId;

    @Column(name = "case_id", unique = true)
    private Integer caseId;

    @Column(name = "case_reason")
    private String caseReason;

    // 新增缺失字段
    @Column(name = "judgment_results", columnDefinition = "TEXT")
    private String judgmentResults;

    @Column(name = "judgment_type")
    private String judgmentType;

    @Column(name = "is_enforced")
    private Boolean isEnforced;

    @Column(name = "appeal_status")
    private String appealStatus;

    @Column(name = "has_overseas_evidence")
    private Boolean hasOverseasEvidence;

    @Column(name = "overseas_evidence_type")
    private String overseasEvidenceType;

    @Column(name = "infringement_location")
    private String infringementLocation;

    @Column(name = "damage_location")
    private String damageLocation;

    @Column(name = "applicable_law", columnDefinition = "TEXT")
    private String applicableLaw;

    @Column(name = "treaty_priority")
    private Boolean treatyPriority;

    @Column(name = "foreign_related_pages")
    private Integer foreignRelatedPages;

    @Column(name = "archive_language")
    private String archiveLanguage;
}