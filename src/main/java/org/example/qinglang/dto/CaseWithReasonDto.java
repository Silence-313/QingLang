package org.example.qinglang.dto;

import lombok.Data;
import org.example.qinglang.entity.CaseEntity;
import org.example.qinglang.entity.PartyEntity;

import java.time.LocalDate;
import java.util.List;

@Data
public class CaseWithReasonDto {
    private Integer caseId;
    private String caseNumber;
    private String caseName;
    private String courtName;
    private String caseType;
    private LocalDate acceptanceDate;
    private LocalDate closingDate;
    private Integer totalPages;
    private String documentTypes;
    private String caseReason;
    private String judgmentResults;    // 新增：裁判结果
    private List<PartyEntity> parties;

    public static CaseWithReasonDto fromEntity(CaseEntity entity, String caseReason, String judgmentResults) {
        CaseWithReasonDto dto = new CaseWithReasonDto();
        dto.setCaseId(entity.getCaseId());
        dto.setCaseNumber(entity.getCaseNumber());
        dto.setCaseName(entity.getCaseName());
        dto.setCourtName(entity.getCourtName());
        dto.setCaseType(entity.getCaseType());
        dto.setAcceptanceDate(entity.getAcceptanceDate());
        dto.setClosingDate(entity.getClosingDate());
        dto.setTotalPages(entity.getTotalPages());
        dto.setDocumentTypes(entity.getDocumentTypes());
        dto.setCaseReason(caseReason);
        dto.setJudgmentResults(judgmentResults);   // 新增
        dto.setParties(entity.getParties());
        return dto;
    }
}