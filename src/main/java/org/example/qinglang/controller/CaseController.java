package org.example.qinglang.controller;

import org.example.qinglang.entity.CaseEntity;
import org.example.qinglang.service.CaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cases")
public class CaseController {

    @Autowired
    private CaseService caseService;

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
     * 实现搜索逻辑
     * 访问路径: /api/cases/search?keyword=xxx
     */
    @GetMapping("/search")
    public List<CaseEntity> search(@RequestParam String keyword) {
        // 调用 Service 层处理模糊查询逻辑
        return caseService.searchByKeyword(keyword);
    }
}