package org.example.qinglang.repository;

import org.example.qinglang.entity.PendingTaskEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PendingTaskRepository extends JpaRepository<PendingTaskEntity, Integer> {

    // 查询所有待办任务（关联案件基本信息）
    @Query("SELECT t, c FROM PendingTaskEntity t JOIN CaseEntity c ON t.caseId = c.caseId WHERE t.taskStatus = 'PENDING' OR t.taskStatus = 'IN_PROGRESS' ORDER BY t.priority DESC, t.dueDate ASC")
    List<Object[]> findPendingTasksWithCaseInfo();

    // 根据状态查询
    List<PendingTaskEntity> findByTaskStatus(PendingTaskEntity.TaskStatus status);

    // 检查案件是否已存在待办
    boolean existsByCaseId(Integer caseId);
}