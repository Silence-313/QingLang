package org.example.qinglang.controller;

import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;
import org.example.qinglang.dto.CaseSaveRequest;
import org.example.qinglang.entity.CaseEntity;
import org.example.qinglang.entity.PendingTaskEntity;
import org.example.qinglang.repository.PendingTaskRepository;
import org.example.qinglang.service.CaseExtractionService;
import org.example.qinglang.service.CaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/workbench")
public class WorkbenchController {

    @Autowired
    private CaseService caseService;

    @Autowired
    private PendingTaskRepository pendingTaskRepository;

    @Autowired
    private CaseExtractionService caseExtractionService;

    /**
     * 获取待办案件列表（附带任务信息和案件摘要）
     */
    @GetMapping("/pending-cases")
    public ResponseEntity<List<Map<String, Object>>> getPendingCases() {
        List<Object[]> results = pendingTaskRepository.findPendingTasksWithCaseInfo();
        List<Map<String, Object>> pendingList = new ArrayList<>();

        for (Object[] row : results) {
            PendingTaskEntity task = (PendingTaskEntity) row[0];
            CaseEntity caseEntity = (CaseEntity) row[1];

            Map<String, Object> item = new HashMap<>();
            item.put("taskId", task.getTaskId());
            item.put("caseId", caseEntity.getCaseId());
            item.put("caseNumber", caseEntity.getCaseNumber());
            item.put("caseName", caseEntity.getCaseName());
            item.put("caseType", caseEntity.getCaseType());
            item.put("taskStatus", task.getTaskStatus().name());
            item.put("priority", task.getPriority().name());
            item.put("dueDate", task.getDueDate());
            item.put("taskTitle", task.getTaskTitle() != null ? task.getTaskTitle() : caseEntity.getCaseName());
            pendingList.add(item);
        }

        return ResponseEntity.ok(pendingList);
    }

    /**
     * 添加待办任务
     */
    @PostMapping("/pending/add")
    public ResponseEntity<?> addPendingTask(@RequestBody Map<String, Object> payload) {
        Integer caseId = (Integer) payload.get("caseId");
        if (caseId == null) {
            return ResponseEntity.badRequest().body("案件ID不能为空");
        }

        // 检查案件是否存在
        try {
            caseService.getCaseById(caseId);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body("案件不存在");
        }

        // 检查是否已存在待办
        if (pendingTaskRepository.existsByCaseId(caseId)) {
            return ResponseEntity.badRequest().body("该案件已在待办列表中");
        }

        PendingTaskEntity task = new PendingTaskEntity();
        task.setCaseId(caseId);
        if (payload.containsKey("taskTitle")) {
            task.setTaskTitle((String) payload.get("taskTitle"));
        }
        if (payload.containsKey("priority")) {
            task.setPriority(PendingTaskEntity.Priority.valueOf((String) payload.get("priority")));
        }
        // 其他字段可按需设置

        PendingTaskEntity saved = pendingTaskRepository.save(task);
        return ResponseEntity.ok(Map.of("success", true, "taskId", saved.getTaskId()));
    }

    /**
     * 更新待办状态
     */
    @PutMapping("/pending/{taskId}/status")
    public ResponseEntity<?> updateTaskStatus(@PathVariable Integer taskId, @RequestBody Map<String, String> payload) {
        PendingTaskEntity task = pendingTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("任务不存在"));

        String status = payload.get("status");
        task.setTaskStatus(PendingTaskEntity.TaskStatus.valueOf(status));
        pendingTaskRepository.save(task);
        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * 删除待办任务
     */
    @DeleteMapping("/pending/{taskId}")
    public ResponseEntity<?> deletePendingTask(@PathVariable Integer taskId) {
        pendingTaskRepository.deleteById(taskId);
        return ResponseEntity.ok(Map.of("success", true));
    }

    // 原有的 getCaseForEdit 和 saveCase 方法保持不变
    @GetMapping("/case/{id}")
    public ResponseEntity<CaseEntity> getCaseForEdit(@PathVariable Integer id) {
        CaseEntity caseEntity = caseService.getCaseById(id);
        return ResponseEntity.ok(caseEntity);
    }

    @PostMapping("/case/save")
    public ResponseEntity<?> saveCase(@RequestBody CaseSaveRequest request) {
        CaseEntity saved = caseService.saveFullCase(request);
        return ResponseEntity.ok(Map.of("success", true, "caseId", saved.getCaseId()));
    }

    /**
     * AI 智能提取案件信息并保存
     */
    @PostMapping("/extract-case")
    public ResponseEntity<?> extractCaseFromText(@RequestBody Map<String, String> payload) {
        String text = payload.get("text");
        if (text == null || text.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("文本不能为空");
        }

        try {
            // 1. AI 提取并保存案件
            CaseEntity savedCase = caseExtractionService.extractAndSave(text.trim());

            // 2. 自动创建待办任务
            PendingTaskEntity pendingTask = new PendingTaskEntity();
            pendingTask.setCaseId(savedCase.getCaseId());
            pendingTask.setTaskTitle("AI提取: " + savedCase.getCaseName());
            pendingTask.setTaskStatus(PendingTaskEntity.TaskStatus.PENDING);
            pendingTask.setPriority(PendingTaskEntity.Priority.MEDIUM);
            // 可根据需要设置其他字段，如 dueDate 等
            pendingTaskRepository.save(pendingTask);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("caseId", savedCase.getCaseId());
            response.put("caseNumber", savedCase.getCaseNumber());
            response.put("message", "案件信息提取并保存成功，已加入待办列表");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("智能提取失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("提取失败: " + e.getMessage());
        }
    }

}