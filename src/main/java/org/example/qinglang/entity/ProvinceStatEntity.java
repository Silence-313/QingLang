package org.example.qinglang.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;

@Entity
@Table(name = "province_stats")
@Data
public class ProvinceStatEntity {

    @Id // 将省份名称作为主键
    @Column(name = "province_name")
    private String provinceName;

    @Column(name = "case_count")
    private Integer caseCount;

    @Column(name = "risk_level")
    private String riskLevel;

    @Column(name = "total_amount")
    private BigDecimal totalAmount;
}