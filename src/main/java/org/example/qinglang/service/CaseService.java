package org.example.qinglang.service;

import org.example.qinglang.entity.CaseEntity;
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

    public List<CaseEntity> getAllCases() {
        return caseRepository.findAll();
    }

    public CaseEntity saveCase(CaseEntity caseEntity) {
        return caseRepository.save(caseEntity);
    }

    public Map<String, List<CaseEntity>> getCasesGroupByType() {
        List<CaseEntity> allCases = caseRepository.findAll();
        return allCases.stream().collect(Collectors.groupingBy(CaseEntity::getCaseType));
    }

    public List<CaseEntity> searchByKeyword(String keyword) {
        // 确保调用的是 repository 里的这个自定义方法
        return caseRepository.searchByKeyword(keyword);
    }

    public CaseEntity getCaseById(Integer id) {
        return caseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("案件未找到，ID: " + id));
    }
}