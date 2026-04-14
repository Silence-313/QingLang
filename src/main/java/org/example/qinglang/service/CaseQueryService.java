package org.example.qinglang.service;

import org.example.qinglang.entity.*;
import org.example.qinglang.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class CaseQueryService {

    @Autowired
    private CaseRepository caseRepository;

    @Autowired
    private PartyRepository partyRepository;

    @Autowired
    private CaseDetailRepository caseDetailRepository;

    @Autowired
    private LegalSupervisionRepository legalSupervisionRepository;

    /**
     * 根据用户输入检索案件信息，并返回格式化的上下文文本。
     * 若无法匹配到任何案件，返回 null。
     */
    public String searchCaseContext(String userQuery) {
        // 尝试按案件编号精确匹配
        Optional<CaseEntity> caseByNumber = caseRepository.findByCaseNumber(userQuery.trim());
        if (caseByNumber.isPresent()) {
            return buildCaseContext(caseByNumber.get());
        }

        // 尝试按案件名称模糊匹配
        List<CaseEntity> cases = caseRepository.findByCaseNameContaining(userQuery.trim());
        if (!cases.isEmpty()) {
            // 如果匹配多个，取第一个并告知还有更多
            CaseEntity first = cases.get(0);
            String context = buildCaseContext(first);
            if (cases.size() > 1) {
                context += "\n（注：共找到 " + cases.size() + " 个相关案件，以上为最匹配的一个。）";
            }
            return context;
        }

        // 尝试按当事人姓名匹配
        List<PartyEntity> parties = partyRepository.findByPartyNameContaining(userQuery.trim());
        if (!parties.isEmpty()) {
            CaseEntity caseEntity = parties.get(0).getCaseEntity();
            return buildCaseContext(caseEntity);
        }

        return null;
    }

    private String buildCaseContext(CaseEntity caseEntity) {
        StringBuilder sb = new StringBuilder();
        sb.append("【案件信息】\n");
        sb.append("案件编号：").append(caseEntity.getCaseNumber()).append("\n");
        sb.append("案件名称：").append(caseEntity.getCaseName()).append("\n");
        sb.append("审理法院：").append(caseEntity.getCourtName() != null ? caseEntity.getCourtName() : "未知").append("\n");
        sb.append("案件类型：").append(caseEntity.getCaseType() != null ? caseEntity.getCaseType() : "未知").append("\n");
        sb.append("受理日期：").append(caseEntity.getAcceptanceDate() != null ? caseEntity.getAcceptanceDate() : "未知").append("\n");
        sb.append("结案日期：").append(caseEntity.getClosingDate() != null ? caseEntity.getClosingDate() : "未知").append("\n");
        sb.append("卷宗总页数：").append(caseEntity.getTotalPages() != null ? caseEntity.getTotalPages() : "未知").append("\n");

        // 当事人信息
        if (caseEntity.getParties() != null && !caseEntity.getParties().isEmpty()) {
            sb.append("\n【当事人】\n");
            for (PartyEntity p : caseEntity.getParties()) {
                sb.append("- ").append(p.getPartyName())
                        .append("（").append(p.getNationality() != null ? p.getNationality() : "国籍未知").append("，")
                        .append(p.getPartyType() != null ? p.getPartyType() : "类型未知").append("）\n");
            }
        }

        // 案件详情（案由、适用法律等）
        caseDetailRepository.findByCaseId(caseEntity.getCaseId()).ifPresent(detail -> {
            sb.append("\n【案件详情】\n");
            if (detail.getCaseReason() != null) {
                sb.append("案由：").append(detail.getCaseReason()).append("\n");
            }
            if (detail.getApplicableLaw() != null) {
                sb.append("适用法律/条约：").append(detail.getApplicableLaw()).append("\n");
            }
            if (detail.getJudgmentResults() != null) {
                sb.append("裁判结果：").append(detail.getJudgmentResults()).append("\n");
            }
        });

        // 法律监督
        legalSupervisionRepository.findByCaseId(caseEntity.getCaseId()).ifPresent(sup -> {
            sb.append("\n【法律监督】\n");
            if (sup.getHasSupervisionPoint() != null && sup.getHasSupervisionPoint()) {
                sb.append("存在监督点，领域：").append(sup.getSupervisionField() != null ? sup.getSupervisionField() : "未指定").append("\n");
                if (sup.getClueDescription() != null) {
                    sb.append("线索描述：").append(sup.getClueDescription()).append("\n");
                }
            } else {
                sb.append("暂无监督点\n");
            }
        });

        return sb.toString();
    }
}