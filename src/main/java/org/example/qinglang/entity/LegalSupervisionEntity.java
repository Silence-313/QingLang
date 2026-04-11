package org.example.qinglang.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "legal_supervision")
@Data
public class LegalSupervisionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "supervision_id")
    private Integer supervisionId;

    @Column(name = "case_id", nullable = false)
    private Integer caseId;

    @Column(name = "has_supervision_point")
    private Boolean hasSupervisionPoint;

    @Column(name = "supervision_field")
    private String supervisionField;

    @Column(name = "supervision_type")
    private String supervisionType;

    @Column(name = "clue_description", columnDefinition = "TEXT")
    private String clueDescription;

    @Column(name = "severity_level")
    private String severityLevel;
}