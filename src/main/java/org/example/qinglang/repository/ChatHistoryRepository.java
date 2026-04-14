package org.example.qinglang.repository;

import org.example.qinglang.entity.ChatHistoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatHistoryRepository extends JpaRepository<ChatHistoryEntity, Integer> {

    // 查询某个用户的全部对话历史（按时间升序）
    List<ChatHistoryEntity> findByUserIdOrderByCreatedAtAsc(Integer userId);

    // 查询某个用户最近的N条历史记录
    @Query("SELECT c FROM ChatHistoryEntity c WHERE c.userId = :userId ORDER BY c.createdAt DESC LIMIT :limit")
    List<ChatHistoryEntity> findRecentByUserId(@Param("userId") Integer userId, @Param("limit") int limit);

    // 删除某个用户的所有历史（可选）
    void deleteByUserId(Integer userId);

    @Query("SELECT c FROM ChatHistoryEntity c WHERE c.conversationId = :conversationId ORDER BY c.createdAt ASC")
    List<ChatHistoryEntity> findByConversationId(@Param("conversationId") Integer conversationId);

}