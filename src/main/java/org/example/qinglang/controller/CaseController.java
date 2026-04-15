package org.example.qinglang.controller;

import org.example.qinglang.dto.CaseWithReasonDto;
import org.example.qinglang.entity.CaseEntity;
import org.example.qinglang.entity.CaseEsEntity; // 导入 ES 实体
import org.example.qinglang.repository.CaseDetailRepository;
import org.example.qinglang.repository.CaseRepository;
import org.example.qinglang.service.CaseService;
import org.example.qinglang.repository.CaseEsRepository; // 注入 ES 仓库
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cases")
public class CaseController {

    @Autowired
    private CaseService caseService;

    @Autowired
    private CaseEsRepository caseEsRepository; // 注入 ES Repository

    @Autowired
    private CaseDetailRepository caseDetailRepository;

    @Autowired
    private CaseRepository caseRepository;

    @GetMapping
    public List<CaseEntity> list() {
        return caseService.getAllCases();
    }

    @PostMapping
    public CaseEntity create(@RequestBody CaseEntity caseEntity) {
        return caseService.saveCase(caseEntity);
    }

    @GetMapping("/grouped")
    public Map<String, List<CaseEntity>> listGrouped() {
        return caseService.getCasesGroupByType();
    }

    /**
     * 搜索逻辑已经改为从 Elasticsearch 中获取
     * 这样前端代码 main.js 不需要改动地址，依然访问 /api/cases/search
     */
    @GetMapping("/search")
    public List<CaseEsEntity> search(
            @RequestParam String keyword,
            @RequestParam(required = false) String caseType,
            @RequestParam(required = false) String caseReason) {
        if (caseType != null && caseType.trim().isEmpty()) {
            caseType = null;
        }
        if (caseReason != null && caseReason.trim().isEmpty()) {
            caseReason = null;
        }
        return caseService.advancedSearch(keyword, caseType, caseReason);
    }

    @GetMapping("/types")
    public List<String> getAllCaseTypes() {
        return caseRepository.findAllDistinctCaseTypes();
    }

    @GetMapping("/reasons")
    public List<String> getAllCaseReasons() {
        return caseDetailRepository.findAllDistinctCaseReasons();
    }

    @GetMapping("/grouped-by-reason")
    public Map<String, List<CaseEntity>> getCasesGroupedByTypeWithReason(
            @RequestParam(required = false) String caseReason) {
        return caseService.getCasesGroupedByType(caseReason);
    }

    @GetMapping("/by-type")
    public List<CaseWithReasonDto> getCasesByType(@RequestParam String type) {
        return caseService.getCasesWithReasonByType(type);
    }

}