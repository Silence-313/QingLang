package org.example.qinglang.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.example.qinglang.entity.*;
import org.example.qinglang.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class CaseExtractionService {

    @Autowired
    private SparkLiteService sparkLiteService;

    @Autowired
    private CaseRepository caseRepository;

    @Autowired
    private PartyRepository partyRepository;

    @Autowired
    private CaseDetailRepository caseDetailRepository;

    @Autowired
    private LegalSupervisionRepository legalSupervisionRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 提取文本中的案件信息并保存到数据库
     */
    @Transactional
    public CaseEntity extractAndSave(String userText) throws Exception {
        // 1. 构建 Prompt
        String systemPrompt = buildExtractionPrompt();
        String userMessage = "请从以下文本中提取案件信息，并以 JSON 格式返回：\n" + userText;

        // 2. 同步调用 Spark Lite（等待完整响应）
        String jsonResponse = callSparkLiteSync(userMessage, systemPrompt);

        // 3. 解析 JSON 并保存
        return parseAndSave(jsonResponse);
    }

    private String buildExtractionPrompt() {
        return """
            你是一个专业的法律信息提取助手。请根据用户提供的文本，提取出案件相关的结构化信息，并以严格的 JSON 格式返回。
            返回的 JSON 必须包含以下字段，如果文本中没有对应信息则填写 null 或空字符串。
            
            请务必返回纯 JSON，不要包含任何额外的解释、Markdown 标记或代码块符号。
            
            JSON 结构如下：
            {
                "caseNumber": "案件编号",
                "caseName": "案件名称",
                "courtName": "审理法院名称",
                "caseType": "案件类型（民事/刑事/行政/公益诉讼）",
                "acceptanceDate": "受理日期，格式 YYYY-MM-DD",
                "closingDate": "结案日期，格式 YYYY-MM-DD",
                "totalPages": 总页数（整数）,
                "documentTypes": "文书类型",
                "parties": [
                    {
                        "partyName": "当事人姓名/名称",
                        "nationality": "国籍",
                        "partyType": "当事人类型（自然人/法人）",
                        "hasForeignLawyer": true/false,
                        "languageAbility": "语言能力",
                        "isForeignInvested": true/false
                    }
                ],
                "caseDetail": {
                    "caseReason": "案由",
                    "judgmentResults": "裁判结果",
                    "judgmentType": "判决类型（一审/终审）",
                    "isEnforced": true/false,
                    "appealStatus": "上诉情况",
                    "hasOverseasEvidence": true/false,
                    "overseasEvidenceType": "境外证据类型",
                    "infringementLocation": "侵权行为发生地",
                    "damageLocation": "损害结果发生地",
                    "applicableLaw": "适用法律/条约",
                    "treatyPriority": true/false,
                    "foreignRelatedPages": 涉外相关页数（整数）,
                    "archiveLanguage": "卷宗语种"
                },
                "legalSupervision": {
                    "hasSupervisionPoint": true/false,
                    "supervisionField": "监督领域",
                    "supervisionType": "监督类型",
                    "clueDescription": "监督线索描述",
                    "severityLevel": "严重程度（高/中/低）"
                }
            }
            """;
    }

    private String callSparkLiteSync(String userMessage, String systemPrompt) throws Exception {
        CompletableFuture<String> future = new CompletableFuture<>();
        StringBuilder fullResponse = new StringBuilder();

        sparkLiteService.sendMessage(
                userMessage,
                systemPrompt,
                chunk -> fullResponse.append(chunk),
                () -> future.complete(fullResponse.toString()),
                future::completeExceptionally
        );

        // 等待最多 60 秒
        return future.get(60, TimeUnit.SECONDS);
    }

    private CaseEntity parseAndSave(String jsonResponse) throws Exception {
        // 清洗可能包含的 Markdown 代码块标记
        String cleanJson = jsonResponse.trim();
        if (cleanJson.startsWith("```json")) {
            cleanJson = cleanJson.substring(7);
        }
        if (cleanJson.startsWith("```")) {
            cleanJson = cleanJson.substring(3);
        }
        if (cleanJson.endsWith("```")) {
            cleanJson = cleanJson.substring(0, cleanJson.length() - 3);
        }
        cleanJson = cleanJson.trim();

        JsonNode root = objectMapper.readTree(cleanJson);

        // 1. 保存 Cases
        CaseEntity caseEntity = new CaseEntity();
        caseEntity.setCaseNumber(root.path("caseNumber").asText(null));
        caseEntity.setCaseName(root.path("caseName").asText(null));
        caseEntity.setCourtName(root.path("courtName").asText(null));
        caseEntity.setCaseType(root.path("caseType").asText(null));
        String accDate = root.path("acceptanceDate").asText(null);
        if (accDate != null && !accDate.isEmpty()) {
            caseEntity.setAcceptanceDate(LocalDate.parse(accDate));
        }
        String closeDate = root.path("closingDate").asText(null);
        if (closeDate != null && !closeDate.isEmpty()) {
            caseEntity.setClosingDate(LocalDate.parse(closeDate));
        }
        caseEntity.setTotalPages(root.path("totalPages").asInt(0));
        caseEntity.setDocumentTypes(root.path("documentTypes").asText(null));

        caseEntity = caseRepository.save(caseEntity);

        // 2. 保存 Parties
        JsonNode partiesNode = root.path("parties");
        if (partiesNode.isArray()) {
            for (JsonNode pNode : partiesNode) {
                PartyEntity party = new PartyEntity();
                party.setCaseEntity(caseEntity);
                party.setPartyName(pNode.path("partyName").asText(null));
                party.setNationality(pNode.path("nationality").asText(null));
                party.setPartyType(pNode.path("partyType").asText(null));
                party.setHasForeignLawyer(pNode.path("hasForeignLawyer").asBoolean(false));
                party.setLanguageAbility(pNode.path("languageAbility").asText(null));
                party.setIsForeignInvested(pNode.path("isForeignInvested").asBoolean(false));
                partyRepository.save(party);
            }
        }

        // 3. 保存 CaseDetail
        JsonNode detailNode = root.path("caseDetail");
        if (!detailNode.isMissingNode()) {
            CaseDetailEntity detail = new CaseDetailEntity();
            detail.setCaseId(caseEntity.getCaseId());
            detail.setCaseReason(detailNode.path("caseReason").asText(null));
            detail.setJudgmentResults(detailNode.path("judgmentResults").asText(null));
            detail.setJudgmentType(detailNode.path("judgmentType").asText(null));
            detail.setIsEnforced(detailNode.path("isEnforced").asBoolean(false));
            detail.setAppealStatus(detailNode.path("appealStatus").asText(null));
            detail.setHasOverseasEvidence(detailNode.path("hasOverseasEvidence").asBoolean(false));
            detail.setOverseasEvidenceType(detailNode.path("overseasEvidenceType").asText(null));
            detail.setInfringementLocation(detailNode.path("infringementLocation").asText(null));
            detail.setDamageLocation(detailNode.path("damageLocation").asText(null));
            detail.setApplicableLaw(detailNode.path("applicableLaw").asText(null));
            detail.setTreatyPriority(detailNode.path("treatyPriority").asBoolean(false));
            detail.setForeignRelatedPages(detailNode.path("foreignRelatedPages").asInt(0));
            detail.setArchiveLanguage(detailNode.path("archiveLanguage").asText(null));
            caseDetailRepository.save(detail);
        }

        // 4. 保存 LegalSupervision
        JsonNode supNode = root.path("legalSupervision");
        if (!supNode.isMissingNode()) {
            LegalSupervisionEntity sup = new LegalSupervisionEntity();
            sup.setCaseId(caseEntity.getCaseId());
            sup.setHasSupervisionPoint(supNode.path("hasSupervisionPoint").asBoolean(false));
            sup.setSupervisionField(supNode.path("supervisionField").asText(null));
            sup.setSupervisionType(supNode.path("supervisionType").asText(null));
            sup.setClueDescription(supNode.path("clueDescription").asText(null));
            sup.setSeverityLevel(supNode.path("severityLevel").asText(null));
            legalSupervisionRepository.save(sup);
        }

        return caseEntity;
    }
}