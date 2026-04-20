package org.example.qinglang.service;

import lombok.RequiredArgsConstructor;
import org.example.qinglang.entity.CaseEntity;
import org.example.qinglang.repository.*;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ComparisonService {

    private final CaseRepository caseRepository;
    private final CaseDetailRepository caseDetailRepository;
    private final PartyRepository partyRepository;
    private final LegalSupervisionRepository supervisionRepository;
    private final ProvinceStatRepository provinceStatRepository;

    /**
     * 获取所有有案件数据的省份简称
     */
    public List<String> getAvailableProvinces() {
        return provinceStatRepository.findAll().stream()
                .map(ps -> ps.getProvinceName())
                .filter(name -> !"其他".equals(name))
                .sorted()
                .collect(Collectors.toList());
    }

    /**
     * 对比两个省份的数据
     */
    public Map<String, Object> compare(String provinceA, String provinceB) {
        Map<String, Object> result = new HashMap<>();
        result.put("provinceA", buildProvinceData(provinceA));
        result.put("provinceB", buildProvinceData(provinceB));
        return result;
    }

    private Map<String, Object> buildProvinceData(String province) {
        Map<String, Object> data = new HashMap<>();

        // 获取该省份的所有 caseId
        List<Integer> caseIds = caseRepository.findCaseIdsByProvince(province);
        if (caseIds.isEmpty()) {
            return getEmptyData(province);
        }

        // 1. 基础统计
        long totalCases = caseIds.size();
        Long totalPages = caseRepository.sumTotalPagesByCaseIds(caseIds);
        Long supervisionCount = supervisionRepository.countByCaseIdIn(caseIds);
        Double avgRiskScore = provinceStatRepository.findById(province)
                .map(ps -> ps.getRiskScore()).orElse(0.0);

        data.put("name", province);
        data.put("totalCases", totalCases);
        data.put("totalPages", totalPages != null ? totalPages : 0L);
        data.put("supervisionCount", supervisionCount);
        data.put("avgRiskScore", avgRiskScore);

        // 2. 案件类型分布
        List<Object[]> typeStats = caseRepository.countCaseTypeByCaseIds(caseIds);
        Map<String, Long> typeMap = new LinkedHashMap<>();
        typeMap.put("刑事", 0L); typeMap.put("民事", 0L);
        typeMap.put("行政", 0L); typeMap.put("公益诉讼", 0L);
        for (Object[] row : typeStats) {
            String type = row[0] != null ? row[0].toString() : "其他";
            typeMap.put(type, (Long) row[1]);
        }
        data.put("typeDistribution", typeMap);

        // 3. 案由 Top 5
        List<Object[]> reasonStats = caseDetailRepository.countCaseReasonByCaseIds(caseIds);
        List<Map<String, Object>> topReasons = reasonStats.stream()
                .limit(5)
                .map(row -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("name", row[0] != null ? row[0].toString() : "未知案由");
                    map.put("count", row[1]);
                    return map;
                })
                .collect(Collectors.toList());
        data.put("topReasons", topReasons);

// 4. 当事人国籍 Top 5
        List<Object[]> nationalityStats = partyRepository.countPartiesByNationalityAndCaseIds(caseIds);
        List<Map<String, Object>> topNationalities = nationalityStats.stream()
                .limit(5)
                .map(row -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("name", row[0] != null ? row[0].toString() : "未知");
                    map.put("count", row[1]);
                    return map;
                })
                .collect(Collectors.toList());
        data.put("topNationalities", topNationalities);

        // 5. 适用法律/条约 Top 5
        List<String> laws = caseDetailRepository.findApplicableLawsByCaseIds(caseIds);
        Map<String, Long> lawCount = laws.stream()
                .filter(Objects::nonNull)
                .flatMap(s -> Arrays.stream(s.split("[,;，；、]")))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.groupingBy(s -> s, Collectors.counting()));
        List<Map<String, Object>> topLaws = lawCount.entrySet().stream()
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .limit(5)
                .map(e -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("name", e.getKey());
                    map.put("count", e.getValue());
                    return map;
                })
                .collect(Collectors.toList());
        data.put("topLaws", topLaws);

        // 6. 年度案件数量统计
        List<Object[]> yearlyStats = caseRepository.countCasesByYearAndCaseIds(caseIds);
        Map<String, Long> yearlyCases = new LinkedHashMap<>();
        for (Object[] row : yearlyStats) {
            String year = row[0] != null ? row[0].toString() : "未知";
            Long count = (Long) row[1];
            yearlyCases.put(year, count);
        }
        data.put("yearlyCases", yearlyCases);

        return data;
    }

    private Map<String, Object> getEmptyData(String province) {
        Map<String, Object> data = new HashMap<>();
        data.put("name", province);
        data.put("totalCases", 0);
        data.put("totalPages", 0);
        data.put("supervisionCount", 0);
        data.put("avgRiskScore", 0.0);

        Map<String, Long> typeMap = new LinkedHashMap<>();
        typeMap.put("刑事", 0L);
        typeMap.put("民事", 0L);
        typeMap.put("行政", 0L);
        typeMap.put("公益诉讼", 0L);
        data.put("typeDistribution", typeMap);

        data.put("topReasons", Collections.emptyList());
        data.put("topNationalities", Collections.emptyList());
        data.put("topLaws", Collections.emptyList());
        data.put("yearlyCases", Collections.emptyMap());
        return data;
    }

    public List<Map<String, Object>> getFilteredCases(String provinceA, String provinceB, String year, String caseType) {
        List<Integer> caseIdsA = caseRepository.findCaseIdsByProvince(provinceA);
        List<Integer> caseIdsB = caseRepository.findCaseIdsByProvince(provinceB);
        List<Integer> allCaseIds = new ArrayList<>();
        allCaseIds.addAll(caseIdsA);
        allCaseIds.addAll(caseIdsB);
        if (allCaseIds.isEmpty()) return Collections.emptyList();

        List<CaseEntity> cases = caseRepository.findAllById(allCaseIds).stream()
                .filter(c -> {
                    boolean match = true;
                    if (year != null && !year.isEmpty()) {
                        match = c.getAcceptanceDate() != null && c.getAcceptanceDate().getYear() == Integer.parseInt(year);
                    }
                    if (match && caseType != null && !caseType.isEmpty()) {
                        match = caseType.equals(c.getCaseType());
                    }
                    return match;
                })
                .collect(Collectors.toList());

        return cases.stream().map(c -> {
            Map<String, Object> map = new HashMap<>();
            map.put("caseId", c.getCaseId());
            map.put("caseNumber", c.getCaseNumber());
            map.put("caseName", c.getCaseName());
            map.put("courtName", c.getCourtName());
            map.put("caseType", c.getCaseType());
            map.put("acceptanceDate", c.getAcceptanceDate() != null ? c.getAcceptanceDate().toString() : null);
            map.put("totalPages", c.getTotalPages());
            caseDetailRepository.findByCaseId(c.getCaseId()).ifPresent(d -> {
                map.put("caseReason", d.getCaseReason());
            });
            return map;
        }).collect(Collectors.toList());
    }

}