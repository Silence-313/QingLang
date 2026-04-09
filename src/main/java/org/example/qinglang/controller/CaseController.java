package org.example.qinglang.controller;

import org.example.qinglang.entity.CaseEntity;
import org.example.qinglang.entity.CaseEsEntity; // 导入 ES 实体
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
    public List<CaseEsEntity> search(@RequestParam String keyword) {
        // 直接使用 ES 进行全文检索[cite: 11]
        return caseEsRepository.findByTitleOrContentOrPartyNames(keyword, keyword, keyword);
    }
}