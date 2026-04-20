package org.example.qinglang.controller;

import org.example.qinglang.entity.PartyEntity;
import org.example.qinglang.repository.PartyRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/parties")
public class PartyController {

    @Autowired
    private PartyRepository partyRepository;

    /**
     * 根据案件ID获取所有当事人
     */
    @GetMapping("/case/{caseId}")
    public List<PartyEntity> getPartiesByCaseId(@PathVariable Integer caseId) {
        return partyRepository.findByCaseEntityCaseId(caseId);
    }
}