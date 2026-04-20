package org.example.qinglang.controller;

import org.example.qinglang.entity.LegalSupervisionEntity;
import org.example.qinglang.repository.LegalSupervisionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/legal-supervision")
public class LegalSupervisionController {

    @Autowired
    private LegalSupervisionRepository legalSupervisionRepository;

    /**
     * 根据案件ID获取法律监督信息
     */
    @GetMapping("/{caseId}")
    public ResponseEntity<LegalSupervisionEntity> getSupervisionByCaseId(@PathVariable Integer caseId) {
        return legalSupervisionRepository.findByCaseId(caseId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}