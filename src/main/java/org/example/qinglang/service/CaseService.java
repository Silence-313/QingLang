package org.example.qinglang.service;

import org.example.qinglang.entity.CaseEntity;
import org.example.qinglang.repository.CaseDetailRepository;
import org.example.qinglang.repository.CaseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CaseService {

    @Autowired
    private CaseRepository caseRepository;

    @Autowired
    private CaseDetailRepository caseDetailRepository;

    public List<CaseEntity> getAllCases() {
        return caseRepository.findAll();
    }

    public CaseEntity saveCase(CaseEntity caseEntity) {
        return caseRepository.save(caseEntity);
    }

    public Map<String, List<CaseEntity>> getCasesGroupByType() {
        List<CaseEntity> allCases = caseRepository.findAll();
        return allCases.stream()
                .filter(c -> c.getCaseType() != null)
                .collect(Collectors.groupingBy(c -> c.getCaseType().trim())); // 增加 trim()
    }

    public List<CaseEntity> searchByKeyword(String keyword) {
        // 确保调用的是 repository 里的这个自定义方法
        return caseRepository.searchByKeyword(keyword);
    }

    public CaseEntity getCaseById(Integer id) {
        // 1. 先查基础表 (cases)
        CaseEntity caseEntity = caseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("案件基础信息未找到"));

        // 2. 再查详情表 (case_details)
        caseDetailRepository.findByCaseId(id).ifPresent(detail -> {
            // 将详情表的 case_reason 赋值给实体类的 causeOfAction 字段
            caseEntity.setCauseOfAction(detail.getCaseReason());
        });

        return caseEntity;
    }


}