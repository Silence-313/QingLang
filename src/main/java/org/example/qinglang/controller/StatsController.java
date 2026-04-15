package org.example.qinglang.controller;

import org.example.qinglang.service.CaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

    @Autowired
    private CaseService caseService;

    @GetMapping("/panel")
    public ResponseEntity<Map<String, Object>> getPanelStats(@RequestParam(required = false) String province) {
        return ResponseEntity.ok(caseService.getPanelStats(province));
    }
}