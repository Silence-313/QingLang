package org.example.qinglang.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;

@Entity
@Table(name = "province_stats")
@Data
public class ProvinceStatEntity {

    @Id
    @Column(name = "province_name")
    private String provinceName;

    @Column(name = "case_count")
    private Integer caseCount;

    @Column(name = "risk_level")
    private String riskLevel;

    @Column(name = "total_amount")
    private BigDecimal totalAmount;

    // 新增：风险指数（可在视图中计算）
    @Column(name = "risk_score")
    private Double riskScore;
}