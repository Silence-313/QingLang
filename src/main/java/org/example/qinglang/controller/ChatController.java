package org.example.qinglang.controller;

import jakarta.servlet.http.HttpSession;
import org.example.qinglang.entity.ChatHistoryEntity;
import org.example.qinglang.entity.ConversationEntity;
import org.example.qinglang.service.ChatHistoryService;
import org.example.qinglang.service.ConversationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    @Autowired
    private ChatHistoryService chatHistoryService;

    /**
     * 获取当前用户的历史对话
     */
    @GetMapping("/history")
    public ResponseEntity<List<ChatHistoryEntity>> getChatHistory(HttpSession session) {
        // 从 session 获取当前登录用户 ID（需在登录时将 userId 存入 session）
        Integer userId = (Integer) session.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        List<ChatHistoryEntity> history = chatHistoryService.getUserHistory(userId);
        return ResponseEntity.ok(history);
    }

    /**
     * 清空当前用户历史
     */
    @DeleteMapping("/history")
    public ResponseEntity<?> clearHistory(HttpSession session) {
        Integer userId = (Integer) session.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        chatHistoryService.clearUserHistory(userId);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @Autowired
    private ConversationService conversationService;

    // 获取当前用户的会话列表（用于侧边栏）
    @GetMapping("/conversations")
    public ResponseEntity<?> getConversations(HttpSession session) {
        Integer userId = (Integer) session.getAttribute("userId");
        if (userId == null) return ResponseEntity.status(401).body("未登录");
        List<ConversationEntity> convs = conversationService.getUserConversations(userId);
        return ResponseEntity.ok(convs);
    }

    // 获取指定会话的所有消息
    @GetMapping("/conversation/{convId}/messages")
    public ResponseEntity<?> getConversationMessages(@PathVariable Integer convId, HttpSession session) {
        Integer userId = (Integer) session.getAttribute("userId");
        if (userId == null) return ResponseEntity.status(401).body("未登录");
        // 可选：校验该会话是否属于当前用户
        List<ChatHistoryEntity> messages = chatHistoryService.getMessagesByConversation(convId);
        return ResponseEntity.ok(messages);
    }

    // 创建新会话（归档当前对话时调用）
    @PostMapping("/conversation")
    public ResponseEntity<?> createConversation(@RequestBody Map<String, String> payload, HttpSession session) {
        Integer userId = (Integer) session.getAttribute("userId");
        if (userId == null) return ResponseEntity.status(401).body("未登录");
        String title = payload.get("title");
        if (title == null || title.isEmpty()) {
            return ResponseEntity.badRequest().body("标题不能为空");
        }
        ConversationEntity conv = conversationService.createConversation(userId, title);
        return ResponseEntity.ok(Map.of("conversationId", conv.getConversationId()));
    }

    // 保存消息（增加 conversationId 参数）
    @PostMapping("/message")
    public ResponseEntity<?> saveMessage(@RequestBody Map<String, Object> payload, HttpSession session) {
        Integer userId = (Integer) session.getAttribute("userId");
        if (userId == null) return ResponseEntity.status(401).body("未登录");

        String roleStr = (String) payload.get("role");
        String content = (String) payload.get("content");
        Integer conversationId = payload.get("conversationId") != null ?
                Integer.parseInt(payload.get("conversationId").toString()) : null;
        Integer relatedCaseId = payload.get("relatedCaseId") != null ?
                Integer.parseInt(payload.get("relatedCaseId").toString()) : null;

        // conversationId 允许为空（表示未关联会话）
        ChatHistoryEntity.MessageRole role = ChatHistoryEntity.MessageRole.valueOf(roleStr);
        ChatHistoryEntity saved = chatHistoryService.saveMessage(userId, conversationId, role, content, relatedCaseId);
        return ResponseEntity.ok(Map.of("success", true, "messageId", saved.getMessageId()));
    }

    // ChatController.java 中添加
    @PatchMapping("/conversation/{convId}/title")
    public ResponseEntity<?> updateConversationTitle(@PathVariable Integer convId,
                                                     @RequestBody Map<String, String> payload,
                                                     HttpSession session) {
        Integer userId = (Integer) session.getAttribute("userId");
        if (userId == null) return ResponseEntity.status(401).body("未登录");

        String newTitle = payload.get("title");
        if (newTitle == null || newTitle.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("标题不能为空");
        }

        // 可选：校验该会话是否属于当前用户
        conversationService.updateConversationTitle(convId, newTitle.trim());
        return ResponseEntity.ok(Map.of("success", true));
    }

}