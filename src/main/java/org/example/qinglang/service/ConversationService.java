package org.example.qinglang.service;

import org.example.qinglang.entity.ConversationEntity;
import org.example.qinglang.repository.ConversationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ConversationService {

    @Autowired
    private ConversationRepository conversationRepository;

    @Transactional
    public ConversationEntity createConversation(Integer userId, String title) {
        ConversationEntity conv = new ConversationEntity();
        conv.setUserId(userId);
        conv.setTitle(title);
        return conversationRepository.save(conv);
    }

    public List<ConversationEntity> getUserConversations(Integer userId) {
        return conversationRepository.findByUserIdOrderByUpdatedAtDesc(userId);
    }

    @Transactional
    public void deleteConversation(Integer conversationId) {
        conversationRepository.deleteById(conversationId);
    }

    // ConversationService.java 中添加
    @Transactional
    public void updateConversationTitle(Integer conversationId, String title) {
        ConversationEntity conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("会话不存在"));
        conv.setTitle(title);
        conversationRepository.save(conv);
    }

}