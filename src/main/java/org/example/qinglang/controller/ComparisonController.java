// ComparisonController.java
package org.example.qinglang.controller;

import org.example.qinglang.service.ComparisonService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/comparison")
public class ComparisonController {

    @Autowired
    private ComparisonService comparisonService;

    /**
     * 获取两个省份的对比数据
     * @param provinceA 省份A简称
     * @param provinceB 省份B简称
     */
    @GetMapping("/provinces")
    public ResponseEntity<Map<String, Object>> compareProvinces(
            @RequestParam String provinceA,
            @RequestParam String provinceB) {
        Map<String, Object> result = comparisonService.compare(provinceA, provinceB);
        return ResponseEntity.ok(result);
    }

    /**
     * 获取所有有案件的省份列表（供下拉框使用）
     */
    @GetMapping("/available-provinces")
    public ResponseEntity<List<String>> getAvailableProvinces() {
        return ResponseEntity.ok(comparisonService.getAvailableProvinces());
    }

    @GetMapping("/cases")
    public ResponseEntity<List<Map<String, Object>>> getFilteredCases(
            @RequestParam String provinceA,
            @RequestParam String provinceB,
            @RequestParam(required = false) String year,
            @RequestParam(required = false) String caseType) {
        List<Map<String, Object>> cases = comparisonService.getFilteredCases(provinceA, provinceB, year, caseType);
        return ResponseEntity.ok(cases);
    }

}