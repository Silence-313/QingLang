package org.example.qinglang.service;

import cn.hutool.crypto.digest.HMac;
import cn.hutool.crypto.digest.HmacAlgorithm;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Base64;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.function.Consumer;

@Slf4j
@Service
public class SparkLiteService {

    @Value("${spark.app-id}")
    private String appId;

    @Value("${spark.api-key}")
    private String apiKey;

    @Value("${spark.api-secret}")
    private String apiSecret;

    // Spark Lite 接口地址
    private static final String HOST_URL = "spark-api.xf-yun.com";
    private static final String PATH = "/v1.1/chat";
    private static final String DOMAIN = "lite";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private WebSocketClient currentClient;

    /**
     * 发送消息并接收流式回复
     */
    public void sendMessage(String userMessage, String systemPrompt,
                            Consumer<String> onMessage,
                            Runnable onComplete,
                            Consumer<Throwable> onError) {
        try {
            String authUrl = buildAuthUrl();
            URI uri = new URI(authUrl);

            if (currentClient != null && !currentClient.isClosed()) {
                currentClient.close();
            }

            currentClient = new WebSocketClient(uri) {
                @Override
                public void onOpen(ServerHandshake handshake) {
                    log.info("讯飞星火 Lite WebSocket 连接成功");
                    send(buildRequestJson(userMessage, systemPrompt));
                }

                @Override
                public void onMessage(String message) {
                    try {
                        JsonNode root = objectMapper.readTree(message);
                        JsonNode header = root.path("header");
                        int code = header.path("code").asInt();

                        if (code != 0) {
                            String errMsg = header.path("message").asText("未知错误");
                            onError.accept(new RuntimeException("星火错误 [" + code + "]: " + errMsg));
                            return;
                        }

                        JsonNode payload = root.path("payload");
                        JsonNode choices = payload.path("choices");
                        JsonNode textArray = choices.path("text");

                        if (textArray.isArray() && textArray.size() > 0) {
                            String content = textArray.get(0).path("content").asText("");
                            if (!content.isEmpty()) {
                                onMessage.accept(content);
                            }
                        }

                        int status = header.path("status").asInt();
                        if (status == 2) {
                            close();
                        }
                    } catch (Exception e) {
                        log.error("解析星火响应失败", e);
                        onError.accept(e);
                    }
                }

                @Override
                public void onClose(int code, String reason, boolean remote) {
                    log.info("讯飞星火 Lite WebSocket 关闭: {} - {}", code, reason);
                    onComplete.run();
                }

                @Override
                public void onError(Exception ex) {
                    log.error("讯飞星火 Lite WebSocket 错误", ex);
                    onError.accept(ex);
                }
            };

            currentClient.connect();

        } catch (Exception e) {
            log.error("连接讯飞星火 Lite 失败", e);
            onError.accept(e);
        }
    }

    private String buildAuthUrl() throws Exception {
        SimpleDateFormat sdf = new SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss 'GMT'", Locale.US);
        sdf.setTimeZone(TimeZone.getTimeZone("GMT"));
        String date = sdf.format(new Date());

        String signatureOrigin = "host: " + HOST_URL + "\n" +
                "date: " + date + "\n" +
                "GET " + PATH + " HTTP/1.1";

        HMac hMac = new HMac(HmacAlgorithm.HmacSHA256, apiSecret.getBytes(StandardCharsets.UTF_8));
        String signature = Base64.getEncoder().encodeToString(hMac.digest(signatureOrigin));

        String authorizationOrigin = String.format(
                "api_key=\"%s\", algorithm=\"hmac-sha256\", headers=\"host date request-line\", signature=\"%s\"",
                apiKey, signature);
        String authorization = Base64.getEncoder().encodeToString(authorizationOrigin.getBytes(StandardCharsets.UTF_8));

        return String.format("wss://%s%s?authorization=%s&date=%s&host=%s",
                HOST_URL, PATH,
                URLEncoder.encode(authorization, StandardCharsets.UTF_8),
                URLEncoder.encode(date, StandardCharsets.UTF_8),
                HOST_URL);
    }

    private String buildRequestJson(String userMessage, String systemPrompt) {
        ObjectNode root = objectMapper.createObjectNode();

        ObjectNode header = objectMapper.createObjectNode();
        header.put("app_id", appId);
        root.set("header", header);

        ObjectNode parameter = objectMapper.createObjectNode();
        ObjectNode chat = objectMapper.createObjectNode();
        chat.put("domain", DOMAIN);
        chat.put("temperature", 0.5);
        chat.put("max_tokens", 2048);
        parameter.set("chat", chat);
        root.set("parameter", parameter);

        ObjectNode payload = objectMapper.createObjectNode();
        ObjectNode message = objectMapper.createObjectNode();
        ArrayNode textArray = objectMapper.createArrayNode();

        String finalContent = userMessage;
        if (systemPrompt != null && !systemPrompt.isEmpty()) {
            finalContent = systemPrompt + "\n\n" + userMessage;
        }

        ObjectNode userNode = objectMapper.createObjectNode();
        userNode.put("role", "user");
        userNode.put("content", finalContent);
        textArray.add(userNode);

        message.set("text", textArray);
        payload.set("message", message);
        root.set("payload", payload);

        return root.toString();
    }

    @PreDestroy
    public void destroy() {
        if (currentClient != null && !currentClient.isClosed()) {
            currentClient.close();
        }
    }
}