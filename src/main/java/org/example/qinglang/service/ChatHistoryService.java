package org.example.qinglang.service;

import org.example.qinglang.entity.ChatHistoryEntity;
import org.example.qinglang.repository.ChatHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ChatHistoryService {

    @Autowired
    private ChatHistoryRepository chatHistoryRepository;

    /**
     * 保存一条消息
     */
    @Transactional
    public ChatHistoryEntity saveMessage(Integer userId, ChatHistoryEntity.MessageRole role, String content, Integer relatedCaseId) {
        ChatHistoryEntity entity = new ChatHistoryEntity();
        entity.setUserId(userId);
        entity.setRole(role);
        entity.setContent(content);
        entity.setRelatedCaseId(relatedCaseId);
        return chatHistoryRepository.save(entity);
    }

    /**
     * 获取用户全部历史消息
     */
    public List<ChatHistoryEntity> getUserHistory(Integer userId) {
        return chatHistoryRepository.findByUserIdOrderByCreatedAtAsc(userId);
    }

    /**
     * 获取用户最近N条历史（用于上下文传递）
     */
    public List<ChatHistoryEntity> getRecentHistory(Integer userId, int limit) {
        return chatHistoryRepository.findRecentByUserId(userId, limit);
    }

    /**
     * 清空用户历史
     */
    @Transactional
    public void clearUserHistory(Integer userId) {
        chatHistoryRepository.deleteByUserId(userId);
    }

    // 新增方法：保存消息并指定 conversationId
    @Transactional
    public ChatHistoryEntity saveMessage(Integer userId, Integer conversationId, ChatHistoryEntity.MessageRole role, String content, Integer relatedCaseId) {
        ChatHistoryEntity entity = new ChatHistoryEntity();
        entity.setUserId(userId);
        entity.setConversationId(conversationId);
        entity.setRole(role);
        entity.setContent(content);
        entity.setRelatedCaseId(relatedCaseId);
        return chatHistoryRepository.save(entity);
    }

    // 获取指定会话的所有消息
    public List<ChatHistoryEntity> getMessagesByConversation(Integer conversationId) {
        return chatHistoryRepository.findByConversationId(conversationId);
    }

}