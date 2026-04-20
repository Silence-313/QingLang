package org.example.qinglang.service;

import org.example.qinglang.dto.CaseSaveRequest;
import org.example.qinglang.dto.CaseWithReasonDto;
import org.example.qinglang.entity.*;
import org.example.qinglang.repository.CaseDetailRepository;
import org.example.qinglang.repository.CaseRepository;
import org.example.qinglang.repository.LegalSupervisionRepository;
import org.example.qinglang.repository.PartyRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class CaseService {

    @Autowired
    private CaseRepository caseRepository;

    @Autowired
    private CaseDetailRepository caseDetailRepository;

    @Autowired
    private PartyRepository partyRepository;

    @Autowired
    private LegalSupervisionRepository supervisionRepository;

    public List<CaseEntity> getAllCases() {
        return caseRepository.findAll();
    }

    public CaseEntity saveCase(CaseEntity caseEntity) {
        return caseRepository.save(caseEntity);
    }

    public Map<String, List<CaseEntity>> getCasesGroupByType() {
        List<CaseEntity> allCases = caseRepository.findAll();
        return allCases.stream()
                .filter(c -> c.getCaseType() != null)
                .collect(Collectors.groupingBy(c -> c.getCaseType().trim())); // 增加 trim()
    }

    public List<CaseEntity> searchByKeyword(String keyword) {
        // 确保调用的是 repository 里的这个自定义方法
        return caseRepository.searchByKeyword(keyword);
    }

    public CaseEntity getCaseById(Integer id) {
        // 1. 使用 JOIN FETCH 一次性加载 parties，避免懒加载异常
        CaseEntity caseEntity = caseRepository.findByIdWithParties(id)
                .orElseThrow(() -> new RuntimeException("案件基础信息未找到"));

        // 2. 填充案由
        caseDetailRepository.findByCaseId(id).ifPresent(detail -> {
            caseEntity.setCauseOfAction(detail.getCaseReason());
        });

        // 3. 填充监督评价（将评价文本放入 transient 字段）
        supervisionRepository.findByCaseId(id).ifPresent(sup -> {
            caseEntity.setSupervisionComment(sup.getClueDescription()); // 需在 CaseEntity 中添加 transient 字段
        });

        return caseEntity;
    }

    // 修改 CaseService.java 中的 advancedSearch 方法
    public List<CaseEsEntity> advancedSearch(String keyword, String caseType, String caseReason) {
        List<CaseEntity> caseEntities = caseRepository.findByAdvancedCriteria(keyword, caseType, caseReason);

        return caseEntities.stream().map(caseEntity -> {
            CaseEsEntity esEntity = new CaseEsEntity();
            esEntity.setCaseId(caseEntity.getCaseId());
            esEntity.setTitle(caseEntity.getCaseName());
            esEntity.setCaseType(caseEntity.getCaseType());
            esEntity.setStartDate(caseEntity.getAcceptanceDate() != null ? caseEntity.getAcceptanceDate().toString() : null);
            esEntity.setEndDate(caseEntity.getClosingDate() != null ? caseEntity.getClosingDate().toString() : null);

            // --- 核心修复：获取并设置案由 ---
            String causeOfAction = getCauseOfActionByCaseId(caseEntity.getCaseId());
            esEntity.setCaseReason(causeOfAction == null ? "未知案由" : causeOfAction);

            // 拼接 content 字段供搜索和展示
            String content = String.format("案由：%s。案件编号：%s。",
                    esEntity.getCaseReason(),
                    caseEntity.getCaseNumber());
            esEntity.setContent(content);

            // 提取当事人
            String partyNames = caseEntity.getParties().stream()
                    .map(PartyEntity::getPartyName)
                    .collect(Collectors.joining(","));
            esEntity.setPartyNames(partyNames);

            esEntity.setCourtName(caseEntity.getCourtName());
            return esEntity;
        }).collect(Collectors.toList());
    }

    // 辅助方法：根据 caseId 查询案由（caseReason）
    private String getCauseOfActionByCaseId(Integer caseId) {
        return caseDetailRepository.findByCaseId(caseId)
                .map(CaseDetailEntity::getCaseReason)
                .orElse(null);
    }

    public Map<String, Object> getLeftPanelStats(String province) {
        Map<String, Object> result = new HashMap<>();

        // 1. 获取省份对应的案件ID列表（若province为null则查全部）
        List<Integer> caseIds = getCaseIdsByProvince(province);

        // 2. 总案件数
        long totalCases = caseIds.size();
        result.put("totalCases", totalCases);

        // 3. 卷宗总页数（仅统计这些案件的totalPages）
        Long totalPages = caseRepository.sumTotalPagesByCaseIds(caseIds);
        result.put("totalPages", totalPages != null ? totalPages : 0L);

        // 4. 适用法律/条约分布
        List<String> lawTexts = caseDetailRepository.findApplicableLawsByCaseIds(caseIds);
        Map<String, Integer> lawCountMap = new HashMap<>();
        for (String text : lawTexts) {
            if (text == null || text.trim().isEmpty()) continue;
            for (String law : text.split("[,;，；、]")) {
                String trimmed = law.trim();
                if (!trimmed.isEmpty()) {
                    lawCountMap.put(trimmed, lawCountMap.getOrDefault(trimmed, 0) + 1);
                }
            }
        }
        // 法律分布数据
        List<Map<String, Object>> lawData = lawCountMap.entrySet().stream()
                .map(entry -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("name", entry.getKey());
                    map.put("value", entry.getValue());
                    return map;
                })
                .collect(Collectors.toList());
        result.put("lawData", lawData);

        // 5. 当事国籍 Top5
        List<Object[]> nationalityStats = partyRepository.countPartiesByNationalityAndCaseIds(caseIds);
        long totalParties = nationalityStats.stream().mapToLong(arr -> (Long) arr[1]).sum();
        List<Map<String, Object>> nationalityData = new ArrayList<>();
        int rank = 0;
        for (Object[] stat : nationalityStats) {
            if (++rank > 5) break;
            String country = (String) stat[0];
            Long count = (Long) stat[1];
            double percent = totalParties > 0 ? (count * 100.0 / totalParties) : 0;
            nationalityData.add(Map.of("country", country, "count", count, "percent", percent));
        }
        result.put("nationalityData", nationalityData);

        return result;
    }

    // 根据省份名称获取案件ID列表（省份简称需与视图province_stats中的province_name一致）
    private List<Integer> getCaseIdsByProvince(String province) {
        if (province == null || province.isEmpty()) {
            return caseRepository.findAllCaseIds();
        }
        return caseRepository.findCaseIdsByProvince(province);
    }

    public Map<String, List<CaseEntity>> getCasesGroupedByType(String caseReason) {
        List<CaseEntity> cases;
        if (caseReason == null || caseReason.isEmpty()) {
            cases = caseRepository.findAll();
        } else {
            cases = caseRepository.findByCaseReason(caseReason);
        }
        return cases.stream()
                .filter(c -> c.getCaseType() != null)
                .collect(Collectors.groupingBy(c -> c.getCaseType().trim()));
    }

    /**
     * 获取右侧悬浮面板所需的统计数据：案件总数、类型占比、案由占比
     */
    public Map<String, Object> getPanelStats(String province) {
        List<Integer> caseIds = getCaseIdsByProvince(province);
        Map<String, Object> result = new HashMap<>();
        result.put("totalCases", caseIds.size());

        // 案件类型统计（返回列表用于前端展示占比）
        List<Object[]> typeStatsRaw = caseRepository.countCaseTypeByCaseIds(caseIds);
        List<Map<String, Object>> typeStats = typeStatsRaw.stream()
                .map(row -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("name", row[0] != null ? row[0] : "未知类型");
                    map.put("count", row[1]);
                    return map;
                })
                .collect(Collectors.toList());
        result.put("typeStats", typeStats);

        // 新增：各类型具体数量，用于按钮显示（确保四种类型都存在）
        Map<String, Long> typeCountMap = new HashMap<>();
        for (Object[] row : typeStatsRaw) {
            String typeName = row[0] != null ? row[0].toString() : "未知类型";
            typeCountMap.put(typeName, (Long) row[1]);
        }
        // 保证四种类型都有值，缺失的为0
        Map<String, Long> buttonCounts = new LinkedHashMap<>();
        buttonCounts.put("刑事", typeCountMap.getOrDefault("刑事", 0L));
        buttonCounts.put("民事", typeCountMap.getOrDefault("民事", 0L));
        buttonCounts.put("行政", typeCountMap.getOrDefault("行政", 0L));
        buttonCounts.put("公益诉讼", typeCountMap.getOrDefault("公益诉讼", 0L));
        result.put("typeCounts", buttonCounts);

        // 案由统计（前4）
        List<Object[]> reasonStatsRaw = caseDetailRepository.countCaseReasonByCaseIds(caseIds);
        List<Map<String, Object>> reasonStats = reasonStatsRaw.stream()
                .limit(4)
                .map(row -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("name", row[0] != null ? row[0] : "未知案由");
                    map.put("count", row[1]);
                    return map;
                })
                .collect(Collectors.toList());
        result.put("reasonStats", reasonStats);

        return result;
    }

    public List<CaseWithReasonDto> getCasesWithReasonByType(String type) {
        List<CaseEntity> cases = caseRepository.findByCaseTypeWithDetails(type);
        return cases.stream().map(c -> {
            CaseDetailEntity detail = caseDetailRepository.findByCaseId(c.getCaseId()).orElse(null);
            String reason = detail != null ? detail.getCaseReason() : "未知案由";
            String judgment = detail != null ? detail.getJudgmentResults() : "";   // 新增获取判决结果
            return CaseWithReasonDto.fromEntity(c, reason, judgment);
        }).collect(Collectors.toList());
    }

    @Transactional
    public CaseEntity saveFullCase(CaseSaveRequest request) {
        // 1. 保存或更新案件基础信息
        CaseEntity caseEntity = request.getCaseInfo();
        if (caseEntity.getCaseId() != null) {
            CaseEntity existing = caseRepository.findById(caseEntity.getCaseId())
                    .orElseThrow(() -> new RuntimeException("案件不存在"));
            // 更新字段
            existing.setCaseNumber(caseEntity.getCaseNumber());
            existing.setCaseName(caseEntity.getCaseName());
            existing.setCourtName(caseEntity.getCourtName());
            existing.setCaseType(caseEntity.getCaseType());
            existing.setAcceptanceDate(caseEntity.getAcceptanceDate());
            existing.setClosingDate(caseEntity.getClosingDate());
            existing.setTotalPages(caseEntity.getTotalPages());
            existing.setDocumentTypes(caseEntity.getDocumentTypes());
            caseEntity = caseRepository.save(existing);
        } else {
            caseEntity = caseRepository.save(caseEntity);
        }

        final Integer caseId = caseEntity.getCaseId();

        // 2. 处理当事人：先删除旧的，再保存新的
        partyRepository.deleteByCaseEntityCaseId(caseId);
        if (request.getParties() != null) {
            for (PartyEntity party : request.getParties()) {
                party.setPartyId(null); // 确保新增
                party.setCaseEntity(caseEntity);
                partyRepository.save(party);
            }
        }

        // 3. 保存或更新案件详情
        if (request.getCaseDetail() != null) {
            CaseDetailEntity detail = request.getCaseDetail();
            detail.setCaseId(caseId);
            caseDetailRepository.findByCaseId(caseId).ifPresentOrElse(
                    existing -> {
                        existing.setCaseReason(detail.getCaseReason());
                        existing.setJudgmentResults(detail.getJudgmentResults());
                        existing.setJudgmentType(detail.getJudgmentType());
                        existing.setIsEnforced(detail.getIsEnforced());
                        existing.setAppealStatus(detail.getAppealStatus());
                        existing.setHasOverseasEvidence(detail.getHasOverseasEvidence());
                        existing.setOverseasEvidenceType(detail.getOverseasEvidenceType());
                        existing.setInfringementLocation(detail.getInfringementLocation());
                        existing.setDamageLocation(detail.getDamageLocation());
                        existing.setApplicableLaw(detail.getApplicableLaw());
                        existing.setTreatyPriority(detail.getTreatyPriority());
                        existing.setForeignRelatedPages(detail.getForeignRelatedPages());
                        existing.setArchiveLanguage(detail.getArchiveLanguage());
                        caseDetailRepository.save(existing);
                    },
                    () -> caseDetailRepository.save(detail)
            );
        }

        // 4. 保存或更新法律监督
        if (request.getLegalSupervision() != null) {
            LegalSupervisionEntity supervision = request.getLegalSupervision();
            supervision.setCaseId(caseId);
            supervisionRepository.findByCaseId(caseId).ifPresentOrElse(
                    existing -> {
                        existing.setHasSupervisionPoint(supervision.getHasSupervisionPoint());
                        existing.setSupervisionField(supervision.getSupervisionField());
                        existing.setSupervisionType(supervision.getSupervisionType());
                        existing.setClueDescription(supervision.getClueDescription());
                        existing.setSeverityLevel(supervision.getSeverityLevel());
                        supervisionRepository.save(existing);
                    },
                    () -> supervisionRepository.save(supervision)
            );
        }

        return caseEntity;
    }

}