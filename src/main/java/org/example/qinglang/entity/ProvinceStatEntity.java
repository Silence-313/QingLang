package org.example.qinglang.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "province_stats")
@Data
public class ProvinceStatEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private String provinceName;
    private Integer caseCount;
    private String riskLevel;
}