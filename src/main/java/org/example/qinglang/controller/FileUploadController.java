package org.example.qinglang.controller;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/file")
public class FileUploadController {

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    @PostMapping("/extract-text")
    public ResponseEntity<Map<String, Object>> extractTextFromFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "文件为空"));
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            return ResponseEntity.badRequest().body(Map.of("error", "文件大小不能超过 10MB"));
        }

        String fileName = file.getOriginalFilename();
        if (fileName == null) {
            fileName = "unknown";
        }

        String extractedText;
        try (InputStream inputStream = file.getInputStream()) {
            String lowerFileName = fileName.toLowerCase();

            if (lowerFileName.endsWith(".pdf")) {
                extractedText = extractPdfText(inputStream);
            } else if (lowerFileName.endsWith(".docx")) {
                extractedText = extractDocxText(inputStream);
            } else if (lowerFileName.endsWith(".txt")) {
                extractedText = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
            } else {
                return ResponseEntity.badRequest().body(Map.of("error", "不支持的文件格式，请上传 PDF、DOCX 或 TXT 文件"));
            }

            if (extractedText == null || extractedText.isBlank()) {
                return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                        .body(Map.of("error", "未能从文件中提取到文本内容，文件可能为扫描图片或加密"));
            }

            String previewText = extractedText.length() > 5000 ? extractedText.substring(0, 5000) + "..." : extractedText;

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("text", extractedText);
            response.put("preview", previewText);
            response.put("fileName", fileName);
            response.put("fileSize", file.getSize());
            return ResponseEntity.ok(response);

        } catch (IOException e) {
            log.error("文件解析失败: {}", fileName, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "文件读取失败: " + e.getMessage()));
        }
    }

    private String extractPdfText(InputStream inputStream) throws IOException {
        try (PDDocument document = Loader.loadPDF(inputStream.readAllBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            return stripper.getText(document);
        }
    }

    private String extractDocxText(InputStream inputStream) throws IOException {
        try (XWPFDocument doc = new XWPFDocument(inputStream);
             XWPFWordExtractor extractor = new XWPFWordExtractor(doc)) {
            return extractor.getText();
        }
    }
}