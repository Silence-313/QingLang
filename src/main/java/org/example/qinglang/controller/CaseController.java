package org.example.qinglang.controller;

import org.example.qinglang.entity.CaseEntity;
import org.example.qinglang.service.CaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
}