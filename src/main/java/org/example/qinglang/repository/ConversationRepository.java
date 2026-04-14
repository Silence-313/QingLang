package org.example.qinglang.repository;

import org.example.qinglang.entity.ConversationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ConversationRepository extends JpaRepository<ConversationEntity, Integer> {
    List<ConversationEntity> findByUserIdOrderByUpdatedAtDesc(Integer userId);
}