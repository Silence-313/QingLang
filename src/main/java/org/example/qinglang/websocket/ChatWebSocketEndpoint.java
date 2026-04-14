package org.example.qinglang.websocket;

import jakarta.websocket.*;
import jakarta.websocket.server.ServerEndpoint;
import lombok.extern.slf4j.Slf4j;
import org.example.qinglang.service.CaseQueryService;
import org.example.qinglang.service.SparkLiteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@ServerEndpoint("/ws/chat")
public class ChatWebSocketEndpoint {

    private static SparkLiteService sparkLiteService;
    private static CaseQueryService caseQueryService;   // 新增
    private static final ConcurrentHashMap<String, Session> sessions = new ConcurrentHashMap<>();

    @Autowired
    public void setSparkLiteService(SparkLiteService service) {
        ChatWebSocketEndpoint.sparkLiteService = service;
    }

    @Autowired
    public void setCaseQueryService(CaseQueryService service) {   // 新增
        ChatWebSocketEndpoint.caseQueryService = service;
    }

    @OnOpen
    public void onOpen(Session session) {
        sessions.put(session.getId(), session);
        log.info("WebSocket 连接建立: {}", session.getId());
    }

    @OnMessage
    public void onMessage(String message, Session session) {
        log.info("收到用户消息: {}", message);

        // 法律助手基础系统设定
        String baseSystemPrompt = "你是青朗法治平台的专业法律助手，专注于涉外案件分析、法律法规解读和案件处理建议。";

        // 尝试检索案件数据
        String caseContext = caseQueryService.searchCaseContext(message);
        String finalPrompt;
        if (caseContext != null) {
            // 将检索到的案件数据作为上下文提供给模型
            finalPrompt = baseSystemPrompt + " 以下是与用户问题相关的案件数据，请基于这些数据回答问题：\n" + caseContext;
        } else {
            finalPrompt = baseSystemPrompt + " 请用专业、准确、简洁的语言回答用户问题。";
        }

        sparkLiteService.sendMessage(
                message,
                finalPrompt,
                chunk -> {
                    try {
                        session.getBasicRemote().sendText(chunk);
                    } catch (IOException e) {
                        log.error("发送消息失败", e);
                    }
                },
                () -> {
                    try {
                        session.getBasicRemote().sendText("[DONE]");
                    } catch (IOException e) {
                        log.error("发送结束标记失败", e);
                    }
                },
                error -> {
                    try {
                        session.getBasicRemote().sendText("[ERROR] " + error.getMessage());
                    } catch (IOException e) {
                        log.error("发送错误消息失败", e);
                    }
                }
        );
    }

    @OnClose
    public void onClose(Session session) {
        sessions.remove(session.getId());
        log.info("WebSocket 连接关闭: {}", session.getId());
    }

    @OnError
    public void onError(Session session, Throwable error) {
        log.error("WebSocket 错误", error);
    }
}