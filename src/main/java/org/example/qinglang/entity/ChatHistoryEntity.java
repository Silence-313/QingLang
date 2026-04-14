package org.example.qinglang.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_history")
@Data
public class ChatHistoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "message_id")
    private Integer messageId;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "session_id", length = 64)
    private String sessionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private MessageRole role;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "related_case_id")
    private Integer relatedCaseId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // 在原有字段基础上增加
    @Column(name = "conversation_id")
    private Integer conversationId;

    public enum MessageRole {
        user, assistant
    }
}