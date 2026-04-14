package org.example.qinglang.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "pending_tasks")
@Data
public class PendingTaskEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "task_id")
    private Integer taskId;

    @Column(name = "case_id", nullable = false)
    private Integer caseId;

    @Column(name = "task_title")
    private String taskTitle;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_status")
    private TaskStatus taskStatus = TaskStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority")
    private Priority priority = Priority.MEDIUM;

    @Column(name = "assigned_to")
    private String assignedTo;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // 内嵌枚举
    public enum TaskStatus {
        PENDING, IN_PROGRESS, COMPLETED
    }

    public enum Priority {
        LOW, MEDIUM, HIGH
    }
}