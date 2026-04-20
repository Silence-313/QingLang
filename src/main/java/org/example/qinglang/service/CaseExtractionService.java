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
import java.util.regex.Pattern;

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

    // 保存原始文本，用于字段缺失时的回退提取
    private String originalUserText;

    // 最大输入字符数（确保在星火 Lite 上下文窗口内）
    private static final int MAX_INPUT_LENGTH = 4000;

    /**
     * 提取文本中的案件信息并保存到数据库
     */
    @Transactional
    public CaseEntity extractAndSave(String userText) throws Exception {
        this.originalUserText = userText;

        // 1. 压缩长文本
        String processedText = compressText(userText);
        log.info("原始文本长度：{}，处理后长度：{}", userText.length(), processedText.length());

        // 2. 构建 Prompt 并调用模型
        String systemPrompt = buildExtractionPrompt();
        String userMessage = "【输入文本】\n" + processedText + "\n\n【请直接输出JSON，不要任何额外内容】";
        String jsonResponse = callSparkLiteSync(userMessage, systemPrompt);

        // 3. 解析并保存
        return parseAndSave(jsonResponse);
    }

    /**
     * 智能压缩文本，优先保留包含关键信息的行
     */
    private String compressText(String text) {
        if (text == null || text.isEmpty()) return "";
        if (text.length() <= MAX_INPUT_LENGTH) return text;

        String[] lines = text.split("\n");
        StringBuilder compressed = new StringBuilder();

        // 关键信息正则：案号、法院、当事人、日期、案由等
        Pattern importantPattern = Pattern.compile(
                ".*(字第|号|法院|原告|被告|第三人|上诉人|被上诉人|专利|案由|判决|裁定|申请日|优先权|发明|行政).*",
                Pattern.CASE_INSENSITIVE
        );

        int addedLength = 0;
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) continue;

            if (importantPattern.matcher(trimmed).matches()) {
                if (addedLength + trimmed.length() > MAX_INPUT_LENGTH) break;
                compressed.append(trimmed).append("\n");
                addedLength += trimmed.length() + 1;
            }
        }

        // 如果关键行太少，则补充前 N 行作为兜底
        if (compressed.length() < 500) {
            compressed = new StringBuilder();
            for (int i = 0; i < Math.min(50, lines.length); i++) {
                String line = lines[i].trim();
                if (line.isEmpty()) continue;
                if (compressed.length() + line.length() > MAX_INPUT_LENGTH) break;
                compressed.append(line).append("\n");
            }
        }

        String result = compressed.toString().trim();
        return result.length() > MAX_INPUT_LENGTH ? result.substring(0, MAX_INPUT_LENGTH) : result;
    }

    /**
     * 构建严格的结构化提取 Prompt
     */
    private String buildExtractionPrompt() {
        return """
            你是一台专业的法律案件信息提取机器。你的唯一功能是从输入文本中提取案件结构化信息，并以严格的 JSON 格式输出。
            
            【重要规则】
            1. 只输出 JSON，不得添加任何解释、前缀或后缀。
            2. 输出必须以 "{" 开始，以 "}" 结束。
            3. 如果文本中没有对应信息，字段值设置为 null（字符串）或 0（数字）或 false（布尔值）。
            4. 即使无法提取任何信息，也必须返回完整的 JSON 结构。
            
            【输出 JSON 结构 - 必须严格遵守】
            {
                "caseNumber": "案件编号（如 (2024)最高法知行终142号）",
                "caseName": "案件名称",
                "courtName": "审理法院名称",
                "caseType": "刑事/民事/行政/公益诉讼",
                "acceptanceDate": "YYYY-MM-DD",
                "closingDate": "YYYY-MM-DD",
                "totalPages": 0,
                "documentTypes": "文书类型",
                "parties": [
                    {
                        "partyName": "当事人姓名/名称",
                        "nationality": "国籍",
                        "partyType": "自然人/法人",
                        "hasForeignLawyer": false,
                        "languageAbility": "",
                        "isForeignInvested": false
                    }
                ],
                "caseDetail": {
                    "caseReason": "案由",
                    "judgmentResults": "裁判结果",
                    "judgmentType": "一审/终审",
                    "isEnforced": false,
                    "appealStatus": "",
                    "hasOverseasEvidence": false,
                    "overseasEvidenceType": "",
                    "infringementLocation": "",
                    "damageLocation": "",
                    "applicableLaw": "",
                    "treatyPriority": false,
                    "foreignRelatedPages": 0,
                    "archiveLanguage": ""
                },
                "legalSupervision": {
                    "hasSupervisionPoint": false,
                    "supervisionField": "",
                    "supervisionType": "",
                    "clueDescription": "",
                    "severityLevel": "低"
                }
            }
            
            现在处理以下文本并只输出 JSON：
            """;
    }

    /**
     * 同步调用星火 Lite 模型
     */
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

        return future.get(60, TimeUnit.SECONDS);
    }

    /**
     * 解析 JSON 响应并保存到数据库
     */
    private CaseEntity parseAndSave(String jsonResponse) throws Exception {
        String cleanJson = jsonResponse.trim();
        log.info("原始模型响应：{}", cleanJson);

        // 1. 提取 JSON 对象
        int startIdx = cleanJson.indexOf('{');
        int endIdx = cleanJson.lastIndexOf('}');
        if (startIdx == -1 || endIdx == -1 || endIdx <= startIdx) {
            throw new RuntimeException("响应中未找到有效的 JSON 对象");
        }
        cleanJson = cleanJson.substring(startIdx, endIdx + 1);
        cleanJson = cleanJson.replace("```json", "").replace("```", "").trim();

        // 尝试修复常见 JSON 格式问题
        cleanJson = repairJson(cleanJson);
        JsonNode root = objectMapper.readTree(cleanJson);

        // 2. 构建并保存 CaseEntity
        CaseEntity caseEntity = new CaseEntity();
        caseEntity.setCaseNumber(getNodeText(root, "caseNumber"));
        caseEntity.setCaseName(getNodeText(root, "caseName"));
        caseEntity.setCourtName(getNodeText(root, "courtName"));
        caseEntity.setCaseType(getNodeText(root, "caseType"));
        caseEntity.setTotalPages(root.path("totalPages").asInt(0));
        caseEntity.setDocumentTypes(getNodeText(root, "documentTypes"));

        // 解析日期
        String accDate = getNodeText(root, "acceptanceDate");
        if (accDate != null && !accDate.isEmpty()) {
            try {
                caseEntity.setAcceptanceDate(LocalDate.parse(accDate));
            } catch (Exception e) {
                log.warn("受理日期解析失败：{}", accDate);
            }
        }
        String closeDate = getNodeText(root, "closingDate");
        if (closeDate != null && !closeDate.isEmpty()) {
            try {
                caseEntity.setClosingDate(LocalDate.parse(closeDate));
            } catch (Exception e) {
                log.warn("结案日期解析失败：{}", closeDate);
            }
        }

        // 校验必填字段，缺失时从原文本提取或生成默认值
        if (isBlank(caseEntity.getCaseName())) {
            String extracted = extractCaseNameFromText(originalUserText);
            caseEntity.setCaseName(extracted != null ? extracted : "案件_" + System.currentTimeMillis());
            log.info("案件名称缺失，使用：{}", caseEntity.getCaseName());
        }
        if (isBlank(caseEntity.getCaseNumber())) {
            caseEntity.setCaseNumber("UNKNOWN_" + System.currentTimeMillis());
            log.warn("案件编号缺失，使用默认值：{}", caseEntity.getCaseNumber());
        }

        caseEntity = caseRepository.save(caseEntity);
        log.info("案件基础信息保存成功，caseId: {}", caseEntity.getCaseId());

        // 3. 保存当事人信息
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

        // 4. 保存案件详情
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

        // 5. 保存法律监督信息
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

    // ---------- 辅助方法 ----------

    private String getNodeText(JsonNode root, String fieldName) {
        JsonNode node = root.path(fieldName);
        if (node.isNull() || node.asText().trim().isEmpty()) {
            return null;
        }
        return node.asText().trim();
    }

    private boolean isBlank(String str) {
        return str == null || str.trim().isEmpty();
    }

    private String repairJson(String json) {
        // 移除控制字符
        json = json.replaceAll("[\\x00-\\x1F]", " ");
        // 移除尾部逗号
        json = json.replaceAll(",\\s*}", "}").replaceAll(",\\s*]", "]");
        return json;
    }

    private String extractCaseNameFromText(String text) {
        if (text == null) return null;
        String[] lines = text.split("\n");
        for (String line : lines) {
            String trimmed = line.trim();
            if (!trimmed.isEmpty() && trimmed.length() < 200) {
                return trimmed;
            }
        }
        return null;
    }
}