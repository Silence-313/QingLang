package org.example.qinglang.service;

import org.example.qinglang.entity.CaseDetailEntity;
import org.example.qinglang.entity.CaseEntity;
import org.example.qinglang.entity.CaseEsEntity;
import org.example.qinglang.entity.PartyEntity;
import org.example.qinglang.repository.CaseDetailRepository;
import org.example.qinglang.repository.CaseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CaseService {

    @Autowired
    private CaseRepository caseRepository;

    @Autowired
    private CaseDetailRepository caseDetailRepository;

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
        // 1. 先查基础表 (cases)
        CaseEntity caseEntity = caseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("案件基础信息未找到"));

        // 2. 再查详情表 (case_details)
        caseDetailRepository.findByCaseId(id).ifPresent(detail -> {
            // 将详情表的 case_reason 赋值给实体类的 causeOfAction 字段
            caseEntity.setCauseOfAction(detail.getCaseReason());
        });

        return caseEntity;
    }

    public List<CaseEsEntity> advancedSearch(String keyword, String caseType, String caseReason) {
        // 从 MySQL 中按条件查询 CaseEntity 列表（已包含 parties 懒加载，但不会自动填充 caseReason）
        List<CaseEntity> caseEntities = caseRepository.findByAdvancedCriteria(keyword, caseType, caseReason);

        // 转换为前端需要的 CaseEsEntity 格式
        return caseEntities.stream().map(caseEntity -> {
            CaseEsEntity esEntity = new CaseEsEntity();
            esEntity.setCaseId(caseEntity.getCaseId());
            esEntity.setTitle(caseEntity.getCaseName());                     // title 用案件名称
            esEntity.setCaseType(caseEntity.getCaseType());

            // 拼接 content 字段：包含案由（从 case_details 获取）、案件编号、适用法律等
            String causeOfAction = getCauseOfActionByCaseId(caseEntity.getCaseId());
            String content = String.format("案由：%s。案件编号：%s。",
                    causeOfAction == null ? "未知" : causeOfAction,
                    caseEntity.getCaseNumber());
            esEntity.setContent(content);

            // 提取当事人名称列表（用逗号分隔）
            String partyNames = caseEntity.getParties().stream()
                    .map(PartyEntity::getPartyName)
                    .collect(Collectors.joining(","));
            esEntity.setPartyNames(partyNames);

            return esEntity;
        }).collect(Collectors.toList());
    }

    // 辅助方法：根据 caseId 查询案由（caseReason）
    private String getCauseOfActionByCaseId(Integer caseId) {
        return caseDetailRepository.findByCaseId(caseId)
                .map(CaseDetailEntity::getCaseReason)
                .orElse(null);
    }

}