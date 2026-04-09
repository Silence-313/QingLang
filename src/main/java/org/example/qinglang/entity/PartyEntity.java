package org.example.qinglang.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "parties")
@Data
public class PartyEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer partyId;

    // 关键：建立与 CaseEntity 的多对一关联
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "case_id")
    @JsonIgnore  // 阻止从 Party 反向序列化 Case
    private CaseEntity caseEntity;

    private String partyName;
    private String nationality;
    private String partyType;
    private Boolean hasForeignLawyer;
    private String languageAbility;
    private Boolean isForeignInvested;
}