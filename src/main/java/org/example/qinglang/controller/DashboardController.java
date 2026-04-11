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
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired
    private CaseService caseService;

    @GetMapping("/left-stats")
    public ResponseEntity<Map<String, Object>> getLeftPanelStats(
            @RequestParam(required = false) String province) {
        return ResponseEntity.ok(caseService.getLeftPanelStats(province));
    }
}